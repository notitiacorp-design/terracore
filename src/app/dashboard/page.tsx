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

      // FIX #1: user_profile.id = auth.users.id, NOT auth_user_id
      const { data: profile } = await supabase
        .from('user_profile')
        .select('company_id, first_name, last_name')
        .eq('id', user.id)
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
      // FIX #5: Use getTime() - 1 for clean last-millisecond-of-previous-month
      const prevMonthEnd = new Date(monthStart.getTime() - 1);

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
          // FIX #2: Use 'remaining_due' instead of 'remaining_ttc'
          supabase
            .from('invoice')
            .select('remaining_due')
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
      // FIX #3: Use r.remaining_due instead of r.remaining_ttc
      const facturesMontant = (invoicesImpayees.data || []).reduce((s, r) => s + (r.remaining_due || 0), 0);

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
        .order('date_due', { ascending: true })
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
        .select('*, invoice:invoice_id(reference, client:client_id(first_name, last_name, company_name))')
        .eq('company_id', cid)
        .eq('is_active', true)
        .order('last_action_at', { ascending: true })
        .limit(10);

      const relances = (relancesRaw || []).map((rw: any) => ({
        ...rw,
        invoice_ref: rw.invoice?.reference,
        client_name: rw.invoice?.client
          ? rw.invoice.client.company_name || `${rw.invoice.client.first_name || ''} ${rw.invoice.client.last_name || ''}`.trim()
          : undefined,
      }));

      // 4. Devis en attente de signature
      const { data: docsRaw } = await supabase
        .from('quote')
        .select('*, client:client_id(first_name, last_name, company_name)')
        .eq('company_id', cid)
        .eq('status', 'envoye')
        .order('date_validity', { ascending: true })
        .limit(10);

      const docsEnAttente = (docsRaw || []).map((q: any) => ({
        ...q,
        client_name: q.client
          ? q.client.company_name || `${q.client.first_name || ''} ${q.client.last_name || ''}`.trim()
          : undefined,
      }));

      // 5. Trous de planning cette semaine
      const { data: weekEvents } = await supabase
        .from('schedule_event')
        .select('start_datetime')
        .eq('company_id', cid)
        .eq('event_type', 'chantier')
        .gte('start_datetime', weekDays[0] + 'T00:00:00')
        .lte('start_datetime', weekDays[weekDays.length - 1] + 'T23:59:59');

      const daysWithEvents = new Set(
        (weekEvents || []).map((e) => e.start_datetime.split('T')[0])
      );
      const trousPlanning = weekDays.filter((d) => !daysWithEvents.has(d));

      setDigest({
        chantiers_today: chantiersWithWeather,
        retards,
        relances,
        docs_en_attente: docsEnAttente,
        trous_planning: trousPlanning,
      });

      // ── AI Suggestions ─────────────────────────────────────────────────────
      const { data: aiRaw } = await supabase
        .from('ai_proposal')
        .select('*, agent_run:agent_run_id(agent_type)')
        .eq('company_id', cid)
        .is('accepted_at', null)
        .is('dismissed_at', null)
        .order('created_at', { ascending: false })
        .limit(5);

      const aiProposals: AiSuggestion[] = (aiRaw || []).map((p: any) => ({
        ...p,
        agent_label: getAgentLabel(p.agent_run?.agent_type),
      }));
      setAiSuggestions(aiProposals);

      // ── Activity Feed ──────────────────────────────────────────────────────
      // FIX #6: Do NOT select 'user_name' from audit_log; join user_profile via user_id
      const { data: auditRaw } = await supabase
        .from('audit_log')
        .select('id, action, entity_type, entity_id, created_at, user_id, user_profile:user_id(first_name, last_name)')
        .eq('company_id', cid)
        .order('created_at', { ascending: false })
        .limit(20);

      const activityEntries: ActivityEntry[] = (auditRaw || []).map((log: any) => {
        const profile = log.user_profile;
        const user_name = profile
          ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || undefined
          : undefined;
        return {
          id: log.id,
          action: log.action,
          entity_type: log.entity_type,
          entity_id: log.entity_id,
          created_at: log.created_at,
          user_name,
        };
      });
      setActivity(activityEntries);

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

  const caGrowth = kpis.ca_prev_month > 0
    ? ((kpis.ca_month - kpis.ca_prev_month) / kpis.ca_prev_month) * 100
    : kpis.ca_month > 0 ? 100 : 0;

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-screen-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Tableau de bord</h1>
          <p className="text-sm text-gray-400 mt-0.5">
            {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={refreshing}
            className="border-white/10 text-gray-300 hover:text-white"
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', refreshing && 'animate-spin')} />
            Actualiser
          </Button>
          {/* FIX #7: Route must start with /dashboard/ */}
          <Button
            size="sm"
            onClick={() => router.push('/dashboard/documents/devis/nouveau')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nouveau devis
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CA du mois */}
        <Card className="bg-[#1a1f2e] border-white/10">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">CA du mois</p>
                <p className="text-2xl font-bold text-white mt-1">{formatCurrency(kpis.ca_month)}</p>
                <p className={cn(
                  'text-xs mt-1',
                  caGrowth >= 0 ? 'text-emerald-400' : 'text-red-400'
                )}>
                  {caGrowth >= 0 ? '+' : ''}{caGrowth.toFixed(1)}% vs mois dernier
                </p>
              </div>
              <div className="p-2 rounded-lg bg-emerald-500/10">
                <Euro className="h-5 w-5 text-emerald-400" />
              </div>
            </div>
            {sparklineData.length > 0 && (
              <div className="mt-3 h-12">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={sparklineData}>
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
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Devis en cours */}
        <Card className="bg-[#1a1f2e] border-white/10">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Devis en cours</p>
                <p className="text-2xl font-bold text-white mt-1">{kpis.devis_en_cours}</p>
                <p className="text-xs text-gray-400 mt-1">{formatCurrency(kpis.devis_montant)} potentiels</p>
              </div>
              <div className="p-2 rounded-lg bg-blue-500/10">
                <FileText className="h-5 w-5 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Factures impayées */}
        <Card className="bg-[#1a1f2e] border-white/10">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Factures impayées</p>
                <p className="text-2xl font-bold text-white mt-1">{kpis.factures_impayees}</p>
                <p className="text-xs text-red-400 mt-1">{formatCurrency(kpis.factures_montant)} en attente</p>
              </div>
              <div className="p-2 rounded-lg bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interventions aujourd'hui */}
        <Card className="bg-[#1a1f2e] border-white/10">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide">Interventions aujourd'hui</p>
                <p className="text-2xl font-bold text-white mt-1">{kpis.interventions_today}</p>
                <p className="text-xs text-gray-400 mt-1">chantiers planifiés</p>
              </div>
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Calendar className="h-5 w-5 text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {/* FIX #7: Route /dashboard/documents/devis/nouveau */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/dashboard/documents/devis/nouveau')}
          className="border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
        >
          <Plus className="h-4 w-4 mr-1.5" />
          Nouveau devis
        </Button>
        {/* FIX #8: Route /dashboard/clients/nouveau */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/dashboard/clients/nouveau')}
          className="border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
        >
          <UserPlus className="h-4 w-4 mr-1.5" />
          Nouveau client
        </Button>
        {/* FIX #9: Route /dashboard/documents/devis-ia */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/dashboard/documents/devis-ia')}
          className="border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
        >
          <Sparkles className="h-4 w-4 mr-1.5" />
          Devis IA
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/dashboard/planning')}
          className="border-white/10 text-gray-300 hover:text-white hover:bg-white/5"
        >
          <Calendar className="h-4 w-4 mr-1.5" />
          Planning
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Morning Digest */}
        <div className="lg:col-span-2 space-y-4">
          {/* Chantiers du jour */}
          <Collapsible open={openChantiers} onOpenChange={setOpenChantiers}>
            <Card className="bg-[#1a1f2e] border-white/10">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-white/5 rounded-t-xl transition-colors py-3 px-5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                      <Briefcase className="h-4 w-4 text-blue-400" />
                      Chantiers du jour
                      <Badge className="bg-blue-500/20 text-blue-300 border-blue-500/30 text-xs">
                        {digest.chantiers_today.length}
                      </Badge>
                    </CardTitle>
                    {openChantiers ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 px-5 pb-4">
                  {digest.chantiers_today.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">Aucun chantier prévu aujourd'hui.</p>
                  ) : (
                    <div className="space-y-2">
                      {digest.chantiers_today.map((ev) => (
                        <div
                          key={ev.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors cursor-pointer"
                          onClick={() => router.push(`/dashboard/planning`)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{ev.title}</p>
                            {ev.client_name && (
                              <p className="text-xs text-gray-400">{ev.client_name}</p>
                            )}
                            <p className="text-xs text-gray-500">
                              {formatTimeFromISO(ev.start_datetime)}
                              {ev.end_datetime ? ` – ${formatTimeFromISO(ev.end_datetime)}` : ''}
                            </p>
                          </div>
                          {ev.weather && (
                            <div className="flex items-center gap-1.5 ml-3">
                              {getWeatherIcon(ev.weather.severity)}
                              <span className={cn(
                                'text-xs px-1.5 py-0.5 rounded border',
                                getWeatherBadgeVariant(ev.weather.severity)
                              )}>
                                {getWeatherLabel(ev.weather.severity)}
                              </span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Retards */}
          <Collapsible open={openRetards} onOpenChange={setOpenRetards}>
            <Card className="bg-[#1a1f2e] border-white/10">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-white/5 rounded-t-xl transition-colors py-3 px-5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-400" />
                      Factures en retard
                      <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                        {digest.retards.length}
                      </Badge>
                    </CardTitle>
                    {openRetards ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 px-5 pb-4">
                  {digest.retards.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">Aucune facture en retard.</p>
                  ) : (
                    <div className="space-y-2">
                      {digest.retards.map((inv) => (
                        <div
                          key={inv.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors cursor-pointer"
                          onClick={() => router.push(`/dashboard/documents/factures/${inv.id}`)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{inv.reference}</p>
                            {(inv as any).client_name && (
                              <p className="text-xs text-gray-400">{(inv as any).client_name}</p>
                            )}
                            {inv.date_due && (
                              <p className="text-xs text-red-400">Échéance : {formatDate(inv.date_due)}</p>
                            )}
                          </div>
                          <div className="text-right ml-3">
                            <p className="text-sm font-semibold text-red-400">{formatCurrency(inv.remaining_due || 0)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Relances */}
          <Collapsible open={openRelances} onOpenChange={setOpenRelances}>
            <Card className="bg-[#1a1f2e] border-white/10">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-white/5 rounded-t-xl transition-colors py-3 px-5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                      <Bell className="h-4 w-4 text-orange-400" />
                      Relances actives
                      <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs">
                        {digest.relances.length}
                      </Badge>
                    </CardTitle>
                    {openRelances ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 px-5 pb-4">
                  {digest.relances.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">Aucune relance active.</p>
                  ) : (
                    <div className="space-y-2">
                      {digest.relances.map((rw) => (
                        <div
                          key={rw.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors cursor-pointer"
                          onClick={() => router.push(`/dashboard/documents/factures/${rw.invoice_id}`)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">
                              {(rw as any).invoice_ref || rw.invoice_id}
                            </p>
                            {(rw as any).client_name && (
                              <p className="text-xs text-gray-400">{(rw as any).client_name}</p>
                            )}
                          </div>
                          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 text-xs ml-3">
                            {getReminderLevelLabel(rw.current_level)}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Devis en attente */}
          <Collapsible open={openDocs} onOpenChange={setOpenDocs}>
            <Card className="bg-[#1a1f2e] border-white/10">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-white/5 rounded-t-xl transition-colors py-3 px-5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                      <Clock className="h-4 w-4 text-yellow-400" />
                      Devis en attente de signature
                      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                        {digest.docs_en_attente.length}
                      </Badge>
                    </CardTitle>
                    {openDocs ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 px-5 pb-4">
                  {digest.docs_en_attente.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">Aucun devis en attente.</p>
                  ) : (
                    <div className="space-y-2">
                      {digest.docs_en_attente.map((q) => (
                        <div
                          key={q.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors cursor-pointer"
                          onClick={() => router.push(`/dashboard/documents/devis/${q.id}`)}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white truncate">{q.reference}</p>
                            {(q as any).client_name && (
                              <p className="text-xs text-gray-400">{(q as any).client_name}</p>
                            )}
                            {q.date_validity && (
                              <p className="text-xs text-gray-500">Valide jusqu'au {formatDate(q.date_validity)}</p>
                            )}
                          </div>
                          <div className="text-right ml-3">
                            <p className="text-sm font-semibold text-white">{formatCurrency(q.total_ttc || 0)}</p>
                            <p className="text-xs text-gray-400">{getQuoteStatusLabel(q.status)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>

          {/* Trous de planning */}
          <Collapsible open={openTrous} onOpenChange={setOpenTrous}>
            <Card className="bg-[#1a1f2e] border-white/10">
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-white/5 rounded-t-xl transition-colors py-3 px-5">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      Trous de planning cette semaine
                      <Badge className="bg-gray-500/20 text-gray-400 border-gray-500/30 text-xs">
                        {digest.trous_planning.length}
                      </Badge>
                    </CardTitle>
                    {openTrous ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="pt-0 px-5 pb-4">
                  {digest.trous_planning.length === 0 ? (
                    <p className="text-sm text-gray-500 py-2">Planning complet cette semaine.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2 pt-1">
                      {digest.trous_planning.map((d) => (
                        <Badge
                          key={d}
                          className="bg-gray-500/20 text-gray-300 border-gray-500/30 text-xs cursor-pointer hover:bg-gray-500/30"
                          onClick={() => router.push('/dashboard/planning')}
                        >
                          {formatDayFR(d)}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        </div>

        {/* Right column: AI + Activity */}
        <div className="space-y-4">
          {/* AI Suggestions */}
          <Card className="bg-[#1a1f2e] border-white/10">
            <CardHeader className="py-3 px-5">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <Zap className="h-4 w-4 text-purple-400" />
                Suggestions IA
                {aiSuggestions.length > 0 && (
                  <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-xs">
                    {aiSuggestions.length}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-5 pb-4">
              {aiSuggestions.length === 0 ? (
                <p className="text-sm text-gray-500">Aucune suggestion pour le moment.</p>
              ) : (
                <div className="space-y-3">
                  {aiSuggestions.map((s) => (
                    <div key={s.id} className="p-3 rounded-lg bg-purple-500/5 border border-purple-500/20">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-purple-300">{s.agent_label}</p>
                          <p className="text-sm text-white mt-0.5">{s.title}</p>
                          {s.description && (
                            <p className="text-xs text-gray-400 mt-1 line-clamp-2">{s.description}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Button
                          size="sm"
                          className="h-6 text-xs bg-purple-600 hover:bg-purple-700 px-2"
                          onClick={async () => {
                            await supabase
                              .from('ai_proposal')
                              .update({ accepted_at: new Date().toISOString(), is_accepted: true })
                              .eq('id', s.id);
                            setAiSuggestions((prev) => prev.filter((p) => p.id !== s.id));
                          }}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Accepter
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs text-gray-400 hover:text-white px-2"
                          onClick={async () => {
                            await supabase
                              .from('ai_proposal')
                              .update({ dismissed_at: new Date().toISOString() })
                              .eq('id', s.id);
                            setAiSuggestions((prev) => prev.filter((p) => p.id !== s.id));
                          }}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Ignorer
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Activity Feed */}
          <Card className="bg-[#1a1f2e] border-white/10">
            <CardHeader className="py-3 px-5">
              <CardTitle className="text-sm font-semibold text-white flex items-center gap-2">
                <Activity className="h-4 w-4 text-blue-400" />
                Activité récente
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 px-5 pb-4">
              <ScrollArea className="h-64">
                {activity.length === 0 ? (
                  <p className="text-sm text-gray-500">Aucune activité récente.</p>
                ) : (
                  <div className="space-y-2">
                    {activity.map((entry) => (
                      <div key={entry.id} className="flex items-start gap-2 py-1.5 border-b border-white/5 last:border-0">
                        <div className="mt-0.5 p-1 rounded bg-blue-500/10">
                          <Activity className="h-3 w-3 text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-white">
                            <span className="font-medium">{getActionLabel(entry.action)}</span>
                            {' '}{getEntityLabel(entry.entity_type)}
                          </p>
                          {entry.user_name && (
                            <p className="text-xs text-gray-500">par {entry.user_name}</p>
                          )}
                          <p className="text-xs text-gray-600">{formatDate(entry.created_at)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
