'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn, formatDate, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/components/ui/use-toast';
import {
  Euro,
  Clock,
  Link2,
  Plus,
  Copy,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Settings,
  Filter,
  CreditCard,
  Banknote,
  Building2,
  AlertCircle,
} from 'lucide-react';
import type { PaymentRow, PaymentLinkRow, InvoiceRow, ClientRow, CompanySettingsRow } from '@/types/database';
import type { PaymentMethod } from '@/types/database';

type PaymentWithJoins = PaymentRow & {
  invoice: (Pick<InvoiceRow, 'reference' | 'total_ttc' | 'client_id'> & {
    client: Pick<ClientRow, 'company_name' | 'first_name' | 'last_name'> | null;
  }) | null;
};

type PaymentLinkWithJoins = PaymentLinkRow & {
  invoice: Pick<InvoiceRow, 'reference'> | null;
};

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  virement: 'Virement',
  cheque: 'Chèque',
  cb: 'Carte bancaire',
  especes: 'Espèces',
  prelevement: 'Prélèvement',
};

const PAYMENT_METHOD_ICONS: Record<PaymentMethod, React.ReactNode> = {
  virement: <Building2 className="h-3.5 w-3.5" />,
  cheque: <Banknote className="h-3.5 w-3.5" />,
  cb: <CreditCard className="h-3.5 w-3.5" />,
  especes: <Euro className="h-3.5 w-3.5" />,
  prelevement: <RefreshCw className="h-3.5 w-3.5" />,
};

function getClientName(client: Pick<ClientRow, 'company_name' | 'first_name' | 'last_name'> | null): string {
  if (!client) return '—';
  if (client.company_name) return client.company_name;
  return `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() || '—';
}

function KpiCard({
  title,
  value,
  icon,
  loading,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  loading?: boolean;
  color?: string;
}) {
  return (
    <Card className="bg-[#1a1a2e] border-white/10 text-white">
      <CardContent className="p-4 flex items-center gap-4">
        <div className={cn('p-3 rounded-lg', color ?? 'bg-emerald-500/20 text-emerald-400')}>{icon}</div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-white/60 truncate">{title}</p>
          {loading ? (
            <Skeleton className="h-6 w-24 mt-1 bg-white/10" />
          ) : (
            <p className="text-xl font-bold truncate">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function PaiementsPage() {
  const supabase = createClient();
  const { toast } = useToast();

  const [loadingPayments, setLoadingPayments] = useState(true);
  const [loadingLinks, setLoadingLinks] = useState(true);
  const [loadingKpis, setLoadingKpis] = useState(true);
  const [loadingSettings, setLoadingSettings] = useState(true);

  const [payments, setPayments] = useState<PaymentWithJoins[]>([]);
  const [paymentLinks, setPaymentLinks] = useState<PaymentLinkWithJoins[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettingsRow | null>(null);

  const [kpiEncaisse, setKpiEncaisse] = useState(0);
  const [kpiEnAttente, setKpiEnAttente] = useState(0);
  const [kpiLiensActifs, setKpiLiensActifs] = useState(0);

  // Filters
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterMethod, setFilterMethod] = useState<string>('all');

  // Register payment dialog
  const [showRegisterDialog, setShowRegisterDialog] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [invoices, setInvoices] = useState<Pick<InvoiceRow, 'id' | 'reference' | 'remaining_ttc'>[]>([]);
  const [registerForm, setRegisterForm] = useState({
    invoice_id: '',
    amount: '',
    payment_method: '' as PaymentMethod | '',
    payment_date: new Date().toISOString().split('T')[0],
    reference: '',
    notes: '',
  });

  // Create link dialog
  const [showCreateLinkDialog, setShowCreateLinkDialog] = useState(false);
  const [createLinkLoading, setCreateLinkLoading] = useState(false);
  const [createLinkForm, setCreateLinkForm] = useState({
    invoice_id: '',
    amount: '',
    expires_at: '',
  });

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchCompanyId = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const { data } = await supabase
      .from('user_profile')
      .select('company_id')
      .eq('auth_user_id', user.id)
      .single();
    return data?.company_id ?? null;
  }, [supabase]);

  const fetchPayments = useCallback(async (companyId: string) => {
    setLoadingPayments(true);
    let query = supabase
      .from('payment')
      .select(
        'id, company_id, invoice_id, amount, payment_method, payment_date, reference, notes, stripe_payment_id, created_at, invoice:invoice_id(reference, total_ttc, client_id, client:client_id(company_name, first_name, last_name))'
      )
      .eq('company_id', companyId)
      .order('payment_date', { ascending: false });

    if (filterDateFrom) query = query.gte('payment_date', filterDateFrom);
    if (filterDateTo) query = query.lte('payment_date', filterDateTo);
    if (filterMethod && filterMethod !== 'all') query = query.eq('payment_method', filterMethod as PaymentMethod);

    const { data, error } = await query;
    if (error) {
      toast({ title: 'Erreur', description: 'Impossible de charger les paiements', variant: 'destructive' });
    } else {
      setPayments((data as unknown as PaymentWithJoins[]) ?? []);
    }
    setLoadingPayments(false);
  }, [supabase, filterDateFrom, filterDateTo, filterMethod, toast]);

  const fetchPaymentLinks = useCallback(async (companyId: string) => {
    setLoadingLinks(true);
    const { data, error } = await supabase
      .from('payment_link')
      .select('id, company_id, invoice_id, quote_id, stripe_link_id, stripe_link_url, amount, currency, is_active, expires_at, created_at, invoice:invoice_id(reference)')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (error) {
      toast({ title: 'Erreur', description: 'Impossible de charger les liens de paiement', variant: 'destructive' });
    } else {
      setPaymentLinks((data as unknown as PaymentLinkWithJoins[]) ?? []);
    }
    setLoadingLinks(false);
  }, [supabase, toast]);

  const fetchKpis = useCallback(async (companyId: string) => {
    setLoadingKpis(true);
    const now = new Date();
    const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const lastOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const [{ data: encaisseData }, { data: invoicesData }, { data: linksData }] = await Promise.all([
      supabase
        .from('payment')
        .select('amount')
        .eq('company_id', companyId)
        .gte('payment_date', firstOfMonth)
        .lte('payment_date', lastOfMonth),
      supabase
        .from('invoice')
        .select('remaining_ttc')
        .eq('company_id', companyId)
        .in('status', ['envoyee', 'partiellement_payee', 'en_retard']),
      supabase
        .from('payment_link')
        .select('id')
        .eq('company_id', companyId)
        .eq('is_active', true),
    ]);

    const total = (encaisseData ?? []).reduce((sum: number, p: { amount: number }) => sum + (p.amount ?? 0), 0);
    const attente = (invoicesData ?? []).reduce((sum: number, inv: { remaining_ttc: number | null }) => sum + (inv.remaining_ttc ?? 0), 0);
    setKpiEncaisse(total);
    setKpiEnAttente(attente);
    setKpiLiensActifs((linksData ?? []).length);
    setLoadingKpis(false);
  }, [supabase]);

  const fetchSettings = useCallback(async (companyId: string) => {
    setLoadingSettings(true);
    const { data } = await supabase
      .from('company_settings')
      .select('*')
      .eq('company_id', companyId)
      .single();
    setCompanySettings(data as CompanySettingsRow | null);
    setLoadingSettings(false);
  }, [supabase]);

  const fetchInvoicesForSelect = useCallback(async (companyId: string) => {
    const { data } = await supabase
      .from('invoice')
      .select('id, reference, remaining_ttc')
      .eq('company_id', companyId)
      .in('status', ['envoyee', 'partiellement_payee', 'en_retard'])
      .order('date_emission', { ascending: false });
    setInvoices((data ?? []) as Pick<InvoiceRow, 'id' | 'reference' | 'remaining_ttc'>[]);
  }, [supabase]);

  useEffect(() => {
    let companyId: string | null = null;
    (async () => {
      companyId = await fetchCompanyId();
      if (!companyId) return;
      await Promise.all([
        fetchPayments(companyId),
        fetchPaymentLinks(companyId),
        fetchKpis(companyId),
        fetchSettings(companyId),
        fetchInvoicesForSelect(companyId),
      ]);
    })();
  }, [fetchCompanyId, fetchPayments, fetchPaymentLinks, fetchKpis, fetchSettings, fetchInvoicesForSelect]);

  const handleRegisterPayment = async () => {
    if (!registerForm.invoice_id || !registerForm.amount || !registerForm.payment_method || !registerForm.payment_date) {
      toast({ title: 'Champs requis', description: 'Veuillez remplir tous les champs obligatoires.', variant: 'destructive' });
      return;
    }
    setRegisterLoading(true);
    const companyId = await fetchCompanyId();
    if (!companyId) { setRegisterLoading(false); return; }

    const amount = parseFloat(registerForm.amount);
    const { error } = await supabase.from('payment').insert({
      company_id: companyId,
      invoice_id: registerForm.invoice_id,
      amount,
      payment_method: registerForm.payment_method as PaymentMethod,
      payment_date: registerForm.payment_date,
      reference: registerForm.reference || null,
      notes: registerForm.notes || null,
    });

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Paiement enregistré', description: 'Le paiement a été enregistré avec succès.' });
      setShowRegisterDialog(false);
      setRegisterForm({
        invoice_id: '',
        amount: '',
        payment_method: '',
        payment_date: new Date().toISOString().split('T')[0],
        reference: '',
        notes: '',
      });
      await Promise.all([fetchPayments(companyId), fetchKpis(companyId), fetchInvoicesForSelect(companyId)]);
    }
    setRegisterLoading(false);
  };

  const handleCreateLink = async () => {
    if (!createLinkForm.invoice_id || !createLinkForm.amount) {
      toast({ title: 'Champs requis', description: 'Veuillez remplir tous les champs obligatoires.', variant: 'destructive' });
      return;
    }
    setCreateLinkLoading(true);
    const companyId = await fetchCompanyId();
    if (!companyId) { setCreateLinkLoading(false); return; }

    const { error } = await supabase.from('payment_link').insert({
      company_id: companyId,
      invoice_id: createLinkForm.invoice_id || null,
      quote_id: null,
      stripe_link_id: null,
      stripe_link_url: null,
      amount: parseFloat(createLinkForm.amount),
      currency: 'eur',
      is_active: true,
      expires_at: createLinkForm.expires_at ? new Date(createLinkForm.expires_at).toISOString() : null,
    });

    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Lien créé', description: 'Le lien de paiement a été créé.' });
      setShowCreateLinkDialog(false);
      setCreateLinkForm({ invoice_id: '', amount: '', expires_at: '' });
      await fetchPaymentLinks(companyId);
      await fetchKpis(companyId);
    }
    setCreateLinkLoading(false);
  };

  const handleCopyLink = async (url: string, id: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      toast({ title: 'Lien copié', description: 'Le lien a été copié dans le presse-papier.' });
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de copier le lien.', variant: 'destructive' });
    }
  };

  const handleToggleLinkActive = async (linkId: string, currentActive: boolean) => {
    const companyId = await fetchCompanyId();
    const { error } = await supabase
      .from('payment_link')
      .update({ is_active: !currentActive })
      .eq('id', linkId);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Mis à jour', description: `Lien ${!currentActive ? 'activé' : 'désactivé'}.` });
      if (companyId) await fetchPaymentLinks(companyId);
    }
  };

  const filteredPayments = payments;

  const stripeConnected = !!(companySettings?.stripe_public_key);

  return (
    <div className="min-h-screen bg-[#0f0f23] text-white">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Paiements</h1>
            <p className="text-sm text-white/60 mt-0.5">Suivi des encaissements et liens Stripe</p>
          </div>
          <Button
            onClick={() => setShowRegisterDialog(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-white min-h-[48px] gap-2"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Enregistrer un paiement</span>
            <span className="sm:hidden">Paiement</span>
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            title="Total encaissé (ce mois)"
            value={formatCurrency(kpiEncaisse)}
            icon={<Euro className="h-5 w-5" />}
            loading={loadingKpis}
            color="bg-emerald-500/20 text-emerald-400"
          />
          <KpiCard
            title="En attente de paiement"
            value={formatCurrency(kpiEnAttente)}
            icon={<Clock className="h-5 w-5" />}
            loading={loadingKpis}
            color="bg-amber-500/20 text-amber-400"
          />
          <KpiCard
            title="Liens de paiement actifs"
            value={kpiLiensActifs.toString()}
            icon={<Link2 className="h-5 w-5" />}
            loading={loadingKpis}
            color="bg-blue-500/20 text-blue-400"
          />
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="historique" className="space-y-4">
          <TabsList className="bg-white/5 border border-white/10 h-auto p-1 grid grid-cols-3 w-full">
            <TabsTrigger
              value="historique"
              className="min-h-[44px] data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-white/60 text-sm"
            >
              Historique
            </TabsTrigger>
            <TabsTrigger
              value="liens"
              className="min-h-[44px] data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-white/60 text-sm"
            >
              Liens de paiement
            </TabsTrigger>
            <TabsTrigger
              value="configuration"
              className="min-h-[44px] data-[state=active]:bg-emerald-500 data-[state=active]:text-white text-white/60 text-sm"
            >
              Config. Stripe
            </TabsTrigger>
          </TabsList>

          {/* Tab 1 - Historique */}
          <TabsContent value="historique" className="space-y-4">
            {/* Filters */}
            <Card className="bg-[#1a1a2e] border-white/10">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-end">
                  <div className="flex items-center gap-2 text-white/60">
                    <Filter className="h-4 w-4" />
                    <span className="text-sm font-medium text-white">Filtres</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 w-full">
                    <div className="space-y-1">
                      <Label className="text-xs text-white/60">Du</Label>
                      <Input
                        type="date"
                        value={filterDateFrom}
                        onChange={(e) => setFilterDateFrom(e.target.value)}
                        className="bg-white/5 border-white/10 text-white h-10 [color-scheme:dark]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-white/60">Au</Label>
                      <Input
                        type="date"
                        value={filterDateTo}
                        onChange={(e) => setFilterDateTo(e.target.value)}
                        className="bg-white/5 border-white/10 text-white h-10 [color-scheme:dark]"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs text-white/60">Méthode</Label>
                      <Select value={filterMethod} onValueChange={setFilterMethod}>
                        <SelectTrigger className="bg-white/5 border-white/10 text-white h-10">
                          <SelectValue placeholder="Toutes" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a2e] border-white/10 text-white">
                          <SelectItem value="all">Toutes</SelectItem>
                          {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    onClick={async () => {
                      const cid = await fetchCompanyId();
                      if (cid) fetchPayments(cid);
                    }}
                    className="border-white/10 text-white hover:bg-white/10 min-h-[40px] whitespace-nowrap"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Appliquer
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Payments Table */}
            <Card className="bg-[#1a1a2e] border-white/10">
              <CardContent className="p-0">
                {loadingPayments ? (
                  <div className="p-6 space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full bg-white/10" />
                    ))}
                  </div>
                ) : filteredPayments.length === 0 ? (
                  <div className="p-12 text-center text-white/40">
                    <Euro className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Aucun paiement enregistré</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10 hover:bg-transparent">
                          <TableHead className="text-white/60 font-medium">Date</TableHead>
                          <TableHead className="text-white/60 font-medium">Facture</TableHead>
                          <TableHead className="text-white/60 font-medium">Client</TableHead>
                          <TableHead className="text-white/60 font-medium text-right">Montant</TableHead>
                          <TableHead className="text-white/60 font-medium">Méthode</TableHead>
                          <TableHead className="text-white/60 font-medium hidden lg:table-cell">Réf. Stripe</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredPayments.map((payment) => (
                          <TableRow key={payment.id} className="border-white/10 hover:bg-white/5">
                            <TableCell className="text-white/80 text-sm">
                              {formatDate(payment.payment_date)}
                            </TableCell>
                            <TableCell>
                              <span className="font-mono text-sm text-emerald-400">
                                {payment.invoice?.reference ?? '—'}
                              </span>
                            </TableCell>
                            <TableCell className="text-white/80 text-sm">
                              {getClientName(payment.invoice?.client ?? null)}
                            </TableCell>
                            <TableCell className="text-right font-semibold text-white">
                              {formatCurrency(payment.amount)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className="border-white/20 text-white/70 gap-1 text-xs"
                              >
                                {PAYMENT_METHOD_ICONS[payment.payment_method as PaymentMethod]}
                                {PAYMENT_METHOD_LABELS[payment.payment_method as PaymentMethod] ?? payment.payment_method}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden lg:table-cell text-white/40 font-mono text-xs">
                              {payment.stripe_payment_id ?? payment.reference ?? '—'}
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

          {/* Tab 2 - Liens de paiement */}
          <TabsContent value="liens" className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/60">{paymentLinks.length} lien(s) au total</p>
              <Button
                onClick={() => setShowCreateLinkDialog(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white min-h-[48px] gap-2"
              >
                <Plus className="h-4 w-4" />
                Créer un lien
              </Button>
            </div>

            <Card className="bg-[#1a1a2e] border-white/10">
              <CardContent className="p-0">
                {loadingLinks ? (
                  <div className="p-6 space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full bg-white/10" />
                    ))}
                  </div>
                ) : paymentLinks.length === 0 ? (
                  <div className="p-12 text-center text-white/40">
                    <Link2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">Aucun lien de paiement créé</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-white/10 hover:bg-transparent">
                          <TableHead className="text-white/60 font-medium">Facture</TableHead>
                          <TableHead className="text-white/60 font-medium text-right">Montant</TableHead>
                          <TableHead className="text-white/60 font-medium">Lien Stripe</TableHead>
                          <TableHead className="text-white/60 font-medium">Actif</TableHead>
                          <TableHead className="text-white/60 font-medium hidden md:table-cell">Expiration</TableHead>
                          <TableHead className="text-white/60 font-medium">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentLinks.map((link) => (
                          <TableRow key={link.id} className="border-white/10 hover:bg-white/5">
                            <TableCell>
                              <span className="font-mono text-sm text-emerald-400">
                                {link.invoice?.reference ?? (link.quote_id ? `Devis` : '—')}
                              </span>
                            </TableCell>
                            <TableCell className="text-right font-semibold text-white">
                              {formatCurrency(link.amount)}
                            </TableCell>
                            <TableCell className="max-w-[160px]">
                              {link.stripe_link_url ? (
                                <span className="text-blue-400 text-xs truncate block max-w-[140px]" title={link.stripe_link_url}>
                                  {link.stripe_link_url}
                                </span>
                              ) : (
                                <span className="text-white/30 text-xs">Non généré</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {link.is_active ? (
                                <Badge className="bg-emerald-500/20 text-emerald-400 border-0 text-xs">
                                  <CheckCircle2 className="h-3 w-3 mr-1" />
                                  Actif
                                </Badge>
                              ) : (
                                <Badge className="bg-red-500/20 text-red-400 border-0 text-xs">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Inactif
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell text-white/60 text-sm">
                              {link.expires_at ? formatDate(link.expires_at) : '—'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {link.stripe_link_url && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="min-h-[36px] min-w-[36px] p-0 text-white/60 hover:text-white hover:bg-white/10"
                                    onClick={() => handleCopyLink(link.stripe_link_url!, link.id)}
                                    title="Copier le lien"
                                  >
                                    {copiedId === link.id ? (
                                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                                    ) : (
                                      <Copy className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className={cn(
                                    'min-h-[36px] min-w-[36px] p-0 hover:bg-white/10',
                                    link.is_active ? 'text-red-400 hover:text-red-300' : 'text-emerald-400 hover:text-emerald-300'
                                  )}
                                  onClick={() => handleToggleLinkActive(link.id, link.is_active)}
                                  title={link.is_active ? 'Désactiver' : 'Activer'}
                                >
                                  {link.is_active ? <XCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                                </Button>
                              </div>
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

          {/* Tab 3 - Configuration Stripe */}
          <TabsContent value="configuration" className="space-y-4">
            <Card className="bg-[#1a1a2e] border-white/10">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-emerald-400" />
                  Connexion Stripe
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {loadingSettings ? (
                  <div className="space-y-3">
                    <Skeleton className="h-12 w-full bg-white/10" />
                    <Skeleton className="h-12 w-full bg-white/10" />
                  </div>
                ) : (
                  <>
                    {/* Status */}
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className={cn(
                        'p-3 rounded-full',
                        stripeConnected ? 'bg-emerald-500/20' : 'bg-amber-500/20'
                      )}>
                        {stripeConnected ? (
                          <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                        ) : (
                          <AlertCircle className="h-6 w-6 text-amber-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-white">
                          {stripeConnected ? 'Stripe est configuré' : 'Stripe non configuré'}
                        </p>
                        <p className="text-sm text-white/60">
                          {stripeConnected
                            ? 'Les paiements en ligne sont activés pour votre compte.'
                            : 'Configurez vos clés Stripe pour activer les paiements en ligne.'}
                        </p>
                      </div>
                    </div>

                    {/* Publishable key */}
                    {companySettings?.stripe_public_key && (
                      <div className="space-y-2">
                        <Label className="text-white/60 text-sm">Clé publique Stripe (Publishable Key)</Label>
                        <div className="flex items-center gap-2">
                          <Input
                            readOnly
                            value={`${companySettings.stripe_public_key.slice(0, 12)}${'•'.repeat(20)}`}
                            className="bg-white/5 border-white/10 text-white/80 font-mono text-sm"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-white/10 text-white/60 hover:bg-white/10 min-h-[40px]"
                            onClick={() => handleCopyLink(companySettings.stripe_public_key!, 'pk')}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-white/40">Utilisée pour l&apos;initialisation des éléments Stripe côté client.</p>
                      </div>
                    )}

                    {/* Info block */}
                    <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <div className="flex gap-3">
                        <AlertCircle className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
                        <div className="space-y-1">
                          <p className="text-sm font-medium text-blue-300">Configuration complète dans les paramètres</p>
                          <p className="text-xs text-blue-300/70">
                            Pour configurer ou modifier vos clés Stripe (clé secrète, webhooks), rendez-vous dans les
                            paramètres de l&apos;application.
                          </p>
                        </div>
                      </div>
                    </div>

                    <Button
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10 min-h-[48px] gap-2 w-full sm:w-auto"
                      onClick={() => window.location.href = '/dashboard/parametres'}
                    >
                      <Settings className="h-4 w-4" />
                      Aller aux paramètres Stripe
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Stats */}
            <Card className="bg-[#1a1a2e] border-white/10">
              <CardHeader>
                <CardTitle className="text-white text-base">Résumé des paiements</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-white/5">
                  <p className="text-xs text-white/60">Total paiements</p>
                  <p className="text-2xl font-bold text-white mt-1">{payments.length}</p>
                </div>
                <div className="p-4 rounded-lg bg-white/5">
                  <p className="text-xs text-white/60">Via Stripe</p>
                  <p className="text-2xl font-bold text-emerald-400 mt-1">
                    {payments.filter(p => p.stripe_payment_id).length}
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-white/5">
                  <p className="text-xs text-white/60">Liens actifs</p>
                  <p className="text-2xl font-bold text-blue-400 mt-1">
                    {paymentLinks.filter(l => l.is_active).length}
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialog: Enregistrer un paiement */}
      <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-lg w-[calc(100vw-2rem)] rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Enregistrer un paiement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-white/80">Facture <span className="text-red-400">*</span></Label>
              <Select
                value={registerForm.invoice_id}
                onValueChange={(v) => {
                  const inv = invoices.find(i => i.id === v);
                  setRegisterForm(f => ({
                    ...f,
                    invoice_id: v,
                    amount: inv?.remaining_ttc ? inv.remaining_ttc.toString() : f.amount,
                  }));
                }}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white min-h-[48px]">
                  <SelectValue placeholder="Sélectionner une facture" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/10 text-white">
                  {invoices.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.reference} — {formatCurrency(inv.remaining_ttc ?? 0)} restant
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-white/80">Montant (€) <span className="text-red-400">*</span></Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={registerForm.amount}
                  onChange={(e) => setRegisterForm(f => ({ ...f, amount: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white min-h-[48px]"
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/80">Date <span className="text-red-400">*</span></Label>
                <Input
                  type="date"
                  value={registerForm.payment_date}
                  onChange={(e) => setRegisterForm(f => ({ ...f, payment_date: e.target.value }))}
                  className="bg-white/5 border-white/10 text-white min-h-[48px] [color-scheme:dark]"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/80">Méthode de paiement <span className="text-red-400">*</span></Label>
              <Select
                value={registerForm.payment_method}
                onValueChange={(v) => setRegisterForm(f => ({ ...f, payment_method: v as PaymentMethod }))}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white min-h-[48px]">
                  <SelectValue placeholder="Choisir une méthode" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/10 text-white">
                  {Object.entries(PAYMENT_METHOD_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/80">Référence (optionnel)</Label>
              <Input
                value={registerForm.reference}
                onChange={(e) => setRegisterForm(f => ({ ...f, reference: e.target.value }))}
                className="bg-white/5 border-white/10 text-white min-h-[48px]"
                placeholder="N° de virement, chèque..."
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/80">Notes (optionnel)</Label>
              <Textarea
                value={registerForm.notes}
                onChange={(e) => setRegisterForm(f => ({ ...f, notes: e.target.value }))}
                className="bg-white/5 border-white/10 text-white resize-none"
                rows={2}
                placeholder="Informations complémentaires..."
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowRegisterDialog(false)}
              className="border-white/10 text-white hover:bg-white/10 min-h-[48px]"
              disabled={registerLoading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleRegisterPayment}
              disabled={registerLoading}
              className="bg-emerald-500 hover:bg-emerald-600 text-white min-h-[48px] gap-2"
            >
              {registerLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: Créer un lien de paiement */}
      <Dialog open={showCreateLinkDialog} onOpenChange={setShowCreateLinkDialog}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-lg w-[calc(100vw-2rem)] rounded-lg">
          <DialogHeader>
            <DialogTitle className="text-white">Créer un lien de paiement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-white/80">Facture <span className="text-red-400">*</span></Label>
              <Select
                value={createLinkForm.invoice_id}
                onValueChange={(v) => {
                  const inv = invoices.find(i => i.id === v);
                  setCreateLinkForm(f => ({
                    ...f,
                    invoice_id: v,
                    amount: inv?.remaining_ttc ? inv.remaining_ttc.toString() : f.amount,
                  }));
                }}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white min-h-[48px]">
                  <SelectValue placeholder="Sélectionner une facture" />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/10 text-white">
                  {invoices.map((inv) => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.reference} — {formatCurrency(inv.remaining_ttc ?? 0)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/80">Montant (€) <span className="text-red-400">*</span></Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={createLinkForm.amount}
                onChange={(e) => setCreateLinkForm(f => ({ ...f, amount: e.target.value }))}
                className="bg-white/5 border-white/10 text-white min-h-[48px]"
                placeholder="0.00"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-white/80">Date d&apos;expiration (optionnel)</Label>
              <Input
                type="date"
                value={createLinkForm.expires_at}
                onChange={(e) => setCreateLinkForm(f => ({ ...f, expires_at: e.target.value }))}
                className="bg-white/5 border-white/10 text-white min-h-[48px] [color-scheme:dark]"
              />
            </div>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 flex gap-2">
              <AlertCircle className="h-4 w-4 text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-300">
                Le lien Stripe sera généré via l&apos;API Stripe. Assurez-vous que Stripe est correctement configuré dans les paramètres.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCreateLinkDialog(false)}
              className="border-white/10 text-white hover:bg-white/10 min-h-[48px]"
              disabled={createLinkLoading}
            >
              Annuler
            </Button>
            <Button
              onClick={handleCreateLink}
              disabled={createLinkLoading}
              className="bg-emerald-500 hover:bg-emerald-600 text-white min-h-[48px] gap-2"
            >
              {createLinkLoading && <RefreshCw className="h-4 w-4 animate-spin" />}
              Créer le lien
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
