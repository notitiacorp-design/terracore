// ============================================================
// TERRACORE PRO - Database Types
// Auto-generated from PostgreSQL schema
// ============================================================

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

// ============================================================
// TABLE: company
// ============================================================

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
  created_at: string;
  updated_at: string;
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
  created_at?: string;
  updated_at?: string;
}

export type CompanyUpdate = Partial<CompanyInsert>;

// ============================================================
// TABLE: user_profile
// ============================================================

export interface UserProfileRow {
  id: string;
  company_id: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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
  created_at?: string;
  updated_at?: string;
}

export type UserProfileUpdate = Partial<UserProfileInsert>;

// ============================================================
// TABLE: employee
// ============================================================

export interface EmployeeRow {
  id: string;
  company_id: string;
  user_profile_id: string | null;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  color: string;
  specialties: string[];
  hourly_cost: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmployeeInsert {
  id?: string;
  company_id: string;
  user_profile_id?: string | null;
  first_name: string;
  last_name: string;
  phone?: string | null;
  email?: string | null;
  color?: string;
  specialties?: string[];
  hourly_cost?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type EmployeeUpdate = Partial<EmployeeInsert>;

// ============================================================
// TABLE: client
// ============================================================

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
  created_at: string;
  updated_at: string;
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
  created_at?: string;
  updated_at?: string;
}

export type ClientUpdate = Partial<ClientInsert>;

// ============================================================
// TABLE: client_contact
// ============================================================

export interface ClientContactRow {
  id: string;
  client_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  role_title: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface ClientContactInsert {
  id?: string;
  client_id: string;
  first_name?: string;
  last_name?: string;
  email?: string | null;
  phone?: string | null;
  role_title?: string | null;
  is_primary?: boolean;
  created_at?: string;
}

export type ClientContactUpdate = Partial<ClientContactInsert>;

// ============================================================
// TABLE: site_address
// ============================================================

export interface SiteAddressRow {
  id: string;
  client_id: string;
  company_id: string;
  label: string;
  street: string;
  complement: string | null;
  postal_code: string;
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  is_billing_address: boolean;
  is_default_site: boolean;
  created_at: string;
  updated_at: string;
}

export interface SiteAddressInsert {
  id?: string;
  client_id: string;
  company_id: string;
  label?: string;
  street?: string;
  complement?: string | null;
  postal_code?: string;
  city?: string;
  country?: string;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string | null;
  is_billing_address?: boolean;
  is_default_site?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type SiteAddressUpdate = Partial<SiteAddressInsert>;

// ============================================================
// TABLE: price_category
// ============================================================

export interface PriceCategoryRow {
  id: string;
  company_id: string;
  name: string;
  margin_coefficient: number;
  is_default: boolean;
  created_at: string;
}

export interface PriceCategoryInsert {
  id?: string;
  company_id: string;
  name: string;
  margin_coefficient?: number;
  is_default?: boolean;
  created_at?: string;
}

export type PriceCategoryUpdate = Partial<PriceCategoryInsert>;

// ============================================================
// TABLE: item_family
// ============================================================

export interface ItemFamilyRow {
  id: string;
  company_id: string;
  name: string;
  parent_id: string | null;
  sort_order: number;
  created_at: string;
}

export interface ItemFamilyInsert {
  id?: string;
  company_id: string;
  name: string;
  parent_id?: string | null;
  sort_order?: number;
  created_at?: string;
}

export type ItemFamilyUpdate = Partial<ItemFamilyInsert>;

// ============================================================
// TABLE: item
// ============================================================

export interface ItemRow {
  id: string;
  company_id: string;
  reference: string;
  label: string;
  description: string | null;
  item_type: ItemType;
  family_id: string | null;
  unit: string;
  unit_price_ht: number;
  purchase_price_ht: number;
  vat_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ItemInsert {
  id?: string;
  company_id: string;
  reference?: string;
  label: string;
  description?: string | null;
  item_type?: ItemType;
  family_id?: string | null;
  unit?: string;
  unit_price_ht?: number;
  purchase_price_ht?: number;
  vat_rate?: number;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type ItemUpdate = Partial<ItemInsert>;

// ============================================================
// TABLE: work_unit
// ============================================================

export interface WorkUnitRow {
  id: string;
  company_id: string;
  reference: string;
  label: string;
  description: string | null;
  unit: string;
  total_price_ht: number;
  margin_percent: number;
  family_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkUnitInsert {
  id?: string;
  company_id: string;
  reference?: string;
  label: string;
  description?: string | null;
  unit?: string;
  total_price_ht?: number;
  margin_percent?: number;
  family_id?: string | null;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export type WorkUnitUpdate = Partial<WorkUnitInsert>;

// ============================================================
// TABLE: work_unit_line
// ============================================================

export interface WorkUnitLineRow {
  id: string;
  work_unit_id: string;
  item_id: string | null;
  quantity: number;
  unit_price_ht: number;
  sort_order: number;
}

export interface WorkUnitLineInsert {
  id?: string;
  work_unit_id: string;
  item_id?: string | null;
  quantity?: number;
  unit_price_ht?: number;
  sort_order?: number;
}

export type WorkUnitLineUpdate = Partial<WorkUnitLineInsert>;

// ============================================================
// TABLE: quote
// ============================================================

export interface QuoteRow {
  id: string;
  company_id: string;
  client_id: string;
  site_address_id: string | null;
  reference: string;
  status: QuoteStatus;
  title: string;
  description: string | null;
  date_emission: string;
  date_validity: string | null;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  discount_percent: number;
  discount_amount: number;
  notes_public: string | null;
  notes_internal: string | null;
  signed_at: string | null;
  signed_by: string | null;
  pdf_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface QuoteInsert {
  id?: string;
  company_id: string;
  client_id: string;
  site_address_id?: string | null;
  reference: string;
  status?: QuoteStatus;
  title?: string;
  description?: string | null;
  date_emission?: string;
  date_validity?: string | null;
  total_ht?: number;
  total_tva?: number;
  total_ttc?: number;
  discount_percent?: number;
  discount_amount?: number;
  notes_public?: string | null;
  notes_internal?: string | null;
  signed_at?: string | null;
  signed_by?: string | null;
  pdf_url?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type QuoteUpdate = Partial<QuoteInsert>;

// ============================================================
// TABLE: quote_line
// ============================================================

export interface QuoteLineRow {
  id: string;
  quote_id: string;
  parent_line_id: string | null;
  item_id: string | null;
  work_unit_id: string | null;
  label: string;
  description: string | null;
  quantity: number;
  unit: string;
  unit_price_ht: number;
  vat_rate: number;
  discount_percent: number;
  total_ht: number;
  sort_order: number;
  is_section: boolean;
  section_title: string | null;
}

export interface QuoteLineInsert {
  id?: string;
  quote_id: string;
  parent_line_id?: string | null;
  item_id?: string | null;
  work_unit_id?: string | null;
  label?: string;
  description?: string | null;
  quantity?: number;
  unit?: string;
  unit_price_ht?: number;
  vat_rate?: number;
  discount_percent?: number;
  total_ht?: number;
  sort_order?: number;
  is_section?: boolean;
  section_title?: string | null;
}

export type QuoteLineUpdate = Partial<QuoteLineInsert>;

// ============================================================
// TABLE: invoice
// ============================================================

export interface InvoiceRow {
  id: string;
  company_id: string;
  client_id: string;
  quote_id: string | null;
  reference: string;
  status: InvoiceStatus;
  invoice_type: DocumentType;
  title: string;
  date_emission: string;
  date_due: string | null;
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  amount_paid: number;
  remaining_due: number;
  notes_public: string | null;
  notes_internal: string | null;
  pdf_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InvoiceInsert {
  id?: string;
  company_id: string;
  client_id: string;
  quote_id?: string | null;
  reference: string;
  status?: InvoiceStatus;
  invoice_type?: DocumentType;
  title?: string;
  date_emission?: string;
  date_due?: string | null;
  total_ht?: number;
  total_tva?: number;
  total_ttc?: number;
  amount_paid?: number;
  remaining_due?: number;
  notes_public?: string | null;
  notes_internal?: string | null;
  pdf_url?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type InvoiceUpdate = Partial<InvoiceInsert>;

// ============================================================
// TABLE: invoice_line
// ============================================================

export interface InvoiceLineRow {
  id: string;
  invoice_id: string;
  item_id: string | null;
  label: string;
  description: string | null;
  quantity: number;
  unit: string;
  unit_price_ht: number;
  vat_rate: number;
  total_ht: number;
  sort_order: number;
}

export interface InvoiceLineInsert {
  id?: string;
  invoice_id: string;
  item_id?: string | null;
  label?: string;
  description?: string | null;
  quantity?: number;
  unit?: string;
  unit_price_ht?: number;
  vat_rate?: number;
  total_ht?: number;
  sort_order?: number;
}

export type InvoiceLineUpdate = Partial<InvoiceLineInsert>;

// ============================================================
// TABLE: deposit_invoice
// ============================================================

export interface DepositInvoiceRow {
  id: string;
  invoice_id: string;
  quote_id: string;
  percentage: number;
  amount_ht: number;
  amount_ttc: number;
  created_at: string;
}

export interface DepositInvoiceInsert {
  id?: string;
  invoice_id: string;
  quote_id: string;
  percentage: number;
  amount_ht?: number;
  amount_ttc?: number;
  created_at?: string;
}

export type DepositInvoiceUpdate = Partial<DepositInvoiceInsert>;

// ============================================================
// TABLE: progress_invoice
// ============================================================

export interface ProgressInvoiceRow {
  id: string;
  invoice_id: string;
  quote_id: string;
  situation_number: number;
  cumulative_percent: number;
  previous_amount: number;
  current_amount: number;
  created_at: string;
}

export interface ProgressInvoiceInsert {
  id?: string;
  invoice_id: string;
  quote_id: string;
  situation_number?: number;
  cumulative_percent: number;
  previous_amount?: number;
  current_amount?: number;
  created_at?: string;
}

export type ProgressInvoiceUpdate = Partial<ProgressInvoiceInsert>;

// ============================================================
// TABLE: delivery_note
// ============================================================

export interface DeliveryNoteRow {
  id: string;
  company_id: string;
  client_id: string;
  quote_id: string | null;
  reference: string;
  date_emission: string;
  site_address_id: string | null;
  notes: string | null;
  status: string;
  delivered_by: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeliveryNoteInsert {
  id?: string;
  company_id: string;
  client_id: string;
  quote_id?: string | null;
  reference: string;
  date_emission?: string;
  site_address_id?: string | null;
  notes?: string | null;
  status?: string;
  delivered_by?: string | null;
  pdf_url?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type DeliveryNoteUpdate = Partial<DeliveryNoteInsert>;

// ============================================================
// TABLE: delivery_note_line
// ============================================================

export interface DeliveryNoteLineRow {
  id: string;
  delivery_note_id: string;
  item_id: string | null;
  label: string;
  quantity: number;
  unit: string;
  notes: string | null;
  sort_order: number;
}

export interface DeliveryNoteLineInsert {
  id?: string;
  delivery_note_id: string;
  item_id?: string | null;
  label?: string;
  quantity?: number;
  unit?: string;
  notes?: string | null;
  sort_order?: number;
}

export type DeliveryNoteLineUpdate = Partial<DeliveryNoteLineInsert>;

// ============================================================
// TABLE: maintenance_contract
// ============================================================

export interface MaintenanceContractRow {
  id: string;
  company_id: string;
  client_id: string;
  site_address_id: string | null;
  reference: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string | null;
  recurrence_months: number;
  annual_amount_ht: number;
  annual_amount_ttc: number;
  is_active: boolean;
  next_intervention_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface MaintenanceContractInsert {
  id?: string;
  company_id: string;
  client_id: string;
  site_address_id?: string | null;
  reference: string;
  title?: string;
  description?: string | null;
  start_date: string;
  end_date?: string | null;
  recurrence_months?: number;
  annual_amount_ht?: number;
  annual_amount_ttc?: number;
  is_active?: boolean;
  next_intervention_date?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type MaintenanceContractUpdate = Partial<MaintenanceContractInsert>;

// ============================================================
// TABLE: schedule_event
// ============================================================

export interface ScheduleEventRow {
  id: string;
  company_id: string;
  event_type: ScheduleEventType;
  title: string;
  description: string | null;
  start_datetime: string;
  end_datetime: string;
  all_day: boolean;
  color: string;
  quote_id: string | null;
  client_id: string | null;
  site_address_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ScheduleEventInsert {
  id?: string;
  company_id: string;
  event_type?: ScheduleEventType;
  title?: string;
  description?: string | null;
  start_datetime: string;
  end_datetime: string;
  all_day?: boolean;
  color?: string;
  quote_id?: string | null;
  client_id?: string | null;
  site_address_id?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type ScheduleEventUpdate = Partial<ScheduleEventInsert>;

// ============================================================
// TABLE: schedule_event_employee
// ============================================================

export interface ScheduleEventEmployeeRow {
  id: string;
  schedule_event_id: string;
  employee_id: string;
}

export interface ScheduleEventEmployeeInsert {
  id?: string;
  schedule_event_id: string;
  employee_id: string;
}

export type ScheduleEventEmployeeUpdate = Partial<ScheduleEventEmployeeInsert>;

// ============================================================
// TABLE: intervention
// ============================================================

export interface InterventionRow {
  id: string;
  company_id: string;
  schedule_event_id: string | null;
  quote_id: string | null;
  client_id: string;
  site_address_id: string | null;
  status: string;
  start_time: string | null;
  end_time: string | null;
  notes: string | null;
  photos: string[];
  signature_url: string | null;
  validated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface InterventionInsert {
  id?: string;
  company_id: string;
  schedule_event_id?: string | null;
  quote_id?: string | null;
  client_id: string;
  site_address_id?: string | null;
  status?: string;
  start_time?: string | null;
  end_time?: string | null;
  notes?: string | null;
  photos?: string[];
  signature_url?: string | null;
  validated_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export type InterventionUpdate = Partial<InterventionInsert>;

// ============================================================
// TABLE: intervention_line
// ============================================================

export interface InterventionLineRow {
  id: string;
  intervention_id: string;
  item_id: string | null;
  label: string;
  quantity_planned: number;
  quantity_done: number;
  unit: string;
  notes: string | null;
}

export interface InterventionLineInsert {
  id?: string;
  intervention_id: string;
  item_id?: string | null;
  label?: string;
  quantity_planned?: number;
  quantity_done?: number;
  unit?: string;
  notes?: string | null;
}

export type InterventionLineUpdate = Partial<InterventionLineInsert>;

// ============================================================
// TABLE: weather_snapshot
// ============================================================

export interface WeatherSnapshotRow {
  id: string;
  company_id: string;
  site_address_id: string | null;
  date: string;
  temperature_min: number | null;
  temperature_max: number | null;
  precipitation_mm: number | null;
  wind_speed_kmh: number | null;
  weather_code: number | null;
  severity: WeatherSeverity;
  description: string | null;
  fetched_at: string;
}

export interface WeatherSnapshotInsert {
  id?: string;
  company_id: string;
  site_address_id?: string | null;
  date: string;
  temperature_min?: number | null;
  temperature_max?: number | null;
  precipitation_mm?: number | null;
  wind_speed_kmh?: number | null;
  weather_code?: number | null;
  severity?: WeatherSeverity;
  description?: string | null;
  fetched_at?: string;
}

export type WeatherSnapshotUpdate = Partial<WeatherSnapshotInsert>;

// ============================================================
// TABLE: route_estimate
// ============================================================

export interface RouteEstimateRow {
  id: string;
  company_id: string;
  from_address_id: string | null;
  to_address_id: string | null;
  distance_km: number;
  duration_minutes: number;
  estimated_at: string;
}

export interface RouteEstimateInsert {
  id?: string;
  company_id: string;
  from_address_id?: string | null;
  to_address_id?: string | null;
  distance_km?: number;
  duration_minutes?: number;
  estimated_at?: string;
}

export type RouteEstimateUpdate = Partial<RouteEstimateInsert>;

// ============================================================
// TABLE: payment
// ============================================================

export interface PaymentRow {
  id: string;
  company_id: string;
  invoice_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  reference: string | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface PaymentInsert {
  id?: string;
  company_id: string;
  invoice_id: string;
  amount: number;
  payment_method?: PaymentMethod;
  payment_date?: string;
  reference?: string | null;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string;
}

export type PaymentUpdate = Partial<PaymentInsert>;

// ============================================================
// TABLE: payment_link
// ============================================================

export interface PaymentLinkRow {
  id: string;
  invoice_id: string;
  token: string;
  amount: number;
  expires_at: string;
  is_used: boolean;
  stripe_session_id: string | null;
  created_at: string;
}

export interface PaymentLinkInsert {
  id?: string;
  invoice_id: string;
  token?: string;
  amount: number;
  expires_at: string;
  is_used?: boolean;
  stripe_session_id?: string | null;
  created_at?: string;
}

export type PaymentLinkUpdate = Partial<PaymentLinkInsert>;

// ============================================================
// TABLE: reminder_workflow
// ============================================================

export interface ReminderWorkflowRow {
  id: string;
  company_id: string;
  invoice_id: string;
  client_id: string;
  current_level: ReminderLevel;
  is_active: boolean;
  started_at: string;
  last_action_at: string | null;
  stopped_at: string | null;
  stop_reason: string | null;
}

export interface ReminderWorkflowInsert {
  id?: string;
  company_id: string;
  invoice_id: string;
  client_id: string;
  current_level?: ReminderLevel;
  is_active?: boolean;
  started_at?: string;
  last_action_at?: string | null;
  stopped_at?: string | null;
  stop_reason?: string | null;
}

export type ReminderWorkflowUpdate = Partial<ReminderWorkflowInsert>;

// ============================================================
// TABLE: reminder_message
// ============================================================

export interface ReminderMessageRow {
  id: string;
  reminder_workflow_id: string;
  level: ReminderLevel;
  channel: string;
  subject: string | null;
  body: string;
  sent_at: string;
  opened_at: string | null;
  clicked_at: string | null;
}

export interface ReminderMessageInsert {
  id?: string;
  reminder_workflow_id: string;
  level: ReminderLevel;
  channel?: string;
  subject?: string | null;
  body?: string;
  sent_at?: string;
  opened_at?: string | null;
  clicked_at?: string | null;
}

export type ReminderMessageUpdate = Partial<ReminderMessageInsert>;

// ============================================================
// TABLE: ai_agent_run
// ============================================================

export interface AiAgentRunRow {
  id: string;
  company_id: string;
  agent_type: AiAgentType;
  status: string;
  input_data: Record<string, unknown>;
  output_data: Record<string, unknown> | null;
  started_at: string;
  completed_at: string | null;
  error_message: string | null;
  tokens_used: number | null;
}

export interface AiAgentRunInsert {
  id?: string;
  company_id: string;
  agent_type: AiAgentType;
  status?: string;
  input_data?: Record<string, unknown>;
  output_data?: Record<string, unknown> | null;
  started_at?: string;
  completed_at?: string | null;
  error_message?: string | null;
  tokens_used?: number | null;
}

export type AiAgentRunUpdate = Partial<AiAgentRunInsert>;

// ============================================================
// TABLE: ai_proposal
// ============================================================

export interface AiProposalRow {
  id: string;
  company_id: string;
  agent_run_id: string | null;
  entity_type: string;
  entity_id: string | null;
  title: string;
  description: string | null;
  action_type: string;
  action_data: Record<string, unknown>;
  is_accepted: boolean | null;
  accepted_by: string | null;
  accepted_at: string | null;
  dismissed_at: string | null;
  expires_at: string | null;
  created_at: string;
}

export interface AiProposalInsert {
  id?: string;
  company_id: string;
  agent_run_id?: string | null;
  entity_type?: string;
  entity_id?: string | null;
  title?: string;
  description?: string | null;
  action_type?: string;
  action_data?: Record<string, unknown>;
  is_accepted?: boolean | null;
  accepted_by?: string | null;
  accepted_at?: string | null;
  dismissed_at?: string | null;
  expires_at?: string | null;
  created_at?: string;
}

export type AiProposalUpdate = Partial<AiProposalInsert>;

// ============================================================
// TABLE: audit_log
// ============================================================

export interface AuditLogRow {
  id: string;
  company_id: string | null;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
}

export interface AuditLogInsert {
  id?: string;
  company_id?: string | null;
  user_id?: string | null;
  action: string;
  entity_type?: string;
  entity_id?: string | null;
  old_data?: Record<string, unknown> | null;
  new_data?: Record<string, unknown> | null;
  ip_address?: string | null;
  created_at?: string;
}

export type AuditLogUpdate = Partial<AuditLogInsert>;

// ============================================================
// TABLE: document_attachment
// ============================================================

export interface DocumentAttachmentRow {
  id: string;
  company_id: string;
  entity_type: string;
  entity_id: string;
  file_name: string;
  file_url: string;
  file_size: number;
  mime_type: string;
  uploaded_by: string | null;
  created_at: string;
}

export interface DocumentAttachmentInsert {
  id?: string;
  company_id: string;
  entity_type?: string;
  entity_id: string;
  file_name?: string;
  file_url?: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by?: string | null;
  created_at?: string;
}

export type DocumentAttachmentUpdate = Partial<DocumentAttachmentInsert>;

// ============================================================
// TABLE: notification
// ============================================================

export interface NotificationRow {
  id: string;
  company_id: string;
  user_id: string;
  title: string;
  body: string;
  link: string | null;
  is_read: boolean;
  created_at: string;
}

export interface NotificationInsert {
  id?: string;
  company_id: string;
  user_id: string;
  title?: string;
  body?: string;
  link?: string | null;
  is_read?: boolean;
  created_at?: string;
}

export type NotificationUpdate = Partial<NotificationInsert>;

// ============================================================
// TABLE: company_settings
// ============================================================

export interface CompanySettingsRow {
  id: string;
  company_id: string;
  default_vat_rate: number;
  default_payment_terms: number;
  quote_prefix: string;
  invoice_prefix: string;
  quote_validity_days: number;
  company_stamp_url: string | null;
  email_signature: string | null;
  smtp_settings: Record<string, unknown>;
}

export interface CompanySettingsInsert {
  id?: string;
  company_id: string;
  default_vat_rate?: number;
  default_payment_terms?: number;
  quote_prefix?: string;
  invoice_prefix?: string;
  quote_validity_days?: number;
  company_stamp_url?: string | null;
  email_signature?: string | null;
  smtp_settings?: Record<string, unknown>;
}

export type CompanySettingsUpdate = Partial<CompanySettingsInsert>;

// ============================================================
// Database type (Supabase-compatible)
// ============================================================

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
    Views: {
      v_invoice_summary: {
        Row: {
          id: string;
          company_id: string;
          reference: string;
          status: InvoiceStatus;
          invoice_type: DocumentType;
          title: string;
          date_emission: string;
          date_due: string | null;
          total_ht: number;
          total_tva: number;
          total_ttc: number;
          amount_paid: number;
          remaining_due: number;
          created_at: string;
          updated_at: string;
          client_id: string;
          client_type: ClientType;
          client_display_name: string;
          client_email: string | null;
          client_phone: string | null;
          created_by_name: string | null;
        };
      };
      v_quote_summary: {
        Row: {
          id: string;
          company_id: string;
          reference: string;
          status: QuoteStatus;
          title: string;
          date_emission: string;
          date_validity: string | null;
          total_ht: number;
          total_tva: number;
          total_ttc: number;
          discount_percent: number;
          discount_amount: number;
          created_at: string;
          updated_at: string;
          client_id: string;
          client_type: ClientType;
          client_display_name: string;
          client_email: string | null;
          site_city: string | null;
          site_postal_code: string | null;
          created_by_name: string | null;
        };
      };
    };
    Functions: Record<string, never>;
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
