'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn, formatDate, formatCurrency } from '@/lib/utils';
import type {
  QuoteRow,
  InvoiceRow,
  ScheduleEventRow,
  WeatherSnapshotRow,
  AiProposalRow,
  AuditLogRow,
  ReminderWorkflowRow,
} from '@/types/database';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  TrendingUp,
  FileText,
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronUp,
  Plus,
  UserPlus,
  Sparkles,
  CloudRain,
  Sun,
  Cloud,
  Wind,
  Clock,
  CheckCircle,
  XCircle,
  Bell,
  Activity,
  Euro,
  Briefcase,
  Zap,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardKPIs {
  ca_month: number;
  ca_prev_month: number;
  devis_en_cours: number;
  devis_montant: number;
  factures_impayees: number;
  factures_montant: number;
  interventions_today: number;
}

interface MorningDigest {
  chantiers_today: (ScheduleEventRow & { weather?: WeatherSnapshotRow | null; client_name?: string })[];
  retards: (InvoiceRow & { client_name?: string })[];
  relances: (ReminderWorkflowRow & { invoice_ref?: string; client_name?: string })[];
  docs_en_attente: (QuoteRow & { client_name?: string })[];
  trous_planning: string[];
}

interface AiSuggestion extends AiProposalRow {
  agent_label?: string;
}

interface ActivityEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  user_name?: string;
}

interface SparklinePoint {
  label: string;
  value: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWeatherIcon(severity?: string) {
  switch (severity) {
    case 'favorable': return <Sun className="h-4 w-4 text-yellow-400" />;
    case 'acceptable': return <Cloud className="h-4 w-4 text-gray-400" />;
    case 'defavorable': return <CloudRain className="h-4 w-4 text-blue-400" />;
    case 'alerte': return <Wind className="h-4 w-4 text-red-400" />;
    default: return <Cloud className="h-4 w-4 text-gray-400" />;
  }
}

function getWeatherBadgeVariant(severity?: string): string {
  switch (severity) {
    case 'favorable': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    case 'acceptable': return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    case 'defavorable': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    case 'alerte': return 'bg-red-500/20 text-red-400 border-red-500/30';
    default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  }
}

function getWeatherLabel(severity?: string): string {
  switch (severity) {
    case 'favorable': return 'Favorable';
    case 'acceptable': return 'Acceptable';
    case 'defavorable': return 'Défavorable';
    case 'alerte': return 'Alerte';
    default: return 'Inconnu';
  }
}

function getInvoiceStatusBadge(status: string): string {
  switch (status) {
    case 'en_retard': return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'envoyee': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    case 'payee': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
    default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
  }
}

function getQuoteStatusLabel(status: string): string {
  switch (status) {
    case 'brouillon': return 'Brouillon';
    case 'envoye': return 'Envoyé';
    case 'accepte': return 'Accepté';
    case 'refuse': return 'Refusé';
    case 'expire': return 'Expiré';
    default: return status;
  }
}

function getReminderLevelLabel(level?: string): string {
  switch (level) {
    case 'relance_1': return 'Relance 1';
    case 'relance_2': return 'Relance 2';
    case 'relance_3': return 'Relance 3';
    case 'mise_en_demeure': return 'Mise en demeure';
    case 'contentieux': return 'Contentieux';
    default: return level || '';
  }
}

function getAgentLabel(type?: string): string {
  switch (type) {
    case 'meteo_replan': return 'Météo & Replanification';
    case 'relance_auto': return 'Relance automatique';
    case 'devis_assist': return 'Assistant Devis';
    case 'marge_alert': return 'Alerte Marge';
    default: return 'Agent IA';
  }
}

function getActionLabel(action: string): string {
  switch (action) {
    case 'create': return 'Créé';
    case 'update': return 'Mis à jour';
    case 'delete': return 'Supprimé';
    case 'send': return 'Envoyé';
    case 'sign': return 'Signé';
    default: return action;
  }
}

function getEntityLabel(entity: string): string {
  switch (entity) {
    case 'quote': return 'Devis';
    case 'invoice': return 'Facture';
    case 'client': return 'Client';
    case 'schedule_event': return 'Événement';
    case 'payment': return 'Paiement';
    default: return entity;
  }
}

function getTodayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function getWeekDays(): string[] {
  const days: string[] = [];
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
  for (let i = 0; i < 5; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d.toISOString().split('T')[0]);
  }
  return days;
}

function formatTimeFromISO(isoString: string): string {
  return new Date(isoString).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}

function formatDayFR(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [kpis, setKpis] = useState<DashboardKPIs>({
    ca_month: 0,
    ca_prev_month: 0,
    devis_en_cours: 0,
    devis_montant: 0,
    factures_impayees: 0,
    factures_montant: 0,
    interventions_today: 0,
  });
  const [digest, setDigest] = useState<MorningDigest>({
    chantiers_today: [],
    retards: [],
    relances: [],
    docs_en_attente: [],
    trous_planning: [],
  });
  const [aiSuggestions, setAiSuggestions] = useState<AiSuggestion[]>([]);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);
  const [sparklineData, setSparklineData] = useState<SparklinePoint[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Collapsible states
  const [openChantiers, setOpenChantiers] = useState(true);
  const [openRetards, setOpenRetards] = useState(true);
  const [openRelances, setOpenRelances] = useState(true);
  const [openDocs, setOpenDocs] = useState(true);
  const [openTrous, setOpenTrous] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      // Get current user & company
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profile')
        .select('company_id, first_name, last_name')
        .eq('auth_user_id', user.id)
        .single();

      if (!profile?.company_id) return;
      const cid = profile.company_id;
      setCompanyId(cid);

      const todayISO = getTodayISO();
      const weekDays = getWeekDays();
      const nowISO = new Date().toISOString();

      // ── KPIs ──────────────────────────────────────────────────────────────
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const prevMonthStart = new Date(monthStart);
      prevMonthStart.setMonth(prevMonthStart.getMonth() - 1);
      const prevMonthEnd = new Date(monthStart);
      prevMonthEnd.setMilliseconds(-1);

      const [invoicesMonth, invoicesPrevMonth, quotesEnCours, invoicesImpayees, eventsToday] =
        await Promise.all([
          supabase
            .from('invoice')
            .select('total_ttc')
            .eq('company_id', cid)
            .eq('status', 'payee')
            .gte('date_emission', monthStart.toISOString().split('T')[0]),
          supabase
            .from('invoice')
            .select('total_ttc')
            .eq('company_id', cid)
            .eq('status', 'payee')
            .gte('date_emission', prevMonthStart.toISOString().split('T')[0])
            .lte('date_emission', prevMonthEnd.toISOString().split('T')[0]),
          supabase
            .from('quote')
            .select('total_ttc')
            .eq('company_id', cid)
            .in('status', ['envoye', 'brouillon']),
          supabase
            .from('invoice')
            .select('remaining_ttc')
            .eq('company_id', cid)
            .in('status', ['envoyee', 'en_retard', 'partiellement_payee']),
          supabase
            .from('schedule_event')
            .select('id')
            .eq('company_id', cid)
            .eq('event_type', 'chantier')
            .gte('start_datetime', todayISO + 'T00:00:00')
            .lte('start_datetime', todayISO + 'T23:59:59'),
        ]);

      const caMonth = (invoicesMonth.data || []).reduce((s, r) => s + (r.total_ttc || 0), 0);
      const caPrev = (invoicesPrevMonth.data || []).reduce((s, r) => s + (r.total_ttc || 0), 0);
      const devisMontant = (quotesEnCours.data || []).reduce((s, r) => s + (r.total_ttc || 0), 0);
      const facturesMontant = (invoicesImpayees.data || []).reduce((s, r) => s + (r.remaining_ttc || 0), 0);

      setKpis({
        ca_month: caMonth,
        ca_prev_month: caPrev,
        devis_en_cours: (quotesEnCours.data || []).length,
        devis_montant: devisMontant,
        factures_impayees: (invoicesImpayees.data || []).length,
        factures_montant: facturesMontant,
        interventions_today: (eventsToday.data || []).length,
      });

      // ── Sparkline (last 6 months) ──────────────────────────────────────────
      const sparkPoints: SparklinePoint[] = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setDate(1);
        d.setMonth(d.getMonth() - i);
        const start = d.toISOString().split('T')[0];
        const end = new Date(d.getFullYear(), d.getMonth() + 1, 0).toISOString().split('T')[0];
        const { data: inv } = await supabase
          .from('invoice')
          .select('total_ttc')
          .eq('company_id', cid)
          .eq('status', 'payee')
          .gte('date_emission', start)
          .lte('date_emission', end);
        sparkPoints.push({
          label: d.toLocaleDateString('fr-FR', { month: 'short' }),
          value: (inv || []).reduce((s, r) => s + (r.total_ttc || 0), 0),
        });
      }
      setSparklineData(sparkPoints);

      // ── Morning Digest ─────────────────────────────────────────────────────

      // 1. Chantiers du jour
      const { data: chantiersRaw } = await supabase
        .from('schedule_event')
        .select('*, client:client_id(first_name, last_name, company_name)')
        .eq('company_id', cid)
        .eq('event_type', 'chantier')
        .gte('start_datetime', todayISO + 'T00:00:00')
        .lte('start_datetime', todayISO + 'T23:59:59')
        .order('start_datetime', { ascending: true });

      const { data: weatherToday } = await supabase
        .from('weather_snapshot')
        .select('*')
        .eq('company_id', cid)
        .eq('date', todayISO);

      const chantiersWithWeather = (chantiersRaw || []).map((ev: any) => ({
        ...ev,
        client_name: ev.client
          ? ev.client.company_name || `${ev.client.first_name || ''} ${ev.client.last_name || ''}`.trim()
          : undefined,
        weather: (weatherToday || []).find((w) => w.schedule_event_id === ev.id) || null,
      }));

      // 2. Retards
      const { data: retardsRaw } = await supabase
        .from('invoice')
        .select('*, client:client_id(first_name, last_name, company_name)')
        .eq('company_id', cid)
        .eq('status', 'en_retard')
        .order('date_echeance', { ascending: true })
        .limit(10);

      const retards = (retardsRaw || []).map((inv: any) => ({
        ...inv,
        client_name: inv.client
          ? inv.client.company_name || `${inv.client.first_name || ''} ${inv.client.last_name || ''}`.trim()
          : undefined,
      }));

      // 3. Relances à envoyer
      const { data: relancesRaw } = await supabase
        .from('reminder_workflow')
        .select('*, invoice:invoice_id(reference), client:client_id(first_name, last_name, company_name)')
        .eq('company_id', cid)
        .eq('is_active', true)
        .lte('next_reminder_at', nowISO)
        .order('next_reminder_at', { ascending: true })
        .limit(10);

      const relances = (relancesRaw || []).map((rw: any) => ({
        ...rw,
        invoice_ref: rw.invoice?.reference,
        client_name: rw.client
          ? rw.client.company_name || `${rw.client.first_name || ''} ${rw.client.last_name || ''}`.trim()
          : undefined,
      }));

      // 4. Devis en attente
      const { data: docsRaw } = await supabase
        .from('quote')
        .select('*, client:client_id(first_name, last_name, company_name)')
        .eq('company_id', cid)
        .eq('status', 'envoye')
        .order('date_emission', { ascending: true })
        .limit(10);

      const docsEnAttente = (docsRaw || []).map((q: any) => ({
        ...q,
        client_name: q.client
          ? q.client.company_name || `${q.client.first_name || ''} ${q.client.last_name || ''}`.trim()
          : undefined,
      }));

      // 5. Trous de planning (jours de la semaine sans événements)
      const { data: weekEvents } = await supabase
        .from('schedule_event')
        .select('start_datetime')
        .eq('company_id', cid)
        .gte('start_datetime', weekDays[0] + 'T00:00:00')
        .lte('start_datetime', weekDays[4] + 'T23:59:59');

      const daysWithEvents = new Set(
        (weekEvents || []).map((ev: any) => ev.start_datetime.split('T')[0])
      );
      const trous = weekDays.filter((d) => !daysWithEvents.has(d) && d >= todayISO);

      setDigest({
        chantiers_today: chantiersWithWeather,
        retards,
        relances,
        docs_en_attente: docsEnAttente,
        trous_planning: trous,
      });

      // ── AI Suggestions ────────────────────────────────────────────────────
      const { data: proposals } = await supabase
        .from('ai_proposal')
        .select('*, agent_run:agent_run_id(agent_type)')
        .eq('company_id', cid)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      setAiSuggestions(
        (proposals || []).map((p: any) => ({
          ...p,
          agent_label: getAgentLabel(p.agent_run?.agent_type),
        }))
      );

      // ── Activity ──────────────────────────────────────────────────────────
      const { data: logs } = await supabase
        .from('audit_log')
        .select('id, action, entity_type, entity_id, created_at, user_id')
        .eq('company_id', cid)
        .order('created_at', { ascending: false })
        .limit(8);

      setActivity(
        (logs || []).map((l: any) => ({
          id: l.id,
          action: l.action,
          entity_type: l.entity_type,
          entity_id: l.entity_id,
          created_at: l.created_at,
        }))
      );
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [supabase]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const caEvolution = kpis.ca_prev_month > 0
    ? ((kpis.ca_month - kpis.ca_prev_month) / kpis.ca_prev_month) * 100
    : 0;

  const totalAlerts =
    digest.retards.length +
    digest.relances.length +
    digest.docs_en_attente.length +
    digest.trous_planning.length;

  // ─── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] p-4 space-y-4">
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-xl bg-white/10" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl bg-white/10" />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-48 rounded-xl bg-white/10" />
          <Skeleton className="h-48 rounded-xl bg-white/10" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white">
      <div className="mx-auto max-w-7xl p-4 pb-20 space-y-6">

        {/* ── Header ── */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white lg:text-2xl">Tableau de bord</h1>
            <p className="text-sm text-white/50">
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-white/60 hover:text-white hover:bg-white/10"
              onClick={handleRefresh}
              disabled={refreshing}
            >
              <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            </Button>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {/* CA du mois */}
          <Card className="bg-white/5 border-white/10 text-white">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-white/50 truncate">CA ce mois</p>
                  <p className="mt-1 text-lg font-bold truncate">{formatCurrency(kpis.ca_month)}</p>
                  <div className={cn(
                    'mt-1 flex items-center gap-1 text-xs',
                    caEvolution >= 0 ? 'text-emerald-400' : 'text-red-400'
                  )}>
                    <TrendingUp className="h-3 w-3" />
                    <span>{caEvolution >= 0 ? '+' : ''}{caEvolution.toFixed(1)}%</span>
                  </div>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/20">
                  <Euro className="h-5 w-5 text-emerald-400" />
                </div>
              </div>
              {sparklineData.length > 0 && (
                <div className="mt-3 h-12">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={sparklineData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="caGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <Area
                        type="monotone"
                        dataKey="value"
                        stroke="#10b981"
                        strokeWidth={1.5}
                        fill="url(#caGradient)"
                        dot={false}
                      />
                      <Tooltip
                        contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 11 }}
                        formatter={(v: number) => [formatCurrency(v), 'CA']}
                        labelFormatter={(l) => l}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Devis en cours */}
          <Card className="bg-white/5 border-white/10 text-white">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-white/50 truncate">Devis en cours</p>
                  <p className="mt-1 text-lg font-bold">{kpis.devis_en_cours}</p>
                  <p className="mt-1 text-xs text-white/40 truncate">{formatCurrency(kpis.devis_montant)}</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/20">
                  <FileText className="h-5 w-5 text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Factures impayées */}
          <Card className="bg-white/5 border-white/10 text-white">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-white/50 truncate">Factures impayées</p>
                  <p className="mt-1 text-lg font-bold">{kpis.factures_impayees}</p>
                  <p className="mt-1 text-xs text-red-400 truncate">{formatCurrency(kpis.factures_montant)}</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-500/20">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Interventions aujourd'hui */}
          <Card className="bg-white/5 border-white/10 text-white">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <p className="text-xs text-white/50 truncate">Chantiers aujourd'hui</p>
                  <p className="mt-1 text-lg font-bold">{kpis.interventions_today}</p>
                  <p className="mt-1 text-xs text-white/40">planifiés</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-purple-500/20">
                  <Briefcase className="h-5 w-5 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ── Morning Digest ── */}
        <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-emerald-500/5">
          <CardHeader className="pb-3 pt-4 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/20">
                  <Zap className="h-4 w-4 text-emerald-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold text-white">Briefing du jour</CardTitle>
                  <p className="text-xs text-white/50">Résumé par l'Agent IA Chef de Bureau</p>
                </div>
              </div>
              {totalAlerts > 0 && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                  {totalAlerts} action{totalAlerts > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">

            {/* 1. Chantiers du jour */}
            <Collapsible open={openChantiers} onOpenChange={setOpenChantiers}>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-white/5 px-3 py-3 text-left hover:bg-white/10 transition-colors min-h-[48px]">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-emerald-400" />
                  <span className="text-sm font-medium text-white">Chantiers du jour</span>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                    {digest.chantiers_today.length}
                  </Badge>
                </div>
                {openChantiers ? (
                  <ChevronUp className="h-4 w-4 text-white/40" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-white/40" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 space-y-2">
                  {digest.chantiers_today.length === 0 ? (
                    <p className="px-3 py-2 text-sm text-white/40">Aucun chantier planifié aujourd'hui</p>
                  ) : (
                    digest.chantiers_today.map((ev) => (
                      <div
                        key={ev.id}
                        className="flex items-start gap-3 rounded-lg bg-white/5 px-3 py-3 cursor-pointer hover:bg-white/10 transition-colors"
                        onClick={() => router.push(`/planning/${ev.id}`)}
                      >
                        <div className="mt-0.5">{getWeatherIcon(ev.weather?.severity)}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-white truncate">{ev.title}</span>
                            {ev.weather && (
                              <span className={cn(
                                'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs',
                                getWeatherBadgeVariant(ev.weather.severity)
                              )}>
                                {getWeatherIcon(ev.weather.severity)}
                                {getWeatherLabel(ev.weather.severity)}
                              </span>
                            )}
                          </div>
                          {ev.client_name && (
                            <p className="text-xs text-white/50 mt-0.5">{ev.client_name}</p>
                          )}
                          <p className="text-xs text-white/40 mt-0.5">
                            {formatTimeFromISO(ev.start_datetime)} – {formatTimeFromISO(ev.end_datetime)}
                          </p>
                        </div>
                        <ArrowRight className="h-3 w-3 text-white/20 shrink-0 mt-1" />
                      </div>
                    ))
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* 2. Retards */}
            <Collapsible open={openRetards} onOpenChange={setOpenRetards}>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-white/5 px-3 py-3 text-left hover:bg-white/10 transition-colors min-h-[48px]">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400" />
                  <span className="text-sm font-medium text-white">Retards de paiement</span>
                  {digest.retards.length > 0 && (
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                      {digest.retards.length}
                    </Badge>
                  )}
                </div>
                {openRetards ? (
                  <ChevronUp className="h-4 w-4 text-white/40" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-white/40" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 space-y-2">
                  {digest.retards.length === 0 ? (
                    <div className="flex items-center gap-2 px-3 py-2">
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                      <p className="text-sm text-white/40">Aucune facture en retard</p>
                    </div>
                  ) : (
                    digest.retards.map((inv) => (
                      <div
                        key={inv.id}
                        className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-3 cursor-pointer hover:bg-white/10 transition-colors"
                        onClick={() => router.push(`/facturation/${inv.id}`)}
                      >
                        <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">{inv.reference}</span>
                            <span className={cn(
                              'rounded-full border px-2 py-0.5 text-xs',
                              getInvoiceStatusBadge(inv.status)
                            )}>En retard</span>
                          </div>
                          {inv.client_name && (
                            <p className="text-xs text-white/50">{inv.client_name}</p>
                          )}
                          <p className="text-xs text-red-400">
                            Échéance: {inv.date_echeance ? formatDate(inv.date_echeance) : '—'} · {formatCurrency(inv.remaining_ttc || 0)}
                          </p>
                        </div>
                        <ArrowRight className="h-3 w-3 text-white/20 shrink-0" />
                      </div>
                    ))
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* 3. Relances à envoyer */}
            <Collapsible open={openRelances} onOpenChange={setOpenRelances}>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-white/5 px-3 py-3 text-left hover:bg-white/10 transition-colors min-h-[48px]">
                <div className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-orange-400" />
                  <span className="text-sm font-medium text-white">Relances à envoyer</span>
                  {digest.relances.length > 0 && (
                    <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                      {digest.relances.length}
                    </Badge>
                  )}
                </div>
                {openRelances ? (
                  <ChevronUp className="h-4 w-4 text-white/40" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-white/40" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 space-y-2">
                  {digest.relances.length === 0 ? (
                    <div className="flex items-center gap-2 px-3 py-2">
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                      <p className="text-sm text-white/40">Aucune relance à envoyer</p>
                    </div>
                  ) : (
                    digest.relances.map((rw) => (
                      <div
                        key={rw.id}
                        className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-3 cursor-pointer hover:bg-white/10 transition-colors"
                        onClick={() => router.push(`/relances`)}
                      >
                        <Bell className="h-4 w-4 text-orange-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            {rw.invoice_ref && (
                              <span className="text-sm font-medium text-white">{rw.invoice_ref}</span>
                            )}
                            <span className="rounded-full border bg-orange-500/20 text-orange-400 border-orange-500/30 px-2 py-0.5 text-xs">
                              {getReminderLevelLabel(rw.current_level)}
                            </span>
                          </div>
                          {rw.client_name && (
                            <p className="text-xs text-white/50">{rw.client_name}</p>
                          )}
                          {rw.next_reminder_at && (
                            <p className="text-xs text-orange-400">
                              Prévue: {formatDate(rw.next_reminder_at)}
                            </p>
                          )}
                        </div>
                        <ArrowRight className="h-3 w-3 text-white/20 shrink-0" />
                      </div>
                    ))
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* 4. Documents en attente */}
            <Collapsible open={openDocs} onOpenChange={setOpenDocs}>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-white/5 px-3 py-3 text-left hover:bg-white/10 transition-colors min-h-[48px]">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-400" />
                  <span className="text-sm font-medium text-white">Devis en attente de réponse</span>
                  {digest.docs_en_attente.length > 0 && (
                    <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                      {digest.docs_en_attente.length}
                    </Badge>
                  )}
                </div>
                {openDocs ? (
                  <ChevronUp className="h-4 w-4 text-white/40" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-white/40" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 space-y-2">
                  {digest.docs_en_attente.length === 0 ? (
                    <div className="flex items-center gap-2 px-3 py-2">
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                      <p className="text-sm text-white/40">Aucun devis en attente</p>
                    </div>
                  ) : (
                    digest.docs_en_attente.map((q) => (
                      <div
                        key={q.id}
                        className="flex items-center gap-3 rounded-lg bg-white/5 px-3 py-3 cursor-pointer hover:bg-white/10 transition-colors"
                        onClick={() => router.push(`/devis/${q.id}`)}
                      >
                        <FileText className="h-4 w-4 text-yellow-400 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">{q.reference}</span>
                            <span className="rounded-full border bg-yellow-500/20 text-yellow-400 border-yellow-500/30 px-2 py-0.5 text-xs">
                              {getQuoteStatusLabel(q.status)}
                            </span>
                          </div>
                          {q.client_name && (
                            <p className="text-xs text-white/50">{q.client_name}</p>
                          )}
                          <p className="text-xs text-white/40">
                            Envoyé le {q.date_emission ? formatDate(q.date_emission) : '—'} · {formatCurrency(q.total_ttc || 0)}
                          </p>
                        </div>
                        <ArrowRight className="h-3 w-3 text-white/20 shrink-0" />
                      </div>
                    ))
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* 5. Trous de planning */}
            <Collapsible open={openTrous} onOpenChange={setOpenTrous}>
              <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg bg-white/5 px-3 py-3 text-left hover:bg-white/10 transition-colors min-h-[48px]">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-purple-400" />
                  <span className="text-sm font-medium text-white">Trous de planning cette semaine</span>
                  {digest.trous_planning.length > 0 && (
                    <Badge className="bg-purple-500/20 text-purple-400 border-purple-500/30 text-xs">
                      {digest.trous_planning.length} jour{digest.trous_planning.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
                {openTrous ? (
                  <ChevronUp className="h-4 w-4 text-white/40" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-white/40" />
                )}
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2">
                  {digest.trous_planning.length === 0 ? (
                    <div className="flex items-center gap-2 px-3 py-2">
                      <CheckCircle className="h-4 w-4 text-emerald-400" />
                      <p className="text-sm text-white/40">Planning bien rempli cette semaine</p>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 px-1 py-1">
                      {digest.trous_planning.map((day) => (
                        <button
                          key={day}
                          className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-2 text-xs text-purple-300 hover:bg-purple-500/20 transition-colors min-h-[48px] flex items-center"
                          onClick={() => router.push(`/planning?date=${day}`)}
                        >
                          {formatDayFR(day)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </Collapsible>

          </CardContent>
        </Card>

        {/* ── Bottom Grid ── */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">

          {/* AI Suggestions */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/20">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                </div>
                <CardTitle className="text-sm font-semibold text-white">Suggestions IA</CardTitle>
                {aiSuggestions.length > 0 && (
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs ml-auto">
                    {aiSuggestions.length}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {aiSuggestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Sparkles className="h-8 w-8 text-white/20 mb-2" />
                  <p className="text-sm text-white/40">Aucune suggestion en attente</p>
                </div>
              ) : (
                <ScrollArea className="max-h-64">
                  <div className="space-y-3">
                    {aiSuggestions.map((s) => (
                      <div
                        key={s.id}
                        className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 cursor-pointer hover:bg-emerald-500/10 transition-colors"
                        onClick={() => router.push(`/ia/propositions/${s.id}`)}
                      >
                        <div className="flex items-start gap-2">
                          <Sparkles className="h-3.5 w-3.5 text-emerald-400 mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium text-white truncate">{s.title}</p>
                              {s.confidence_score != null && (
                                <span className="text-xs text-emerald-400 shrink-0">
                                  {Math.round((s.confidence_score as number) * 100)}%
                                </span>
                              )}
                            </div>
                            {s.description && (
                              <p className="text-xs text-white/50 mt-0.5 line-clamp-2">{s.description}</p>
                            )}
                            <p className="text-xs text-emerald-500/70 mt-1">{s.agent_label}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>

          {/* Activity Timeline */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2 pt-4 px-4">
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/20">
                  <Activity className="h-4 w-4 text-blue-400" />
                </div>
                <CardTitle className="text-sm font-semibold text-white">Activité récente</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {activity.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Activity className="h-8 w-8 text-white/20 mb-2" />
                  <p className="text-sm text-white/40">Aucune activité récente</p>
                </div>
              ) : (
                <ScrollArea className="max-h-64">
                  <div className="space-y-1">
                    {activity.map((entry, idx) => (
                      <div key={entry.id} className="flex items-start gap-3 py-2">
                        <div className="relative flex flex-col items-center">
                          <div className="h-2 w-2 rounded-full bg-white/30 mt-1.5" />
                          {idx < activity.length - 1 && (
                            <div className="w-px flex-1 bg-white/10 mt-1" style={{ minHeight: 20 }} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0 pb-1">
                          <p className="text-sm text-white/80">
                            <span className="font-medium">{getActionLabel(entry.action)}</span>
                            {' · '}
                            <span className="text-white/50">{getEntityLabel(entry.entity_type)}</span>
                          </p>
                          <p className="text-xs text-white/30">
                            {new Date(entry.created_at).toLocaleString('fr-FR', {
                              day: '2-digit', month: '2-digit',
                              hour: '2-digit', minute: '2-digit',
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Quick Actions ── */}
        <div className="grid grid-cols-3 gap-3">
          <Button
            className="min-h-[56px] flex-col gap-1.5 bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:text-white h-auto py-3"
            variant="outline"
            onClick={() => router.push('/devis/nouveau')}
          >
            <Plus className="h-5 w-5" />
            <span className="text-xs font-medium">Nouveau devis</span>
          </Button>
          <Button
            className="min-h-[56px] flex-col gap-1.5 bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:text-white h-auto py-3"
            variant="outline"
            onClick={() => router.push('/clients/nouveau')}
          >
            <UserPlus className="h-5 w-5" />
            <span className="text-xs font-medium">Nouveau client</span>
          </Button>
          <Button
            className="min-h-[56px] flex-col gap-1.5 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/30 hover:text-emerald-300 h-auto py-3"
            variant="outline"
            onClick={() => router.push('/devis/assistant-ia')}
          >
            <Sparkles className="h-5 w-5" />
            <span className="text-xs font-medium">Devis IA</span>
          </Button>
        </div>

      </div>
    </div>
  );
}
