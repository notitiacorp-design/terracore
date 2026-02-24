'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  ReminderWorkflowRow,
  ReminderWorkflowInsert,
  ReminderWorkflowUpdate,
  ReminderMessageRow,
  ReminderMessageInsert,
  InvoiceRow,
  ClientRow,
} from '@/types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WorkflowWithMessages extends ReminderWorkflowRow {
  reminder_message: ReminderMessageRow[];
  client?: Pick<ClientRow, 'id' | 'first_name' | 'last_name' | 'company_name' | 'client_type' | 'email'>;
  invoice?: Pick<InvoiceRow, 'id' | 'reference' | 'total_ttc' | 'remaining_ttc' | 'date_echeance' | 'status'>;
}

export interface FetchWorkflowsFilters {
  is_active?: boolean;
  client_id?: string;
}

export interface ClientRiskScore {
  client_id: string;
  overdue_count: number;
  total_count: number;
  overdue_amount_ttc: number;
  risk_percent: number;
  risk_label: 'faible' | 'modere' | 'eleve' | 'critique';
}

export interface UseRemindersReturn {
  // State
  workflows: ReminderWorkflowRow[];
  loading: boolean;
  error: string | null;

  // Workflow operations
  fetchWorkflows: (companyId: string, filters?: FetchWorkflowsFilters) => Promise<ReminderWorkflowRow[]>;
  fetchWorkflowWithMessages: (workflowId: string) => Promise<WorkflowWithMessages | null>;
  createWorkflow: (data: ReminderWorkflowInsert) => Promise<ReminderWorkflowRow | null>;
  updateWorkflow: (id: string, data: ReminderWorkflowUpdate) => Promise<ReminderWorkflowRow | null>;
  stopWorkflow: (id: string, reason: string) => Promise<ReminderWorkflowRow | null>;

  // Message operations
  createMessage: (data: ReminderMessageInsert) => Promise<ReminderMessageRow | null>;

  // Analytics
  fetchClientRiskScore: (clientId: string, companyId: string) => Promise<ClientRiskScore | null>;

  // Helpers
  clearError: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useReminders(): UseRemindersReturn {
  const [workflows, setWorkflows] = useState<ReminderWorkflowRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  const handleError = useCallback((err: unknown, fallback: string): string => {
    const message = err instanceof Error ? err.message : fallback;
    setError(message);
    return message;
  }, []);

  const clearError = useCallback(() => setError(null), []);

  // -------------------------------------------------------------------------
  // fetchWorkflows
  // -------------------------------------------------------------------------

  const fetchWorkflows = useCallback(
    async (
      companyId: string,
      filters?: FetchWorkflowsFilters,
    ): Promise<ReminderWorkflowRow[]> => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('reminder_workflow')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        if (filters?.is_active !== undefined) {
          query = query.eq('is_active', filters.is_active);
        }

        if (filters?.client_id) {
          query = query.eq('client_id', filters.client_id);
        }

        const { data, error: supabaseError } = await query;

        if (supabaseError) throw supabaseError;

        const result = (data ?? []) as ReminderWorkflowRow[];
        setWorkflows(result);
        return result;
      } catch (err) {
        handleError(err, 'Erreur lors du chargement des workflows de relance');
        return [];
      } finally {
        setLoading(false);
      }
    },
    [supabase, handleError],
  );

  // -------------------------------------------------------------------------
  // fetchWorkflowWithMessages
  // -------------------------------------------------------------------------

  const fetchWorkflowWithMessages = useCallback(
    async (workflowId: string): Promise<WorkflowWithMessages | null> => {
      setLoading(true);
      setError(null);

      try {
        const { data, error: supabaseError } = await supabase
          .from('reminder_workflow')
          .select(
            `
            *,
            reminder_message(*),
            client(
              id,
              first_name,
              last_name,
              company_name,
              client_type,
              email
            ),
            invoice(
              id,
              reference,
              total_ttc,
              remaining_ttc,
              date_echeance,
              status
            )
          `,
          )
          .eq('id', workflowId)
          .single();

        if (supabaseError) throw supabaseError;
        if (!data) return null;

        return data as unknown as WorkflowWithMessages;
      } catch (err) {
        handleError(err, 'Erreur lors du chargement du workflow et de ses messages');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase, handleError],
  );

  // -------------------------------------------------------------------------
  // createWorkflow
  // -------------------------------------------------------------------------

  const createWorkflow = useCallback(
    async (data: ReminderWorkflowInsert): Promise<ReminderWorkflowRow | null> => {
      setLoading(true);
      setError(null);

      try {
        const { data: created, error: supabaseError } = await supabase
          .from('reminder_workflow')
          .insert(data)
          .select()
          .single();

        if (supabaseError) throw supabaseError;
        if (!created) return null;

        const workflow = created as ReminderWorkflowRow;
        setWorkflows((prev) => [workflow, ...prev]);
        return workflow;
      } catch (err) {
        handleError(err, 'Erreur lors de la création du workflow de relance');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase, handleError],
  );

  // -------------------------------------------------------------------------
  // updateWorkflow
  // -------------------------------------------------------------------------

  const updateWorkflow = useCallback(
    async (
      id: string,
      data: ReminderWorkflowUpdate,
    ): Promise<ReminderWorkflowRow | null> => {
      setLoading(true);
      setError(null);

      try {
        const { data: updated, error: supabaseError } = await supabase
          .from('reminder_workflow')
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (supabaseError) throw supabaseError;
        if (!updated) return null;

        const workflow = updated as ReminderWorkflowRow;
        setWorkflows((prev) =>
          prev.map((w) => (w.id === id ? workflow : w)),
        );
        return workflow;
      } catch (err) {
        handleError(err, 'Erreur lors de la mise à jour du workflow de relance');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase, handleError],
  );

  // -------------------------------------------------------------------------
  // stopWorkflow
  // -------------------------------------------------------------------------

  const stopWorkflow = useCallback(
    async (id: string, reason: string): Promise<ReminderWorkflowRow | null> => {
      setLoading(true);
      setError(null);

      try {
        const now = new Date().toISOString();

        const { data: updated, error: supabaseError } = await supabase
          .from('reminder_workflow')
          .update({
            is_active: false,
            stopped_at: now,
            stopped_reason: reason,
            updated_at: now,
          } as ReminderWorkflowUpdate)
          .eq('id', id)
          .select()
          .single();

        if (supabaseError) throw supabaseError;
        if (!updated) return null;

        const workflow = updated as ReminderWorkflowRow;
        setWorkflows((prev) =>
          prev.map((w) => (w.id === id ? workflow : w)),
        );
        return workflow;
      } catch (err) {
        handleError(err, 'Erreur lors de l\'arrêt du workflow de relance');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase, handleError],
  );

  // -------------------------------------------------------------------------
  // createMessage
  // -------------------------------------------------------------------------

  const createMessage = useCallback(
    async (data: ReminderMessageInsert): Promise<ReminderMessageRow | null> => {
      setLoading(true);
      setError(null);

      try {
        const { data: created, error: supabaseError } = await supabase
          .from('reminder_message')
          .insert(data)
          .select()
          .single();

        if (supabaseError) throw supabaseError;
        if (!created) return null;

        return created as ReminderMessageRow;
      } catch (err) {
        handleError(err, 'Erreur lors de la création du message de relance');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase, handleError],
  );

  // -------------------------------------------------------------------------
  // fetchClientRiskScore
  // -------------------------------------------------------------------------

  const fetchClientRiskScore = useCallback(
    async (
      clientId: string,
      companyId: string,
    ): Promise<ClientRiskScore | null> => {
      setLoading(true);
      setError(null);

      try {
        // Fetch all invoices for this client in the company
        const { data: invoices, error: invoiceError } = await supabase
          .from('invoice')
          .select('id, status, remaining_ttc, date_echeance')
          .eq('company_id', companyId)
          .eq('client_id', clientId)
          .neq('status', 'annulee');

        if (invoiceError) throw invoiceError;

        const allInvoices = (invoices ?? []) as Pick<
          InvoiceRow,
          'id' | 'status' | 'remaining_ttc' | 'date_echeance'
        >[];

        const total_count = allInvoices.length;

        if (total_count === 0) {
          return {
            client_id: clientId,
            overdue_count: 0,
            total_count: 0,
            overdue_amount_ttc: 0,
            risk_percent: 0,
            risk_label: 'faible',
          };
        }

        const now = new Date();

        const overdueInvoices = allInvoices.filter((inv) => {
          const isOverdueStatus =
            inv.status === 'en_retard' ||
            (inv.status === 'envoyee' &&
              inv.date_echeance != null &&
              new Date(inv.date_echeance) < now) ||
            (inv.status === 'partiellement_payee' &&
              inv.date_echeance != null &&
              new Date(inv.date_echeance) < now);
          return isOverdueStatus;
        });

        const overdue_count = overdueInvoices.length;
        const overdue_amount_ttc = overdueInvoices.reduce(
          (sum, inv) => sum + (inv.remaining_ttc ?? 0),
          0,
        );

        const risk_percent =
          total_count > 0
            ? Math.round((overdue_count / total_count) * 100)
            : 0;

        let risk_label: ClientRiskScore['risk_label'];
        if (risk_percent === 0) {
          risk_label = 'faible';
        } else if (risk_percent <= 25) {
          risk_label = 'modere';
        } else if (risk_percent <= 60) {
          risk_label = 'eleve';
        } else {
          risk_label = 'critique';
        }

        return {
          client_id: clientId,
          overdue_count,
          total_count,
          overdue_amount_ttc,
          risk_percent,
          risk_label,
        };
      } catch (err) {
        handleError(err, 'Erreur lors du calcul du score de risque client');
        return null;
      } finally {
        setLoading(false);
      }
    },
    [supabase, handleError],
  );

  // -------------------------------------------------------------------------
  // Return
  // -------------------------------------------------------------------------

  return {
    workflows,
    loading,
    error,
    fetchWorkflows,
    fetchWorkflowWithMessages,
    createWorkflow,
    updateWorkflow,
    stopWorkflow,
    createMessage,
    fetchClientRiskScore,
    clearError,
  };
}
