-- ============================================================
-- TERRACORE PRO - Complete Supabase Migration
-- Part 1: Extensions, Enums, Helper Functions, Tables 1-12
-- ============================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE user_role AS ENUM ('admin', 'bureau', 'terrain', 'lecture');
CREATE TYPE client_type AS ENUM ('particulier', 'pro');
CREATE TYPE item_type AS ENUM ('materiau', 'main_oeuvre', 'fourniture', 'location');
CREATE TYPE quote_status AS ENUM ('brouillon', 'envoye', 'accepte', 'refuse', 'expire');
CREATE TYPE invoice_status AS ENUM ('brouillon', 'envoyee', 'payee', 'partiellement_payee', 'en_retard', 'annulee');
CREATE TYPE document_type AS ENUM ('devis', 'facture', 'avoir', 'acompte', 'situation', 'bon_livraison');
CREATE TYPE reminder_level AS ENUM ('relance_1', 'relance_2', 'relance_3', 'mise_en_demeure', 'contentieux');
CREATE TYPE weather_severity AS ENUM ('favorable', 'acceptable', 'defavorable', 'alerte');
CREATE TYPE payment_method AS ENUM ('virement', 'cheque', 'cb', 'especes', 'prelevement');
CREATE TYPE schedule_event_type AS ENUM ('chantier', 'rdv_client', 'reunion', 'conge', 'absence');
CREATE TYPE ai_agent_type AS ENUM ('meteo_replan', 'relance_auto', 'devis_assist', 'marge_alert');

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Function: handle_updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Function: get_user_company_id
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id
  FROM public.user_profile
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Function: update_invoice_remaining
CREATE OR REPLACE FUNCTION update_invoice_remaining()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_paid NUMERIC(15,2);
  v_total_ttc NUMERIC(15,2);
  v_new_status invoice_status;
BEGIN
  SELECT COALESCE(SUM(amount), 0)
  INTO v_total_paid
  FROM public.payment
  WHERE invoice_id = NEW.invoice_id;

  SELECT total_ttc
  INTO v_total_ttc
  FROM public.invoice
  WHERE id = NEW.invoice_id;

  IF v_total_paid >= v_total_ttc THEN
    v_new_status := 'payee';
  ELSIF v_total_paid > 0 THEN
    v_new_status := 'partiellement_payee';
  ELSE
    v_new_status := 'envoyee';
  END IF;

  UPDATE public.invoice
  SET
    amount_paid = v_total_paid,
    remaining_due = GREATEST(0, v_total_ttc - v_total_paid),
    status = v_new_status,
    updated_at = NOW()
  WHERE id = NEW.invoice_id;

  RETURN NEW;
END;
$$;

-- Function: check_reminder_stop
CREATE OR REPLACE FUNCTION check_reminder_stop()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_status invoice_status;
BEGIN
  SELECT status
  INTO v_invoice_status
  FROM public.invoice
  WHERE id = NEW.invoice_id;

  IF v_invoice_status = 'payee' THEN
    UPDATE public.reminder_workflow
    SET
      is_active = FALSE,
      stopped_at = NOW(),
      stop_reason = 'Facture payée intégralement'
    WHERE invoice_id = NEW.invoice_id
      AND is_active = TRUE;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================
-- TABLE 1: company
-- ============================================================

CREATE TABLE public.company (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                TEXT NOT NULL,
  siret               TEXT,
  address             TEXT,
  phone               TEXT,
  email               TEXT,
  logo_url            TEXT,
  settings            JSONB NOT NULL DEFAULT '{}',
  subscription_plan   TEXT NOT NULL DEFAULT 'starter',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_company_name ON public.company USING gin(name gin_trgm_ops);

CREATE TRIGGER trg_company_updated_at
  BEFORE UPDATE ON public.company
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE public.company ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_select_own" ON public.company
  FOR SELECT
  TO authenticated
  USING (id = get_user_company_id());

CREATE POLICY "company_update_own" ON public.company
  FOR UPDATE
  TO authenticated
  USING (id = get_user_company_id())
  WITH CHECK (id = get_user_company_id());

CREATE POLICY "company_insert" ON public.company
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ============================================================
-- TABLE 2: user_profile
-- ============================================================

CREATE TABLE public.user_profile (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id      UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  role            user_role NOT NULL DEFAULT 'lecture',
  first_name      TEXT NOT NULL DEFAULT '',
  last_name       TEXT NOT NULL DEFAULT '',
  phone           TEXT,
  avatar_url      TEXT,
  is_active       BOOLEAN NOT NULL DEFAULT TRUE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_profile_company_id ON public.user_profile(company_id);
CREATE INDEX idx_user_profile_role ON public.user_profile(company_id, role);
CREATE INDEX idx_user_profile_is_active ON public.user_profile(company_id, is_active);

CREATE TRIGGER trg_user_profile_updated_at
  BEFORE UPDATE ON public.user_profile
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE public.user_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_profile_select_own_company" ON public.user_profile
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "user_profile_update_own" ON public.user_profile
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR (
    company_id = get_user_company_id() AND
    EXISTS (
      SELECT 1 FROM public.user_profile up
      WHERE up.id = auth.uid()
        AND up.company_id = get_user_company_id()
        AND up.role = 'admin'
    )
  ))
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "user_profile_insert" ON public.user_profile
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "user_profile_delete_admin" ON public.user_profile
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id() AND
    EXISTS (
      SELECT 1 FROM public.user_profile up
      WHERE up.id = auth.uid()
        AND up.company_id = get_user_company_id()
        AND up.role = 'admin'
    )
  );

-- ============================================================
-- TABLE 3: employee
-- ============================================================

CREATE TABLE public.employee (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  user_profile_id   UUID REFERENCES public.user_profile(id) ON DELETE SET NULL,
  first_name        TEXT NOT NULL,
  last_name         TEXT NOT NULL,
  phone             TEXT,
  email             TEXT,
  color             TEXT NOT NULL DEFAULT '#3B82F6' CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  specialties       TEXT[] NOT NULL DEFAULT '{}',
  hourly_cost       NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (hourly_cost >= 0),
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_employee_company_id ON public.employee(company_id);
CREATE INDEX idx_employee_user_profile_id ON public.employee(user_profile_id);
CREATE INDEX idx_employee_is_active ON public.employee(company_id, is_active);
CREATE INDEX idx_employee_fullname ON public.employee USING gin((first_name || ' ' || last_name) gin_trgm_ops);

CREATE TRIGGER trg_employee_updated_at
  BEFORE UPDATE ON public.employee
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE public.employee ENABLE ROW LEVEL SECURITY;

CREATE POLICY "employee_select_own_company" ON public.employee
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "employee_insert_own_company" ON public.employee
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "employee_update_own_company" ON public.employee
  FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "employee_delete_admin" ON public.employee
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id() AND
    EXISTS (
      SELECT 1 FROM public.user_profile up
      WHERE up.id = auth.uid()
        AND up.company_id = get_user_company_id()
        AND up.role IN ('admin', 'bureau')
    )
  );

-- ============================================================
-- TABLE 4: client
-- ============================================================

CREATE TABLE public.client (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  client_type           client_type NOT NULL DEFAULT 'particulier',
  company_name          TEXT,
  first_name            TEXT NOT NULL DEFAULT '',
  last_name             TEXT NOT NULL DEFAULT '',
  email                 TEXT,
  phone                 TEXT,
  notes                 TEXT,
  payment_terms_days    INTEGER NOT NULL DEFAULT 30 CHECK (payment_terms_days >= 0),
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_client_company_id ON public.client(company_id);
CREATE INDEX idx_client_type ON public.client(company_id, client_type);
CREATE INDEX idx_client_is_active ON public.client(company_id, is_active);
CREATE INDEX idx_client_email ON public.client(company_id, email);
CREATE INDEX idx_client_name_search ON public.client USING gin(
  (COALESCE(company_name, '') || ' ' || first_name || ' ' || last_name) gin_trgm_ops
);

CREATE TRIGGER trg_client_updated_at
  BEFORE UPDATE ON public.client
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE public.client ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_select_own_company" ON public.client
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "client_insert_own_company" ON public.client
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "client_update_own_company" ON public.client
  FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "client_delete_admin" ON public.client
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id() AND
    EXISTS (
      SELECT 1 FROM public.user_profile up
      WHERE up.id = auth.uid()
        AND up.company_id = get_user_company_id()
        AND up.role IN ('admin', 'bureau')
    )
  );

-- ============================================================
-- TABLE 5: client_contact
-- ============================================================

CREATE TABLE public.client_contact (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id     UUID NOT NULL REFERENCES public.client(id) ON DELETE CASCADE,
  first_name    TEXT NOT NULL DEFAULT '',
  last_name     TEXT NOT NULL DEFAULT '',
  email         TEXT,
  phone         TEXT,
  role_title    TEXT,
  is_primary    BOOLEAN NOT NULL DEFAULT FALSE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_client_contact_client_id ON public.client_contact(client_id);
CREATE INDEX idx_client_contact_is_primary ON public.client_contact(client_id, is_primary);

ALTER TABLE public.client_contact ENABLE ROW LEVEL SECURITY;

CREATE POLICY "client_contact_select" ON public.client_contact
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client c
      WHERE c.id = client_contact.client_id
        AND c.company_id = get_user_company_id()
    )
  );

CREATE POLICY "client_contact_insert" ON public.client_contact
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.client c
      WHERE c.id = client_contact.client_id
        AND c.company_id = get_user_company_id()
    )
  );

CREATE POLICY "client_contact_update" ON public.client_contact
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client c
      WHERE c.id = client_contact.client_id
        AND c.company_id = get_user_company_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.client c
      WHERE c.id = client_contact.client_id
        AND c.company_id = get_user_company_id()
    )
  );

CREATE POLICY "client_contact_delete" ON public.client_contact
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.client c
      WHERE c.id = client_contact.client_id
        AND c.company_id = get_user_company_id()
    )
  );

-- ============================================================
-- TABLE 6: site_address
-- ============================================================

CREATE TABLE public.site_address (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id           UUID NOT NULL REFERENCES public.client(id) ON DELETE CASCADE,
  company_id          UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  label               TEXT NOT NULL DEFAULT '',
  street              TEXT NOT NULL DEFAULT '',
  complement          TEXT,
  postal_code         TEXT NOT NULL DEFAULT '',
  city                TEXT NOT NULL DEFAULT '',
  country             TEXT NOT NULL DEFAULT 'France',
  latitude            DOUBLE PRECISION,
  longitude           DOUBLE PRECISION,
  notes               TEXT,
  is_billing_address  BOOLEAN NOT NULL DEFAULT FALSE,
  is_default_site     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_site_address_client_id ON public.site_address(client_id);
CREATE INDEX idx_site_address_company_id ON public.site_address(company_id);
CREATE INDEX idx_site_address_postal_code ON public.site_address(company_id, postal_code);
CREATE INDEX idx_site_address_is_default ON public.site_address(client_id, is_default_site);
CREATE INDEX idx_site_address_geo ON public.site_address(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

CREATE TRIGGER trg_site_address_updated_at
  BEFORE UPDATE ON public.site_address
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE public.site_address ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_address_select" ON public.site_address
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "site_address_insert" ON public.site_address
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "site_address_update" ON public.site_address
  FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "site_address_delete" ON public.site_address
  FOR DELETE
  TO authenticated
  USING (company_id = get_user_company_id());

-- ============================================================
-- TABLE 7: price_category
-- ============================================================

CREATE TABLE public.price_category (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  margin_coefficient    NUMERIC(8,4) NOT NULL DEFAULT 1.0 CHECK (margin_coefficient > 0),
  is_default            BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_price_category_company_id ON public.price_category(company_id);
CREATE INDEX idx_price_category_is_default ON public.price_category(company_id, is_default);
CREATE UNIQUE INDEX idx_price_category_name_company ON public.price_category(company_id, name);

ALTER TABLE public.price_category ENABLE ROW LEVEL SECURITY;

CREATE POLICY "price_category_select" ON public.price_category
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "price_category_insert" ON public.price_category
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "price_category_update" ON public.price_category
  FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "price_category_delete" ON public.price_category
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id() AND
    EXISTS (
      SELECT 1 FROM public.user_profile up
      WHERE up.id = auth.uid()
        AND up.company_id = get_user_company_id()
        AND up.role IN ('admin', 'bureau')
    )
  );

-- ============================================================
-- TABLE 8: item_family
-- ============================================================

CREATE TABLE public.item_family (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  parent_id     UUID REFERENCES public.item_family(id) ON DELETE SET NULL,
  sort_order    INTEGER NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_item_family_company_id ON public.item_family(company_id);
CREATE INDEX idx_item_family_parent_id ON public.item_family(parent_id);
CREATE INDEX idx_item_family_sort_order ON public.item_family(company_id, sort_order);

ALTER TABLE public.item_family ENABLE ROW LEVEL SECURITY;

CREATE POLICY "item_family_select" ON public.item_family
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "item_family_insert" ON public.item_family
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "item_family_update" ON public.item_family
  FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "item_family_delete" ON public.item_family
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id() AND
    EXISTS (
      SELECT 1 FROM public.user_profile up
      WHERE up.id = auth.uid()
        AND up.company_id = get_user_company_id()
        AND up.role IN ('admin', 'bureau')
    )
  );

-- ============================================================
-- TABLE 9: item
-- ============================================================

CREATE TABLE public.item (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  reference           TEXT NOT NULL DEFAULT '',
  label               TEXT NOT NULL,
  description         TEXT,
  item_type           item_type NOT NULL DEFAULT 'fourniture',
  family_id           UUID REFERENCES public.item_family(id) ON DELETE SET NULL,
  unit                TEXT NOT NULL DEFAULT 'u',
  unit_price_ht       NUMERIC(15,4) NOT NULL DEFAULT 0 CHECK (unit_price_ht >= 0),
  purchase_price_ht   NUMERIC(15,4) NOT NULL DEFAULT 0 CHECK (purchase_price_ht >= 0),
  vat_rate            NUMERIC(5,2) NOT NULL DEFAULT 20 CHECK (vat_rate >= 0 AND vat_rate <= 100),
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_item_company_id ON public.item(company_id);
CREATE INDEX idx_item_family_id ON public.item(family_id);
CREATE INDEX idx_item_type ON public.item(company_id, item_type);
CREATE INDEX idx_item_is_active ON public.item(company_id, is_active);
CREATE INDEX idx_item_reference ON public.item(company_id, reference);
CREATE UNIQUE INDEX idx_item_reference_company ON public.item(company_id, reference) WHERE reference <> '';
CREATE INDEX idx_item_label_search ON public.item USING gin(label gin_trgm_ops);

CREATE TRIGGER trg_item_updated_at
  BEFORE UPDATE ON public.item
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE public.item ENABLE ROW LEVEL SECURITY;

CREATE POLICY "item_select" ON public.item
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "item_insert" ON public.item
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "item_update" ON public.item
  FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "item_delete" ON public.item
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id() AND
    EXISTS (
      SELECT 1 FROM public.user_profile up
      WHERE up.id = auth.uid()
        AND up.company_id = get_user_company_id()
        AND up.role IN ('admin', 'bureau')
    )
  );

-- ============================================================
-- TABLE 10: work_unit
-- ============================================================

CREATE TABLE public.work_unit (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  reference         TEXT NOT NULL DEFAULT '',
  label             TEXT NOT NULL,
  description       TEXT,
  unit              TEXT NOT NULL DEFAULT 'u',
  total_price_ht    NUMERIC(15,4) NOT NULL DEFAULT 0 CHECK (total_price_ht >= 0),
  margin_percent    NUMERIC(8,4) NOT NULL DEFAULT 0,
  family_id         UUID REFERENCES public.item_family(id) ON DELETE SET NULL,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_work_unit_company_id ON public.work_unit(company_id);
CREATE INDEX idx_work_unit_family_id ON public.work_unit(family_id);
CREATE INDEX idx_work_unit_is_active ON public.work_unit(company_id, is_active);
CREATE INDEX idx_work_unit_reference ON public.work_unit(company_id, reference);
CREATE INDEX idx_work_unit_label_search ON public.work_unit USING gin(label gin_trgm_ops);

CREATE TRIGGER trg_work_unit_updated_at
  BEFORE UPDATE ON public.work_unit
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE public.work_unit ENABLE ROW LEVEL SECURITY;

CREATE POLICY "work_unit_select" ON public.work_unit
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "work_unit_insert" ON public.work_unit
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "work_unit_update" ON public.work_unit
  FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "work_unit_delete" ON public.work_unit
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id() AND
    EXISTS (
      SELECT 1 FROM public.user_profile up
      WHERE up.id = auth.uid()
        AND up.company_id = get_user_company_id()
        AND up.role IN ('admin', 'bureau')
    )
  );

-- ============================================================
-- TABLE 11: work_unit_line
-- ============================================================

CREATE TABLE public.work_unit_line (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  work_unit_id    UUID NOT NULL REFERENCES public.work_unit(id) ON DELETE CASCADE,
  item_id         UUID REFERENCES public.item(id) ON DELETE SET NULL,
  quantity        NUMERIC(15,4) NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price_ht   NUMERIC(15,4) NOT NULL DEFAULT 0 CHECK (unit_price_ht >= 0),
  sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_work_unit_line_work_unit_id ON public.work_unit_line(work_unit_id);
CREATE INDEX idx_work_unit_line_item_id ON public.work_unit_line(item_id);
CREATE INDEX idx_work_unit_line_sort_order ON public.work_unit_line(work_unit_id, sort_order);

ALTER TABLE public.work_unit_line ENABLE ROW LEVEL SECURITY;

CREATE POLICY "work_unit_line_select" ON public.work_unit_line
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.work_unit wu
      WHERE wu.id = work_unit_line.work_unit_id
        AND wu.company_id = get_user_company_id()
    )
  );

CREATE POLICY "work_unit_line_insert" ON public.work_unit_line
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.work_unit wu
      WHERE wu.id = work_unit_line.work_unit_id
        AND wu.company_id = get_user_company_id()
    )
  );

CREATE POLICY "work_unit_line_update" ON public.work_unit_line
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.work_unit wu
      WHERE wu.id = work_unit_line.work_unit_id
        AND wu.company_id = get_user_company_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.work_unit wu
      WHERE wu.id = work_unit_line.work_unit_id
        AND wu.company_id = get_user_company_id()
    )
  );

CREATE POLICY "work_unit_line_delete" ON public.work_unit_line
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.work_unit wu
      WHERE wu.id = work_unit_line.work_unit_id
        AND wu.company_id = get_user_company_id()
    )
  );

-- ============================================================
-- TABLE 12: quote
-- ============================================================

CREATE TABLE public.quote (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  client_id           UUID NOT NULL REFERENCES public.client(id) ON DELETE RESTRICT,
  site_address_id     UUID REFERENCES public.site_address(id) ON DELETE SET NULL,
  reference           TEXT NOT NULL,
  status              quote_status NOT NULL DEFAULT 'brouillon',
  title               TEXT NOT NULL DEFAULT '',
  description         TEXT,
  date_emission       DATE NOT NULL DEFAULT CURRENT_DATE,
  date_validity       DATE,
  total_ht            NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_tva           NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_ttc           NUMERIC(15,2) NOT NULL DEFAULT 0,
  discount_percent    NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  discount_amount     NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  notes_public        TEXT,
  notes_internal      TEXT,
  signed_at           TIMESTAMPTZ,
  signed_by           TEXT,
  pdf_url             TEXT,
  created_by          UUID REFERENCES public.user_profile(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_quote_reference_company ON public.quote(company_id, reference);
CREATE INDEX idx_quote_company_id ON public.quote(company_id);
CREATE INDEX idx_quote_client_id ON public.quote(client_id);
CREATE INDEX idx_quote_site_address_id ON public.quote(site_address_id);
CREATE INDEX idx_quote_status ON public.quote(company_id, status);
CREATE INDEX idx_quote_date_emission ON public.quote(company_id, date_emission DESC);
CREATE INDEX idx_quote_date_validity ON public.quote(company_id, date_validity);
CREATE INDEX idx_quote_created_by ON public.quote(created_by);

CREATE TRIGGER trg_quote_updated_at
  BEFORE UPDATE ON public.quote
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE public.quote ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quote_select" ON public.quote
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "quote_insert" ON public.quote
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "quote_update" ON public.quote
  FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "quote_delete" ON public.quote
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id() AND
    EXISTS (
      SELECT 1 FROM public.user_profile up
      WHERE up.id = auth.uid()
        AND up.company_id = get_user_company_id()
        AND up.role IN ('admin', 'bureau')
    )
  );

-- ============================================================
-- TERRACORE PRO - Complete Supabase Migration
-- Part 2: Tables 13-25
-- ============================================================

-- ============================================================
-- TABLE 13: quote_line
-- ============================================================

CREATE TABLE public.quote_line (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id          UUID NOT NULL REFERENCES public.quote(id) ON DELETE CASCADE,
  parent_line_id    UUID REFERENCES public.quote_line(id) ON DELETE CASCADE,
  item_id           UUID REFERENCES public.item(id) ON DELETE SET NULL,
  work_unit_id      UUID REFERENCES public.work_unit(id) ON DELETE SET NULL,
  label             TEXT NOT NULL DEFAULT '',
  description       TEXT,
  quantity          NUMERIC(15,4) NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  unit              TEXT NOT NULL DEFAULT 'u',
  unit_price_ht     NUMERIC(15,4) NOT NULL DEFAULT 0,
  vat_rate          NUMERIC(5,2) NOT NULL DEFAULT 20 CHECK (vat_rate >= 0 AND vat_rate <= 100),
  discount_percent  NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (discount_percent >= 0 AND discount_percent <= 100),
  total_ht          NUMERIC(15,4) NOT NULL DEFAULT 0,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  is_section        BOOLEAN NOT NULL DEFAULT FALSE,
  section_title     TEXT
);

CREATE INDEX idx_quote_line_quote_id ON public.quote_line(quote_id);
CREATE INDEX idx_quote_line_parent_line_id ON public.quote_line(parent_line_id);
CREATE INDEX idx_quote_line_item_id ON public.quote_line(item_id);
CREATE INDEX idx_quote_line_work_unit_id ON public.quote_line(work_unit_id);
CREATE INDEX idx_quote_line_sort_order ON public.quote_line(quote_id, sort_order);

ALTER TABLE public.quote_line ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quote_line_select" ON public.quote_line
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quote q
      WHERE q.id = quote_line.quote_id
        AND q.company_id = get_user_company_id()
    )
  );

CREATE POLICY "quote_line_insert" ON public.quote_line
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quote q
      WHERE q.id = quote_line.quote_id
        AND q.company_id = get_user_company_id()
    )
  );

CREATE POLICY "quote_line_update" ON public.quote_line
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quote q
      WHERE q.id = quote_line.quote_id
        AND q.company_id = get_user_company_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quote q
      WHERE q.id = quote_line.quote_id
        AND q.company_id = get_user_company_id()
    )
  );

CREATE POLICY "quote_line_delete" ON public.quote_line
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quote q
      WHERE q.id = quote_line.quote_id
        AND q.company_id = get_user_company_id()
    )
  );

-- ============================================================
-- TABLE 14: invoice
-- ============================================================

CREATE TABLE public.invoice (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  client_id         UUID NOT NULL REFERENCES public.client(id) ON DELETE RESTRICT,
  quote_id          UUID REFERENCES public.quote(id) ON DELETE SET NULL,
  reference         TEXT NOT NULL,
  status            invoice_status NOT NULL DEFAULT 'brouillon',
  invoice_type      document_type NOT NULL DEFAULT 'facture',
  title             TEXT NOT NULL DEFAULT '',
  date_emission     DATE NOT NULL DEFAULT CURRENT_DATE,
  date_due          DATE,
  total_ht          NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_tva         NUMERIC(15,2) NOT NULL DEFAULT 0,
  total_ttc         NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount_paid       NUMERIC(15,2) NOT NULL DEFAULT 0,
  remaining_due     NUMERIC(15,2) NOT NULL DEFAULT 0,
  notes_public      TEXT,
  notes_internal    TEXT,
  pdf_url           TEXT,
  created_by        UUID REFERENCES public.user_profile(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT invoice_type_check CHECK (invoice_type IN ('facture', 'avoir', 'acompte', 'situation'))
);

CREATE UNIQUE INDEX idx_invoice_reference_company ON public.invoice(company_id, reference);
CREATE INDEX idx_invoice_company_id ON public.invoice(company_id);
CREATE INDEX idx_invoice_client_id ON public.invoice(client_id);
CREATE INDEX idx_invoice_quote_id ON public.invoice(quote_id);
CREATE INDEX idx_invoice_status ON public.invoice(company_id, status);
CREATE INDEX idx_invoice_date_emission ON public.invoice(company_id, date_emission DESC);
CREATE INDEX idx_invoice_date_due ON public.invoice(company_id, date_due);
CREATE INDEX idx_invoice_invoice_type ON public.invoice(company_id, invoice_type);
CREATE INDEX idx_invoice_created_by ON public.invoice(created_by);
CREATE INDEX idx_invoice_remaining_due ON public.invoice(company_id, remaining_due) WHERE remaining_due > 0;

CREATE TRIGGER trg_invoice_updated_at
  BEFORE UPDATE ON public.invoice
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE public.invoice ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoice_select" ON public.invoice
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "invoice_insert" ON public.invoice
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "invoice_update" ON public.invoice
  FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "invoice_delete" ON public.invoice
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id() AND
    EXISTS (
      SELECT 1 FROM public.user_profile up
      WHERE up.id = auth.uid()
        AND up.company_id = get_user_company_id()
        AND up.role IN ('admin', 'bureau')
    )
  );

-- ============================================================
-- TABLE 15: invoice_line
-- ============================================================

CREATE TABLE public.invoice_line (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES public.invoice(id) ON DELETE CASCADE,
  item_id         UUID REFERENCES public.item(id) ON DELETE SET NULL,
  label           TEXT NOT NULL DEFAULT '',
  description     TEXT,
  quantity        NUMERIC(15,4) NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  unit            TEXT NOT NULL DEFAULT 'u',
  unit_price_ht   NUMERIC(15,4) NOT NULL DEFAULT 0,
  vat_rate        NUMERIC(5,2) NOT NULL DEFAULT 20 CHECK (vat_rate >= 0 AND vat_rate <= 100),
  total_ht        NUMERIC(15,4) NOT NULL DEFAULT 0,
  sort_order      INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_invoice_line_invoice_id ON public.invoice_line(invoice_id);
CREATE INDEX idx_invoice_line_item_id ON public.invoice_line(item_id);
CREATE INDEX idx_invoice_line_sort_order ON public.invoice_line(invoice_id, sort_order);

ALTER TABLE public.invoice_line ENABLE ROW LEVEL SECURITY;

CREATE POLICY "invoice_line_select" ON public.invoice_line
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoice i
      WHERE i.id = invoice_line.invoice_id
        AND i.company_id = get_user_company_id()
    )
  );

CREATE POLICY "invoice_line_insert" ON public.invoice_line
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoice i
      WHERE i.id = invoice_line.invoice_id
        AND i.company_id = get_user_company_id()
    )
  );

CREATE POLICY "invoice_line_update" ON public.invoice_line
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoice i
      WHERE i.id = invoice_line.invoice_id
        AND i.company_id = get_user_company_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoice i
      WHERE i.id = invoice_line.invoice_id
        AND i.company_id = get_user_company_id()
    )
  );

CREATE POLICY "invoice_line_delete" ON public.invoice_line
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoice i
      WHERE i.id = invoice_line.invoice_id
        AND i.company_id = get_user_company_id()
    )
  );

-- ============================================================
-- TABLE 16: deposit_invoice
-- ============================================================

CREATE TABLE public.deposit_invoice (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id      UUID NOT NULL REFERENCES public.invoice(id) ON DELETE CASCADE,
  quote_id        UUID NOT NULL REFERENCES public.quote(id) ON DELETE RESTRICT,
  percentage      NUMERIC(5,2) NOT NULL CHECK (percentage > 0 AND percentage <= 100),
  amount_ht       NUMERIC(15,2) NOT NULL DEFAULT 0,
  amount_ttc      NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_deposit_invoice_invoice_id ON public.deposit_invoice(invoice_id);
CREATE INDEX idx_deposit_invoice_quote_id ON public.deposit_invoice(quote_id);

ALTER TABLE public.deposit_invoice ENABLE ROW LEVEL SECURITY;

CREATE POLICY "deposit_invoice_select" ON public.deposit_invoice
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoice i
      WHERE i.id = deposit_invoice.invoice_id
        AND i.company_id = get_user_company_id()
    )
  );

CREATE POLICY "deposit_invoice_insert" ON public.deposit_invoice
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoice i
      WHERE i.id = deposit_invoice.invoice_id
        AND i.company_id = get_user_company_id()
    )
  );

CREATE POLICY "deposit_invoice_update" ON public.deposit_invoice
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoice i
      WHERE i.id = deposit_invoice.invoice_id
        AND i.company_id = get_user_company_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoice i
      WHERE i.id = deposit_invoice.invoice_id
        AND i.company_id = get_user_company_id()
    )
  );

CREATE POLICY "deposit_invoice_delete" ON public.deposit_invoice
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoice i
      WHERE i.id = deposit_invoice.invoice_id
        AND i.company_id = get_user_company_id()
    )
  );

-- ============================================================
-- TABLE 17: progress_invoice
-- ============================================================

CREATE TABLE public.progress_invoice (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id          UUID NOT NULL REFERENCES public.invoice(id) ON DELETE CASCADE,
  quote_id            UUID NOT NULL REFERENCES public.quote(id) ON DELETE RESTRICT,
  situation_number    INTEGER NOT NULL DEFAULT 1 CHECK (situation_number > 0),
  cumulative_percent  NUMERIC(5,2) NOT NULL CHECK (cumulative_percent >= 0 AND cumulative_percent <= 100),
  previous_amount     NUMERIC(15,2) NOT NULL DEFAULT 0,
  current_amount      NUMERIC(15,2) NOT NULL DEFAULT 0,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_progress_invoice_invoice_id ON public.progress_invoice(invoice_id);
CREATE INDEX idx_progress_invoice_quote_id ON public.progress_invoice(quote_id);
CREATE UNIQUE INDEX idx_progress_invoice_quote_situation ON public.progress_invoice(quote_id, situation_number);

ALTER TABLE public.progress_invoice ENABLE ROW LEVEL SECURITY;

CREATE POLICY "progress_invoice_select" ON public.progress_invoice
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoice i
      WHERE i.id = progress_invoice.invoice_id
        AND i.company_id = get_user_company_id()
    )
  );

CREATE POLICY "progress_invoice_insert" ON public.progress_invoice
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoice i
      WHERE i.id = progress_invoice.invoice_id
        AND i.company_id = get_user_company_id()
    )
  );

CREATE POLICY "progress_invoice_update" ON public.progress_invoice
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoice i
      WHERE i.id = progress_invoice.invoice_id
        AND i.company_id = get_user_company_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoice i
      WHERE i.id = progress_invoice.invoice_id
        AND i.company_id = get_user_company_id()
    )
  );

CREATE POLICY "progress_invoice_delete" ON public.progress_invoice
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoice i
      WHERE i.id = progress_invoice.invoice_id
        AND i.company_id = get_user_company_id()
    )
  );

-- ============================================================
-- TABLE 18: delivery_note
-- ============================================================

CREATE TABLE public.delivery_note (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  client_id         UUID NOT NULL REFERENCES public.client(id) ON DELETE RESTRICT,
  quote_id          UUID REFERENCES public.quote(id) ON DELETE SET NULL,
  reference         TEXT NOT NULL,
  date_emission     DATE NOT NULL DEFAULT CURRENT_DATE,
  site_address_id   UUID REFERENCES public.site_address(id) ON DELETE SET NULL,
  notes             TEXT,
  status            TEXT NOT NULL DEFAULT 'brouillon' CHECK (status IN ('brouillon', 'envoye', 'livre', 'annule')),
  delivered_by      UUID REFERENCES public.employee(id) ON DELETE SET NULL,
  pdf_url           TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_delivery_note_reference_company ON public.delivery_note(company_id, reference);
CREATE INDEX idx_delivery_note_company_id ON public.delivery_note(company_id);
CREATE INDEX idx_delivery_note_client_id ON public.delivery_note(client_id);
CREATE INDEX idx_delivery_note_quote_id ON public.delivery_note(quote_id);
CREATE INDEX idx_delivery_note_status ON public.delivery_note(company_id, status);
CREATE INDEX idx_delivery_note_date ON public.delivery_note(company_id, date_emission DESC);

CREATE TRIGGER trg_delivery_note_updated_at
  BEFORE UPDATE ON public.delivery_note
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE public.delivery_note ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delivery_note_select" ON public.delivery_note
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "delivery_note_insert" ON public.delivery_note
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "delivery_note_update" ON public.delivery_note
  FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "delivery_note_delete" ON public.delivery_note
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id() AND
    EXISTS (
      SELECT 1 FROM public.user_profile up
      WHERE up.id = auth.uid()
        AND up.company_id = get_user_company_id()
        AND up.role IN ('admin', 'bureau')
    )
  );

-- ============================================================
-- TABLE 19: delivery_note_line
-- ============================================================

CREATE TABLE public.delivery_note_line (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_note_id    UUID NOT NULL REFERENCES public.delivery_note(id) ON DELETE CASCADE,
  item_id             UUID REFERENCES public.item(id) ON DELETE SET NULL,
  label               TEXT NOT NULL DEFAULT '',
  quantity            NUMERIC(15,4) NOT NULL DEFAULT 1 CHECK (quantity >= 0),
  unit                TEXT NOT NULL DEFAULT 'u',
  notes               TEXT,
  sort_order          INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_delivery_note_line_delivery_note_id ON public.delivery_note_line(delivery_note_id);
CREATE INDEX idx_delivery_note_line_item_id ON public.delivery_note_line(item_id);
CREATE INDEX idx_delivery_note_line_sort_order ON public.delivery_note_line(delivery_note_id, sort_order);

ALTER TABLE public.delivery_note_line ENABLE ROW LEVEL SECURITY;

CREATE POLICY "delivery_note_line_select" ON public.delivery_note_line
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.delivery_note dn
      WHERE dn.id = delivery_note_line.delivery_note_id
        AND dn.company_id = get_user_company_id()
    )
  );

CREATE POLICY "delivery_note_line_insert" ON public.delivery_note_line
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.delivery_note dn
      WHERE dn.id = delivery_note_line.delivery_note_id
        AND dn.company_id = get_user_company_id()
    )
  );

CREATE POLICY "delivery_note_line_update" ON public.delivery_note_line
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.delivery_note dn
      WHERE dn.id = delivery_note_line.delivery_note_id
        AND dn.company_id = get_user_company_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.delivery_note dn
      WHERE dn.id = delivery_note_line.delivery_note_id
        AND dn.company_id = get_user_company_id()
    )
  );

CREATE POLICY "delivery_note_line_delete" ON public.delivery_note_line
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.delivery_note dn
      WHERE dn.id = delivery_note_line.delivery_note_id
        AND dn.company_id = get_user_company_id()
    )
  );

-- ============================================================
-- TABLE 20: maintenance_contract
-- ============================================================

CREATE TABLE public.maintenance_contract (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id                UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  client_id                 UUID NOT NULL REFERENCES public.client(id) ON DELETE RESTRICT,
  site_address_id           UUID REFERENCES public.site_address(id) ON DELETE SET NULL,
  reference                 TEXT NOT NULL,
  title                     TEXT NOT NULL DEFAULT '',
  description               TEXT,
  start_date                DATE NOT NULL,
  end_date                  DATE,
  recurrence_months         INTEGER NOT NULL DEFAULT 12 CHECK (recurrence_months > 0),
  annual_amount_ht          NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (annual_amount_ht >= 0),
  annual_amount_ttc         NUMERIC(15,2) NOT NULL DEFAULT 0 CHECK (annual_amount_ttc >= 0),
  is_active                 BOOLEAN NOT NULL DEFAULT TRUE,
  next_intervention_date    DATE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT maintenance_dates_check CHECK (end_date IS NULL OR end_date > start_date)
);

CREATE UNIQUE INDEX idx_maintenance_contract_reference_company ON public.maintenance_contract(company_id, reference);
CREATE INDEX idx_maintenance_contract_company_id ON public.maintenance_contract(company_id);
CREATE INDEX idx_maintenance_contract_client_id ON public.maintenance_contract(client_id);
CREATE INDEX idx_maintenance_contract_is_active ON public.maintenance_contract(company_id, is_active);
CREATE INDEX idx_maintenance_contract_next_date ON public.maintenance_contract(company_id, next_intervention_date) WHERE is_active = TRUE;

CREATE TRIGGER trg_maintenance_contract_updated_at
  BEFORE UPDATE ON public.maintenance_contract
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE public.maintenance_contract ENABLE ROW LEVEL SECURITY;

CREATE POLICY "maintenance_contract_select" ON public.maintenance_contract
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "maintenance_contract_insert" ON public.maintenance_contract
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "maintenance_contract_update" ON public.maintenance_contract
  FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "maintenance_contract_delete" ON public.maintenance_contract
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id() AND
    EXISTS (
      SELECT 1 FROM public.user_profile up
      WHERE up.id = auth.uid()
        AND up.company_id = get_user_company_id()
        AND up.role IN ('admin', 'bureau')
    )
  );

-- ============================================================
-- TABLE 21: schedule_event
-- ============================================================

CREATE TABLE public.schedule_event (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  event_type        schedule_event_type NOT NULL DEFAULT 'chantier',
  title             TEXT NOT NULL DEFAULT '',
  description       TEXT,
  start_datetime    TIMESTAMPTZ NOT NULL,
  end_datetime      TIMESTAMPTZ NOT NULL,
  all_day           BOOLEAN NOT NULL DEFAULT FALSE,
  color             TEXT NOT NULL DEFAULT '#3B82F6',
  quote_id          UUID REFERENCES public.quote(id) ON DELETE SET NULL,
  client_id         UUID REFERENCES public.client(id) ON DELETE SET NULL,
  site_address_id   UUID REFERENCES public.site_address(id) ON DELETE SET NULL,
  created_by        UUID REFERENCES public.user_profile(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT schedule_event_dates_check CHECK (end_datetime >= start_datetime)
);

CREATE INDEX idx_schedule_event_company_id ON public.schedule_event(company_id);
CREATE INDEX idx_schedule_event_start_datetime ON public.schedule_event(company_id, start_datetime);
CREATE INDEX idx_schedule_event_end_datetime ON public.schedule_event(company_id, end_datetime);
CREATE INDEX idx_schedule_event_event_type ON public.schedule_event(company_id, event_type);
CREATE INDEX idx_schedule_event_quote_id ON public.schedule_event(quote_id);
CREATE INDEX idx_schedule_event_client_id ON public.schedule_event(client_id);
CREATE INDEX idx_schedule_event_site_address_id ON public.schedule_event(site_address_id);
CREATE INDEX idx_schedule_event_created_by ON public.schedule_event(created_by);
CREATE INDEX idx_schedule_event_date_range ON public.schedule_event(company_id, start_datetime, end_datetime);

CREATE TRIGGER trg_schedule_event_updated_at
  BEFORE UPDATE ON public.schedule_event
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE public.schedule_event ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedule_event_select" ON public.schedule_event
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "schedule_event_insert" ON public.schedule_event
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "schedule_event_update" ON public.schedule_event
  FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "schedule_event_delete" ON public.schedule_event
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id() AND
    EXISTS (
      SELECT 1 FROM public.user_profile up
      WHERE up.id = auth.uid()
        AND up.company_id = get_user_company_id()
        AND up.role IN ('admin', 'bureau', 'terrain')
    )
  );

-- ============================================================
-- TABLE 22: schedule_event_employee
-- ============================================================

CREATE TABLE public.schedule_event_employee (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_event_id   UUID NOT NULL REFERENCES public.schedule_event(id) ON DELETE CASCADE,
  employee_id         UUID NOT NULL REFERENCES public.employee(id) ON DELETE CASCADE,
  CONSTRAINT schedule_event_employee_unique UNIQUE (schedule_event_id, employee_id)
);

CREATE INDEX idx_schedule_event_employee_event_id ON public.schedule_event_employee(schedule_event_id);
CREATE INDEX idx_schedule_event_employee_employee_id ON public.schedule_event_employee(employee_id);

ALTER TABLE public.schedule_event_employee ENABLE ROW LEVEL SECURITY;

CREATE POLICY "schedule_event_employee_select" ON public.schedule_event_employee
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.schedule_event se
      WHERE se.id = schedule_event_employee.schedule_event_id
        AND se.company_id = get_user_company_id()
    )
  );

CREATE POLICY "schedule_event_employee_insert" ON public.schedule_event_employee
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.schedule_event se
      WHERE se.id = schedule_event_employee.schedule_event_id
        AND se.company_id = get_user_company_id()
    )
  );

CREATE POLICY "schedule_event_employee_delete" ON public.schedule_event_employee
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.schedule_event se
      WHERE se.id = schedule_event_employee.schedule_event_id
        AND se.company_id = get_user_company_id()
    )
  );

-- ============================================================
-- TABLE 23: intervention
-- ============================================================

CREATE TABLE public.intervention (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  schedule_event_id   UUID REFERENCES public.schedule_event(id) ON DELETE SET NULL,
  quote_id            UUID REFERENCES public.quote(id) ON DELETE SET NULL,
  client_id           UUID NOT NULL REFERENCES public.client(id) ON DELETE RESTRICT,
  site_address_id     UUID REFERENCES public.site_address(id) ON DELETE SET NULL,
  status              TEXT NOT NULL DEFAULT 'planifie' CHECK (status IN ('planifie', 'en_cours', 'termine', 'annule', 'reporte')),
  start_time          TIMESTAMPTZ,
  end_time            TIMESTAMPTZ,
  notes               TEXT,
  photos              TEXT[] NOT NULL DEFAULT '{}',
  signature_url       TEXT,
  validated_by        UUID REFERENCES public.user_profile(id) ON DELETE SET NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT intervention_times_check CHECK (end_time IS NULL OR start_time IS NULL OR end_time >= start_time)
);

CREATE INDEX idx_intervention_company_id ON public.intervention(company_id);
CREATE INDEX idx_intervention_schedule_event_id ON public.intervention(schedule_event_id);
CREATE INDEX idx_intervention_quote_id ON public.intervention(quote_id);
CREATE INDEX idx_intervention_client_id ON public.intervention(client_id);
CREATE INDEX idx_intervention_site_address_id ON public.intervention(site_address_id);
CREATE INDEX idx_intervention_status ON public.intervention(company_id, status);
CREATE INDEX idx_intervention_start_time ON public.intervention(company_id, start_time);
CREATE INDEX idx_intervention_validated_by ON public.intervention(validated_by);

CREATE TRIGGER trg_intervention_updated_at
  BEFORE UPDATE ON public.intervention
  FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

ALTER TABLE public.intervention ENABLE ROW LEVEL SECURITY;

CREATE POLICY "intervention_select" ON public.intervention
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "intervention_insert" ON public.intervention
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "intervention_update" ON public.intervention
  FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "intervention_delete" ON public.intervention
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id() AND
    EXISTS (
      SELECT 1 FROM public.user_profile up
      WHERE up.id = auth.uid()
        AND up.company_id = get_user_company_id()
        AND up.role IN ('admin', 'bureau')
    )
  );

-- ============================================================
-- TABLE 24: intervention_line
-- ============================================================

CREATE TABLE public.intervention_line (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id   UUID NOT NULL REFERENCES public.intervention(id) ON DELETE CASCADE,
  item_id           UUID REFERENCES public.item(id) ON DELETE SET NULL,
  label             TEXT NOT NULL DEFAULT '',
  quantity_planned  NUMERIC(15,4) NOT NULL DEFAULT 0 CHECK (quantity_planned >= 0),
  quantity_done     NUMERIC(15,4) NOT NULL DEFAULT 0 CHECK (quantity_done >= 0),
  unit              TEXT NOT NULL DEFAULT 'u',
  notes             TEXT
);

CREATE INDEX idx_intervention_line_intervention_id ON public.intervention_line(intervention_id);
CREATE INDEX idx_intervention_line_item_id ON public.intervention_line(item_id);

ALTER TABLE public.intervention_line ENABLE ROW LEVEL SECURITY;

CREATE POLICY "intervention_line_select" ON public.intervention_line
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.intervention iv
      WHERE iv.id = intervention_line.intervention_id
        AND iv.company_id = get_user_company_id()
    )
  );

CREATE POLICY "intervention_line_insert" ON public.intervention_line
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.intervention iv
      WHERE iv.id = intervention_line.intervention_id
        AND iv.company_id = get_user_company_id()
    )
  );

CREATE POLICY "intervention_line_update" ON public.intervention_line
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.intervention iv
      WHERE iv.id = intervention_line.intervention_id
        AND iv.company_id = get_user_company_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.intervention iv
      WHERE iv.id = intervention_line.intervention_id
        AND iv.company_id = get_user_company_id()
    )
  );

CREATE POLICY "intervention_line_delete" ON public.intervention_line
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.intervention iv
      WHERE iv.id = intervention_line.intervention_id
        AND iv.company_id = get_user_company_id()
    )
  );

-- ============================================================
-- TABLE 25: weather_snapshot
-- ============================================================

CREATE TABLE public.weather_snapshot (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id          UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  site_address_id     UUID REFERENCES public.site_address(id) ON DELETE SET NULL,
  date                DATE NOT NULL,
  temperature_min     NUMERIC(5,2),
  temperature_max     NUMERIC(5,2),
  precipitation_mm    NUMERIC(8,2),
  wind_speed_kmh      NUMERIC(8,2),
  weather_code        INTEGER,
  severity            weather_severity NOT NULL DEFAULT 'acceptable',
  description         TEXT,
  fetched_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_weather_snapshot_company_id ON public.weather_snapshot(company_id);
CREATE INDEX idx_weather_snapshot_site_address_id ON public.weather_snapshot(site_address_id);
CREATE INDEX idx_weather_snapshot_date ON public.weather_snapshot(company_id, date DESC);
CREATE UNIQUE INDEX idx_weather_snapshot_site_date ON public.weather_snapshot(company_id, site_address_id, date) WHERE site_address_id IS NOT NULL;
CREATE INDEX idx_weather_snapshot_severity ON public.weather_snapshot(company_id, severity, date);

ALTER TABLE public.weather_snapshot ENABLE ROW LEVEL SECURITY;

CREATE POLICY "weather_snapshot_select" ON public.weather_snapshot
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "weather_snapshot_insert" ON public.weather_snapshot
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "weather_snapshot_update" ON public.weather_snapshot
  FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "weather_snapshot_delete" ON public.weather_snapshot
  FOR DELETE
  TO authenticated
  USING (company_id = get_user_company_id());

-- ============================================================
-- TERRACORE PRO - Complete Supabase Migration
-- Part 3: Tables 26-36, Triggers, All remaining RLS
-- ============================================================

-- ============================================================
-- TABLE 26: route_estimate
-- ============================================================

CREATE TABLE public.route_estimate (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  from_address_id   UUID REFERENCES public.site_address(id) ON DELETE SET NULL,
  to_address_id     UUID REFERENCES public.site_address(id) ON DELETE SET NULL,
  distance_km       NUMERIC(10,3) NOT NULL DEFAULT 0 CHECK (distance_km >= 0),
  duration_minutes  INTEGER NOT NULL DEFAULT 0 CHECK (duration_minutes >= 0),
  estimated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_route_estimate_company_id ON public.route_estimate(company_id);
CREATE INDEX idx_route_estimate_from_address ON public.route_estimate(from_address_id);
CREATE INDEX idx_route_estimate_to_address ON public.route_estimate(to_address_id);
CREATE INDEX idx_route_estimate_route ON public.route_estimate(company_id, from_address_id, to_address_id);

ALTER TABLE public.route_estimate ENABLE ROW LEVEL SECURITY;

CREATE POLICY "route_estimate_select" ON public.route_estimate
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "route_estimate_insert" ON public.route_estimate
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "route_estimate_update" ON public.route_estimate
  FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "route_estimate_delete" ON public.route_estimate
  FOR DELETE
  TO authenticated
  USING (company_id = get_user_company_id());

-- ============================================================
-- TABLE 27: payment
-- ============================================================

CREATE TABLE public.payment (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  invoice_id      UUID NOT NULL REFERENCES public.invoice(id) ON DELETE RESTRICT,
  amount          NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  payment_method  payment_method NOT NULL DEFAULT 'virement',
  payment_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  reference       TEXT,
  notes           TEXT,
  created_by      UUID REFERENCES public.user_profile(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_company_id ON public.payment(company_id);
CREATE INDEX idx_payment_invoice_id ON public.payment(invoice_id);
CREATE INDEX idx_payment_payment_date ON public.payment(company_id, payment_date DESC);
CREATE INDEX idx_payment_payment_method ON public.payment(company_id, payment_method);
CREATE INDEX idx_payment_created_by ON public.payment(created_by);

ALTER TABLE public.payment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_select" ON public.payment
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "payment_insert" ON public.payment
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "payment_update" ON public.payment
  FOR UPDATE
  TO authenticated
  USING (
    company_id = get_user_company_id() AND
    EXISTS (
      SELECT 1 FROM public.user_profile up
      WHERE up.id = auth.uid()
        AND up.company_id = get_user_company_id()
        AND up.role IN ('admin', 'bureau')
    )
  )
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "payment_delete" ON public.payment
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id() AND
    EXISTS (
      SELECT 1 FROM public.user_profile up
      WHERE up.id = auth.uid()
        AND up.company_id = get_user_company_id()
        AND up.role IN ('admin', 'bureau')
    )
  );

-- ============================================================
-- TABLE 28: payment_link
-- ============================================================

CREATE TABLE public.payment_link (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id          UUID NOT NULL REFERENCES public.invoice(id) ON DELETE CASCADE,
  token               TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  amount              NUMERIC(15,2) NOT NULL CHECK (amount > 0),
  expires_at          TIMESTAMPTZ NOT NULL,
  is_used             BOOLEAN NOT NULL DEFAULT FALSE,
  stripe_session_id   TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payment_link_invoice_id ON public.payment_link(invoice_id);
CREATE UNIQUE INDEX idx_payment_link_token ON public.payment_link(token);
CREATE INDEX idx_payment_link_expires_at ON public.payment_link(expires_at) WHERE is_used = FALSE;
CREATE INDEX idx_payment_link_stripe_session ON public.payment_link(stripe_session_id) WHERE stripe_session_id IS NOT NULL;

ALTER TABLE public.payment_link ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_link_select" ON public.payment_link
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoice i
      WHERE i.id = payment_link.invoice_id
        AND i.company_id = get_user_company_id()
    )
  );

CREATE POLICY "payment_link_insert" ON public.payment_link
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoice i
      WHERE i.id = payment_link.invoice_id
        AND i.company_id = get_user_company_id()
    )
  );

CREATE POLICY "payment_link_update" ON public.payment_link
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoice i
      WHERE i.id = payment_link.invoice_id
        AND i.company_id = get_user_company_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoice i
      WHERE i.id = payment_link.invoice_id
        AND i.company_id = get_user_company_id()
    )
  );

CREATE POLICY "payment_link_delete" ON public.payment_link
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoice i
      WHERE i.id = payment_link.invoice_id
        AND i.company_id = get_user_company_id()
    )
  );

-- ============================================================
-- TABLE 29: reminder_workflow
-- ============================================================

CREATE TABLE public.reminder_workflow (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id        UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  invoice_id        UUID NOT NULL REFERENCES public.invoice(id) ON DELETE CASCADE,
  client_id         UUID NOT NULL REFERENCES public.client(id) ON DELETE CASCADE,
  current_level     reminder_level NOT NULL DEFAULT 'relance_1',
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_action_at    TIMESTAMPTZ,
  stopped_at        TIMESTAMPTZ,
  stop_reason       TEXT
);

CREATE UNIQUE INDEX idx_reminder_workflow_invoice_active ON public.reminder_workflow(invoice_id) WHERE is_active = TRUE;
CREATE INDEX idx_reminder_workflow_company_id ON public.reminder_workflow(company_id);
CREATE INDEX idx_reminder_workflow_invoice_id ON public.reminder_workflow(invoice_id);
CREATE INDEX idx_reminder_workflow_client_id ON public.reminder_workflow(client_id);
CREATE INDEX idx_reminder_workflow_is_active ON public.reminder_workflow(company_id, is_active);
CREATE INDEX idx_reminder_workflow_current_level ON public.reminder_workflow(company_id, current_level) WHERE is_active = TRUE;

ALTER TABLE public.reminder_workflow ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reminder_workflow_select" ON public.reminder_workflow
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "reminder_workflow_insert" ON public.reminder_workflow
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "reminder_workflow_update" ON public.reminder_workflow
  FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "reminder_workflow_delete" ON public.reminder_workflow
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id() AND
    EXISTS (
      SELECT 1 FROM public.user_profile up
      WHERE up.id = auth.uid()
        AND up.company_id = get_user_company_id()
        AND up.role IN ('admin', 'bureau')
    )
  );

-- ============================================================
-- TABLE 30: reminder_message
-- ============================================================

CREATE TABLE public.reminder_message (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reminder_workflow_id    UUID NOT NULL REFERENCES public.reminder_workflow(id) ON DELETE CASCADE,
  level                   reminder_level NOT NULL,
  channel                 TEXT NOT NULL DEFAULT 'email' CHECK (channel IN ('email', 'sms', 'courrier', 'telephone')),
  subject                 TEXT,
  body                    TEXT NOT NULL DEFAULT '',
  sent_at                 TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  opened_at               TIMESTAMPTZ,
  clicked_at              TIMESTAMPTZ
);

CREATE INDEX idx_reminder_message_workflow_id ON public.reminder_message(reminder_workflow_id);
CREATE INDEX idx_reminder_message_level ON public.reminder_message(reminder_workflow_id, level);
CREATE INDEX idx_reminder_message_sent_at ON public.reminder_message(sent_at DESC);

ALTER TABLE public.reminder_message ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reminder_message_select" ON public.reminder_message
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reminder_workflow rw
      WHERE rw.id = reminder_message.reminder_workflow_id
        AND rw.company_id = get_user_company_id()
    )
  );

CREATE POLICY "reminder_message_insert" ON public.reminder_message
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reminder_workflow rw
      WHERE rw.id = reminder_message.reminder_workflow_id
        AND rw.company_id = get_user_company_id()
    )
  );

CREATE POLICY "reminder_message_update" ON public.reminder_message
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reminder_workflow rw
      WHERE rw.id = reminder_message.reminder_workflow_id
        AND rw.company_id = get_user_company_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reminder_workflow rw
      WHERE rw.id = reminder_message.reminder_workflow_id
        AND rw.company_id = get_user_company_id()
    )
  );

CREATE POLICY "reminder_message_delete" ON public.reminder_message
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reminder_workflow rw
      WHERE rw.id = reminder_message.reminder_workflow_id
        AND rw.company_id = get_user_company_id()
    )
  );

-- ============================================================
-- TABLE 31: ai_agent_run
-- ============================================================

CREATE TABLE public.ai_agent_run (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  agent_type      ai_agent_type NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  input_data      JSONB NOT NULL DEFAULT '{}',
  output_data     JSONB,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at    TIMESTAMPTZ,
  error_message   TEXT,
  tokens_used     INTEGER DEFAULT 0 CHECK (tokens_used >= 0)
);

CREATE INDEX idx_ai_agent_run_company_id ON public.ai_agent_run(company_id);
CREATE INDEX idx_ai_agent_run_agent_type ON public.ai_agent_run(company_id, agent_type);
CREATE INDEX idx_ai_agent_run_status ON public.ai_agent_run(company_id, status);
CREATE INDEX idx_ai_agent_run_started_at ON public.ai_agent_run(company_id, started_at DESC);

ALTER TABLE public.ai_agent_run ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_agent_run_select" ON public.ai_agent_run
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "ai_agent_run_insert" ON public.ai_agent_run
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "ai_agent_run_update" ON public.ai_agent_run
  FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "ai_agent_run_delete" ON public.ai_agent_run
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id() AND
    EXISTS (
      SELECT 1 FROM public.user_profile up
      WHERE up.id = auth.uid()
        AND up.company_id = get_user_company_id()
        AND up.role = 'admin'
    )
  );

-- ============================================================
-- TABLE 32: ai_proposal
-- ============================================================

CREATE TABLE public.ai_proposal (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  agent_run_id    UUID REFERENCES public.ai_agent_run(id) ON DELETE SET NULL,
  entity_type     TEXT NOT NULL DEFAULT '',
  entity_id       UUID,
  title           TEXT NOT NULL DEFAULT '',
  description     TEXT,
  action_type     TEXT NOT NULL DEFAULT '',
  action_data     JSONB NOT NULL DEFAULT '{}',
  is_accepted     BOOLEAN,
  accepted_by     UUID REFERENCES public.user_profile(id) ON DELETE SET NULL,
  accepted_at     TIMESTAMPTZ,
  dismissed_at    TIMESTAMPTZ,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_ai_proposal_company_id ON public.ai_proposal(company_id);
CREATE INDEX idx_ai_proposal_agent_run_id ON public.ai_proposal(agent_run_id);
CREATE INDEX idx_ai_proposal_entity ON public.ai_proposal(company_id, entity_type, entity_id);
CREATE INDEX idx_ai_proposal_is_accepted ON public.ai_proposal(company_id, is_accepted) WHERE is_accepted IS NULL;
CREATE INDEX idx_ai_proposal_expires_at ON public.ai_proposal(expires_at) WHERE dismissed_at IS NULL AND is_accepted IS NULL;
CREATE INDEX idx_ai_proposal_accepted_by ON public.ai_proposal(accepted_by);

ALTER TABLE public.ai_proposal ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_proposal_select" ON public.ai_proposal
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "ai_proposal_insert" ON public.ai_proposal
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "ai_proposal_update" ON public.ai_proposal
  FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "ai_proposal_delete" ON public.ai_proposal
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id() AND
    EXISTS (
      SELECT 1 FROM public.user_profile up
      WHERE up.id = auth.uid()
        AND up.company_id = get_user_company_id()
        AND up.role = 'admin'
    )
  );

-- ============================================================
-- TABLE 33: audit_log
-- ============================================================

CREATE TABLE public.audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID REFERENCES public.company(id) ON DELETE SET NULL,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action          TEXT NOT NULL,
  entity_type     TEXT NOT NULL DEFAULT '',
  entity_id       UUID,
  old_data        JSONB,
  new_data        JSONB,
  ip_address      INET,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_company_id ON public.audit_log(company_id);
CREATE INDEX idx_audit_log_user_id ON public.audit_log(user_id);
CREATE INDEX idx_audit_log_entity ON public.audit_log(company_id, entity_type, entity_id);
CREATE INDEX idx_audit_log_action ON public.audit_log(company_id, action);
CREATE INDEX idx_audit_log_created_at ON public.audit_log(company_id, created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "audit_log_select_admin" ON public.audit_log
  FOR SELECT
  TO authenticated
  USING (
    company_id = get_user_company_id() AND
    EXISTS (
      SELECT 1 FROM public.user_profile up
      WHERE up.id = auth.uid()
        AND up.company_id = get_user_company_id()
        AND up.role = 'admin'
    )
  );

CREATE POLICY "audit_log_insert" ON public.audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

-- ============================================================
-- TABLE 34: document_attachment
-- ============================================================

CREATE TABLE public.document_attachment (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  entity_type     TEXT NOT NULL DEFAULT '',
  entity_id       UUID NOT NULL,
  file_name       TEXT NOT NULL DEFAULT '',
  file_url        TEXT NOT NULL DEFAULT '',
  file_size       BIGINT NOT NULL DEFAULT 0 CHECK (file_size >= 0),
  mime_type       TEXT NOT NULL DEFAULT '',
  uploaded_by     UUID REFERENCES public.user_profile(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_document_attachment_company_id ON public.document_attachment(company_id);
CREATE INDEX idx_document_attachment_entity ON public.document_attachment(company_id, entity_type, entity_id);
CREATE INDEX idx_document_attachment_uploaded_by ON public.document_attachment(uploaded_by);
CREATE INDEX idx_document_attachment_created_at ON public.document_attachment(company_id, created_at DESC);

ALTER TABLE public.document_attachment ENABLE ROW LEVEL SECURITY;

CREATE POLICY "document_attachment_select" ON public.document_attachment
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "document_attachment_insert" ON public.document_attachment
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "document_attachment_update" ON public.document_attachment
  FOR UPDATE
  TO authenticated
  USING (company_id = get_user_company_id())
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "document_attachment_delete" ON public.document_attachment
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id() AND
    (
      uploaded_by = auth.uid() OR
      EXISTS (
        SELECT 1 FROM public.user_profile up
        WHERE up.id = auth.uid()
          AND up.company_id = get_user_company_id()
          AND up.role IN ('admin', 'bureau')
      )
    )
  );

-- ============================================================
-- TABLE 35: notification
-- ============================================================

CREATE TABLE public.notification (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      UUID NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES public.user_profile(id) ON DELETE CASCADE,
  title           TEXT NOT NULL DEFAULT '',
  body            TEXT NOT NULL DEFAULT '',
  link            TEXT,
  is_read         BOOLEAN NOT NULL DEFAULT FALSE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notification_company_id ON public.notification(company_id);
CREATE INDEX idx_notification_user_id ON public.notification(user_id);
CREATE INDEX idx_notification_is_read ON public.notification(user_id, is_read) WHERE is_read = FALSE;
CREATE INDEX idx_notification_created_at ON public.notification(user_id, created_at DESC);

ALTER TABLE public.notification ENABLE ROW LEVEL SECURITY;

CREATE POLICY "notification_select_own" ON public.notification
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() AND
    company_id = get_user_company_id()
  );

CREATE POLICY "notification_insert" ON public.notification
  FOR INSERT
  TO authenticated
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "notification_update_own" ON public.notification
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() AND
    company_id = get_user_company_id()
  )
  WITH CHECK (
    user_id = auth.uid() AND
    company_id = get_user_company_id()
  );

CREATE POLICY "notification_delete_own" ON public.notification
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() AND
    company_id = get_user_company_id()
  );

-- ============================================================
-- TABLE 36: company_settings
-- ============================================================

CREATE TABLE public.company_settings (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id              UUID NOT NULL UNIQUE REFERENCES public.company(id) ON DELETE CASCADE,
  default_vat_rate        NUMERIC(5,2) NOT NULL DEFAULT 20 CHECK (default_vat_rate >= 0 AND default_vat_rate <= 100),
  default_payment_terms   INTEGER NOT NULL DEFAULT 30 CHECK (default_payment_terms >= 0),
  quote_prefix            TEXT NOT NULL DEFAULT 'DEV-',
  invoice_prefix          TEXT NOT NULL DEFAULT 'FAC-',
  quote_validity_days     INTEGER NOT NULL DEFAULT 30 CHECK (quote_validity_days > 0),
  company_stamp_url       TEXT,
  email_signature         TEXT,
  smtp_settings           JSONB NOT NULL DEFAULT '{}'
);

CREATE UNIQUE INDEX idx_company_settings_company_id ON public.company_settings(company_id);

ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_settings_select" ON public.company_settings
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company_id());

CREATE POLICY "company_settings_insert" ON public.company_settings
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company_id() AND
    EXISTS (
      SELECT 1 FROM public.user_profile up
      WHERE up.id = auth.uid()
        AND up.company_id = get_user_company_id()
        AND up.role = 'admin'
    )
  );

CREATE POLICY "company_settings_update" ON public.company_settings
  FOR UPDATE
  TO authenticated
  USING (
    company_id = get_user_company_id() AND
    EXISTS (
      SELECT 1 FROM public.user_profile up
      WHERE up.id = auth.uid()
        AND up.company_id = get_user_company_id()
        AND up.role = 'admin'
    )
  )
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "company_settings_delete" ON public.company_settings
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company_id() AND
    EXISTS (
      SELECT 1 FROM public.user_profile up
      WHERE up.id = auth.uid()
        AND up.company_id = get_user_company_id()
        AND up.role = 'admin'
    )
  );

-- ============================================================
-- TRIGGERS
-- ============================================================

-- Trigger: Auto-update invoice remaining_due after payment insert or update
CREATE TRIGGER trg_payment_update_invoice_remaining
  AFTER INSERT OR UPDATE ON public.payment
  FOR EACH ROW EXECUTE FUNCTION update_invoice_remaining();

-- Trigger: Check and stop reminder workflow after payment insert or update
CREATE TRIGGER trg_payment_check_reminder_stop
  AFTER INSERT OR UPDATE ON public.payment
  FOR EACH ROW EXECUTE FUNCTION check_reminder_stop();

-- ============================================================
-- ADDITIONAL HELPER: Auto-init company_settings on company create
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_company()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.company_settings (company_id)
  VALUES (NEW.id)
  ON CONFLICT (company_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_company_init_settings
  AFTER INSERT ON public.company
  FOR EACH ROW EXECUTE FUNCTION handle_new_company();

-- ============================================================
-- ADDITIONAL HELPER: Auto-create user_profile on auth.users signup
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id UUID;
BEGIN
  -- Only auto-create profile if metadata contains company_id
  v_company_id := (NEW.raw_user_meta_data->>'company_id')::UUID;
  IF v_company_id IS NOT NULL THEN
    INSERT INTO public.user_profile (
      id,
      company_id,
      role,
      first_name,
      last_name
    ) VALUES (
      NEW.id,
      v_company_id,
      COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'lecture'),
      COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
      COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    )
    ON CONFLICT (id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_auth_user_new_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- ============================================================
-- ADDITIONAL HELPER: Auto-expire quotes past date_validity
-- ============================================================

CREATE OR REPLACE FUNCTION expire_overdue_quotes()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.quote
  SET status = 'expire', updated_at = NOW()
  WHERE status = 'envoye'
    AND date_validity < CURRENT_DATE;
END;
$$;

-- ============================================================
-- ADDITIONAL HELPER: Flag overdue invoices
-- ============================================================

CREATE OR REPLACE FUNCTION flag_overdue_invoices()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.invoice
  SET status = 'en_retard', updated_at = NOW()
  WHERE status IN ('envoyee', 'partiellement_payee')
    AND date_due < CURRENT_DATE
    AND remaining_due > 0;
END;
$$;

-- ============================================================
-- VIEWS (convenience)
-- ============================================================

-- View: invoice summary with client name
CREATE OR REPLACE VIEW public.v_invoice_summary AS
SELECT
  i.id,
  i.company_id,
  i.reference,
  i.status,
  i.invoice_type,
  i.title,
  i.date_emission,
  i.date_due,
  i.total_ht,
  i.total_tva,
  i.total_ttc,
  i.amount_paid,
  i.remaining_due,
  i.created_at,
  i.updated_at,
  c.id AS client_id,
  c.client_type,
  COALESCE(c.company_name, c.first_name || ' ' || c.last_name) AS client_display_name,
  c.email AS client_email,
  c.phone AS client_phone,
  up.first_name || ' ' || up.last_name AS created_by_name
FROM public.invoice i
JOIN public.client c ON c.id = i.client_id
LEFT JOIN public.user_profile up ON up.id = i.created_by;

-- View: quote summary with client name
CREATE OR REPLACE VIEW public.v_quote_summary AS
SELECT
  q.id,
  q.company_id,
  q.reference,
  q.status,
  q.title,
  q.date_emission,
  q.date_validity,
  q.total_ht,
  q.total_tva,
  q.total_ttc,
  q.discount_percent,
  q.discount_amount,
  q.created_at,
  q.updated_at,
  c.id AS client_id,
  c.client_type,
  COALESCE(c.company_name, c.first_name || ' ' || c.last_name) AS client_display_name,
  c.email AS client_email,
  sa.city AS site_city,
  sa.postal_code AS site_postal_code,
  up.first_name || ' ' || up.last_name AS created_by_name
FROM public.quote q
JOIN public.client c ON c.id = q.client_id
LEFT JOIN public.site_address sa ON sa.id = q.site_address_id
LEFT JOIN public.user_profile up ON up.id = q.created_by;

-- ============================================================
-- GRANT permissions on views to authenticated role
-- ============================================================

GRANT SELECT ON public.v_invoice_summary TO authenticated;
GRANT SELECT ON public.v_quote_summary TO authenticated;

-- ============================================================
-- FINAL: Ensure all sequences are owned properly
-- ============================================================

-- Grant usage on schema
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Revoke public defaults
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;

-- Grant authenticated basic access (RLS governs row-level)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================================
-- END OF MIGRATION
-- ============================================================