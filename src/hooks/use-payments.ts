'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  PaymentRow,
  PaymentInsert,
  PaymentLinkRow,
  PaymentLinkInsert,
} from '@/types/database';
import type { PaymentMethod } from '@/types/database';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PaymentFilters {
  invoice_id?: string;
  payment_method?: PaymentMethod;
}

export interface InvoicePaymentSummary {
  invoice_id: string;
  total_paid: number;
  payment_count: number;
  payments: PaymentRow[];
}

export interface UsePaymentsState {
  payments: PaymentRow[];
  paymentLinks: PaymentLinkRow[];
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
}

export interface UsePaymentsReturn extends UsePaymentsState {
  fetchPayments: (companyId: string, filters?: PaymentFilters) => Promise<PaymentRow[]>;
  createPayment: (data: PaymentInsert) => Promise<PaymentRow>;
  fetchPaymentLinks: (companyId: string) => Promise<PaymentLinkRow[]>;
  createPaymentLink: (data: PaymentLinkInsert) => Promise<PaymentLinkRow>;
  fetchInvoicePaymentSummary: (invoiceId: string) => Promise<InvoicePaymentSummary>;
  clearError: () => void;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function usePayments(): UsePaymentsReturn {
  const supabase = createClient();

  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [paymentLinks, setPaymentLinks] = useState<PaymentLinkRow[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // clearError
  // -------------------------------------------------------------------------
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // -------------------------------------------------------------------------
  // fetchPayments
  // -------------------------------------------------------------------------
  const fetchPayments = useCallback(
    async (companyId: string, filters?: PaymentFilters): Promise<PaymentRow[]> => {
      setIsLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('payment')
          .select('*')
          .eq('company_id', companyId)
          .order('payment_date', { ascending: false });

        if (filters?.invoice_id) {
          query = query.eq('invoice_id', filters.invoice_id);
        }

        if (filters?.payment_method) {
          query = query.eq('payment_method', filters.payment_method);
        }

        const { data, error: supabaseError } = await query;

        if (supabaseError) {
          throw new Error(
            supabaseError.message || 'Erreur lors de la récupération des paiements.'
          );
        }

        const result = (data ?? []) as PaymentRow[];
        setPayments(result);
        return result;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Erreur inattendue lors de la récupération des paiements.';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [supabase]
  );

  // -------------------------------------------------------------------------
  // createPayment
  // -------------------------------------------------------------------------
  const createPayment = useCallback(
    async (data: PaymentInsert): Promise<PaymentRow> => {
      setIsCreating(true);
      setError(null);

      try {
        const { data: created, error: supabaseError } = await supabase
          .from('payment')
          .insert(data)
          .select('*')
          .single();

        if (supabaseError) {
          throw new Error(
            supabaseError.message || 'Erreur lors de la création du paiement.'
          );
        }

        if (!created) {
          throw new Error('Aucune donnée retournée après la création du paiement.');
        }

        const newPayment = created as PaymentRow;

        setPayments((prev) => [newPayment, ...prev]);

        return newPayment;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Erreur inattendue lors de la création du paiement.';
        setError(message);
        throw err;
      } finally {
        setIsCreating(false);
      }
    },
    [supabase]
  );

  // -------------------------------------------------------------------------
  // fetchPaymentLinks
  // -------------------------------------------------------------------------
  const fetchPaymentLinks = useCallback(
    async (companyId: string): Promise<PaymentLinkRow[]> => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: supabaseError } = await supabase
          .from('payment_link')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        if (supabaseError) {
          throw new Error(
            supabaseError.message ||
              'Erreur lors de la récupération des liens de paiement.'
          );
        }

        const result = (data ?? []) as PaymentLinkRow[];
        setPaymentLinks(result);
        return result;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Erreur inattendue lors de la récupération des liens de paiement.';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [supabase]
  );

  // -------------------------------------------------------------------------
  // createPaymentLink
  // -------------------------------------------------------------------------
  const createPaymentLink = useCallback(
    async (data: PaymentLinkInsert): Promise<PaymentLinkRow> => {
      setIsCreating(true);
      setError(null);

      try {
        const { data: created, error: supabaseError } = await supabase
          .from('payment_link')
          .insert(data)
          .select('*')
          .single();

        if (supabaseError) {
          throw new Error(
            supabaseError.message || 'Erreur lors de la création du lien de paiement.'
          );
        }

        if (!created) {
          throw new Error(
            'Aucune donnée retournée après la création du lien de paiement.'
          );
        }

        const newLink = created as PaymentLinkRow;

        setPaymentLinks((prev) => [newLink, ...prev]);

        return newLink;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Erreur inattendue lors de la création du lien de paiement.';
        setError(message);
        throw err;
      } finally {
        setIsCreating(false);
      }
    },
    [supabase]
  );

  // -------------------------------------------------------------------------
  // fetchInvoicePaymentSummary
  // -------------------------------------------------------------------------
  const fetchInvoicePaymentSummary = useCallback(
    async (invoiceId: string): Promise<InvoicePaymentSummary> => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: supabaseError } = await supabase
          .from('payment')
          .select('*')
          .eq('invoice_id', invoiceId)
          .order('payment_date', { ascending: false });

        if (supabaseError) {
          throw new Error(
            supabaseError.message ||
              'Erreur lors de la récupération du résumé des paiements.'
          );
        }

        const invoicePayments = (data ?? []) as PaymentRow[];

        const total_paid = invoicePayments.reduce(
          (sum, payment) => sum + (payment.amount ?? 0),
          0
        );

        const summary: InvoicePaymentSummary = {
          invoice_id: invoiceId,
          total_paid,
          payment_count: invoicePayments.length,
          payments: invoicePayments,
        };

        return summary;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Erreur inattendue lors de la récupération du résumé des paiements.';
        setError(message);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [supabase]
  );

  // -------------------------------------------------------------------------
  // Return
  // -------------------------------------------------------------------------
  return {
    payments,
    paymentLinks,
    isLoading,
    isCreating,
    error,
    fetchPayments,
    createPayment,
    fetchPaymentLinks,
    createPaymentLink,
    fetchInvoicePaymentSummary,
    clearError,
  };
}
