"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarX, MapPin, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Client {
  id: string;
  company_name?: string;
  first_name?: string;
  last_name?: string;
}

interface SiteAddress {
  id: string;
  address_line1?: string;
  city?: string;
  postal_code?: string;
}

interface ScheduleEvent {
  id: string;
  company_id: string;
  event_type: string;
  title: string;
  description?: string;
  start_datetime: string;
  end_datetime: string;
  all_day: boolean;
  color?: string;
  quote_id?: string;
  client_id?: string;
  site_address_id?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  client?: Client;
  site_address?: SiteAddress;
}

function TodayScheduleSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-start gap-3 p-3 rounded-lg border border-slate-100"
        >
          <Skeleton className="w-16 h-10 rounded-md flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

const EVENT_TYPE_CONFIG: Record<string, { label: string; color: string }> = {
  intervention: { label: "Intervention", color: "bg-blue-100 text-blue-700" },
  meeting: { label: "Réunion", color: "bg-purple-100 text-purple-700" },
  delivery: { label: "Livraison", color: "bg-amber-100 text-amber-700" },
  other: { label: "Autre", color: "bg-slate-100 text-slate-600" },
};

function getEventTypeConfig(eventType: string) {
  return EVENT_TYPE_CONFIG[eventType] ?? { label: eventType, color: "bg-slate-100 text-slate-600" };
}

function getClientDisplayName(client?: Client): string | null {
  if (!client) return null;
  if (client.company_name) return client.company_name;
  const parts = [client.first_name, client.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

function getSiteAddressDisplay(siteAddress?: SiteAddress): string | null {
  if (!siteAddress) return null;
  const parts = [
    siteAddress.address_line1,
    siteAddress.postal_code,
    siteAddress.city,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

export function TodaySchedule() {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTodayEvents() {
      try {
        const supabase = createClient();
        const now = new Date();
        const startOfDay = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
          0
        ).toISOString();
        const endOfDay = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          23,
          59,
          59,
          999
        ).toISOString();

        const { data, error: fetchError } = await supabase
          .from("schedule_event")
          .select(
            `
            id,
            company_id,
            event_type,
            title,
            description,
            start_datetime,
            end_datetime,
            all_day,
            color,
            quote_id,
            client_id,
            site_address_id,
            created_by,
            created_at,
            updated_at,
            client:clients(
              id,
              company_name,
              first_name,
              last_name
            ),
            site_address:site_addresses(
              id,
              address_line1,
              city,
              postal_code
            )
          `
          )
          .gte("start_datetime", startOfDay)
          .lte("start_datetime", endOfDay)
          .order("start_datetime", { ascending: true })
          .limit(10);

        if (fetchError) throw fetchError;

        const normalized: ScheduleEvent[] = (data || []).map((ev: any) => ({
          ...ev,
          client: Array.isArray(ev.client) ? ev.client[0] ?? undefined : ev.client ?? undefined,
          site_address: Array.isArray(ev.site_address)
            ? ev.site_address[0] ?? undefined
            : ev.site_address ?? undefined,
        }));

        setEvents(normalized);
      } catch (err: any) {
        console.error("Erreur chargement planning:", err);
        setError("Impossible de charger le planning.");
      } finally {
        setLoading(false);
      }
    }

    fetchTodayEvents();
  }, []);

  const todayLabel = format(new Date(), "EEEE d MMMM yyyy", { locale: fr });
  const todayCapitalized =
    todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1);

  return (
    <Card className="border border-slate-200 bg-white shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-800">
            Chantiers du jour
          </CardTitle>
          <span className="text-xs text-slate-400">{todayCapitalized}</span>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <TodayScheduleSkeleton />
        ) : error ? (
          <div className="text-center py-8 text-sm text-red-500">{error}</div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-slate-400">
            <CalendarX className="h-10 w-10 mb-3 text-slate-300" />
            <p className="text-sm font-medium text-slate-500">
              Aucun chantier aujourd'hui
            </p>
            <p className="text-xs mt-1 text-slate-400">
              Votre journée est libre ou le planning n'est pas encore saisi.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {events.map((event) => {
              const start = new Date(event.start_datetime);
              const end = new Date(event.end_datetime);
              const typeConf = getEventTypeConfig(event.event_type);
              const clientName = getClientDisplayName(event.client);
              const addressDisplay = getSiteAddressDisplay(event.site_address);

              return (
                <div
                  key={event.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border border-slate-100",
                    "hover:bg-slate-50 hover:border-slate-200 transition-colors duration-150 cursor-pointer"
                  )}
                  style={
                    event.color
                      ? { borderLeftColor: event.color, borderLeftWidth: 3 }
                      : undefined
                  }
                >
                  {/* Time column */}
                  <div className="flex-shrink-0 flex flex-col items-center bg-emerald-50 rounded-md px-2 py-1 min-w-[56px]">
                    {event.all_day ? (
                      <span className="text-xs font-bold text-emerald-700">
                        Journée
                      </span>
                    ) : (
                      <>
                        <span className="text-xs font-bold text-emerald-700">
                          {format(start, "HH:mm")}
                        </span>
                        <div className="h-px w-4 bg-emerald-200 my-0.5" />
                        <span className="text-xs text-emerald-500">
                          {format(end, "HH:mm")}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Main info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-slate-800 truncate">
                        {event.title}
                      </p>
                      <span
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full font-medium",
                          typeConf.color
                        )}
                      >
                        {typeConf.label}
                      </span>
                    </div>

                    {clientName && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <User className="h-3 w-3 text-slate-400" />
                        <p className="text-xs text-slate-500">{clientName}</p>
                      </div>
                    )}

                    {addressDisplay && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        <p className="text-xs text-slate-400 truncate">
                          {addressDisplay}
                        </p>
                      </div>
                    )}

                    {event.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                        {event.description}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
