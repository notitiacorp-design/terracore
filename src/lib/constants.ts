// src/lib/constants.ts
// TerraCore Pro - Application Constants

import type {
  QuoteStatus,
  InvoiceStatus,
  DocumentType,
  ItemType,
  PaymentMethod,
  ReminderLevel,
  WeatherSeverity,
  AiAgentType,
  ScheduleEventType,
  UserRole,
  ClientType,
} from '@/types/database';

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------
export const APP_NAME = 'TerraCore Pro' as const;

// ---------------------------------------------------------------------------
// Status colours – maps every QuoteStatus + InvoiceStatus value to Tailwind
// classes and a human-readable French label.
// ---------------------------------------------------------------------------
export const STATUS_COLORS: Record<
  QuoteStatus | InvoiceStatus,
  { bg: string; text: string; border: string; label: string }
> = {
  // ── QuoteStatus ──────────────────────────────────────────────────────────
  brouillon: {
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-300',
    label: 'Brouillon',
  },
  envoye: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
    label: 'Envoyé',
  },
  accepte: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-300',
    label: 'Accepté',
  },
  refuse: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    label: 'Refusé',
  },
  expire: {
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    border: 'border-orange-300',
    label: 'Expiré',
  },
  // ── InvoiceStatus (brouillon already defined above, intentionally repeated
  //    for InvoiceStatus union – at runtime they share the same key) ──────────
  envoyee: {
    bg: 'bg-blue-100',
    text: 'text-blue-700',
    border: 'border-blue-300',
    label: 'Envoyée',
  },
  payee: {
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-300',
    label: 'Payée',
  },
  partiellement_payee: {
    bg: 'bg-teal-100',
    text: 'text-teal-700',
    border: 'border-teal-300',
    label: 'Partiellement payée',
  },
  en_retard: {
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    label: 'En retard',
  },
  annulee: {
    bg: 'bg-gray-100',
    text: 'text-gray-500',
    border: 'border-gray-300',
    label: 'Annulée',
  },
} as const;

// ---------------------------------------------------------------------------
// Margin thresholds (percentages)
// ---------------------------------------------------------------------------
export const MARGIN_THRESHOLDS = {
  low: 15,
  medium: 25,
  high: 40,
} as const;

// ---------------------------------------------------------------------------
// Reminder workflow – days after previous step before next reminder is sent
// ---------------------------------------------------------------------------
export const REMINDER_INTERVALS: Record<ReminderLevel, number> = {
  relance_1: 1,
  relance_2: 7,
  relance_3: 15,
  mise_en_demeure: 30,
  contentieux: 60,
} as const;

// Human-readable French labels for each reminder level
export const REMINDER_LEVEL_LABELS: Record<ReminderLevel, string> = {
  relance_1: 'Relance 1',
  relance_2: 'Relance 2',
  relance_3: 'Relance 3',
  mise_en_demeure: 'Mise en demeure',
  contentieux: 'Contentieux',
} as const;

// ---------------------------------------------------------------------------
// Weather risk thresholds
// ---------------------------------------------------------------------------
export const WEATHER_RISK_THRESHOLDS: Record<
  WeatherSeverity,
  {
    label: string;
    color: string;
    bg: string;
    text: string;
    border: string;
    windSpeedMax: number | null; // km/h – null means no upper limit
    precipitationMax: number | null; // mm – null means no upper limit
    tempMin: number | null; // °C
    tempMax: number | null; // °C
  }
> = {
  favorable: {
    label: 'Favorable',
    color: '#10b981',
    bg: 'bg-emerald-100',
    text: 'text-emerald-700',
    border: 'border-emerald-300',
    windSpeedMax: 20,
    precipitationMax: 0,
    tempMin: 5,
    tempMax: 35,
  },
  acceptable: {
    label: 'Acceptable',
    color: '#f59e0b',
    bg: 'bg-amber-100',
    text: 'text-amber-700',
    border: 'border-amber-300',
    windSpeedMax: 40,
    precipitationMax: 5,
    tempMin: 0,
    tempMax: 38,
  },
  defavorable: {
    label: 'Défavorable',
    color: '#f97316',
    bg: 'bg-orange-100',
    text: 'text-orange-700',
    border: 'border-orange-300',
    windSpeedMax: 60,
    precipitationMax: 15,
    tempMin: -5,
    tempMax: 40,
  },
  alerte: {
    label: 'Alerte',
    color: '#ef4444',
    bg: 'bg-red-100',
    text: 'text-red-700',
    border: 'border-red-300',
    windSpeedMax: null,
    precipitationMax: null,
    tempMin: null,
    tempMax: null,
  },
} as const;

// ---------------------------------------------------------------------------
// TVA rates (percentages)
// ---------------------------------------------------------------------------
export const TVA_RATES = {
  normal: 20,
  intermediaire: 10,
  reduit: 5.5,
  super_reduit: 2.1,
} as const;

export type TvaRateKey = keyof typeof TVA_RATES;

/** Sorted array of TVA rate values for dropdowns */
export const TVA_RATE_OPTIONS: { label: string; value: number }[] = [
  { label: '20 % (taux normal)', value: TVA_RATES.normal },
  { label: '10 % (taux intermédiaire)', value: TVA_RATES.intermediaire },
  { label: '5,5 % (taux réduit)', value: TVA_RATES.reduit },
  { label: '2,1 % (taux super-réduit)', value: TVA_RATES.super_reduit },
];

// ---------------------------------------------------------------------------
// SAP (Services à la Personne) TVA rate
// ---------------------------------------------------------------------------
export const SAP_TVA_RATE = 10 as const;

// ---------------------------------------------------------------------------
// Document type labels in French
// ---------------------------------------------------------------------------
export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  devis: 'Devis',
  facture: 'Facture',
  avoir: 'Avoir',
  acompte: 'Facture d'acompte',
  situation: 'Facture de situation',
  bon_livraison: 'Bon de livraison',
} as const;

// ---------------------------------------------------------------------------
// Item type labels in French
// ---------------------------------------------------------------------------
export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  materiau: 'Matériau',
  main_oeuvre: "Main d'œuvre",
  fourniture: 'Fourniture',
  location: 'Location',
} as const;

// Item type badge colours
export const ITEM_TYPE_COLORS: Record<
  ItemType,
  { bg: string; text: string; border: string }
> = {
  materiau: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
  main_oeuvre: { bg: 'bg-violet-100', text: 'text-violet-700', border: 'border-violet-300' },
  fourniture: { bg: 'bg-sky-100', text: 'text-sky-700', border: 'border-sky-300' },
  location: { bg: 'bg-pink-100', text: 'text-pink-700', border: 'border-pink-300' },
} as const;

// ---------------------------------------------------------------------------
// Payment method labels in French
// ---------------------------------------------------------------------------
export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  virement: 'Virement bancaire',
  cheque: 'Chèque',
  cb: 'Carte bancaire',
  especes: 'Espèces',
  prelevement: 'Prélèvement automatique',
} as const;

// ---------------------------------------------------------------------------
// Schedule event type labels & colours in French
// ---------------------------------------------------------------------------
export const SCHEDULE_EVENT_TYPE_LABELS: Record<ScheduleEventType, string> = {
  chantier: 'Chantier',
  rdv_client: 'Rendez-vous client',
  reunion: 'Réunion',
  conge: 'Congé',
  absence: 'Absence',
} as const;

export const SCHEDULE_EVENT_TYPE_COLORS: Record<ScheduleEventType, string> = {
  chantier: '#10b981',   // emerald
  rdv_client: '#3b82f6', // blue
  reunion: '#8b5cf6',    // violet
  conge: '#f59e0b',      // amber
  absence: '#6b7280',    // gray
} as const;

// ---------------------------------------------------------------------------
// AI agent type labels in French
// ---------------------------------------------------------------------------
export const AI_AGENT_TYPE_LABELS: Record<AiAgentType, string> = {
  meteo_replan: 'Replanification météo',
  relance_auto: 'Relances automatiques',
  devis_assist: 'Assistant devis',
  marge_alert: 'Alertes marge',
} as const;

// AI agent colours (emerald-based per design spec)
export const AI_AGENT_TYPE_COLORS: Record<AiAgentType, string> = {
  meteo_replan: '#0ea5e9',  // sky
  relance_auto: '#f59e0b',  // amber
  devis_assist: '#10b981',  // emerald
  marge_alert: '#ef4444',   // red
} as const;

// ---------------------------------------------------------------------------
// User role labels in French
// ---------------------------------------------------------------------------
export const USER_ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Administrateur',
  bureau: 'Bureau',
  terrain: 'Terrain',
  lecture: 'Lecture seule',
} as const;

// ---------------------------------------------------------------------------
// Client type labels in French
// ---------------------------------------------------------------------------
export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  particulier: 'Particulier',
  pro: 'Professionnel',
} as const;

// ---------------------------------------------------------------------------
// Pagination defaults
// ---------------------------------------------------------------------------
export const DEFAULT_PAGE_SIZE = 20 as const;
export const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

// ---------------------------------------------------------------------------
// Quote & invoice defaults
// ---------------------------------------------------------------------------
export const DEFAULT_QUOTE_VALIDITY_DAYS = 30 as const;
export const DEFAULT_PAYMENT_TERMS_DAYS = 30 as const;
export const DEFAULT_TVA_RATE = TVA_RATES.normal;

// ---------------------------------------------------------------------------
// Margin alert colours (used in dashboard & quote editor)
// ---------------------------------------------------------------------------
export const MARGIN_COLOR_MAP = {
  low: { bg: 'bg-red-100', text: 'text-red-700', label: 'Marge faible' },
  medium: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Marge correcte' },
  high: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Bonne marge' },
} as const;

/**
 * Returns the margin colour key based on a given percentage.
 */
export function getMarginColorKey(
  percent: number,
): keyof typeof MARGIN_COLOR_MAP {
  if (percent < MARGIN_THRESHOLDS.low) return 'low';
  if (percent < MARGIN_THRESHOLDS.medium) return 'medium';
  return 'high';
}

// ---------------------------------------------------------------------------
// File upload constraints
// ---------------------------------------------------------------------------
export const MAX_FILE_SIZE_MB = 10 as const;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const ACCEPTED_DOCUMENT_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
] as const;

// ---------------------------------------------------------------------------
// Supabase storage buckets
// ---------------------------------------------------------------------------
export const STORAGE_BUCKETS = {
  documents: 'documents',
  logos: 'logos',
  avatars: 'avatars',
} as const;

// ---------------------------------------------------------------------------
// Route paths (centralised to avoid magic strings in components)
// ---------------------------------------------------------------------------
export const ROUTES = {
  home: '/',
  dashboard: '/dashboard',
  clients: '/clients',
  clientNew: '/clients/new',
  clientDetail: (id: string) => `/clients/${id}`,
  quotes: '/devis',
  quoteNew: '/devis/new',
  quoteDetail: (id: string) => `/devis/${id}`,
  invoices: '/factures',
  invoiceNew: '/factures/new',
  invoiceDetail: (id: string) => `/factures/${id}`,
  catalogue: '/catalogue',
  schedule: '/planning',
  employees: '/employes',
  contracts: '/contrats',
  payments: '/paiements',
  reminders: '/relances',
  ai: '/ia',
  settings: '/parametres',
  profile: '/profil',
  login: '/login',
  onboarding: '/onboarding',
} as const;

// ---------------------------------------------------------------------------
// Notification auto-dismiss delay (ms)
// ---------------------------------------------------------------------------
export const TOAST_DURATION_MS = 4000 as const;
export const TOAST_ERROR_DURATION_MS = 7000 as const;
