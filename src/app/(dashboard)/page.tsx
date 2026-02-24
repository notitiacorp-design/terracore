"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
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
  start_time: string;
  end_time: string;
  client_name: string;
  site_address: string;
  status: "planifié" | "en_cours" | "terminé" | "annulé";
  employees: {
    id: string;
    name: string;
    avatar?: string;
  }[];
  weather?: {
    temp: number;
    condition: string;
    icon: string;
  };
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
  entity_label: string;
  created_at: string;
  user_name?: string;
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
    start_time: "2024-06-20T08:00:00",
    end_time: "2024-06-20T12:00:00",
    client_name: "M. Dupont",
    site_address: "12 Rue des Fleurs, Lyon",
    status: "en_cours",
    employees: [
      { id: "1", name: "Jean Martin" },
      { id: "2", name: "Paul Durand" },
    ],
    weather: { temp: 22, condition: "Ensoleillé", icon: "☀️" },
  },
  {
    id: "2",
    title: "Tonte pelouse + désherbage",
    start_time: "2024-06-20T13:30:00",
    end_time: "2024-06-20T17:00:00",
    client_name: "Mme Leclerc",
    site_address: "45 Allée des Roses, Villeurbanne",
    status: "planifié",
    employees: [
      { id: "3", name: "Sophie Bernard" },
    ],
    weather: { temp: 24, condition: "Partiellement nuageux", icon: "⛅" },
  },
  {
    id: "3",
    title: "Installation système d'arrosage",
    start_time: "2024-06-20T09:00:00",
    end_time: "2024-06-20T11:30:00",
    client_name: "SCI Les Jardins",
    site_address: "8 Boulevard Carnot, Bron",
    status: "terminé",
    employees: [
      { id: "1", name: "Jean Martin" },
      { id: "4", name: "Lucas Petit" },
      { id: "5", name: "Emma Roux" },
    ],
    weather: { temp: 20, condition: "Nuageux", icon: "☁️" },
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
    entity_label: "Devis #DEV-2024-094 créé pour Mme Laurent",
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    user_name: "Sophie Bernard",
  },
  {
    id: "2",
    action: "update",
    entity_type: "facture",
    entity_label: "Facture #FAC-2024-047 marquée comme payée",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    user_name: "Jean Martin",
  },
  {
    id: "3",
    action: "create",
    entity_type: "chantier",
    entity_label: "Nouveau chantier ouvert — Résidence du Parc",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    user_name: "Admin",
  },
  {
    id: "4",
    action: "update",
    entity_type: "client",
    entity_label: "Fiche client M. Moreau mise à jour",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    user_name: "Paul Durand",
  },
  {
    id: "5",
    action: "delete",
    entity_type: "planification",
    entity_label: "Intervention annulée — Chantier Lacroix",
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    user_name: "Jean Martin",
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
function StatusBadge({ status }: { status: ScheduleEvent["status"] }) {
  const config: Record<
    string,
    { label: string; className: string }
  > = {
    planifié: {
      label: "Planifié",
      className: "bg-blue-100 text-blue-700",
    },
    en_cours: {
      label: "En cours",
      className: "bg-emerald-100 text-emerald-700",
    },
    terminé: {
      label: "Terminé",
      className: "bg-gray-100 text-gray-600",
    },
    annulé: {
      label: "Annulé",
      className: "bg-red-100 text-red-700",
    },
  };
  const c = config[status] || config["planifié"];
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
              {formatTime(event.start_time)}
            </span>
            <span className="text-xs text-gray-400">—</span>
            <span className="text-xs text-gray-500">
              {formatTime(event.end_time)}
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
              <StatusBadge status={event.status} />
            </div>

            <div className="flex items-center gap-1 mt-1 text-xs text-gray-500">
              <User className="w-3 h-3 flex-shrink-0" />
              <span>{event.client_name}</span>
            </div>

            <div className="flex items-center gap-1 mt-0.5 text-xs text-gray-500">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{event.site_address}</span>
            </div>

            <div className="flex items-center justify-between mt-2 flex-wrap gap-2">
              {/* Avatar stack */}
              <div className="flex items-center">
                <div className="flex -space-x-2">
                  {event.employees.slice(0, 3).map((emp) => (
                    <Avatar
                      key={emp.id}
                      className="w-6 h-6 border-2 border-white"
                    >
                      <AvatarImage src={emp.avatar} />
                      <AvatarFallback className="text-[9px] bg-emerald-500 text-white">
                        {emp.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {event.employees.length > 3 && (
                    <div className="w-6 h-6 rounded-full bg-gray-200 border-2 border-white flex items-center justify-center">
                      <span className="text-[9px] text-gray-600 font-medium">
                        +{event.employees.length - 3}
                      </span>
                    </div>
                  )}
                </div>
                <span className="ml-2 text-xs text-gray-400">
                  {event.employees.length} agent{event.employees.length > 1 ? "s" : ""}
                </span>
              </div>

              {/* Weather */}
              {event.weather && <WeatherBadge weather={event.weather} />}
            </div>
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
  entries: ActivityEntry[];
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
                  {entry.entity_label}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {entry.user_name && (
                    <span className="text-xs text-gray-400">
                      {entry.user_name}
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
  const supabase = createClientComponentClient();
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [kpi, setKpi] = useState<KPIData | null>(null);
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [proposals, setProposals] = useState<AIProposal[]>(MOCK_PROPOSALS);
  const [activity, setActivity] = useState<ActivityEntry[]>([]);

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
        .from("profiles")
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
            .from("invoices")
            .select("total_amount")
            .eq("company_id", companyId)
            .gte("created_at", startOfMonth),
          supabase
            .from("invoices")
            .select("total_amount")
            .eq("company_id", companyId)
            .gte("created_at", startOfLastMonth)
            .lte("created_at", endOfLastMonth),
          supabase
            .from("quotes")
            .select("id, total_amount")
            .eq("company_id", companyId)
            .eq("status", "pending"),
          supabase
            .from("invoices")
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
        .from("schedule_events")
        .select(
          `
          id, title, start_time, end_time, status,
          clients(name),
          sites(address),
          schedule_event_employees(
            employees(id, full_name, avatar_url)
          )
        `
        )
        .eq("company_id", companyId)
        .gte("start_time", todayStart.toISOString())
        .lte("start_time", todayEnd.toISOString())
        .order("start_time");

      if (error || !data || data.length === 0) {
        setEvents(MOCK_EVENTS);
        return;
      }

      const mapped: ScheduleEvent[] = data.map((e: any) => ({
        id: e.id,
        title: e.title,
        start_time: e.start_time,
        end_time: e.end_time,
        client_name: e.clients?.name || "Client inconnu",
        site_address: e.sites?.address || "Adresse inconnue",
        status: e.status || "planifié",
        employees:
          e.schedule_event_employees?.map((see: any) => ({
            id: see.employees?.id,
            name: see.employees?.full_name || "Agent",
            avatar: see.employees?.avatar_url,
          })) || [],
        weather: undefined,
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
        .from("audit_logs")
        .select(
          "id, action, entity_type, entity_label, created_at, profiles(full_name)"
        )
        .eq("company_id", companyId)
        .order("created_at", { ascending: false })
        .limit(8);

      if (error || !data || data.length === 0) {
        setActivity(MOCK_ACTIVITY);
        return;
      }

      const mapped: ActivityEntry[] = data.map((log: any) => ({
        id: log.id,
        action: log.action,
        entity_type: log.entity_type,
        entity_label: log.entity_label || `${log.entity_type} modifié`,
        created_at: log.created_at,
        user_name: log.profiles?.full_name || undefined,
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
