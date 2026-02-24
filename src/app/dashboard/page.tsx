"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  TrendingUp,
  TrendingDown,
  FileText,
  AlertCircle,
  BarChart3,
  Clock,
  MapPin,
  User,
  Check,
  X,
  Sparkles,
  CloudRain,
  Mail,
  Zap,
  CalendarClock,
  Euro,
  Activity,
  Plus,
  RefreshCw,
} from "lucide-react";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatDistanceToNow, format, isToday, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
interface KPIData {
  revenue: number;
  revenueChange: number;
  revenueTrend: { month: string; value: number }[];
  pendingQuotes: number;
  pendingQuotesAmount: number;
  unpaidInvoices: number;
  unpaidInvoicesAmount: number;
  averageMargin: number;
  marginChange: number;
}

interface ScheduleEvent {
  id: string;
  title: string;
  start_datetime: string;
  end_datetime: string;
  event_type: string;
  client_id?: string | null;
  site_address_id?: string | null;
  description?: string | null;
}

interface AIProposal {
  id: string;
  type: "weather" | "relance" | "devis";
  title: string;
  description: string;
  impact?: string;
  dismissed: boolean;
}

interface ActivityEntry {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at: string;
  user?: {
    first_name: string;
    last_name: string;
  };
}

// ─────────────────────────────────────────────
// Mock Data
// ─────────────────────────────────────────────
const MOCK_KPI: KPIData = {
  revenue: 48350,
  revenueChange: 12.4,
  revenueTrend: [
    { month: "Jan", value: 32000 },
    { month: "Fév", value: 38000 },
    { month: "Mar", value: 35000 },
    { month: "Avr", value: 42000 },
    { month: "Mai", value: 45000 },
    { month: "Jun", value: 48350 },
  ],
  pendingQuotes: 7,
  pendingQuotesAmount: 23800,
  unpaidInvoices: 4,
  unpaidInvoicesAmount: 15200,
  averageMargin: 34.8,
  marginChange: 2.1,
};

const MOCK_EVENTS: ScheduleEvent[] = [
  {
    id: "1",
    title: "Taille de haies - Résidence Bellevue",
    start_datetime: "2024-06-20T08:00:00",
    end_datetime: "2024-06-20T12:00:00",
    event_type: "intervention",
    client_id: "client-1",
    site_address_id: "addr-1",
    description: "Taille de haies",
  },
  {
    id: "2",
    title: "Tonte pelouse + désherbage",
    start_datetime: "2024-06-20T13:30:00",
    end_datetime: "2024-06-20T17:00:00",
    event_type: "intervention",
    client_id: "client-2",
    site_address_id: "addr-2",
    description: "Tonte pelouse",
  },
  {
    id: "3",
    title: "Installation système d'arrosage",
    start_datetime: "2024-06-20T09:00:00",
    end_datetime: "2024-06-20T11:30:00",
    event_type: "intervention",
    client_id: "client-3",
    site_address_id: "addr-3",
    description: "Installation arrosage",
  },
];

const MOCK_PROPOSALS: AIProposal[] = [
  {
    id: "1",
    type: "weather",
    title: "Replanification recommandée — Jeudi 22 juin",
    description:
      "Forte pluie prévue (18mm) jeudi matin. 3 chantiers de tonte pourraient être avancés à mercredi soir ou reportés à vendredi.",
    impact: "Éviter 2,5h de déplacement inutile",
    dismissed: false,
  },
  {
    id: "2",
    type: "relance",
    title: "Relancer M. Renard — Devis #DEV-2024-089",
    description:
      "Le devis de 4 200€ pour la création d'une terrasse est en attente depuis 12 jours. Taux de conversion habituel: 68% à 14 jours.",
    impact: "+4 200€ potentiels",
    dismissed: false,
  },
  {
    id: "3",
    type: "devis",
    title: "Optimisation tarifaire — Devis saisonniers",
    description:
      "Vos devis d'entretien estival sont en moyenne 8% en dessous des tarifs du marché dans votre zone. Une révision à la hausse est possible sans impact sur la conversion.",
    impact: "+3 800€ sur les contrats annuels",
    dismissed: false,
  },
];

const MOCK_ACTIVITY: ActivityEntry[] = [
  {
    id: "1",
    action: "create",
    entity_type: "devis",
    entity_id: "DEV-2024-094",
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    user: { first_name: "Sophie", last_name: "Bernard" },
  },
  {
    id: "2",
    action: "update",
    entity_type: "facture",
    entity_id: "FAC-2024-047",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    user: { first_name: "Jean", last_name: "Martin" },
  },
  {
    id: "3",
    action: "create",
    entity_type: "chantier",
    entity_id: "CHANT-001",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    user: { first_name: "Admin", last_name: "" },
  },
  {
    id: "4",
    action: "update",
    entity_type: "client",
    entity_id: "CLI-042",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    user: { first_name: "Paul", last_name: "Durand" },
  },
  {
    id: "5",
    action: "delete",
    entity_type: "planification",
    entity_id: "PLAN-007",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    user: { first_name: "Jean", last_name: "Martin" },
  },
];

// ─────────────────────────────────────────────
// Utility helpers
// ─────────────────────────────────────────────
function formatEUR(amount: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatTime(iso: string): string {
  return format(parseISO(iso), "HH:mm");
}

function relativeTime(iso: string): string {
  return formatDistanceToNow(parseISO(iso), { addSuffix: true, locale: fr });
}

function getActivityLabel(entry: ActivityEntry): string {
  const actionMap: Record<string, string> = {
    create: "Création",
    update: "Mise à jour",
    delete: "Suppression",
  };
  const action = actionMap[entry.action] ?? entry.action;
  return `${action} — ${entry.entity_type} #${entry.entity_id}`;
}

function getUserDisplayName(user?: { first_name: string; last_name: string }): string {
  if (!user) return "Système";
  return `${user.first_name} ${user.last_name}`.trim() || "Système";
}

// ─────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────

/** WeatherBadge */
function WeatherBadge({
  weather,
}: {
  weather: { temp: number; condition: string; icon: string };
}) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
      <span>{weather.icon}</span>
      <span>{weather.temp}°C</span>
    </span>
  );
}

/** KPICard */
interface KPICardProps {
  title: string;
  value: string;
  subtitle?: string;
  change?: number;
  icon: React.ReactNode;
  accentColor?: string;
  sparkline?: { month: string; value: number }[];
  loading?: boolean;
}

function KPICard({
  title,
  value,
  subtitle,
  change,
  icon,
  accentColor = "text-emerald-600",
  sparkline,
  loading,
}: KPICardProps) {
  if (loading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-5">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden hover:shadow-md transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-sm text-gray-500 font-medium">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
            {subtitle && (
              <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>
            )}
          </div>
          <div
            className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
              accentColor === "text-red-600"
                ? "bg-red-50"
                : accentColor === "text-amber-600"
                ? "bg-amber-50"
                : accentColor === "text-blue-600"
                ? "bg-blue-50"
                : "bg-emerald-50"
            )}
          >
            <div className={accentColor}>{icon}</div>
          </div>
        </div>

        <div className="flex items-end justify-between">
          {change !== undefined && (
            <div
              className={cn(
                "flex items-center gap-1 text-xs font-medium",
                change >= 0 ? "text-emerald-600" : "text-red-600"
              )}
            >
              {change >= 0 ? (
                <TrendingUp className="w-3.5 h-3.5" />
              ) : (
                <TrendingDown className="w-3.5 h-3.5" />
              )}
              <span>
                {change >= 0 ? "+" : ""}
                {change}% vs mois dernier
              </span>
            </div>
          )}
        </div>

        {sparkline && sparkline.length > 0 && (
          <div className="mt-3 h-12">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={sparkline}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#10b981"
                  strokeWidth={2}
                  dot={false}
                />
                <Tooltip
                  formatter={(v: number) => [formatEUR(v), "CA"]}
                  labelFormatter={(l) => l}
                  contentStyle={{
                    fontSize: 11,
                    padding: "4px 8px",
                    borderRadius: 6,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Status badge helper */
function EventTypeBadge({ event_type }: { event_type: string }) {
  const config: Record<string, { label: string; className: string }> = {
    intervention: {
      label: "Intervention",
      className: "bg-blue-100 text-blue-700",
    },
    rdv: {
      label: "RDV",
      className: "bg-emerald-100 text-emerald-700",
    },
    livraison: {
      label: "Livraison",
      className: "bg-amber-100 text-amber-700",
    },
    autre: {
      label: "Autre",
      className: "bg-gray-100 text-gray-600",
    },
  };
  const c = config[event_type] ?? config["autre"];
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
        c.className
      )}
    >
      {c.label}
    </span>
  );
}

/** TodaySchedule */
function TodaySchedule({
  events,
  loading,
}: {
  events: ScheduleEvent[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3 p-4 bg-white rounded-xl border border-gray-100">
            <Skeleton className="w-14 h-14 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-10 text-center">
        <CalendarClock className="w-10 h-10 text-gray-300 mb-2" />
        <p className="text-gray-500 text-sm">Aucune intervention planifiée aujourd'hui</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {events.map((event) => (
        <div
          key={event.id}
          className="flex gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-sm transition-all"
        >
          {/* Time column */}
          <div className="flex flex-col items-center justify-center w-14 flex-shrink-0">
            <span className="text-sm font-bold text-gray-900">
              {formatTime(event.start_datetime)}
            </span>
            <span className="text-xs text-gray-400">—</span>
            <span className="text-xs text-gray-500">
              {formatTime(event.end_datetime)}
            </span>
          </div>

          {/* Divider */}
          <div className="w-px bg-gray-200 flex-shrink-0" />

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2 flex-wrap">
              <p className="text-sm font-semibold text-gray-900 truncate">
                {event.title}
              </p>
              <EventTypeBadge event_type={event.event_type} />
            </div>

            {event.description && (
              <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
                <FileText className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{event.description}</span>
              </div>
            )}

            {event.client_id && (
              <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500">
                <User className="w-3 h-3 flex-shrink-0" />
                <span>{event.client_id}</span>
              </div>
            )}

            {event.site_address_id && (
              <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500">
                <MapPin className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{event.site_address_id}</span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

/** AIProposalCard */
function AIProposalCard({
  proposal,
  onAccept,
  onDismiss,
}: {
  proposal: AIProposal;
  onAccept: (id: string) => void;
  onDismiss: (id: string) => void;
}) {
  const typeConfig: Record<
    AIProposal["type"],
    { icon: React.ReactNode; bgColor: string }
  > = {
    weather: {
      icon: <CloudRain className="w-4 h-4" />,
      bgColor: "bg-sky-50 border-sky-200",
    },
    relance: {
      icon: <Mail className="w-4 h-4" />,
      bgColor: "bg-amber-50 border-amber-200",
    },
    devis: {
      icon: <Zap className="w-4 h-4" />,
      bgColor: "bg-violet-50 border-violet-200",
    },
  };

  const config = typeConfig[proposal.type];

  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition-all hover:shadow-sm",
        config.bgColor
      )}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-200">
            <Sparkles className="w-3 h-3" />
            Suggestion IA
          </span>
          <div className="text-gray-500">{config.icon}</div>
        </div>
        <button
          onClick={() => onDismiss(proposal.id)}
          className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
          aria-label="Ignorer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <h4 className="text-sm font-semibold text-gray-900 mb-1">
        {proposal.title}
      </h4>
      <p className="text-xs text-gray-600 leading-relaxed mb-3">
        {proposal.description}
      </p>

      {proposal.impact && (
        <div className="flex items-center gap-1 mb-3">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
          <span className="text-xs font-medium text-emerald-700">
            Impact estimé: {proposal.impact}
          </span>
        </div>
      )}

      <div className="flex items-center gap-2">
        <Button
          size="sm"
          className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
          onClick={() => onAccept(proposal.id)}
        >
          <Check className="w-3 h-3 mr-1" />
          Appliquer
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 text-xs text-gray-500 hover:text-gray-700"
          onClick={() => onDismiss(proposal.id)}
        >
          Ignorer
        </Button>
      </div>
    </div>
  );
}

/** ActivityTimeline */
function ActivityTimeline({
  entries,
  loading,
}: {
  entries: AuditEntry[];
  loading: boolean;
}) {
  const actionConfig: Record<
    string,
    { icon: React.ReactNode; color: string }
  > = {
    create: {
      icon: <Plus className="w-3.5 h-3.5" />,
      color: "bg-emerald-100 text-emerald-700",
    },
    update: {
      icon: <RefreshCw className="w-3.5 h-3.5" />,
      color: "bg-blue-100 text-blue-700",
    },
    delete: {
      icon: <X className="w-3.5 h-3.5" />,
      color: "bg-red-100 text-red-700",
    },
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-7 h-7 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <Activity className="w-8 h-8 text-gray-300 mb-2" />
        <p className="text-gray-500 text-sm">Aucune activité récente</p>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Vertical line */}
      <div className="absolute left-3.5 top-0 bottom-0 w-px bg-gray-100" />

      <div className="space-y-4">
        {entries.map((entry) => {
          const config =
            actionConfig[entry.action] || actionConfig["update"];
          const entityLabel = `${entry.entity_type} #${entry.entity_id?.slice(0, 8) ?? ""}`;
          const userName =
            entry.user
              ? `${entry.user.first_name ?? ""} ${entry.user.last_name ?? ""}`.trim()
              : undefined;
          return (
            <div key={entry.id} className="flex gap-3 relative">
              <div
                className={cn(
                  "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 relative z-10",
                  config.color
                )}
              >
                {config.icon}
              </div>
              <div className="flex-1 min-w-0 pb-1">
                <p className="text-sm text-gray-800 leading-snug">
                  {entityLabel}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {userName && (
                    <span className="text-xs text-gray-400">
                      {userName}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">·</span>
                  <span className="text-xs text-gray-400">
                    {relativeTime(entry.created_at)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────
export default function DashboardPage() {
  const supabase = createClient();
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [kpi, setKpi] = useState<KPIData | null>(null);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [proposals, setProposals] = useState<AIProposal[]>(MOCK_PROPOSALS);
  const [activity, setActivity] = useState<AuditEntry[]>([]);

  const [loadingKpi, setLoadingKpi] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loadingActivity, setLoadingActivity] = useState(true);

  // Fetch authenticated user & company_id
  useEffect(() => {
    async function bootstrap() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("user_profile")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (profile?.company_id) {
        setCompanyId(profile.company_id);
      }
    }
    bootstrap();
  }, [supabase]);

  // Fetch KPI data
  const fetchKPI = useCallback(async () => {
    if (!companyId) {
      setKpi(MOCK_KPI);
      setLoadingKpi(false);
      return;
    }
    setLoadingKpi(true);
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString();
      const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString();

      const [invoicesThisMonth, invoicesLastMonth, pendingQuotes, unpaidInvoices] =
        await Promise.all([
          supabase
            .from("invoice")
            .select("total_amount")
            .eq("company_id", companyId)
            .gte("created_at", startOfMonth),
          supabase
            .from("invoice")
            .select("total_amount")
            .eq("company_id", companyId)
            .gte("created_at", startOfLastMonth)
            .lte("created_at", endOfLastMonth),
          supabase
            .from("quote")
            .select("id, total_amount")
            .eq("company_id", companyId)
            .eq("status", "pending"),
          supabase
            .from("invoice")
            .select("id, total_amount")
            .eq("company_id", companyId)
            .eq("status", "unpaid"),
        ]);

      const revenueThisMonth =
        invoicesThisMonth.data?.reduce(
          (sum, inv) => sum + (inv.total_amount || 0),
          0
        ) || 0;
      const revenueLastMonth =
        invoicesLastMonth.data?.reduce(
          (sum, inv) => sum + (inv.total_amount || 0),
          0
        ) || 0;

      const revenueChange =
        revenueLastMonth > 0
          ? Math.round(
              ((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 1000
            ) / 10
          : 0;

      const pendingCount = pendingQuotes.data?.length || 0;
      const pendingAmount =
        pendingQuotes.data?.reduce(
          (sum, q) => sum + (q.total_amount || 0),
          0
        ) || 0;

      const unpaidCount = unpaidInvoices.data?.length || 0;
      const unpaidAmount =
        unpaidInvoices.data?.reduce(
          (sum, inv) => sum + (inv.total_amount || 0),
          0
        ) || 0;

      if (revenueThisMonth === 0 && pendingCount === 0) {
        setKpi(MOCK_KPI);
      } else {
        setKpi({
          revenue: revenueThisMonth,
          revenueChange,
          revenueTrend: MOCK_KPI.revenueTrend,
          pendingQuotes: pendingCount,
          pendingQuotesAmount: pendingAmount,
          unpaidInvoices: unpaidCount,
          unpaidInvoicesAmount: unpaidAmount,
          averageMargin: MOCK_KPI.averageMargin,
          marginChange: MOCK_KPI.marginChange,
        });
      }
    } catch (err) {
      console.error("Erreur KPI:", err);
      setKpi(MOCK_KPI);
    } finally {
      setLoadingKpi(false);
    }
  }, [companyId, supabase]);

  // Fetch today's events
  const fetchEvents = useCallback(async () => {
    if (!companyId) {
      setEvents(MOCK_EVENTS);
      setLoadingEvents(false);
      return;
    }
    setLoadingEvents(true);
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const { data, error } = await supabase
        .from("schedule_event")
        .select(
          `
          id, title, start_datetime, end_datetime, event_type,
          client_id, site_address_id, description
        `
        )
        .eq("company_id", companyId)
        .gte("start_datetime", todayStart.toISOString())
        .lte("start_datetime", todayEnd.toISOString())
        .order("start_datetime");

      if (error || !data || data.length === 0) {
        setEvents(MOCK_EVENTS);
        return;
      }

      const mapped: ScheduleEvent[] = data.map((e: any) => ({
        id: e.id,
        title: e.title,
        start_datetime: e.start_datetime,
        end_datetime: e.end_datetime,
        event_type: e.event_type,
        client_id: e.client_id,
        site_address_id: e.site_address_id,
        description: e.description,
      }));

      setEvents(mapped);
    } catch (err) {
      console.error("Erreur planning:", err);
      setEvents(MOCK_EVENTS);
    } finally {
      setLoadingEvents(false);
    }
  }, [companyId, supabase]);

  // Fetch activity
  const fetchActivity = useCallback(async () => {
    if (!companyId) {
      setActivity(MOCK_ACTIVITY);
      setLoadingActivity(false);
      return;
    }
    setLoadingActivity(true);
    try {
      const { data, error } = await supabase
        .from("audit_log")
        .select(
          "id, action, entity_type, entity_id, created_at, user:profiles(first_name, last_name)"
        )
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(8);

      if (error || !data || data.length === 0) {
        setActivity(MOCK_ACTIVITY);
        return;
      }

      const mapped: AuditEntry[] = data.map((log: any) => ({
        id: log.id,
        action: log.action,
        entity_type: log.entity_type,
        entity_id: log.entity_id,
        created_at: log.created_at,
        user: log.user
          ? {
              first_name: log.user.first_name ?? undefined,
              last_name: log.user.last_name ?? undefined,
            }
          : undefined,
      }));

      setActivity(mapped);
    } catch (err) {
      console.error("Erreur activité:", err);
      setActivity(MOCK_ACTIVITY);
    } finally {
      setLoadingActivity(false);
    }
  }, [companyId, supabase]);

  useEffect(() => {
    fetchKPI();
    fetchEvents();
    fetchActivity();
  }, [fetchKPI, fetchEvents, fetchActivity]);

  // Handle AI proposals
  const handleAcceptProposal = (id: string) => {
    setProposals((prev) => prev.filter((p) => p.id !== id));
  };

  const handleDismissProposal = (id: string) => {
    setProposals((prev) => prev.filter((p) => p.id !== id));
  };

  const today = new Date();
  const formattedDate = format(today, "EEEE d MMMM yyyy", { locale: fr });
  const capitalizedDate =
    formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);

  const activeProposals = proposals.filter((p) => !p.dismissed);

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
        <p className="text-sm text-gray-500 mt-0.5">{capitalizedDate}</p>
      </div>

      {/* ── Section 1: KPI Cards ── */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard
            title="CA du mois"
            value={kpi ? formatEUR(kpi.revenue) : "—"}
            change={kpi?.revenueChange}
            icon={<TrendingUp className="w-5 h-5" />}
            accentColor="text-emerald-600"
            sparkline={kpi?.revenueTrend}
            loading={loadingKpi}
          />
          <KPICard
            title="Devis en attente"
            value={kpi ? String(kpi.pendingQuotes) : "—"}
            subtitle={kpi ? formatEUR(kpi.pendingQuotesAmount) : undefined}
            icon={<FileText className="w-5 h-5" />}
            accentColor="text-blue-600"
            loading={loadingKpi}
          />
          <KPICard
            title="Factures impayées"
            value={kpi ? String(kpi.unpaidInvoices) : "—"}
            subtitle={kpi ? formatEUR(kpi.unpaidInvoicesAmount) : undefined}
            icon={<AlertCircle className="w-5 h-5" />}
            accentColor="text-red-600"
            loading={loadingKpi}
          />
          <KPICard
            title="Marge moyenne"
            value={kpi ? `${kpi.averageMargin}%` : "—"}
            change={kpi?.marginChange}
            icon={<BarChart3 className="w-5 h-5" />}
            accentColor="text-amber-600"
            loading={loadingKpi}
          />
        </div>
      </section>

      {/* ── Sections 2 + 3 + 4 ── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Left column: Today + AI */}
        <div className="xl:col-span-2 space-y-6">
          {/* Section 2: Aujourd'hui */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  Aujourd'hui
                </CardTitle>
                <Badge variant="secondary" className="text-xs">
                  {events.length} intervention{events.length !== 1 ? "s" : ""}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <TodaySchedule events={events} loading={loadingEvents} />
            </CardContent>
          </Card>

          {/* Section 3: Suggestions IA */}
          {activeProposals.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    Suggestions IA
                  </CardTitle>
                  <Badge
                    variant="secondary"
                    className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200"
                  >
                    {activeProposals.length} nouvelle
                    {activeProposals.length !== 1 ? "s" : ""}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {activeProposals.map((proposal) => (
                    <AIProposalCard
                      key={proposal.id}
                      proposal={proposal}
                      onAccept={handleAcceptProposal}
                      onDismiss={handleDismissProposal}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: Activity */}
        <div className="xl:col-span-1">
          <Card className="h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-600" />
                Dernière activité
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline
                entries={activity}
                loading={loadingActivity}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
