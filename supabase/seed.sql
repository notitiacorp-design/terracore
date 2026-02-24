DO $$
DECLARE
  v_company_id UUID;
  v_user_id UUID := 'bb8ee447-d68a-423e-a107-afb1460471a5';

  -- Employees
  v_emp1_id UUID := gen_random_uuid();
  v_emp2_id UUID := gen_random_uuid();
  v_emp3_id UUID := gen_random_uuid();
  v_emp4_id UUID := gen_random_uuid();

  -- Item families
  v_family1_id UUID := gen_random_uuid();
  v_family2_id UUID := gen_random_uuid();
  v_family3_id UUID := gen_random_uuid();

  -- Items
  v_item1_id UUID := gen_random_uuid();
  v_item2_id UUID := gen_random_uuid();
  v_item3_id UUID := gen_random_uuid();
  v_item4_id UUID := gen_random_uuid();
  v_item5_id UUID := gen_random_uuid();
  v_item6_id UUID := gen_random_uuid();
  v_item7_id UUID := gen_random_uuid();
  v_item8_id UUID := gen_random_uuid();
  v_item9_id UUID := gen_random_uuid();
  v_item10_id UUID := gen_random_uuid();

  -- Clients (existing)
  v_client1_id UUID;
  v_client2_id UUID;
  v_client3_id UUID;

  -- Site addresses
  v_site1_id UUID := gen_random_uuid();
  v_site2_id UUID := gen_random_uuid();
  v_site3_id UUID := gen_random_uuid();

  -- Client contacts
  v_contact1_id UUID := gen_random_uuid();
  v_contact2_id UUID := gen_random_uuid();
  v_contact3_id UUID := gen_random_uuid();

  -- Quotes
  v_quote1_id UUID := gen_random_uuid();
  v_quote2_id UUID := gen_random_uuid();
  v_quote3_id UUID := gen_random_uuid();

  -- Quote lines
  v_ql1_1 UUID := gen_random_uuid();
  v_ql1_2 UUID := gen_random_uuid();
  v_ql1_3 UUID := gen_random_uuid();
  v_ql1_4 UUID := gen_random_uuid();
  v_ql2_1 UUID := gen_random_uuid();
  v_ql2_2 UUID := gen_random_uuid();
  v_ql2_3 UUID := gen_random_uuid();
  v_ql3_1 UUID := gen_random_uuid();
  v_ql3_2 UUID := gen_random_uuid();
  v_ql3_3 UUID := gen_random_uuid();
  v_ql3_4 UUID := gen_random_uuid();
  v_ql3_5 UUID := gen_random_uuid();

  -- Invoices
  v_inv1_id UUID := gen_random_uuid();
  v_inv2_id UUID := gen_random_uuid();
  v_inv3_id UUID := gen_random_uuid();

  -- Invoice lines
  v_il1_1 UUID := gen_random_uuid();
  v_il1_2 UUID := gen_random_uuid();
  v_il1_3 UUID := gen_random_uuid();
  v_il2_1 UUID := gen_random_uuid();
  v_il2_2 UUID := gen_random_uuid();
  v_il2_3 UUID := gen_random_uuid();
  v_il3_1 UUID := gen_random_uuid();
  v_il3_2 UUID := gen_random_uuid();

  -- Schedule events
  v_evt1_id UUID := gen_random_uuid();
  v_evt2_id UUID := gen_random_uuid();
  v_evt3_id UUID := gen_random_uuid();
  v_evt4_id UUID := gen_random_uuid();
  v_evt5_id UUID := gen_random_uuid();

  -- Weather snapshots
  v_wx1_id UUID := gen_random_uuid();
  v_wx2_id UUID := gen_random_uuid();
  v_wx3_id UUID := gen_random_uuid();

  -- AI agent runs
  v_ai_run1_id UUID := gen_random_uuid();
  v_ai_run2_id UUID := gen_random_uuid();

  -- AI proposals
  v_ai_prop1_id UUID := gen_random_uuid();
  v_ai_prop2_id UUID := gen_random_uuid();

  -- Reminder workflow
  v_rw1_id UUID := gen_random_uuid();
  v_rm1_id UUID := gen_random_uuid();

  -- Payments
  v_pay1_id UUID := gen_random_uuid();
  v_pay2_id UUID := gen_random_uuid();
  v_pay3_id UUID := gen_random_uuid();

  -- Work units
  v_wu1_id UUID := gen_random_uuid();
  v_wu2_id UUID := gen_random_uuid();
  v_wul1_id UUID := gen_random_uuid();
  v_wul2_id UUID := gen_random_uuid();
  v_wul3_id UUID := gen_random_uuid();

  -- Delivery note
  v_dn1_id UUID := gen_random_uuid();

  -- Notifications
  v_notif1_id UUID := gen_random_uuid();
  v_notif2_id UUID := gen_random_uuid();
  v_notif3_id UUID := gen_random_uuid();

BEGIN

  -- 1. Fetch existing company_id from the admin user_profile
  SELECT company_id INTO v_company_id
  FROM user_profile
  WHERE id = v_user_id
  LIMIT 1;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Could not find company_id for admin user. Ensure user_profile exists.';
  END IF;

  -- 2. Fetch existing client IDs (take first 3 by created_at)
  SELECT id INTO v_client1_id FROM client WHERE company_id = v_company_id ORDER BY created_at ASC LIMIT 1;
  SELECT id INTO v_client2_id FROM client WHERE company_id = v_company_id ORDER BY created_at ASC OFFSET 1 LIMIT 1;
  SELECT id INTO v_client3_id FROM client WHERE company_id = v_company_id ORDER BY created_at ASC OFFSET 2 LIMIT 1;

  IF v_client1_id IS NULL THEN
    RAISE EXCEPTION 'Could not find at least 1 client. Ensure clients exist.';
  END IF;

  -- Use fallback if fewer than 3 clients
  IF v_client2_id IS NULL THEN v_client2_id := v_client1_id; END IF;
  IF v_client3_id IS NULL THEN v_client3_id := v_client1_id; END IF;

  -- ============================================================
  -- COMPANY SETTINGS
  -- ============================================================
  INSERT INTO company_settings (
    id, company_id, default_vat_rate, default_payment_terms,
    quote_prefix, invoice_prefix, quote_validity_days,
    company_stamp_url, email_signature, smtp_settings
  ) VALUES (
    gen_random_uuid(), v_company_id, 20.0, 30,
    'DEV', 'FAC', 30,
    NULL,
    '<p>Cordialement,<br><strong>TerraCore Paysage</strong><br>Tél : 04 72 00 11 22<br>contact@terracore-paysage.fr</p>',
    '{"host":"smtp.terracore-paysage.fr","port":587,"secure":false}'
  ) ON CONFLICT DO NOTHING;

  -- ============================================================
  -- EMPLOYEES
  -- ============================================================
  -- Employee 1: admin user mapped
  INSERT INTO employee (
    id, company_id, user_profile_id, first_name, last_name,
    phone, email, color, specialties, hourly_cost, is_active, created_at, updated_at
  ) VALUES (
    v_emp1_id, v_company_id, v_user_id, 'Alexandre', 'Moreau',
    '06 10 22 33 44', 'admin@terracore.test',
    '#2563EB',
    ARRAY['gestion', 'taille', 'plantation'],
    45.00, true, NOW(), NOW()
  ) ON CONFLICT DO NOTHING;

  -- Employee 2
  INSERT INTO employee (
    id, company_id, user_profile_id, first_name, last_name,
    phone, email, color, specialties, hourly_cost, is_active, created_at, updated_at
  ) VALUES (
    v_emp2_id, v_company_id, NULL, 'Camille', 'Dupuis',
    '06 20 33 44 55', 'c.dupuis@terracore-paysage.fr',
    '#16A34A',
    ARRAY['engazonnement', 'arrosage', 'taille'],
    32.00, true, NOW(), NOW()
  ) ON CONFLICT DO NOTHING;

  -- Employee 3
  INSERT INTO employee (
    id, company_id, user_profile_id, first_name, last_name,
    phone, email, color, specialties, hourly_cost, is_active, created_at, updated_at
  ) VALUES (
    v_emp3_id, v_company_id, NULL, 'Lucas', 'Bernard',
    '06 30 44 55 66', 'l.bernard@terracore-paysage.fr',
    '#DC2626',
    ARRAY['maçonnerie_paysagere', 'terrassement'],
    35.00, true, NOW(), NOW()
  ) ON CONFLICT DO NOTHING;

  -- Employee 4
  INSERT INTO employee (
    id, company_id, user_profile_id, first_name, last_name,
    phone, email, color, specialties, hourly_cost, is_active, created_at, updated_at
  ) VALUES (
    v_emp4_id, v_company_id, NULL, 'Manon', 'Lefèvre',
    '06 40 55 66 77', 'm.lefevre@terracore-paysage.fr',
    '#9333EA',
    ARRAY['entretien', 'fleurissement'],
    28.00, true, NOW(), NOW()
  ) ON CONFLICT DO NOTHING;

  -- ============================================================
  -- ITEM FAMILIES
  -- ============================================================
  INSERT INTO item_family (id, company_id, name, parent_id, sort_order, created_at)
  VALUES
    (v_family1_id, v_company_id, 'Végétaux & Matériaux', NULL, 1, NOW()),
    (v_family2_id, v_company_id, 'Main d''œuvre', NULL, 2, NOW()),
    (v_family3_id, v_company_id, 'Fournitures & Location', NULL, 3, NOW())
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- ITEMS
  -- ============================================================
  INSERT INTO item (
    id, company_id, reference, label, description,
    item_type, family_id, unit, unit_price_ht, purchase_price_ht,
    vat_rate, is_active, created_at, updated_at
  ) VALUES
    -- Materiaux
    (v_item1_id, v_company_id, 'MAT-001', 'Terre végétale criblée',
     'Terre végétale de qualité, criblée 0/20mm, idéale pour la création de massifs.',
     'materiau', v_family1_id, 'm³', 65.00, 38.00, 20.0, true, NOW(), NOW()),
    (v_item2_id, v_company_id, 'MAT-002', 'Gazon en rouleau (ray-grass)',
     'Gazon prêt à poser en rouleaux, variété ray-grass anglais, largeur 40cm.',
     'materiau', v_family1_id, 'm²', 8.50, 4.20, 20.0, true, NOW(), NOW()),
    (v_item3_id, v_company_id, 'MAT-003', 'Pavés granit gris 10x10x5',
     'Pavés en granit gris, dimensions 10x10x5cm, aspect vieilli.',
     'materiau', v_family1_id, 'm²', 48.00, 28.00, 20.0, true, NOW(), NOW()),
    (v_item4_id, v_company_id, 'MAT-004', 'Gravier de Royan beige 8/16',
     'Gravier calcaire beige, calibre 8/16mm, sac de 25kg.',
     'materiau', v_family1_id, 'tonne', 95.00, 52.00, 20.0, true, NOW(), NOW()),
    (v_item5_id, v_company_id, 'MAT-005', 'Paillage fibres de coco',
     'Paillage naturel en fibres de coco, sac de 50L, décomposition lente.',
     'materiau', v_family1_id, 'sac', 12.50, 6.80, 20.0, true, NOW(), NOW()),
    -- Main d''oeuvre
    (v_item6_id, v_company_id, 'MO-001', 'Heure paysagiste qualifié',
     'Intervention d''un paysagiste qualifié : taille, plantation, entretien.',
     'main_oeuvre', v_family2_id, 'h', 55.00, 35.00, 20.0, true, NOW(), NOW()),
    (v_item7_id, v_company_id, 'MO-002', 'Heure chef de chantier',
     'Intervention chef de chantier, encadrement et travaux spécialisés.',
     'main_oeuvre', v_family2_id, 'h', 68.00, 45.00, 20.0, true, NOW(), NOW()),
    (v_item8_id, v_company_id, 'MO-003', 'Heure terrassier',
     'Terrassement manuel ou mécanisé, nivellement, préparation de sol.',
     'main_oeuvre', v_family2_id, 'h', 62.00, 40.00, 20.0, true, NOW(), NOW()),
    -- Fournitures
    (v_item9_id, v_company_id, 'FOU-001', 'Programmateur arrosage 6 zones',
     'Programmateur électronique 6 zones, compatible WiFi, étanche IP44.',
     'fourniture', v_family3_id, 'unité', 145.00, 78.00, 20.0, true, NOW(), NOW()),
    (v_item10_id, v_company_id, 'FOU-002', 'Location mini-pelle (journée)',
     'Location mini-pelle 1.5T avec conducteur, demi-journée ou journée.',
     'location', v_family3_id, 'jour', 480.00, 280.00, 20.0, true, NOW(), NOW())
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- WORK UNITS
  -- ============================================================
  INSERT INTO work_unit (
    id, company_id, reference, label, description,
    unit, total_price_ht, margin_percent, family_id, is_active, created_at, updated_at
  ) VALUES
    (v_wu1_id, v_company_id, 'OU-001', 'Pose gazon au m²',
     'Fourniture et pose gazon en rouleau, préparation du sol incluse.',
     'm²', 22.00, 35.0, v_family1_id, true, NOW(), NOW()),
    (v_wu2_id, v_company_id, 'OU-002', 'Création massif fleuri',
     'Délimitation, apport terre végétale, plantation massif, paillage.',
     'm²', 85.00, 40.0, v_family1_id, true, NOW(), NOW())
  ON CONFLICT DO NOTHING;

  INSERT INTO work_unit_line (id, work_unit_id, item_id, quantity, sort_order) VALUES
    (v_wul1_id, v_wu1_id, v_item2_id, 1.0, 1),
    (v_wul2_id, v_wu1_id, v_item6_id, 0.5, 2),
    (v_wul3_id, v_wu2_id, v_item1_id, 0.15, 1)
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- SITE ADDRESSES
  -- ============================================================
  INSERT INTO site_address (
    id, client_id, company_id, label, street, city, postal_code, country,
    lat, lng, is_billing_address, notes, created_at
  ) VALUES
    (v_site1_id, v_client1_id, v_company_id,
     'Résidence principale', '14 allée des Chênes', 'Tassin-la-Demi-Lune', '69160', 'France',
     45.7676, 4.7706, false,
     'Portail code 1492. Chien dans le jardin — prévenir avant d''entrer.', NOW()),
    (v_site2_id, v_client2_id, v_company_id,
     'Siège social', '8 rue de la République', 'Villeurbanne', '69100', 'France',
     45.7717, 4.8802, false,
     'Accès par le parking souterrain, badge remis en début de chantier.', NOW()),
    (v_site3_id, v_client3_id, v_company_id,
     'Jardin terrasse', '3 impasse du Moulin', 'Caluire-et-Cuire', '69300', 'France',
     45.7969, 4.8476, false,
     'Terrasse accessible depuis le couloir latéral. Clé chez la gardienne.', NOW())
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- CLIENT CONTACTS
  -- ============================================================
  INSERT INTO client_contact (
    id, client_id, first_name, last_name, email, phone, role_title, is_primary, created_at
  ) VALUES
    (v_contact1_id, v_client1_id, 'Isabelle', 'Rousseau',
     'i.rousseau@email.fr', '06 55 11 22 33', 'Propriétaire', true, NOW()),
    (v_contact2_id, v_client2_id, 'Frédéric', 'Garnier',
     'f.garnier@entreprise-garnier.fr', '04 78 90 11 22', 'Responsable technique', true, NOW()),
    (v_contact3_id, v_client3_id, 'Sophie', 'Lemaire',
     's.lemaire@gmail.com', '06 77 88 99 00', 'Contact principal', true, NOW())
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- QUOTES
  -- ============================================================
  -- Quote 1: accepte
  INSERT INTO quote (
    id, company_id, client_id, site_address_id, reference, status, title, description,
    date_emission, date_validity, total_ht, total_tva, total_ttc,
    discount_percent, discount_amount, notes_public, notes_internal,
    signed_at, signed_by, pdf_url, created_by, created_at, updated_at
  ) VALUES (
    v_quote1_id, v_company_id, v_client1_id, v_site1_id,
    'DEV-2024-001', 'accepte',
    'Création jardin paysager — Résidence Rousseau',
    'Aménagement complet du jardin : engazonnement, création de massifs, pose de pavés et installation arrosage automatique.',
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE - INTERVAL '1 day',
    4850.00, 970.00, 5820.00,
    0, 0,
    'Travaux réalisés selon les règles de l''art. Garantie prise en charge plantes : 1 an.',
    'Client très exigeant sur les finitions. Prévoir équipe soignée.',
    CURRENT_DATE - INTERVAL '25 days',
    'Isabelle Rousseau',
    NULL, v_user_id,
    CURRENT_DATE - INTERVAL '30 days',
    CURRENT_DATE - INTERVAL '25 days'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO quote_line (
    id, quote_id, item_id, label, description, quantity, unit, unit_price_ht, vat_rate, total_ht, sort_order
  ) VALUES
    (v_ql1_1, v_quote1_id, v_item2_id, 'Gazon en rouleau (ray-grass)',
     'Fourniture et pose gazon, préparation sol incluse.', 85, 'm²', 8.50, 20.0, 722.50, 1),
    (v_ql1_2, v_quote1_id, v_item1_id, 'Terre végétale criblée',
     'Apport terre végétale criblée 0/20mm, épaisseur 15cm.', 12, 'm³', 65.00, 20.0, 780.00, 2),
    (v_ql1_3, v_quote1_id, v_item3_id, 'Pavés granit gris 10x10x5',
     'Fourniture et pose pavés granit, allée principale 25m².', 25, 'm²', 48.00, 20.0, 1200.00, 3),
    (v_ql1_4, v_quote1_id, v_item9_id, 'Programmateur arrosage 6 zones',
     'Fourniture et installation programmateur arrosage automatique.', 1, 'unité', 145.00, 20.0, 145.00, 4)
  ON CONFLICT DO NOTHING;

  -- Quote 2: envoye
  INSERT INTO quote (
    id, company_id, client_id, site_address_id, reference, status, title, description,
    date_emission, date_validity, total_ht, total_tva, total_ttc,
    discount_percent, discount_amount, notes_public, notes_internal,
    signed_at, signed_by, pdf_url, created_by, created_at, updated_at
  ) VALUES (
    v_quote2_id, v_company_id, v_client2_id, v_site2_id,
    'DEV-2024-002', 'envoye',
    'Entretien espaces verts — Bureaux Garnier SAS',
    'Contrat d''entretien annuel : taille haies, tonte pelouse, désherbage massifs, fleurissement saisonnier.',
    CURRENT_DATE - INTERVAL '10 days',
    CURRENT_DATE + INTERVAL '20 days',
    2340.00, 468.00, 2808.00,
    5, 117.00,
    'Contrat renouvelable chaque année. Fréquence : bimensuelle d''avril à octobre, mensuelle en hiver.',
    'Client pro, rappeler si pas de retour sous 10 jours.',
    NULL, NULL, NULL, v_user_id,
    CURRENT_DATE - INTERVAL '10 days',
    CURRENT_DATE - INTERVAL '10 days'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO quote_line (
    id, quote_id, item_id, label, description, quantity, unit, unit_price_ht, vat_rate, total_ht, sort_order
  ) VALUES
    (v_ql2_1, v_quote2_id, v_item6_id, 'Heure paysagiste qualifié',
     'Entretien courant espaces verts (tonte, taille, désherbage).', 24, 'h', 55.00, 20.0, 1320.00, 1),
    (v_ql2_2, v_quote2_id, v_item5_id, 'Paillage fibres de coco',
     'Renouvellement paillage massifs, 2 fois par an.', 20, 'sac', 12.50, 20.0, 250.00, 2),
    (v_ql2_3, v_quote2_id, v_item7_id, 'Heure chef de chantier',
     'Encadrement et taille arbustes spéciaux.', 8, 'h', 68.00, 20.0, 544.00, 3)
  ON CONFLICT DO NOTHING;

  -- Quote 3: brouillon
  INSERT INTO quote (
    id, company_id, client_id, site_address_id, reference, status, title, description,
    date_emission, date_validity, total_ht, total_tva, total_ttc,
    discount_percent, discount_amount, notes_public, notes_internal,
    signed_at, signed_by, pdf_url, created_by, created_at, updated_at
  ) VALUES (
    v_quote3_id, v_company_id, v_client3_id, v_site3_id,
    'DEV-2024-003', 'brouillon',
    'Rénovation terrasse et jardin — Caluire',
    'Terrassement, pose dallage, création massifs méditerranéens, engazonnement partiel.',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '30 days',
    7620.00, 1524.00, 9144.00,
    0, 0,
    'Devis en cours de finalisation. Les essences végétales seront précisées lors de la visite.',
    'En attente du plan de la terrasse transmis par le client.',
    NULL, NULL, NULL, v_user_id,
    CURRENT_DATE,
    CURRENT_DATE
  ) ON CONFLICT DO NOTHING;

  INSERT INTO quote_line (
    id, quote_id, item_id, label, description, quantity, unit, unit_price_ht, vat_rate, total_ht, sort_order
  ) VALUES
    (v_ql3_1, v_quote3_id, v_item8_id, 'Heure terrassier',
     'Terrassement et préparation fond de forme (50m²).', 16, 'h', 62.00, 20.0, 992.00, 1),
    (v_ql3_2, v_quote3_id, v_item10_id, 'Location mini-pelle (journée)',
     'Location mini-pelle pour terrassement.', 2, 'jour', 480.00, 20.0, 960.00, 2),
    (v_ql3_3, v_quote3_id, v_item3_id, 'Pavés granit gris 10x10x5',
     'Dallage terrasse principale 45m².', 45, 'm²', 48.00, 20.0, 2160.00, 3),
    (v_ql3_4, v_quote3_id, v_item1_id, 'Terre végétale criblée',
     'Apport terre végétale massifs et pelouse.', 18, 'm³', 65.00, 20.0, 1170.00, 4),
    (v_ql3_5, v_quote3_id, v_item6_id, 'Heure paysagiste qualifié',
     'Plantation massifs méditerranéens et engazonnement.', 32, 'h', 55.00, 20.0, 1760.00, 5)
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- INVOICES
  -- ============================================================
  -- Invoice 1: payee (linked to quote 1)
  INSERT INTO invoice (
    id, company_id, client_id, quote_id, reference, status, invoice_type, title,
    date_emission, date_due, total_ht, total_tva, total_ttc,
    amount_paid, remaining_due, notes_public, notes_internal,
    pdf_url, created_by, created_at, updated_at
  ) VALUES (
    v_inv1_id, v_company_id, v_client1_id, v_quote1_id,
    'FAC-2024-001', 'payee', 'facture',
    'Facture — Création jardin paysager Rousseau',
    CURRENT_DATE - INTERVAL '20 days',
    CURRENT_DATE - INTERVAL '5 days',
    4850.00, 970.00, 5820.00,
    5820.00, 0.00,
    'Merci de votre confiance. Règlement par virement dans les 30 jours.',
    'Payée intégralement le ' || TO_CHAR(CURRENT_DATE - INTERVAL '7 days', 'DD/MM/YYYY') || '. RAS.',
    NULL, v_user_id,
    CURRENT_DATE - INTERVAL '20 days',
    CURRENT_DATE - INTERVAL '7 days'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO invoice_line (
    id, invoice_id, item_id, label, description, quantity, unit, unit_price_ht, vat_rate, total_ht, sort_order
  ) VALUES
    (v_il1_1, v_inv1_id, v_item2_id, 'Gazon en rouleau (ray-grass)',
     'Fourniture et pose gazon, préparation sol incluse.', 85, 'm²', 8.50, 20.0, 722.50, 1),
    (v_il1_2, v_inv1_id, v_item3_id, 'Pavés granit gris 10x10x5',
     'Fourniture et pose pavés granit, allée principale.', 25, 'm²', 48.00, 20.0, 1200.00, 2),
    (v_il1_3, v_inv1_id, v_item9_id, 'Programmateur arrosage 6 zones',
     'Fourniture et installation complète.', 1, 'unité', 145.00, 20.0, 145.00, 3)
  ON CONFLICT DO NOTHING;

  -- Invoice 2: envoyee
  INSERT INTO invoice (
    id, company_id, client_id, quote_id, reference, status, invoice_type, title,
    date_emission, date_due, total_ht, total_tva, total_ttc,
    amount_paid, remaining_due, notes_public, notes_internal,
    pdf_url, created_by, created_at, updated_at
  ) VALUES (
    v_inv2_id, v_company_id, v_client2_id, v_quote2_id,
    'FAC-2024-002', 'envoyee', 'facture',
    'Facture — Entretien espaces verts Garnier SAS T1',
    CURRENT_DATE - INTERVAL '5 days',
    CURRENT_DATE + INTERVAL '25 days',
    2223.00, 444.60, 2667.60,
    0.00, 2667.60,
    'Règlement attendu par virement bancaire sous 30 jours. IBAN : FR76 3000 4028 1900 0108 3620 145.',
    'Premier trimestre contrat. Suivi OK.',
    NULL, v_user_id,
    CURRENT_DATE - INTERVAL '5 days',
    CURRENT_DATE - INTERVAL '5 days'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO invoice_line (
    id, invoice_id, item_id, label, description, quantity, unit, unit_price_ht, vat_rate, total_ht, sort_order
  ) VALUES
    (v_il2_1, v_inv2_id, v_item6_id, 'Heure paysagiste qualifié',
     'Entretien courant T1 2024.', 24, 'h', 55.00, 20.0, 1320.00, 1),
    (v_il2_2, v_inv2_id, v_item5_id, 'Paillage fibres de coco',
     'Renouvellement paillage massifs.', 20, 'sac', 12.50, 20.0, 250.00, 2),
    (v_il2_3, v_inv2_id, v_item7_id, 'Heure chef de chantier',
     'Taille arbustes spéciaux.', 8, 'h', 68.00, 20.0, 544.00, 3)
  ON CONFLICT DO NOTHING;

  -- Invoice 3: en_retard (overdue)
  INSERT INTO invoice (
    id, company_id, client_id, quote_id, reference, status, invoice_type, title,
    date_emission, date_due, total_ht, total_tva, total_ttc,
    amount_paid, remaining_due, notes_public, notes_internal,
    pdf_url, created_by, created_at, updated_at
  ) VALUES (
    v_inv3_id, v_company_id, v_client3_id, NULL,
    'FAC-2024-003', 'en_retard', 'facture',
    'Facture — Entretien annuel Lemaire 2023',
    CURRENT_DATE - INTERVAL '65 days',
    CURRENT_DATE - INTERVAL '35 days',
    1450.00, 290.00, 1740.00,
    600.00, 1140.00,
    'Solde restant dû : 1 140,00 € TTC. Merci de régulariser votre situation.',
    'Acompte reçu 600€. Relance envoyée x2. Envisager mise en demeure si pas de retour sous 15j.',
    NULL, v_user_id,
    CURRENT_DATE - INTERVAL '65 days',
    CURRENT_DATE - INTERVAL '10 days'
  ) ON CONFLICT DO NOTHING;

  INSERT INTO invoice_line (
    id, invoice_id, item_id, label, description, quantity, unit, unit_price_ht, vat_rate, total_ht, sort_order
  ) VALUES
    (v_il3_1, v_inv3_id, v_item6_id, 'Heure paysagiste qualifié',
     'Entretien annuel jardin Lemaire.', 20, 'h', 55.00, 20.0, 1100.00, 1),
    (v_il3_2, v_inv3_id, v_item4_id, 'Gravier de Royan beige 8/16',
     'Fourniture et épandage gravier allée.', 3.5, 'tonne', 95.00, 20.0, 332.50, 2)
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- PAYMENTS
  -- ============================================================
  INSERT INTO payment (
    id, company_id, invoice_id, amount, payment_method,
    reference, payment_date, notes, created_by, created_at
  ) VALUES
    (v_pay1_id, v_company_id, v_inv1_id, 5820.00, 'virement',
     'VIR-20240312-001',
     CURRENT_DATE - INTERVAL '7 days',
     'Virement reçu — règlement intégral facture FAC-2024-001.',
     v_user_id, CURRENT_DATE - INTERVAL '7 days'),
    (v_pay2_id, v_company_id, v_inv3_id, 600.00, 'cheque',
     'CHQ-001892',
     CURRENT_DATE - INTERVAL '40 days',
     'Acompte chèque reçu de Mme Lemaire. À encaisser.',
     v_user_id, CURRENT_DATE - INTERVAL '40 days'),
    (v_pay3_id, v_company_id, v_inv2_id, 0.00, 'virement',
     NULL,
     NULL,
     'En attente de réception virement Garnier SAS.',
     v_user_id, CURRENT_DATE)
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- SCHEDULE EVENTS (this week)
  -- ============================================================
  -- Event 1: Chantier Monday
  INSERT INTO schedule_event (
    id, company_id, event_type, title, description,
    start_datetime, end_datetime, all_day, color,
    quote_id, client_id, site_address_id, created_by, created_at, updated_at
  ) VALUES (
    v_evt1_id, v_company_id, 'chantier',
    'Chantier création jardin — Rousseau',
    'Pose gazon rouleaux, plantation massifs. Équipe : Camille + Lucas.',
    date_trunc('week', CURRENT_DATE) + INTERVAL '7 hours',
    date_trunc('week', CURRENT_DATE) + INTERVAL '16 hours',
    false, '#16A34A',
    v_quote1_id, v_client1_id, v_site1_id,
    v_user_id, NOW(), NOW()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO schedule_event_employee (id, schedule_event_id, employee_id)
  VALUES
    (gen_random_uuid(), v_evt1_id, v_emp2_id),
    (gen_random_uuid(), v_evt1_id, v_emp3_id)
  ON CONFLICT DO NOTHING;

  -- Event 2: RDV client Tuesday
  INSERT INTO schedule_event (
    id, company_id, event_type, title, description,
    start_datetime, end_datetime, all_day, color,
    quote_id, client_id, site_address_id, created_by, created_at, updated_at
  ) VALUES (
    v_evt2_id, v_company_id, 'rdv_client',
    'Visite technique — Lemaire (terrasse Caluire)',
    'Visite pour finaliser le devis DEV-2024-003. Mesures terrasse et choix dalles.',
    date_trunc('week', CURRENT_DATE) + INTERVAL '1 day 10 hours',
    date_trunc('week', CURRENT_DATE) + INTERVAL '1 day 12 hours',
    false, '#2563EB',
    v_quote3_id, v_client3_id, v_site3_id,
    v_user_id, NOW(), NOW()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO schedule_event_employee (id, schedule_event_id, employee_id)
  VALUES (gen_random_uuid(), v_evt2_id, v_emp1_id)
  ON CONFLICT DO NOTHING;

  -- Event 3: Réunion Wednesday
  INSERT INTO schedule_event (
    id, company_id, event_type, title, description,
    start_datetime, end_datetime, all_day, color,
    quote_id, client_id, site_address_id, created_by, created_at, updated_at
  ) VALUES (
    v_evt3_id, v_company_id, 'reunion',
    'Réunion hebdomadaire équipe',
    'Bilan chantiers en cours, planning semaine suivante, points sécurité.',
    date_trunc('week', CURRENT_DATE) + INTERVAL '2 days 8 hours',
    date_trunc('week', CURRENT_DATE) + INTERVAL '2 days 9 hours',
    false, '#9333EA',
    NULL, NULL, NULL,
    v_user_id, NOW(), NOW()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO schedule_event_employee (id, schedule_event_id, employee_id)
  VALUES
    (gen_random_uuid(), v_evt3_id, v_emp1_id),
    (gen_random_uuid(), v_evt3_id, v_emp2_id),
    (gen_random_uuid(), v_evt3_id, v_emp3_id),
    (gen_random_uuid(), v_evt3_id, v_emp4_id)
  ON CONFLICT DO NOTHING;

  -- Event 4: Chantier Thursday
  INSERT INTO schedule_event (
    id, company_id, event_type, title, description,
    start_datetime, end_datetime, all_day, color,
    quote_id, client_id, site_address_id, created_by, created_at, updated_at
  ) VALUES (
    v_evt4_id, v_company_id, 'chantier',
    'Entretien espaces verts — Garnier SAS',
    'Tonte pelouse, taille haies de thuyas, désherbage massifs.',
    date_trunc('week', CURRENT_DATE) + INTERVAL '3 days 7 hours 30 minutes',
    date_trunc('week', CURRENT_DATE) + INTERVAL '3 days 14 hours',
    false, '#16A34A',
    v_quote2_id, v_client2_id, v_site2_id,
    v_user_id, NOW(), NOW()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO schedule_event_employee (id, schedule_event_id, employee_id)
  VALUES
    (gen_random_uuid(), v_evt4_id, v_emp2_id),
    (gen_random_uuid(), v_evt4_id, v_emp4_id)
  ON CONFLICT DO NOTHING;

  -- Event 5: Congé Friday (Manon)
  INSERT INTO schedule_event (
    id, company_id, event_type, title, description,
    start_datetime, end_datetime, all_day, color,
    quote_id, client_id, site_address_id, created_by, created_at, updated_at
  ) VALUES (
    v_evt5_id, v_company_id, 'conge',
    'Congé — Manon Lefèvre',
    'Congé annuel posé. Journée complète.',
    date_trunc('week', CURRENT_DATE) + INTERVAL '4 days',
    date_trunc('week', CURRENT_DATE) + INTERVAL '4 days 23 hours 59 minutes',
    true, '#F59E0B',
    NULL, NULL, NULL,
    v_user_id, NOW(), NOW()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO schedule_event_employee (id, schedule_event_id, employee_id)
  VALUES (gen_random_uuid(), v_evt5_id, v_emp4_id)
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- WEATHER SNAPSHOTS
  -- ============================================================
  INSERT INTO weather_snapshot (
    id, company_id, date, location, temperature, humidity,
    wind_speed, conditions, severity, rain_probability, data_json, created_at
  ) VALUES
    (v_wx1_id, v_company_id, CURRENT_DATE, 'Lyon, Auvergne-Rhône-Alpes',
     19.5, 58, 15, 'Partiellement nuageux', 'acceptable', 20,
     '{"uv_index":4,"pressure":1013,"sunrise":"06:28","sunset":"20:45"}',
     NOW()),
    (v_wx2_id, v_company_id, CURRENT_DATE + INTERVAL '1 day', 'Lyon, Auvergne-Rhône-Alpes',
     16.2, 78, 32, 'Averses modérées', 'defavorable', 75,
     '{"uv_index":2,"pressure":1005,"sunrise":"06:29","sunset":"20:44","alert":"Vigilance jaune pluie"}',
     NOW()),
    (v_wx3_id, v_company_id, CURRENT_DATE + INTERVAL '2 days', 'Lyon, Auvergne-Rhône-Alpes',
     22.0, 50, 10, 'Ensoleillé', 'favorable', 5,
     '{"uv_index":6,"pressure":1018,"sunrise":"06:30","sunset":"20:43"}',
     NOW())
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- AI AGENT RUNS & PROPOSALS
  -- ============================================================
  INSERT INTO ai_agent_run (
    id, company_id, agent_type, status, input_data, output_data,
    started_at, completed_at, error_message, tokens_used
  ) VALUES
    (v_ai_run1_id, v_company_id, 'meteo_replan', 'completed',
     '{"event_ids":["' || v_evt4_id::text || '"],"forecast_date":"' || TO_CHAR(CURRENT_DATE + INTERVAL '1 day', 'YYYY-MM-DD') || '","severity":"defavorable"}'::jsonb,
     '{"recommendation":"Reporter le chantier Garnier du jeudi au vendredi matin (8h-14h) — météo favorable et Manon disponible en remplacement.","confidence":0.87}'::jsonb,
     NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours' + INTERVAL '8 seconds',
     NULL, 412),
    (v_ai_run2_id, v_company_id, 'relance_auto', 'completed',
     '{"invoice_id":"' || v_inv3_id::text || '","days_overdue":35,"amount_due":1140.00}'::jsonb,
     '{"suggested_level":"relance_2","channel":"email","tone":"ferme","subject":"RAPPEL URGENT — Facture FAC-2024-003 en souffrance"}'::jsonb,
     NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '5 seconds',
     NULL, 287)
  ON CONFLICT DO NOTHING;

  INSERT INTO ai_proposal (
    id, company_id, agent_run_id, entity_type, entity_id,
    title, description, action_type, action_data,
    is_accepted, accepted_by, accepted_at, dismissed_at, expires_at, created_at
  ) VALUES
    (v_ai_prop1_id, v_company_id, v_ai_run1_id, 'schedule_event', v_evt4_id::text,
     'Reporter le chantier Garnier (météo défavorable demain)',
     'Les prévisions météo indiquent des averses modérées demain (probabilité 75%). Il est recommandé de reporter le chantier d''entretien Garnier SAS au vendredi, conditions favorables prévues.',
     'reschedule',
     '{"original_start":"' || TO_CHAR(date_trunc('week', CURRENT_DATE) + INTERVAL '3 days 7 hours 30 minutes', 'YYYY-MM-DD"T"HH24:MI:SS') || '","suggested_start":"' || TO_CHAR(date_trunc('week', CURRENT_DATE) + INTERVAL '4 days 8 hours', 'YYYY-MM-DD"T"HH24:MI:SS') || '"}'::jsonb,
     true, v_user_id,
     NOW() - INTERVAL '1 hour 30 minutes',
     NULL,
     NOW() + INTERVAL '2 days',
     NOW() - INTERVAL '2 hours'),
    (v_ai_prop2_id, v_company_id, v_ai_run2_id, 'invoice', v_inv3_id::text,
     'Envoyer relance niveau 2 — FAC-2024-003 (35j de retard)',
     'La facture FAC-2024-003 (1 140,00 € restant dû) accuse 35 jours de retard. Une deuxième relance ferme par email est recommandée avant d''envisager une mise en demeure.',
     'send_reminder',
     '{"level":"relance_2","channel":"email","recipient":"s.lemaire@gmail.com","subject":"RAPPEL URGENT — Facture FAC-2024-003 en souffrance"}'::jsonb,
     false, NULL, NULL, NULL,
     NOW() + INTERVAL '5 days',
     NOW() - INTERVAL '1 day')
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- REMINDER WORKFLOW
  -- ============================================================
  INSERT INTO reminder_workflow (
    id, company_id, invoice_id, current_level, next_send_at,
    is_active, last_sent_at, created_at, updated_at
  ) VALUES (
    v_rw1_id, v_company_id, v_inv3_id, 'relance_1',
    NOW() + INTERVAL '2 days',
    true,
    CURRENT_DATE - INTERVAL '10 days',
    CURRENT_DATE - INTERVAL '20 days',
    NOW()
  ) ON CONFLICT DO NOTHING;

  INSERT INTO reminder_message (
    id, workflow_id, level, channel, subject, body,
    sent_at, status, error_message, created_at
  ) VALUES (
    v_rm1_id, v_rw1_id, 'relance_1', 'email',
    'Rappel — Facture FAC-2024-003 en attente de règlement',
    'Madame Lemaire,\n\nNous nous permettons de vous rappeler que la facture FAC-2024-003 d''un montant de 1 740,00 € TTC, dont 1 140,00 € TTC restent à régler, était échue au ' || TO_CHAR(CURRENT_DATE - INTERVAL '35 days', 'DD/MM/YYYY') || '.\n\nNous vous remercions de bien vouloir procéder au règlement dans les meilleurs délais.\n\nCordialement,\nTerraCore Paysage',
    CURRENT_DATE - INTERVAL '10 days',
    'sent', NULL,
    CURRENT_DATE - INTERVAL '10 days'
  ) ON CONFLICT DO NOTHING;

  -- ============================================================
  -- DELIVERY NOTE
  -- ============================================================
  INSERT INTO delivery_note (
    id, company_id, client_id, quote_id, reference,
    date_emission, site_address_id, notes, status,
    delivered_by, pdf_url, created_at, updated_at
  ) VALUES (
    v_dn1_id, v_company_id, v_client1_id, v_quote1_id,
    'BL-2024-001',
    CURRENT_DATE - INTERVAL '22 days',
    v_site1_id,
    'Livraison terre végétale (12m³) et gazon rouleaux (85m²). Réceptionné et signé par Mme Rousseau.',
    'bon_livraison',
    'Lucas Bernard',
    NULL,
    CURRENT_DATE - INTERVAL '22 days',
    CURRENT_DATE - INTERVAL '22 days'
  ) ON CONFLICT DO NOTHING;

  -- ============================================================
  -- AUDIT LOG
  -- ============================================================
  INSERT INTO audit_log (
    id, company_id, user_id, action, entity_type, entity_id,
    old_data, new_data, ip_address, created_at
  ) VALUES
    (gen_random_uuid(), v_company_id, v_user_id,
     'CREATE', 'quote', v_quote1_id::text,
     NULL,
     '{"reference":"DEV-2024-001","status":"brouillon","total_ttc":5820.00}'::jsonb,
     '192.168.1.10',
     CURRENT_DATE - INTERVAL '30 days'),
    (gen_random_uuid(), v_company_id, v_user_id,
     'UPDATE', 'quote', v_quote1_id::text,
     '{"status":"brouillon"}'::jsonb,
     '{"status":"accepte","signed_at":"' || TO_CHAR(CURRENT_DATE - INTERVAL '25 days', 'YYYY-MM-DD') || '","signed_by":"Isabelle Rousseau"}'::jsonb,
     '192.168.1.10',
     CURRENT_DATE - INTERVAL '25 days'),
    (gen_random_uuid(), v_company_id, v_user_id,
     'CREATE', 'invoice', v_inv1_id::text,
     NULL,
     '{"reference":"FAC-2024-001","status":"envoyee","total_ttc":5820.00}'::jsonb,
     '192.168.1.10',
     CURRENT_DATE - INTERVAL '20 days'),
    (gen_random_uuid(), v_company_id, v_user_id,
     'UPDATE', 'invoice', v_inv1_id::text,
     '{"status":"envoyee","amount_paid":0}'::jsonb,
     '{"status":"payee","amount_paid":5820.00,"remaining_due":0}'::jsonb,
     '192.168.1.10',
     CURRENT_DATE - INTERVAL '7 days'),
    (gen_random_uuid(), v_company_id, v_user_id,
     'CREATE', 'quote', v_quote3_id::text,
     NULL,
     '{"reference":"DEV-2024-003","status":"brouillon","total_ttc":9144.00}'::jsonb,
     '192.168.1.10',
     CURRENT_DATE)
  ON CONFLICT DO NOTHING;

  -- ============================================================
  -- NOTIFICATIONS
  -- ============================================================
  INSERT INTO notification (
    id, company_id, user_id, title, body, type,
    entity_type, entity_id, is_read, created_at
  ) VALUES
    (v_notif1_id, v_company_id, v_user_id,
     'Devis accepté — DEV-2024-001',
     'Isabelle Rousseau a accepté et signé le devis DEV-2024-001 (5 820,00 € TTC).',
     'success',
     'quote', v_quote1_id::text, true,
     CURRENT_DATE - INTERVAL '25 days'),
    (v_notif2_id, v_company_id, v_user_id,
     'Facture en retard — FAC-2024-003',
     'La facture FAC-2024-003 (1 140,00 € TTC restants) est en retard de 35 jours. Une action est requise.',
     'warning',
     'invoice', v_inv3_id::text, false,
     CURRENT_DATE - INTERVAL '5 days'),
    (v_notif3_id, v_company_id, v_user_id,
     'Alerte météo — Chantier Garnier à reporter',
     'Des averses sont prévues demain. L''IA suggère de reporter le chantier Garnier SAS au vendredi.',
     'info',
     'schedule_event', v_evt4_id::text, false,
     NOW() - INTERVAL '2 hours')
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Seed data inserted successfully for company_id: %', v_company_id;

END $$;