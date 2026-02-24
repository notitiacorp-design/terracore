"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { WeatherBadge } from "@/components/chantiers/weather-badge";
import { CalendarX, Clock, MapPin, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

interface Employee {
  id: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
}

interface ScheduleEvent {
  id: string;
  start_time: string;
  end_time: string;
  title: string;
  status: string;
  client?: { name: string };
  site_address?: string;
  employees?: Employee[];
  weather_severity?: "favorable" | "acceptable" | "defavorable" | "alerte";
  weather_temperature?: number;
  weather_description?: string;
  weather_precipitation_mm?: number;
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
            <div className="flex gap-2">
              <Skeleton className="h-6 w-6 rounded-full" />
              <Skeleton className="h-6 w-6 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
      ))}
    </div>
  );
}

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  planned: { label: "Planifié", color: "bg-blue-100 text-blue-700" },
  in_progress: { label: "En cours", color: "bg-emerald-100 text-emerald-700" },
  completed: { label: "Terminé", color: "bg-slate-100 text-slate-600" },
  cancelled: { label: "Annulé", color: "bg-red-100 text-red-600" },
};

export function TodaySchedule() {
  const [events, setEvents] = useState<ScheduleEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTodayEvents() {
      try {
        const supabase = createClient();
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        const { data, error: fetchError } = await supabase
          .from('schedule_event')
          .select(
            `
            id,
            start_time,
            end_time,
            title,
            status,
            site_address,
            weather_severity,
            weather_temperature,
            weather_description,
            weather_precipitation_mm,
            client:clients(name),
            schedule_event_employees(
              employee:employees(id, first_name, last_name, avatar_url)
            )
          `
          )
          .gte("start_time", startOfDay)
          .lte("start_time", endOfDay)
          .order("start_time", { ascending: true })
          .limit(10);

        if (fetchError) throw fetchError;

        const normalized: ScheduleEvent[] = (data || []).map((ev: any) => ({
          ...ev,
          client: Array.isArray(ev.client) ? ev.client[0] : ev.client,
          employees: (ev.schedule_event_employees || []).map(
            (rel: any) => rel.employee
          ),
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
  const todayCapitalized = todayLabel.charAt(0).toUpperCase() + todayLabel.slice(1);

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
              const start = new Date(event.start_time);
              const end = new Date(event.end_time);
              const statusConf =
                STATUS_CONFIG[event.status] || STATUS_CONFIG["planned"];

              return (
                <div
                  key={event.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border border-slate-100",
                    "hover:bg-slate-50 hover:border-slate-200 transition-colors duration-150 cursor-pointer"
                  )}
                >
                  {/* Time column */}
                  <div className="flex-shrink-0 flex flex-col items-center bg-emerald-50 rounded-md px-2 py-1 min-w-[56px]">
                    <span className="text-xs font-bold text-emerald-700">
                      {format(start, "HH:mm")}
                    </span>
                    <div className="h-px w-4 bg-emerald-200 my-0.5" />
                    <span className="text-xs text-emerald-500">
                      {format(end, "HH:mm")}
                    </span>
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
                          statusConf.color
                        )}
                      >
                        {statusConf.label}
                      </span>
                    </div>

                    {event.client?.name && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <User className="h-3 w-3 text-slate-400" />
                        <p className="text-xs text-slate-500">
                          {event.client.name}
                        </p>
                      </div>
                    )}

                    {event.site_address && (
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-slate-400" />
                        <p className="text-xs text-slate-400 truncate">
                          {event.site_address}
                        </p>
                      </div>
                    )}

                    {/* Employee avatars */}
                    {event.employees && event.employees.length > 0 && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <div className="flex -space-x-1.5">
                          {event.employees.slice(0, 4).map((emp) => (
                            <Avatar
                              key={emp.id}
                              className="h-5 w-5 border border-white ring-1 ring-slate-100"
                            >
                              <AvatarImage src={emp.avatar_url} />
                              <AvatarFallback className="text-[9px] bg-emerald-100 text-emerald-700 font-bold">
                                {emp.first_name?.[0]}
                                {emp.last_name?.[0]}
                              </AvatarFallback>
                            </Avatar>
                          ))}
                          {event.employees.length > 4 && (
                            <div className="h-5 w-5 rounded-full bg-slate-100 border border-white flex items-center justify-center">
                              <span className="text-[9px] text-slate-500 font-medium">
                                +{event.employees.length - 4}
                              </span>
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-slate-400 ml-1">
                          {event.employees.length} employé
                          {event.employees.length > 1 ? "s" : ""}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Weather badge */}
                  {event.weather_severity && (
                    <div className="flex-shrink-0">
                      <WeatherBadge
                        severity={event.weather_severity}
                        temperature={event.weather_temperature}
                        description={event.weather_description}
                        precipitationMm={event.weather_precipitation_mm}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
