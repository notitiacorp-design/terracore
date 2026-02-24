'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn, formatDate, formatCurrency } from '@/lib/utils';
import type {
  ReminderWorkflowRow,
  ReminderMessageRow,
  InvoiceRow,
  ClientRow,
  PaymentRow,
} from '@/types/database';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  BellRing,
  AlertTriangle,
  Euro,
  TrendingDown,
  Eye,
  StopCircle,
  Mail,
  MessageSquare,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Play,
  ChevronRight,
  BarChart3,
} from 'lucide-react';
import { toast } from 'sonner';

type ReminderLevel = 'relance_1' | 'relance_2' | 'relance_3' | 'mise_en_demeure' | 'contentieux';

interface WorkflowWithRelations extends ReminderWorkflowRow {
  client: ClientRow | null;
  invoice: InvoiceRow | null;
  reminder_message: ReminderMessageRow[];
}

interface InvoiceWithPayments extends InvoiceRow {
  payments: PaymentRow[];
}

const LEVEL_CONFIG: Record<
  ReminderLevel,
  { label: string; color: string; bgColor: string; borderColor: string; score: number }
> = {
  relance_1: {
    label: 'Relance 1',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/20',
    borderColor: 'border-blue-500/40',
    score: 80,
  },
  relance_2: {
    label: 'Relance 2',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500/40',
    score: 55,
  },
  relance_3: {
    label: 'Relance 3',
    color: 'text-orange-400',
    bgColor: 'bg-orange-500/20',
    borderColor: 'border-orange-500/40',
    score: 35,
  },
  mise_en_demeure: {
    label: 'Mise en demeure',
    color: 'text-red-400',
    bgColor: 'bg-red-500/20',
    borderColor: 'border-red-500/40',
    score: 15,
  },
  contentieux: {
    label: 'Contentieux',
    color: 'text-red-600',
    bgColor: 'bg-red-700/30',
    borderColor: 'border-red-700/50',
    score: 5,
  },
};

function LevelBadge({ level }: { level: ReminderLevel }) {
  const cfg = LEVEL_CONFIG[level];
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border',
        cfg.bgColor,
        cfg.color,
        cfg.borderColor
      )}
    >
      {cfg.label}
    </span>
  );
}

function RiskScore({ score }: { score: number }) {
  const color =
    score >= 70
      ? 'text-emerald-400'
      : score >= 40
      ? 'text-yellow-400'
      : score >= 20
      ? 'text-orange-400'
      : 'text-red-400';
  const label =
    score >= 70
      ? 'Bon'
      : score >= 40
      ? 'Moyen'
      : score >= 20
      ? 'Risqué'
      : 'Critique';
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={cn('text-2xl font-bold', color)}>{score}</div>
      <div className={cn('text-xs font-medium', color)}>{label}</div>
      <div className="w-full bg-white/10 rounded-full h-1.5 mt-1">
        <div
          className={cn(
            'h-1.5 rounded-full transition-all',
            score >= 70
              ? 'bg-emerald-400'
              : score >= 40
              ? 'bg-yellow-400'
              : score >= 20
              ? 'bg-orange-400'
              : 'bg-red-400'
          )}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
}

function ReminderTimeline({ messages }: { messages: ReminderMessageRow[] }) {
  if (messages.length === 0) {
    return (
      <div className="text-center text-white/40 py-6 text-sm">
        Aucun message envoyé pour l'instant.
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-white/10" />
      <div className="space-y-4">
        {messages.map((msg, i) => {
          const level = msg.level as ReminderLevel;
          const cfg = LEVEL_CONFIG[level] ?? LEVEL_CONFIG['relance_1'];
          const isEmail = msg.channel === 'email';
          const isSent = msg.status === 'sent';
          return (
            <div key={msg.id} className="relative flex gap-3">
              <div
                className={cn(
                  'absolute -left-6 top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center',
                  isSent
                    ? 'bg-emerald-500/20 border-emerald-500'
                    : 'bg-red-500/20 border-red-500'
                )}
              >
                {isSent ? (
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                ) : (
                  <XCircle className="w-3 h-3 text-red-400" />
                )}
              </div>
              <div
                className={cn(
                  'flex-1 rounded-lg border p-3 text-sm',
                  cfg.bgColor,
                  cfg.borderColor
                )}
              >
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    {isEmail ? (
                      <Mail className="w-3.5 h-3.5 text-white/60" />
                    ) : (
                      <MessageSquare className="w-3.5 h-3.5 text-white/60" />
                    )}
                    <span className={cn('font-semibold text-xs', cfg.color)}>
                      {cfg.label}
                    </span>
                    <span className="text-white/40 text-xs">
                      {isEmail ? 'Email' : 'SMS'}
                    </span>
                  </div>
                  <span className="text-white/40 text-xs">
                    {msg.sent_at ? formatDate(msg.sent_at) : '—'}
                  </span>
                </div>
                {msg.subject && (
                  <div className="mt-1.5 font-medium text-white/80">{msg.subject}</div>
                )}
                {msg.error_message && (
                  <div className="mt-1 text-red-400 text-xs">
                    Erreur: {msg.error_message}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RelancesPage() {
  const supabase = createClient();

  const [workflows, setWorkflows] = useState<WorkflowWithRelations[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowWithRelations | null>(null);
  const [invoiceDetail, setInvoiceDetail] = useState<InvoiceWithPayments | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [triggeringId, setTriggeringId] = useState<string | null>(null);
  const [stoppingId, setStoppingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchWorkflows = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('reminder_workflow')
        .select(
          `
          *,
          client:client_id(*),
          invoice:invoice_id(*),
          reminder_message(*)
        `
        )
        .eq('is_active', true)
        .order('next_reminder_at', { ascending: true });

      if (error) throw error;
      setWorkflows((data as unknown as WorkflowWithRelations[]) ?? []);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      toast.error(`Erreur de chargement: ${message}`);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchWorkflows();
  }, [fetchWorkflows]);

  const fetchInvoiceDetail = useCallback(
    async (invoiceId: string) => {
      setLoadingDetail(true);
      try {
        const { data: inv, error: invErr } = await supabase
          .from('invoice')
          .select('*')
          .eq('id', invoiceId)
          .single();
        if (invErr) throw invErr;

        const { data: payments, error: payErr } = await supabase
          .from('payment')
          .select('*')
          .eq('invoice_id', invoiceId)
          .order('payment_date', { ascending: false });
        if (payErr) throw payErr;

        setInvoiceDetail({ ...(inv as InvoiceRow), payments: (payments as PaymentRow[]) ?? [] });
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue';
        toast.error(`Erreur détail facture: ${message}`);
      } finally {
        setLoadingDetail(false);
      }
    },
    [supabase]
  );

  const handleViewDetail = useCallback(
    async (wf: WorkflowWithRelations) => {
      setSelectedWorkflow(wf);
      setSheetOpen(true);
      if (wf.invoice_id) {
        await fetchInvoiceDetail(wf.invoice_id);
      }
    },
    [fetchInvoiceDetail]
  );

  const handleStop = useCallback(
    async (wf: WorkflowWithRelations) => {
      setStoppingId(wf.id);
      try {
        const { error } = await supabase
          .from('reminder_workflow')
          .update({
            is_active: false,
            stopped_at: new Date().toISOString(),
            stopped_reason: 'Arrêt manuel par utilisateur',
          })
          .eq('id', wf.id);
        if (error) throw error;
        toast.success('Workflow de relance arrêté.');
        await fetchWorkflows();
        if (selectedWorkflow?.id === wf.id) {
          setSheetOpen(false);
          setSelectedWorkflow(null);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue';
        toast.error(`Erreur: ${message}`);
      } finally {
        setStoppingId(null);
      }
    },
    [supabase, fetchWorkflows, selectedWorkflow]
  );

  const handleTrigger = useCallback(
    async (wf: WorkflowWithRelations) => {
      setTriggeringId(wf.id);
      try {
        const nextLevel = getNextLevel(wf.current_level as ReminderLevel);
        const { error } = await supabase.from('reminder_message').insert({
          workflow_id: wf.id,
          level: nextLevel ?? wf.current_level,
          channel: 'email',
          subject: `Relance ${LEVEL_CONFIG[nextLevel ?? (wf.current_level as ReminderLevel)]?.label} – Facture ${wf.invoice?.reference ?? ''}`,
          body: '',
          status: 'sent',
          sent_at: new Date().toISOString(),
        });
        if (error) throw error;

        if (nextLevel) {
          await supabase
            .from('reminder_workflow')
            .update({
              current_level: nextLevel,
              next_reminder_at: getNextReminderDate(nextLevel),
              updated_at: new Date().toISOString(),
            })
            .eq('id', wf.id);
        }

        toast.success('Relance envoyée avec succès.');
        await fetchWorkflows();
        if (selectedWorkflow?.id === wf.id) {
          await fetchInvoiceDetail(wf.invoice_id!);
          const updated = workflows.find((w) => w.id === wf.id);
          if (updated) setSelectedWorkflow(updated);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue';
        toast.error(`Erreur lors de la relance: ${message}`);
      } finally {
        setTriggeringId(null);
      }
    },
    [supabase, fetchWorkflows, fetchInvoiceDetail, selectedWorkflow, workflows]
  );

  const handleToggleAutoSend = useCallback(
    async (wf: WorkflowWithRelations) => {
      setTogglingId(wf.id);
      try {
        const { error } = await supabase
          .from('reminder_workflow')
          .update({ auto_send: !wf.auto_send, updated_at: new Date().toISOString() })
          .eq('id', wf.id);
        if (error) throw error;
        toast.success(`Envoi automatique ${!wf.auto_send ? 'activé' : 'désactivé'}.`);
        await fetchWorkflows();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Erreur inconnue';
        toast.error(`Erreur: ${message}`);
      } finally {
        setTogglingId(null);
      }
    },
    [supabase, fetchWorkflows]
  );

  // KPIs
  const totalActifs = workflows.length;
  const enRetard = workflows.filter((wf) => {
    if (!wf.invoice?.date_echeance) return false;
    return new Date(wf.invoice.date_echeance) < new Date();
  }).length;
  const montantDu = workflows.reduce((sum, wf) => {
    return sum + (wf.invoice?.remaining_ttc ?? 0);
  }, 0);
  const scoreMoyen =
    workflows.length > 0
      ? Math.round(
          workflows.reduce((sum, wf) => {
            const lvl = wf.current_level as ReminderLevel;
            return sum + (LEVEL_CONFIG[lvl]?.score ?? 50);
          }, 0) / workflows.length
        )
      : 0;

  const clientName = (client: ClientRow | null) => {
    if (!client) return '—';
    if (client.client_type === 'pro') return client.company_name ?? `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim();
    return `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim() || '—';
  };

  const isOverdue = (dateStr: string | null | undefined) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  return (
    <div
      className="min-h-screen bg-[#1a1a2e] text-white"
      style={{ fontFamily: 'Inter, system-ui, sans-serif' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <BellRing className="w-4 h-4 text-emerald-400" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Relances</h1>
              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs">
                Agent IA
              </Badge>
            </div>
            <p className="text-white/50 text-sm mt-1">
              Gestion automatisée des workflows de recouvrement
            </p>
          </div>
          <Button
            onClick={fetchWorkflows}
            variant="outline"
            className="min-h-[48px] border-white/20 bg-white/5 text-white hover:bg-white/10"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              {loading ? (
                <Skeleton className="h-16 bg-white/10 rounded" />
              ) : (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-white/50 text-xs">
                    <BellRing className="w-3.5 h-3.5" />
                    Total actifs
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-white">{totalActifs}</div>
                  <div className="text-xs text-white/30">workflows en cours</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              {loading ? (
                <Skeleton className="h-16 bg-white/10 rounded" />
              ) : (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-orange-400/80 text-xs">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    En retard
                  </div>
                  <div className="text-2xl sm:text-3xl font-bold text-orange-400">{enRetard}</div>
                  <div className="text-xs text-white/30">factures échues</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              {loading ? (
                <Skeleton className="h-16 bg-white/10 rounded" />
              ) : (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-red-400/80 text-xs">
                    <Euro className="w-3.5 h-3.5" />
                    Montant dû
                  </div>
                  <div className="text-lg sm:text-2xl font-bold text-red-400">
                    {formatCurrency(montantDu)}
                  </div>
                  <div className="text-xs text-white/30">TTC restant</div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/5 border-white/10">
            <CardContent className="p-4">
              {loading ? (
                <Skeleton className="h-16 bg-white/10 rounded" />
              ) : (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-white/50 text-xs">
                    <BarChart3 className="w-3.5 h-3.5" />
                    Score moyen
                  </div>
                  <RiskScore score={scoreMoyen} />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Main Table */}
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base sm:text-lg flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Workflows actifs
              {!loading && (
                <Badge className="bg-white/10 text-white/70 border-white/10 ml-auto">
                  {workflows.length} relance{workflows.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-4 space-y-3">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-14 bg-white/10 rounded" />
                ))}
              </div>
            ) : workflows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <CheckCircle2 className="w-10 h-10 text-emerald-400/50" />
                <p className="text-white/40 text-sm">Aucun workflow de relance actif.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-white/10 hover:bg-transparent">
                      <TableHead className="text-white/50 text-xs">Client</TableHead>
                      <TableHead className="text-white/50 text-xs">Facture</TableHead>
                      <TableHead className="text-white/50 text-xs text-right">Montant TTC</TableHead>
                      <TableHead className="text-white/50 text-xs">Échéance</TableHead>
                      <TableHead className="text-white/50 text-xs">Niveau</TableHead>
                      <TableHead className="text-white/50 text-xs">Prochaine relance</TableHead>
                      <TableHead className="text-white/50 text-xs">Auto</TableHead>
                      <TableHead className="text-white/50 text-xs text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {workflows.map((wf) => {
                      const overdue = isOverdue(wf.invoice?.date_echeance);
                      const level = wf.current_level as ReminderLevel;
                      return (
                        <TableRow
                          key={wf.id}
                          className="border-white/10 hover:bg-white/5 transition-colors"
                        >
                          <TableCell className="font-medium text-white text-sm">
                            <div className="flex flex-col">
                              <span>{clientName(wf.client)}</span>
                              {wf.client?.client_type === 'pro' && (
                                <span className="text-xs text-white/40">Pro</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-white/70 text-sm">
                            {wf.invoice?.reference ?? '—'}
                          </TableCell>
                          <TableCell className="text-right">
                            <span
                              className={cn(
                                'font-semibold text-sm',
                                overdue ? 'text-red-400' : 'text-white'
                              )}
                            >
                              {wf.invoice?.remaining_ttc != null
                                ? formatCurrency(wf.invoice.remaining_ttc)
                                : '—'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                'text-sm',
                                overdue ? 'text-red-400 font-semibold' : 'text-white/70'
                              )}
                            >
                              {wf.invoice?.date_echeance
                                ? formatDate(wf.invoice.date_echeance)
                                : '—'}
                            </span>
                            {overdue && (
                              <AlertTriangle className="inline w-3 h-3 text-red-400 ml-1" />
                            )}
                          </TableCell>
                          <TableCell>
                            <LevelBadge level={level} />
                          </TableCell>
                          <TableCell className="text-white/60 text-sm">
                            {wf.next_reminder_at
                              ? formatDate(wf.next_reminder_at)
                              : '—'}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={wf.auto_send ?? false}
                              onCheckedChange={() => handleToggleAutoSend(wf)}
                              disabled={togglingId === wf.id}
                              className="data-[state=checked]:bg-emerald-500"
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="min-h-[40px] min-w-[40px] hover:bg-white/10 text-white/70 hover:text-white"
                                      onClick={() => handleViewDetail(wf)}
                                    >
                                      <Eye className="w-4 h-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p>Voir détail</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      className="min-h-[40px] min-w-[40px] hover:bg-emerald-500/20 text-emerald-400 hover:text-emerald-300"
                                      onClick={() => handleTrigger(wf)}
                                      disabled={triggeringId === wf.id}
                                    >
                                      {triggeringId === wf.id ? (
                                        <RefreshCw className="w-4 h-4 animate-spin" />
                                      ) : (
                                        <Play className="w-4 h-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    <p>Lancer une relance</p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>

                              <AlertDialog>
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          size="icon"
                                          variant="ghost"
                                          className="min-h-[40px] min-w-[40px] hover:bg-red-500/20 text-red-400 hover:text-red-300"
                                          disabled={stoppingId === wf.id}
                                        >
                                          {stoppingId === wf.id ? (
                                            <RefreshCw className="w-4 h-4 animate-spin" />
                                          ) : (
                                            <StopCircle className="w-4 h-4" />
                                          )}
                                        </Button>
                                      </AlertDialogTrigger>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">
                                      <p>Stopper le workflow</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                                <AlertDialogContent className="bg-[#1a1a2e] border-white/20 text-white">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Stopper ce workflow ?</AlertDialogTitle>
                                    <AlertDialogDescription className="text-white/60">
                                      Vous êtes sur le point d'arrêter définitivement le workflow de
                                      relance pour la facture{' '}
                                      <strong className="text-white">
                                        {wf.invoice?.reference ?? '—'}
                                      </strong>.
                                      Cette action est irréversible.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel className="border-white/20 bg-white/5 text-white hover:bg-white/10">
                                      Annuler
                                    </AlertDialogCancel>
                                    <AlertDialogAction
                                      className="bg-red-500 hover:bg-red-600 text-white"
                                      onClick={() => handleStop(wf)}
                                    >
                                      Stopper
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detail Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl bg-[#1a1a2e] border-white/10 text-white overflow-y-auto"
        >
          {selectedWorkflow && (
            <>
              <SheetHeader className="pb-4 border-b border-white/10">
                <SheetTitle className="text-white flex items-center gap-2">
                  <BellRing className="w-5 h-5 text-emerald-400" />
                  Détail du workflow
                </SheetTitle>
                <SheetDescription className="text-white/50">
                  {clientName(selectedWorkflow.client)} –{' '}
                  {selectedWorkflow.invoice?.reference ?? '—'}
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-6 mt-6">
                {/* Invoice Summary */}
                <div>
                  <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">
                    Résumé de la facture
                  </h3>
                  {loadingDetail ? (
                    <div className="space-y-2">
                      {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} className="h-8 bg-white/10 rounded" />
                      ))}
                    </div>
                  ) : invoiceDetail ? (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-white/50 text-sm">Référence</span>
                        <span className="text-white font-medium text-sm">
                          {invoiceDetail.reference}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/50 text-sm">Date émission</span>
                        <span className="text-white text-sm">
                          {invoiceDetail.date_emission
                            ? formatDate(invoiceDetail.date_emission)
                            : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/50 text-sm">Échéance</span>
                        <span
                          className={cn(
                            'text-sm font-semibold',
                            isOverdue(invoiceDetail.date_echeance)
                              ? 'text-red-400'
                              : 'text-white'
                          )}
                        >
                          {invoiceDetail.date_echeance
                            ? formatDate(invoiceDetail.date_echeance)
                            : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/50 text-sm">Total TTC</span>
                        <span className="text-white font-bold text-sm">
                          {formatCurrency(invoiceDetail.total_ttc)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-white/50 text-sm">Restant dû</span>
                        <span className="text-red-400 font-bold">
                          {formatCurrency(invoiceDetail.remaining_ttc ?? 0)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-white/30 text-sm">Aucune donnée.</p>
                  )}
                </div>

                {/* Client Risk Score */}
                <div>
                  <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">
                    Score de risque client
                  </h3>
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-start gap-4">
                      <div className="flex-1">
                        <div className="font-medium text-white">
                          {clientName(selectedWorkflow.client)}
                        </div>
                        <div className="text-xs text-white/40 mt-0.5">
                          {selectedWorkflow.client?.email ?? '—'}
                        </div>
                        <div className="text-xs text-white/40">
                          {selectedWorkflow.client?.phone ?? '—'}
                        </div>
                      </div>
                      <div className="w-20">
                        <RiskScore
                          score={
                            LEVEL_CONFIG[selectedWorkflow.current_level as ReminderLevel]?.score ?? 50
                          }
                        />
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <div className="flex items-center gap-2">
                        <span className="text-white/50 text-xs">Niveau actuel :</span>
                        <LevelBadge level={selectedWorkflow.current_level as ReminderLevel} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment History */}
                <div>
                  <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">
                    Historique des paiements
                  </h3>
                  {loadingDetail ? (
                    <Skeleton className="h-20 bg-white/10 rounded" />
                  ) : invoiceDetail && invoiceDetail.payments.length > 0 ? (
                    <div className="rounded-xl border border-white/10 bg-white/5 divide-y divide-white/10">
                      {invoiceDetail.payments.map((p) => (
                        <div
                          key={p.id}
                          className="flex items-center justify-between px-4 py-3"
                        >
                          <div className="flex flex-col">
                            <span className="text-white text-sm font-medium">
                              {formatCurrency(p.amount)}
                            </span>
                            <span className="text-white/40 text-xs">
                              {p.payment_date ? formatDate(p.payment_date) : '—'}
                            </span>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-white/60 text-xs capitalize">
                              {p.payment_method?.replace('_', ' ') ?? '—'}
                            </span>
                            {p.reference && (
                              <span className="text-white/30 text-xs">{p.reference}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center">
                      <p className="text-white/30 text-sm">Aucun paiement enregistré.</p>
                    </div>
                  )}
                </div>

                {/* Timeline */}
                <div>
                  <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider mb-3">
                    Historique des relances
                  </h3>
                  <ReminderTimeline
                    messages={selectedWorkflow.reminder_message ?? []}
                  />
                </div>

                {/* Actions */}
                <div className="border-t border-white/10 pt-5 space-y-4">
                  <h3 className="text-sm font-semibold text-white/70 uppercase tracking-wider">
                    Actions
                  </h3>

                  {/* Auto-send toggle */}
                  <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                    <div className="flex flex-col">
                      <Label className="text-white text-sm">Envoi automatique</Label>
                      <span className="text-white/40 text-xs mt-0.5">
                        Active l'envoi automatique des relances
                      </span>
                    </div>
                    <Switch
                      checked={selectedWorkflow.auto_send ?? false}
                      onCheckedChange={() => handleToggleAutoSend(selectedWorkflow)}
                      disabled={togglingId === selectedWorkflow.id}
                      className="data-[state=checked]:bg-emerald-500"
                    />
                  </div>

                  {/* Trigger relance */}
                  <Button
                    className="w-full min-h-[48px] bg-emerald-500 hover:bg-emerald-600 text-white font-semibold"
                    onClick={() => handleTrigger(selectedWorkflow)}
                    disabled={triggeringId === selectedWorkflow.id}
                  >
                    {triggeringId === selectedWorkflow.id ? (
                      <>
                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                        Envoi en cours…
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Lancer une relance maintenant
                      </>
                    )}
                  </Button>

                  {/* Stop workflow */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full min-h-[48px] border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:text-red-300 font-semibold"
                        disabled={stoppingId === selectedWorkflow.id}
                      >
                        {stoppingId === selectedWorkflow.id ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Arrêt en cours…
                          </>
                        ) : (
                          <>
                            <StopCircle className="w-4 h-4 mr-2" />
                            Stopper ce workflow
                          </>
                        )}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="bg-[#1a1a2e] border-white/20 text-white">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Stopper ce workflow ?</AlertDialogTitle>
                        <AlertDialogDescription className="text-white/60">
                          Vous êtes sur le point d'arrêter définitivement le workflow de relance
                          pour la facture{' '}
                          <strong className="text-white">
                            {selectedWorkflow.invoice?.reference ?? '—'}
                          </strong>.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="border-white/20 bg-white/5 text-white hover:bg-white/10">
                          Annuler
                        </AlertDialogCancel>
                        <AlertDialogAction
                          className="bg-red-500 hover:bg-red-600 text-white"
                          onClick={() => handleStop(selectedWorkflow)}
                        >
                          Stopper
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>

                  {/* Next level indicator */}
                  {getNextLevel(selectedWorkflow.current_level as ReminderLevel) && (
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center gap-3">
                      <ChevronRight className="w-4 h-4 text-white/30 flex-shrink-0" />
                      <div className="text-xs text-white/50">
                        Prochaine escalade vers{' '}
                        <LevelBadge
                          level={
                            getNextLevel(
                              selectedWorkflow.current_level as ReminderLevel
                            ) as ReminderLevel
                          }
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function getNextLevel(current: ReminderLevel): ReminderLevel | null {
  const order: ReminderLevel[] = [
    'relance_1',
    'relance_2',
    'relance_3',
    'mise_en_demeure',
    'contentieux',
  ];
  const idx = order.indexOf(current);
  if (idx === -1 || idx >= order.length - 1) return null;
  return order[idx + 1];
}

function getNextReminderDate(level: ReminderLevel): string {
  const daysMap: Record<ReminderLevel, number> = {
    relance_1: 7,
    relance_2: 14,
    relance_3: 14,
    mise_en_demeure: 15,
    contentieux: 30,
  };
  const days = daysMap[level] ?? 7;
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
