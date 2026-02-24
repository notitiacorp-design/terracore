'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  AiAgentRunRow,
  AiAgentRunInsert,
  AiProposalRow,
  ScheduleEventRow,
  WeatherSnapshotRow,
} from '@/types/database';
import type { AiAgentType } from '@/types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WeatherConflict {
  event: ScheduleEventRow;
  snapshots: WeatherSnapshotRow[];
}

export interface FetchProposalsFilters {
  status?: string;
  entity_type?: string;
  agent_type?: AiAgentType;
}

export interface UseAiReturn {
  // State
  proposals: AiProposalRow[];
  agentRuns: AiAgentRunRow[];
  weatherConflicts: WeatherConflict[];
  loading: boolean;
  error: string | null;

  // Functions
  fetchProposals: (companyId: string, filters?: FetchProposalsFilters) => Promise<AiProposalRow[]>;
  acceptProposal: (id: string) => Promise<AiProposalRow | null>;
  rejectProposal: (id: string) => Promise<AiProposalRow | null>;
  fetchAgentRuns: (companyId: string, agentType?: AiAgentType) => Promise<AiAgentRunRow[]>;
  createAgentRun: (data: AiAgentRunInsert) => Promise<AiAgentRunRow | null>;
  generateQuoteFromText: (
    companyId: string,
    text: string,
    createdBy: string
  ) => Promise<AiAgentRunRow | null>;
  fetchWeatherConflicts: (companyId: string) => Promise<WeatherConflict[]>;
  clearError: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAi(): UseAiReturn {
  const supabase = createClient();

  const [proposals, setProposals] = useState<AiProposalRow[]>([]);
  const [agentRuns, setAgentRuns] = useState<AiAgentRunRow[]>([]);
  const [weatherConflicts, setWeatherConflicts] = useState<WeatherConflict[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => setError(null), []);

  // -------------------------------------------------------------------------
  // fetchProposals
  // -------------------------------------------------------------------------
  const fetchProposals = useCallback(
    async (
      companyId: string,
      filters?: FetchProposalsFilters
    ): Promise<AiProposalRow[]> => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('ai_proposal')
          .select(
            `
            *,
            agent_run:ai_agent_run!ai_proposal_agent_run_id_fkey(
              id,
              agent_type,
              status,
              created_at
            )
            `
          )
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        if (filters?.status) {
          query = query.eq('status', filters.status);
        }

        if (filters?.entity_type) {
          query = query.eq('entity_type', filters.entity_type);
        }

        if (filters?.agent_type) {
          // Filter via joined agent_run -> agent_type
          query = query.eq('agent_run.agent_type', filters.agent_type);
        }

        const { data, error: supaError } = await query;

        if (supaError) {
          throw new Error(
            supaError.message ||
              'Erreur lors de la récupération des propositions IA'
          );
        }

        const result = (data as AiProposalRow[]) ?? [];
        setProposals(result);
        return result;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Erreur inconnue lors de la récupération des propositions IA';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  // -------------------------------------------------------------------------
  // acceptProposal
  // -------------------------------------------------------------------------
  const acceptProposal = useCallback(
    async (id: string): Promise<AiProposalRow | null> => {
      setLoading(true);
      setError(null);

      try {
        const now = new Date().toISOString();

        const { data, error: supaError } = await supabase
          .from('ai_proposal')
          .update({
            status: 'accepted',
            reviewed_at: now,
          })
          .eq('id', id)
          .select()
          .single();

        if (supaError) {
          throw new Error(
            supaError.message || 'Erreur lors de l\'acceptation de la proposition'
          );
        }

        const updated = data as AiProposalRow;

        setProposals((prev) =>
          prev.map((p) => (p.id === id ? updated : p))
        );

        return updated;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Erreur inconnue lors de l\'acceptation de la proposition';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  // -------------------------------------------------------------------------
  // rejectProposal
  // -------------------------------------------------------------------------
  const rejectProposal = useCallback(
    async (id: string): Promise<AiProposalRow | null> => {
      setLoading(true);
      setError(null);

      try {
        const now = new Date().toISOString();

        const { data, error: supaError } = await supabase
          .from('ai_proposal')
          .update({
            status: 'rejected',
            reviewed_at: now,
          })
          .eq('id', id)
          .select()
          .single();

        if (supaError) {
          throw new Error(
            supaError.message || 'Erreur lors du rejet de la proposition'
          );
        }

        const updated = data as AiProposalRow;

        setProposals((prev) =>
          prev.map((p) => (p.id === id ? updated : p))
        );

        return updated;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Erreur inconnue lors du rejet de la proposition';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  // -------------------------------------------------------------------------
  // fetchAgentRuns
  // -------------------------------------------------------------------------
  const fetchAgentRuns = useCallback(
    async (
      companyId: string,
      agentType?: AiAgentType
    ): Promise<AiAgentRunRow[]> => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('ai_agent_run')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        if (agentType) {
          query = query.eq('agent_type', agentType);
        }

        const { data, error: supaError } = await query;

        if (supaError) {
          throw new Error(
            supaError.message ||
              'Erreur lors de la récupération des exécutions IA'
          );
        }

        const result = (data as AiAgentRunRow[]) ?? [];
        setAgentRuns(result);
        return result;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Erreur inconnue lors de la récupération des exécutions IA';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  // -------------------------------------------------------------------------
  // createAgentRun
  // -------------------------------------------------------------------------
  const createAgentRun = useCallback(
    async (data: AiAgentRunInsert): Promise<AiAgentRunRow | null> => {
      setLoading(true);
      setError(null);

      try {
        const { data: created, error: supaError } = await supabase
          .from('ai_agent_run')
          .insert(data)
          .select()
          .single();

        if (supaError) {
          throw new Error(
            supaError.message || 'Erreur lors de la création de l\'exécution IA'
          );
        }

        const run = created as AiAgentRunRow;
        setAgentRuns((prev) => [run, ...prev]);
        return run;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Erreur inconnue lors de la création de l\'exécution IA';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  // -------------------------------------------------------------------------
  // generateQuoteFromText
  // -------------------------------------------------------------------------
  const generateQuoteFromText = useCallback(
    async (
      companyId: string,
      text: string,
      createdBy: string
    ): Promise<AiAgentRunRow | null> => {
      setLoading(true);
      setError(null);

      try {
        if (!text.trim()) {
          throw new Error(
            'Le texte de description du devis ne peut pas être vide'
          );
        }

        const insertPayload: AiAgentRunInsert = {
          company_id: companyId,
          agent_type: 'devis_assist',
          input_data: { prompt: text.trim() },
          status: 'pending',
          created_by: createdBy,
        };

        const { data: created, error: supaError } = await supabase
          .from('ai_agent_run')
          .insert(insertPayload)
          .select()
          .single();

        if (supaError) {
          throw new Error(
            supaError.message ||
              'Erreur lors de la création de l\'exécution d\'assistance devis'
          );
        }

        const run = created as AiAgentRunRow;
        setAgentRuns((prev) => [run, ...prev]);
        return run;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Erreur inconnue lors de la génération du devis assisté';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  // -------------------------------------------------------------------------
  // fetchWeatherConflicts
  // -------------------------------------------------------------------------
  const fetchWeatherConflicts = useCallback(
    async (companyId: string): Promise<WeatherConflict[]> => {
      setLoading(true);
      setError(null);

      try {
        // Fetch weather snapshots with defavorable or alerte severity for this company
        const { data: snapshots, error: snapshotError } = await supabase
          .from('weather_snapshot')
          .select('*')
          .eq('company_id', companyId)
          .in('severity', ['defavorable', 'alerte'])
          .order('date', { ascending: true });

        if (snapshotError) {
          throw new Error(
            snapshotError.message ||
              'Erreur lors de la récupération des alertes météo'
          );
        }

        const weatherSnapshots = (snapshots as WeatherSnapshotRow[]) ?? [];

        if (weatherSnapshots.length === 0) {
          setWeatherConflicts([]);
          return [];
        }

        // Collect unique schedule_event_ids from snapshots
        const eventIds = [
          ...new Set(
            weatherSnapshots
              .map((s) => s.schedule_event_id)
              .filter((id): id is string => id !== null && id !== undefined)
          ),
        ];

        if (eventIds.length === 0) {
          setWeatherConflicts([]);
          return [];
        }

        // Fetch the matching schedule events
        const { data: events, error: eventsError } = await supabase
          .from('schedule_event')
          .select('*')
          .eq('company_id', companyId)
          .in('id', eventIds)
          .order('start_datetime', { ascending: true });

        if (eventsError) {
          throw new Error(
            eventsError.message ||
              'Erreur lors de la récupération des événements planifiés'
          );
        }

        const scheduleEvents = (events as ScheduleEventRow[]) ?? [];

        // Build conflicts: group snapshots by event
        const conflicts: WeatherConflict[] = scheduleEvents.map((event) => {
          const eventSnapshots = weatherSnapshots.filter(
            (s) => s.schedule_event_id === event.id
          );
          return { event, snapshots: eventSnapshots };
        });

        // Also include events referenced in snapshots but possibly not matched
        // (edge case: ensure all snapshot event_ids are covered)
        const coveredEventIds = new Set(scheduleEvents.map((e) => e.id));
        const uncoveredSnapshots = weatherSnapshots.filter(
          (s) =>
            s.schedule_event_id &&
            !coveredEventIds.has(s.schedule_event_id)
        );

        if (uncoveredSnapshots.length > 0) {
          const uncoveredEventIds = [
            ...new Set(uncoveredSnapshots.map((s) => s.schedule_event_id!)),
          ];

          const { data: extraEvents } = await supabase
            .from('schedule_event')
            .select('*')
            .in('id', uncoveredEventIds);

          if (extraEvents && extraEvents.length > 0) {
            for (const extraEvent of extraEvents as ScheduleEventRow[]) {
              const extraSnapshots = uncoveredSnapshots.filter(
                (s) => s.schedule_event_id === extraEvent.id
              );
              conflicts.push({ event: extraEvent, snapshots: extraSnapshots });
            }
          }
        }

        setWeatherConflicts(conflicts);
        return conflicts;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Erreur inconnue lors de la récupération des conflits météo';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  // -------------------------------------------------------------------------
  // Return
  // -------------------------------------------------------------------------
  return {
    proposals,
    agentRuns,
    weatherConflicts,
    loading,
    error,
    fetchProposals,
    acceptProposal,
    rejectProposal,
    fetchAgentRuns,
    createAgentRun,
    generateQuoteFromText,
    fetchWeatherConflicts,
    clearError,
  };
}
