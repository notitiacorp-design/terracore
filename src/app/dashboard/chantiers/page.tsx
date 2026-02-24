'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn, formatDate, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  MapPin,
  Wind,
  Thermometer,
  CloudRain,
  AlertTriangle,
  CheckCircle,
  Sparkles,
  Loader2,
  Calendar,
  Clock,
  User,
  X,
} from 'lucide-react';
import type {
  ScheduleEventRow,
  ClientRow,
  SiteAddressRow,
  EmployeeRow,
  WeatherSnapshotRow,
  ScheduleEventEmployeeRow,
  AiProposalRow,
} from '@/types/database';

type ScheduleEventType = 'chantier' | 'rdv_client' | 'reunion' | 'conge' | 'absence';
type WeatherSeverity = 'favorable' | 'acceptable' | 'defavorable' | 'alerte';

interface EventWithDetails extends ScheduleEventRow {
  client?: ClientRow | null;
  site_address?: SiteAddressRow | null;
  employees: EmployeeRow[];
  weather?: WeatherSnapshotRow | null;
}

interface FormData {
  title: string;
  event_type: ScheduleEventType;
  start_datetime: string;
  end_datetime: string;
  all_day: boolean;
  client_id: string;
  site_address_id: string;
  employee_ids: string[];
  notes: string;
  color: string;
}

const EVENT_TYPE_LABELS: Record<ScheduleEventType, string> = {
  chantier: 'Chantier',
  rdv_client: 'RDV Client',
  reunion: 'Réunion',
  conge: 'Congé',
  absence: 'Absence',
};

const EVENT_TYPE_COLORS: Record<ScheduleEventType, string> = {
  chantier: 'bg-emerald-600 border-emerald-700',
  rdv_client: 'bg-blue-600 border-blue-700',
  reunion: 'bg-purple-600 border-purple-700',
  conge: 'bg-amber-500 border-amber-600',
  absence: 'bg-gray-500 border-gray-600',
};

const WEATHER_SEVERITY_CONFIG: Record<WeatherSeverity, { label: string; color: string; icon: string }> = {
  favorable: { label: 'Favorable', color: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: '☀️' },
  acceptable: { label: 'Acceptable', color: 'bg-amber-100 text-amber-800 border-amber-200', icon: '⛅' },
  defavorable: { label: 'Défavorable', color: 'bg-orange-100 text-orange-800 border-orange-200', icon: '🌧️' },
  alerte: { label: 'Alerte', color: 'bg-red-100 text-red-800 border-red-200', icon: '⛈️' },
};

const HOURS = Array.from({ length: 13 }, (_, i) => i + 7);
const DAY_NAMES = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const DAY_NAMES_FULL = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatWeekRange(weekStart: Date): string {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' };
  const startStr = weekStart.toLocaleDateString('fr-FR', options);
  const endStr = weekEnd.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  return `${startStr} – ${endStr}`;
}

function toLocalDateTimeInput(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getEventPositionStyle(startDatetime: string, endDatetime: string) {
  const start = new Date(startDatetime);
  const end = new Date(endDatetime);
  const startHour = start.getHours() + start.getMinutes() / 60;
  const endHour = end.getHours() + end.getMinutes() / 60;
  const clampedStart = Math.max(7, Math.min(19, startHour));
  const clampedEnd = Math.max(7, Math.min(19, endHour));
  const top = ((clampedStart - 7) / 12) * 100;
  const height = ((clampedEnd - clampedStart) / 12) * 100;
  return { top: `${top}%`, height: `${Math.max(height, 4)}%` };
}

// WeatherBadge Component
function WeatherBadge({ weather }: { weather?: WeatherSnapshotRow | null }) {
  if (!weather) return null;
  const config = WEATHER_SEVERITY_CONFIG[weather.severity as WeatherSeverity];
  if (!config) return null;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium border',
        config.color
      )}
    >
      <span>{config.icon}</span>
      <span className="hidden sm:inline">{config.label}</span>
    </span>
  );
}

// WeatherWidget Component
function WeatherWidget({ weather }: { weather?: WeatherSnapshotRow | null }) {
  if (!weather) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-4 text-center text-sm text-gray-500">
        Aucune donnée météo disponible
      </div>
    );
  }
  const config = WEATHER_SEVERITY_CONFIG[weather.severity as WeatherSeverity];
  return (
    <div className={cn('rounded-lg border p-4', config.color)}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{config.icon}</span>
          <div>
            <p className="font-semibold text-sm">{weather.description}</p>
            <p className="text-xs opacity-75">{new Date(weather.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
        </div>
        <Badge
          className={cn('text-xs font-semibold border', config.color)}
          variant="outline"
        >
          {config.label}
        </Badge>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div className="flex flex-col items-center gap-1">
          <Thermometer className="w-4 h-4" />
          <span className="text-xs font-medium">{weather.temperature_min}° / {weather.temperature_max}°C</span>
          <span className="text-xs opacity-75">Température</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <CloudRain className="w-4 h-4" />
          <span className="text-xs font-medium">{weather.precipitation_mm} mm</span>
          <span className="text-xs opacity-75">Précipitations</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Wind className="w-4 h-4" />
          <span className="text-xs font-medium">{weather.wind_speed_kmh} km/h</span>
          <span className="text-xs opacity-75">Vent</span>
        </div>
      </div>
    </div>
  );
}

export default function ChantiersPage() {
  // FIX 6: Stabilize supabase client with useRef to avoid new instance on every render
  const supabase = useRef(createClient()).current;

  const [viewMode, setViewMode] = useState<'semaine' | 'jour'>('semaine');
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => getWeekStart(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [events, setEvents] = useState<EventWithDetails[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [siteAddresses, setSiteAddresses] = useState<SiteAddressRow[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [aiProposals, setAiProposals] = useState<AiProposalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<EventWithDetails | null>(null);
  const [saving, setSaving] = useState(false);
  const [checkingWeather, setCheckingWeather] = useState(false);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [filteredAddresses, setFilteredAddresses] = useState<SiteAddressRow[]>([]);

  const defaultFormData = useMemo((): FormData => {
    const now = new Date();
    const end = new Date(now);
    end.setHours(end.getHours() + 2);
    return {
      title: '',
      event_type: 'chantier',
      start_datetime: toLocalDateTimeInput(now),
      end_datetime: toLocalDateTimeInput(end),
      all_day: false,
      client_id: '',
      site_address_id: '',
      employee_ids: [],
      notes: '',
      color: '#10b981',
    };
  }, []);

  const [formData, setFormData] = useState<FormData>(defaultFormData);

  // FIX 1 & 7: Use user_profile.id (which equals auth.users.id) instead of auth_user_id
  // supabase is now stable (useRef), so it's safe in the dependency array
  useEffect(() => {
    async function fetchCompany() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('user_profile')
        .select('company_id')
        .eq('id', user.id)
        .single();
      if (data) setCompanyId(data.company_id);
    }
    fetchCompany();
  }, [supabase]);

  // Fetch reference data
  // FIX 2: Filter site_address by company_id to prevent data leak
  useEffect(() => {
    if (!companyId) return;
    async function fetchReferenceData() {
      const [clientsRes, addressesRes, employeesRes] = await Promise.all([
        supabase.from('client').select('*').eq('company_id', companyId!).eq('is_active', true).order('last_name'),
        supabase.from('site_address').select('*').eq('company_id', companyId!).order('label'),
        supabase.from('employee').select('*').eq('company_id', companyId!).eq('is_active', true).order('last_name'),
      ]);
      if (clientsRes.data) setClients(clientsRes.data as ClientRow[]);
      if (addressesRes.data) setSiteAddresses(addressesRes.data as SiteAddressRow[]);
      if (employeesRes.data) setEmployees(employeesRes.data as EmployeeRow[]);
    }
    fetchReferenceData();
  }, [companyId, supabase]);

  // Fetch events for current week
  const fetchEvents = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const weekEnd = new Date(currentWeekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const { data: eventsData } = await supabase
        .from('schedule_event')
        .select('*')
        .eq('company_id', companyId)
        .gte('start_datetime', currentWeekStart.toISOString())
        .lt('start_datetime', weekEnd.toISOString())
        .order('start_datetime');

      if (!eventsData || eventsData.length === 0) {
        setEvents([]);
        return;
      }

      // FIX 5: Guard against empty eventIds array
      const eventIds = eventsData.map((e) => e.id);

      // Fetch employees for events
      const { data: eventEmployees } = eventIds.length > 0
        ? await supabase
            .from('schedule_event_employee')
            .select('*')
            .in('schedule_event_id', eventIds)
        : { data: [] as ScheduleEventEmployeeRow[] };

      // FIX 4: weather_snapshot has no schedule_event_id column.
      // Match by site_address_id and date instead.
      const relevantSiteAddressIds = eventsData
        .map((e) => e.site_address_id)
        .filter((id): id is string => !!id);

      const eventDates = [
        ...new Set(
          eventsData.map((e) => new Date(e.start_datetime).toISOString().split('T')[0])
        ),
      ];

      let weatherData: WeatherSnapshotRow[] = [];
      if (relevantSiteAddressIds.length > 0 && eventDates.length > 0) {
        const { data: wData } = await supabase
          .from('weather_snapshot')
          .select('*')
          .in('site_address_id', relevantSiteAddressIds)
          .in('date', eventDates);
        if (wData) weatherData = wData as WeatherSnapshotRow[];
      }

      // Build detailed events
      const detailedEvents: EventWithDetails[] = eventsData.map((event) => {
        const eventEmpIds = (eventEmployees || [])
          .filter((ee) => ee.schedule_event_id === event.id)
          .map((ee) => ee.employee_id);
        const eventEmps = employees.filter((emp) => eventEmpIds.includes(emp.id));

        // Match weather by site_address_id and date
        const eventDate = new Date(event.start_datetime).toISOString().split('T')[0];
        const weather =
          event.site_address_id
            ? weatherData.find(
                (w) =>
                  w.site_address_id === event.site_address_id &&
                  w.date === eventDate
              ) || null
            : null;

        let client: ClientRow | null = null;
        let siteAddress: SiteAddressRow | null = null;

        if (event.client_id) {
          client = clients.find((c) => c.id === event.client_id) || null;
        }
        if (event.site_address_id) {
          siteAddress = siteAddresses.find((a) => a.id === event.site_address_id) || null;
        }

        return {
          ...event,
          client,
          site_address: siteAddress,
          employees: eventEmps,
          weather,
        } as EventWithDetails;
      });

      setEvents(detailedEvents);
    } finally {
      setLoading(false);
    }
  }, [companyId, currentWeekStart, clients, siteAddresses, employees, supabase]);

  useEffect(() => {
    if (companyId && clients.length >= 0 && employees.length >= 0) {
      fetchEvents();
    }
  }, [companyId, currentWeekStart, clients, employees, fetchEvents]);

  // Filter addresses by client
  useEffect(() => {
    if (formData.client_id) {
      const filtered = siteAddresses.filter((a) => a.client_id === formData.client_id);
      setFilteredAddresses(filtered);
    } else {
      setFilteredAddresses([]);
    }
  }, [formData.client_id, siteAddresses]);

  // Week navigation
  const prevWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() - 7);
    setCurrentWeekStart(d);
  };

  const nextWeek = () => {
    const d = new Date(currentWeekStart);
    d.setDate(d.getDate() + 7);
    setCurrentWeekStart(d);
  };

  const goToToday = () => {
    setCurrentWeekStart(getWeekStart(new Date()));
  };

  // Get week days
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(currentWeekStart);
      d.setDate(d.getDate() + i);
      return d;
    });
  }, [currentWeekStart]);

  // Events by day
  const eventsByDay = useMemo(() => {
    const map: Record<string, EventWithDetails[]> = {};
    weekDays.forEach((day) => {
      const key = day.toISOString().split('T')[0];
      map[key] = events.filter((e) => {
        const eventDate = new Date(e.start_datetime).toISOString().split('T')[0];
        return eventDate === key;
      });
    });
    return map;
  }, [events, weekDays]);

  // Open new event sheet
  function openNewEvent(day?: Date, hour?: number) {
    setEditingEvent(null);
    const start = day ? new Date(day) : new Date();
    if (hour !== undefined) start.setHours(hour, 0, 0, 0);
    const end = new Date(start);
    end.setHours(end.getHours() + 2);
    setFormData({
      ...defaultFormData,
      start_datetime: toLocalDateTimeInput(start),
      end_datetime: toLocalDateTimeInput(end),
    });
    setSheetOpen(true);
  }

  // Open edit event sheet
  function openEditEvent(event: EventWithDetails) {
    setEditingEvent(event);
    setFormData({
      title: event.title,
      event_type: event.event_type as ScheduleEventType,
      start_datetime: toLocalDateTimeInput(new Date(event.start_datetime)),
      end_datetime: toLocalDateTimeInput(new Date(event.end_datetime)),
      all_day: event.all_day ?? false,
      client_id: event.client_id ?? '',
      site_address_id: event.site_address_id ?? '',
      employee_ids: event.employees.map((e) => e.id),
      notes: event.description ?? '',
      color: event.color ?? '#10b981',
    });
    setSheetOpen(true);
  }

  // Save event
  async function saveEvent() {
    if (!companyId) return;
    setSaving(true);
    try {
      const payload = {
        title: formData.title,
        event_type: formData.event_type,
        start_datetime: new Date(formData.start_datetime).toISOString(),
        end_datetime: new Date(formData.end_datetime).toISOString(),
        all_day: formData.all_day,
        client_id: formData.client_id || null,
        site_address_id: formData.site_address_id || null,
        description: formData.notes || null,
        color: formData.color,
        company_id: companyId,
      };

      let eventId: string;

      if (editingEvent) {
        const { data, error } = await supabase
          .from('schedule_event')
          .update(payload)
          .eq('id', editingEvent.id)
          .select('id')
          .single();
        if (error) throw error;
        eventId = data.id;

        // Remove existing employee assignments
        await supabase
          .from('schedule_event_employee')
          .delete()
          .eq('schedule_event_id', eventId);
      } else {
        const { data, error } = await supabase
          .from('schedule_event')
          .insert(payload)
          .select('id')
          .single();
        if (error) throw error;
        eventId = data.id;
      }

      // Insert employee assignments
      if (formData.employee_ids.length > 0) {
        await supabase.from('schedule_event_employee').insert(
          formData.employee_ids.map((empId) => ({
            schedule_event_id: eventId,
            employee_id: empId,
          }))
        );
      }

      setSheetOpen(false);
      await fetchEvents();
    } finally {
      setSaving(false);
    }
  }

  // Delete event
  async function deleteEvent(eventId: string) {
    if (!confirm('Supprimer cet événement ?')) return;
    await supabase.from('schedule_event_employee').delete().eq('schedule_event_id', eventId);
    await supabase.from('schedule_event').delete().eq('id', eventId);
    await fetchEvents();
    setSheetOpen(false);
  }

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={goToToday}>
            Aujourd'hui
          </Button>
          <Button variant="ghost" size="icon" onClick={prevWeek}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={nextWeek}>
            <ChevronRight className="w-4 h-4" />
          </Button>
          <span className="text-sm font-medium">{formatWeekRange(currentWeekStart)}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={() => openNewEvent()}>
            <Plus className="w-4 h-4 mr-1" />
            Nouvel événement
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">
          {/* Time column */}
          <div className="w-16 flex-shrink-0 border-r">
            <div className="h-12 border-b" />
            <div className="relative" style={{ height: '720px' }}>
              {HOURS.map((hour) => (
                <div
                  key={hour}
                  className="absolute w-full border-t"
                  style={{ top: `${((hour - 7) / 12) * 100}%` }}
                >
                  <span className="text-xs text-gray-400 pl-1">{hour}:00</span>
                </div>
              ))}
            </div>
          </div>

          {/* Days columns */}
          <div className="flex flex-1 overflow-x-auto">
            {weekDays.map((day, idx) => {
              const key = day.toISOString().split('T')[0];
              const dayEvents = eventsByDay[key] || [];
              return (
                <div key={key} className="flex-1 min-w-[120px] border-r last:border-r-0">
                  {/* Day header */}
                  <div
                    className={cn(
                      'h-12 border-b flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50',
                      isToday(day) && 'bg-emerald-50'
                    )}
                    onClick={() => openNewEvent(day, 9)}
                  >
                    <span className="text-xs text-gray-500">{DAY_NAMES[idx]}</span>
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        isToday(day) && 'text-emerald-600'
                      )}
                    >
                      {day.getDate()}
                    </span>
                  </div>

                  {/* Day events */}
                  <div className="relative" style={{ height: '720px' }}>
                    {/* Hour lines */}
                    {HOURS.map((hour) => (
                      <div
                        key={hour}
                        className="absolute w-full border-t border-gray-100"
                        style={{ top: `${((hour - 7) / 12) * 100}%` }}
                      />
                    ))}

                    {/* Events */}
                    {dayEvents.map((event) => {
                      const style = getEventPositionStyle(event.start_datetime, event.end_datetime);
                      const colorClass =
                        EVENT_TYPE_COLORS[event.event_type as ScheduleEventType] ||
                        'bg-gray-500 border-gray-600';
                      return (
                        <div
                          key={event.id}
                          className={cn(
                            'absolute left-1 right-1 rounded px-1 py-0.5 text-white cursor-pointer border overflow-hidden',
                            colorClass
                          )}
                          style={style}
                          onClick={() => openEditEvent(event)}
                        >
                          <p className="text-xs font-medium truncate">{event.title}</p>
                          {event.weather && (
                            <WeatherBadge weather={event.weather} />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Event Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {editingEvent ? 'Modifier l\'événement' : 'Nouvel événement'}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 mt-6">
            {/* Title */}
            <div className="space-y-1">
              <Label htmlFor="title">Titre *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                placeholder="Titre de l'événement"
              />
            </div>

            {/* Event Type */}
            <div className="space-y-1">
              <Label>Type d'événement</Label>
              <Select
                value={formData.event_type}
                onValueChange={(v) =>
                  setFormData((p) => ({ ...p, event_type: v as ScheduleEventType }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* All day toggle */}
            <div className="flex items-center gap-2">
              <Switch
                id="all_day"
                checked={formData.all_day}
                onCheckedChange={(v) => setFormData((p) => ({ ...p, all_day: v }))}
              />
              <Label htmlFor="all_day">Toute la journée</Label>
            </div>

            {/* Start / End */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="start">Début</Label>
                <Input
                  id="start"
                  type={formData.all_day ? 'date' : 'datetime-local'}
                  value={
                    formData.all_day
                      ? formData.start_datetime.split('T')[0]
                      : formData.start_datetime
                  }
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      start_datetime: formData.all_day
                        ? `${e.target.value}T00:00`
                        : e.target.value,
                    }))
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="end">Fin</Label>
                <Input
                  id="end"
                  type={formData.all_day ? 'date' : 'datetime-local'}
                  value={
                    formData.all_day
                      ? formData.end_datetime.split('T')[0]
                      : formData.end_datetime
                  }
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      end_datetime: formData.all_day
                        ? `${e.target.value}T00:00`
                        : e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            {/* Client */}
            <div className="space-y-1">
              <Label>Client</Label>
              <Select
                value={formData.client_id || 'none'}
                onValueChange={(v) =>
                  setFormData((p) => ({
                    ...p,
                    client_id: v === 'none' ? '' : v,
                    site_address_id: '',
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucun client</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.first_name} {client.last_name}
                      {client.company_name ? ` (${client.company_name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Site Address */}
            {formData.client_id && (
              <div className="space-y-1">
                <Label>Adresse de chantier</Label>
                <Select
                  value={formData.site_address_id || 'none'}
                  onValueChange={(v) =>
                    setFormData((p) => ({
                      ...p,
                      site_address_id: v === 'none' ? '' : v,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une adresse" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucune adresse</SelectItem>
                    {filteredAddresses.map((addr) => (
                      <SelectItem key={addr.id} value={addr.id}>
                        {addr.label} — {addr.street}, {addr.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Employees */}
            <div className="space-y-1">
              <Label>Employés</Label>
              <div className="space-y-2 max-h-40 overflow-y-auto border rounded-md p-2">
                {employees.map((emp) => {
                  const selected = formData.employee_ids.includes(emp.id);
                  return (
                    <div
                      key={emp.id}
                      className={cn(
                        'flex items-center gap-2 p-1.5 rounded cursor-pointer hover:bg-gray-50',
                        selected && 'bg-emerald-50'
                      )}
                      onClick={() =>
                        setFormData((p) => ({
                          ...p,
                          employee_ids: selected
                            ? p.employee_ids.filter((id) => id !== emp.id)
                            : [...p.employee_ids, emp.id],
                        }))
                      }
                    >
                      <div
                        className="w-3 h-3 rounded-full border-2"
                        style={{ backgroundColor: selected ? (emp.color ?? '#10b981') : 'transparent', borderColor: emp.color ?? '#10b981' }}
                      />
                      <span className="text-sm">
                        {emp.first_name} {emp.last_name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                rows={3}
                placeholder="Notes supplémentaires..."
              />
            </div>

            {/* Color */}
            <div className="space-y-1">
              <Label htmlFor="color">Couleur</Label>
              <Input
                id="color"
                type="color"
                value={formData.color}
                onChange={(e) => setFormData((p) => ({ ...p, color: e.target.value }))}
                className="h-10 w-20 p-1 cursor-pointer"
              />
            </div>

            {/* Weather for editing event */}
            {editingEvent && (
              <div className="space-y-2">
                <Label>Météo</Label>
                <WeatherWidget weather={editingEvent.weather} />
              </div>
            )}

            <Separator />

            {/* Actions */}
            <div className="flex items-center justify-between gap-2">
              {editingEvent && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => deleteEvent(editingEvent.id)}
                >
                  Supprimer
                </Button>
              )}
              <div className="flex items-center gap-2 ml-auto">
                <Button variant="outline" size="sm" onClick={() => setSheetOpen(false)}>
                  Annuler
                </Button>
                <Button
                  size="sm"
                  onClick={saveEvent}
                  disabled={saving || !formData.title}
                >
                  {saving && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                  {editingEvent ? 'Modifier' : 'Créer'}
                </Button>
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
