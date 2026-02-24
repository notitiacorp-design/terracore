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
  envoyee: { label: 'Envoy\u00e9e', className: 'bg-blue-100 text-blue-700 border-blue-200' },
  payee: { label: 'Pay\u00e9e', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  partiellement_payee: { label: 'Part. pay\u00e9e', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  en_retard: { label: 'En retard', className: 'bg-red-100 text-red-700 border-red-200' },
  annulee: { label: 'Annul\u00e9e', className: 'bg-gray-100 text-gray-500 border-gray-200' },
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
  cheque: 'Ch\u00e8que',
  cb: 'Carte bancaire',
  especes: 'Esp\u00e8ces',
  prelevement: 'Pr\u00e9l\u00e8vement',
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
        // FIX 4: Use 'reminder_workflow_id' instead of 'workflow_id'
        const { data: messages } = await supabase
          .from('reminder_message')
          .select('*')
          .eq('reminder_workflow_id', workflowRes.data.id)
          .order('sent_at');
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
      toast({ title: 'Facture envoy\u00e9e', description: 'Le statut a \u00e9t\u00e9 mis \u00e0 jour.' });
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
      // FIX 1: Use 'remaining_due' instead of 'remaining_ttc'
      const { error } = await supabase
        .from('invoice')
        .update({ status: 'payee', remaining_due: 0 })
        .eq('id', invoice.id);
      if (error) throw error;
      toast({ title: 'Facture marqu\u00e9e pay\u00e9e', description: 'Le statut a \u00e9t\u00e9 mis \u00e0 jour.' });
      await fetchInvoice();
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de marquer la facture comme pay\u00e9e.', variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleStopWorkflow = async () => {
    if (!invoice?.workflow) return;
    setActionLoading('workflow');
    try {
      // FIX 2: Use 'stop_reason' instead of 'stopped_reason'
      const { error } = await supabase
        .from('reminder_workflow')
        .update({ is_active: false, stopped_at: new Date().toISOString(), stop_reason: 'Arr\u00eat manuel' })
        .eq('id', invoice.workflow.id);
      if (error) throw error;
      toast({ title: 'Workflow arr\u00eat\u00e9', description: 'Les relances automatiques ont \u00e9t\u00e9 d\u00e9sactiv\u00e9es.' });
      await fetchInvoice();
    } catch {
      toast({ title: 'Erreur', description: "Impossible d'arr\u00eater le workflow.", variant: 'destructive' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleStartWorkflow = async () => {
    if (!invoice) return;
    setActionLoading('workflow');
    try {
      // FIX 3: Remove 'auto_send' and 'next_reminder_at' — not in schema
      const { error } = await supabase.from('reminder_workflow').insert({
        company_id: invoice.company_id,
        invoice_id: invoice.id,
        client_id: invoice.client_id,
        current_level: 'relance_1',
        is_active: true,
        started_at: new Date().toISOString(),
      });
      if (error) throw error;
      toast({ title: 'Workflow d\u00e9marr\u00e9', description: 'Les relances automatiques ont \u00e9t\u00e9 activ\u00e9es.' });
      await fetchInvoice();
    } catch {
      toast({ title: 'Erreur', description: 'Impossible de d\u00e9marrer le workflow.', variant: 'destructive' });
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
    invoice && invoice.total_ttc > 0
      ? ((invoice.total_ttc - (invoice.remaining_due ?? 0)) / invoice.total_ttc) * 100
      : 0;

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
            <p className="text-sm text-gray-400">D\u00e9tail de la facture</p>
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
                {/* FIX 5: Removed address/postal_code/city — not on client table */}
              </div>
            </div>

            <Separator className="bg-white/10" />

            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">\u00c9mission</p>
                  <p className="text-sm font-medium text-white">
                    {invoice.date_emission ? formatDate(invoice.date_emission) : '\u2014'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-gray-400 shrink-0" />
                <div>
                  <p className="text-xs text-gray-400">\u00c9ch\u00e9ance</p>
                  <p
                    className={cn(
                      'text-sm font-medium',
                      status === 'en_retard' ? 'text-red-400' : 'text-white'
                    )}
                  >
                    {invoice.date_due ? formatDate(invoice.date_due) : '\u2014'}
                  </p>
                </div>
              </div>
            </div>

            {invoice.title && (
              <div>
                <p className="text-xs text-gray-400 mb-1">Objet</p>
                <p className="text-sm text-white">{invoice.title}</p>
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
              <span className="text-gray-400">Pay\u00e9</span>
              <span className="text-emerald-400 font-medium">{formatCurrency(totalPaid)}</span>
            </div>
            <Progress value={paymentProgress} className="h-2 bg-white/10" />
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Restant d\u00fb</span>
              <span className="text-white font-medium">{formatCurrency(invoice.remaining_due ?? 0)}</span>
            </div>
            <Separator className="bg-white/10" />
            <div className="flex justify-between">
              <span className="text-gray-400 text-sm">Total TTC</span>
              <span className="text-white font-bold">{formatCurrency(invoice.total_ttc)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Invoice Lines */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <FileText className="h-4 w-4 text-emerald-400" />
              Lignes de facturation
            </CardTitle>
          </CardHeader>
          <CardContent className="px-0 pb-4">
            {invoice.lines.length === 0 ? (
              <p className="text-gray-400 text-sm px-4">Aucune ligne.</p>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-gray-400">D\u00e9signation</TableHead>
                      <TableHead className="text-gray-400 text-right">Qté</TableHead>
                      <TableHead className="text-gray-400 text-right">PU HT</TableHead>
                      <TableHead className="text-gray-400 text-right">TVA</TableHead>
                      <TableHead className="text-gray-400 text-right">Total HT</TableHead>
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
                        <TableCell className="text-gray-300 text-right">
                          {line.vat_rate}%
                        </TableCell>
                        <TableCell className="text-white font-medium text-right">
                          {formatCurrency(line.total_ht)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Totals */}
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-4 space-y-2">
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
              <span className="text-white font-bold">Total TTC</span>
              <span className="text-white font-bold text-lg">{formatCurrency(invoice.total_ttc)}</span>
            </div>
          </CardContent>
        </Card>

        {/* Payments */}
        {invoice.payments.length > 0 && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
                <Euro className="h-4 w-4 text-emerald-400" />
                R\u00e8glements re\u00e7us
              </CardTitle>
            </CardHeader>
            <CardContent className="px-0 pb-4">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10 hover:bg-transparent">
                    <TableHead className="text-gray-400">Date</TableHead>
                    <TableHead className="text-gray-400">Mode</TableHead>
                    <TableHead className="text-gray-400">R\u00e9f\u00e9rence</TableHead>
                    <TableHead className="text-gray-400 text-right">Montant</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoice.payments.map((payment) => (
                    <TableRow key={payment.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="text-gray-300">
                        {payment.payment_date ? formatDate(payment.payment_date) : '\u2014'}
                      </TableCell>
                      <TableCell className="text-gray-300">
                        {paymentMethodLabels[payment.payment_method as PaymentMethod] ?? payment.payment_method}
                      </TableCell>
                      <TableCell className="text-gray-300">{payment.reference || '\u2014'}</TableCell>
                      <TableCell className="text-emerald-400 font-medium text-right">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Reminder Workflow */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-base font-semibold text-white flex items-center gap-2">
              <Bell className="h-4 w-4 text-emerald-400" />
              Workflow de relance
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {invoice.workflow ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white font-medium">
                      Niveau actuel :{' '}
                      <span
                        className={cn(
                          reminderLevelConfig[
                            invoice.workflow.current_level as ReminderLevel
                          ]?.color ?? 'text-white'
                        )}
                      >
                        {reminderLevelConfig[
                          invoice.workflow.current_level as ReminderLevel
                        ]?.label ?? invoice.workflow.current_level}
                      </span>
                    </p>
                    {invoice.workflow.last_action_at && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Derni\u00e8re action : {formatDate(invoice.workflow.last_action_at)}
                      </p>
                    )}
                  </div>
                  <Badge className="bg-emerald-900/40 text-emerald-400 border-emerald-700 text-xs">
                    Actif
                  </Badge>
                </div>

                {invoice.workflow.messages.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-400 font-medium">Messages envoy\u00e9s</p>
                    {invoice.workflow.messages.map((msg) => (
                      <div
                        key={msg.id}
                        className="bg-white/5 rounded-lg p-3 text-sm"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-gray-300 font-medium">{msg.subject}</span>
                          <span className="text-xs text-gray-500">
                            {msg.sent_at ? formatDate(msg.sent_at) : '\u2014'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">
                          Canal : {msg.channel} | Niveau : {msg.level}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full border-red-700 text-red-400 hover:bg-red-900/20 min-h-[48px]"
                      disabled={actionLoading === 'workflow'}
                    >
                      {actionLoading === 'workflow' ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <BellOff className="h-4 w-4 mr-2" />
                      )}
                      Arr\u00eater le workflow
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="bg-[#1a1a2e] border-white/10 text-white">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Arr\u00eater le workflow de relance ?</AlertDialogTitle>
                      <AlertDialogDescription className="text-gray-400">
                        Les relances automatiques seront d\u00e9sactiv\u00e9es pour cette facture.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="border-white/10 text-white hover:bg-white/10">
                        Annuler
                      </AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-red-600 hover:bg-red-700"
                        onClick={handleStopWorkflow}
                      >
                        Arr\u00eater
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-400">
                  Aucun workflow actif. Activez les relances automatiques pour cette facture.
                </p>
                <Button
                  className="w-full bg-emerald-600 hover:bg-emerald-700 min-h-[48px]"
                  onClick={handleStartWorkflow}
                  disabled={actionLoading === 'workflow' || status === 'payee' || status === 'annulee'}
                >
                  {actionLoading === 'workflow' ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Bell className="h-4 w-4 mr-2" />
                  )}
                  D\u00e9marrer le workflow
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Actions */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-base font-semibold text-white">Actions</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {status === 'brouillon' && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="w-full bg-blue-600 hover:bg-blue-700 min-h-[48px]"
                    disabled={actionLoading === 'send'}
                  >
                    {actionLoading === 'send' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Marquer comme envoy\u00e9e
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#1a1a2e] border-white/10 text-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Envoyer la facture ?</AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-400">
                      Le statut passera \u00e0 &ldquo;Envoy\u00e9e&rdquo;.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-white/10 text-white hover:bg-white/10">
                      Annuler
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={handleSendInvoice}
                    >
                      Confirmer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {(status === 'envoyee' || status === 'partiellement_payee' || status === 'en_retard') && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700 min-h-[48px]"
                    disabled={actionLoading === 'pay'}
                  >
                    {actionLoading === 'pay' ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Marquer comme pay\u00e9e
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-[#1a1a2e] border-white/10 text-white">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Marquer comme pay\u00e9e ?</AlertDialogTitle>
                    <AlertDialogDescription className="text-gray-400">
                      Le solde restant sera r\u00e9initialis\u00e9 \u00e0 z\u00e9ro.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="border-white/10 text-white hover:bg-white/10">
                      Annuler
                    </AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-emerald-600 hover:bg-emerald-700"
                      onClick={handleMarkPaid}
                    >
                      Confirmer
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {status === 'en_retard' && (
              <div className="flex items-center gap-2 p-3 bg-red-900/20 border border-red-700/40 rounded-lg">
                <AlertTriangle className="h-4 w-4 text-red-400 shrink-0" />
                <p className="text-sm text-red-300">Cette facture est en retard de paiement.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes */}
        {(invoice.notes_public || invoice.notes_internal) && (
          <Card className="bg-white/5 border-white/10">
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-base font-semibold text-white">Notes</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 space-y-3">
              {invoice.notes_public && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Notes publiques</p>
                  <p className="text-sm text-white whitespace-pre-wrap">{invoice.notes_public}</p>
                </div>
              )}
              {invoice.notes_internal && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Notes internes</p>
                  <p className="text-sm text-white whitespace-pre-wrap">{invoice.notes_internal}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
