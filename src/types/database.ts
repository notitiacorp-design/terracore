// =============================================================================
// DATABASE TYPES - AUTO-GENERATED FOR SUPABASE
// =============================================================================

// =============================================================================
// ENUMS
// =============================================================================

export type UserRole = 'admin' | 'bureau' | 'terrain' | 'lecture';
export type ClientType = 'particulier' | 'pro';
export type ItemType = 'materiau' | 'main_oeuvre' | 'fourniture' | 'location';
export type QuoteStatus = 'brouillon' | 'envoye' | 'accepte' | 'refuse' | 'expire';
export type InvoiceStatus = 'brouillon' | 'envoyee' | 'payee' | 'partiellement_payee' | 'en_retard' | 'annulee';
export type DocumentType = 'devis' | 'facture' | 'avoir' | 'acompte' | 'situation' | 'bon_livraison';
export type ReminderLevel = 'relance_1' | 'relance_2' | 'relance_3' | 'mise_en_demeure' | 'contentieux';
export type WeatherSeverity = 'favorable' | 'acceptable' | 'defavorable' | 'alerte';
export type PaymentMethod = 'virement' | 'cheque' | 'cb' | 'especes' | 'prelevement';
export type ScheduleEventType = 'chantier' | 'rdv_client' | 'reunion' | 'conge' | 'absence';
export type AiAgentType = 'meteo_replan' | 'relance_auto' | 'devis_assist' | 'marge_alert';

// =============================================================================
// TABLE: company
// =============================================================================

export interface CompanyRow {
  id: string;
  name: string;
  siret: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  logo_url: string | null;
  settings: Record<string, unknown>;
  subscription_plan: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface CompanyInsert {
  id?: string;
  name: string;
  siret?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  settings?: Record<string, unknown>;
  subscription_plan?: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CompanyUpdate {
  name?: string;
  siret?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  logo_url?: string | null;
  settings?: Record<string, unknown>;
  subscription_plan?: string;
  updated_at?: string | null;
}

// =============================================================================
// TABLE: user_profile
// =============================================================================

export interface UserProfileRow {
  id: string;
  company_id: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface UserProfileInsert {
  id: string;
  company_id: string;
  role?: UserRole;
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  avatar_url?: string | null;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface UserProfileUpdate {
  company_id?: string;
  role?: UserRole;
  first_name?: string;
  last_name?: string;
  phone?: string | null;
  avatar_url?: string | null;
  is_active?: boolean;
  updated_at?: string | null;
}

// =============================================================================
// TABLE: employee
// =============================================================================

export interface EmployeeRow {
  id: string;
  company_id: string;
  user_profile_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  hourly_rate: number;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface EmployeeInsert {
  id?: string;
  company_id: string;
  user_profile_id?: string | null;
  first_name: string;
  last_name: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  hourly_rate?: number;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface EmployeeUpdate {
  company_id?: string;
  user_profile_id?: string | null;
  first_name?: string;
  last_name?: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  hourly_rate?: number;
  is_active?: boolean;
  updated_at?: string | null;
}

// =============================================================================
// TABLE: client
// =============================================================================

export interface ClientRow {
  id: string;
  company_id: string;
  client_type: ClientType;
  company_name: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  payment_terms_days: number;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface ClientInsert {
  id?: string;
  company_id: string;
  client_type?: ClientType;
  company_name?: string | null;
  first_name?: string;
  last_name?: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  payment_terms_days?: number;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ClientUpdate {
  company_id?: string;
  client_type?: ClientType;
  company_name?: string | null;
  first_name?: string;
  last_name?: string;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
  payment_terms_days?: number;
  is_active?: boolean;
  updated_at?: string | null;
}

// =============================================================================
// TABLE: client_contact
// =============================================================================

export interface ClientContactRow {
  id: string;
  client_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role: string | null;
  is_primary: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface ClientContactInsert {
  id?: string;
  client_id: string;
  first_name: string;
  last_name?: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  is_primary?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ClientContactUpdate {
  client_id?: string;
  first_name?: string;
  last_name?: string;
  email?: string | null;
  phone?: string | null;
  role?: string | null;
  is_primary?: boolean;
  updated_at?: string | null;
}

// =============================================================================
// TABLE: site_address
// =============================================================================

export interface SiteAddressRow {
  id: string;
  client_id: string;
  company_id: string;
  label: string | null;
  street: string;
  complement: string | null;
  postal_code: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  is_default: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface SiteAddressInsert {
  id?: string;
  client_id: string;
  company_id: string;
  label?: string | null;
  street: string;
  complement?: string | null;
  postal_code: string;
  city: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  is_default?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface SiteAddressUpdate {
  client_id?: string;
  company_id?: string;
  label?: string | null;
  street?: string;
  complement?: string | null;
  postal_code?: string;
  city?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  is_default?: boolean;
  updated_at?: string | null;
}

// =============================================================================
// TABLE: price_category
// =============================================================================

export interface PriceCategoryRow {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  discount_percent: number;
  is_default: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface PriceCategoryInsert {
  id?: string;
  company_id: string;
  name: string;
  description?: string | null;
  discount_percent?: number;
  is_default?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface PriceCategoryUpdate {
  company_id?: string;
  name?: string;
  description?: string | null;
  discount_percent?: number;
  is_default?: boolean;
  updated_at?: string | null;
}

// =============================================================================
// TABLE: item_family
// =============================================================================

export interface ItemFamilyRow {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ItemFamilyInsert {
  id?: string;
  company_id: string;
  name: string;
  description?: string | null;
  parent_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ItemFamilyUpdate {
  company_id?: string;
  name?: string;
  description?: string | null;
  parent_id?: string | null;
  updated_at?: string | null;
}

// =============================================================================
// TABLE: item
// =============================================================================

export interface ItemRow {
  id: string;
  company_id: string;
  family_id: string | null;
  item_type: ItemType;
  reference: string | null;
  name: string;
  description: string | null;
  unit: string;
  unit_price: number;
  cost_price: number;
  vat_rate: number;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface ItemInsert {
  id?: string;
  company_id: string;
  family_id?: string | null;
  item_type?: ItemType;
  reference?: string | null;
  name: string;
  description?: string | null;
  unit?: string;
  unit_price?: number;
  cost_price?: number;
  vat_rate?: number;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ItemUpdate {
  company_id?: string;
  family_id?: string | null;
  item_type?: ItemType;
  reference?: string | null;
  name?: string;
  description?: string | null;
  unit?: string;
  unit_price?: number;
  cost_price?: number;
  vat_rate?: number;
  is_active?: boolean;
  updated_at?: string | null;
}

// =============================================================================
// TABLE: work_unit
// =============================================================================

export interface WorkUnitRow {
  id: string;
  company_id: string;
  reference: string | null;
  name: string;
  description: string | null;
  unit: string;
  unit_price: number;
  vat_rate: number;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface WorkUnitInsert {
  id?: string;
  company_id: string;
  reference?: string | null;
  name: string;
  description?: string | null;
  unit?: string;
  unit_price?: number;
  vat_rate?: number;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface WorkUnitUpdate {
  company_id?: string;
  reference?: string | null;
  name?: string;
  description?: string | null;
  unit?: string;
  unit_price?: number;
  vat_rate?: number;
  is_active?: boolean;
  updated_at?: string | null;
}

// =============================================================================
// TABLE: work_unit_line
// =============================================================================

export interface WorkUnitLineRow {
  id: string;
  work_unit_id: string;
  item_id: string;
  quantity: number;
  created_at: string | null;
}

export interface WorkUnitLineInsert {
  id?: string;
  work_unit_id: string;
  item_id: string;
  quantity?: number;
  created_at?: string | null;
}

export interface WorkUnitLineUpdate {
  work_unit_id?: string;
  item_id?: string;
  quantity?: number;
}

// =============================================================================
// TABLE: quote
// =============================================================================

export interface QuoteRow {
  id: string;
  company_id: string;
  client_id: string;
  site_address_id: string | null;
  quote_number: string;
  status: QuoteStatus;
  issue_date: string;
  date_validity: string | null;
  subject: string | null;
  notes: string | null;
  internal_notes: string | null;
  terms_conditions: string | null;
  discount_percent: number;
  discount_amount: number;
  total_ht: number;
  total_vat: number;
  total_ttc: number;
  assigned_to: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface QuoteInsert {
  id?: string;
  company_id: string;
  client_id: string;
  site_address_id?: string | null;
  quote_number: string;
  status?: QuoteStatus;
  issue_date?: string;
  date_validity?: string | null;
  subject?: string | null;
  notes?: string | null;
  internal_notes?: string | null;
  terms_conditions?: string | null;
  discount_percent?: number;
  discount_amount?: number;
  total_ht?: number;
  total_vat?: number;
  total_ttc?: number;
  assigned_to?: string | null;
  sent_at?: string | null;
  viewed_at?: string | null;
  accepted_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface QuoteUpdate {
  company_id?: string;
  client_id?: string;
  site_address_id?: string | null;
  quote_number?: string;
  status?: QuoteStatus;
  issue_date?: string;
  date_validity?: string | null;
  subject?: string | null;
  notes?: string | null;
  internal_notes?: string | null;
  terms_conditions?: string | null;
  discount_percent?: number;
  discount_amount?: number;
  total_ht?: number;
  total_vat?: number;
  total_ttc?: number;
  assigned_to?: string | null;
  sent_at?: string | null;
  viewed_at?: string | null;
  accepted_at?: string | null;
  updated_at?: string | null;
}

// =============================================================================
// TABLE: quote_line
// =============================================================================

export interface QuoteLineRow {
  id: string;
  quote_id: string;
  item_id: string | null;
  work_unit_id: string | null;
  position: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  vat_rate: number;
  total_ht: number;
  total_ttc: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface QuoteLineInsert {
  id?: string;
  quote_id: string;
  item_id?: string | null;
  work_unit_id?: string | null;
  position?: number;
  description: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  discount_percent?: number;
  vat_rate?: number;
  total_ht?: number;
  total_ttc?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface QuoteLineUpdate {
  quote_id?: string;
  item_id?: string | null;
  work_unit_id?: string | null;
  position?: number;
  description?: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  discount_percent?: number;
  vat_rate?: number;
  total_ht?: number;
  total_ttc?: number;
  updated_at?: string | null;
}

// =============================================================================
// TABLE: invoice
// =============================================================================

export interface InvoiceRow {
  id: string;
  company_id: string;
  client_id: string;
  quote_id: string | null;
  site_address_id: string | null;
  invoice_number: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  subject: string | null;
  notes: string | null;
  internal_notes: string | null;
  terms_conditions: string | null;
  discount_percent: number;
  discount_amount: number;
  total_ht: number;
  total_vat: number;
  total_ttc: number;
  amount_paid: number;
  amount_remaining: number;
  assigned_to: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  paid_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface InvoiceInsert {
  id?: string;
  company_id: string;
  client_id: string;
  quote_id?: string | null;
  site_address_id?: string | null;
  invoice_number: string;
  status?: InvoiceStatus;
  issue_date?: string;
  due_date?: string | null;
  subject?: string | null;
  notes?: string | null;
  internal_notes?: string | null;
  terms_conditions?: string | null;
  discount_percent?: number;
  discount_amount?: number;
  total_ht?: number;
  total_vat?: number;
  total_ttc?: number;
  amount_paid?: number;
  amount_remaining?: number;
  assigned_to?: string | null;
  sent_at?: string | null;
  viewed_at?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface InvoiceUpdate {
  company_id?: string;
  client_id?: string;
  quote_id?: string | null;
  site_address_id?: string | null;
  invoice_number?: string;
  status?: InvoiceStatus;
  issue_date?: string;
  due_date?: string | null;
  subject?: string | null;
  notes?: string | null;
  internal_notes?: string | null;
  terms_conditions?: string | null;
  discount_percent?: number;
  discount_amount?: number;
  total_ht?: number;
  total_vat?: number;
  total_ttc?: number;
  amount_paid?: number;
  amount_remaining?: number;
  assigned_to?: string | null;
  sent_at?: string | null;
  viewed_at?: string | null;
  paid_at?: string | null;
  updated_at?: string | null;
}

// =============================================================================
// TABLE: invoice_line
// =============================================================================

export interface InvoiceLineRow {
  id: string;
  invoice_id: string;
  item_id: string | null;
  work_unit_id: string | null;
  position: number;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  discount_percent: number;
  vat_rate: number;
  total_ht: number;
  total_ttc: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface InvoiceLineInsert {
  id?: string;
  invoice_id: string;
  item_id?: string | null;
  work_unit_id?: string | null;
  position?: number;
  description: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  discount_percent?: number;
  vat_rate?: number;
  total_ht?: number;
  total_ttc?: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface InvoiceLineUpdate {
  invoice_id?: string;
  item_id?: string | null;
  work_unit_id?: string | null;
  position?: number;
  description?: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  discount_percent?: number;
  vat_rate?: number;
  total_ht?: number;
  total_ttc?: number;
  updated_at?: string | null;
}

// =============================================================================
// TABLE: deposit_invoice
// =============================================================================

export interface DepositInvoiceRow {
  id: string;
  company_id: string;
  invoice_id: string;
  quote_id: string;
  deposit_percent: number;
  deposit_amount: number;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface DepositInvoiceInsert {
  id?: string;
  company_id: string;
  invoice_id: string;
  quote_id: string;
  deposit_percent: number;
  deposit_amount: number;
  status?: InvoiceStatus;
  issue_date?: string;
  due_date?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DepositInvoiceUpdate {
  company_id?: string;
  invoice_id?: string;
  quote_id?: string;
  deposit_percent?: number;
  deposit_amount?: number;
  status?: InvoiceStatus;
  issue_date?: string;
  due_date?: string | null;
  updated_at?: string | null;
}

// =============================================================================
// TABLE: progress_invoice
// =============================================================================

export interface ProgressInvoiceRow {
  id: string;
  company_id: string;
  invoice_id: string;
  quote_id: string;
  progress_number: number;
  cumulative_percent: number;
  cumulative_amount: number;
  period_amount: number;
  status: InvoiceStatus;
  issue_date: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface ProgressInvoiceInsert {
  id?: string;
  company_id: string;
  invoice_id: string;
  quote_id: string;
  progress_number: number;
  cumulative_percent: number;
  cumulative_amount: number;
  period_amount: number;
  status?: InvoiceStatus;
  issue_date?: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ProgressInvoiceUpdate {
  company_id?: string;
  invoice_id?: string;
  quote_id?: string;
  progress_number?: number;
  cumulative_percent?: number;
  cumulative_amount?: number;
  period_amount?: number;
  status?: InvoiceStatus;
  issue_date?: string;
  updated_at?: string | null;
}

// =============================================================================
// TABLE: delivery_note
// =============================================================================

export interface DeliveryNoteRow {
  id: string;
  company_id: string;
  client_id: string;
  site_address_id: string | null;
  quote_id: string | null;
  delivery_number: string;
  delivery_date: string;
  notes: string | null;
  signed_by_client: boolean;
  client_signature_url: string | null;
  signed_at: string | null;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface DeliveryNoteInsert {
  id?: string;
  company_id: string;
  client_id: string;
  site_address_id?: string | null;
  quote_id?: string | null;
  delivery_number: string;
  delivery_date?: string;
  notes?: string | null;
  signed_by_client?: boolean;
  client_signature_url?: string | null;
  signed_at?: string | null;
  created_by: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface DeliveryNoteUpdate {
  company_id?: string;
  client_id?: string;
  site_address_id?: string | null;
  quote_id?: string | null;
  delivery_number?: string;
  delivery_date?: string;
  notes?: string | null;
  signed_by_client?: boolean;
  client_signature_url?: string | null;
  signed_at?: string | null;
  updated_at?: string | null;
}

// =============================================================================
// TABLE: delivery_note_line
// =============================================================================

export interface DeliveryNoteLineRow {
  id: string;
  delivery_note_id: string;
  item_id: string | null;
  description: string;
  quantity: number;
  unit: string;
  created_at: string | null;
}

export interface DeliveryNoteLineInsert {
  id?: string;
  delivery_note_id: string;
  item_id?: string | null;
  description: string;
  quantity?: number;
  unit?: string;
  created_at?: string | null;
}

export interface DeliveryNoteLineUpdate {
  delivery_note_id?: string;
  item_id?: string | null;
  description?: string;
  quantity?: number;
  unit?: string;
}

// =============================================================================
// TABLE: maintenance_contract
// =============================================================================

export interface MaintenanceContractRow {
  id: string;
  company_id: string;
  client_id: string;
  site_address_id: string | null;
  contract_number: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  recurrence_rule: string | null;
  annual_amount: number;
  is_active: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface MaintenanceContractInsert {
  id?: string;
  company_id: string;
  client_id: string;
  site_address_id?: string | null;
  contract_number: string;
  title: string;
  description?: string | null;
  start_date: string;
  end_date?: string | null;
  recurrence_rule?: string | null;
  annual_amount?: number;
  is_active?: boolean;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface MaintenanceContractUpdate {
  company_id?: string;
  client_id?: string;
  site_address_id?: string | null;
  contract_number?: string;
  title?: string;
  description?: string | null;
  start_date?: string;
  end_date?: string | null;
  recurrence_rule?: string | null;
  annual_amount?: number;
  is_active?: boolean;
  updated_at?: string | null;
}

// =============================================================================
// TABLE: schedule_event
// =============================================================================

export interface ScheduleEventRow {
  id: string;
  company_id: string;
  event_type: ScheduleEventType;
  title: string;
  description: string | null;
  start_datetime: string;
  end_datetime: string | null;
  all_day: boolean;
  site_address_id: string | null;
  client_id: string | null;
  status: string;
  color: string | null;
  recurrence_rule: string | null;
  locked: boolean;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface ScheduleEventInsert {
  id?: string;
  company_id: string;
  event_type?: ScheduleEventType;
  title: string;
  description?: string | null;
  start_datetime: string;
  end_datetime?: string | null;
  all_day?: boolean;
  site_address_id?: string | null;
  client_id?: string | null;
  status?: string;
  color?: string | null;
  recurrence_rule?: string | null;
  locked?: boolean;
  created_by: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ScheduleEventUpdate {
  company_id?: string;
  event_type?: ScheduleEventType;
  title?: string;
  description?: string | null;
  start_datetime?: string;
  end_datetime?: string | null;
  all_day?: boolean;
  site_address_id?: string | null;
  client_id?: string | null;
  status?: string;
  color?: string | null;
  recurrence_rule?: string | null;
  locked?: boolean;
  updated_at?: string | null;
}

// =============================================================================
// TABLE: schedule_event_employee
// =============================================================================

export interface ScheduleEventEmployeeRow {
  id: string;
  schedule_event_id: string;
  employee_id: string;
  created_at: string | null;
}

export interface ScheduleEventEmployeeInsert {
  id?: string;
  schedule_event_id: string;
  employee_id: string;
  created_at?: string | null;
}

export interface ScheduleEventEmployeeUpdate {
  schedule_event_id?: string;
  employee_id?: string;
}

// =============================================================================
// TABLE: intervention
// =============================================================================

export interface InterventionRow {
  id: string;
  company_id: string;
  client_id: string;
  site_address_id: string | null;
  schedule_event_id: string | null;
  contract_id: string | null;
  invoice_id: string | null;
  intervention_number: string;
  title: string;
  description: string | null;
  start_datetime: string;
  end_datetime: string | null;
  duration_minutes: number | null;
  status: string;
  notes: string | null;
  client_signature_url: string | null;
  signed_at: string | null;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
}

export interface InterventionInsert {
  id?: string;
  company_id: string;
  client_id: string;
  site_address_id?: string | null;
  schedule_event_id?: string | null;
  contract_id?: string | null;
  invoice_id?: string | null;
  intervention_number: string;
  title: string;
  description?: string | null;
  start_datetime: string;
  end_datetime?: string | null;
  duration_minutes?: number | null;
  status?: string;
  notes?: string | null;
  client_signature_url?: string | null;
  signed_at?: string | null;
  created_by: string;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface InterventionUpdate {
  company_id?: string;
  client_id?: string;
  site_address_id?: string | null;
  schedule_event_id?: string | null;
  contract_id?: string | null;
  invoice_id?: string | null;
  intervention_number?: string;
  title?: string;
  description?: string | null;
  start_datetime?: string;
  end_datetime?: string | null;
  duration_minutes?: number | null;
  status?: string;
  notes?: string | null;
  client_signature_url?: string | null;
  signed_at?: string | null;
  updated_at?: string | null;
}

// =============================================================================
// TABLE: intervention_line
// =============================================================================

export interface InterventionLineRow {
  id: string;
  intervention_id: string;
  item_id: string | null;
  description: string;
  quantity: number;
  unit: string;
  unit_price: number;
  vat_rate: number;
  total_ht: number;
  created_at: string | null;
}

export interface InterventionLineInsert {
  id?: string;
  intervention_id: string;
  item_id?: string | null;
  description: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  vat_rate?: number;
  total_ht?: number;
  created_at?: string | null;
}

export interface InterventionLineUpdate {
  intervention_id?: string;
  item_id?: string | null;
  description?: string;
  quantity?: number;
  unit?: string;
  unit_price?: number;
  vat_rate?: number;
  total_ht?: number;
}

// =============================================================================
// TABLE: weather_snapshot
// =============================================================================

export interface WeatherSnapshotRow {
  id: string;
  company_id: string;
  site_address_id: string;
  forecast_date: string;
  fetched_at: string;
  temp_min: number | null;
  temp_max: number | null;
  precipitation_mm: number | null;
  wind_kmh: number | null;
  condition_code: string | null;
  condition_label: string | null;
  severity: WeatherSeverity;
  raw_data: Record<string, unknown> | null;
  created_at: string | null;
}

export interface WeatherSnapshotInsert {
  id?: string;
  company_id: string;
  site_address_id: string;
  forecast_date: string;
  fetched_at?: string;
  temp_min?: number | null;
  temp_max?: number | null;
  precipitation_mm?: number | null;
  wind_kmh?: number | null;
  condition_code?: string | null;
  condition_label?: string | null;
  severity?: WeatherSeverity;
  raw_data?: Record<string, unknown> | null;
  created_at?: string | null;
}

export interface WeatherSnapshotUpdate {
  company_id?: string;
  site_address_id?: string;
  forecast_date?: string;
  fetched_at?: string;
  temp_min?: number | null;
  temp_max?: number | null;
  precipitation_mm?: number | null;
  wind_kmh?: number | null;
  condition_code?: string | null;
  condition_label?: string | null;
  severity?: WeatherSeverity;
  raw_data?: Record<string, unknown> | null;
}

// =============================================================================
// TABLE: route_estimate
// =============================================================================

export interface RouteEstimateRow {
  id: string;
  company_id: string;
  origin_address_id: string;
  destination_address_id: string;
  distance_km: number | null;
  duration_minutes: number | null;
  calculated_at: string;
  created_at: string | null;
}

export interface RouteEstimateInsert {
  id?: string;
  company_id: string;
  origin_address_id: string;
  destination_address_id: string;
  distance_km?: number | null;
  duration_minutes?: number | null;
  calculated_at?: string;
  created_at?: string | null;
}

export interface RouteEstimateUpdate {
  company_id?: string;
  origin_address_id?: string;
  destination_address_id?: string;
  distance_km?: number | null;
  duration_minutes?: number | null;
  calculated_at?: string;
}

// =============================================================================
// TABLE: payment
// =============================================================================

export interface PaymentRow {
  id: string;
  company_id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  method: PaymentMethod;
  reference: string | null;
  notes: string | null;
  created_by: string;
  created_at: string | null;
}

export interface PaymentInsert {
  id?: string;
  company_id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  method?: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
  created_by: string;
  created_at?: string | null;
}

export interface PaymentUpdate {
  company_id?: string;
  invoice_id?: string;
  amount?: number;
  payment_date?: string;
  method?: PaymentMethod;
  reference?: string | null;
  notes?: string | null;
}

// =============================================================================
// TABLE: payment_link
// =============================================================================

export interface PaymentLinkRow {
  id: string;
  company_id: string;
  invoice_id: string;
  token: string;
  amount: number;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  status: string;
  expires_at: string | null;
  paid_at: string | null;
  created_at: string | null;
}

export interface PaymentLinkInsert {
  id?: string;
  company_id: string;
  invoice_id: string;
  token: string;
  amount: number;
  stripe_payment_intent_id?: string | null;
  stripe_checkout_session_id?: string | null;
  status?: string;
  expires_at?: string | null;
  paid_at?: string | null;
  created_at?: string | null;
}

export interface PaymentLinkUpdate {
  company_id?: string;
  invoice_id?: string;
  token?: string;
  amount?: number;
  stripe_payment_intent_id?: string | null;
  stripe_checkout_session_id?: string | null;
  status?: string;
  expires_at?: string | null;
  paid_at?: string | null;
}

// =============================================================================
// TABLE: reminder_workflow
// =============================================================================

export interface ReminderWorkflowRow {
  id: string;
  company_id: string;
  invoice_id: string;
  current_level: ReminderLevel;
  is_active: boolean;
  next_reminder_at: string | null;
  stopped_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface ReminderWorkflowInsert {
  id?: string;
  company_id: string;
  invoice_id: string;
  current_level?: ReminderLevel;
  is_active?: boolean;
  next_reminder_at?: string | null;
  stopped_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ReminderWorkflowUpdate {
  company_id?: string;
  invoice_id?: string;
  current_level?: ReminderLevel;
  is_active?: boolean;
  next_reminder_at?: string | null;
  stopped_at?: string | null;
  updated_at?: string | null;
}

// =============================================================================
// TABLE: reminder_message
// =============================================================================

export interface ReminderMessageRow {
  id: string;
  workflow_id: string;
  level: ReminderLevel;
  channel: string;
  subject: string | null;
  body: string;
  sent_at: string | null;
  delivered: boolean;
  opened: boolean;
  created_at: string | null;
}

export interface ReminderMessageInsert {
  id?: string;
  workflow_id: string;
  level: ReminderLevel;
  channel: string;
  subject?: string | null;
  body: string;
  sent_at?: string | null;
  delivered?: boolean;
  opened?: boolean;
  created_at?: string | null;
}

export interface ReminderMessageUpdate {
  workflow_id?: string;
  level?: ReminderLevel;
  channel?: string;
  subject?: string | null;
  body?: string;
  sent_at?: string | null;
  delivered?: boolean;
  opened?: boolean;
}

// =============================================================================
// TABLE: ai_agent_run
// =============================================================================

export interface AiAgentRunRow {
  id: string;
  company_id: string;
  agent_type: AiAgentType;
  status: string;
  input_data: Record<string, unknown> | null;
  output_data: Record<string, unknown> | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  duration_ms: number | null;
  tokens_used: number;
  created_at: string | null;
}

export interface AiAgentRunInsert {
  id?: string;
  company_id: string;
  agent_type: AiAgentType;
  status?: string;
  input_data?: Record<string, unknown> | null;
  output_data?: Record<string, unknown> | null;
  error_message?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  duration_ms?: number | null;
  tokens_used?: number;
  created_at?: string | null;
}

export interface AiAgentRunUpdate {
  company_id?: string;
  agent_type?: AiAgentType;
  status?: string;
  input_data?: Record<string, unknown> | null;
  output_data?: Record<string, unknown> | null;
  error_message?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  duration_ms?: number | null;
  tokens_used?: number;
}

// =============================================================================
// TABLE: ai_proposal
// =============================================================================

export interface AiProposalRow {
  id: string;
  company_id: string;
  agent_run_id: string;
  entity_type: string;
  entity_id: string;
  title: string;
  description: string | null;
  proposed_action: Record<string, unknown>;
  status: string;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string | null;
}

export interface AiProposalInsert {
  id?: string;
  company_id: string;
  agent_run_id: string;
  entity_type: string;
  entity_id: string;
  title: string;
  description?: string | null;
  proposed_action: Record<string, unknown>;
  status?: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  created_at?: string | null;
}

export interface AiProposalUpdate {
  company_id?: string;
  agent_run_id?: string;
  entity_type?: string;
  entity_id?: string;
  title?: string;
  description?: string | null;
  proposed_action?: Record<string, unknown>;
  status?: string;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
}

// =============================================================================
// TABLE: audit_log
// =============================================================================

export interface AuditLogRow {
  id: string;
  company_id: string;
  user_id: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  changes: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string | null;
}

export interface AuditLogInsert {
  id?: string;
  company_id: string;
  user_id?: string | null;
  entity_type: string;
  entity_id: string;
  action: string;
  changes?: Record<string, unknown> | null;
  ip_address?: string | null;
  created_at?: string | null;
}

export interface AuditLogUpdate {
  company_id?: string;
  user_id?: string | null;
  entity_type?: string;
  entity_id?: string;
  action?: string;
  changes?: Record<string, unknown> | null;
  ip_address?: string | null;
}

// =============================================================================
// TABLE: document_attachment
// =============================================================================

export interface DocumentAttachmentRow {
  id: string;
  company_id: string;
  entity_type: DocumentType;
  entity_id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string | null;
  version: number;
  uploaded_by: string;
  created_at: string | null;
}

export interface DocumentAttachmentInsert {
  id?: string;
  company_id: string;
  entity_type: DocumentType;
  entity_id: string;
  file_name: string;
  file_path: string;
  file_size?: number;
  mime_type?: string | null;
  version?: number;
  uploaded_by: string;
  created_at?: string | null;
}

export interface DocumentAttachmentUpdate {
  company_id?: string;
  entity_type?: DocumentType;
  entity_id?: string;
  file_name?: string;
  file_path?: string;
  file_size?: number;
  mime_type?: string | null;
  version?: number;
  uploaded_by?: string;
}

// =============================================================================
// TABLE: notification
// =============================================================================

export interface NotificationRow {
  id: string;
  company_id: string;
  user_id: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string | null;
}

export interface NotificationInsert {
  id?: string;
  company_id: string;
  user_id: string;
  title: string;
  body?: string | null;
  link?: string | null;
  is_read?: boolean;
  created_at?: string | null;
}

export interface NotificationUpdate {
  company_id?: string;
  user_id?: string;
  title?: string;
  body?: string | null;
  link?: string | null;
  is_read?: boolean;
}

// =============================================================================
// TABLE: company_settings
// =============================================================================

export interface CompanySettingsRow {
  id: string;
  company_id: string;
  default_vat_rate: number;
  default_payment_terms: number;
  quote_validity_days: number;
  invoice_prefix: string;
  quote_prefix: string;
  reminder_enabled: boolean;
  reminder_schedule: Record<string, unknown>;
  working_hours: Record<string, unknown>;
  created_at: string | null;
  updated_at: string | null;
}

export interface CompanySettingsInsert {
  id?: string;
  company_id: string;
  default_vat_rate?: number;
  default_payment_terms?: number;
  quote_validity_days?: number;
  invoice_prefix?: string;
  quote_prefix?: string;
  reminder_enabled?: boolean;
  reminder_schedule?: Record<string, unknown>;
  working_hours?: Record<string, unknown>;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface CompanySettingsUpdate {
  company_id?: string;
  default_vat_rate?: number;
  default_payment_terms?: number;
  quote_validity_days?: number;
  invoice_prefix?: string;
  quote_prefix?: string;
  reminder_enabled?: boolean;
  reminder_schedule?: Record<string, unknown>;
  working_hours?: Record<string, unknown>;
  updated_at?: string | null;
}

// =============================================================================
// DATABASE INTERFACE
// =============================================================================

export interface Database {
  public: {
    Tables: {
      company: {
        Row: CompanyRow;
        Insert: CompanyInsert;
        Update: CompanyUpdate;
      };
      user_profile: {
        Row: UserProfileRow;
        Insert: UserProfileInsert;
        Update: UserProfileUpdate;
      };
      employee: {
        Row: EmployeeRow;
        Insert: EmployeeInsert;
        Update: EmployeeUpdate;
      };
      client: {
        Row: ClientRow;
        Insert: ClientInsert;
        Update: ClientUpdate;
      };
      client_contact: {
        Row: ClientContactRow;
        Insert: ClientContactInsert;
        Update: ClientContactUpdate;
      };
      site_address: {
        Row: SiteAddressRow;
        Insert: SiteAddressInsert;
        Update: SiteAddressUpdate;
      };
      price_category: {
        Row: PriceCategoryRow;
        Insert: PriceCategoryInsert;
        Update: PriceCategoryUpdate;
      };
      item_family: {
        Row: ItemFamilyRow;
        Insert: ItemFamilyInsert;
        Update: ItemFamilyUpdate;
      };
      item: {
        Row: ItemRow;
        Insert: ItemInsert;
        Update: ItemUpdate;
      };
      work_unit: {
        Row: WorkUnitRow;
        Insert: WorkUnitInsert;
        Update: WorkUnitUpdate;
      };
      work_unit_line: {
        Row: WorkUnitLineRow;
        Insert: WorkUnitLineInsert;
        Update: WorkUnitLineUpdate;
      };
      quote: {
        Row: QuoteRow;
        Insert: QuoteInsert;
        Update: QuoteUpdate;
      };
      quote_line: {
        Row: QuoteLineRow;
        Insert: QuoteLineInsert;
        Update: QuoteLineUpdate;
      };
      invoice: {
        Row: InvoiceRow;
        Insert: InvoiceInsert;
        Update: InvoiceUpdate;
      };
      invoice_line: {
        Row: InvoiceLineRow;
        Insert: InvoiceLineInsert;
        Update: InvoiceLineUpdate;
      };
      deposit_invoice: {
        Row: DepositInvoiceRow;
        Insert: DepositInvoiceInsert;
        Update: DepositInvoiceUpdate;
      };
      progress_invoice: {
        Row: ProgressInvoiceRow;
        Insert: ProgressInvoiceInsert;
        Update: ProgressInvoiceUpdate;
      };
      delivery_note: {
        Row: DeliveryNoteRow;
        Insert: DeliveryNoteInsert;
        Update: DeliveryNoteUpdate;
      };
      delivery_note_line: {
        Row: DeliveryNoteLineRow;
        Insert: DeliveryNoteLineInsert;
        Update: DeliveryNoteLineUpdate;
      };
      maintenance_contract: {
        Row: MaintenanceContractRow;
        Insert: MaintenanceContractInsert;
        Update: MaintenanceContractUpdate;
      };
      schedule_event: {
        Row: ScheduleEventRow;
        Insert: ScheduleEventInsert;
        Update: ScheduleEventUpdate;
      };
      schedule_event_employee: {
        Row: ScheduleEventEmployeeRow;
        Insert: ScheduleEventEmployeeInsert;
        Update: ScheduleEventEmployeeUpdate;
      };
      intervention: {
        Row: InterventionRow;
        Insert: InterventionInsert;
        Update: InterventionUpdate;
      };
      intervention_line: {
        Row: InterventionLineRow;
        Insert: InterventionLineInsert;
        Update: InterventionLineUpdate;
      };
      weather_snapshot: {
        Row: WeatherSnapshotRow;
        Insert: WeatherSnapshotInsert;
        Update: WeatherSnapshotUpdate;
      };
      route_estimate: {
        Row: RouteEstimateRow;
        Insert: RouteEstimateInsert;
        Update: RouteEstimateUpdate;
      };
      payment: {
        Row: PaymentRow;
        Insert: PaymentInsert;
        Update: PaymentUpdate;
      };
      payment_link: {
        Row: PaymentLinkRow;
        Insert: PaymentLinkInsert;
        Update: PaymentLinkUpdate;
      };
      reminder_workflow: {
        Row: ReminderWorkflowRow;
        Insert: ReminderWorkflowInsert;
        Update: ReminderWorkflowUpdate;
      };
      reminder_message: {
        Row: ReminderMessageRow;
        Insert: ReminderMessageInsert;
        Update: ReminderMessageUpdate;
      };
      ai_agent_run: {
        Row: AiAgentRunRow;
        Insert: AiAgentRunInsert;
        Update: AiAgentRunUpdate;
      };
      ai_proposal: {
        Row: AiProposalRow;
        Insert: AiProposalInsert;
        Update: AiProposalUpdate;
      };
      audit_log: {
        Row: AuditLogRow;
        Insert: AuditLogInsert;
        Update: AuditLogUpdate;
      };
      document_attachment: {
        Row: DocumentAttachmentRow;
        Insert: DocumentAttachmentInsert;
        Update: DocumentAttachmentUpdate;
      };
      notification: {
        Row: NotificationRow;
        Insert: NotificationInsert;
        Update: NotificationUpdate;
      };
      company_settings: {
        Row: CompanySettingsRow;
        Insert: CompanySettingsInsert;
        Update: CompanySettingsUpdate;
      };
    };
    Enums: {
      user_role: UserRole;
      client_type: ClientType;
      item_type: ItemType;
      quote_status: QuoteStatus;
      invoice_status: InvoiceStatus;
      document_type: DocumentType;
      reminder_level: ReminderLevel;
      weather_severity: WeatherSeverity;
      payment_method: PaymentMethod;
      schedule_event_type: ScheduleEventType;
      ai_agent_type: AiAgentType;
    };
  };
}
