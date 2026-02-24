'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
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

function getPreviousPeriodRange(p: PeriodOption, current: PeriodRange): PeriodRange {
  const duration = current.end.getTime() - current.start.getTime();
  return {
    start: new Date(current.start.getTime() - duration),
    end: new Date(current.start.getTime() - 1),
  };
}

export default function PilotagePage() {
  // Fix #11: use useMemo to avoid recreating supabase client on every render
  const supabase = useMemo(() => createClient(), []);

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

      // Fetch invoices in period
      // Fix #1, #3, #7: Replace 'remaining_ttc' with 'remaining_due' and 'date_echeance' with 'date_due'
      const { data: invoices, error: invErr } = await supabase
        .from('invoice')
        .select('id, total_ttc, total_ht, date_emission, date_due, client_id, status, remaining_due')
        .gte('date_emission', startIso)
        .lte('date_emission', endIso);
      if (invErr) throw invErr;

      // Fetch ALL invoices for DSO (paid ones)
      // Fix #3, #7: Replace 'date_echeance' with 'date_due'
      const { data: allPaidInvoices, error: allPaidErr } = await supabase
        .from('invoice')
        .select('id, date_emission, date_due, status, total_ttc')
        .in('status', ['payee', 'partiellement_payee']);
      if (allPaidErr) throw allPaidErr;

      // Fetch quotes in period
      // Fix #8: Remove 'margin_percent' from quote select — it does not exist on the quote table
      const { data: quotes, error: quotesErr } = await supabase
        .from('quote')
        .select('id, status, total_ttc, total_ht, date_emission')
        .gte('date_emission', startIso)
        .lte('date_emission', endIso);
      if (quotesErr) throw quotesErr;

      // Fetch clients
      const { data: clients, error: clientsErr } = await supabase
        .from('client')
        .select('id, first_name, last_name, company_name, client_type');
      if (clientsErr) throw clientsErr;

      // Fetch late invoices
      // Fix #2, #6: Replace 'date_echeance' with 'date_due' in select and .lt() call
      // Fix #1: Replace 'remaining_ttc' with 'remaining_due'
      const today = new Date().toISOString();
      const { data: lateInvoices, error: lateErr } = await supabase
        .from('invoice')
        .select('id, total_ttc, remaining_due, status')
        .in('status', ['en_retard', 'envoyee'])
        .lt('date_due', today);
      if (lateErr) throw lateErr;

      // Fetch active reminders
      const { data: reminders, error: remErr } = await supabase
        .from('reminder_workflow')
        .select('id')
        .eq('is_active', true);
      if (remErr) throw remErr;

      // Fetch pending AI proposals
      // Fix #9: ai_proposal has no 'status' column; use is_accepted IS NULL and dismissed_at IS NULL
      const { data: aiProposals, error: aiErr } = await supabase
        .from('ai_proposal')
        .select('id')
        .is('is_accepted', null)
        .is('dismissed_at', null);
      if (aiErr) throw aiErr;

      // --- Compute KPIs ---

      // Monthly revenue (paid invoices grouped by month)
      const allInv = (invoices as InvoiceRow[]) || [];
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
      const allQuotes = (quotes as QuoteRow[]) || [];
      const totalQuotes = allQuotes.length;
      const acceptedQuotes = allQuotes.filter((q) => q.status === 'accepte').length;
      const conversionRate = totalQuotes > 0 ? Math.round((acceptedQuotes / totalQuotes) * 100) : 0;

      // DSO - average days to payment
      // Fix #4: Replace inv.date_echeance with inv.date_due
      const paidInv = (allPaidInvoices as InvoiceRow[]) || [];
      let totalDays = 0;
      let countDso = 0;
      for (const inv of paidInv) {
        if (inv.date_emission && inv.date_due) {
          const emission = new Date(inv.date_emission).getTime();
          const echeance = new Date(inv.date_due).getTime();
          const days = Math.round((echeance - emission) / (1000 * 60 * 60 * 24));
          if (days >= 0) {
            totalDays += days;
            countDso++;
          }
        }
      }
      const dso = countDso > 0 ? Math.round(totalDays / countDso) : 0;

      // Average margin — Fix #8: margin_percent no longer fetched from quote
      // We cannot compute margin_percent from quote table directly; set to 0 or skip
      const avgMargin = 0;

      // Prev period margin — also 0 since margin_percent is not on quote table
      const prevAvgMargin = 0;

      // Top 5 clients by total_ttc
      const clientTotals: Record<string, number> = {};
      for (const inv of allInv) {
        if (inv.client_id) {
          clientTotals[inv.client_id] = (clientTotals[inv.client_id] || 0) + Number(inv.total_ttc || 0);
        }
      }
      const clientList = (clients as ClientRow[]) || [];
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
      // Fix #5: Replace inv.remaining_ttc with inv.remaining_due
      const late = (lateInvoices as InvoiceRow[]) || [];
      const lateAmount = late.reduce((sum, inv) => sum + Number(inv.remaining_due || inv.total_ttc || 0), 0);

      // Low margin quotes — Fix #8: cannot compute without margin_percent; set to 0
      const lowMarginQuotesCount = 0;

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
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-xs uppercase tracking-wide">Taux de conversion</span>
                    <FileText className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">{kpi.conversionRate}%</div>
                  <div className="text-gray-400 text-xs mt-1">
                    {kpi.acceptedQuotes} / {kpi.totalQuotes} devis
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-xs uppercase tracking-wide">DSO moyen</span>
                    <Clock className="h-4 w-4 text-yellow-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">{kpi.dso}j</div>
                  <div className="text-gray-400 text-xs mt-1">Délai moyen de paiement</div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-xs uppercase tracking-wide">Factures en retard</span>
                    <AlertTriangle className="h-4 w-4 text-red-400" />
                  </div>
                  <div className="text-2xl font-bold text-red-400">{kpi.lateInvoicesCount}</div>
                  <div className="text-gray-400 text-xs mt-1">{formatCurrency(kpi.lateInvoicesAmount)}</div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-xs uppercase tracking-wide">Relances actives</span>
                    <Users className="h-4 w-4 text-purple-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">{kpi.activeRemindersCount}</div>
                  <div className="text-gray-400 text-xs mt-1">Workflows en cours</div>
                </CardContent>
              </Card>

              <Card className="bg-white/5 border-white/10">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-400 text-xs uppercase tracking-wide">Propositions IA</span>
                    <Brain className="h-4 w-4 text-emerald-400" />
                  </div>
                  <div className="text-2xl font-bold text-white">{kpi.pendingAiProposalsCount}</div>
                  <div className="text-gray-400 text-xs mt-1">En attente de validation</div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Monthly Revenue Bar Chart */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-base">CA mensuel</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={kpi.monthlyRevenue}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                      <XAxis dataKey="month" tick={{ fill: '#9ca3af', fontSize: 11 }} />
                      <YAxis tick={{ fill: '#9ca3af', fontSize: 11 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                      <Tooltip
                        contentStyle={{ background: '#1e1e3a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                        labelStyle={{ color: '#fff' }}
                        formatter={(value: number) => [formatCurrency(value), 'CA']}
                      />
                      <Bar dataKey="ca" fill="#10b981" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Revenue by Type Pie Chart */}
              <Card className="bg-white/5 border-white/10">
                <CardHeader>
                  <CardTitle className="text-white text-base">CA par type de client</CardTitle>
                </CardHeader>
                <CardContent>
                  {kpi.revenueByType.length > 0 ? (
                    <ResponsiveContainer width="100%" height={240}>
                      <PieChart>
                        <Pie
                          data={kpi.revenueByType}
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                        >
                          {kpi.revenueByType.map((_, index) => (
                            <Cell key={index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Legend wrapperStyle={{ color: '#9ca3af', fontSize: 12 }} />
                        <Tooltip
                          contentStyle={{ background: '#1e1e3a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }}
                          formatter={(value: number) => [formatCurrency(value), 'CA']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-60 text-gray-500 text-sm">Aucune donnée</div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top Clients */}
            <Card className="bg-white/5 border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-base">Top 5 clients</CardTitle>
              </CardHeader>
              <CardContent>
                {kpi.topClients.length > 0 ? (
                  <div className="space-y-3">
                    {kpi.topClients.map((client, idx) => {
                      const max = kpi.topClients[0]?.total || 1;
                      const pct = Math.round((client.total / max) * 100);
                      return (
                        <div key={idx} className="flex items-center gap-3">
                          <span className="text-gray-400 text-xs w-4">{idx + 1}</span>
                          <span className="text-white text-sm flex-1 truncate">{client.name}</span>
                          <div className="flex-1 bg-white/10 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-2 rounded-full bg-emerald-500"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-white text-sm font-medium w-24 text-right">
                            {formatCurrency(client.total)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm text-center py-6">Aucun client sur la période</div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
