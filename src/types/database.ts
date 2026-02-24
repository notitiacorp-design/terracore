export type UserRole = 'owner' | 'admin' | 'manager' | 'technician' | 'accountant' | 'viewer';
export type ClientType = 'individual' | 'company' | 'public_entity';
export type ItemType = 'service' | 'product' | 'equipment' | 'consumable';
export type QuoteStatus = 'draft' | 'sent' | 'viewed' | 'accepted' | 'rejected' | 'expired' | 'cancelled';
export type InvoiceStatus = 'draft' | 'sent' | 'viewed' | 'partial' | 'paid' | 'overdue' | 'cancelled' | 'refunded';
export type DocumentType = 'quote' | 'invoice' | 'delivery_note' | 'deposit_invoice' | 'progress_invoice' | 'contract' | 'other';
export type ReminderLevel = 'gentle' | 'standard' | 'firm' | 'final';
export type WeatherSeverity = 'low' | 'moderate' | 'high' | 'extreme';
export type PaymentMethod = 'bank_transfer' | 'check' | 'cash' | 'card' | 'direct_debit' | 'online';
export type ScheduleEventType = 'intervention' | 'visit' | 'meeting' | 'delivery' | 'maintenance' | 'other';
export type AiAgentType = 'quote_optimizer' | 'reminder_writer' | 'route_planner' | 'weather_advisor' | 'report_generator' | 'chatbot';

// ─── Company ─────────────────────────────────────────────────────────────────
export interface CompanyRow {
  id: string;
  name: string;
  legal_name: string | null;
  siret: string | null;
  vat_number: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  logo_url: string | null;
  signature_url: string | null;
  bank_iban: string | null;
  bank_bic: string | null;
  default_vat_rate: number;
  default_payment_terms: number;
  quote_validity_days: number;
  invoice_prefix: string;
  quote_prefix: string;
  created_at: string;
  updated_at: string;
}
export interface CompanyInsert extends Omit<CompanyRow, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
  created_at?: string;
  updated_at?: string;
}
export type CompanyUpdate = Partial<CompanyInsert>;

// ─── UserProfile ─────────────────────────────────────────────────────────────
export interface UserProfileRow {
  id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  role: UserRole;
  avatar_url: string | null;
  is_active: boolean;
  preferences: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}
export interface UserProfileInsert extends Omit<UserProfileRow, 'created_at' | 'updated_at'> {
  created_at?: string;
  updated_at?: string;
}
export type UserProfileUpdate = Partial<Omit<UserProfileInsert, 'id'>>;

// ─── Employee ─────────────────────────────────────────────────────────────────
export interface EmployeeRow {
  id: string;
  company_id: string;
  user_profile_id: string | null;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  hourly_rate: number | null;
  color: string | null;
  is_active: boolean;
  skills: string[];
  created_at: string;
  updated_at: string;
}
export interface EmployeeInsert extends Omit<EmployeeRow, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
  created_at?: string;
  updated_at?: string;
}
export type EmployeeUpdate = Partial<Omit<EmployeeInsert, 'company_id'>>;

// ─── Client ───────────────────────────────────────────────────────────────────
export interface ClientRow {
  id: string;
  company_id: string;
  client_type: ClientType;
  name: string;
  legal_name: string | null;
  siret: string | null;
  vat_number: string | null;
  email: string | null;
  phone: string | null;
  mobile: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string;
  price_category_id: string | null;
  payment_terms: number;
  notes: string | null;
  is_active: boolean;
  customer_reference: string | null;
  created_at: string;
  updated_at: string;
}
export interface ClientInsert extends Omit<ClientRow, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
  created_at?: string;
  updated_at?: string;
}
export type ClientUpdate = Partial<Omit<ClientInsert, 'company_id'>>;

// ─── ClientContact ─────────────────────────────────────────────────────────────
export interface ClientContactRow {
  id: string;
  client_id: string;
  company_id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string | null;
  job_title: string | null;
  is_primary: boolean;
  created_at: string;
  updated_at: string;
}
export interface ClientContactInsert extends Omit<ClientContactRow, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
  created_at?: string;
  updated_at?: string;
}
export type ClientContactUpdate = Partial<Omit<ClientContactInsert, 'client_id' | 'company_id'>>;

// ─── SiteAddress ──────────────────────────────────────────────────────────────
export interface SiteAddressRow {
  id: string;
  client_id: string;
  company_id: string;
  label: string;
  address: string;
  city: string;
  postal_code: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  notes: string | null;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
export interface SiteAddressInsert extends Omit<SiteAddressRow, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
  created_at?: string;
  updated_at?: string;
}
export type SiteAddressUpdate = Partial<Omit<SiteAddressInsert, 'client_id' | 'company_id'>>;

// ─── PriceCategory ───────────────────────────────────────────────────────────
export interface PriceCategoryRow {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  discount_percent: number;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}
export interface PriceCategoryInsert extends Omit<PriceCategoryRow, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
  created_at?: string;
  updated_at?: string;
}
export type PriceCategoryUpdate = Partial<Omit<PriceCategoryInsert, 'company_id'>>;

// ─── ItemFamily ───────────────────────────────────────────────────────────────
export interface ItemFamilyRow {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  parent_id: string | null;
  created_at: string;
  updated_at: string;
}
export interface ItemFamilyInsert extends Omit<ItemFamilyRow, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
  created_at?: string;
  updated_at?: string;
}
export type ItemFamilyUpdate = Partial<Omit<ItemFamilyInsert, 'company_id'>>;

// ─── Item ─────────────────────────────────────────────────────────────────────
export interface ItemRow {
  id: string;
  company_id: string;
  family_id: string | null;
  reference: string | null;
  name: string;
  description: string | null;
  item_type: ItemType;
  unit: string;
  unit_price: number;
  cost_price: number | null;
  vat_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
export interface ItemInsert extends Omit<ItemRow, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
  created_at?: string;
  updated_at?: string;
}
export type ItemUpdate = Partial<Omit<ItemInsert, 'company_id'>>;

// ─── WorkUnit ─────────────────────────────────────────────────────────────────
export interface WorkUnitRow {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  unit: string;
  unit_price: number;
  vat_rate: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
export interface WorkUnitInsert extends Omit<WorkUnitRow, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
  created_at?: string;
  updated_at?: string;
}
export type WorkUnitUpdate = Partial<Omit<WorkUnitInsert, 'company_id'>>;

// ─── WorkUnitLine ─────────────────────────────────────────────────────────────
export interface WorkUnitLineRow {
  id: string;
  work_unit_id: string;
  item_id: string;
  quantity: number;
  created_at: string;
}
export interface WorkUnitLineInsert extends Omit<WorkUnitLineRow, 'id' | 'created_at'> {
  id?: string;
  created_at?: string;
}
export type WorkUnitLineUpdate = Partial<Omit<WorkUnitLineInsert, 'work_unit_id'>>;

// ─── Quote ────────────────────────────────────────────────────────────────────
export interface QuoteRow {
  id: string;
  company_id: string;
  client_id: string;
  site_address_id: string | null;
  quote_number: string;
  status: QuoteStatus;
  issue_date: string;
  validity_date: string;
  subject: string | null;
  notes: string | null;
  internal_notes: string | null;
  terms_and_conditions: string | null;
  discount_percent: number;
  discount_amount: number;
  total_ht: number;
  total_vat: number;
  total_ttc: number;
  deposit_percent: number | null;
  deposit_amount: number | null;
  assigned_to: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  converted_to_invoice_id: string | null;
  created_at: string;
  updated_at: string;
}
export interface QuoteInsert extends Omit<QuoteRow, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
  created_at?: string;
  updated_at?: string;
}
export type QuoteUpdate = Partial<Omit<QuoteInsert, 'company_id'>>;

// ─── QuoteLine ────────────────────────────────────────────────────────────────
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
  created_at: string;
  updated_at: string;
}
export interface QuoteLineInsert extends Omit<QuoteLineRow, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
  created_at?: string;
  updated_at?: string;
}
export type QuoteLineUpdate = Partial<Omit<QuoteLineInsert, 'quote_id'>>;

// ─── Invoice ──────────────────────────────────────────────────────────────────
export interface InvoiceRow {
  id: string;
  company_id: string;
  client_id: string;
  quote_id: string | null;
  site_address_id: string | null;
  invoice_number: string;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  subject: string | null;
  notes: string | null;
  internal_notes: string | null;
  terms_and_conditions: string | null;
  discount_percent: number;
  discount_amount: number;
  total_ht: number;
  total_vat: number;
  total_ttc: number;
  amount_paid: number;
  amount_due: number;
  payment_terms: number;
  assigned_to: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}
export interface InvoiceInsert extends Omit<InvoiceRow, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
  created_at?: string;
  updated_at?: string;
}
export type InvoiceUpdate = Partial<Omit<InvoiceInsert, 'company_id'>>;

// ─── InvoiceLine ──────────────────────────────────────────────────────────────
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
  created_at: string;
  updated_at: string;
}
export interface InvoiceLineInsert extends Omit<InvoiceLineRow, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
  created_at?: string;
  updated_at?: string;
}
export type InvoiceLineUpdate = Partial<Omit<InvoiceLineInsert, 'invoice_id'>>;

// ─── DepositInvoice ────────────────────────────────────────────────────────────
export interface DepositInvoiceRow {
  id: string;
  company_id: string;
  quote_id: string;
  invoice_id: string | null;
  deposit_number: string;
  percent: number;
  amount_ht: number;
  amount_ttc: number;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}
export interface DepositInvoiceInsert extends Omit<DepositInvoiceRow, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
  created_at?: string;
  updated_at?: string;
}
export type DepositInvoiceUpdate = Partial<Omit<DepositInvoiceInsert, 'company_id'>>;

// ─── ProgressInvoice ──────────────────────────────────────────────────────────
export interface ProgressInvoiceRow {
  id: string;
  company_id: string;
  quote_id: string;
  invoice_id: string | null;
  progress_number: string;
  cumulative_percent: number;
  period_percent: number;
  amount_ht: number;
  amount_ttc: number;
  status: InvoiceStatus;
  issue_date: string;
  due_date: string;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}
export interface ProgressInvoiceInsert extends Omit<ProgressInvoiceRow, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
  created_at?: string;
  updated_at?: string;
}
export type ProgressInvoiceUpdate = Partial<Omit<ProgressInvoiceInsert, 'company_id'>>;

// ─── DeliveryNote ─────────────────────────────────────────────────────────────
export interface DeliveryNoteRow {
  id: string;
  company_id: string;
  client_id: string;
  invoice_id: string | null;
  delivery_number: string;
  delivery_date: string;
  site_address_id: string | null;
  notes: string | null;
  signed_at: string | null;
  signature_url: string | null;
  created_at: string;
  updated_at: string;
}
export interface DeliveryNoteInsert extends Omit<DeliveryNoteRow, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
  created_at?: string;
  updated_at?: string;
}
export type DeliveryNoteUpdate = Partial<Omit<DeliveryNoteInsert, 'company_id'>>;

// ─── DeliveryNoteLine ─────────────────────────────────────────────────────────
export interface DeliveryNoteLineRow {
  id: string;
  delivery_note_id: string;
  item_id: string | null;
  description: string;
  quantity: number;
  unit: string;
  created_at: string;
}
export interface DeliveryNoteLineInsert extends Omit<DeliveryNoteLineRow, 'id' | 'created_at'> {
  id?: string;
  created_at?: string;
}
export type DeliveryNoteLineUpdate = Partial<Omit<DeliveryNoteLineInsert, 'delivery_note_id'>>;

// ─── MaintenanceContract ──────────────────────────────────────────────────────
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
  amount_ht: number;
  vat_rate: number;
  billing_frequency: string;
  auto_renew: boolean;
  notice_period_days: number;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
export interface MaintenanceContractInsert extends Omit<MaintenanceContractRow, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
  created_at?: string;
  updated_at?: string;
}
export type MaintenanceContractUpdate = Partial<Omit<MaintenanceContractInsert, 'company_id'>>;

// ─── ScheduleEvent ────────────────────────────────────────────────────────────
export interface ScheduleEventRow {
  id: string;
  company_id: string;
  event_type: ScheduleEventType;
  title: string;
  description: string | null;
  client_id: string | null;
  site_address_id: string | null;
  quote_id: string | null;
  invoice_id: string | null;
  intervention_id: string | null;
  contract_id: string | null;
  start_datetime: string;
  end_datetime: string;
  all_day: boolean;
  color: string | null;
  recurrence_rule: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}
export interface ScheduleEventInsert extends Omit<ScheduleEventRow, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
  created_at?: string;
  updated_at?: string;
}
export type ScheduleEventUpdate = Partial<Omit<ScheduleEventInsert, 'company_id'>>;

// ─── ScheduleEventEmployee ────────────────────────────────────────────────────
export interface ScheduleEventEmployeeRow {
  id: string;
  schedule_event_id: string;
  employee_id: string;
  created_at: string;
}
export interface ScheduleEventEmployeeInsert extends Omit<ScheduleEventEmployeeRow, 'id' | 'created_at'> {
  id?: string;
  created_at?: string;
}
export type ScheduleEventEmployeeUpdate = Partial<Omit<ScheduleEventEmployeeInsert, 'schedule_event_id'>>;

// ─── Intervention ─────────────────────────────────────────────────────────────
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
  created_at: string;
  updated_at: string;
}
export interface InterventionInsert extends Omit<InterventionRow, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
  created_at?: string;
  updated_at?: string;
}
export type InterventionUpdate = Partial<Omit<InterventionInsert, 'company_id'>>;

// ─── InterventionLine ─────────────────────────────────────────────────────────
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
  created_at: string;
}
export interface InterventionLineInsert extends Omit<InterventionLineRow, 'id' | 'created_at'> {
  id?: string;
  created_at?: string;
}
export type InterventionLineUpdate = Partial<Omit<InterventionLineInsert, 'intervention_id'>>;

// ─── WeatherSnapshot ──────────────────────────────────────────────────────────
export interface WeatherSnapshotRow {
  id: string;
  company_id: string;
  site_address_id: string | null;
  latitude: number;
  longitude: number;
  recorded_at: string;
  temperature_c: number | null;
  feels_like_c: number | null;
  humidity_percent: number | null;
  wind_speed_kmh: number | null;
  wind_direction: string | null;
  precipitation_mm: number | null;
  condition: string | null;
  severity: WeatherSeverity | null;
  raw_data: Record<string, unknown> | null;
  created_at: string;
}
export interface WeatherSnapshotInsert extends Omit<WeatherSnapshotRow, 'id' | 'created_at'> {
  id?: string;
  created_at?: string;
}
export type WeatherSnapshotUpdate = Partial<Omit<WeatherSnapshotInsert, 'company_id'>>;

// ─── RouteEstimate ────────────────────────────────────────────────────────────
export interface RouteEstimateRow {
  id: string;
  company_id: string;
  schedule_event_id: string | null;
  origin_address: string;
  destination_address: string;
  distance_km: number | null;
  duration_minutes: number | null;
  polyline: string | null;
  provider: string | null;
  raw_data: Record<string, unknown> | null;
  created_at: string;
}
export interface RouteEstimateInsert extends Omit<RouteEstimateRow, 'id' | 'created_at'> {
  id?: string;
  created_at?: string;
}
export type RouteEstimateUpdate = Partial<Omit<RouteEstimateInsert, 'company_id'>>;

// ─── Payment ──────────────────────────────────────────────────────────────────
export interface PaymentRow {
  id: string;
  company_id: string;
  invoice_id: string;
  amount: number;
  payment_method: PaymentMethod;
  payment_date: string;
  reference: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}
export interface PaymentInsert extends Omit<PaymentRow, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
  created_at?: string;
  updated_at?: string;
}
export type PaymentUpdate = Partial<Omit<PaymentInsert, 'company_id' | 'invoice_id'>>;

// ─── PaymentLink ──────────────────────────────────────────────────────────────
export interface PaymentLinkRow {
  id: string;
  company_id: string;
  invoice_id: string;
  token: string;
  amount: number;
  provider: string;
  provider_payment_id: string | null;
  status: string;
  expires_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}
export interface PaymentLinkInsert extends Omit<PaymentLinkRow, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
  created_at?: string;
  updated_at?: string;
}
export type PaymentLinkUpdate = Partial<Omit<PaymentLinkInsert, 'company_id' | 'invoice_id'>>;

// ─── ReminderWorkflow ─────────────────────────────────────────────────────────
export interface ReminderWorkflowRow {
  id: string;
  company_id: string;
  name: string;
  is_active: boolean;
  trigger_days_overdue: number;
  level: ReminderLevel;
  channel: string;
  created_at: string;
  updated_at: string;
}
export interface ReminderWorkflowInsert extends Omit<ReminderWorkflowRow, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
  created_at?: string;
  updated_at?: string;
}
export type ReminderWorkflowUpdate = Partial<Omit<ReminderWorkflowInsert, 'company_id'>>;

// ─── ReminderMessage ──────────────────────────────────────────────────────────
export interface ReminderMessageRow {
  id: string;
  company_id: string;
  invoice_id: string;
  workflow_id: string | null;
  level: ReminderLevel;
  channel: string;
  recipient_email: string | null;
  subject: string | null;
  body: string | null;
  sent_at: string | null;
  status: string;
  created_at: string;
}
export interface ReminderMessageInsert extends Omit<ReminderMessageRow, 'id' | 'created_at'> {
  id?: string;
  created_at?: string;
}
export type ReminderMessageUpdate = Partial<Omit<ReminderMessageInsert, 'company_id' | 'invoice_id'>>;

// ─── AiAgentRun ───────────────────────────────────────────────────────────────
export interface AiAgentRunRow {
  id: string;
  company_id: string;
  agent_type: AiAgentType;
  triggered_by: string | null;
  input_data: Record<string, unknown> | null;
  output_data: Record<string, unknown> | null;
  status: string;
  error_message: string | null;
  tokens_used: number | null;
  duration_ms: number | null;
  created_at: string;
  updated_at: string;
}
export interface AiAgentRunInsert extends Omit<AiAgentRunRow, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
  created_at?: string;
  updated_at?: string;
}
export type AiAgentRunUpdate = Partial<Omit<AiAgentRunInsert, 'company_id'>>;

// ─── AiProposal ───────────────────────────────────────────────────────────────
export interface AiProposalRow {
  id: string;
  company_id: string;
  agent_run_id: string | null;
  entity_type: string;
  entity_id: string | null;
  proposal_type: string;
  content: Record<string, unknown>;
  is_applied: boolean;
  applied_at: string | null;
  applied_by: string | null;
  created_at: string;
}
export interface AiProposalInsert extends Omit<AiProposalRow, 'id' | 'created_at'> {
  id?: string;
  created_at?: string;
}
export type AiProposalUpdate = Partial<Omit<AiProposalInsert, 'company_id'>>;

// ─── AuditLog ─────────────────────────────────────────────────────────────────
export interface AuditLogRow {
  id: string;
  company_id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  old_data: Record<string, unknown> | null;
  new_data: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}
export interface AuditLogInsert extends Omit<AuditLogRow, 'id' | 'created_at'> {
  id?: string;
  created_at?: string;
}
export type AuditLogUpdate = Partial<Omit<AuditLogInsert, 'company_id'>>;

// ─── DocumentAttachment ───────────────────────────────────────────────────────
export interface DocumentAttachmentRow {
  id: string;
  company_id: string;
  entity_type: DocumentType;
  entity_id: string;
  file_name: string;
  file_url: string;
  file_size: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
  created_at: string;
}
export interface DocumentAttachmentInsert extends Omit<DocumentAttachmentRow, 'id' | 'created_at'> {
  id?: string;
  created_at?: string;
}
export type DocumentAttachmentUpdate = Partial<Omit<DocumentAttachmentInsert, 'company_id'>>;

// ─── Notification ─────────────────────────────────────────────────────────────
export interface NotificationRow {
  id: string;
  company_id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: string;
  entity_type: string | null;
  entity_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}
export interface NotificationInsert extends Omit<NotificationRow, 'id' | 'created_at'> {
  id?: string;
  created_at?: string;
}
export type NotificationUpdate = Partial<Omit<NotificationInsert, 'company_id' | 'user_id'>>;

// ─── CompanySettings ──────────────────────────────────────────────────────────
export interface CompanySettingsRow {
  id: string;
  company_id: string;
  key: string;
  value: unknown;
  created_at: string;
  updated_at: string;
}
export interface CompanySettingsInsert extends Omit<CompanySettingsRow, 'id' | 'created_at' | 'updated_at'> {
  id?: string;
  created_at?: string;
  updated_at?: string;
}
export type CompanySettingsUpdate = Partial<Omit<CompanySettingsInsert, 'company_id'>>;

// ─── Database Interface ───────────────────────────────────────────────────────
export interface Database {
  public: {
    Tables: {
      companies: {
        Row: CompanyRow;
        Insert: CompanyInsert;
        Update: CompanyUpdate;
      };
      user_profiles: {
        Row: UserProfileRow;
        Insert: UserProfileInsert;
        Update: UserProfileUpdate;
      };
      employees: {
        Row: EmployeeRow;
        Insert: EmployeeInsert;
        Update: EmployeeUpdate;
      };
      clients: {
        Row: ClientRow;
        Insert: ClientInsert;
        Update: ClientUpdate;
      };
      client_contacts: {
        Row: ClientContactRow;
        Insert: ClientContactInsert;
        Update: ClientContactUpdate;
      };
      site_addresses: {
        Row: SiteAddressRow;
        Insert: SiteAddressInsert;
        Update: SiteAddressUpdate;
      };
      price_categories: {
        Row: PriceCategoryRow;
        Insert: PriceCategoryInsert;
        Update: PriceCategoryUpdate;
      };
      item_families: {
        Row: ItemFamilyRow;
        Insert: ItemFamilyInsert;
        Update: ItemFamilyUpdate;
      };
      items: {
        Row: ItemRow;
        Insert: ItemInsert;
        Update: ItemUpdate;
      };
      work_units: {
        Row: WorkUnitRow;
        Insert: WorkUnitInsert;
        Update: WorkUnitUpdate;
      };
      work_unit_lines: {
        Row: WorkUnitLineRow;
        Insert: WorkUnitLineInsert;
        Update: WorkUnitLineUpdate;
      };
      quotes: {
        Row: QuoteRow;
        Insert: QuoteInsert;
        Update: QuoteUpdate;
      };
      quote_lines: {
        Row: QuoteLineRow;
        Insert: QuoteLineInsert;
        Update: QuoteLineUpdate;
      };
      invoices: {
        Row: InvoiceRow;
        Insert: InvoiceInsert;
        Update: InvoiceUpdate;
      };
      invoice_lines: {
        Row: InvoiceLineRow;
        Insert: InvoiceLineInsert;
        Update: InvoiceLineUpdate;
      };
      deposit_invoices: {
        Row: DepositInvoiceRow;
        Insert: DepositInvoiceInsert;
        Update: DepositInvoiceUpdate;
      };
      progress_invoices: {
        Row: ProgressInvoiceRow;
        Insert: ProgressInvoiceInsert;
        Update: ProgressInvoiceUpdate;
      };
      delivery_notes: {
        Row: DeliveryNoteRow;
        Insert: DeliveryNoteInsert;
        Update: DeliveryNoteUpdate;
      };
      delivery_note_lines: {
        Row: DeliveryNoteLineRow;
        Insert: DeliveryNoteLineInsert;
        Update: DeliveryNoteLineUpdate;
      };
      maintenance_contracts: {
        Row: MaintenanceContractRow;
        Insert: MaintenanceContractInsert;
        Update: MaintenanceContractUpdate;
      };
      schedule_events: {
        Row: ScheduleEventRow;
        Insert: ScheduleEventInsert;
        Update: ScheduleEventUpdate;
      };
      schedule_event_employees: {
        Row: ScheduleEventEmployeeRow;
        Insert: ScheduleEventEmployeeInsert;
        Update: ScheduleEventEmployeeUpdate;
      };
      interventions: {
        Row: InterventionRow;
        Insert: InterventionInsert;
        Update: InterventionUpdate;
      };
      intervention_lines: {
        Row: InterventionLineRow;
        Insert: InterventionLineInsert;
        Update: InterventionLineUpdate;
      };
      weather_snapshots: {
        Row: WeatherSnapshotRow;
        Insert: WeatherSnapshotInsert;
        Update: WeatherSnapshotUpdate;
      };
      route_estimates: {
        Row: RouteEstimateRow;
        Insert: RouteEstimateInsert;
        Update: RouteEstimateUpdate;
      };
      payments: {
        Row: PaymentRow;
        Insert: PaymentInsert;
        Update: PaymentUpdate;
      };
      payment_links: {
        Row: PaymentLinkRow;
        Insert: PaymentLinkInsert;
        Update: PaymentLinkUpdate;
      };
      reminder_workflows: {
        Row: ReminderWorkflowRow;
        Insert: ReminderWorkflowInsert;
        Update: ReminderWorkflowUpdate;
      };
      reminder_messages: {
        Row: ReminderMessageRow;
        Insert: ReminderMessageInsert;
        Update: ReminderMessageUpdate;
      };
      ai_agent_runs: {
        Row: AiAgentRunRow;
        Insert: AiAgentRunInsert;
        Update: AiAgentRunUpdate;
      };
      ai_proposals: {
        Row: AiProposalRow;
        Insert: AiProposalInsert;
        Update: AiProposalUpdate;
      };
      audit_logs: {
        Row: AuditLogRow;
        Insert: AuditLogInsert;
        Update: AuditLogUpdate;
      };
      document_attachments: {
        Row: DocumentAttachmentRow;
        Insert: DocumentAttachmentInsert;
        Update: DocumentAttachmentUpdate;
      };
      notifications: {
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
    Views: Record<string, never>;
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
