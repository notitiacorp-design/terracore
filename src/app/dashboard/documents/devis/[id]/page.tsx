'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { QuoteRow, QuoteLineRow, ClientRow, InvoiceRow, InvoiceLineRow, AuditLogRow } from '@/types/database';
import { cn, formatDate, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/components/ui/use-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  ArrowLeft,
  Send,
  Copy,
  FileText,
  Download,
  CheckCircle,
  XCircle,
  AlertCircle,
  Clock,
  User,
  Calendar,
  Building2,
  Percent,
  Shield,
  Bot,
  History,
  ChevronRight,
} from 'lucide-react';

type QuoteStatus = 'brouillon' | 'envoye' | 'accepte' | 'refuse' | 'expire';

type QuoteWithRelations = QuoteRow & {
  client: ClientRow | null;
  quote_line: QuoteLineRow[];
};

type ConformityCheck = {
  label: string;
  ok: boolean;
  warning?: boolean;
  message?: string;
};

const STATUS_LABELS: Record<QuoteStatus, string> = {
  brouillon: 'Brouillon',
  envoye: 'Envoyé',
  accepte: 'Accepté',
  refuse: 'Refusé',
  expire: 'Expiré',
};

const STATUS_COLORS: Record<QuoteStatus, string> = {
  brouillon: 'bg-gray-500/20 text-gray-300 border-gray-500/30',
  envoye: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  accepte: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
  refuse: 'bg-red-500/20 text-red-300 border-red-500/30',
  expire: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
};

const STATUS_ICONS: Record<QuoteStatus, React.ReactNode> = {
  brouillon: <Clock className="h-3.5 w-3.5" />,
  envoye: <Send className="h-3.5 w-3.5" />,
  accepte: <CheckCircle className="h-3.5 w-3.5" />,
  refuse: <XCircle className="h-3.5 w-3.5" />,
  expire: <AlertCircle className="h-3.5 w-3.5" />,
};

export default function DevisDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [quote, setQuote] = useState<QuoteWithRelations | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const supabase = createClient();

  const fetchQuote = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('quote')
        .select(`
          *,
          client (*),
          quote_line (*)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;

      const sortedLines = (data as QuoteWithRelations).quote_line?.sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)
      ) ?? [];

      setQuote({ ...data as QuoteWithRelations, quote_line: sortedLines });

      const { data: logs } = await supabase
        .from('audit_log')
        .select('*')
        .eq('entity_type', 'quote')
        .eq('entity_id', id)
        .order('created_at', { ascending: false })
        .limit(10);

      setAuditLogs(logs ?? []);
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur', description: 'Impossible de charger le devis.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchQuote();
  }, [fetchQuote]);

  const handleStatusChange = async (newStatus: QuoteStatus) => {
    if (!quote) return;
    setActionLoading('status-' + newStatus);
    try {
      const { error } = await supabase
        .from('quote')
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq('id', quote.id);

      if (error) throw error;

      setQuote(prev => prev ? { ...prev, status: newStatus } : null);
      toast({
        title: 'Statut mis à jour',
        description: `Le devis est maintenant « ${STATUS_LABELS[newStatus]} ».`,
      });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur', description: 'Impossible de mettre à jour le statut.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDuplicate = async () => {
    if (!quote) return;
    setActionLoading('duplicate');
    try {
      const { data: userData } = await supabase.auth.getUser();
      const now = new Date().toISOString();
      const newRef = `${quote.reference}-COPIE-${Date.now().toString().slice(-4)}`;

      const { data: newQuote, error: quoteError } = await supabase
        .from('quote')
        .insert({
          company_id: quote.company_id,
          client_id: quote.client_id,
          reference: newRef,
          date_emission: now.split('T')[0],
          date_validite: quote.date_validite,
          object: quote.object,
          introduction: quote.introduction,
          conditions: quote.conditions,
          total_ht: quote.total_ht,
          total_tva: quote.total_tva,
          total_ttc: quote.total_ttc,
          margin_percent: quote.margin_percent,
          status: 'brouillon' as QuoteStatus,
          notes: quote.notes,
          sap_eligible: quote.sap_eligible,
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (quoteError || !newQuote) throw quoteError;

      if (quote.quote_line && quote.quote_line.length > 0) {
        const newLines = quote.quote_line.map(line => ({
          quote_id: newQuote.id,
          work_unit_id: line.work_unit_id,
          item_id: line.item_id,
          label: line.label,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          unit_price_ht: line.unit_price_ht,
          tva_rate: line.tva_rate,
          total_ht: line.total_ht,
          sort_order: line.sort_order,
        }));

        const { error: linesError } = await supabase.from('quote_line').insert(newLines);
        if (linesError) throw linesError;
      }

      toast({ title: 'Devis dupliqué', description: `Nouveau devis créé : ${newRef}` });
      router.push(`/dashboard/documents/devis/${newQuote.id}`);
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur', description: 'Impossible de dupliquer le devis.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!quote) return;
    setActionLoading('convert');
    try {
      const { data: userData } = await supabase.auth.getUser();
      const now = new Date();
      const { data: settings } = await supabase
        .from('company_settings')
        .select('default_payment_terms_days')
        .eq('company_id', quote.company_id)
        .single();

      const paymentTerms = settings?.default_payment_terms_days ?? 30;
      const echeance = new Date(now.getTime() + paymentTerms * 24 * 60 * 60 * 1000);
      const invoiceRef = `FAC-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Date.now().toString().slice(-4)}`;

      const { data: newInvoice, error: invoiceError } = await supabase
        .from('invoice')
        .insert({
          company_id: quote.company_id,
          client_id: quote.client_id,
          quote_id: quote.id,
          reference: invoiceRef,
          date_emission: now.toISOString().split('T')[0],
          date_echeance: echeance.toISOString().split('T')[0],
          object: quote.object,
          total_ht: quote.total_ht,
          total_tva: quote.total_tva,
          total_ttc: quote.total_ttc,
          remaining_ttc: quote.total_ttc,
          status: 'brouillon' as 'brouillon',
          notes: quote.notes,
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (invoiceError || !newInvoice) throw invoiceError;

      if (quote.quote_line && quote.quote_line.length > 0) {
        const invoiceLines = quote.quote_line.map(line => ({
          invoice_id: newInvoice.id,
          work_unit_id: line.work_unit_id,
          item_id: line.item_id,
          label: line.label,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          unit_price_ht: line.unit_price_ht,
          tva_rate: line.tva_rate,
          total_ht: line.total_ht,
          sort_order: line.sort_order,
        }));

        const { error: linesError } = await supabase.from('invoice_line').insert(invoiceLines);
        if (linesError) throw linesError;
      }

      // Update quote status to accepte
      await supabase
        .from('quote')
        .update({ status: 'accepte' as QuoteStatus, updated_at: new Date().toISOString() })
        .eq('id', quote.id);

      toast({ title: 'Facture créée', description: `Facture ${invoiceRef} créée avec succès.` });
      router.push(`/dashboard/documents/factures/${newInvoice.id}`);
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur', description: 'Impossible de convertir en facture.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const conformityChecks = useCallback((): ConformityCheck[] => {
    if (!quote) return [];
    return [
      {
        label: 'Référence',
        ok: !!quote.reference && quote.reference.trim().length > 0,
        message: 'La référence est obligatoire.',
      },
      {
        label: 'Client associé',
        ok: !!quote.client_id && !!quote.client,
        message: 'Un client doit être associé au devis.',
      },
      {
        label: 'Date d\'émission',
        ok: !!quote.date_emission,
        message: 'La date d\'émission est requise.',
      },
      {
        label: 'Date de validité',
        ok: !!quote.date_validite,
        message: 'La date de validité est requise.',
      },
      {
        label: 'Objet du devis',
        ok: !!quote.object && quote.object.trim().length > 0,
        message: 'L\'objet du devis est requis.',
      },
      {
        label: 'Lignes de devis',
        ok: quote.quote_line && quote.quote_line.length > 0,
        message: 'Le devis doit contenir au moins une ligne.',
      },
      {
        label: 'Montant total positif',
        ok: (quote.total_ttc ?? 0) > 0,
        message: 'Le montant total TTC doit être supérieur à 0.',
      },
      {
        label: 'Marge définie',
        ok: quote.margin_percent !== null && quote.margin_percent !== undefined,
        warning: true,
        message: 'La marge n\'est pas calculée.',
      },
      {
        label: 'Introduction commerciale',
        ok: !!quote.introduction && quote.introduction.trim().length > 0,
        warning: true,
        message: 'Une introduction est recommandée.',
      },
      {
        label: 'Conditions générales',
        ok: !!quote.conditions && quote.conditions.trim().length > 0,
        warning: true,
        message: 'Les conditions de vente sont recommandées.',
      },
    ];
  }, [quote]);

  const getConformityScore = () => {
    const checks = conformityChecks();
    const required = checks.filter(c => !c.warning);
    const passed = required.filter(c => c.ok);
    return { passed: passed.length, total: required.length };
  };

  const getClientDisplayName = (client: ClientRow | null) => {
    if (!client) return 'Client inconnu';
    if (client.client_type === 'pro') return client.company_name ?? `${client.first_name} ${client.last_name}`;
    return `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim();
  };

  const getMarginColor = (margin: number | null) => {
    if (margin === null) return 'text-gray-400';
    if (margin >= 30) return 'text-emerald-400';
    if (margin >= 15) return 'text-yellow-400';
    return 'text-red-400';
  };

  const canSend = quote?.status === 'brouillon';
  const canAccept = quote?.status === 'envoye';
  const canRefuse = quote?.status === 'envoye';
  const canConvert = quote?.status === 'accepte' || quote?.status === 'envoye';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] p-4 md:p-6 space-y-4">
        <Skeleton className="h-10 w-48 bg-white/10" />
        <Skeleton className="h-32 w-full bg-white/10" />
        <Skeleton className="h-64 w-full bg-white/10" />
        <Skeleton className="h-48 w-full bg-white/10" />
      </div>
    );
  }

  if (!quote) {
    return (
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
          <p className="text-white text-lg font-medium">Devis introuvable</p>
          <Button
            variant="outline"
            onClick={() => router.push('/dashboard/documents/devis')}
            className="border-white/20 text-white hover:bg-white/10 min-h-[48px]"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour aux devis
          </Button>
        </div>
      </div>
    );
  }

  const conformity = getConformityScore();
  const checks = conformityChecks();

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white">
      {/* Top navigation */}
      <div className="sticky top-0 z-10 bg-[#1a1a2e]/95 backdrop-blur border-b border-white/10 px-4 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-3">
          <button
            onClick={() => router.push('/dashboard/documents/devis')}
            className="flex items-center gap-2 text-white/70 hover:text-white transition-colors min-h-[48px] min-w-[48px]"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="hidden sm:inline text-sm">Devis</span>
          </button>

          <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
            {canSend && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    disabled={actionLoading === 'status-envoye'}
                    className="bg-blue-600 hover:bg-blue-700 text-white min-h-[48px] px-4 whitespace-nowrap"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Envoyer
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#1a1a2e] border-white/20 text-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Envoyer le devis ?</AlertDialogTitle>
                    <AlertDialogDescription className="text-white/60">
                      Le statut du devis passera à « Envoyé ». Cette action indique que le devis a été transmis au client.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleStatusChange('envoye')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      Confirmer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {canAccept && (
              <Button
                size="sm"
                disabled={actionLoading === 'status-accepte'}
                onClick={() => handleStatusChange('accepte')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[48px] px-4 whitespace-nowrap"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Accepter
              </Button>
            )}

            {canRefuse && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={actionLoading === 'status-refuse'}
                    className="border-red-500/40 text-red-400 hover:bg-red-500/10 min-h-[48px] px-4 whitespace-nowrap"
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    Refuser
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#1a1a2e] border-white/20 text-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Marquer comme refusé ?</AlertDialogTitle>
                    <AlertDialogDescription className="text-white/60">
                      Le devis sera marqué comme refusé par le client.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleStatusChange('refuse')}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Confirmer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {canConvert && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    disabled={actionLoading === 'convert'}
                    className="bg-purple-600 hover:bg-purple-700 text-white min-h-[48px] px-4 whitespace-nowrap"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Convertir en facture
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#1a1a2e] border-white/20 text-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Convertir en facture ?</AlertDialogTitle>
                    <AlertDialogDescription className="text-white/60">
                      Une nouvelle facture sera créée à partir de ce devis avec toutes ses lignes. Le devis sera marqué comme accepté.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleConvertToInvoice}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      Créer la facture
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            <Button
              size="sm"
              variant="outline"
              disabled={actionLoading === 'duplicate'}
              onClick={handleDuplicate}
              className="border-white/20 text-white hover:bg-white/10 min-h-[48px] px-4 whitespace-nowrap"
            >
              <Copy className="h-4 w-4 mr-2" />
              Dupliquer
            </Button>

            <Button
              size="sm"
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10 min-h-[48px] px-4 whitespace-nowrap"
            >
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header Card */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-5 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl font-bold text-white">{quote.reference}</h1>
                  <Badge
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-medium',
                      STATUS_COLORS[quote.status as QuoteStatus]
                    )}
                  >
                    {STATUS_ICONS[quote.status as QuoteStatus]}
                    {STATUS_LABELS[quote.status as QuoteStatus]}
                  </Badge>
                  {quote.sap_eligible && (
                    <Badge className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs">
                      <Shield className="h-3 w-3 mr-1" />
                      SAP éligible
                    </Badge>
                  )}
                </div>
                {quote.object && (
                  <p className="text-white/60 text-sm mt-1">{quote.object}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-5">
              {/* Client */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <User className="h-4 w-4 text-white/70" />
                </div>
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wide">Client</p>
                  <p className="text-sm font-medium text-white">{getClientDisplayName(quote.client)}</p>
                  {quote.client?.email && (
                    <p className="text-xs text-white/50">{quote.client.email}</p>
                  )}
                </div>
              </div>

              {/* Type client */}
              {quote.client && (
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Building2 className="h-4 w-4 text-white/70" />
                  </div>
                  <div>
                    <p className="text-xs text-white/40 uppercase tracking-wide">Type</p>
                    <p className="text-sm font-medium text-white capitalize">
                      {quote.client.client_type === 'pro' ? 'Professionnel' : 'Particulier'}
                    </p>
                    {quote.client.siret && (
                      <p className="text-xs text-white/50">SIRET: {quote.client.siret}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Date émission */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-4 w-4 text-white/70" />
                </div>
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wide">Émis le</p>
                  <p className="text-sm font-medium text-white">
                    {quote.date_emission ? formatDate(quote.date_emission) : '—'}
                  </p>
                  <p className="text-xs text-white/50">
                    Valide jusqu'au {quote.date_validite ? formatDate(quote.date_validite) : '—'}
                  </p>
                </div>
              </div>

              {/* Marge */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                  <Percent className="h-4 w-4 text-white/70" />
                </div>
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wide">Marge</p>
                  <p className={cn('text-sm font-bold', getMarginColor(quote.margin_percent))}>
                    {quote.margin_percent !== null && quote.margin_percent !== undefined
                      ? `${Number(quote.margin_percent).toFixed(1)}%`
                      : 'Non calculée'}
                  </p>
                  {quote.margin_percent !== null && (
                    <p className="text-xs text-white/50">
                      {(quote.margin_percent ?? 0) >= 30 ? 'Bonne marge' : (quote.margin_percent ?? 0) >= 15 ? 'Marge correcte' : 'Marge faible'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Lines Table */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base">Lignes du devis</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {quote.quote_line && quote.quote_line.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-white/50 text-xs font-medium pl-4 md:pl-6">Désignation</TableHead>
                      <TableHead className="text-white/50 text-xs font-medium text-right">Qté</TableHead>
                      <TableHead className="text-white/50 text-xs font-medium text-center">Unité</TableHead>
                      <TableHead className="text-white/50 text-xs font-medium text-right">P.U. HT</TableHead>
                      <TableHead className="text-white/50 text-xs font-medium text-right">TVA</TableHead>
                      <TableHead className="text-white/50 text-xs font-medium text-right pr-4 md:pr-6">Total HT</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quote.quote_line.map((line, index) => (
                      <TableRow
                        key={line.id}
                        className={cn(
                          'border-white/10 hover:bg-white/5 transition-colors',
                          index % 2 === 0 ? 'bg-transparent' : 'bg-white/[0.02]'
                        )}
                      >
                        <TableCell className="pl-4 md:pl-6 py-4">
                          <div>
                            <p className="text-sm font-medium text-white">{line.label}</p>
                            {line.description && (
                              <p className="text-xs text-white/50 mt-0.5">{line.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right text-sm text-white/80">
                          {Number(line.quantity).toLocaleString('fr-FR')}
                        </TableCell>
                        <TableCell className="text-center text-sm text-white/60">
                          {line.unit ?? '—'}
                        </TableCell>
                        <TableCell className="text-right text-sm text-white/80">
                          {formatCurrency(Number(line.unit_price_ht))}
                        </TableCell>
                        <TableCell className="text-right text-sm text-white/60">
                          {Number(line.tva_rate).toFixed(0)}%
                        </TableCell>
                        <TableCell className="pr-4 md:pr-6 text-right text-sm font-medium text-white">
                          {formatCurrency(Number(line.total_ht))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <FileText className="h-10 w-10 text-white/20 mb-3" />
                <p className="text-white/40 text-sm">Aucune ligne dans ce devis</p>
              </div>
            )}

            {/* Totals */}
            {quote.quote_line && quote.quote_line.length > 0 && (
              <div className="border-t border-white/10 p-4 md:p-6">
                <div className="flex justify-end">
                  <div className="space-y-2 w-full max-w-xs">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white/60">Total HT</span>
                      <span className="text-sm font-medium text-white">{formatCurrency(Number(quote.total_ht))}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-white/60">TVA</span>
                      <span className="text-sm font-medium text-white">{formatCurrency(Number(quote.total_tva))}</span>
                    </div>
                    <Separator className="bg-white/10" />
                    <div className="flex justify-between items-center">
                      <span className="text-base font-semibold text-white">Total TTC</span>
                      <span className="text-xl font-bold text-emerald-400">{formatCurrency(Number(quote.total_ttc))}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Conformity Check (Agent IA) */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Bot className="h-4 w-4 text-emerald-400" />
                Vérification de conformité
                <Badge className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Agent IA
                </Badge>
              </CardTitle>
              <div className={cn(
                'text-sm font-medium px-3 py-1 rounded-full',
                conformity.passed === conformity.total
                  ? 'bg-emerald-500/20 text-emerald-300'
                  : conformity.passed >= conformity.total * 0.7
                  ? 'bg-yellow-500/20 text-yellow-300'
                  : 'bg-red-500/20 text-red-300'
              )}>
                {conformity.passed}/{conformity.total} critères requis
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {checks.map((check, i) => (
                <div
                  key={i}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border',
                    check.ok
                      ? 'bg-emerald-500/10 border-emerald-500/20'
                      : check.warning
                      ? 'bg-yellow-500/10 border-yellow-500/20'
                      : 'bg-red-500/10 border-red-500/20'
                  )}
                >
                  {check.ok ? (
                    <CheckCircle className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                  ) : check.warning ? (
                    <AlertCircle className="h-4 w-4 text-yellow-400 flex-shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <p className={cn(
                      'text-sm font-medium',
                      check.ok ? 'text-emerald-300' : check.warning ? 'text-yellow-300' : 'text-red-300'
                    )}>
                      {check.label}
                    </p>
                    {!check.ok && check.message && (
                      <p className="text-xs text-white/50 mt-0.5">{check.message}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {conformity.passed < conformity.total && (
              <Alert className="mt-4 bg-red-500/10 border-red-500/20 text-red-300">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">
                  Ce devis n'est pas prêt à être envoyé. Veuillez corriger les {conformity.total - conformity.passed} point(s) manquant(s).
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        {(quote.introduction || quote.conditions || quote.notes) && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-3">
              <CardTitle className="text-white text-base">Informations complémentaires</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {quote.introduction && (
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wide mb-1">Introduction</p>
                  <p className="text-sm text-white/70 whitespace-pre-wrap">{quote.introduction}</p>
                </div>
              )}
              {quote.conditions && (
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wide mb-1">Conditions</p>
                  <p className="text-sm text-white/70 whitespace-pre-wrap">{quote.conditions}</p>
                </div>
              )}
              {quote.notes && (
                <div>
                  <p className="text-xs text-white/40 uppercase tracking-wide mb-1">Notes internes</p>
                  <p className="text-sm text-white/70 whitespace-pre-wrap">{quote.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Audit History */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <History className="h-4 w-4 text-white/60" />
              Historique des modifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            {auditLogs.length > 0 ? (
              <div className="space-y-3">
                {auditLogs.map((log) => (
                  <div key={log.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-white/30 mt-1.5 flex-shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge className="text-xs bg-white/10 text-white/70 border-white/20">
                          {log.action}
                        </Badge>
                        <span className="text-xs text-white/40">
                          {log.created_at ? formatDate(log.created_at) : '—'}
                        </span>
                      </div>
                      {log.changes && typeof log.changes === 'object' && (
                        <p className="text-xs text-white/50 mt-0.5 truncate">
                          {JSON.stringify(log.changes)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                <History className="h-8 w-8 text-white/20 mb-2" />
                <p className="text-white/40 text-sm">Aucun historique disponible</p>
              </div>
            )}

            {/* Created/Updated meta */}
            <div className="mt-4 pt-4 border-t border-white/10 flex flex-col sm:flex-row gap-2 sm:gap-6 text-xs text-white/40">
              <span>Créé le {quote.created_at ? formatDate(quote.created_at) : '—'}</span>
              <span>Mis à jour le {quote.updated_at ? formatDate(quote.updated_at) : '—'}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
