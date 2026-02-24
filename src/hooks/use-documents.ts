'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  QuoteRow,
  QuoteInsert,
  QuoteUpdate,
  InvoiceRow,
  QuoteStatus,
  InvoiceStatus,
} from '@/types/database';

export interface QuoteWithClient extends QuoteRow {
  client: {
    id: string;
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

export interface InvoiceWithClient extends InvoiceRow {
  client: {
    id: string;
    company_name: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
  } | null;
}

export interface DocumentTotals {
  totalHT: number;
  totalVAT: number;
  totalTTC: number;
  count: number;
}

export interface UseDocumentsReturn {
  quotes: QuoteWithClient[];
  invoices: InvoiceWithClient[];
  loading: boolean;
  error: string | null;
  fetchQuotes: (companyId: string, statusFilter?: QuoteStatus[]) => Promise<void>;
  fetchInvoices: (companyId: string, statusFilter?: InvoiceStatus[]) => Promise<void>;
  createQuote: (data: QuoteInsert) => Promise<{ data: QuoteRow | null; error: string | null }>;
  updateQuote: (id: string, data: QuoteUpdate) => Promise<{ data: QuoteRow | null; error: string | null }>;
  getQuoteTotals: () => DocumentTotals;
  getInvoiceTotals: () => DocumentTotals;
}

export function useDocuments(): UseDocumentsReturn {
  const supabase = createClient();

  const [quotes, setQuotes] = useState<QuoteWithClient[]>([]);
  const [invoices, setInvoices] = useState<InvoiceWithClient[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotes = useCallback(
    async (companyId: string, statusFilter?: QuoteStatus[]): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('quote')
          .select(`
            *,
            client:client (
              id,
              company_name,
              first_name,
              last_name,
              email
            )
          `)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        if (statusFilter && statusFilter.length > 0) {
          query = query.in('status', statusFilter);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
          setError(fetchError.message);
          setQuotes([]);
        } else {
          setQuotes((data as QuoteWithClient[]) ?? []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des devis.');
        setQuotes([]);
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const fetchInvoices = useCallback(
    async (companyId: string, statusFilter?: InvoiceStatus[]): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('invoice')
          .select(`
            *,
            client:client (
              id,
              company_name,
              first_name,
              last_name,
              email
            )
          `)
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        if (statusFilter && statusFilter.length > 0) {
          query = query.in('status', statusFilter);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
          setError(fetchError.message);
          setInvoices([]);
        } else {
          setInvoices((data as InvoiceWithClient[]) ?? []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des factures.');
        setInvoices([]);
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const createQuote = useCallback(
    async (data: QuoteInsert): Promise<{ data: QuoteRow | null; error: string | null }> => {
      try {
        const { data: created, error: insertError } = await supabase
          .from('quote')
          .insert(data)
          .select()
          .single();

        if (insertError) {
          return { data: null, error: insertError.message };
        }

        const newQuote = created as QuoteRow;
        const quoteWithClient: QuoteWithClient = { ...newQuote, client: null };
        setQuotes((prev) => [quoteWithClient, ...prev]);
        return { data: newQuote, error: null };
      } catch (err) {
        return {
          data: null,
          error: err instanceof Error ? err.message : 'Erreur lors de la création du devis.',
        };
      }
    },
    [supabase]
  );

  const updateQuote = useCallback(
    async (id: string, data: QuoteUpdate): Promise<{ data: QuoteRow | null; error: string | null }> => {
      try {
        const { data: updated, error: updateError } = await supabase
          .from('quote')
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (updateError) {
          return { data: null, error: updateError.message };
        }

        const updatedQuote = updated as QuoteRow;
        setQuotes((prev) =>
          prev.map((q) =>
            q.id === id ? { ...updatedQuote, client: q.client } : q
          )
        );
        return { data: updatedQuote, error: null };
      } catch (err) {
        return {
          data: null,
          error: err instanceof Error ? err.message : 'Erreur lors de la mise à jour du devis.',
        };
      }
    },
    [supabase]
  );

  const getQuoteTotals = useCallback((): DocumentTotals => {
    return quotes.reduce(
      (acc, quote) => ({
        totalHT: acc.totalHT + (quote.total_ht ?? 0),
        totalVAT: acc.totalVAT + (quote.total_tva ?? 0),
        totalTTC: acc.totalTTC + (quote.total_ttc ?? 0),
        count: acc.count + 1,
      }),
      { totalHT: 0, totalVAT: 0, totalTTC: 0, count: 0 }
    );
  }, [quotes]);

  const getInvoiceTotals = useCallback((): DocumentTotals => {
    return invoices.reduce(
      (acc, invoice) => ({
        totalHT: acc.totalHT + (invoice.total_ht ?? 0),
        totalVAT: acc.totalVAT + (invoice.total_tva ?? 0),
        totalTTC: acc.totalTTC + (invoice.total_ttc ?? 0),
        count: acc.count + 1,
      }),
      { totalHT: 0, totalVAT: 0, totalTTC: 0, count: 0 }
    );
  }, [invoices]);

  return {
    quotes,
    invoices,
    loading,
    error,
    fetchQuotes,
    fetchInvoices,
    createQuote,
    updateQuote,
    getQuoteTotals,
    getInvoiceTotals,
  };
}
