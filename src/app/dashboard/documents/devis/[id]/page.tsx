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
          date_validity: quote.date_validity,
          title: quote.title,
          description: quote.description,
          total_ht: quote.total_ht,
          total_tva: quote.total_tva,
          total_ttc: quote.total_ttc,
          status: 'brouillon' as QuoteStatus,
          notes_internal: quote.notes_internal,
          notes_public: quote.notes_public,
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
          vat_rate: line.vat_rate,
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
        .select('default_payment_terms')
        .eq('company_id', quote.company_id)
        .single();

      const paymentTerms = settings?.default_payment_terms ?? 30;
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
          date_due: echeance.toISOString().split('T')[0],
          title: quote.title,
          total_ht: quote.total_ht,
          total_tva: quote.total_tva,
          total_ttc: quote.total_ttc,
          remaining_due: quote.total_ttc,
          status: 'brouillon' as 'brouillon',
          notes_internal: quote.notes_internal,
          notes_public: quote.notes_public,
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (invoiceError || !newInvoice) throw invoiceError;

      if (quote.quote_line && quote.quote_line.length > 0) {
        const invoiceLines = quote.quote_line.map(line => ({
          invoice_id: newInvoice.id,
          item_id: line.item_id,
          label: line.label,
          description: line.description,
          quantity: line.quantity,
          unit: line.unit,
          unit_price_ht: line.unit_price_ht,
          vat_rate: line.vat_rate,
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
        ok: !!quote.date_validity,
        message: 'La date de validité est requise.',
      },
      {
        label: 'Objet du devis',
        ok: !!quote.title && quote.title.trim().length > 0,
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
        label: 'Description',
        ok: !!quote.description && quote.description.trim().length > 0,
        warning: true,
        message: 'Une description est recommandée.',
      },
      {
        label: 'Notes publiques',
        ok: !!quote.notes_public && quote.notes_public.trim().length > 0,
        warning: true,
        message: 'Les notes publiques sont recommandées.',
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
      <div className="min-h-screen bg-[#1a1a2e] flex items-center justify-center p-6">
        <Alert className="max-w-md border-red-500/30 bg-red-500/10">
          <AlertCircle className="h-4 w-4 text-red-400" />
          <AlertDescription className="text-red-300">
            Devis introuvable.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const checks = conformityChecks();
  const { passed, total } = getConformityScore();
  const status = quote.status as QuoteStatus;

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#1a1a2e]/95 backdrop-blur border-b border-white/10 px-4 md:px-6 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push('/dashboard/documents/devis')}
              className="text-gray-400 hover:text-white"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-lg font-semibold text-white">{quote.reference}</h1>
              <p className="text-xs text-gray-400">{quote.title ?? 'Sans titre'}</p>
            </div>
            <Badge
              className={cn(
                'flex items-center gap-1.5 px-2 py-1 text-xs border',
                STATUS_COLORS[status]
              )}
            >
              {STATUS_ICONS[status]}
              {STATUS_LABELS[status]}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDuplicate}
              disabled={!!actionLoading}
              className="text-gray-400 hover:text-white"
            >
              <Copy className="h-4 w-4 mr-1" />
              Dupliquer
            </Button>

            {canSend && (
              <Button
                size="sm"
                onClick={() => handleStatusChange('envoye')}
                disabled={!!actionLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="h-4 w-4 mr-1" />
                Envoyer
              </Button>
            )}

            {canAccept && (
              <Button
                size="sm"
                onClick={() => handleStatusChange('accepte')}
                disabled={!!actionLoading}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                <CheckCircle className="h-4 w-4 mr-1" />
                Accepter
              </Button>
            )}

            {canRefuse && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!!actionLoading}
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Refuser
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#1a1a2e] border-white/10">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">Refuser ce devis ?</AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-400">
                      Le devis passera en statut « Refusé ». Cette action peut être annulée en changeant le statut manuellement.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-white/10 text-gray-300">Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleStatusChange('refuse')}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Confirmer le refus
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
                    disabled={!!actionLoading}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Convertir en facture
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#1a1a2e] border-white/10">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-white">Convertir en facture ?</AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-400">
                      Une nouvelle facture sera créée à partir de ce devis. Le devis passera en statut « Accepté ».
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-white/10 text-gray-300">Annuler</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleConvertToInvoice}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      Convertir
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </div>
      </div>

      <div className="p-4 md:p-6 space-y-6">
        {/* Info cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Client */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                <User className="h-4 w-4" />
                Client
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-white font-medium">{getClientDisplayName(quote.client)}</p>
              {quote.client?.email && <p className="text-xs text-gray-400 mt-1">{quote.client.email}</p>}
              {quote.client?.phone && <p className="text-xs text-gray-400">{quote.client.phone}</p>}
            </CardContent>
          </Card>

          {/* Dates */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Dates
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Émission</span>
                <span className="text-white">{quote.date_emission ? formatDate(quote.date_emission) : '—'}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Validité</span>
                <span className="text-white">{quote.date_validity ? formatDate(quote.date_validity) : '—'}</span>
              </div>
            </CardContent>
          </Card>

          {/* Totaux */}
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-400 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Montants
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">HT</span>
                <span className="text-white">{formatCurrency(quote.total_ht ?? 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">TVA</span>
                <span className="text-white">{formatCurrency(quote.total_tva ?? 0)}</span>
              </div>
              <Separator className="bg-white/10" />
              <div className="flex justify-between text-sm font-semibold">
                <span className="text-gray-300">TTC</span>
                <span className="text-white">{formatCurrency(quote.total_ttc ?? 0)}</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Conformity */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-sm text-gray-300 flex items-center gap-2">
              <Shield className="h-4 w-4 text-blue-400" />
              Conformité du devis
              <Badge className={cn(
                'ml-auto text-xs px-2 py-0.5',
                passed === total ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
              )}>
                {passed}/{total} critères
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {checks.map((check, i) => (
                <div key={i} className="flex items-start gap-2 text-sm">
                  {check.ok ? (
                    <CheckCircle className="h-4 w-4 text-emerald-400 mt-0.5 shrink-0" />
                  ) : check.warning ? (
                    <AlertCircle className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                  )}
                  <div>
                    <p className={cn('font-medium', check.ok ? 'text-gray-300' : check.warning ? 'text-yellow-300' : 'text-red-300')}>
                      {check.label}
                    </p>
                    {!check.ok && check.message && (
                      <p className="text-xs text-gray-500">{check.message}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Lines */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader>
            <CardTitle className="text-sm text-gray-300 flex items-center gap-2">
              <FileText className="h-4 w-4 text-purple-400" />
              Lignes du devis
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-gray-400">Désignation</TableHead>
                  <TableHead className="text-gray-400 text-right">Qté</TableHead>
                  <TableHead className="text-gray-400 text-right">Unité</TableHead>
                  <TableHead className="text-gray-400 text-right">PU HT</TableHead>
                  <TableHead className="text-gray-400 text-right">TVA</TableHead>
                  <TableHead className="text-gray-400 text-right">Total HT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quote.quote_line.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                      Aucune ligne
                    </TableCell>
                  </TableRow>
                ) : (
                  quote.quote_line.map((line) => (
                    <TableRow key={line.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="text-white">
                        <p className="font-medium">{line.label}</p>
                        {line.description && <p className="text-xs text-gray-400">{line.description}</p>}
                      </TableCell>
                      <TableCell className="text-right text-gray-300">{line.quantity}</TableCell>
                      <TableCell className="text-right text-gray-300">{line.unit ?? '—'}</TableCell>
                      <TableCell className="text-right text-gray-300">{formatCurrency(line.unit_price_ht ?? 0)}</TableCell>
                      <TableCell className="text-right text-gray-300">{line.vat_rate != null ? `${line.vat_rate}%` : '—'}</TableCell>
                      <TableCell className="text-right text-white font-medium">{formatCurrency(line.total_ht ?? 0)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Audit log */}
        {auditLogs.length > 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader>
              <CardTitle className="text-sm text-gray-300 flex items-center gap-2">
                <History className="h-4 w-4 text-gray-400" />
                Historique
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                  <div className="flex-1">
                    <p className="text-gray-300">{log.action}</p>
                    <p className="text-xs text-gray-500">{log.created_at ? formatDate(log.created_at) : '—'}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
