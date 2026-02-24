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
  is_accepted?: boolean;
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
        // If filtering by agent_type, fetch matching agent_run IDs first
        let agentRunIds: string[] | null = null;
        if (filters?.agent_type) {
          const { data: runs, error: runsError } = await supabase
            .from('ai_agent_run')
            .select('id')
            .eq('company_id', companyId)
            .eq('agent_type', filters.agent_type);

          if (runsError) {
            throw new Error(
              runsError.message || 'Erreur lors du filtrage par type d\'agent'
            );
          }

          agentRunIds = (runs ?? []).map((r: { id: string }) => r.id);

          // If no matching agent runs, return early
          if (agentRunIds.length === 0) {
            setProposals([]);
            return [];
          }
        }

        let query = supabase
          .from('ai_proposal')
          .select(
            `
            *,
            agent_run:ai_agent_run(
              id,
              agent_type,
              status,
              started_at
            )
            `
          )
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        if (filters?.is_accepted !== undefined) {
          query = query.eq('is_accepted', filters.is_accepted);
        }

        if (filters?.entity_type) {
          query = query.eq('entity_type', filters.entity_type);
        }

        if (agentRunIds !== null) {
          query = query.in('agent_run_id', agentRunIds);
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
            is_accepted: true,
            accepted_at: now,
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
            is_accepted: false,
            dismissed_at: now,
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
          .order('started_at', { ascending: false });

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
      _createdBy: string
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
              .map((s) => s.site_address_id)
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
          .in('site_address_id', eventIds)
          .order('start_datetime', { ascending: true });

        if (eventsError) {
          throw new Error(
            eventsError.message ||
              'Erreur lors de la récupération des événements planifiés'
          );
        }

        const scheduleEvents = (events as ScheduleEventRow[]) ?? [];

        // Build conflicts: group snapshots by event
        // Match snapshots to events by site_address_id
        const conflicts: WeatherConflict[] = scheduleEvents.map((event) => {
          const eventSnapshots = weatherSnapshots.filter(
            (s) => s.site_address_id === event.site_address_id
          );
          return { event, snapshots: eventSnapshots };
        });

        // Filter out events with no matching snapshots
        const filteredConflicts = conflicts.filter((c) => c.snapshots.length > 0);

        setWeatherConflicts(filteredConflicts);
        return filteredConflicts;
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
