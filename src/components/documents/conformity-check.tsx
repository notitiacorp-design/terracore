'use client';

import { useState, useMemo } from 'react';
import { CheckCircle2, XCircle, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import type { QuoteRow, InvoiceRow, CompanyRow, ClientRow, SiteAddressRow } from '@/types/database';

type DocumentType = 'devis' | 'facture';

interface ConformityCheckProps {
  documentType: DocumentType;
  document: QuoteRow | InvoiceRow;
  company: CompanyRow;
  client: ClientRow;
  billingAddress?: SiteAddressRow;
  linesCount?: number;
  hasReducedTva?: boolean;
  hasIban?: boolean;
  paymentMethod?: string;
}

type CheckStatus = 'ok' | 'warning' | 'error';

interface CheckItem {
  id: string;
  label: string;
  status: CheckStatus;
  suggestion?: string;
  category: 'obligatoire' | 'recommande';
}

type ConformityLevel = 'conforme' | 'attention' | 'non_conforme';

export function ConformityCheck({
  documentType,
  document,
  company,
  client,
  billingAddress,
  linesCount = 0,
  hasReducedTva = false,
  hasIban = false,
  paymentMethod,
}: ConformityCheckProps) {
  const [isOpen, setIsOpen] = useState(true);

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
    const clientName =
      client.company_name ||
      (client.first_name && client.last_name ? `${client.first_name} ${client.last_name}` : null);
    items.push({
      id: 'client_name',
      label: 'Nom / Raison sociale du client',
      status: clientName ? 'ok' : 'error',
      suggestion: !clientName ? 'Le client doit avoir un nom ou une raison sociale renseignée.' : undefined,
      category: 'obligatoire',
    });

    // --- Client adresse (via site_address) ---
    const clientAddressComplete = !!(billingAddress?.street && billingAddress?.city && billingAddress?.postal_code);
    items.push({
      id: 'client_address',
      label: 'Adresse complète du client',
      status: clientAddressComplete ? 'ok' : 'error',
      suggestion: !clientAddressComplete
        ? 'Complétez l'adresse, la ville et le code postal du client.'
        : undefined,
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

    // --- Mentions légales (notes_public) ---
    const hasConditions =
      documentType === 'devis' ? !!(document as QuoteRow).notes_public : true;
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
        id: 'date_validity',
        label: 'Date de validité du devis',
        status: quote.date_validity ? 'ok' : 'error',
        suggestion: !quote.date_validity
          ? 'Indiquez la date limite de validité du devis (obligatoire).'
          : undefined,
        category: 'obligatoire',
      });

      // Objet du devis (title)
      items.push({
        id: 'title',
        label: 'Objet du devis',
        status: quote.title ? 'ok' : 'warning',
        suggestion: !quote.title ? 'Un objet descriptif est recommandé pour ce devis.' : undefined,
        category: 'recommande',
      });
    }

    // --- Facture spécifique ---
    if (documentType === 'facture') {
      const invoice = document as InvoiceRow;

      // Date échéance (date_due in SQL)
      items.push({
        id: 'date_due',
        label: "Date d'échéance",
        status: invoice.date_due ? 'ok' : 'error',
        suggestion: !invoice.date_due ? "La date d'échéance est obligatoire sur une facture." : undefined,
        category: 'obligatoire',
      });

      // Mode de paiement (from payment prop, not invoice column)
      items.push({
        id: 'payment_method',
        label: 'Mode de paiement',
        status: paymentMethod ? 'ok' : 'error',
        suggestion: !paymentMethod
          ? 'Précisez le mode de paiement accepté (virement, chèque, etc.).'
          : undefined,
        category: 'obligatoire',
      });

      // Devis lié
      items.push({
        id: 'linked_quote',
        label: 'Devis associé',
        status: invoice.quote_id ? 'ok' : 'warning',
        suggestion: !invoice.quote_id
          ? 'Recommandé : liez cette facture à un devis signé pour la traçabilité.'
          : undefined,
        category: 'recommande',
      });

      // IBAN si virement
      if (paymentMethod === 'virement') {
        items.push({
          id: 'iban',
          label: 'IBAN pour virement bancaire',
          status: hasIban ? 'ok' : 'error',
          suggestion: !hasIban
            ? 'Le mode de paiement est « virement » mais aucun IBAN n'est renseigné dans vos paramètres.'
            : undefined,
          category: 'obligatoire',
        });
      }

      // Objet facture (title)
      items.push({
        id: 'title',
        label: 'Objet de la facture',
        status: invoice.title ? 'ok' : 'warning',
        suggestion: !invoice.title ? 'Un objet descriptif est recommandé pour cette facture.' : undefined,
        category: 'recommande',
      });
    }

    return items;
  }, [document, company, client, billingAddress, documentType, linesCount, hasIban, paymentMethod]);

  const conformityLevel = useMemo<ConformityLevel>(() => {
    const hasError = checks.some((c) => c.status === 'error');
    const hasWarning = checks.some((c) => c.status === 'warning');
    if (hasError) return 'non_conforme';
    if (hasWarning) return 'attention';
    return 'conforme';
  }, [checks]);

  const errorCount = checks.filter((c) => c.status === 'error').length;
  const warningCount = checks.filter((c) => c.status === 'warning').length;
  const okCount = checks.filter((c) => c.status === 'ok').length;

  const obligatoireChecks = checks.filter((c) => c.category === 'obligatoire');
  const recommandeChecks = checks.filter((c) => c.category === 'recommande');

  const conformityConfig: Record<
    ConformityLevel,
    { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle2 }
  > = {
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
  const Icon = config.icon;

  const statusIcon = (status: CheckStatus) => {
    if (status === 'ok') return <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />;
    if (status === 'warning') return <AlertCircle className="h-4 w-4 text-amber-400 shrink-0" />;
    return <XCircle className="h-4 w-4 text-red-400 shrink-0" />;
  };

  return (
    <Card className={cn('border', config.border, config.bg)}>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CardHeader className="pb-2">
          <CollapsibleTrigger asChild>
            <button className="flex w-full items-center justify-between gap-2 text-left">
              <div className="flex items-center gap-2">
                <Icon className={cn('h-5 w-5', config.color)} />
                <CardTitle className={cn('text-base', config.color)}>
                  Conformité légale — {config.label}
                </CardTitle>
              </div>
              <div className="flex items-center gap-2">
                {errorCount > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    {errorCount} erreur{errorCount > 1 ? 's' : ''}
                  </Badge>
                )}
                {warningCount > 0 && (
                  <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                    {warningCount} avertissement{warningCount > 1 ? 's' : ''}
                  </Badge>
                )}
                {okCount > 0 && (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-xs">
                    {okCount} ok
                  </Badge>
                )}
                {isOpen ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                )}
              </div>
            </button>
          </CollapsibleTrigger>
        </CardHeader>

        <CollapsibleContent>
          <CardContent className="pt-0 space-y-4">
            {/* Mentions obligatoires */}
            {obligatoireChecks.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Mentions obligatoires
                </p>
                <ul className="space-y-2">
                  {obligatoireChecks.map((check) => (
                    <li key={check.id} className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        {statusIcon(check.status)}
                        <span
                          className={cn(
                            'text-sm',
                            check.status === 'ok'
                              ? 'text-foreground'
                              : check.status === 'warning'
                              ? 'text-amber-300'
                              : 'text-red-300',
                          )}
                        >
                          {check.label}
                        </span>
                      </div>
                      {check.suggestion && (
                        <p className="text-xs text-muted-foreground ml-6">{check.suggestion}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommandations */}
            {recommandeChecks.length > 0 && (
              <>
                <Separator className="opacity-30" />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                    Recommandations
                  </p>
                  <ul className="space-y-2">
                    {recommandeChecks.map((check) => (
                      <li key={check.id} className="flex flex-col gap-0.5">
                        <div className="flex items-center gap-2">
                          {statusIcon(check.status)}
                          <span
                            className={cn(
                              'text-sm',
                              check.status === 'ok'
                                ? 'text-foreground'
                                : check.status === 'warning'
                                ? 'text-amber-300'
                                : 'text-red-300',
                            )}
                          >
                            {check.label}
                          </span>
                        </div>
                        {check.suggestion && (
                          <p className="text-xs text-muted-foreground ml-6">{check.suggestion}</p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
