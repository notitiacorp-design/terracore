'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MonthlyRevenue {
  month: number; // 1-12
  label: string;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  invoice_count: number;
}

export interface QuoteConversionRate {
  total: number;
  accepted: number;
  rate: number; // 0-100
}

export interface AverageDSO {
  dso_days: number;
  sample_count: number;
}

export interface TopClient {
  client_id: string;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
  total_ttc: number;
  invoice_count: number;
}

export interface MarginByMonth {
  month: number; // 1-12
  label: string;
  avg_margin_percent: number;
  quote_count: number;
}

export interface OverdueInvoice {
  id: string;
  reference: string;
  client_id: string;
  date_emission: string;
  date_echeance: string;
  total_ttc: number;
  remaining_ttc: number;
  days_overdue: number;
}

export interface ActiveReminders {
  count: number;
}

export interface PendingProposals {
  count: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MONTH_LABELS_FR = [
  'Janv.',
  'Févr.',
  'Mars',
  'Avr.',
  'Mai',
  'Juin',
  'Juil.',
  'Août',
  'Sept.',
  'Oct.',
  'Nov.',
  'Déc.',
];

function monthLabel(month: number): string {
  return MONTH_LABELS_FR[(month - 1) % 12] ?? String(month);
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / msPerDay);
}

// ---------------------------------------------------------------------------
// Individual fetch functions
// ---------------------------------------------------------------------------

export async function fetchMonthlyRevenue(
  companyId: string,
  year: number,
): Promise<MonthlyRevenue[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('invoice')
    .select('date_emission, total_ht, total_tva, total_ttc')
    .eq('company_id', companyId)
    .in('status', ['payee', 'partiellement_payee'])
    .gte('date_emission', `${year}-01-01`)
    .lte('date_emission', `${year}-12-31`);

  if (error) throw new Error(`fetchMonthlyRevenue: ${error.message}`);

  // Aggregate by month
  const map = new Map<number, MonthlyRevenue>();
  for (let m = 1; m <= 12; m++) {
    map.set(m, {
      month: m,
      label: monthLabel(m),
      total_ht: 0,
      total_tva: 0,
      total_ttc: 0,
      invoice_count: 0,
    });
  }

  for (const row of data ?? []) {
    const m = new Date(row.date_emission).getMonth() + 1;
    const entry = map.get(m);
    if (entry) {
      entry.total_ht += row.total_ht ?? 0;
      entry.total_tva += row.total_tva ?? 0;
      entry.total_ttc += row.total_ttc ?? 0;
      entry.invoice_count += 1;
    }
  }

  return Array.from(map.values());
}

export async function fetchQuoteConversionRate(
  companyId: string,
): Promise<QuoteConversionRate> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('quote')
    .select('status')
    .eq('company_id', companyId);

  if (error) throw new Error(`fetchQuoteConversionRate: ${error.message}`);

  const total = (data ?? []).length;
  const accepted = (data ?? []).filter((q) => q.status === 'accepte').length;
  const rate = total > 0 ? Math.round((accepted / total) * 100 * 10) / 10 : 0;

  return { total, accepted, rate };
}

export async function fetchAverageDSO(companyId: string): Promise<AverageDSO> {
  const supabase = createClient();

  // Fetch paid invoices with their payments
  const { data: invoices, error: invError } = await supabase
    .from('invoice')
    .select('id, date_emission')
    .eq('company_id', companyId)
    .eq('status', 'payee');

  if (invError) throw new Error(`fetchAverageDSO (invoices): ${invError.message}`);

  if (!invoices || invoices.length === 0) {
    return { dso_days: 0, sample_count: 0 };
  }

  const invoiceIds = invoices.map((i) => i.id);

  const { data: payments, error: payError } = await supabase
    .from('payment')
    .select('invoice_id, payment_date')
    .in('invoice_id', invoiceIds)
    .order('payment_date', { ascending: false });

  if (payError) throw new Error(`fetchAverageDSO (payments): ${payError.message}`);

  // For each invoice, find the latest payment date
  const paymentMap = new Map<string, string>();
  for (const p of payments ?? []) {
    if (!paymentMap.has(p.invoice_id)) {
      paymentMap.set(p.invoice_id, p.payment_date);
    }
  }

  const dsoDays: number[] = [];
  for (const inv of invoices) {
    const payDate = paymentMap.get(inv.id);
    if (payDate && inv.date_emission) {
      const days = daysBetween(inv.date_emission, payDate);
      if (days >= 0) dsoDays.push(days);
    }
  }

  if (dsoDays.length === 0) return { dso_days: 0, sample_count: 0 };

  const avg =
    Math.round((dsoDays.reduce((a, b) => a + b, 0) / dsoDays.length) * 10) /
    10;

  return { dso_days: avg, sample_count: dsoDays.length };
}

export async function fetchTopClients(
  companyId: string,
  limit = 10,
): Promise<TopClient[]> {
  const supabase = createClient();

  const { data: invoices, error: invError } = await supabase
    .from('invoice')
    .select('client_id, total_ttc')
    .eq('company_id', companyId)
    .in('status', ['payee', 'partiellement_payee', 'envoyee', 'en_retard']);

  if (invError) throw new Error(`fetchTopClients (invoices): ${invError.message}`);

  // Aggregate by client
  const map = new Map<
    string,
    { total_ttc: number; invoice_count: number }
  >();
  for (const row of invoices ?? []) {
    const existing = map.get(row.client_id);
    if (existing) {
      existing.total_ttc += row.total_ttc ?? 0;
      existing.invoice_count += 1;
    } else {
      map.set(row.client_id, {
        total_ttc: row.total_ttc ?? 0,
        invoice_count: 1,
      });
    }
  }

  // Sort and slice
  const sorted = Array.from(map.entries())
    .sort((a, b) => b[1].total_ttc - a[1].total_ttc)
    .slice(0, limit);

  if (sorted.length === 0) return [];

  const clientIds = sorted.map(([id]) => id);

  const { data: clients, error: clientError } = await supabase
    .from('client')
    .select('id, company_name, first_name, last_name')
    .in('id', clientIds);

  if (clientError)
    throw new Error(`fetchTopClients (clients): ${clientError.message}`);

  const clientMap = new Map(
    (clients ?? []).map((c) => [
      c.id,
      { company_name: c.company_name, first_name: c.first_name, last_name: c.last_name },
    ]),
  );

  return sorted.map(([client_id, agg]) => {
    const info = clientMap.get(client_id);
    return {
      client_id,
      company_name: info?.company_name ?? null,
      first_name: info?.first_name ?? null,
      last_name: info?.last_name ?? null,
      total_ttc: agg.total_ttc,
      invoice_count: agg.invoice_count,
    };
  });
}

export async function fetchMarginByMonth(
  companyId: string,
  year: number,
): Promise<MarginByMonth[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('quote')
    .select('date_emission, margin_percent')
    .eq('company_id', companyId)
    .in('status', ['accepte', 'envoye', 'brouillon'])
    .gte('date_emission', `${year}-01-01`)
    .lte('date_emission', `${year}-12-31`);

  if (error) throw new Error(`fetchMarginByMonth: ${error.message}`);

  const map = new Map<number, { sum: number; count: number }>();
  for (let m = 1; m <= 12; m++) {
    map.set(m, { sum: 0, count: 0 });
  }

  for (const row of data ?? []) {
    if (row.margin_percent == null) continue;
    const m = new Date(row.date_emission).getMonth() + 1;
    const entry = map.get(m);
    if (entry) {
      entry.sum += row.margin_percent;
      entry.count += 1;
    }
  }

  return Array.from(map.entries()).map(([month, { sum, count }]) => ({
    month,
    label: monthLabel(month),
    avg_margin_percent:
      count > 0 ? Math.round((sum / count) * 10) / 10 : 0,
    quote_count: count,
  }));
}

export async function fetchOverdueInvoices(
  companyId: string,
): Promise<OverdueInvoice[]> {
  const supabase = createClient();

  const { data, error } = await supabase
    .from('invoice')
    .select(
      'id, reference, client_id, date_emission, date_echeance, total_ttc, remaining_ttc',
    )
    .eq('company_id', companyId)
    .eq('status', 'en_retard')
    .order('date_echeance', { ascending: true });

  if (error) throw new Error(`fetchOverdueInvoices: ${error.message}`);

  const today = new Date().toISOString().split('T')[0]!;

  return (data ?? []).map((row) => ({
    id: row.id,
    reference: row.reference,
    client_id: row.client_id,
    date_emission: row.date_emission,
    date_echeance: row.date_echeance,
    total_ttc: row.total_ttc ?? 0,
    remaining_ttc: row.remaining_ttc ?? 0,
    days_overdue: row.date_echeance
      ? Math.max(0, daysBetween(row.date_echeance, today))
      : 0,
  }));
}

export async function fetchActiveReminders(
  companyId: string,
): Promise<ActiveReminders> {
  const supabase = createClient();

  const { count, error } = await supabase
    .from('reminder_workflow')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('is_active', true);

  if (error) throw new Error(`fetchActiveReminders: ${error.message}`);

  return { count: count ?? 0 };
}

export async function fetchPendingProposals(
  companyId: string,
): Promise<PendingProposals> {
  const supabase = createClient();

  const { count, error } = await supabase
    .from('ai_proposal')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'pending');

  if (error) throw new Error(`fetchPendingProposals: ${error.message}`);

  return { count: count ?? 0 };
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface StatsState {
  monthlyRevenue: MonthlyRevenue[];
  quoteConversion: QuoteConversionRate | null;
  averageDSO: AverageDSO | null;
  topClients: TopClient[];
  marginByMonth: MarginByMonth[];
  overdueInvoices: OverdueInvoice[];
  activeReminders: ActiveReminders | null;
  pendingProposals: PendingProposals | null;
  loading: boolean;
  error: string | null;
}

export interface UseStatsReturn extends StatsState {
  loadAll: (companyId: string, year?: number, topClientsLimit?: number) => Promise<void>;
  loadMonthlyRevenue: (companyId: string, year: number) => Promise<void>;
  loadQuoteConversion: (companyId: string) => Promise<void>;
  loadAverageDSO: (companyId: string) => Promise<void>;
  loadTopClients: (companyId: string, limit?: number) => Promise<void>;
  loadMarginByMonth: (companyId: string, year: number) => Promise<void>;
  loadOverdueInvoices: (companyId: string) => Promise<void>;
  loadActiveReminders: (companyId: string) => Promise<void>;
  loadPendingProposals: (companyId: string) => Promise<void>;
}

export function useStats(): UseStatsReturn {
  const [state, setState] = useState<StatsState>({
    monthlyRevenue: [],
    quoteConversion: null,
    averageDSO: null,
    topClients: [],
    marginByMonth: [],
    overdueInvoices: [],
    activeReminders: null,
    pendingProposals: null,
    loading: false,
    error: null,
  });

  const setLoading = (loading: boolean) =>
    setState((prev) => ({ ...prev, loading }));

  const setError = (error: string | null) =>
    setState((prev) => ({ ...prev, error, loading: false }));

  // ------------------------------------------------------------------
  // Individual loaders
  // ------------------------------------------------------------------

  const loadMonthlyRevenue = useCallback(
    async (companyId: string, year: number) => {
      try {
        setLoading(true);
        const data = await fetchMonthlyRevenue(companyId, year);
        setState((prev) => ({
          ...prev,
          monthlyRevenue: data,
          loading: false,
          error: null,
        }));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Erreur lors du chargement du CA mensuel',
        );
      }
    },
    [],
  );

  const loadQuoteConversion = useCallback(async (companyId: string) => {
    try {
      setLoading(true);
      const data = await fetchQuoteConversionRate(companyId);
      setState((prev) => ({
        ...prev,
        quoteConversion: data,
        loading: false,
        error: null,
      }));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erreur lors du chargement du taux de conversion',
      );
    }
  }, []);

  const loadAverageDSO = useCallback(async (companyId: string) => {
    try {
      setLoading(true);
      const data = await fetchAverageDSO(companyId);
      setState((prev) => ({
        ...prev,
        averageDSO: data,
        loading: false,
        error: null,
      }));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erreur lors du calcul du DSO moyen',
      );
    }
  }, []);

  const loadTopClients = useCallback(
    async (companyId: string, limit = 10) => {
      try {
        setLoading(true);
        const data = await fetchTopClients(companyId, limit);
        setState((prev) => ({
          ...prev,
          topClients: data,
          loading: false,
          error: null,
        }));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Erreur lors du chargement des meilleurs clients',
        );
      }
    },
    [],
  );

  const loadMarginByMonth = useCallback(
    async (companyId: string, year: number) => {
      try {
        setLoading(true);
        const data = await fetchMarginByMonth(companyId, year);
        setState((prev) => ({
          ...prev,
          marginByMonth: data,
          loading: false,
          error: null,
        }));
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'Erreur lors du chargement des marges mensuelles',
        );
      }
    },
    [],
  );

  const loadOverdueInvoices = useCallback(async (companyId: string) => {
    try {
      setLoading(true);
      const data = await fetchOverdueInvoices(companyId);
      setState((prev) => ({
        ...prev,
        overdueInvoices: data,
        loading: false,
        error: null,
      }));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erreur lors du chargement des factures en retard',
      );
    }
  }, []);

  const loadActiveReminders = useCallback(async (companyId: string) => {
    try {
      setLoading(true);
      const data = await fetchActiveReminders(companyId);
      setState((prev) => ({
        ...prev,
        activeReminders: data,
        loading: false,
        error: null,
      }));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erreur lors du chargement des relances actives',
      );
    }
  }, []);

  const loadPendingProposals = useCallback(async (companyId: string) => {
    try {
      setLoading(true);
      const data = await fetchPendingProposals(companyId);
      setState((prev) => ({
        ...prev,
        pendingProposals: data,
        loading: false,
        error: null,
      }));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Erreur lors du chargement des propositions IA en attente',
      );
    }
  }, []);

  // ------------------------------------------------------------------
  // Load all at once
  // ------------------------------------------------------------------

  const loadAll = useCallback(
    async (
      companyId: string,
      year = new Date().getFullYear(),
      topClientsLimit = 10,
    ) => {
      setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const [
          monthlyRevenue,
          quoteConversion,
          averageDSO,
          topClients,
          marginByMonth,
          overdueInvoices,
          activeReminders,
          pendingProposals,
        ] = await Promise.all([
          fetchMonthlyRevenue(companyId, year),
          fetchQuoteConversionRate(companyId),
          fetchAverageDSO(companyId),
          fetchTopClients(companyId, topClientsLimit),
          fetchMarginByMonth(companyId, year),
          fetchOverdueInvoices(companyId),
          fetchActiveReminders(companyId),
          fetchPendingProposals(companyId),
        ]);

        setState({
          monthlyRevenue,
          quoteConversion,
          averageDSO,
          topClients,
          marginByMonth,
          overdueInvoices,
          activeReminders,
          pendingProposals,
          loading: false,
          error: null,
        });
      } catch (err) {
        setState((prev) => ({
          ...prev,
          loading: false,
          error:
            err instanceof Error
              ? err.message
              : 'Erreur lors du chargement des statistiques',
        }));
      }
    },
    [],
  );

  return {
    ...state,
    loadAll,
    loadMonthlyRevenue,
    loadQuoteConversion,
    loadAverageDSO,
    loadTopClients,
    loadMarginByMonth,
    loadOverdueInvoices,
    loadActiveReminders,
    loadPendingProposals,
  };
}
