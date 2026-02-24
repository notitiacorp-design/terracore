'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn, formatDate, formatCurrency } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  FileText,
  Plus,
  Search,
  Sparkles,
  Receipt,
  Truck,
  Loader2,
  FilePlus,
} from 'lucide-react';
import type { QuoteRow, InvoiceRow, DepositInvoiceRow, DeliveryNoteRow } from '@/types/database';

type ClientSnippet = {
  id: string;
  company_name: string | null;
  first_name: string | null;
  last_name: string | null;
};

type QuoteWithClient = QuoteRow & { client: ClientSnippet | null };
type InvoiceWithClient = InvoiceRow & { client: ClientSnippet | null };
type DepositWithInvoice = DepositInvoiceRow & {
  invoice: (InvoiceRow & { client: ClientSnippet | null }) | null;
};
type DeliveryWithClient = DeliveryNoteRow & { client: ClientSnippet | null };

const QUOTE_STATUS_COLORS: Record<string, string> = {
  brouillon: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  envoye: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  accepte: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  refuse: 'bg-red-500/20 text-red-300 border-red-500/30',
  expire: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
};

const QUOTE_STATUS_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  envoye: 'Envoyé',
  accepte: 'Accepté',
  refuse: 'Refusé',
  expire: 'Expiré',
};

const INVOICE_STATUS_COLORS: Record<string, string> = {
  brouillon: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  envoyee: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  payee: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  partiellement_payee: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  en_retard: 'bg-red-500/20 text-red-300 border-red-500/30',
  annulee: 'bg-gray-600/20 text-gray-400 border-gray-600/30',
};

const INVOICE_STATUS_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  envoyee: 'Envoyée',
  payee: 'Payée',
  partiellement_payee: 'Part. payée',
  en_retard: 'En retard',
  annulee: 'Annulée',
};

const DELIVERY_STATUS_COLORS: Record<string, string> = {
  brouillon: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  emis: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  signe: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  annule: 'bg-red-500/20 text-red-300 border-red-500/30',
};

const DELIVERY_STATUS_LABELS: Record<string, string> = {
  brouillon: 'Brouillon',
  emis: 'Émis',
  signe: 'Signé',
  annule: 'Annulé',
};

function getClientName(client: ClientSnippet | null): string {
  if (!client) return '—';
  if (client.company_name) return client.company_name;
  const parts = [client.first_name, client.last_name].filter(Boolean);
  return parts.length > 0 ? parts.join(' ') : '—';
}

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-white/5">
        <Icon className="h-8 w-8 text-gray-500" />
      </div>
      <p className="text-sm text-gray-400">{message}</p>
    </div>
  );
}

export default function DocumentsPage() {
  const router = useRouter();
  const { user, companyId } = useAuth();

  const [activeTab, setActiveTab] = useState('devis');
  const [search, setSearch] = useState('');

  const [quotes, setQuotes] = useState<QuoteWithClient[]>([]);
  const [invoices, setInvoices] = useState<InvoiceWithClient[]>([]);
  const [deposits, setDeposits] = useState<DepositWithInvoice[]>([]);
  const [deliveries, setDeliveries] = useState<DeliveryWithClient[]>([]);

  const [loadingQuotes, setLoadingQuotes] = useState(false);
  const [loadingInvoices, setLoadingInvoices] = useState(false);
  const [loadingDeposits, setLoadingDeposits] = useState(false);
  const [loadingDeliveries, setLoadingDeliveries] = useState(false);

  const supabase = createClient();

  const fetchQuotes = useCallback(async () => {
    if (!companyId) return;
    setLoadingQuotes(true);
    try {
      let query = supabase
        .from('quote')
        .select('*, client(id, company_name, first_name, last_name)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (search.trim()) {
        query = query.ilike('reference', `%${search.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setQuotes((data as unknown as QuoteWithClient[]) ?? []);
    } catch (err) {
      console.error('Erreur chargement devis:', err);
    } finally {
      setLoadingQuotes(false);
    }
  }, [companyId, search]);

  const fetchInvoices = useCallback(async () => {
    if (!companyId) return;
    setLoadingInvoices(true);
    try {
      let query = supabase
        .from('invoice')
        .select('*, client(id, company_name, first_name, last_name)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (search.trim()) {
        query = query.ilike('reference', `%${search.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setInvoices((data as unknown as InvoiceWithClient[]) ?? []);
    } catch (err) {
      console.error('Erreur chargement factures:', err);
    } finally {
      setLoadingInvoices(false);
    }
  }, [companyId, search]);

  const fetchDeposits = useCallback(async () => {
    if (!companyId) return;
    setLoadingDeposits(true);
    try {
      let query = supabase
        .from('deposit_invoice')
        .select('*, invoice!inner(*, client(id, company_name, first_name, last_name))')
        .eq('invoice.company_id', companyId)
        .order('created_at', { ascending: false });

      if (search.trim()) {
        query = query.ilike('reference', `%${search.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDeposits((data as unknown as DepositWithInvoice[]) ?? []);
    } catch (err) {
      console.error('Erreur chargement acomptes:', err);
    } finally {
      setLoadingDeposits(false);
    }
  }, [companyId, search]);

  const fetchDeliveries = useCallback(async () => {
    if (!companyId) return;
    setLoadingDeliveries(true);
    try {
      let query = supabase
        .from('delivery_note')
        .select('*, client(id, company_name, first_name, last_name)')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (search.trim()) {
        query = query.ilike('reference', `%${search.trim()}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      setDeliveries((data as unknown as DeliveryWithClient[]) ?? []);
    } catch (err) {
      console.error('Erreur chargement bons de livraison:', err);
    } finally {
      setLoadingDeliveries(false);
    }
  }, [companyId, search]);

  useEffect(() => {
    if (activeTab === 'devis') fetchQuotes();
    else if (activeTab === 'factures') fetchInvoices();
    else if (activeTab === 'acomptes') fetchDeposits();
    else if (activeTab === 'bons-livraison') fetchDeliveries();
  }, [activeTab, companyId, search]);

  const handleRowClick = (tab: string, id: string) => {
    const routes: Record<string, string> = {
      devis: `/dashboard/documents/devis/${id}`,
      factures: `/dashboard/documents/factures/${id}`,
      acomptes: `/dashboard/documents/acomptes/${id}`,
      'bons-livraison': `/dashboard/documents/bons-livraison/${id}`,
    };
    const route = routes[tab];
    if (route) router.push(route);
  };

  const tabConfig = [
    { value: 'devis', label: 'Devis', icon: FileText },
    { value: 'factures', label: 'Factures', icon: Receipt },
    { value: 'acomptes', label: 'Acomptes', icon: FilePlus },
    { value: 'bons-livraison', label: 'Bons de livraison', icon: Truck },
  ];

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#1a1a2e' }}>
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Documents</h1>
            <p className="mt-1 text-sm text-gray-400">
              Gérez vos devis, factures, acomptes et bons de livraison
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => router.push('/dashboard/documents/devis-ia')}
              className="min-h-[48px] border border-emerald-500/40 bg-emerald-500/10 px-4 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.25)] transition-all hover:bg-emerald-500/20 hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]"
              variant="ghost"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Devis IA
            </Button>
            <Button
              onClick={() => router.push('/dashboard/documents/devis/nouveau')}
              className="min-h-[48px] bg-emerald-600 px-4 text-white hover:bg-emerald-500"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nouveau devis
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6 relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            type="text"
            placeholder="Rechercher par référence…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="min-h-[48px] w-full rounded-lg border border-white/10 bg-white/5 pl-10 text-white placeholder:text-gray-500 focus:border-emerald-500/50 focus:ring-emerald-500/20"
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6 flex h-auto flex-wrap gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
            {tabConfig.map(({ value, label, icon: Icon }) => (
              <TabsTrigger
                key={value}
                value={value}
                className={cn(
                  'flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all',
                  'text-gray-400 data-[state=active]:bg-white/10 data-[state=active]:text-white'
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{label.split(' ')[0]}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {/* DEVIS TAB */}
          <TabsContent value="devis">
            <Card className="border border-white/10 bg-white/5">
              <CardContent className="p-0">
                {loadingQuotes ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                  </div>
                ) : quotes.length === 0 ? (
                  <EmptyState icon={FileText} message="Aucun devis trouvé" />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10 hover:bg-transparent">
                          <TableHead className="text-gray-400">Référence</TableHead>
                          <TableHead className="text-gray-400">Client</TableHead>
                          <TableHead className="hidden text-gray-400 sm:table-cell">Date</TableHead>
                          <TableHead className="text-right text-gray-400">Montant TTC</TableHead>
                          <TableHead className="text-gray-400">Statut</TableHead>
                          <TableHead className="text-gray-400">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {quotes.map((quote) => (
                          <TableRow
                            key={quote.id}
                            className="cursor-pointer border-white/10 transition-colors hover:bg-white/5"
                            onClick={() => handleRowClick('devis', quote.id)}
                          >
                            <TableCell className="font-mono text-sm font-medium text-white">
                              {quote.reference ?? '—'}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {getClientName(quote.client)}
                            </TableCell>
                            <TableCell className="hidden text-gray-400 sm:table-cell">
                              {quote.date_emission ? formatDate(quote.date_emission) : '—'}
                            </TableCell>
                            <TableCell className="text-right font-medium text-white">
                              {quote.total_ttc != null ? formatCurrency(quote.total_ttc) : '—'}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'border text-xs',
                                  QUOTE_STATUS_COLORS[quote.status] ?? 'bg-gray-500/20 text-gray-300'
                                )}
                              >
                                {QUOTE_STATUS_LABELS[quote.status] ?? quote.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="min-h-[40px] text-gray-400 hover:text-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRowClick('devis', quote.id);
                                }}
                              >
                                Voir
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* FACTURES TAB */}
          <TabsContent value="factures">
            <Card className="border border-white/10 bg-white/5">
              <CardContent className="p-0">
                {loadingInvoices ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                  </div>
                ) : invoices.length === 0 ? (
                  <EmptyState icon={Receipt} message="Aucune facture trouvée" />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10 hover:bg-transparent">
                          <TableHead className="text-gray-400">Référence</TableHead>
                          <TableHead className="text-gray-400">Client</TableHead>
                          <TableHead className="hidden text-gray-400 sm:table-cell">Date</TableHead>
                          <TableHead className="hidden text-gray-400 md:table-cell">Échéance</TableHead>
                          <TableHead className="text-right text-gray-400">Montant TTC</TableHead>
                          <TableHead className="text-gray-400">Statut</TableHead>
                          <TableHead className="text-gray-400">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoices.map((invoice) => (
                          <TableRow
                            key={invoice.id}
                            className="cursor-pointer border-white/10 transition-colors hover:bg-white/5"
                            onClick={() => handleRowClick('factures', invoice.id)}
                          >
                            <TableCell className="font-mono text-sm font-medium text-white">
                              {invoice.reference ?? '—'}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {getClientName(invoice.client)}
                            </TableCell>
                            <TableCell className="hidden text-gray-400 sm:table-cell">
                              {invoice.date_emission ? formatDate(invoice.date_emission) : '—'}
                            </TableCell>
                            <TableCell className="hidden text-gray-400 md:table-cell">
                              {invoice.date_echeance ? formatDate(invoice.date_echeance) : '—'}
                            </TableCell>
                            <TableCell className="text-right font-medium text-white">
                              {invoice.total_ttc != null ? formatCurrency(invoice.total_ttc) : '—'}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'border text-xs',
                                  INVOICE_STATUS_COLORS[invoice.status] ?? 'bg-gray-500/20 text-gray-300'
                                )}
                              >
                                {INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="min-h-[40px] text-gray-400 hover:text-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRowClick('factures', invoice.id);
                                }}
                              >
                                Voir
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ACOMPTES TAB */}
          <TabsContent value="acomptes">
            <Card className="border border-white/10 bg-white/5">
              <CardContent className="p-0">
                {loadingDeposits ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                  </div>
                ) : deposits.length === 0 ? (
                  <EmptyState icon={FilePlus} message="Aucun acompte trouvé" />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10 hover:bg-transparent">
                          <TableHead className="text-gray-400">Référence</TableHead>
                          <TableHead className="text-gray-400">Client</TableHead>
                          <TableHead className="hidden text-gray-400 sm:table-cell">Date</TableHead>
                          <TableHead className="text-right text-gray-400">Montant TTC</TableHead>
                          <TableHead className="text-gray-400">Statut</TableHead>
                          <TableHead className="text-gray-400">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deposits.map((deposit) => (
                          <TableRow
                            key={deposit.id}
                            className="cursor-pointer border-white/10 transition-colors hover:bg-white/5"
                            onClick={() => handleRowClick('acomptes', deposit.id)}
                          >
                            <TableCell className="font-mono text-sm font-medium text-white">
                              {deposit.invoice?.reference ?? '—'}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {getClientName(deposit.invoice?.client)}
                            </TableCell>
                            <TableCell className="hidden text-gray-400 sm:table-cell">
                              {deposit.invoice?.date_emission ? formatDate(deposit.invoice?.date_emission) : '—'}
                            </TableCell>
                            <TableCell className="text-right font-medium text-white">
                              {deposit.amount_ttc != null ? formatCurrency(deposit.amount_ttc) : '—'}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'border text-xs',
                                  INVOICE_STATUS_COLORS[deposit.invoice?.status] ?? 'bg-gray-500/20 text-gray-300'
                                )}
                              >
                                {INVOICE_STATUS_LABELS[deposit.invoice?.status] ?? deposit.invoice?.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="min-h-[40px] text-gray-400 hover:text-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRowClick('acomptes', deposit.id);
                                }}
                              >
                                Voir
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* BONS DE LIVRAISON TAB */}
          <TabsContent value="bons-livraison">
            <Card className="border border-white/10 bg-white/5">
              <CardContent className="p-0">
                {loadingDeliveries ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
                  </div>
                ) : deliveries.length === 0 ? (
                  <EmptyState icon={Truck} message="Aucun bon de livraison trouvé" />
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10 hover:bg-transparent">
                          <TableHead className="text-gray-400">Référence</TableHead>
                          <TableHead className="text-gray-400">Client</TableHead>
                          <TableHead className="hidden text-gray-400 sm:table-cell">Date</TableHead>
                          <TableHead className="hidden text-gray-400 md:table-cell">Livré par</TableHead>
                          <TableHead className="text-gray-400">Statut</TableHead>
                          <TableHead className="text-gray-400">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deliveries.map((delivery) => (
                          <TableRow
                            key={delivery.id}
                            className="cursor-pointer border-white/10 transition-colors hover:bg-white/5"
                            onClick={() => handleRowClick('bons-livraison', delivery.id)}
                          >
                            <TableCell className="font-mono text-sm font-medium text-white">
                              {delivery.reference ?? '—'}
                            </TableCell>
                            <TableCell className="text-gray-300">
                              {getClientName(delivery.client)}
                            </TableCell>
                            <TableCell className="hidden text-gray-400 sm:table-cell">
                              {delivery.date_emission ? formatDate(delivery.date_emission) : '—'}
                            </TableCell>
                            <TableCell className="hidden text-gray-400 md:table-cell">
                              {delivery.delivered_by ?? '—'}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={cn(
                                  'border text-xs',
                                  DELIVERY_STATUS_COLORS[delivery.status ?? ''] ?? 'bg-gray-500/20 text-gray-300'
                                )}
                              >
                                {DELIVERY_STATUS_LABELS[delivery.status ?? ''] ?? delivery.status ?? '—'}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="min-h-[40px] text-gray-400 hover:text-white"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRowClick('bons-livraison', delivery.id);
                                }}
                              >
                                Voir
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
