'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
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
            <p className="font-semibold text-sm">{weather.weather_label}</p>
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
          <span className="text-xs font-medium">{weather.temp_min}° / {weather.temp_max}°C</span>
          <span className="text-xs opacity-75">Température</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <CloudRain className="w-4 h-4" />
          <span className="text-xs font-medium">{weather.precipitation_mm} mm</span>
          <span className="text-xs opacity-75">Précipitations</span>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Wind className="w-4 h-4" />
          <span className="text-xs font-medium">{weather.wind_speed} km/h</span>
          <span className="text-xs opacity-75">Vent</span>
        </div>
      </div>
    </div>
  );
}

export default function ChantiersPage() {
  const supabase = createClient();
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

  // Fetch company ID
  useEffect(() => {
    async function fetchCompany() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('user_profile')
        .select('company_id')
        .eq('auth_user_id', user.id)
        .single();
      if (data) setCompanyId(data.company_id);
    }
    fetchCompany();
  }, []);

  // Fetch reference data
  useEffect(() => {
    if (!companyId) return;
    async function fetchReferenceData() {
      const [clientsRes, addressesRes, employeesRes] = await Promise.all([
        supabase.from('client').select('*').eq('company_id', companyId!).eq('is_active', true).order('last_name'),
        supabase.from('site_address').select('*').order('label'),
        supabase.from('employee').select('*').eq('company_id', companyId!).eq('is_active', true).order('last_name'),
      ]);
      if (clientsRes.data) setClients(clientsRes.data as ClientRow[]);
      if (addressesRes.data) setSiteAddresses(addressesRes.data as SiteAddressRow[]);
      if (employeesRes.data) setEmployees(employeesRes.data as EmployeeRow[]);
    }
    fetchReferenceData();
  }, [companyId]);

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

      if (!eventsData) {
        setEvents([]);
        return;
      }

      const eventIds = eventsData.map((e) => e.id);

      // Fetch employees for events
      const { data: eventEmployees } = await supabase
        .from('schedule_event_employee')
        .select('*')
        .in('schedule_event_id', eventIds);

      // Fetch weather snapshots
      const { data: weatherData } = await supabase
        .from('weather_snapshot')
        .select('*')
        .in('schedule_event_id', eventIds);

      // Build detailed events
      const detailedEvents: EventWithDetails[] = await Promise.all(
        eventsData.map(async (event) => {
          const eventEmpIds = (eventEmployees || [])
            .filter((ee) => ee.schedule_event_id === event.id)
            .map((ee) => ee.employee_id);
          const eventEmps = employees.filter((emp) => eventEmpIds.includes(emp.id));
          const weather = (weatherData || []).find((w) => w.schedule_event_id === event.id) || null;

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
        })
      );

      setEvents(detailedEvents);
    } finally {
      setLoading(false);
    }
  }, [companyId, currentWeekStart, clients, siteAddresses, employees]);

  useEffect(() => {
    if (companyId && clients.length >= 0 && employees.length >= 0) {
      fetchEvents();
    }
  }, [companyId, currentWeekStart, clients, employees]);

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
      all_day: event.all_day || false,
      client_id: event.client_id || '',
      site_address_id: event.site_address_id || '',
      employee_ids: event.employees.map((e) => e.id),
      notes: event.notes || '',
      color: event.color || '#10b981',
    });
    setSheetOpen(true);
  }

  // Save event
  async function saveEvent() {
    if (!companyId || !formData.title.trim()) return;
    setSaving(true);
    try {
      const payload = {
        company_id: companyId,
        title: formData.title,
        event_type: formData.event_type,
        start_datetime: new Date(formData.start_datetime).toISOString(),
        end_datetime: new Date(formData.end_datetime).toISOString(),
        all_day: formData.all_day,
        client_id: formData.client_id || null,
        site_address_id: formData.site_address_id || null,
        notes: formData.notes || null,
        color: formData.color,
      };

      let eventId: string;

      if (editingEvent) {
        const { data } = await supabase
          .from('schedule_event')
          .update(payload)
          .eq('id', editingEvent.id)
          .select()
          .single();
        eventId = editingEvent.id;
      } else {
        const { data } = await supabase
          .from('schedule_event')
          .insert(payload)
          .select()
          .single();
        if (!data) throw new Error('Failed to create event');
        eventId = (data as ScheduleEventRow).id;
      }

      // Update employee assignments
      await supabase
        .from('schedule_event_employee')
        .delete()
        .eq('schedule_event_id', eventId);

      if (formData.employee_ids.length > 0) {
        await supabase.from('schedule_event_employee').insert(
          formData.employee_ids.map((empId) => ({
            schedule_event_id: eventId,
            employee_id: empId,
          }))
        );
      }

      setSheetOpen(false);
      fetchEvents();
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
    } finally {
      setSaving(false);
    }
  }

  // Delete event
  async function deleteEvent() {
    if (!editingEvent) return;
    setSaving(true);
    try {
      await supabase.from('schedule_event').delete().eq('id', editingEvent.id);
      setSheetOpen(false);
      fetchEvents();
    } finally {
      setSaving(false);
    }
  }

  // Check weather AI
  async function checkWeatherAI() {
    if (!companyId) return;
    setCheckingWeather(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Create an AI agent run
      const { data: runData } = await supabase
        .from('ai_agent_run')
        .insert({
          company_id: companyId,
          agent_type: 'meteo_replan',
          input_data: { week_start: currentWeekStart.toISOString(), event_count: events.length },
          status: 'pending',
          created_by: user?.id || null,
        })
        .select()
        .single();

      // Check for events with bad weather
      const alertEvents = events.filter(
        (e) => e.weather?.severity === 'alerte' || e.weather?.severity === 'defavorable'
      );

      if (alertEvents.length > 0 && runData) {
        const proposals: AiProposalRow[] = [];
        for (const event of alertEvents) {
          const { data: proposal } = await supabase
            .from('ai_proposal')
            .insert({
              company_id: companyId,
              agent_run_id: (runData as any).id,
              entity_type: 'schedule_event',
              entity_id: event.id,
              proposal_type: 'replanification',
              title: `Replanifier : ${event.title}`,
              description: `Conditions météo ${event.weather?.severity} prévues le ${new Date(event.start_datetime).toLocaleDateString('fr-FR')}. Recommandation : reporter ou anticiper l'intervention.`,
              proposed_data: { severity: event.weather?.severity, event_id: event.id },
              confidence_score: event.weather?.severity === 'alerte' ? 0.95 : 0.72,
              status: 'pending',
            })
            .select()
            .single();
          if (proposal) proposals.push(proposal as AiProposalRow);
        }
        setAiProposals(proposals);
      } else {
        setAiProposals([]);
      }

      // Update run status
      if (runData) {
        await supabase
          .from('ai_agent_run')
          .update({ status: 'completed' })
          .eq('id', (runData as any).id);
      }
    } catch (err) {
      console.error('Erreur analyse météo:', err);
    } finally {
      setCheckingWeather(false);
    }
  }

  function getGoogleMapsUrl(address: SiteAddressRow): string {
    if (address.latitude && address.longitude) {
      return `https://maps.google.com/?q=${address.latitude},${address.longitude}`;
    }
    const q = encodeURIComponent(`${address.address}, ${address.postal_code} ${address.city}`);
    return `https://maps.google.com/?q=${q}`;
  }

  function getClientDisplayName(client: ClientRow): string {
    if (client.client_type === 'pro') return client.company_name || `${client.first_name} ${client.last_name}`;
    return `${client.first_name} ${client.last_name}`;
  }

  function getEmployeeInitials(emp: EmployeeRow): string {
    return `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`.toUpperCase();
  }

  function toggleEmployeeId(empId: string) {
    setFormData((prev) => ({
      ...prev,
      employee_ids: prev.employee_ids.includes(empId)
        ? prev.employee_ids.filter((id) => id !== empId)
        : [...prev.employee_ids, empId],
    }));
  }

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];

  // Current editing event's selected weather
  const editingWeather = editingEvent?.weather || null;
  const formSiteAddress = formData.site_address_id
    ? siteAddresses.find((a) => a.id === formData.site_address_id)
    : null;

  return (
    <div className="flex flex-col h-screen bg-gray-50" style={{ background: '#f8fafc' }}>
      {/* Header */}
      <div
        className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-4 py-3 border-b bg-white shadow-sm"
        style={{ minHeight: 64 }}
      >
        <div className="flex items-center gap-2 flex-wrap">
          {/* Navigation */}
          <div className="flex items-center rounded-lg border overflow-hidden">
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-none border-r"
              onClick={prevWeek}
              aria-label="Semaine précédente"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <button
              onClick={goToToday}
              className="px-3 py-2 text-sm font-medium hover:bg-gray-50 transition-colors"
              style={{ minHeight: 40 }}
            >
              {viewMode === 'semaine' ? formatWeekRange(currentWeekStart) : selectedDay.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </button>
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-none border-l"
              onClick={nextWeek}
              aria-label="Semaine suivante"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* View toggle */}
          <div className="flex items-center rounded-lg border overflow-hidden">
            <button
              onClick={() => setViewMode('semaine')}
              className={cn(
                'px-3 py-2 text-sm font-medium transition-colors',
                viewMode === 'semaine' ? 'bg-gray-900 text-white' : 'bg-white hover:bg-gray-50'
              )}
              style={{ minHeight: 40 }}
            >
              Semaine
            </button>
            <button
              onClick={() => setViewMode('jour')}
              className={cn(
                'px-3 py-2 text-sm font-medium transition-colors border-l',
                viewMode === 'jour' ? 'bg-gray-900 text-white' : 'bg-white hover:bg-gray-50'
              )}
              style={{ minHeight: 40 }}
            >
              Jour
            </button>
          </div>

          {/* Today button */}
          <Button variant="outline" size="sm" onClick={goToToday} className="h-10">
            Aujourd'hui
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Weather check */}
          <Button
            variant="outline"
            size="sm"
            onClick={checkWeatherAI}
            disabled={checkingWeather}
            className="h-10 gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            {checkingWeather ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Vérifier météo</span>
          </Button>

          {/* New event */}
          <Button
            onClick={() => openNewEvent()}
            className="h-10 gap-2"
            style={{ background: '#1a1a2e', color: 'white' }}
          >
            <Plus className="w-4 h-4" />
            <span>Nouveau chantier</span>
          </Button>
        </div>
      </div>

      {/* AI Proposals Banner */}
      {aiProposals.length > 0 && (
        <div className="bg-emerald-50 border-b border-emerald-200 px-4 py-3">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-emerald-800 mb-2">
                {aiProposals.length} conflit(s) météo détecté(s) par l'IA
              </p>
              <div className="flex flex-col gap-2">
                {aiProposals.map((proposal) => (
                  <div key={proposal.id} className="flex items-start justify-between gap-3 bg-white rounded-lg p-3 border border-emerald-200">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{proposal.title}</p>
                        <p className="text-xs text-gray-600">{proposal.description}</p>
                        {proposal.confidence_score && (
                          <p className="text-xs text-emerald-600 mt-1">
                            Confiance : {Math.round(proposal.confidence_score * 100)}%
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => setAiProposals((prev) => prev.filter((p) => p.id !== proposal.id))}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
              <p className="text-sm text-gray-500">Chargement du planning...</p>
            </div>
          </div>
        ) : viewMode === 'semaine' ? (
          <WeekView
            weekDays={weekDays}
            eventsByDay={eventsByDay}
            todayStr={todayStr}
            onEventClick={openEditEvent}
            onSlotClick={openNewEvent}
          />
        ) : (
          <DayView
            day={selectedDay}
            events={eventsByDay[selectedDay.toISOString().split('T')[0]] || []}
            onEventClick={openEditEvent}
            onSlotClick={(hour) => openNewEvent(selectedDay, hour)}
          />
        )}
      </div>

      {/* Event Edit/Create Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-lg p-0 flex flex-col"
          style={{ maxWidth: 520 }}
        >
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <SheetTitle className="text-lg font-bold" style={{ color: '#1a1a2e' }}>
              {editingEvent ? 'Modifier l'événement' : 'Nouvel événement'}
            </SheetTitle>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="px-6 py-4 flex flex-col gap-5">
              {/* Title */}
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-sm font-medium">
                  Titre <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData((p) => ({ ...p, title: e.target.value }))}
                  placeholder="Ex: Pose de gazon – Résidence Martin"
                  className="h-12"
                />
              </div>

              {/* Event type */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Type d'événement</Label>
                <Select
                  value={formData.event_type}
                  onValueChange={(v) => setFormData((p) => ({ ...p, event_type: v as ScheduleEventType }))}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(EVENT_TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn('w-3 h-3 rounded-full', EVENT_TYPE_COLORS[value as ScheduleEventType].split(' ')[0])}
                          />
                          {label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* All day toggle */}
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">Journée entière</Label>
                <Switch
                  checked={formData.all_day}
                  onCheckedChange={(v) => setFormData((p) => ({ ...p, all_day: v }))}
                />
              </div>

              {/* Date/Time */}
              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="start_datetime" className="text-sm font-medium">
                    Début
                  </Label>
                  <Input
                    id="start_datetime"
                    type={formData.all_day ? 'date' : 'datetime-local'}
                    value={
                      formData.all_day
                        ? formData.start_datetime.split('T')[0]
                        : formData.start_datetime
                    }
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        start_datetime: formData.all_day ? e.target.value + 'T08:00' : e.target.value,
                      }))
                    }
                    className="h-12"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="end_datetime" className="text-sm font-medium">
                    Fin
                  </Label>
                  <Input
                    id="end_datetime"
                    type={formData.all_day ? 'date' : 'datetime-local'}
                    value={
                      formData.all_day
                        ? formData.end_datetime.split('T')[0]
                        : formData.end_datetime
                    }
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        end_datetime: formData.all_day ? e.target.value + 'T18:00' : e.target.value,
                      }))
                    }
                    className="h-12"
                  />
                </div>
              </div>

              <Separator />

              {/* Client */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Client</Label>
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
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Sélectionner un client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun client</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {getClientDisplayName(client)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Site address */}
              {formData.client_id && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">Adresse du chantier</Label>
                  <Select
                    value={formData.site_address_id || 'none'}
                    onValueChange={(v) =>
                      setFormData((p) => ({
                        ...p,
                        site_address_id: v === 'none' ? '' : v,
                      }))
                    }
                  >
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Sélectionner une adresse" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Aucune adresse</SelectItem>
                      {filteredAddresses.map((addr) => (
                        <SelectItem key={addr.id} value={addr.id}>
                          {addr.label || addr.address} – {addr.city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Google Maps Button */}
              {formSiteAddress && (
                <Button
                  variant="outline"
                  className="w-full h-12 gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                  onClick={() => window.open(getGoogleMapsUrl(formSiteAddress), '_blank')}
                  type="button"
                >
                  <MapPin className="w-4 h-4" />
                  Ouvrir l'itinéraire
                </Button>
              )}

              <Separator />

              {/* Employees */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Équipe assignée</Label>
                <div className="grid grid-cols-1 gap-2">
                  {employees.map((emp) => {
                    const selected = formData.employee_ids.includes(emp.id);
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => toggleEmployeeId(emp.id)}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-lg border text-left transition-colors',
                          selected
                            ? 'bg-emerald-50 border-emerald-300'
                            : 'bg-white border-gray-200 hover:border-gray-300'
                        )}
                        style={{ minHeight: 48 }}
                      >
                        <Avatar className="w-8 h-8" style={{ background: emp.color || '#10b981' }}>
                          <AvatarFallback className="text-xs text-white" style={{ background: emp.color || '#10b981' }}>
                            {getEmployeeInitials(emp)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {emp.first_name} {emp.last_name}
                          </p>
                          {emp.role_title && (
                            <p className="text-xs text-gray-500">{emp.role_title}</p>
                          )}
                        </div>
                        {selected && <CheckCircle className="w-4 h-4 text-emerald-600" />}
                      </button>
                    );
                  })}
                  {employees.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      Aucun employé disponible
                    </p>
                  )}
                </div>
              </div>

              <Separator />

              {/* Weather for editing event */}
              {editingEvent && (
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-2">
                    <Wind className="w-4 h-4" />
                    Météo prévue
                  </Label>
                  <WeatherWidget weather={editingWeather} />
                </div>
              )}

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-sm font-medium">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Instructions particulières, matériaux nécessaires..."
                  rows={3}
                />
              </div>
            </div>
          </ScrollArea>

          {/* Footer actions */}
          <div className="px-6 py-4 border-t flex items-center gap-3">
            {editingEvent && (
              <Button
                variant="destructive"
                onClick={deleteEvent}
                disabled={saving}
                className="h-12"
              >
                Supprimer
              </Button>
            )}
            <div className="flex-1" />
            <Button
              variant="outline"
              onClick={() => setSheetOpen(false)}
              className="h-12"
            >
              Annuler
            </Button>
            <Button
              onClick={saveEvent}
              disabled={saving || !formData.title.trim()}
              className="h-12 gap-2"
              style={{ background: '#1a1a2e', color: 'white' }}
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editingEvent ? 'Enregistrer' : 'Créer'}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// WeekView Component
function WeekView({
  weekDays,
  eventsByDay,
  todayStr,
  onEventClick,
  onSlotClick,
}: {
  weekDays: Date[];
  eventsByDay: Record<string, EventWithDetails[]>;
  todayStr: string;
  onEventClick: (event: EventWithDetails) => void;
  onSlotClick: (day: Date, hour: number) => void;
}) {
  const HOUR_HEIGHT = 56; // px per hour

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Day headers */}
      <div className="flex border-b bg-white" style={{ paddingLeft: 56 }}>
        {weekDays.map((day, i) => {
          const dayStr = day.toISOString().split('T')[0];
          const isToday = dayStr === todayStr;
          return (
            <div
              key={i}
              className="flex-1 text-center py-2 min-w-0"
            >
              <p className="text-xs text-gray-500 uppercase tracking-wide">{DAY_NAMES[i]}</p>
              <div
                className={cn(
                  'mx-auto w-8 h-8 flex items-center justify-center rounded-full text-sm font-semibold mt-0.5',
                  isToday ? 'text-white' : 'text-gray-900'
                )}
                style={isToday ? { background: '#10b981' } : {}}
              >
                {day.getDate()}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <ScrollArea className="flex-1">
        <div className="flex" style={{ minHeight: HOUR_HEIGHT * 12 }}>
          {/* Hour labels */}
          <div className="w-14 shrink-0 border-r bg-white">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="flex items-start justify-end pr-2 text-xs text-gray-400"
                style={{ height: HOUR_HEIGHT }}
              >
                <span className="-mt-2">{hour}h</span>
              </div>
            ))}
          </div>

          {/* Day columns */}
          {weekDays.map((day, dayIndex) => {
            const dayStr = day.toISOString().split('T')[0];
            const dayEvents = eventsByDay[dayStr] || [];
            const isToday = dayStr === todayStr;

            return (
              <div
                key={dayIndex}
                className={cn(
                  'flex-1 relative border-r min-w-0',
                  isToday ? 'bg-emerald-50/30' : 'bg-white'
                )}
                style={{ height: HOUR_HEIGHT * 12 }}
              >
                {/* Hour lines */}
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="absolute left-0 right-0 border-t border-gray-100 cursor-pointer hover:bg-gray-50/80 transition-colors"
                    style={{ top: (hour - 7) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                    onClick={() => onSlotClick(day, hour)}
                  />
                ))}

                {/* Events */}
                {dayEvents.map((event) => {
                  const start = new Date(event.start_datetime);
                  const end = new Date(event.end_datetime);
                  const startHour = start.getHours() + start.getMinutes() / 60;
                  const endHour = end.getHours() + end.getMinutes() / 60;
                  const clampedStart = Math.max(7, Math.min(19, startHour));
                  const clampedEnd = Math.max(7, Math.min(19, endHour));
                  const top = (clampedStart - 7) * HOUR_HEIGHT;
                  const height = Math.max((clampedEnd - clampedStart) * HOUR_HEIGHT, 24);
                  const eventType = event.event_type as ScheduleEventType;
                  const colorClass = EVENT_TYPE_COLORS[eventType] || 'bg-gray-500 border-gray-600';

                  return (
                    <div
                      key={event.id}
                      className={cn(
                        'absolute left-1 right-1 rounded-md border-l-4 cursor-pointer overflow-hidden shadow-sm hover:shadow-md transition-shadow',
                        colorClass
                      )}
                      style={{ top, height, zIndex: 10 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                    >
                      <div className="p-1.5 h-full flex flex-col justify-between">
                        <div>
                          <p className="text-white text-xs font-semibold leading-tight truncate">
                            {event.title}
                          </p>
                          {event.client && height > 48 && (
                            <p className="text-white/80 text-xs truncate">
                              {event.client.first_name} {event.client.last_name}
                            </p>
                          )}
                          {height > 56 && (
                            <p className="text-white/70 text-xs">
                              {start.getHours()}h{String(start.getMinutes()).padStart(2, '0')} – {end.getHours()}h{String(end.getMinutes()).padStart(2, '0')}
                            </p>
                          )}
                        </div>
                        {height > 64 && (
                          <div className="flex items-center justify-between mt-1">
                            <div className="flex -space-x-1">
                              {event.employees.slice(0, 3).map((emp) => (
                                <div
                                  key={emp.id}
                                  className="w-5 h-5 rounded-full border border-white/50 flex items-center justify-center text-white text-xs font-bold"
                                  style={{ background: emp.color || '#374151' }}
                                  title={`${emp.first_name} ${emp.last_name}`}
                                >
                                  {getInitials(emp)}
                                </div>
                              ))}
                              {event.employees.length > 3 && (
                                <div className="w-5 h-5 rounded-full border border-white/50 bg-white/30 flex items-center justify-center text-white text-xs">
                                  +{event.employees.length - 3}
                                </div>
                              )}
                            </div>
                            {event.weather && (
                              <span className="text-sm">
                                {WEATHER_SEVERITY_CONFIG[event.weather.severity as WeatherSeverity]?.icon}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}

// DayView Component
function DayView({
  day,
  events,
  onEventClick,
  onSlotClick,
}: {
  day: Date;
  events: EventWithDetails[];
  onEventClick: (event: EventWithDetails) => void;
  onSlotClick: (hour: number) => void;
}) {
  const HOUR_HEIGHT = 72;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Day header */}
      <div className="border-b bg-white px-4 py-3">
        <p className="text-lg font-semibold" style={{ color: '#1a1a2e' }}>
          {day.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
        <p className="text-sm text-gray-500">{events.length} événement(s)</p>
      </div>

      <ScrollArea className="flex-1">
        <div className="flex" style={{ minHeight: HOUR_HEIGHT * 12 }}>
          {/* Hour labels */}
          <div className="w-14 shrink-0 border-r bg-white">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="flex items-start justify-end pr-2 text-xs text-gray-400"
                style={{ height: HOUR_HEIGHT }}
              >
                <span className="-mt-2">{hour}h</span>
              </div>
            ))}
          </div>

          {/* Main column */}
          <div
            className="flex-1 relative bg-white"
            style={{ height: HOUR_HEIGHT * 12 }}
          >
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="absolute left-0 right-0 border-t border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                style={{ top: (hour - 7) * HOUR_HEIGHT, height: HOUR_HEIGHT }}
                onClick={() => onSlotClick(hour)}
              />
            ))}

            {events.map((event) => {
              const start = new Date(event.start_datetime);
              const end = new Date(event.end_datetime);
              const startHour = start.getHours() + start.getMinutes() / 60;
              const endHour = end.getHours() + end.getMinutes() / 60;
              const clampedStart = Math.max(7, Math.min(19, startHour));
              const clampedEnd = Math.max(7, Math.min(19, endHour));
              const top = (clampedStart - 7) * HOUR_HEIGHT;
              const height = Math.max((clampedEnd - clampedStart) * HOUR_HEIGHT, 48);
              const eventType = event.event_type as ScheduleEventType;
              const colorClass = EVENT_TYPE_COLORS[eventType] || 'bg-gray-500 border-gray-600';

              return (
                <div
                  key={event.id}
                  className={cn(
                    'absolute left-2 right-2 rounded-lg border-l-4 cursor-pointer shadow-sm hover:shadow-md transition-shadow',
                    colorClass
                  )}
                  style={{ top, height, zIndex: 10 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick(event);
                  }}
                >
                  <div className="p-3 h-full flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-white font-semibold text-sm leading-tight">{event.title}</p>
                        {event.weather && (
                          <span className="text-lg shrink-0">
                            {WEATHER_SEVERITY_CONFIG[event.weather.severity as WeatherSeverity]?.icon}
                          </span>
                        )}
                      </div>
                      {event.client && (
                        <p className="text-white/80 text-xs mt-1">
                          {event.client.first_name} {event.client.last_name}
                          {event.client.client_type === 'pro' && event.client.company_name
                            ? ` – ${event.client.company_name}`
                            : ''}
                        </p>
                      )}
                      <p className="text-white/70 text-xs mt-1">
                        {start.getHours()}h{String(start.getMinutes()).padStart(2, '0')} – {end.getHours()}h{String(end.getMinutes()).padStart(2, '0')}
                      </p>
                      {event.site_address && (
                        <p className="text-white/70 text-xs mt-0.5 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {event.site_address.address}, {event.site_address.city}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <div className="flex -space-x-1">
                        {event.employees.slice(0, 5).map((emp) => (
                          <div
                            key={emp.id}
                            className="w-7 h-7 rounded-full border-2 border-white/50 flex items-center justify-center text-white text-xs font-bold"
                            style={{ background: emp.color || '#374151' }}
                            title={`${emp.first_name} ${emp.last_name}`}
                          >
                            {getInitials(emp)}
                          </div>
                        ))}
                        {event.employees.length > 5 && (
                          <div className="w-7 h-7 rounded-full border-2 border-white/50 bg-white/30 flex items-center justify-center text-white text-xs">
                            +{event.employees.length - 5}
                          </div>
                        )}
                      </div>
                      {event.weather && (
                        <span
                          className={cn(
                            'text-xs px-2 py-0.5 rounded-full border font-medium',
                            WEATHER_SEVERITY_CONFIG[event.weather.severity as WeatherSeverity]?.color
                          )}
                        >
                          {WEATHER_SEVERITY_CONFIG[event.weather.severity as WeatherSeverity]?.label}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}

function getInitials(emp: EmployeeRow): string {
  return `${emp.first_name?.[0] || ''}${emp.last_name?.[0] || ''}`.toUpperCase();
}
