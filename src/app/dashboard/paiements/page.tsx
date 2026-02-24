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

type PaymentLinkWithJoins = {
  id: string;
  invoice_id: string;
  amount: number;
  expires_at: string | null;
  is_used: boolean;
  stripe_session_id: string | null;
  token: string;
  created_at: string;
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
  const [invoices, setInvoices] = useState<Pick<InvoiceRow, 'id' | 'reference' | 'remaining_due'>[]>([]);
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
    // user_profile.id is the PK that references auth.users(id)
    const { data } = await supabase
      .from('user_profile')
      .select('company_id')
      .eq('id', user.id)
      .single();
    return data?.company_id ?? null;
  }, [supabase]);

  const fetchPayments = useCallback(async (companyId: string) => {
    setLoadingPayments(true);
    let query = supabase
      .from('payment')
      .select(
        'id, company_id, invoice_id, amount, payment_method, payment_date, reference, notes, created_at, created_by, invoice:invoice_id(reference, total_ttc, client_id, client:client_id(company_name, first_name, last_name))'
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
    // payment_link has no company_id; join through invoice to filter by company
    const { data: invoiceIds } = await supabase
      .from('invoice')
      .select('id')
      .eq('company_id', companyId);

    const ids = (invoiceIds ?? []).map((inv: { id: string }) => inv.id);

    if (ids.length === 0) {
      setPaymentLinks([]);
      setLoadingLinks(false);
      return;
    }

    const { data, error } = await supabase
      .from('payment_link')
      .select('id, invoice_id, amount, expires_at, is_used, stripe_session_id, token, created_at, invoice:invoice_id(reference)')
      .in('invoice_id', ids)
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

    // Get invoice ids for this company to count active payment links
    const { data: companyInvoiceIds } = await supabase
      .from('invoice')
      .select('id')
      .eq('company_id', companyId);
    const invoiceIdList = (companyInvoiceIds ?? []).map((inv: { id: string }) => inv.id);

    const [{ data: encaisseData }, { data: invoicesData }, { data: linksData }] = await Promise.all([
      supabase
        .from('payment')
        .select('amount')
        .eq('company_id', companyId)
        .gte('payment_date', firstOfMonth)
        .lte('payment_date', lastOfMonth),
      supabase
        .from('invoice')
        .select('remaining_due')
        .eq('company_id', companyId)
        .in('status', ['envoyee', 'partiellement_payee', 'en_retard']),
      invoiceIdList.length > 0
        ? supabase
            .from('payment_link')
            .select('id')
            .in('invoice_id', invoiceIdList)
            .eq('is_used', false)
        : Promise.resolve({ data: [] }),
    ]);

    const total = (encaisseData ?? []).reduce((sum: number, p: { amount: number }) => sum + (p.amount ?? 0), 0);
    const attente = (invoicesData ?? []).reduce((sum: number, inv: { remaining_due: number | null }) => sum + (inv.remaining_due ?? 0), 0);
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
      .select('id, reference, remaining_due')
      .eq('company_id', companyId)
      .in('status', ['envoyee', 'partiellement_payee', 'en_retard'])
      .order('date_emission', { ascending: false });
    setInvoices((data ?? []) as Pick<InvoiceRow, 'id' | 'reference' | 'remaining_due'>[]);
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

    // payment_link only has: invoice_id (NOT NULL), amount, expires_at, token (has default), is_used (has default), stripe_session_id
    const { error } = await supabase.from('payment_link').insert({
      invoice_id: createLinkForm.invoice_id,
      amount: parseFloat(createLinkForm.amount),
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

  const handleToggleLinkUsed = async (linkId: string, currentUsed: boolean) => {
    const companyId = await fetchCompanyId();
    const { error } = await supabase
      .from('payment_link')
      .update({ is_used: !currentUsed })
      .eq('id', linkId);
    if (error) {
      toast({ title: 'Erreur', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Mis à jour', description: `Lien ${!currentUsed ? 'marqué comme utilisé' : 'réactivé'}.` });
      if (companyId) await fetchPaymentLinks(companyId);
    }
  };

  const filteredPayments = payments;

  const stripeConnected = !!(companySettings?.smtp_settings);

  return (
    <div className="min-h-screen bg-[#0f0f23] text-white">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white">Paiements</h1>
            <p className="text-sm text-white/60 mt-1">Gérez vos encaissements et liens de paiement</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => setShowRegisterDialog(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="h-4 w-4 mr-1" />
              Enregistrer un paiement
            </Button>
            <Button
              onClick={() => setShowCreateLinkDialog(true)}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              <Link2 className="h-4 w-4 mr-1" />
              Créer un lien
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            title="Encaissé ce mois"
            value={formatCurrency(kpiEncaisse)}
            icon={<Euro className="h-5 w-5" />}
            loading={loadingKpis}
            color="bg-emerald-500/20 text-emerald-400"
          />
          <KpiCard
            title="En attente"
            value={formatCurrency(kpiEnAttente)}
            icon={<Clock className="h-5 w-5" />}
            loading={loadingKpis}
            color="bg-amber-500/20 text-amber-400"
          />
          <KpiCard
            title="Liens actifs"
            value={String(kpiLiensActifs)}
            icon={<Link2 className="h-5 w-5" />}
            loading={loadingKpis}
            color="bg-blue-500/20 text-blue-400"
          />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="payments">
          <TabsList className="bg-white/5 border border-white/10">
            <TabsTrigger value="payments" className="data-[state=active]:bg-white/10 text-white">
              Paiements reçus
            </TabsTrigger>
            <TabsTrigger value="links" className="data-[state=active]:bg-white/10 text-white">
              Liens de paiement
            </TabsTrigger>
          </TabsList>

          {/* Payments Tab */}
          <TabsContent value="payments" className="mt-4 space-y-4">
            {/* Filters */}
            <Card className="bg-[#1a1a2e] border-white/10">
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="flex flex-col gap-1">
                    <Label className="text-white/60 text-xs">Du</Label>
                    <Input
                      type="date"
                      value={filterDateFrom}
                      onChange={e => setFilterDateFrom(e.target.value)}
                      className="bg-white/5 border-white/10 text-white w-36"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-white/60 text-xs">Au</Label>
                    <Input
                      type="date"
                      value={filterDateTo}
                      onChange={e => setFilterDateTo(e.target.value)}
                      className="bg-white/5 border-white/10 text-white w-36"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-white/60 text-xs">Méthode</Label>
                    <Select value={filterMethod} onValueChange={setFilterMethod}>
                      <SelectTrigger className="bg-white/5 border-white/10 text-white w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Toutes</SelectItem>
                        {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map(m => (
                          <SelectItem key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="outline"
                    className="border-white/20 text-white hover:bg-white/10"
                    onClick={async () => {
                      const companyId = await fetchCompanyId();
                      if (companyId) await fetchPayments(companyId);
                    }}
                  >
                    <Filter className="h-4 w-4 mr-1" />
                    Filtrer
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Table */}
            <Card className="bg-[#1a1a2e] border-white/10">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-white/60">Date</TableHead>
                      <TableHead className="text-white/60">Facture</TableHead>
                      <TableHead className="text-white/60">Client</TableHead>
                      <TableHead className="text-white/60">Méthode</TableHead>
                      <TableHead className="text-white/60 text-right">Montant</TableHead>
                      <TableHead className="text-white/60">Référence</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingPayments ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i} className="border-white/10">
                          {Array.from({ length: 6 }).map((__, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-full bg-white/10" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : filteredPayments.length === 0 ? (
                      <TableRow className="border-white/10">
                        <TableCell colSpan={6} className="text-center text-white/40 py-12">
                          Aucun paiement trouvé
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredPayments.map(payment => (
                        <TableRow key={payment.id} className="border-white/10 hover:bg-white/5">
                          <TableCell className="text-white text-sm">
                            {formatDate(payment.payment_date)}
                          </TableCell>
                          <TableCell className="text-white text-sm">
                            {payment.invoice?.reference ?? '—'}
                          </TableCell>
                          <TableCell className="text-white text-sm">
                            {getClientName(payment.invoice?.client ?? null)}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-white/20 text-white gap-1">
                              {PAYMENT_METHOD_ICONS[payment.payment_method as PaymentMethod]}
                              {PAYMENT_METHOD_LABELS[payment.payment_method as PaymentMethod] ?? payment.payment_method}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right text-emerald-400 font-semibold">
                            {formatCurrency(payment.amount)}
                          </TableCell>
                          <TableCell className="text-white/60 text-sm">
                            {payment.reference ?? '—'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Links Tab */}
          <TabsContent value="links" className="mt-4">
            <Card className="bg-[#1a1a2e] border-white/10">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-white/60">Facture</TableHead>
                      <TableHead className="text-white/60">Token</TableHead>
                      <TableHead className="text-white/60 text-right">Montant</TableHead>
                      <TableHead className="text-white/60">Expiration</TableHead>
                      <TableHead className="text-white/60">Statut</TableHead>
                      <TableHead className="text-white/60">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingLinks ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i} className="border-white/10">
                          {Array.from({ length: 6 }).map((__, j) => (
                            <TableCell key={j}><Skeleton className="h-4 w-full bg-white/10" /></TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : paymentLinks.length === 0 ? (
                      <TableRow className="border-white/10">
                        <TableCell colSpan={6} className="text-center text-white/40 py-12">
                          Aucun lien de paiement
                        </TableCell>
                      </TableRow>
                    ) : (
                      paymentLinks.map(link => (
                        <TableRow key={link.id} className="border-white/10 hover:bg-white/5">
                          <TableCell className="text-white text-sm">
                            {link.invoice?.reference ?? '—'}
                          </TableCell>
                          <TableCell className="text-white/60 text-xs font-mono">
                            {link.token}
                          </TableCell>
                          <TableCell className="text-right text-white font-semibold">
                            {formatCurrency(link.amount)}
                          </TableCell>
                          <TableCell className="text-white/60 text-sm">
                            {link.expires_at ? formatDate(link.expires_at) : '—'}
                          </TableCell>
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={cn(
                                'border-white/20',
                                link.is_used
                                  ? 'text-white/40'
                                  : 'text-emerald-400 border-emerald-400/30'
                              )}
                            >
                              {link.is_used ? 'Utilisé' : 'Actif'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {link.stripe_session_id && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 w-7 p-0 text-white/60 hover:text-white"
                                  onClick={() => handleCopyLink(link.stripe_session_id!, link.id)}
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
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-white/60 hover:text-white"
                                onClick={() => handleToggleLinkUsed(link.id, link.is_used)}
                                title={link.is_used ? 'Réactiver' : 'Marquer utilisé'}
                              >
                                {link.is_used ? (
                                  <RefreshCw className="h-4 w-4" />
                                ) : (
                                  <XCircle className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Register Payment Dialog */}
      <Dialog open={showRegisterDialog} onOpenChange={setShowRegisterDialog}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Enregistrer un paiement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-white/80">Facture *</Label>
              <Select
                value={registerForm.invoice_id}
                onValueChange={v => {
                  const inv = invoices.find(i => i.id === v);
                  setRegisterForm(f => ({
                    ...f,
                    invoice_id: v,
                    amount: inv?.remaining_due != null ? String(inv.remaining_due) : f.amount,
                  }));
                }}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Sélectionner une facture" />
                </SelectTrigger>
                <SelectContent>
                  {invoices.map(inv => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.reference} — {formatCurrency(inv.remaining_due ?? 0)} restant
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/80">Montant (€) *</Label>
              <Input
                type="number"
                step="0.01"
                value={registerForm.amount}
                onChange={e => setRegisterForm(f => ({ ...f, amount: e.target.value }))}
                className="bg-white/5 border-white/10 text-white"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/80">Méthode de paiement *</Label>
              <Select
                value={registerForm.payment_method}
                onValueChange={v => setRegisterForm(f => ({ ...f, payment_method: v as PaymentMethod }))}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Sélectionner" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(PAYMENT_METHOD_LABELS) as PaymentMethod[]).map(m => (
                    <SelectItem key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/80">Date de paiement *</Label>
              <Input
                type="date"
                value={registerForm.payment_date}
                onChange={e => setRegisterForm(f => ({ ...f, payment_date: e.target.value }))}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/80">Référence</Label>
              <Input
                value={registerForm.reference}
                onChange={e => setRegisterForm(f => ({ ...f, reference: e.target.value }))}
                className="bg-white/5 border-white/10 text-white"
                placeholder="N° chèque, virement..."
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/80">Notes</Label>
              <Textarea
                value={registerForm.notes}
                onChange={e => setRegisterForm(f => ({ ...f, notes: e.target.value }))}
                className="bg-white/5 border-white/10 text-white resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={() => setShowRegisterDialog(false)}
            >
              Annuler
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleRegisterPayment}
              disabled={registerLoading}
            >
              {registerLoading ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Link Dialog */}
      <Dialog open={showCreateLinkDialog} onOpenChange={setShowCreateLinkDialog}>
        <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>Créer un lien de paiement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-white/80">Facture *</Label>
              <Select
                value={createLinkForm.invoice_id}
                onValueChange={v => {
                  const inv = invoices.find(i => i.id === v);
                  setCreateLinkForm(f => ({
                    ...f,
                    invoice_id: v,
                    amount: inv?.remaining_due != null ? String(inv.remaining_due) : f.amount,
                  }));
                }}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white">
                  <SelectValue placeholder="Sélectionner une facture" />
                </SelectTrigger>
                <SelectContent>
                  {invoices.map(inv => (
                    <SelectItem key={inv.id} value={inv.id}>
                      {inv.reference} — {formatCurrency(inv.remaining_due ?? 0)} restant
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/80">Montant (€) *</Label>
              <Input
                type="number"
                step="0.01"
                value={createLinkForm.amount}
                onChange={e => setCreateLinkForm(f => ({ ...f, amount: e.target.value }))}
                className="bg-white/5 border-white/10 text-white"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/80">Date d'expiration</Label>
              <Input
                type="date"
                value={createLinkForm.expires_at}
                onChange={e => setCreateLinkForm(f => ({ ...f, expires_at: e.target.value }))}
                className="bg-white/5 border-white/10 text-white"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
              onClick={() => setShowCreateLinkDialog(false)}
            >
              Annuler
            </Button>
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleCreateLink}
              disabled={createLinkLoading}
            >
              {createLinkLoading ? 'Création...' : 'Créer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
