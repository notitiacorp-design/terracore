// ============================================================
// TerraCore Pro — TypeScript types generated from SQL schema
// Source of truth: supabase/migrations/001_initial_schema.sql
// ============================================================

export type AiAgentType = 'meteo_replan' | 'relance_auto' | 'devis_assist' | 'marge_alert';
export type ClientType = 'particulier' | 'pro';
export type DocumentType = 'devis' | 'facture' | 'avoir' | 'acompte' | 'situation' | 'bon_livraison';
export type InvoiceStatus = 'brouillon' | 'envoyee' | 'payee' | 'partiellement_payee' | 'en_retard' | 'annulee';
export type ItemType = 'materiau' | 'main_oeuvre' | 'fourniture' | 'location';
export type PaymentMethod = 'virement' | 'cheque' | 'cb' | 'especes' | 'prelevement';
export type QuoteStatus = 'brouillon' | 'envoye' | 'accepte' | 'refuse' | 'expire';
export type ReminderLevel = 'relance_1' | 'relance_2' | 'relance_3' | 'mise_en_demeure' | 'contentieux';
export type ScheduleEventType = 'chantier' | 'rdv_client' | 'reunion' | 'conge' | 'absence';
export type UserRole = 'admin' | 'bureau' | 'terrain' | 'lecture';
export type WeatherSeverity = 'favorable' | 'acceptable' | 'defavorable' | 'alerte';

export interface AiAgentRunRow {
  agent_type: AiAgentType;
  company_id: string;
  completed_at: string | null;
  error_message: string | null;
  id: string | null;
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown> | null;
  started_at: string;
  status: string;
  tokens_used: number | null;
}

export interface AiAgentRunInsert {
  agent_type: AiAgentType;
  company_id: string;
  completed_at?: string | null;
  error_message?: string | null;
  id?: string | null;
  input_data?: Record<string, unknown>;
  output_data?: Record<string, unknown> | null;
  started_at?: string;
  status?: string;
  tokens_used?: number | null;
}

export interface AiAgentRunUpdate {
  agent_type?: AiAgentType;
  company_id?: string;
  completed_at?: string | null;
  error_message?: string | null;
  id?: string | null;
  input_data?: Record<string, unknown>;
  output_data?: Record<string, unknown> | null;
  started_at?: string;
  status?: string;
  tokens_used?: number | null;
}

export interface AiProposalRow {
  accepted_at: string | null;
  accepted_by: string | null;
  action_data: Record<string, unknown>;
  action_type: string;
  agent_run_id: string | null;
  company_id: string;
  created_at: string;
  description: string | null;
  dismissed_at: string | null;
  entity_id: string | null;
  entity_type: string;
  expires_at: string | null;
  id: string | null;
  is_accepted: boolean | null;
  title: string;
}

export interface AiProposalInsert {
  accepted_at?: string | null;
  accepted_by?: string | null;
  action_data?: Record<string, unknown>;
  action_type?: string;
  agent_run_id?: string | null;
  company_id: string;
  created_at?: string;
  description?: string | null;
  dismissed_at?: string | null;
  entity_id?: string | null;
  entity_type?: string;
  expires_at?: string | null;
  id?: string | null;
  is_accepted?: boolean | null;
  title?: string;
}

export interface AiProposalUpdate {
  accepted_at?: string | null;
  accepted_by?: string | null;
  action_data?: Record<string, unknown>;
  action_type?: string;
  agent_run_id?: string | null;
  company_id?: string;
  created_at?: string;
  description?: string | null;
  dismissed_at?: string | null;
  entity_id?: string | null;
  entity_type?: string;
  expires_at?: string | null;
  id?: string | null;
  is_accepted?: boolean | null;
  title?: string;
}

export interface AuditLogRow {
  action: string;
  company_id: string | null;
  created_at: string;
  entity_id: string | null;
  entity_type: string;
  id: string | null;
  ip_address: string | null;
  new_data: Record<string, unknown> | null;
  old_data: Record<string, unknown> | null;
  user_id: string | null;
}

export interface AuditLogInsert {
  action: string;
  company_id?: string | null;
  created_at?: string;
  entity_id?: string | null;
  entity_type?: string;
  id?: string | null;
  ip_address?: string | null;
  new_data?: Record<string, unknown> | null;
  old_data?: Record<string, unknown> | null;
  user_id?: string | null;
}

export interface AuditLogUpdate {
  action?: string;
  company_id?: string | null;
  created_at?: string;
  entity_id?: string | null;
  entity_type?: string;
  id?: string | null;
  ip_address?: string | null;
  new_data?: Record<string, unknown> | null;
  old_data?: Record<string, unknown> | null;
  user_id?: string | null;
}

export interface ClientRow {
  client_type: ClientType;
  company_id: string;
  company_name: string | null;
  created_at: string;
  email: string | null;
  first_name: string;
  id: string | null;
  is_active: boolean;
  last_name: string;
  notes: string | null;
  payment_terms_days: number;
  phone: string | null;
  updated_at: string;
}

export interface ClientInsert {
  client_type?: ClientType;
  company_id: string;
  company_name?: string | null;
  created_at?: string;
  email?: string | null;
  first_name?: string;
  id?: string | null;
  is_active?: boolean;
  last_name?: string;
  notes?: string | null;
  payment_terms_days?: number;
  phone?: string | null;
  updated_at?: string;
}

export interface ClientUpdate {
  client_type?: ClientType;
  company_id?: string;
  company_name?: string | null;
  created_at?: string;
  email?: string | null;
  first_name?: string;
  id?: string | null;
  is_active?: boolean;
  last_name?: string;
  notes?: string | null;
  payment_terms_days?: number;
  phone?: string | null;
  updated_at?: string;
}

export interface ClientContactRow {
  client_id: string;
  created_at: string;
  email: string | null;
  first_name: string;
  id: string | null;
  is_primary: boolean;
  last_name: string;
  phone: string | null;
  role_title: string | null;
}

export interface ClientContactInsert {
  client_id: string;
  created_at?: string;
  email?: string | null;
  first_name?: string;
  id?: string | null;
  is_primary?: boolean;
  last_name?: string;
  phone?: string | null;
  role_title?: string | null;
}

export interface ClientContactUpdate {
  client_id?: string;
  created_at?: string;
  email?: string | null;
  first_name?: string;
  id?: string | null;
  is_primary?: boolean;
  last_name?: string;
  phone?: string | null;
  role_title?: string | null;
}

export interface CompanyRow {
  address: string | null;
  created_at: string;
  email: string | null;
  id: string | null;
  logo_url: string | null;
  name: string;
  phone: string | null;
  settings: Record<string, unknown>;
  siret: string | null;
  subscription_plan: string;
  updated_at: string;
}

export interface CompanyInsert {
  address?: string | null;
  created_at?: string;
  email?: string | null;
  id?: string | null;
  logo_url?: string | null;
  name: string;
  phone?: string | null;
  settings?: Record<string, unknown>;
  siret?: string | null;
  subscription_plan?: string;
  updated_at?: string;
}

export interface CompanyUpdate {
  address?: string | null;
  created_at?: string;
  email?: string | null;
  id?: string | null;
  logo_url?: string | null;
  name?: string;
  phone?: string | null;
  settings?: Record<string, unknown>;
  siret?: string | null;
  subscription_plan?: string;
  updated_at?: string;
}

export interface CompanySettingsRow {
  company_id: string;
  company_stamp_url: string | null;
  default_payment_terms: number;
  default_vat_rate: string;
  email_signature: string | null;
  id: string | null;
  invoice_prefix: string;
  quote_prefix: string;
  quote_validity_days: number;
  smtp_settings: Record<string, unknown>;
}

export interface CompanySettingsInsert {
  company_id: string;
  company_stamp_url?: string | null;
  default_payment_terms?: number;
  default_vat_rate?: string;
  email_signature?: string | null;
  id?: string | null;
  invoice_prefix?: string;
  quote_prefix?: string;
  quote_validity_days?: number;
  smtp_settings?: Record<string, unknown>;
}

export interface CompanySettingsUpdate {
  company_id?: string;
  company_stamp_url?: string | null;
  default_payment_terms?: number;
  default_vat_rate?: string;
  email_signature?: string | null;
  id?: string | null;
  invoice_prefix?: string;
  quote_prefix?: string;
  quote_validity_days?: number;
  smtp_settings?: Record<string, unknown>;
}

export interface DeliveryNoteRow {
  client_id: string;
  company_id: string;
  created_at: string;
  date_emission: string;
  delivered_by: string | null;
  id: string | null;
  notes: string | null;
  pdf_url: string | null;
  quote_id: string | null;
  reference: string;
  site_address_id: string | null;
  status: string;
  updated_at: string;
}

export interface DeliveryNoteInsert {
  client_id: string;
  company_id: string;
  created_at?: string;
  date_emission?: string;
  delivered_by?: string | null;
  id?: string | null;
  notes?: string | null;
  pdf_url?: string | null;
  quote_id?: string | null;
  reference: string;
  site_address_id?: string | null;
  status?: string;
  updated_at?: string;
}

export interface DeliveryNoteUpdate {
  client_id?: string;
  company_id?: string;
  created_at?: string;
  date_emission?: string;
  delivered_by?: string | null;
  id?: string | null;
  notes?: string | null;
  pdf_url?: string | null;
  quote_id?: string | null;
  reference?: string;
  site_address_id?: string | null;
  status?: string;
  updated_at?: string;
}

export interface DeliveryNoteLineRow {
  delivery_note_id: string;
  id: string | null;
  item_id: string | null;
  label: string;
  notes: string | null;
  quantity: string;
  sort_order: number;
  unit: string;
}

export interface DeliveryNoteLineInsert {
  delivery_note_id: string;
  id?: string | null;
  item_id?: string | null;
  label?: string;
  notes?: string | null;
  quantity?: string;
  sort_order?: number;
  unit?: string;
}

export interface DeliveryNoteLineUpdate {
  delivery_note_id?: string;
  id?: string | null;
  item_id?: string | null;
  label?: string;
  notes?: string | null;
  quantity?: string;
  sort_order?: number;
  unit?: string;
}

export interface DepositInvoiceRow {
  amount_ht: string;
  amount_ttc: string;
  created_at: string;
  id: string | null;
  invoice_id: string;
  percentage: string;
  quote_id: string;
}

export interface DepositInvoiceInsert {
  amount_ht?: string;
  amount_ttc?: string;
  created_at?: string;
  id?: string | null;
  invoice_id: string;
  percentage: string;
  quote_id: string;
}

export interface DepositInvoiceUpdate {
  amount_ht?: string;
  amount_ttc?: string;
  created_at?: string;
  id?: string | null;
  invoice_id?: string;
  percentage?: string;
  quote_id?: string;
}

export interface DocumentAttachmentRow {
  company_id: string;
  created_at: string;
  entity_id: string;
  entity_type: string;
  file_name: string;
  file_size: number;
  file_url: string;
  id: string | null;
  mime_type: string;
  uploaded_by: string | null;
}

export interface DocumentAttachmentInsert {
  company_id: string;
  created_at?: string;
  entity_id: string;
  entity_type?: string;
  file_name?: string;
  file_size?: number;
  file_url?: string;
  id?: string | null;
  mime_type?: string;
  uploaded_by?: string | null;
}

export interface DocumentAttachmentUpdate {
  company_id?: string;
  created_at?: string;
  entity_id?: string;
  entity_type?: string;
  file_name?: string;
  file_size?: number;
  file_url?: string;
  id?: string | null;
  mime_type?: string;
  uploaded_by?: string | null;
}

export interface EmployeeRow {
  color: string;
  company_id: string;
  created_at: string;
  email: string | null;
  first_name: string;
  hourly_cost: string;
  id: string | null;
  is_active: boolean;
  last_name: string;
  phone: string | null;
  specialties: string[];
  updated_at: string;
  user_profile_id: string | null;
}

export interface EmployeeInsert {
  color?: string;
  company_id: string;
  created_at?: string;
  email?: string | null;
  first_name: string;
  hourly_cost?: string;
  id?: string | null;
  is_active?: boolean;
  last_name: string;
  phone?: string | null;
  specialties?: string[];
  updated_at?: string;
  user_profile_id?: string | null;
}

export interface EmployeeUpdate {
  color?: string;
  company_id?: string;
  created_at?: string;
  email?: string | null;
  first_name?: string;
  hourly_cost?: string;
  id?: string | null;
  is_active?: boolean;
  last_name?: string;
  phone?: string | null;
  specialties?: string[];
  updated_at?: string;
  user_profile_id?: string | null;
}

export interface InterventionRow {
  client_id: string;
  company_id: string;
  created_at: string;
  end_time: string | null;
  id: string | null;
  notes: string | null;
  photos: string[];
  quote_id: string | null;
  schedule_event_id: string | null;
  signature_url: string | null;
  site_address_id: string | null;
  start_time: string | null;
  status: string;
  updated_at: string;
  validated_by: string | null;
}

export interface InterventionInsert {
  client_id: string;
  company_id: string;
  created_at?: string;
  end_time?: string | null;
  id?: string | null;
  notes?: string | null;
  photos?: string[];
  quote_id?: string | null;
  schedule_event_id?: string | null;
  signature_url?: string | null;
  site_address_id?: string | null;
  start_time?: string | null;
  status?: string;
  updated_at?: string;
  validated_by?: string | null;
}

export interface InterventionUpdate {
  client_id?: string;
  company_id?: string;
  created_at?: string;
  end_time?: string | null;
  id?: string | null;
  notes?: string | null;
  photos?: string[];
  quote_id?: string | null;
  schedule_event_id?: string | null;
  signature_url?: string | null;
  site_address_id?: string | null;
  start_time?: string | null;
  status?: string;
  updated_at?: string;
  validated_by?: string | null;
}

export interface InterventionLineRow {
  id: string | null;
  intervention_id: string;
  item_id: string | null;
  label: string;
  notes: string | null;
  quantity_done: string;
  quantity_planned: string;
  unit: string;
}

export interface InterventionLineInsert {
  id?: string | null;
  intervention_id: string;
  item_id?: string | null;
  label?: string;
  notes?: string | null;
  quantity_done?: string;
  quantity_planned?: string;
  unit?: string;
}

export interface InterventionLineUpdate {
  id?: string | null;
  intervention_id?: string;
  item_id?: string | null;
  label?: string;
  notes?: string | null;
  quantity_done?: string;
  quantity_planned?: string;
  unit?: string;
}

export interface InvoiceRow {
  amount_paid: string;
  client_id: string;
  company_id: string;
  created_at: string;
  created_by: string | null;
  date_due: string | null;
  date_emission: string;
  id: string | null;
  invoice_type: DocumentType;
  notes_internal: string | null;
  notes_public: string | null;
  pdf_url: string | null;
  quote_id: string | null;
  reference: string;
  remaining_due: string;
  status: InvoiceStatus;
  title: string;
  total_ht: string;
  total_ttc: string;
  total_tva: string;
  updated_at: string;
}

export interface InvoiceInsert {
  amount_paid?: string;
  client_id: string;
  company_id: string;
  created_at?: string;
  created_by?: string | null;
  date_due?: string | null;
  date_emission?: string;
  id?: string | null;
  invoice_type?: DocumentType;
  notes_internal?: string | null;
  notes_public?: string | null;
  pdf_url?: string | null;
  quote_id?: string | null;
  reference: string;
  remaining_due?: string;
  status?: InvoiceStatus;
  title?: string;
  total_ht?: string;
  total_ttc?: string;
  total_tva?: string;
  updated_at?: string;
}

export interface InvoiceUpdate {
  amount_paid?: string;
  client_id?: string;
  company_id?: string;
  created_at?: string;
  created_by?: string | null;
  date_due?: string | null;
  date_emission?: string;
  id?: string | null;
  invoice_type?: DocumentType;
  notes_internal?: string | null;
  notes_public?: string | null;
  pdf_url?: string | null;
  quote_id?: string | null;
  reference?: string;
  remaining_due?: string;
  status?: InvoiceStatus;
  title?: string;
  total_ht?: string;
  total_ttc?: string;
  total_tva?: string;
  updated_at?: string;
}

export interface InvoiceLineRow {
  description: string | null;
  id: string | null;
  invoice_id: string;
  item_id: string | null;
  label: string;
  quantity: string;
  sort_order: number;
  total_ht: string;
  unit: string;
  unit_price_ht: string;
  vat_rate: string;
}

export interface InvoiceLineInsert {
  description?: string | null;
  id?: string | null;
  invoice_id: string;
  item_id?: string | null;
  label?: string;
  quantity?: string;
  sort_order?: number;
  total_ht?: string;
  unit?: string;
  unit_price_ht?: string;
  vat_rate?: string;
}

export interface InvoiceLineUpdate {
  description?: string | null;
  id?: string | null;
  invoice_id?: string;
  item_id?: string | null;
  label?: string;
  quantity?: string;
  sort_order?: number;
  total_ht?: string;
  unit?: string;
  unit_price_ht?: string;
  vat_rate?: string;
}

export interface ItemRow {
  company_id: string;
  created_at: string;
  description: string | null;
  family_id: string | null;
  id: string | null;
  is_active: boolean;
  item_type: ItemType;
  label: string;
  purchase_price_ht: string;
  reference: string;
  unit: string;
  unit_price_ht: string;
  updated_at: string;
  vat_rate: string;
}

export interface ItemInsert {
  company_id: string;
  created_at?: string;
  description?: string | null;
  family_id?: string | null;
  id?: string | null;
  is_active?: boolean;
  item_type?: ItemType;
  label: string;
  purchase_price_ht?: string;
  reference?: string;
  unit?: string;
  unit_price_ht?: string;
  updated_at?: string;
  vat_rate?: string;
}

export interface ItemUpdate {
  company_id?: string;
  created_at?: string;
  description?: string | null;
  family_id?: string | null;
  id?: string | null;
  is_active?: boolean;
  item_type?: ItemType;
  label?: string;
  purchase_price_ht?: string;
  reference?: string;
  unit?: string;
  unit_price_ht?: string;
  updated_at?: string;
  vat_rate?: string;
}

export interface ItemFamilyRow {
  company_id: string;
  created_at: string;
  id: string | null;
  name: string;
  parent_id: string | null;
  sort_order: number;
}

export interface ItemFamilyInsert {
  company_id: string;
  created_at?: string;
  id?: string | null;
  name: string;
  parent_id?: string | null;
  sort_order?: number;
}

export interface ItemFamilyUpdate {
  company_id?: string;
  created_at?: string;
  id?: string | null;
  name?: string;
  parent_id?: string | null;
  sort_order?: number;
}

export interface MaintenanceContractRow {
  annual_amount_ht: string;
  annual_amount_ttc: string;
  client_id: string;
  company_id: string;
  created_at: string;
  description: string | null;
  end_date: string | null;
  id: string | null;
  is_active: boolean;
  next_intervention_date: string | null;
  recurrence_months: number;
  reference: string;
  site_address_id: string | null;
  start_date: string;
  title: string;
  updated_at: string;
}

export interface MaintenanceContractInsert {
  annual_amount_ht?: string;
  annual_amount_ttc?: string;
  client_id: string;
  company_id: string;
  created_at?: string;
  description?: string | null;
  end_date?: string | null;
  id?: string | null;
  is_active?: boolean;
  next_intervention_date?: string | null;
  recurrence_months?: number;
  reference: string;
  site_address_id?: string | null;
  start_date: string;
  title?: string;
  updated_at?: string;
}

export interface MaintenanceContractUpdate {
  annual_amount_ht?: string;
  annual_amount_ttc?: string;
  client_id?: string;
  company_id?: string;
  created_at?: string;
  description?: string | null;
  end_date?: string | null;
  id?: string | null;
  is_active?: boolean;
  next_intervention_date?: string | null;
  recurrence_months?: number;
  reference?: string;
  site_address_id?: string | null;
  start_date?: string;
  title?: string;
  updated_at?: string;
}

export interface NotificationRow {
  body: string;
  company_id: string;
  created_at: string;
  id: string | null;
  is_read: boolean;
  link: string | null;
  title: string;
  user_id: string;
}

export interface NotificationInsert {
  body?: string;
  company_id: string;
  created_at?: string;
  id?: string | null;
  is_read?: boolean;
  link?: string | null;
  title?: string;
  user_id: string;
}

export interface NotificationUpdate {
  body?: string;
  company_id?: string;
  created_at?: string;
  id?: string | null;
  is_read?: boolean;
  link?: string | null;
  title?: string;
  user_id?: string;
}

export interface PaymentRow {
  amount: string;
  company_id: string;
  created_at: string;
  created_by: string | null;
  id: string | null;
  invoice_id: string;
  notes: string | null;
  payment_date: string;
  payment_method: PaymentMethod;
  reference: string | null;
}

export interface PaymentInsert {
  amount: string;
  company_id: string;
  created_at?: string;
  created_by?: string | null;
  id?: string | null;
  invoice_id: string;
  notes?: string | null;
  payment_date?: string;
  payment_method?: PaymentMethod;
  reference?: string | null;
}

export interface PaymentUpdate {
  amount?: string;
  company_id?: string;
  created_at?: string;
  created_by?: string | null;
  id?: string | null;
  invoice_id?: string;
  notes?: string | null;
  payment_date?: string;
  payment_method?: PaymentMethod;
  reference?: string | null;
}

export interface PaymentLinkRow {
  amount: string;
  created_at: string;
  expires_at: string;
  id: string | null;
  invoice_id: string;
  is_used: boolean;
  stripe_session_id: string | null;
  token: string;
}

export interface PaymentLinkInsert {
  amount: string;
  created_at?: string;
  expires_at: string;
  id?: string | null;
  invoice_id: string;
  is_used?: boolean;
  stripe_session_id?: string | null;
  token?: string;
}

export interface PaymentLinkUpdate {
  amount?: string;
  created_at?: string;
  expires_at?: string;
  id?: string | null;
  invoice_id?: string;
  is_used?: boolean;
  stripe_session_id?: string | null;
  token?: string;
}

export interface PriceCategoryRow {
  company_id: string;
  created_at: string;
  id: string | null;
  is_default: boolean;
  margin_coefficient: string;
  name: string;
}

export interface PriceCategoryInsert {
  company_id: string;
  created_at?: string;
  id?: string | null;
  is_default?: boolean;
  margin_coefficient?: string;
  name: string;
}

export interface PriceCategoryUpdate {
  company_id?: string;
  created_at?: string;
  id?: string | null;
  is_default?: boolean;
  margin_coefficient?: string;
  name?: string;
}

export interface ProgressInvoiceRow {
  created_at: string;
  cumulative_percent: string;
  current_amount: string;
  id: string | null;
  invoice_id: string;
  previous_amount: string;
  quote_id: string;
  situation_number: number;
}

export interface ProgressInvoiceInsert {
  created_at?: string;
  cumulative_percent: string;
  current_amount?: string;
  id?: string | null;
  invoice_id: string;
  previous_amount?: string;
  quote_id: string;
  situation_number?: number;
}

export interface ProgressInvoiceUpdate {
  created_at?: string;
  cumulative_percent?: string;
  current_amount?: string;
  id?: string | null;
  invoice_id?: string;
  previous_amount?: string;
  quote_id?: string;
  situation_number?: number;
}

export interface QuoteRow {
  client_id: string;
  company_id: string;
  created_at: string;
  created_by: string | null;
  date_emission: string;
  date_validity: string | null;
  description: string | null;
  discount_amount: string;
  discount_percent: string;
  id: string | null;
  notes_internal: string | null;
  notes_public: string | null;
  pdf_url: string | null;
  reference: string;
  signed_at: string | null;
  signed_by: string | null;
  site_address_id: string | null;
  status: QuoteStatus;
  title: string;
  total_ht: string;
  total_ttc: string;
  total_tva: string;
  updated_at: string;
}

export interface QuoteInsert {
  client_id: string;
  company_id: string;
  created_at?: string;
  created_by?: string | null;
  date_emission?: string;
  date_validity?: string | null;
  description?: string | null;
  discount_amount?: string;
  discount_percent?: string;
  id?: string | null;
  notes_internal?: string | null;
  notes_public?: string | null;
  pdf_url?: string | null;
  reference: string;
  signed_at?: string | null;
  signed_by?: string | null;
  site_address_id?: string | null;
  status?: QuoteStatus;
  title?: string;
  total_ht?: string;
  total_ttc?: string;
  total_tva?: string;
  updated_at?: string;
}

export interface QuoteUpdate {
  client_id?: string;
  company_id?: string;
  created_at?: string;
  created_by?: string | null;
  date_emission?: string;
  date_validity?: string | null;
  description?: string | null;
  discount_amount?: string;
  discount_percent?: string;
  id?: string | null;
  notes_internal?: string | null;
  notes_public?: string | null;
  pdf_url?: string | null;
  reference?: string;
  signed_at?: string | null;
  signed_by?: string | null;
  site_address_id?: string | null;
  status?: QuoteStatus;
  title?: string;
  total_ht?: string;
  total_ttc?: string;
  total_tva?: string;
  updated_at?: string;
}

export interface QuoteLineRow {
  description: string | null;
  discount_percent: string;
  id: string | null;
  is_section: boolean;
  item_id: string | null;
  label: string;
  parent_line_id: string | null;
  quantity: string;
  quote_id: string;
  section_title: string | null;
  sort_order: number;
  total_ht: string;
  unit: string;
  unit_price_ht: string;
  vat_rate: string;
  work_unit_id: string | null;
}

export interface QuoteLineInsert {
  description?: string | null;
  discount_percent?: string;
  id?: string | null;
  is_section?: boolean;
  item_id?: string | null;
  label?: string;
  parent_line_id?: string | null;
  quantity?: string;
  quote_id: string;
  section_title?: string | null;
  sort_order?: number;
  total_ht?: string;
  unit?: string;
  unit_price_ht?: string;
  vat_rate?: string;
  work_unit_id?: string | null;
}

export interface QuoteLineUpdate {
  description?: string | null;
  discount_percent?: string;
  id?: string | null;
  is_section?: boolean;
  item_id?: string | null;
  label?: string;
  parent_line_id?: string | null;
  quantity?: string;
  quote_id?: string;
  section_title?: string | null;
  sort_order?: number;
  total_ht?: string;
  unit?: string;
  unit_price_ht?: string;
  vat_rate?: string;
  work_unit_id?: string | null;
}

export interface ReminderMessageRow {
  body: string;
  channel: string;
  clicked_at: string | null;
  id: string | null;
  level: ReminderLevel;
  opened_at: string | null;
  reminder_workflow_id: string;
  sent_at: string;
  subject: string | null;
}

export interface ReminderMessageInsert {
  body?: string;
  channel?: string;
  clicked_at?: string | null;
  id?: string | null;
  level: ReminderLevel;
  opened_at?: string | null;
  reminder_workflow_id: string;
  sent_at?: string;
  subject?: string | null;
}

export interface ReminderMessageUpdate {
  body?: string;
  channel?: string;
  clicked_at?: string | null;
  id?: string | null;
  level?: ReminderLevel;
  opened_at?: string | null;
  reminder_workflow_id?: string;
  sent_at?: string;
  subject?: string | null;
}

export interface ReminderWorkflowRow {
  client_id: string;
  company_id: string;
  current_level: ReminderLevel;
  id: string | null;
  invoice_id: string;
  is_active: boolean;
  last_action_at: string | null;
  started_at: string;
  stop_reason: string | null;
  stopped_at: string | null;
}

export interface ReminderWorkflowInsert {
  client_id: string;
  company_id: string;
  current_level?: ReminderLevel;
  id?: string | null;
  invoice_id: string;
  is_active?: boolean;
  last_action_at?: string | null;
  started_at?: string;
  stop_reason?: string | null;
  stopped_at?: string | null;
}

export interface ReminderWorkflowUpdate {
  client_id?: string;
  company_id?: string;
  current_level?: ReminderLevel;
  id?: string | null;
  invoice_id?: string;
  is_active?: boolean;
  last_action_at?: string | null;
  started_at?: string;
  stop_reason?: string | null;
  stopped_at?: string | null;
}

export interface RouteEstimateRow {
  company_id: string;
  distance_km: string;
  duration_minutes: number;
  estimated_at: string;
  from_address_id: string | null;
  id: string | null;
  to_address_id: string | null;
}

export interface RouteEstimateInsert {
  company_id: string;
  distance_km?: string;
  duration_minutes?: number;
  estimated_at?: string;
  from_address_id?: string | null;
  id?: string | null;
  to_address_id?: string | null;
}

export interface RouteEstimateUpdate {
  company_id?: string;
  distance_km?: string;
  duration_minutes?: number;
  estimated_at?: string;
  from_address_id?: string | null;
  id?: string | null;
  to_address_id?: string | null;
}

export interface ScheduleEventRow {
  all_day: boolean;
  client_id: string | null;
  color: string;
  company_id: string;
  created_at: string;
  created_by: string | null;
  description: string | null;
  end_datetime: string;
  event_type: ScheduleEventType;
  id: string | null;
  quote_id: string | null;
  site_address_id: string | null;
  start_datetime: string;
  title: string;
  updated_at: string;
}

export interface ScheduleEventInsert {
  all_day?: boolean;
  client_id?: string | null;
  color?: string;
  company_id: string;
  created_at?: string;
  created_by?: string | null;
  description?: string | null;
  end_datetime: string;
  event_type?: ScheduleEventType;
  id?: string | null;
  quote_id?: string | null;
  site_address_id?: string | null;
  start_datetime: string;
  title?: string;
  updated_at?: string;
}

export interface ScheduleEventUpdate {
  all_day?: boolean;
  client_id?: string | null;
  color?: string;
  company_id?: string;
  created_at?: string;
  created_by?: string | null;
  description?: string | null;
  end_datetime?: string;
  event_type?: ScheduleEventType;
  id?: string | null;
  quote_id?: string | null;
  site_address_id?: string | null;
  start_datetime?: string;
  title?: string;
  updated_at?: string;
}

export interface ScheduleEventEmployeeRow {
  employee_id: string;
  id: string | null;
  schedule_event_id: string;
}

export interface ScheduleEventEmployeeInsert {
  employee_id: string;
  id?: string | null;
  schedule_event_id: string;
}

export interface ScheduleEventEmployeeUpdate {
  employee_id?: string;
  id?: string | null;
  schedule_event_id?: string;
}

export interface SiteAddressRow {
  city: string;
  client_id: string;
  company_id: string;
  complement: string | null;
  country: string;
  created_at: string;
  id: string | null;
  is_billing_address: boolean;
  is_default_site: boolean;
  label: string;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  postal_code: string;
  street: string;
  updated_at: string;
}

export interface SiteAddressInsert {
  city?: string;
  client_id: string;
  company_id: string;
  complement?: string | null;
  country?: string;
  created_at?: string;
  id?: string | null;
  is_billing_address?: boolean;
  is_default_site?: boolean;
  label?: string;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  postal_code?: string;
  street?: string;
  updated_at?: string;
}

export interface SiteAddressUpdate {
  city?: string;
  client_id?: string;
  company_id?: string;
  complement?: string | null;
  country?: string;
  created_at?: string;
  id?: string | null;
  is_billing_address?: boolean;
  is_default_site?: boolean;
  label?: string;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  postal_code?: string;
  street?: string;
  updated_at?: string;
}

export interface UserProfileRow {
  avatar_url: string | null;
  company_id: string;
  created_at: string;
  first_name: string;
  id: string | null;
  is_active: boolean;
  last_name: string;
  phone: string | null;
  role: UserRole;
  updated_at: string;
}

export interface UserProfileInsert {
  avatar_url?: string | null;
  company_id: string;
  created_at?: string;
  first_name?: string;
  id?: string | null;
  is_active?: boolean;
  last_name?: string;
  phone?: string | null;
  role?: UserRole;
  updated_at?: string;
}

export interface UserProfileUpdate {
  avatar_url?: string | null;
  company_id?: string;
  created_at?: string;
  first_name?: string;
  id?: string | null;
  is_active?: boolean;
  last_name?: string;
  phone?: string | null;
  role?: UserRole;
  updated_at?: string;
}

export interface WeatherSnapshotRow {
  company_id: string;
  date: string;
  description: string | null;
  fetched_at: string;
  id: string | null;
  precipitation_mm: string | null;
  severity: WeatherSeverity;
  site_address_id: string | null;
  temperature_max: string | null;
  temperature_min: string | null;
  weather_code: number | null;
  wind_speed_kmh: string | null;
}

export interface WeatherSnapshotInsert {
  company_id: string;
  date: string;
  description?: string | null;
  fetched_at?: string;
  id?: string | null;
  precipitation_mm?: string | null;
  severity?: WeatherSeverity;
  site_address_id?: string | null;
  temperature_max?: string | null;
  temperature_min?: string | null;
  weather_code?: number | null;
  wind_speed_kmh?: string | null;
}

export interface WeatherSnapshotUpdate {
  company_id?: string;
  date?: string;
  description?: string | null;
  fetched_at?: string;
  id?: string | null;
  precipitation_mm?: string | null;
  severity?: WeatherSeverity;
  site_address_id?: string | null;
  temperature_max?: string | null;
  temperature_min?: string | null;
  weather_code?: number | null;
  wind_speed_kmh?: string | null;
}

export interface WorkUnitRow {
  company_id: string;
  created_at: string;
  description: string | null;
  family_id: string | null;
  id: string | null;
  is_active: boolean;
  label: string;
  margin_percent: string;
  reference: string;
  total_price_ht: string;
  unit: string;
  updated_at: string;
}

export interface WorkUnitInsert {
  company_id: string;
  created_at?: string;
  description?: string | null;
  family_id?: string | null;
  id?: string | null;
  is_active?: boolean;
  label: string;
  margin_percent?: string;
  reference?: string;
  total_price_ht?: string;
  unit?: string;
  updated_at?: string;
}

export interface WorkUnitUpdate {
  company_id?: string;
  created_at?: string;
  description?: string | null;
  family_id?: string | null;
  id?: string | null;
  is_active?: boolean;
  label?: string;
  margin_percent?: string;
  reference?: string;
  total_price_ht?: string;
  unit?: string;
  updated_at?: string;
}

export interface WorkUnitLineRow {
  id: string | null;
  item_id: string | null;
  quantity: string;
  sort_order: number;
  unit_price_ht: string;
  work_unit_id: string;
}

export interface WorkUnitLineInsert {
  id?: string | null;
  item_id?: string | null;
  quantity?: string;
  sort_order?: number;
  unit_price_ht?: string;
  work_unit_id: string;
}

export interface WorkUnitLineUpdate {
  id?: string | null;
  item_id?: string | null;
  quantity?: string;
  sort_order?: number;
  unit_price_ht?: string;
  work_unit_id?: string;
}

// Alias types for backward compatibility
export type Client = ClientRow;

export interface Database {
  public: {
    Tables: {
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
      company: {
        Row: CompanyRow;
        Insert: CompanyInsert;
        Update: CompanyUpdate;
      };
      company_settings: {
        Row: CompanySettingsRow;
        Insert: CompanySettingsInsert;
        Update: CompanySettingsUpdate;
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
      deposit_invoice: {
        Row: DepositInvoiceRow;
        Insert: DepositInvoiceInsert;
        Update: DepositInvoiceUpdate;
      };
      document_attachment: {
        Row: DocumentAttachmentRow;
        Insert: DocumentAttachmentInsert;
        Update: DocumentAttachmentUpdate;
      };
      employee: {
        Row: EmployeeRow;
        Insert: EmployeeInsert;
        Update: EmployeeUpdate;
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
      item: {
        Row: ItemRow;
        Insert: ItemInsert;
        Update: ItemUpdate;
      };
      item_family: {
        Row: ItemFamilyRow;
        Insert: ItemFamilyInsert;
        Update: ItemFamilyUpdate;
      };
      maintenance_contract: {
        Row: MaintenanceContractRow;
        Insert: MaintenanceContractInsert;
        Update: MaintenanceContractUpdate;
      };
      notification: {
        Row: NotificationRow;
        Insert: NotificationInsert;
        Update: NotificationUpdate;
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
      price_category: {
        Row: PriceCategoryRow;
        Insert: PriceCategoryInsert;
        Update: PriceCategoryUpdate;
      };
      progress_invoice: {
        Row: ProgressInvoiceRow;
        Insert: ProgressInvoiceInsert;
        Update: ProgressInvoiceUpdate;
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
      reminder_message: {
        Row: ReminderMessageRow;
        Insert: ReminderMessageInsert;
        Update: ReminderMessageUpdate;
      };
      reminder_workflow: {
        Row: ReminderWorkflowRow;
        Insert: ReminderWorkflowInsert;
        Update: ReminderWorkflowUpdate;
      };
      route_estimate: {
        Row: RouteEstimateRow;
        Insert: RouteEstimateInsert;
        Update: RouteEstimateUpdate;
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
      site_address: {
        Row: SiteAddressRow;
        Insert: SiteAddressInsert;
        Update: SiteAddressUpdate;
      };
      user_profile: {
        Row: UserProfileRow;
        Insert: UserProfileInsert;
        Update: UserProfileUpdate;
      };
      weather_snapshot: {
        Row: WeatherSnapshotRow;
        Insert: WeatherSnapshotInsert;
        Update: WeatherSnapshotUpdate;
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
    };
  };
}