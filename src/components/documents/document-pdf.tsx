'use client';

import React, { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { cn, formatDate, formatCurrency } from '@/lib/utils';
import type {
  QuoteRow,
  InvoiceRow,
  QuoteLineRow,
  InvoiceLineRow,
  ClientRow,
  CompanyRow,
  SiteAddressRow,
} from '@/types/database';
import { Download, Printer } from 'lucide-react';

type DocumentPdfType = 'devis' | 'facture' | 'acompte' | 'bon_livraison';

interface DocumentPdfProps {
  type: DocumentPdfType;
  document: any;
  lines: any[];
  client: ClientRow;
  company: CompanyRow;
  siteAddress?: SiteAddressRow;
  deposits?: Array<{ reference: string; amount_ttc: number; date_emission: string }>;
  className?: string;
}

const DOCUMENT_TITLES: Record<DocumentPdfType, string> = {
  devis: 'DEVIS',
  facture: 'FACTURE',
  acompte: 'FACTURE D\'ACOMPTE',
  bon_livraison: 'BON DE LIVRAISON',
};

function formatFrenchNumber(value: number, decimals = 2): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function formatFrenchCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function getClientDisplayName(client: ClientRow): string {
  if (client.client_type === 'pro') {
    return client.company_name || `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim();
  }
  return `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim();
}

function groupTvaRates(lines: any[]): Record<number, number> {
  const groups: Record<number, number> = {};
  for (const line of lines) {
    const rate = Number(line.vat_rate ?? 0);
    const totalHt = Number(line.total_ht ?? 0);
    const tvaAmount = totalHt * (rate / 100);
    if (!groups[rate]) groups[rate] = 0;
    groups[rate] += tvaAmount;
  }
  return groups;
}

export function DocumentPdf({
  type,
  document,
  lines,
  client,
  company,
  siteAddress,
  deposits = [],
  className,
}: DocumentPdfProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      const printContents = printRef.current?.innerHTML;
      if (!printContents) return;

      const printWindow = window.open('', '_blank', 'width=900,height=1200');
      if (!printWindow) {
        window.print();
        return;
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html lang="fr">
          <head>
            <meta charset="UTF-8" />
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <title>${DOCUMENT_TITLES[type]} ${document?.reference ?? ''}</title>
            <style>
              @page {
                size: A4;
                margin: 15mm 20mm;
              }
              * { box-sizing: border-box; margin: 0; padding: 0; }
              body {
                font-family: 'Helvetica Neue', Arial, sans-serif;
                font-size: 10pt;
                color: #1a1a2e;
                background: #fff;
                line-height: 1.4;
              }
              .doc-header {
                display: flex;
                justify-content: space-between;
                align-items: flex-start;
                margin-bottom: 24px;
                gap: 24px;
              }
              .company-logo {
                width: 120px;
                height: 60px;
                object-fit: contain;
              }
              .company-info { font-size: 9pt; color: #444; }
              .company-name { font-size: 14pt; font-weight: bold; color: #1a1a2e; margin-bottom: 4px; }
              .document-title-block {
                display: flex;
                flex-direction: column;
                align-items: flex-end;
              }
              .document-title {
                font-size: 20pt;
                font-weight: bold;
                color: #1a1a2e;
                letter-spacing: 1px;
              }
              .document-ref {
                font-size: 11pt;
                color: #10b981;
                font-weight: 600;
                margin-top: 4px;
              }
              .document-status {
                font-size: 9pt;
                color: #6b7280;
                margin-top: 4px;
              }
              .addresses-block {
                display: flex;
                justify-content: space-between;
                margin: 24px 0;
                gap: 24px;
              }
              .address-card {
                background: #f9fafb;
                border: 1px solid #e5e7eb;
                border-radius: 6px;
                padding: 12px 16px;
                min-width: 200px;
                flex: 1;
              }
              .address-card-title {
                font-size: 8pt;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #6b7280;
                margin-bottom: 8px;
              }
              .address-name {
                font-size: 11pt;
                font-weight: bold;
                color: #1a1a2e;
                margin-bottom: 4px;
              }
              .address-detail { font-size: 9pt; color: #444; line-height: 1.5; }
              .dates-block {
                display: flex;
                gap: 24px;
                margin-bottom: 24px;
              }
              .date-item {
                background: #f3f4f6;
                border-radius: 6px;
                padding: 8px 14px;
                font-size: 9pt;
              }
              .date-label { color: #6b7280; font-weight: 600; margin-bottom: 2px; }
              .date-value { color: #1a1a2e; font-weight: bold; font-size: 10pt; }
              .object-block {
                margin-bottom: 20px;
              }
              .object-label { font-size: 9pt; color: #6b7280; font-weight: 600; }
              .object-value { font-size: 10pt; color: #1a1a2e; font-weight: 500; margin-top: 2px; }
              .intro-block {
                margin-bottom: 20px;
                font-size: 9pt;
                color: #444;
                font-style: italic;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 0;
              }
              thead tr {
                background: #1a1a2e;
                color: #fff;
              }
              thead th {
                padding: 8px 10px;
                font-size: 8.5pt;
                font-weight: 600;
                text-align: left;
                letter-spacing: 0.3px;
              }
              thead th.text-right { text-align: right; }
              tbody tr { border-bottom: 1px solid #e5e7eb; }
              tbody tr:nth-child(even) { background: #f9fafb; }
              tbody td {
                padding: 7px 10px;
                font-size: 9pt;
                color: #1a1a2e;
                vertical-align: top;
              }
              tbody td.text-right { text-align: right; }
              .line-description { font-size: 8pt; color: #6b7280; margin-top: 2px; }
              .totals-block {
                display: flex;
                justify-content: flex-end;
                margin-top: 0;
              }
              .totals-table {
                width: 300px;
                border: 1px solid #e5e7eb;
                border-radius: 6px;
                overflow: hidden;
              }
              .totals-row {
                display: flex;
                justify-content: space-between;
                padding: 7px 14px;
                font-size: 9.5pt;
                border-bottom: 1px solid #e5e7eb;
              }
              .totals-row:last-child { border-bottom: none; }
              .totals-row.total-ttc {
                background: #1a1a2e;
                color: #fff;
                font-size: 11pt;
                font-weight: bold;
              }
              .totals-row.paid {
                color: #10b981;
                font-weight: 600;
              }
              .totals-row.remaining {
                background: #fef3c7;
                font-weight: bold;
                color: #92400e;
              }
              .totals-label { color: inherit; }
              .totals-value { font-weight: 600; }
              .conditions-block {
                margin-top: 32px;
                padding-top: 16px;
                border-top: 2px solid #e5e7eb;
              }
              .conditions-title {
                font-size: 9pt;
                font-weight: bold;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                color: #6b7280;
                margin-bottom: 8px;
              }
              .conditions-text { font-size: 8.5pt; color: #6b7280; line-height: 1.5; }
              .signature-block {
                display: flex;
                justify-content: flex-end;
                margin-top: 32px;
              }
              .signature-box {
                border: 1px solid #e5e7eb;
                border-radius: 6px;
                padding: 12px 24px;
                min-width: 200px;
                min-height: 80px;
                text-align: center;
                font-size: 8.5pt;
                color: #6b7280;
              }
              .doc-footer {
                margin-top: 32px;
                padding-top: 12px;
                border-top: 1px solid #e5e7eb;
                text-align: center;
                font-size: 7.5pt;
                color: #9ca3af;
                line-height: 1.6;
              }
              .green { color: #10b981; }
              .separator { border: none; border-top: 1px solid #e5e7eb; margin: 12px 0; }
            </style>
          </head>
          <body>
            ${printContents}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const totalHt = lines.reduce((acc, l) => acc + Number(l.total_ht ?? 0), 0);
  const tvaGroups = groupTvaRates(lines);
  const totalTva = Object.values(tvaGroups).reduce((a, b) => a + b, 0);
  const totalTtc = Number(document?.total_ttc ?? totalHt + totalTva);
  const totalDeposits = deposits.reduce((a, d) => a + Number(d.amount_ttc ?? 0), 0);
  const remaining = Number(document?.remaining_ttc ?? totalTtc - totalDeposits);

  const clientName = getClientDisplayName(client);
  const isFacture = type === 'facture' || type === 'acompte';
  const title = DOCUMENT_TITLES[type];

  const companySettings = (company as any)?.settings ?? {};
  const iban = companySettings?.iban ?? '';
  const bic = companySettings?.bic ?? '';
  const legalMentions = companySettings?.legal_mentions ?? '';

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* Action buttons */}
      <div className="flex items-center justify-between gap-3 print:hidden">
        <div className="flex items-center gap-2">
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
            style={{
              background:
                type === 'devis'
                  ? '#dbeafe'
                  : type === 'facture'
                  ? '#d1fae5'
                  : type === 'acompte'
                  ? '#fef3c7'
                  : '#f3f4f6',
              color:
                type === 'devis'
                  ? '#1d4ed8'
                  : type === 'facture'
                  ? '#065f46'
                  : type === 'acompte'
                  ? '#92400e'
                  : '#374151',
            }}
          >
            {title}
          </div>
          <span className="text-sm font-semibold text-[#1a1a2e]">{document?.reference}</span>
        </div>
        <Button
          onClick={handlePrint}
          className="min-h-[48px] gap-2 bg-[#1a1a2e] text-white hover:bg-[#10b981] hover:text-white transition-colors"
        >
          <Download className="h-4 w-4" />
          Télécharger PDF
        </Button>
      </div>

      {/* Document Preview */}
      <div
        className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden"
        style={{ fontFamily: "'Helvetica Neue', Arial, sans-serif" }}
      >
        <div ref={printRef} className="p-8 min-w-0" style={{ color: '#1a1a2e' }}>
          {/* HEADER */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8">
            {/* Company Info */}
            <div className="flex flex-col gap-2">
              {company.logo_url && (
                <img
                  src={company.logo_url}
                  alt={company.name}
                  className="h-16 w-auto object-contain mb-2"
                  style={{ maxWidth: '160px' }}
                />
              )}
              <div className="font-bold text-lg" style={{ color: '#1a1a2e' }}>
                {company.name}
              </div>
              <div className="text-xs text-gray-500 space-y-0.5">
                {company.address && <div>{company.address}</div>}
                {(company as any)?.city && (
                  <div>
                    {(company as any)?.postal_code} {(company as any)?.city}
                  </div>
                )}
                {company.phone && <div>Tél : {company.phone}</div>}
                {company.email && <div>{company.email}</div>}
                {company.siret && <div>SIRET : {company.siret}</div>}
              </div>
            </div>

            {/* Document title block */}
            <div className="flex flex-col items-end">
              <div
                className="text-3xl font-black tracking-wide"
                style={{ color: '#1a1a2e' }}
              >
                {title}
              </div>
              <div className="text-base font-bold mt-1" style={{ color: '#10b981' }}>
                N° {document?.reference}
              </div>
              {document?.status && (
                <div className="text-xs text-gray-400 mt-1 uppercase tracking-wider">
                  {document.status.replace(/_/g, ' ')}
                </div>
              )}
            </div>
          </div>

          {/* ADDRESSES */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Emetteur */}
            <div
              className="flex-1 rounded-lg p-3 border"
              style={{ background: '#f9fafb', borderColor: '#e5e7eb' }}
            >
              <div
                className="text-xs font-bold uppercase tracking-wider mb-2"
                style={{ color: '#6b7280' }}
              >
                Émetteur
              </div>
              <div className="font-semibold text-sm">{company.name}</div>
              {company.address && (
                <div className="text-xs text-gray-500 mt-0.5">{company.address}</div>
              )}
              {company.siret && (
                <div className="text-xs text-gray-500 mt-0.5">SIRET : {company.siret}</div>
              )}
            </div>

            {/* Client */}
            <div
              className="flex-1 rounded-lg p-3 border"
              style={{ background: '#f9fafb', borderColor: '#e5e7eb' }}
            >
              <div
                className="text-xs font-bold uppercase tracking-wider mb-2"
                style={{ color: '#6b7280' }}
              >
                Client
              </div>
              <div className="font-semibold text-sm">{clientName}</div>
              {client.address && (
                <div className="text-xs text-gray-500 mt-0.5">{client.address}</div>
              )}
              {(client.postal_code || client.city) && (
                <div className="text-xs text-gray-500">
                  {client.postal_code} {client.city}
                </div>
              )}
              {client.client_type === 'pro' && client.siret && (
                <div className="text-xs text-gray-500 mt-0.5">SIRET : {client.siret}</div>
              )}
              {client.client_type === 'pro' && client.tva_number && (
                <div className="text-xs text-gray-500">N° TVA : {client.tva_number}</div>
              )}
              {client.email && (
                <div className="text-xs text-gray-500">{client.email}</div>
              )}
            </div>

            {/* Site address */}
            {siteAddress && (
              <div
                className="flex-1 rounded-lg p-3 border"
                style={{ background: '#f9fafb', borderColor: '#e5e7eb' }}
              >
                <div
                  className="text-xs font-bold uppercase tracking-wider mb-2"
                  style={{ color: '#6b7280' }}
                >
                  Chantier
                </div>
                <div className="font-semibold text-sm">{siteAddress.label}</div>
                {siteAddress.address && (
                  <div className="text-xs text-gray-500 mt-0.5">{siteAddress.address}</div>
                )}
                {(siteAddress.postal_code || siteAddress.city) && (
                  <div className="text-xs text-gray-500">
                    {siteAddress.postal_code} {siteAddress.city}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* DATES */}
          <div className="flex flex-wrap gap-3 mb-6">
            {document?.date_emission && (
              <div
                className="rounded-lg px-3 py-2"
                style={{ background: '#f3f4f6' }}
              >
                <div className="text-xs font-semibold" style={{ color: '#6b7280' }}>
                  Date d&apos;émission
                </div>
                <div className="text-sm font-bold" style={{ color: '#1a1a2e' }}>
                  {formatDate(document.date_emission)}
                </div>
              </div>
            )}
            {type === 'devis' && document?.date_validite && (
              <div
                className="rounded-lg px-3 py-2"
                style={{ background: '#f3f4f6' }}
              >
                <div className="text-xs font-semibold" style={{ color: '#6b7280' }}>
                  Valable jusqu&apos;au
                </div>
                <div className="text-sm font-bold" style={{ color: '#1a1a2e' }}>
                  {formatDate(document.date_validite)}
                </div>
              </div>
            )}
            {isFacture && document?.date_echeance && (
              <div
                className="rounded-lg px-3 py-2"
                style={{ background: '#fef3c7' }}
              >
                <div className="text-xs font-semibold" style={{ color: '#92400e' }}>
                  Échéance de paiement
                </div>
                <div className="text-sm font-bold" style={{ color: '#92400e' }}>
                  {formatDate(document.date_echeance)}
                </div>
              </div>
            )}
            {document?.payment_method && (
              <div
                className="rounded-lg px-3 py-2"
                style={{ background: '#f3f4f6' }}
              >
                <div className="text-xs font-semibold" style={{ color: '#6b7280' }}>
                  Mode de règlement
                </div>
                <div className="text-sm font-bold" style={{ color: '#1a1a2e' }}>
                  {document.payment_method === 'virement'
                    ? 'Virement bancaire'
                    : document.payment_method === 'cheque'
                    ? 'Chèque'
                    : document.payment_method === 'cb'
                    ? 'Carte bancaire'
                    : document.payment_method === 'especes'
                    ? 'Espèces'
                    : document.payment_method === 'prelevement'
                    ? 'Prélèvement'
                    : document.payment_method}
                </div>
              </div>
            )}
          </div>

          {/* OBJECT */}
          {document?.object && (
            <div className="mb-4">
              <span className="text-xs font-semibold text-gray-500">Objet : </span>
              <span className="text-sm font-medium" style={{ color: '#1a1a2e' }}>
                {document.object}
              </span>
            </div>
          )}

          {/* INTRODUCTION */}
          {document?.introduction && (
            <div
              className="mb-6 text-sm italic"
              style={{ color: '#6b7280' }}
            >
              {document.introduction}
            </div>
          )}

          {/* LINES TABLE */}
          <div className="mb-0 overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr style={{ background: '#1a1a2e', color: '#fff' }}>
                  <th className="py-2 px-2 text-left font-semibold text-xs w-8">N°</th>
                  <th className="py-2 px-2 text-left font-semibold text-xs">Désignation</th>
                  <th className="py-2 px-2 text-right font-semibold text-xs w-20">Qté</th>
                  <th className="py-2 px-2 text-right font-semibold text-xs w-16">Unité</th>
                  <th className="py-2 px-2 text-right font-semibold text-xs w-24">P.U. HT</th>
                  <th className="py-2 px-2 text-right font-semibold text-xs w-16">TVA %</th>
                  <th className="py-2 px-2 text-right font-semibold text-xs w-24">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {lines.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-gray-400 text-sm italic"
                    >
                      Aucune ligne renseignée
                    </td>
                  </tr>
                ) : (
                  lines
                    .slice()
                    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                    .map((line, index) => (
                      <tr
                        key={line.id ?? index}
                        className={cn(
                          'border-b',
                          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        )}
                        style={{ borderColor: '#e5e7eb' }}
                      >
                        <td className="py-2 px-2 text-xs text-gray-400 align-top">
                          {index + 1}
                        </td>
                        <td className="py-2 px-2 align-top">
                          <div className="font-medium text-xs" style={{ color: '#1a1a2e' }}>
                            {line.label}
                          </div>
                          {line.description && (
                            <div className="text-xs text-gray-400 mt-0.5 leading-relaxed">
                              {line.description}
                            </div>
                          )}
                        </td>
                        <td className="py-2 px-2 text-right text-xs align-top">
                          {formatFrenchNumber(Number(line.quantity ?? 0))}
                        </td>
                        <td className="py-2 px-2 text-right text-xs align-top text-gray-500">
                          {line.unit ?? ''}
                        </td>
                        <td className="py-2 px-2 text-right text-xs align-top">
                          {formatFrenchCurrency(Number(line.unit_price_ht ?? 0))}
                        </td>
                        <td className="py-2 px-2 text-right text-xs align-top text-gray-500">
                          {formatFrenchNumber(Number(line.vat_rate ?? 0))} %
                        </td>
                        <td
                          className="py-2 px-2 text-right text-xs align-top font-semibold"
                          style={{ color: '#1a1a2e' }}
                        >
                          {formatFrenchCurrency(Number(line.total_ht ?? 0))}
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>

          {/* TOTALS */}
          <div className="flex justify-end mt-4 mb-6">
            <div
              className="border rounded-lg overflow-hidden"
              style={{ minWidth: '280px', borderColor: '#e5e7eb' }}
            >
              {/* Total HT */}
              <div
                className="flex justify-between items-center px-4 py-2 border-b"
                style={{ borderColor: '#e5e7eb' }}
              >
                <span className="text-sm text-gray-600">Total HT</span>
                <span className="text-sm font-semibold" style={{ color: '#1a1a2e' }}>
                  {formatFrenchCurrency(totalHt)}
                </span>
              </div>

              {/* TVA by rate */}
              {Object.entries(tvaGroups).map(([rate, amount]) => (
                <div
                  key={rate}
                  className="flex justify-between items-center px-4 py-2 border-b"
                  style={{ borderColor: '#e5e7eb' }}
                >
                  <span className="text-sm text-gray-600">
                    TVA {formatFrenchNumber(Number(rate))} %
                  </span>
                  <span className="text-sm font-semibold" style={{ color: '#1a1a2e' }}>
                    {formatFrenchCurrency(amount)}
                  </span>
                </div>
              ))}

              {/* Total TVA (if multiple rates) */}
              {Object.keys(tvaGroups).length > 1 && (
                <div
                  className="flex justify-between items-center px-4 py-2 border-b"
                  style={{ borderColor: '#e5e7eb' }}
                >
                  <span className="text-sm text-gray-600">Total TVA</span>
                  <span className="text-sm font-semibold" style={{ color: '#1a1a2e' }}>
                    {formatFrenchCurrency(totalTva)}
                  </span>
                </div>
              )}

              {/* Total TTC */}
              <div
                className="flex justify-between items-center px-4 py-3"
                style={{ background: '#1a1a2e', color: '#fff' }}
              >
                <span className="text-sm font-bold">Total TTC</span>
                <span className="text-base font-black">
                  {formatFrenchCurrency(totalTtc)}
                </span>
              </div>

              {/* Deposits */}
              {isFacture && deposits.length > 0 && (
                <>
                  {deposits.map((deposit, i) => (
                    <div
                      key={i}
                      className="flex justify-between items-center px-4 py-2 border-t"
                      style={{ borderColor: '#e5e7eb' }}
                    >
                      <span className="text-sm" style={{ color: '#10b981' }}>
                        Acompte {deposit.reference}
                        {deposit.date_emission && (
                          <span className="text-xs text-gray-400 ml-1">
                            ({formatDate(deposit.date_emission)})
                          </span>
                        )}
                      </span>
                      <span className="text-sm font-semibold" style={{ color: '#10b981' }}>
                        - {formatFrenchCurrency(Number(deposit.amount_ttc ?? 0))}
                      </span>
                    </div>
                  ))}
                  <div
                    className="flex justify-between items-center px-4 py-3 border-t"
                    style={{ background: '#fef3c7', borderColor: '#e5e7eb' }}
                  >
                    <span className="text-sm font-bold" style={{ color: '#92400e' }}>
                      Reste à payer TTC
                    </span>
                    <span className="text-base font-black" style={{ color: '#92400e' }}>
                      {formatFrenchCurrency(remaining)}
                    </span>
                  </div>
                </>
              )}

              {/* For invoices with remaining_ttc already set */}
              {isFacture &&
                deposits.length === 0 &&
                document?.remaining_ttc != null &&
                Number(document.remaining_ttc) !== totalTtc && (
                  <div
                    className="flex justify-between items-center px-4 py-3 border-t"
                    style={{ background: '#fef3c7', borderColor: '#e5e7eb' }}
                  >
                    <span className="text-sm font-bold" style={{ color: '#92400e' }}>
                      Reste à payer TTC
                    </span>
                    <span className="text-base font-black" style={{ color: '#92400e' }}>
                      {formatFrenchCurrency(Number(document.remaining_ttc))}
                    </span>
                  </div>
                )}
            </div>
          </div>

          {/* SAP MENTION */}
          {type === 'devis' && document?.sap_eligible && (
            <div
              className="rounded-lg p-3 mb-6 text-sm border"
              style={{
                background: '#d1fae5',
                borderColor: '#6ee7b7',
                color: '#065f46',
              }}
            >
              <span className="font-semibold">✓ Éligible au crédit d&apos;impôt SAP</span>
              <span className="ml-2 text-xs">
                Ce devis entre dans le cadre des Services à la Personne (SAP).
                Le client peut bénéficier d&apos;une réduction ou d&apos;un crédit d&apos;impôt de 50 %.
              </span>
            </div>
          )}

          {/* NOTES */}
          {document?.notes && (
            <div className="mb-6">
              <div
                className="text-xs font-bold uppercase tracking-wider mb-2"
                style={{ color: '#6b7280' }}
              >
                Notes internes
              </div>
              <div className="text-sm text-gray-500 italic">{document.notes}</div>
            </div>
          )}

          {/* CONDITIONS */}
          {document?.conditions && (
            <div
              className="pt-4 mb-6"
              style={{ borderTop: '2px solid #e5e7eb' }}
            >
              <div
                className="text-xs font-bold uppercase tracking-wider mb-2"
                style={{ color: '#6b7280' }}
              >
                Conditions générales
              </div>
              <div
                className="text-xs leading-relaxed"
                style={{ color: '#6b7280' }}
              >
                {document.conditions}
              </div>
            </div>
          )}

          {/* LEGAL MENTIONS */}
          {legalMentions && (
            <div
              className="pt-4 mb-6"
              style={{ borderTop: '1px solid #e5e7eb' }}
            >
              <div
                className="text-xs font-bold uppercase tracking-wider mb-2"
                style={{ color: '#6b7280' }}
              >
                Mentions légales
              </div>
              <div className="text-xs leading-relaxed" style={{ color: '#6b7280' }}>
                {legalMentions}
              </div>
            </div>
          )}

          {/* SIGNATURE BLOCK for devis */}
          {type === 'devis' && (
            <div className="flex justify-end mt-6">
              <div
                className="border rounded-lg p-4"
                style={{
                  minWidth: '220px',
                  minHeight: '90px',
                  borderColor: '#e5e7eb',
                  background: '#f9fafb',
                }}
              >
                <div className="text-xs font-semibold text-gray-500 mb-1 text-center">
                  Bon pour accord
                </div>
                <div className="text-xs text-gray-400 text-center mb-2">
                  Date et signature du client
                </div>
                <div style={{ height: '48px' }} />
              </div>
            </div>
          )}

          {/* FOOTER */}
          <div
            className="mt-8 pt-4 text-center text-xs leading-relaxed"
            style={{
              borderTop: '1px solid #e5e7eb',
              color: '#9ca3af',
            }}
          >
            <div>
              {company.name}
              {company.siret && (
                <span> — SIRET : {company.siret}</span>
              )}
              {companySettings?.tva_number && (
                <span> — N° TVA : {companySettings.tva_number}</span>
              )}
            </div>
            {company.address && (
              <div>
                {company.address}
                {(company as any)?.postal_code && (
                  <span>
                    {' '}
                    — {(company as any).postal_code} {(company as any).city}
                  </span>
                )}
              </div>
            )}
            {(iban || bic) && (
              <div className="mt-1">
                {iban && <span>IBAN : {iban}</span>}
                {iban && bic && <span> — </span>}
                {bic && <span>BIC : {bic}</span>}
              </div>
            )}
            {company.email && (
              <div>
                {company.email}
                {company.phone && <span> — {company.phone}</span>}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Print styles */}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            @media print {
              body * { visibility: hidden !important; }
              .print-area, .print-area * { visibility: visible !important; }
              .print-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
              }
              .print\\:hidden { display: none !important; }
            }
          `,
        }}
      />
    </div>
  );
}

export default DocumentPdf;
