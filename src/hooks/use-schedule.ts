'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  ScheduleEventRow,
  ScheduleEventInsert,
  ScheduleEventUpdate,
  ScheduleEventEmployeeRow,
  WeatherSnapshotRow,
  EmployeeRow,
  ClientRow,
  SiteAddressRow,
} from '@/types/database';

export interface ScheduleEventWithDetails extends ScheduleEventRow {
  client: Pick<ClientRow, 'company_name' | 'first_name' | 'last_name'> | null;
  site_address: Pick<SiteAddressRow, 'label' | 'street' | 'city' | 'latitude' | 'longitude'> | null;
  employees: EmployeeRow[];
}

export interface UseScheduleReturn {
  events: ScheduleEventWithDetails[];
  employees: EmployeeRow[];
  weatherSnapshots: Record<string, WeatherSnapshotRow[]>;
  loading: boolean;
  error: string | null;
  fetchEvents: (companyId: string, startDate: string, endDate: string) => Promise<void>;
  createEvent: (data: ScheduleEventInsert) => Promise<ScheduleEventRow | null>;
  updateEvent: (id: string, data: ScheduleEventUpdate) => Promise<ScheduleEventRow | null>;
  deleteEvent: (id: string) => Promise<boolean>;
  assignEmployee: (eventId: string, employeeId: string) => Promise<ScheduleEventEmployeeRow | null>;
  removeEmployee: (eventId: string, employeeId: string) => Promise<boolean>;
  fetchWeatherForEvent: (eventId: string) => Promise<WeatherSnapshotRow[]>;
  fetchEmployees: (companyId: string) => Promise<void>;
  clearError: () => void;
}

export function useSchedule(): UseScheduleReturn {
  const [events, setEvents] = useState<ScheduleEventWithDetails[]>([]);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [weatherSnapshots, setWeatherSnapshots] = useState<Record<string, WeatherSnapshotRow[]>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchEvents = useCallback(
    async (companyId: string, startDate: string, endDate: string): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const { data: eventRows, error: eventsError } = await supabase
          .from('schedule_event')
          .select(
            `
            *,
            client:client_id (
              company_name,
              first_name,
              last_name
            ),
            site_address:site_address_id (
              label,
              street,
              city,
              latitude,
              longitude
            )
          `
          )
          .eq('company_id', companyId)
          .gte('start_datetime', startDate)
          .lte('end_datetime', endDate)
          .order('start_datetime', { ascending: true });

        if (eventsError) {
          throw new Error(eventsError.message);
        }

        if (!eventRows || eventRows.length === 0) {
          setEvents([]);
          return;
        }

        const eventIds = eventRows.map((e) => e.id);

        const { data: assignmentRows, error: assignError } = await supabase
          .from('schedule_event_employee')
          .select(
            `
            *,
            employee:employee_id (*)
          `
          )
          .in('schedule_event_id', eventIds);

        if (assignError) {
          throw new Error(assignError.message);
        }

        const employeesByEvent: Record<string, EmployeeRow[]> = {};
        if (assignmentRows) {
          for (const row of assignmentRows) {
            const eventId = row.schedule_event_id;
            if (!employeesByEvent[eventId]) {
              employeesByEvent[eventId] = [];
            }
            if (row.employee) {
              employeesByEvent[eventId].push(row.employee as EmployeeRow);
            }
          }
        }

        const enrichedEvents: ScheduleEventWithDetails[] = eventRows.map((event) => ({
          ...event,
          client: (event.client as Pick<ClientRow, 'company_name' | 'first_name' | 'last_name'> | null) ?? null,
          site_address:
            (event.site_address as Pick<
              SiteAddressRow,
              'label' | 'street' | 'city' | 'latitude' | 'longitude'
            > | null) ?? null,
          employees: employeesByEvent[event.id] ?? [],
        }));

        setEvents(enrichedEvents);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur lors du chargement des événements';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const createEvent = useCallback(
    async (data: ScheduleEventInsert): Promise<ScheduleEventRow | null> => {
      setLoading(true);
      setError(null);
      try {
        const { data: created, error: createError } = await supabase
          .from('schedule_event')
          .insert(data)
          .select()
          .single();

        if (createError) {
          throw new Error(createError.message);
        }

        if (created) {
          const enriched: ScheduleEventWithDetails = {
            ...created,
            client: null,
            site_address: null,
            employees: [],
          };
          setEvents((prev) => [...prev, enriched].sort((a, b) =>
            new Date(a.start_datetime).getTime() - new Date(b.start_datetime).getTime()
          ));
        }

        return created;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur lors de la création de l'événement";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const updateEvent = useCallback(
    async (id: string, data: ScheduleEventUpdate): Promise<ScheduleEventRow | null> => {
      setLoading(true);
      setError(null);
      try {
        const { data: updated, error: updateError } = await supabase
          .from('schedule_event')
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (updateError) {
          throw new Error(updateError.message);
        }

        if (updated) {
          setEvents((prev) =>
            prev.map((evt) =>
              evt.id === id
                ? {
                    ...evt,
                    ...updated,
                  }
                : evt
            )
          );
        }

        return updated;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur lors de la mise à jour de l'événement";
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const deleteEvent = useCallback(
    async (id: string): Promise<boolean> => {
      setLoading(true);
      setError(null);
      try {
        const { error: deleteError } = await supabase
          .from('schedule_event')
          .delete()
          .eq('id', id);

        if (deleteError) {
          throw new Error(deleteError.message);
        }

        setEvents((prev) => prev.filter((evt) => evt.id !== id));
        setWeatherSnapshots((prev) => {
          const next = { ...prev };
          delete next[id];
          return next;
        });

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur lors de la suppression de l'événement";
        setError(message);
        return false;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const assignEmployee = useCallback(
    async (eventId: string, employeeId: string): Promise<ScheduleEventEmployeeRow | null> => {
      setError(null);
      try {
        const { data: existing } = await supabase
          .from('schedule_event_employee')
          .select('*')
          .eq('schedule_event_id', eventId)
          .eq('employee_id', employeeId)
          .maybeSingle();

        if (existing) {
          return existing as ScheduleEventEmployeeRow;
        }

        const { data: assignment, error: assignError } = await supabase
          .from('schedule_event_employee')
          .insert({
            schedule_event_id: eventId,
            employee_id: employeeId,
          })
          .select()
          .single();

        if (assignError) {
          throw new Error(assignError.message);
        }

        if (assignment) {
          const assignedEmployee = employees.find((emp) => emp.id === employeeId);
          if (assignedEmployee) {
            setEvents((prev) =>
              prev.map((evt) =>
                evt.id === eventId
                  ? {
                      ...evt,
                      employees: [...evt.employees.filter((e) => e.id !== employeeId), assignedEmployee],
                    }
                  : evt
              )
            );
          }
        }

        return assignment;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur lors de l'affectation de l'employé";
        setError(message);
        return null;
      }
    },
    [supabase, employees]
  );

  const removeEmployee = useCallback(
    async (eventId: string, employeeId: string): Promise<boolean> => {
      setError(null);
      try {
        const { error: removeError } = await supabase
          .from('schedule_event_employee')
          .delete()
          .eq('schedule_event_id', eventId)
          .eq('employee_id', employeeId);

        if (removeError) {
          throw new Error(removeError.message);
        }

        setEvents((prev) =>
          prev.map((evt) =>
            evt.id === eventId
              ? {
                  ...evt,
                  employees: evt.employees.filter((emp) => emp.id !== employeeId),
                }
              : evt
          )
        );

        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur lors du retrait de l'employé";
        setError(message);
        return false;
      }
    },
    [supabase]
  );

  const fetchWeatherForEvent = useCallback(
    async (eventId: string): Promise<WeatherSnapshotRow[]> => {
      setError(null);
      try {
        // First, retrieve the event's site_address_id and start_datetime
        const { data: eventData, error: eventError } = await supabase
          .from('schedule_event')
          .select('site_address_id, start_datetime')
          .eq('id', eventId)
          .single();

        if (eventError) {
          throw new Error(eventError.message);
        }

        if (!eventData || !eventData.site_address_id) {
          const result: WeatherSnapshotRow[] = [];
          setWeatherSnapshots((prev) => ({
            ...prev,
            [eventId]: result,
          }));
          return result;
        }

        const eventDate = eventData.start_datetime.slice(0, 10);

        const { data: snapshots, error: weatherError } = await supabase
          .from('weather_snapshot')
          .select('*')
          .eq('site_address_id', eventData.site_address_id)
          .eq('date', eventDate)
          .order('date', { ascending: true });

        if (weatherError) {
          throw new Error(weatherError.message);
        }

        const result = snapshots ?? [];

        setWeatherSnapshots((prev) => ({
          ...prev,
          [eventId]: result,
        }));

        return result;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur lors du chargement de la météo';
        setError(message);
        return [];
      }
    },
    [supabase]
  );

  const fetchEmployees = useCallback(
    async (companyId: string): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const { data: employeeRows, error: empError } = await supabase
          .from('employee')
          .select('*')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('last_name', { ascending: true })
          .order('first_name', { ascending: true });

        if (empError) {
          throw new Error(empError.message);
        }

        setEmployees(employeeRows ?? []);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Erreur lors du chargement des employés';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  return {
    events,
    employees,
    weatherSnapshots,
    loading,
    error,
    fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    assignEmployee,
    removeEmployee,
    fetchWeatherForEvent,
    fetchEmployees,
    clearError,
  };
}
