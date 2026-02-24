export const APP_NAME = 'TerraCore Pro';

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Tableau de bord', href: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Clients', href: '/dashboard/clients', icon: 'Users' },
  { label: 'Devis', href: '/dashboard/quotes', icon: 'FileText' },
  { label: 'Factures', href: '/dashboard/invoices', icon: 'Receipt' },
  { label: 'Interventions', href: '/dashboard/interventions', icon: 'Wrench' },
  { label: 'Planning', href: '/dashboard/schedule', icon: 'Calendar' },
  { label: 'Contrats', href: '/dashboard/contracts', icon: 'ClipboardList' },
  { label: 'Catalogue', href: '/dashboard/catalog', icon: 'Package' },
  { label: 'Employés', href: '/dashboard/employees', icon: 'UserCheck' },
  { label: 'Rapports', href: '/dashboard/reports', icon: 'BarChart2' },
  { label: 'Paramètres', href: '/dashboard/settings', icon: 'Settings' },
];

export type QuoteStatusColor = {
  bg: string;
  text: string;
  label: string;
};

export const STATUS_COLORS: Record<string, QuoteStatusColor> = {
  // Quote statuses
  draft: { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Brouillon' },
  sent: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Envoyé' },
  viewed: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Consulté' },
  accepted: { bg: 'bg-green-100', text: 'text-green-700', label: 'Accepté' },
  rejected: { bg: 'bg-red-100', text: 'text-red-700', label: 'Refusé' },
  expired: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Expiré' },
  cancelled: { bg: 'bg-gray-200', text: 'text-gray-600', label: 'Annulé' },
  // Invoice statuses
  pending: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'En attente' },
  partial: { bg: 'bg-indigo-100', text: 'text-indigo-700', label: 'Partiel' },
  paid: { bg: 'bg-green-100', text: 'text-green-700', label: 'Payé' },
  overdue: { bg: 'bg-red-100', text: 'text-red-700', label: 'En retard' },
  refunded: { bg: 'bg-teal-100', text: 'text-teal-700', label: 'Remboursé' },
};

export const VAT_RATES: number[] = [5.5, 10, 20];

export const DEFAULT_PAYMENT_TERMS: number = 30;

export const QUOTE_VALIDITY_DAYS: number = 30;
