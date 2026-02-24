"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  PlusCircle,
  Edit2,
  Trash2,
  LogIn,
  LogOut,
  FileText,
  Settings,
  AlertTriangle,
  Activity,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface AuditEntry {
  id: string;
  action: string;
  table_name: string;
  record_id?: string;
  user_id?: string;
  description?: string;
  created_at: string;
  user?: { email?: string; full_name?: string };
}

const ACTION_CONFIG: Record<
  string,
  { icon: React.ElementType; color: string; bg: string; label: string }
> = {
  INSERT: {
    icon: PlusCircle,
    color: "text-emerald-600",
    bg: "bg-emerald-100",
    label: "Créé",
  },
  UPDATE: {
    icon: Edit2,
    color: "text-blue-600",
    bg: "bg-blue-100",
    label: "Modifié",
  },
  DELETE: {
    icon: Trash2,
    color: "text-red-500",
    bg: "bg-red-100",
    label: "Supprimé",
  },
  LOGIN: {
    icon: LogIn,
    color: "text-violet-600",
    bg: "bg-violet-100",
    label: "Connexion",
  },
  LOGOUT: {
    icon: LogOut,
    color: "text-slate-500",
    bg: "bg-slate-100",
    label: "Déconnexion",
  },
  EXPORT: {
    icon: FileText,
    color: "text-amber-600",
    bg: "bg-amber-100",
    label: "Exporté",
  },
  SETTINGS: {
    icon: Settings,
    color: "text-slate-600",
    bg: "bg-slate-100",
    label: "Paramètres",
  },
  WARNING: {
    icon: AlertTriangle,
    color: "text-orange-500",
    bg: "bg-orange-100",
    label: "Alerte",
  },
};

const TABLE_LABELS: Record<string, string> = {
  quotes: "Devis",
  clients: "Client",
  chantiers: "Chantier",
  employees: "Employé",
  invoices: "Facture",
  schedule_events: "Événement",
  products: "Produit",
  companies: "Entreprise",
};

function TimelineSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-start gap-3">
          <Skeleton className="h-7 w-7 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5 pt-0.5">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function ActivityTimeline() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAuditLog() {
      try {
        const supabase = createClient();

        const { data, error: fetchError } = await supabase
          .from("audit_log")
          .select(
            `
            id,
            action,
            table_name,
            record_id,
            user_id,
            description,
            created_at
          `
          )
          .order("created_at", { ascending: false })
          .limit(10);

        if (fetchError) throw fetchError;
        setEntries(data || []);
      } catch (err: any) {
        console.error("Erreur chargement audit:", err);
        setError("Impossible de charger l'activité récente.");
      } finally {
        setLoading(false);
      }
    }

    fetchAuditLog();
  }, []);

  return (
    <Card className="border border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <Activity className="h-4 w-4 text-emerald-500" />
          Activité récente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <TimelineSkeleton />
        ) : error ? (
          <p className="text-sm text-red-500 text-center py-4">{error}</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            Aucune activité enregistrée.
          </p>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-3 top-0 bottom-0 w-px bg-slate-100" />

            <div className="space-y-1">
              {entries.map((entry, idx) => {
                const config =
                  ACTION_CONFIG[entry.action] || {
                    icon: Activity,
                    color: "text-slate-500",
                    bg: "bg-slate-100",
                    label: entry.action,
                  };
                const IconComp = config.icon;
                const tableLabel =
                  TABLE_LABELS[entry.table_name] || entry.table_name;

                const timeAgo = formatDistanceToNow(
                  new Date(entry.created_at),
                  { addSuffix: true, locale: fr }
                );

                const desc =
                  entry.description ||
                  `${config.label} — ${tableLabel}`;

                return (
                  <div
                    key={entry.id}
                    className={cn(
                      "flex items-start gap-3 pl-0.5 py-2 rounded-lg",
                      "hover:bg-slate-50 transition-colors duration-100"
                    )}
                  >
                    {/* Dot/icon */}
                    <div
                      className={cn(
                        "flex-shrink-0 flex items-center justify-center",
                        "h-6 w-6 rounded-full z-10",
                        config.bg
                      )}
                    >
                      <IconComp className={cn("h-3 w-3", config.color)} />
                    </div>

                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-slate-700 leading-snug">
                        <span className="font-medium">{desc}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className={cn(
                            "text-[10px] font-medium px-1.5 py-0.5 rounded",
                            config.bg,
                            config.color
                          )}
                        >
                          {tableLabel}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {timeAgo}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
