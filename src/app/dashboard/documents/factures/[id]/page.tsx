'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn, formatDate, formatCurrency } from '@/lib/utils';
import type {
  InvoiceRow,
  InvoiceLineRow,
  ClientRow,
  PaymentRow,
  DepositInvoiceRow,
  ReminderWorkflowRow,
  ReminderMessageRow,
} from '@/types/database';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { toast } from '@/components/ui/use-toast';
import {
  ArrowLeft,
  Send,
  CheckCircle,
  Link as LinkIcon,
  FileText,
  Bell,
  BellOff,
  Clock,
  AlertTriangle,
  Euro,
  Calendar,
  User,
  Building2,
  Loader2,
} from 'lucide-react';

type InvoiceStatus = 'brouillon' | 'envoyee' | 'payee' | 'partiellement_payee' | 'en_retard' | 'annulee';
type ReminderLevel = 'relance_1' | 'relance_2' | 'relance_3' | 'mise_en_demeure' | 'contentieux';
type PaymentMethod = 'virement' | 'cheque' | 'cb' | 'especes' | 'prelevement';

interface InvoiceWithDetails extends InvoiceRow {
  client: ClientRow | null;
  lines: InvoiceLineRow[];
  payments: PaymentRow[];
  deposits: DepositInvoiceRow[];
  workflow: (ReminderWorkflowRow & { messages: ReminderMessageRow[] }) | null;
}

const statusConfig: Record<InvoiceStatus, { label: string; className: string }> = {
  brouillon: { label: 'Brouillon', className: 'bg-gray-100 text-gray-700 border-gray-200' },
  envoyee: { label: 'Envoyée', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  payee: { label: 'Payée', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  partiellement_payee: { label: 'Part. payée', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  en_retard: { label: 'En retard', className: 'bg-red-100 text-red-700 border-red-200' },
  annulee: { label: 'Annulée', className: 'bg-gray-100 text-gray-500 border-gray-200' },
};

const reminderLevelConfig: Record<ReminderLevel, { label: string; color: string }> = {
  relance_1: { label: 'Relance 1', color: 'text-yellow-600' },
  relance_2: { label: 'Relance 2', color: 'text-orange-600' },
  relance_3: { label: 'Relance 3', color: 'text-red-500' },
  mise_en_demeure: { label: 'Mise en demeure', color: 'text-red-700' },
  contentieux: { label: 'Contentieux', color: 'text-red-900' },
};

const paymentMethodLabels: Record<PaymentMethod, string> = {
  virement: 'Virement',
  cheque: 'Chèque',
  cb: 'Carte bancaire',
  especes: 'Espèces',
  prelevement: 'Prélèvement',
};

export default function FactureDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [invoice, setInvoice] = useState<InvoiceWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const supabase = createClient();

  const fetchInvoice = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoice')
        .select('*')
        .eq('id', id)
        .single();

      if (invoiceError || !invoiceData) {
        toast({ title: 'Erreur', description: 'Facture introuvable.', variant: 'destructive' });
        router.push('/dashboard/documents/factures');
        return;
      }

      const [clientRes, linesRes, paymentsRes, depositsRes, workflowRes] = await Promise.all([
        supabase.from('client').select('*').eq('id', invoiceData.client_id).single(),
        supabase.from('invoice_line').select('*').eq('invoice_id', id).order('sort_order'),
        supabase.from('payment').select('*').eq('invoice_id', id).order('payment_date'),
        supabase.from('deposit_invoice').select('*').eq('invoice_id', id).order('created_at'),
        supabase
          .from('reminder_workflow')
          .select('*')
          .eq('invoice_id', id)
          .eq('is_active', true)
          .maybeSingle(),
      ]);

      let workflowWithMessages = null;
      if (workflowRes.data) {
        const { data: messages } = await supabase
          .from('reminder_message')
          .select('*')
          .eq('workflow_id', workflowRes.data.id)
          .order('created_at');
        workflowWithMessages = { ...workflowRes.data, messages: messages || [] };
      }

      setInvoice({
        ...invoiceData,
        client: clientRes.data || null,
        lines: linesRes.data || [],
        payments: paymentsRes.data || [],
        deposits: depositsRes.data || [],
        workflow: workflowWithMessages,
      });
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de charger la facture.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handleSendInvoice = async () => {
    if (!invoice) return;
    setActionLoading('send');
    try {
      const { error } = await supabase
        .from('invoice')
        .update({ status: 'envoyee' })
        .eq('id', invoice.id);
      if (error) throw error;
      toast({ title: 'Facture envoyée', description: 'Le statut a été mis à jour.' });
      await fetchInvoice();
    } catch {
      toast({ title: 'Erreur', description: "Impossible d'envoyer la facture.", variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleMarkPaid = async () => {
    if (!invoice) return;
    setActionLoading('pay');
    try {
      const { error } = await supabase
        .from('invoice')
        .update({ status: 'payee', remaining_ttc: 0 })
        .eq('id', invoice.id);
      if (error) throw error;
      toast({ title: 'Facture marquée payée', description: 'Le statut a été mis à jour.' });
      await fetchInvoice();
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de marquer la facture comme payée.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopWorkflow = async () => {
    if (!invoice?.workflow) return;
    setActionLoading('workflow');
    try {
      const { error } = await supabase
        .from('reminder_workflow')
        .update({ is_active: false, stopped_at: new Date().toISOString(), stopped_reason: 'Arrêt manuel' })
        .eq('id', invoice.workflow.id);
      if (error) throw error;
      toast({ title: 'Workflow arrêté', description: 'Les relances automatiques ont été désactivées.' });
      await fetchInvoice();
    } catch {
      toast({ title: 'Erreur', description: "Impossible d'arrêter le workflow.", variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartWorkflow = async () => {
    if (!invoice) return;
    setActionLoading('workflow');
    try {
      const { error } = await supabase.from('reminder_workflow').insert({
        company_id: invoice.company_id,
        invoice_id: invoice.id,
        client_id: invoice.client_id,
        current_level: 'relance_1',
        is_active: true,
        auto_send: true,
        next_reminder_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });
      if (error) throw error;
      toast({ title: 'Workflow démarré', description: 'Les relances automatiques ont été activées.' });
      await fetchInvoice();
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de démarrer le workflow.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const getClientDisplayName = (client: ClientRow | null) => {
    if (!client) return 'Client inconnu';
    if (client.client_type === 'pro' && client.company_name) return client.company_name;
    return `${client.first_name || ''} ${client.last_name || ''}`.trim() || 'Client inconnu';
  };

  const totalPaid = invoice?.payments.reduce((sum, p) => sum + (p.amount || 0), 0) ?? 0;
  const paymentProgress =
    invoice && invoice.total_ttc > 0 ? ((invoice.total_ttc - (invoice.remaining_ttc ?? 0)) / invoice.total_ttc) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#1a1a2e]">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  if (!invoice) return null;

  const status = invoice.status as InvoiceStatus;
  const statusCfg = statusConfig[status] ?? { label: status, className: 'bg-gray-100 text-gray-700' };

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white">
      {/* Mobile-first container */}
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Header Navigation */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="min-h-[48px] min-w-[48px] text-white hover:bg-white/10"
            onClick={() => router.push('/dashboard/documents/factures')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-white truncate">{invoice.reference}</h1>
            <p className="text-sm text-gray-400">Détail de la facture</p>
          </div>
          <Badge className={cn('border text-xs font-medium whitespace-nowrap', statusCfg.className)}>
            {statusCfg.label}
          </Badge>
        </div>

        {/* Client & Dates Card */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-start gap-3">
              {invoice.client?.client_type === 'pro' ? (
                <Building2 className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
              ) : (
                <User className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
              )}
              <div className="min-w-0">
                <p className="font-semibold text-white">{getClientDisplayName(invoice.client)}</p>
                {invoice.client?.email && (
                  <p className="text-sm text-gray-400 truncate">{invoice.client.email}</p>
                )}
                {invoice.client?.phone && (
                  <p className="text-sm text-gray-400">{invoice.client.phone}</p>
                )}
                {invoice.client?.address && (
                  <p className="text-sm text-gray-400">
                    {invoice.client.address}, {invoice.client.postal_code} {invoice.client.city}
                  </p>
                )}
              </div>
            </div>

            <Separator className="bg-white/10" />

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Émission</p>
                  <p className="text-sm font-medium text-white">
                    {invoice.date_emission ? formatDate(invoice.date_emission) : '—'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">Échéance</p>
                  <p
                    className={cn(
                      'text-sm font-medium',
                      status === 'en_retard' ? 'text-red-400' : 'text-white'
                    )}
                  >
                    {invoice.date_echeance ? formatDate(invoice.date_echeance) : '—'}
                  </p>
                </div>
              </div>
            </div>

            {invoice.object && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Objet</p>
                <p className="text-sm text-white">{invoice.object}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Progress */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <Euro className="h-4 w-4 text-emerald-400" />
              Avancement du paiement
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Payé</span>
              <span className="text-emerald-400 font-medium">
                {formatCurrency(invoice.total_ttc - (invoice.remaining_ttc ?? invoice.total_ttc))}
              </span>
            </div>
            <Progress
              value={paymentProgress}
              className="h-3 bg-white/10 [&>div]:bg-emerald-500"
            />
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Restant dû</span>
              <span
                className={cn(
                  'font-semibold',
                  (invoice.remaining_ttc ?? 0) > 0 ? 'text-red-400' : 'text-emerald-400'
                )}
              >
                {formatCurrency(invoice.remaining_ttc ?? 0)}
              </span>
            </div>
            <Separator className="bg-white/10" />
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Total TTC</span>
              <span className="text-white font-bold text-base">{formatCurrency(invoice.total_ttc)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          {status === 'brouillon' && (
            <Button
              className="min-h-[48px] bg-blue-600 hover:bg-blue-700 text-white col-span-2"
              onClick={handleSendInvoice}
              disabled={actionLoading === 'send'}
            >
              {actionLoading === 'send' ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Envoyer la facture
            </Button>
          )}

          {(status === 'envoyee' || status === 'partiellement_payee' || status === 'en_retard') && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  className="min-h-[48px] bg-emerald-600 hover:bg-emerald-700 text-white"
                  disabled={actionLoading === 'pay'}
                >
                  {actionLoading === 'pay' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Marquer payée
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-[#1a1a2e] border-white/10 text-white">
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmer le paiement</AlertDialogTitle>
                  <AlertDialogDescription className="text-gray-400">
                    Voulez-vous marquer cette facture comme entièrement payée ?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">
                    Annuler
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleMarkPaid}
                    className="bg-emerald-600 hover:bg-emerald-700"
                  >
                    Confirmer
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}

          <Button
            variant="outline"
            className="min-h-[48px] border-white/20 text-white hover:bg-white/10"
            onClick={() => {
              toast({ title: 'Lien de paiement', description: 'Fonctionnalité Stripe en cours de déploiement.' });
            }}
          >
            <LinkIcon className="h-4 w-4 mr-2 text-emerald-400" />
            Lien Stripe
          </Button>

          <Button
            variant="outline"
            className="min-h-[48px] border-white/20 text-white hover:bg-white/10"
            onClick={() => {
              toast({ title: 'Export PDF', description: 'Génération du PDF en cours.' });
            }}
          >
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
        </div>

        {/* Invoice Lines */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-base font-semibold text-white">Lignes de facturation</CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-0">
            {invoice.lines.length === 0 ? (
              <p className="text-gray-400 text-sm px-4 pb-4">Aucune ligne.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-gray-400 font-medium">Désignation</TableHead>
                      <TableHead className="text-gray-400 font-medium text-right">Qté</TableHead>
                      <TableHead className="text-gray-400 font-medium text-right">PU HT</TableHead>
                      <TableHead className="text-gray-400 font-medium text-right">TVA</TableHead>
                      <TableHead className="text-gray-400 font-medium text-right">Total HT</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.lines.map((line) => (
                      <TableRow key={line.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="text-white">
                          <p className="font-medium">{line.label}</p>
                          {line.description && (
                            <p className="text-xs text-gray-400 mt-0.5">{line.description}</p>
                          )}
                        </TableCell>
                        <TableCell className="text-gray-300 text-right">
                          {line.quantity} {line.unit}
                        </TableCell>
                        <TableCell className="text-gray-300 text-right">
                          {formatCurrency(line.unit_price_ht)}
                        </TableCell>
                        <TableCell className="text-gray-300 text-right">{line.tva_rate}%</TableCell>
                        <TableCell className="text-white font-medium text-right">
                          {formatCurrency(line.total_ht)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Totals */}
            <div className="border-t border-white/10 px-4 py-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Total HT</span>
                <span className="text-white">{formatCurrency(invoice.total_ht)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">TVA</span>
                <span className="text-white">{formatCurrency(invoice.total_tva)}</span>
              </div>
              <Separator className="bg-white/10" />
              <div className="flex justify-between">
                <span className="font-bold text-white">Total TTC</span>
                <span className="font-bold text-white text-lg">{formatCurrency(invoice.total_ttc)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Payments */}
        {invoice.payments.length > 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                Paiements reçus
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-gray-400 font-medium">Date</TableHead>
                      <TableHead className="text-gray-400 font-medium">Méthode</TableHead>
                      <TableHead className="text-gray-400 font-medium">Référence</TableHead>
                      <TableHead className="text-gray-400 font-medium text-right">Montant</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.payments.map((payment) => (
                      <TableRow key={payment.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="text-gray-300">
                          {payment.payment_date ? formatDate(payment.payment_date) : '—'}
                        </TableCell>
                        <TableCell className="text-gray-300">
                          {paymentMethodLabels[payment.payment_method as PaymentMethod] || payment.payment_method}
                        </TableCell>
                        <TableCell className="text-gray-300">{payment.reference || '—'}</TableCell>
                        <TableCell className="text-emerald-400 font-medium text-right">
                          {formatCurrency(payment.amount)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <div className="flex justify-between px-4 py-3 border-t border-white/10">
                <span className="font-semibold text-white">Total encaissé</span>
                <span className="font-bold text-emerald-400">{formatCurrency(totalPaid)}</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Deposits */}
        {invoice.deposits.length > 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-base font-semibold text-white">Acomptes liés</CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-gray-400 font-medium">Référence</TableHead>
                      <TableHead className="text-gray-400 font-medium">Date</TableHead>
                      <TableHead className="text-gray-400 font-medium">Statut</TableHead>
                      <TableHead className="text-gray-400 font-medium text-right">Montant TTC</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoice.deposits.map((deposit) => (
                      <TableRow key={deposit.id} className="border-white/10 hover:bg-white/5">
                        <TableCell className="text-white font-medium">{deposit.reference}</TableCell>
                        <TableCell className="text-gray-300">
                          {deposit.date_emission ? formatDate(deposit.date_emission) : '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            className={cn(
                              'text-xs border',
                              statusConfig[deposit.status as InvoiceStatus]?.className ?? 'bg-gray-100 text-gray-700'
                            )}
                          >
                            {statusConfig[deposit.status as InvoiceStatus]?.label ?? deposit.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-white font-medium text-right">
                          {formatCurrency(deposit.amount_ttc)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Reminder Workflow */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2 px-4 pt-4">
            <div className="flex items-center justify-between gap-3">
              <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                <Bell className="h-4 w-4 text-emerald-400" />
                Workflow de relance
              </CardTitle>
              {invoice.workflow ? (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className="min-h-[40px] border-red-500/30 text-red-400 hover:bg-red-500/10"
                      disabled={actionLoading === 'workflow'}
                    >
                      {actionLoading === 'workflow' ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <BellOff className="h-4 w-4 mr-1" />
                      )}
                      Arrêter
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-[#1a1a2e] border-white/10 text-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Arrêter les relances</AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-400">
                        Voulez-vous désactiver le workflow de relance automatique pour cette facture ?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">
                        Annuler
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={handleStopWorkflow}
                        className="bg-red-600 hover:bg-red-700"
                      >
                        Arrêter
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              ) : (
                <Button
                  size="sm"
                  className="min-h-[40px] bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={handleStartWorkflow}
                  disabled={
                    actionLoading === 'workflow' ||
                    status === 'payee' ||
                    status === 'annulee' ||
                    status === 'brouillon'
                  }
                >
                  {actionLoading === 'workflow' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Bell className="h-4 w-4 mr-1" />
                  )}
                  Démarrer
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {invoice.workflow ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                  <div
                    className={cn(
                      'flex items-center gap-2 font-medium',
                      reminderLevelConfig[invoice.workflow.current_level as ReminderLevel]?.color ?? 'text-white'
                    )}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    {reminderLevelConfig[invoice.workflow.current_level as ReminderLevel]?.label ?? invoice.workflow.current_level}
                  </div>
                  <Separator orientation="vertical" className="h-4 bg-white/20" />
                  <div className="text-sm text-gray-400">
                    Prochaine relance :{' '}
                    <span className="text-white">
                      {invoice.workflow.next_reminder_at
                        ? formatDate(invoice.workflow.next_reminder_at)
                        : '—'}
                    </span>
                  </div>
                  <div className="ml-auto">
                    <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                      Actif
                    </Badge>
                  </div>
                </div>

                {/* Messages Timeline */}
                {invoice.workflow.messages.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-400 mb-3">Historique des envois</p>
                    <div className="space-y-3">
                      {invoice.workflow.messages.map((msg, index) => (
                        <div key={msg.id} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div
                              className={cn(
                                'h-2.5 w-2.5 rounded-full mt-1 shrink-0',
                                msg.status === 'sent' ? 'bg-emerald-400' : 'bg-red-400'
                              )}
                            />
                            {index < invoice.workflow!.messages.length - 1 && (
                              <div className="w-px flex-1 bg-white/10 mt-1" />
                            )}
                          </div>
                          <div className="pb-3 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={cn(
                                  'text-sm font-medium',
                                  reminderLevelConfig[msg.level as ReminderLevel]?.color ?? 'text-white'
                                )}
                              >
                                {reminderLevelConfig[msg.level as ReminderLevel]?.label ?? msg.level}
                              </span>
                              <span className="text-xs text-gray-400">
                                via {msg.channel === 'email' ? 'Email' : msg.channel}
                              </span>
                              {msg.sent_at && (
                                <span className="text-xs text-gray-500">
                                  {formatDate(msg.sent_at)}
                                </span>
                              )}
                              <Badge
                                className={cn(
                                  'text-xs border ml-auto',
                                  msg.status === 'sent'
                                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                    : 'bg-red-500/10 text-red-400 border-red-500/20'
                                )}
                              >
                                {msg.status === 'sent' ? 'Envoyé' : 'Échec'}
                              </Badge>
                            </div>
                            {msg.subject && (
                              <p className="text-xs text-gray-400 mt-0.5 truncate">{msg.subject}</p>
                            )}
                            {msg.error_message && (
                              <p className="text-xs text-red-400 mt-0.5">{msg.error_message}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <BellOff className="h-8 w-8 text-gray-500 mx-auto mb-2" />
                <p className="text-sm text-gray-400">Aucun workflow de relance actif.</p>
                {(status === 'envoyee' || status === 'partiellement_payee' || status === 'en_retard') && (
                  <p className="text-xs text-gray-500 mt-1">
                    Démarrez le workflow pour envoyer des relances automatiques.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        {invoice.notes && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-base font-semibold text-white">Notes internes</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-sm text-gray-300 whitespace-pre-wrap">{invoice.notes}</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
