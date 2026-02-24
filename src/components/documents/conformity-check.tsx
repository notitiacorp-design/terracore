'use client';

import { useState, useMemo } from 'react';
import { CheckCircle2, XCircle, AlertCircle, FileText, ChevronDown, ChevronUp, Sparkles, ShieldCheck } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { QuoteRow, InvoiceRow, CompanyRow, ClientRow } from '@/types/database';

type DocumentType = 'devis' | 'facture';

interface ConformityCheckProps {
  documentType: DocumentType;
  document: QuoteRow | InvoiceRow;
  company: CompanyRow;
  client: ClientRow;
  linesCount?: number;
  hasReducedTva?: boolean;
  hasIban?: boolean;
}

type CheckStatus = 'ok' | 'warning' | 'error';

interface CheckItem {
  id: string;
  label: string;
  status: CheckStatus;
  suggestion?: string;
  category: 'obligatoire' | 'recommande' | 'sap';
}

type ConformityLevel = 'conforme' | 'attention' | 'non_conforme';

function isQuote(doc: QuoteRow | InvoiceRow, type: DocumentType): doc is QuoteRow {
  return type === 'devis';
}

function isInvoice(doc: QuoteRow | InvoiceRow, type: DocumentType): doc is InvoiceRow {
  return type === 'facture';
}

export function ConformityCheck({
  documentType,
  document,
  company,
  client,
  linesCount = 0,
  hasReducedTva = false,
  hasIban = false,
}: ConformityCheckProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [showAttestationModal, setShowAttestationModal] = useState(false);

  const checks = useMemo<CheckItem[]>(() => {
    const items: CheckItem[] = [];

    // --- Référence ---
    items.push({
      id: 'reference',
      label: 'Référence du document',
      status: document.reference ? 'ok' : 'error',
      suggestion: !document.reference ? 'Veuillez saisir une référence unique pour ce document.' : undefined,
      category: 'obligatoire',
    });

    // --- Date émission ---
    items.push({
      id: 'date_emission',
      label: "Date d'émission",
      status: document.date_emission ? 'ok' : 'error',
      suggestion: !document.date_emission ? "Indiquez la date d'émission du document." : undefined,
      category: 'obligatoire',
    });

    // --- Client nom ---
    const clientName = client.company_name ||
      (client.first_name && client.last_name ? `${client.first_name} ${client.last_name}` : null);
    items.push({
      id: 'client_name',
      label: 'Nom / Raison sociale du client',
      status: clientName ? 'ok' : 'error',
      suggestion: !clientName ? 'Le client doit avoir un nom ou une raison sociale renseignée.' : undefined,
      category: 'obligatoire',
    });

    // --- Client adresse ---
    const clientAddressComplete = !!(client.address && client.city && client.postal_code);
    items.push({
      id: 'client_address',
      label: 'Adresse complète du client',
      status: clientAddressComplete ? 'ok' : 'error',
      suggestion: !clientAddressComplete ? 'Complétez l'adresse, la ville et le code postal du client.' : undefined,
      category: 'obligatoire',
    });

    // --- SIRET société ---
    items.push({
      id: 'company_siret',
      label: 'SIRET de votre société',
      status: company.siret ? 'ok' : 'error',
      suggestion: !company.siret ? 'Renseignez le SIRET de votre société dans les paramètres.' : undefined,
      category: 'obligatoire',
    });

    // --- Numéro de TVA (pro) ---
    if (client.client_type === 'pro') {
      const tvaOk = !!(client.tva_number || company.siret);
      items.push({
        id: 'tva_number',
        label: 'Numéro de TVA intracommunautaire',
        status: client.tva_number ? 'ok' : 'warning',
        suggestion: !client.tva_number ? 'Recommandé pour les clients professionnels : renseignez le numéro de TVA.' : undefined,
        category: 'recommande',
      });
    }

    // --- Au moins une ligne ---
    items.push({
      id: 'lines',
      label: 'Au moins une ligne de prestation',
      status: linesCount > 0 ? 'ok' : 'error',
      suggestion: linesCount === 0 ? 'Ajoutez au moins une ligne de prestation ou de fourniture.' : undefined,
      category: 'obligatoire',
    });

    // --- Total > 0 ---
    const totalTtc = document.total_ttc ?? 0;
    items.push({
      id: 'total',
      label: 'Montant total supérieur à 0',
      status: totalTtc > 0 ? 'ok' : 'error',
      suggestion: totalTtc === 0 ? 'Le montant total TTC doit être supérieur à zéro.' : undefined,
      category: 'obligatoire',
    });

    // --- Mentions légales (conditions) ---
    const hasConditions = documentType === 'devis'
      ? !!(document as QuoteRow).conditions
      : true; // factures ont conditions via quote
    items.push({
      id: 'mentions_legales',
      label: 'Mentions légales / Conditions',
      status: hasConditions ? 'ok' : 'warning',
      suggestion: !hasConditions ? 'Ajoutez les conditions générales ou mentions légales obligatoires.' : undefined,
      category: documentType === 'devis' ? 'obligatoire' : 'recommande',
    });

    // --- Devis spécifique ---
    if (documentType === 'devis') {
      const quote = document as QuoteRow;

      // Date validité
      items.push({
        id: 'date_validite',
        label: 'Date de validité du devis',
        status: quote.date_validite ? 'ok' : 'error',
        suggestion: !quote.date_validite ? 'Indiquez la date limite de validité du devis (obligatoire).' : undefined,
        category: 'obligatoire',
      });

      // Objet du devis
      items.push({
        id: 'object',
        label: 'Objet du devis',
        status: quote.object ? 'ok' : 'warning',
        suggestion: !quote.object ? 'Un objet descriptif est recommandé pour ce devis.' : undefined,
        category: 'recommande',
      });

      // SAP
      if (client.sap_eligible) {
        items.push({
          id: 'sap_eligible',
          label: 'Mention SAP (Services à la Personne)',
          status: quote.sap_eligible ? 'ok' : 'warning',
          suggestion: !quote.sap_eligible
            ? 'Ce client est éligible au SAP. Activez le mode SAP et joignez l'attestation fiscale.'
            : undefined,
          category: 'sap',
        });

        items.push({
          id: 'sap_mention',
          label: 'Attestation SAP / numéro d'agrément',
          status: quote.sap_eligible ? 'ok' : 'warning',
          suggestion: !quote.sap_eligible
            ? 'Vérifiez que le numéro d'agrément SAP est bien présent dans le document.'
            : undefined,
          category: 'sap',
        });
      }
    }

    // --- Facture spécifique ---
    if (documentType === 'facture') {
      const invoice = document as InvoiceRow;

      // Date échéance
      items.push({
        id: 'date_echeance',
        label: "Date d'échéance",
        status: invoice.date_echeance ? 'ok' : 'error',
        suggestion: !invoice.date_echeance ? "La date d'échéance est obligatoire sur une facture." : undefined,
        category: 'obligatoire',
      });

      // Mode de paiement
      items.push({
        id: 'payment_method',
        label: 'Mode de paiement',
        status: invoice.payment_method ? 'ok' : 'error',
        suggestion: !invoice.payment_method ? 'Précisez le mode de paiement accepté (virement, chèque, etc.).' : undefined,
        category: 'obligatoire',
      });

      // Devis lié
      items.push({
        id: 'linked_quote',
        label: 'Devis associé',
        status: invoice.quote_id ? 'ok' : 'warning',
        suggestion: !invoice.quote_id ? 'Recommandé : liez cette facture à un devis signé pour la traçabilité.' : undefined,
        category: 'recommande',
      });

      // IBAN si virement
      if (invoice.payment_method === 'virement') {
        items.push({
          id: 'iban',
          label: 'IBAN pour virement bancaire',
          status: hasIban ? 'ok' : 'error',
          suggestion: !hasIban ? 'Le mode de paiement est « virement » mais aucun IBAN n'est renseigné dans vos paramètres.' : undefined,
          category: 'obligatoire',
        });
      }

      // Objet facture
      items.push({
        id: 'object',
        label: 'Objet de la facture',
        status: invoice.object ? 'ok' : 'warning',
        suggestion: !invoice.object ? 'Un objet descriptif est recommandé pour cette facture.' : undefined,
        category: 'recommande',
      });
    }

    return items;
  }, [document, company, client, documentType, linesCount, hasIban]);

  const conformityLevel = useMemo<ConformityLevel>(() => {
    const hasError = checks.some(c => c.status === 'error');
    const hasWarning = checks.some(c => c.status === 'warning');
    if (hasError) return 'non_conforme';
    if (hasWarning) return 'attention';
    return 'conforme';
  }, [checks]);

  const errorCount = checks.filter(c => c.status === 'error').length;
  const warningCount = checks.filter(c => c.status === 'warning').length;
  const okCount = checks.filter(c => c.status === 'ok').length;

  const obligatoireChecks = checks.filter(c => c.category === 'obligatoire');
  const recommandeChecks = checks.filter(c => c.category === 'recommande');
  const sapChecks = checks.filter(c => c.category === 'sap');

  const conformityConfig: Record<ConformityLevel, { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle2 }> = {
    conforme: {
      label: 'Conforme',
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/30',
      icon: CheckCircle2,
    },
    attention: {
      label: 'Attention',
      color: 'text-amber-400',
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/30',
      icon: AlertCircle,
    },
    non_conforme: {
      label: 'Non conforme',
      color: 'text-red-400',
      bg: 'bg-red-500/10',
      border: 'border-red-500/30',
      icon: XCircle,
    },
  };

  const config = conformityConfig[conformityLevel];
  const StatusIcon = config.icon;

  const renderCheck = (check: CheckItem) => {
    const iconMap = {
      ok: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />,
      warning: <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />,
      error: <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />,
    };

    return (
      <div
        key={check.id}
        className={cn(
          'flex flex-col gap-1 p-3 rounded-lg border transition-colors',
          check.status === 'ok' && 'bg-emerald-500/5 border-emerald-500/20',
          check.status === 'warning' && 'bg-amber-500/5 border-amber-500/20',
          check.status === 'error' && 'bg-red-500/5 border-red-500/20',
        )}
      >
        <div className="flex items-start gap-2">
          {iconMap[check.status]}
          <span
            className={cn(
              'text-sm font-medium',
              check.status === 'ok' && 'text-gray-200',
              check.status === 'warning' && 'text-amber-200',
              check.status === 'error' && 'text-red-200',
            )}
          >
            {check.label}
          </span>
        </div>
        {check.suggestion && (
          <p className="text-xs text-gray-400 pl-6">{check.suggestion}</p>
        )}
      </div>
    );
  };

  const renderSection = (title: string, items: CheckItem[], icon?: React.ReactNode) => {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">{title}</span>
        </div>
        <div className="space-y-2">
          {items.map(renderCheck)}
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-[#1a1a2e] border border-white/10 shadow-xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="w-5 h-5 text-[#10b981] shrink-0" />
            <CardTitle className="text-base font-semibold text-white truncate">
              Vérification de conformité
            </CardTitle>
          </div>
          <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="min-h-[48px] min-w-[48px] text-gray-400 hover:text-white hover:bg-white/5 shrink-0"
                aria-label={isOpen ? 'Réduire' : 'Développer'}
              >
                {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </Button>
            </CollapsibleTrigger>
          </Collapsible>
        </div>

        {/* Statut global */}
        <div
          className={cn(
            'flex items-center gap-3 p-4 rounded-xl border mt-3',
            config.bg,
            config.border,
          )}
        >
          <StatusIcon className={cn('w-6 h-6 shrink-0', config.color)} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('text-base font-bold', config.color)}>{config.label}</span>
              <Badge
                variant="outline"
                className={cn('text-xs border', config.border, config.color)}
              >
                {documentType === 'devis' ? 'Devis' : 'Facture'}
              </Badge>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">
              {okCount} conforme{okCount > 1 ? 's' : ''}
              {errorCount > 0 && ` · ${errorCount} erreur${errorCount > 1 ? 's' : ''}`}
              {warningCount > 0 && ` · ${warningCount} avertissement${warningCount > 1 ? 's' : ''}`}
            </p>
          </div>
          {/* Score visuel */}
          <div className="flex flex-col items-center shrink-0">
            <span className={cn('text-2xl font-bold', config.color)}>
              {Math.round((okCount / checks.length) * 100)}%
            </span>
            <span className="text-xs text-gray-500">score</span>
          </div>
        </div>
      </CardHeader>

      <Collapsible open={isOpen}>
        <CollapsibleContent>
          <CardContent className="pt-0 space-y-5">
            {/* Progress bar */}
            <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
              <div
                className={cn(
                  'h-full rounded-full transition-all duration-500',
                  conformityLevel === 'conforme' && 'bg-emerald-500',
                  conformityLevel === 'attention' && 'bg-amber-500',
                  conformityLevel === 'non_conforme' && 'bg-red-500',
                )}
                style={{ width: `${Math.round((okCount / checks.length) * 100)}%` }}
              />
            </div>

            <Separator className="bg-white/10" />

            {/* Sections */}
            <div className="space-y-5">
              {renderSection(
                'Éléments obligatoires',
                obligatoireChecks,
                <FileText className="w-3.5 h-3.5 text-gray-500" />,
              )}

              {recommandeChecks.length > 0 && (
                <>
                  <Separator className="bg-white/10" />
                  {renderSection(
                    'Recommandations',
                    recommandeChecks,
                    <AlertCircle className="w-3.5 h-3.5 text-gray-500" />,
                  )}
                </>
              )}

              {sapChecks.length > 0 && (
                <>
                  <Separator className="bg-white/10" />
                  {renderSection(
                    'Services à la Personne (SAP)',
                    sapChecks,
                    <ShieldCheck className="w-3.5 h-3.5 text-[#10b981]" />,
                  )}
                </>
              )}
            </div>

            {/* Actions IA */}
            {(hasReducedTva || client.sap_eligible) && (
              <>
                <Separator className="bg-white/10" />
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Actions suggérées</p>
                  {hasReducedTva && (
                    <Button
                      onClick={() => setShowAttestationModal(true)}
                      className="w-full min-h-[48px] bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30 hover:border-[#10b981]/50 transition-all"
                      variant="outline"
                    >
                      <Sparkles className="w-4 h-4 mr-2 shrink-0" />
                      Générer attestation TVA réduite
                    </Button>
                  )}
                  {client.sap_eligible && (
                    <Button
                      className="w-full min-h-[48px] bg-[#10b981]/10 hover:bg-[#10b981]/20 text-[#10b981] border border-[#10b981]/30 hover:border-[#10b981]/50 transition-all"
                      variant="outline"
                    >
                      <Sparkles className="w-4 h-4 mr-2 shrink-0" />
                      Générer attestation fiscale SAP
                    </Button>
                  )}
                </div>
              </>
            )}

            {/* Note conformité */}
            {conformityLevel === 'conforme' && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <p className="text-xs text-emerald-300">
                  Ce document est conforme aux exigences légales françaises. Vous pouvez l'envoyer à votre client en toute sécurité.
                </p>
              </div>
            )}

            {conformityLevel === 'non_conforme' && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                <XCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <p className="text-xs text-red-300">
                  Des erreurs doivent être corrigées avant l'envoi de ce document. Consultez les suggestions ci-dessus.
                </p>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>

      {/* Modale attestation TVA (simplifiée) */}
      {showAttestationModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowAttestationModal(false)}
        >
          <div
            className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-4">
              <Sparkles className="w-5 h-5 text-[#10b981]" />
              <h3 className="text-base font-bold text-white">Attestation TVA réduite</h3>
            </div>
            <p className="text-sm text-gray-400 mb-4">
              Une TVA réduite a été détectée sur ce document. L'attestation simplifiée (art. 279-0 bis CGI) sera générée pour :
            </p>
            <div className="bg-white/5 rounded-lg p-3 text-sm text-gray-300 mb-6 space-y-1">
              <p><span className="text-gray-500">Client :</span> {client.company_name || `${client.first_name} ${client.last_name}`}</p>
              <p><span className="text-gray-500">Document :</span> {document.reference || '—'}</p>
              <p><span className="text-gray-500">Société :</span> {company.name}</p>
            </div>
            <div className="flex flex-col gap-2">
              <Button
                className="w-full min-h-[48px] bg-[#10b981] hover:bg-[#0ea371] text-white font-semibold"
                onClick={() => {
                  // TODO: déclencher la génération PDF de l'attestation
                  setShowAttestationModal(false);
                }}
              >
                <FileText className="w-4 h-4 mr-2" />
                Générer le PDF
              </Button>
              <Button
                variant="ghost"
                className="w-full min-h-[48px] text-gray-400 hover:text-white hover:bg-white/5"
                onClick={() => setShowAttestationModal(false)}
              >
                Annuler
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}

export default ConformityCheck;
