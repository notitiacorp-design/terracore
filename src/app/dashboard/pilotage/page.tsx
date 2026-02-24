'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn, formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Clock,
  Users,
  Brain,
  Euro,
  FileText,
  RefreshCw,
} from 'lucide-react';
import type { InvoiceRow, QuoteRow, ClientRow, ReminderWorkflowRow, AiProposalRow } from '@/types/database';

type PeriodOption = 'month' | 'quarter' | 'year' | 'custom';

interface PeriodRange {
  start: Date;
  end: Date;
}

interface MonthlyRevenue {
  month: string;
  ca: number;
}

interface TopClient {
  name: string;
  total: number;
}

interface PieData {
  name: string;
  value: number;
}

interface KpiData {
  monthlyRevenue: MonthlyRevenue[];
  conversionRate: number;
  totalQuotes: number;
  acceptedQuotes: number;
  dso: number;
  avgMargin: number;
  prevAvgMargin: number;
  topClients: TopClient[];
  revenueByType: PieData[];
  lateInvoicesCount: number;
  lateInvoicesAmount: number;
  lowMarginQuotesCount: number;
  activeRemindersCount: number;
  pendingAiProposalsCount: number;
}

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

const MONTH_LABELS = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'];

function getPeriodRange(period: PeriodOption, customStart?: string, customEnd?: string): PeriodRange {
  const now = new Date();
  switch (period) {
    case 'month':
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59),
      };
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3);
      return {
        start: new Date(now.getFullYear(), q * 3, 1),
        end: new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59),
      };
    }
    case 'year':
      return {
        start: new Date(now.getFullYear(), 0, 1),
        end: new Date(now.getFullYear(), 11, 31, 23, 59, 59),
      };
    case 'custom':
      return {
        start: customStart ? new Date(customStart) : new Date(now.getFullYear(), 0, 1),
        end: customEnd ? new Date(customEnd) : now,
      };
    default:
      return {
        start: new Date(now.getFullYear(), now.getMonth(), 1),
        end: now,
      };
  }
}

export default function PilotagePage() {
  const supabase = createClient();

  const [period, setPeriod] = useState<PeriodOption>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<KpiData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchKpiData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const range = getPeriodRange(period, customStart, customEnd);
      const startIso = range.start.toISOString();
      const endIso = range.end.toISOString();

      // Fetch paid invoices in period
      const { data: invoices, error: invErr } = await supabase
        .from('invoice')
        .select('id, total_ttc, total_ht, date_emission, date_echeance, client_id, status, remaining_ttc')
        .gte('date_emission', startIso)
        .lte('date_emission', endIso);
      if (invErr) throw invErr;

      // Fetch ALL invoices for DSO (paid ones)
      const { data: allPaidInvoices, error: allPaidErr } = await supabase
        .from('invoice')
        .select('id, date_emission, date_echeance, status, total_ttc')
        .in('status', ['payee', 'partiellement_payee']);
      if (allPaidErr) throw allPaidErr;

      // Fetch quotes in period
      const { data: quotes, error: quotesErr } = await supabase
        .from('quote')
        .select('id, status, total_ttc, margin_percent, date_emission')
        .gte('date_emission', startIso)
        .lte('date_emission', endIso);
      if (quotesErr) throw quotesErr;

      // Fetch clients
      const { data: clients, error: clientsErr } = await supabase
        .from('client')
        .select('id, first_name, last_name, company_name, client_type');
      if (clientsErr) throw clientsErr;

      // Fetch late invoices
      const today = new Date().toISOString();
      const { data: lateInvoices, error: lateErr } = await supabase
        .from('invoice')
        .select('id, total_ttc, remaining_ttc, status')
        .in('status', ['en_retard', 'envoyee'])
        .lt('date_echeance', today);
      if (lateErr) throw lateErr;

      // Fetch active reminders
      const { data: reminders, error: remErr } = await supabase
        .from('reminder_workflow')
        .select('id')
        .eq('is_active', true);
      if (remErr) throw remErr;

      // Fetch pending AI proposals
      const { data: aiProposals, error: aiErr } = await supabase
        .from('ai_proposal')
        .select('id')
        .eq('status', 'pending');
      if (aiErr) throw aiErr;

      // --- Compute KPIs ---

      // Monthly revenue (paid invoices grouped by month)
      const allInv: InvoiceRow[] = (invoices as InvoiceRow[]) || [];
      const monthlyMap: Record<number, number> = {};
      for (const inv of allInv) {
        if (inv.status === 'payee' || inv.status === 'partiellement_payee') {
          const m = new Date(inv.date_emission).getMonth();
          monthlyMap[m] = (monthlyMap[m] || 0) + Number(inv.total_ttc || 0);
        }
      }
      const monthlyRevenue: MonthlyRevenue[] = MONTH_LABELS.map((label, idx) => ({
        month: label,
        ca: monthlyMap[idx] || 0,
      }));

      // Conversion rate
      const allQuotes: QuoteRow[] = (quotes as QuoteRow[]) || [];
      const totalQuotes = allQuotes.length;
      const acceptedQuotes = allQuotes.filter((q) => q.status === 'accepte').length;
      const conversionRate = totalQuotes > 0 ? Math.round((acceptedQuotes / totalQuotes) * 100) : 0;

      // DSO - average days to payment
      const paidInv: InvoiceRow[] = (allPaidInvoices as InvoiceRow[]) || [];
      let totalDays = 0;
      let countDso = 0;
      for (const inv of paidInv) {
        if (inv.date_emission && inv.date_echeance) {
          const emission = new Date(inv.date_emission).getTime();
          const echeance = new Date(inv.date_echeance).getTime();
          const days = Math.round((echeance - emission) / (1000 * 60 * 60 * 24));
          if (days >= 0) {
            totalDays += days;
            countDso++;
          }
        }
      }
      const dso = countDso > 0 ? Math.round(totalDays / countDso) : 0;

      // Average margin
      const quotesWithMargin = allQuotes.filter((q) => q.margin_percent !== null && q.margin_percent !== undefined);
      const avgMargin =
        quotesWithMargin.length > 0
          ? Math.round(
              quotesWithMargin.reduce((sum, q) => sum + Number(q.margin_percent || 0), 0) / quotesWithMargin.length
            )
          : 0;

      // Prev period margin - fetch previous period quotes
      const prevRange = getPreviousPeriodRange(period, range);
      const { data: prevQuotes } = await supabase
        .from('quote')
        .select('margin_percent')
        .gte('date_emission', prevRange.start.toISOString())
        .lte('date_emission', prevRange.end.toISOString());
      const prevQ = prevQuotes || [];
      const prevWithMargin = prevQ.filter((q: { margin_percent: number | null }) => q.margin_percent !== null);
      const prevAvgMargin =
        prevWithMargin.length > 0
          ? Math.round(
              prevWithMargin.reduce((sum: number, q: { margin_percent: number | null }) => sum + Number(q.margin_percent || 0), 0) /
                prevWithMargin.length
            )
          : 0;

      // Top 5 clients by total_ttc (paid invoices)
      const clientTotals: Record<string, number> = {};
      for (const inv of allInv) {
        if (inv.client_id) {
          clientTotals[inv.client_id] = (clientTotals[inv.client_id] || 0) + Number(inv.total_ttc || 0);
        }
      }
      const clientList: ClientRow[] = (clients as ClientRow[]) || [];
      const topClients: TopClient[] = Object.entries(clientTotals)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([clientId, total]) => {
          const client = clientList.find((c) => c.id === clientId);
          const name = client
            ? client.client_type === 'pro'
              ? client.company_name || `${client.first_name} ${client.last_name}`
              : `${client.first_name} ${client.last_name}`
            : 'Inconnu';
          return { name: name.trim() || 'Inconnu', total };
        });

      // Revenue by client type
      const byType: Record<string, number> = {};
      for (const inv of allInv) {
        const client = clientList.find((c) => c.id === inv.client_id);
        const type = client?.client_type === 'pro' ? 'Professionnel' : 'Particulier';
        byType[type] = (byType[type] || 0) + Number(inv.total_ttc || 0);
      }
      const revenueByType: PieData[] = Object.entries(byType).map(([name, value]) => ({ name, value }));

      // Late invoices
      const late: InvoiceRow[] = (lateInvoices as InvoiceRow[]) || [];
      const lateAmount = late.reduce((sum, inv) => sum + Number(inv.remaining_ttc || inv.total_ttc || 0), 0);

      // Low margin quotes
      const lowMarginQuotesCount = allQuotes.filter(
        (q) => q.margin_percent !== null && Number(q.margin_percent) < 15
      ).length;

      setKpi({
        monthlyRevenue,
        conversionRate,
        totalQuotes,
        acceptedQuotes,
        dso,
        avgMargin,
        prevAvgMargin,
        topClients,
        revenueByType,
        lateInvoicesCount: late.length,
        lateInvoicesAmount: lateAmount,
        lowMarginQuotesCount,
        activeRemindersCount: (reminders || []).length,
        pendingAiProposalsCount: (aiProposals || []).length,
      });
    } catch (err: unknown) {
      console.error(err);
      setError('Erreur lors du chargement des données.');
    } finally {
      setLoading(false);
    }
  }, [period, customStart, customEnd, supabase]);

  useEffect(() => {
    fetchKpiData();
  }, [fetchKpiData]);

  function getPreviousPeriodRange(p: PeriodOption, current: PeriodRange): PeriodRange {
    const duration = current.end.getTime() - current.start.getTime();
    return {
      start: new Date(current.start.getTime() - duration),
      end: new Date(current.start.getTime() - 1),
    };
  }

  const periodLabel: Record<PeriodOption, string> = {
    month: 'Ce mois',
    quarter: 'Ce trimestre',
    year: 'Cette année',
    custom: 'Personnalisé',
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Pilotage</h1>
            <p className="text-gray-400 text-sm mt-1">Vue d'ensemble de votre activité</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {/* Period selector */}
            <Select value={period} onValueChange={(v) => setPeriod(v as PeriodOption)}>
              <SelectTrigger className="w-44 min-h-[48px] bg-white/10 border-white/20 text-white">
                <SelectValue placeholder="Période" />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a2e] border-white/20">
                {(Object.keys(periodLabel) as PeriodOption[]).map((key) => (
                  <SelectItem key={key} value={key} className="text-white hover:bg-white/10 focus:bg-white/10">
                    {periodLabel[key]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {period === 'custom' && (
              <>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="min-h-[48px] bg-white/10 border border-white/20 text-white rounded-md px-3 text-sm"
                />
                <span className="text-gray-400">—</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="min-h-[48px] bg-white/10 border border-white/20 text-white rounded-md px-3 text-sm"
                />
              </>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={fetchKpiData}
              disabled={loading}
              className="min-h-[48px] min-w-[48px] border-white/20 bg-white/10 hover:bg-white/20 text-white"
              aria-label="Actualiser"
            >
              <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/20 border border-red-500/40 rounded-lg p-4 text-red-300 text-sm">
            {error}
          </div>
        )}

        {loading && !kpi ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="bg-white/5 border-white/10 animate-pulse">
                <CardContent className="p-5 h-24" />
              </Card>
            ))}
          </div>
        ) : kpi ? (
          <>
            {/* ===== KPI CARDS ===== */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Taux de conversion */}
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wider">Taux conversion</p>
                      <p className="text-3xl font-bold text-white mt-1">{kpi.conversionRate}%</p>
                      <p className="text-gray-500 text-xs mt-1">
                        {kpi.acceptedQuotes} / {kpi.totalQuotes} devis
                      </p>
                    </div>
                    <FileText className="h-8 w-8 text-blue-400 opacity-80" />
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 h-2 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-400 rounded-full transition-all duration-500"
                      style={{ width: `${kpi.conversionRate}%` }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* DSO */}
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wider">DSO moyen</p>
                      <p className="text-3xl font-bold text-white mt-1">{kpi.dso}j</p>
                      <p className="text-gray-500 text-xs mt-1">Délai paiement moyen</p>
                    </div>
                    <Clock
                      className={cn(
                        'h-8 w-8 opacity-80',
                        kpi.dso > 60 ? 'text-red-400' : kpi.dso > 45 ? 'text-amber-400' : 'text-emerald-400'
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Marge moyenne */}
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wider">Marge moyenne</p>
                      <p className="text-3xl font-bold text-white mt-1">{kpi.avgMargin}%</p>
                      <div className="flex items-center gap-1 mt-1">
                        {kpi.avgMargin >= kpi.prevAvgMargin ? (
                          <TrendingUp className="h-3 w-3 text-emerald-400" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-400" />
                        )}
                        <p
                          className={cn(
                            'text-xs',
                            kpi.avgMargin >= kpi.prevAvgMargin ? 'text-emerald-400' : 'text-red-400'
                          )}
                        >
                          {kpi.avgMargin >= kpi.prevAvgMargin ? '+' : ''}
                          {kpi.avgMargin - kpi.prevAvgMargin}% vs période préc.
                        </p>
                      </div>
                    </div>
                    <Euro className="h-8 w-8 text-emerald-400 opacity-80" />
                  </div>
                </CardContent>
              </Card>

              {/* Retards */}
              <Card
                className={cn(
                  'border',
                  kpi.lateInvoicesCount > 0
                    ? 'bg-red-500/10 border-red-500/30'
                    : 'bg-white/5 border-white/10'
                )}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-gray-400 text-xs uppercase tracking-wider">Retards paiement</p>
                      <p
                        className={cn(
                          'text-3xl font-bold mt-1',
                          kpi.lateInvoicesCount > 0 ? 'text-red-400' : 'text-white'
                        )}
                      >
                        {kpi.lateInvoicesCount}
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        {formatCurrency(kpi.lateInvoicesAmount)} en attente
                      </p>
                    </div>
                    <AlertTriangle
                      className={cn(
                        'h-8 w-8 opacity-80',
                        kpi.lateInvoicesCount > 0 ? 'text-red-400' : 'text-gray-500'
                      )}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ===== CHARTS ROW 1 ===== */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* CA Mensuel */}
              <Card className="bg-white/5 border-white/10 lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-base">CA Mensuel (TTC)</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={kpi.monthlyRevenue} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.07)" />
                      <XAxis
                        dataKey="month"
                        tick={{ fill: '#9ca3af', fontSize: 12 }}
                        axisLine={{ stroke: 'rgba(255,255,255,0.1)' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k€` : `${v}€`)}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a1a2e',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: 8,
                          color: '#fff',
                        }}
                        formatter={(value: number) => [formatCurrency(value), 'CA TTC']}
                      />
                      <Bar dataKey="ca" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Répartition CA par type client */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader className="pb-2">
                  <CardTitle className="text-white text-base">Répartition CA</CardTitle>
                </CardHeader>
                <CardContent>
                  {kpi.revenueByType.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={kpi.revenueByType}
                          cx="50%"
                          cy="45%"
                          innerRadius={55}
                          outerRadius={85}
                          dataKey="value"
                          paddingAngle={3}
                        >
                          {kpi.revenueByType.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#1a1a2e',
                            border: '1px solid rgba(255,255,255,0.15)',
                            borderRadius: 8,
                            color: '#fff',
                          }}
                          formatter={(value: number) => [formatCurrency(value), 'CA TTC']}
                        />
                        <Legend
                          formatter={(value) => (
                            <span style={{ color: '#d1d5db', fontSize: 12 }}>{value}</span>
                          )}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-60 text-gray-500 text-sm">
                      Aucune donnée
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* ===== TOP 5 CLIENTS ===== */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-400" />
                  Top 5 Clients (TTC)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {kpi.topClients.length > 0 ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart
                      layout="vertical"
                      data={kpi.topClients}
                      margin={{ top: 0, right: 30, left: 10, bottom: 0 }}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(255,255,255,0.07)"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        tick={{ fill: '#9ca3af', fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => (v >= 1000 ? `${Math.round(v / 1000)}k€` : `${v}€`)}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        tick={{ fill: '#d1d5db', fontSize: 12 }}
                        axisLine={false}
                        tickLine={false}
                        width={110}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#1a1a2e',
                          border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: 8,
                          color: '#fff',
                        }}
                        formatter={(value: number) => [formatCurrency(value), 'CA TTC']}
                        cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                      />
                      <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-32 text-gray-500 text-sm">
                    Aucune donnée sur cette période
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ===== ALERTS SECTION ===== */}
            <div>
              <h2 className="text-lg font-semibold text-white mb-3">Alertes & Actions</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Retards de paiement */}
                <Card
                  className={cn(
                    'border transition-colors',
                    kpi.lateInvoicesCount > 0
                      ? 'bg-red-500/10 border-red-500/30 hover:bg-red-500/15'
                      : 'bg-white/5 border-white/10'
                  )}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                          kpi.lateInvoicesCount > 0 ? 'bg-red-500/20' : 'bg-white/10'
                        )}
                      >
                        <AlertTriangle
                          className={cn(
                            'h-5 w-5',
                            kpi.lateInvoicesCount > 0 ? 'text-red-400' : 'text-gray-500'
                          )}
                        />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">Retards paiement</p>
                        <p className="text-gray-400 text-xs">Factures échues</p>
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <span
                        className={cn(
                          'text-2xl font-bold',
                          kpi.lateInvoicesCount > 0 ? 'text-red-400' : 'text-gray-500'
                        )}
                      >
                        {kpi.lateInvoicesCount}
                      </span>
                      {kpi.lateInvoicesCount > 0 && (
                        <Badge className="bg-red-500/20 text-red-300 border-red-500/30 text-xs">
                          {formatCurrency(kpi.lateInvoicesAmount)}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Marges basses */}
                <Card
                  className={cn(
                    'border transition-colors',
                    kpi.lowMarginQuotesCount > 0
                      ? 'bg-amber-500/10 border-amber-500/30 hover:bg-amber-500/15'
                      : 'bg-white/5 border-white/10'
                  )}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                          kpi.lowMarginQuotesCount > 0 ? 'bg-amber-500/20' : 'bg-white/10'
                        )}
                      >
                        <TrendingDown
                          className={cn(
                            'h-5 w-5',
                            kpi.lowMarginQuotesCount > 0 ? 'text-amber-400' : 'text-gray-500'
                          )}
                        />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">Marges basses</p>
                        <p className="text-gray-400 text-xs">Devis &lt; 15% marge</p>
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <span
                        className={cn(
                          'text-2xl font-bold',
                          kpi.lowMarginQuotesCount > 0 ? 'text-amber-400' : 'text-gray-500'
                        )}
                      >
                        {kpi.lowMarginQuotesCount}
                      </span>
                      {kpi.lowMarginQuotesCount > 0 && (
                        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                          Attention
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Relances actives */}
                <Card
                  className={cn(
                    'border transition-colors',
                    kpi.activeRemindersCount > 0
                      ? 'bg-orange-500/10 border-orange-500/30 hover:bg-orange-500/15'
                      : 'bg-white/5 border-white/10'
                  )}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                          kpi.activeRemindersCount > 0 ? 'bg-orange-500/20' : 'bg-white/10'
                        )}
                      >
                        <Clock
                          className={cn(
                            'h-5 w-5',
                            kpi.activeRemindersCount > 0 ? 'text-orange-400' : 'text-gray-500'
                          )}
                        />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">Relances actives</p>
                        <p className="text-gray-400 text-xs">Workflows en cours</p>
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <span
                        className={cn(
                          'text-2xl font-bold',
                          kpi.activeRemindersCount > 0 ? 'text-orange-400' : 'text-gray-500'
                        )}
                      >
                        {kpi.activeRemindersCount}
                      </span>
                      {kpi.activeRemindersCount > 0 && (
                        <Badge className="bg-orange-500/20 text-orange-300 border-orange-500/30 text-xs">
                          En cours
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Propositions IA en attente */}
                <Card
                  className={cn(
                    'border transition-colors',
                    kpi.pendingAiProposalsCount > 0
                      ? 'bg-emerald-500/10 border-emerald-500/30 hover:bg-emerald-500/15'
                      : 'bg-white/5 border-white/10'
                  )}
                >
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <div
                        className={cn(
                          'w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0',
                          kpi.pendingAiProposalsCount > 0 ? 'bg-emerald-500/20' : 'bg-white/10'
                        )}
                      >
                        <Brain
                          className={cn(
                            'h-5 w-5',
                            kpi.pendingAiProposalsCount > 0 ? 'text-emerald-400' : 'text-gray-500'
                          )}
                        />
                      </div>
                      <div>
                        <p className="text-white font-medium text-sm">Propositions IA</p>
                        <p className="text-gray-400 text-xs">En attente de révision</p>
                      </div>
                    </div>
                    <div className="flex items-end justify-between">
                      <span
                        className={cn(
                          'text-2xl font-bold',
                          kpi.pendingAiProposalsCount > 0 ? 'text-emerald-400' : 'text-gray-500'
                        )}
                      >
                        {kpi.pendingAiProposalsCount}
                      </span>
                      {kpi.pendingAiProposalsCount > 0 && (
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                          À traiter
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
