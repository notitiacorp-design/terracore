'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn, formatCurrency } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Search,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Check,
  User,
  MapPin,
  FileText,
  Package,
  AlertCircle,
  Loader2,
  X,
  GripVertical
} from 'lucide-react';
import type {
  ClientRow,
  SiteAddressRow,
  ItemRow,
  WorkUnitRow,
  QuoteInsert,
  QuoteLineInsert
} from '@/types/database';

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuoteLine {
  id: string;
  item_id: string | null;
  work_unit_id: string | null;
  label: string;
  description: string;
  quantity: number;
  unit: string;
  unit_price_ht: number;
  vat_rate: number;
  total_ht: number;
  sort_order: number;
}

interface NewClientForm {
  first_name: string;
  last_name: string;
  company_name: string;
  email: string;
  phone: string;
  client_type: 'particulier' | 'pro';
}

interface NewAddressForm {
  label: string;
  street: string;
  city: string;
  postal_code: string;
}

type Step = 1 | 2 | 3 | 4;

// ─── Step indicators ──────────────────────────────────────────────────────────

const STEPS = [
  { id: 1, label: 'Client', icon: User },
  { id: 2, label: 'Chantier', icon: MapPin },
  { id: 3, label: 'Lignes', icon: Package },
  { id: 4, label: 'Récap', icon: FileText },
];

// ─── Utils ────────────────────────────────────────────────────────────────────

function generateId() {
  return Math.random().toString(36).slice(2, 11);
}

function calcLineTotalHT(qty: number, price: number) {
  return Math.round(qty * price * 100) / 100;
}

function getMarginColor(margin: number) {
  if (margin >= 25) return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20';
  if (margin >= 15) return 'text-orange-500 bg-orange-500/10 border-orange-500/20';
  return 'text-red-500 bg-red-500/10 border-red-500/20';
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function NouveauDevisPage() {
  const router = useRouter();
  const supabase = createClient();

  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1 — Client
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [showNewClientForm, setShowNewClientForm] = useState(false);
  const [newClientForm, setNewClientForm] = useState<NewClientForm>({
    first_name: '',
    last_name: '',
    company_name: '',
    email: '',
    phone: '',
    client_type: 'particulier',
  });
  const [creatingClient, setCreatingClient] = useState(false);

  // Step 2 — Chantier
  const [siteAddresses, setSiteAddresses] = useState<SiteAddressRow[]>([]);
  const [selectedSiteAddress, setSelectedSiteAddress] = useState<SiteAddressRow | null>(null);
  const [showNewAddressForm, setShowNewAddressForm] = useState(false);
  const [newAddressForm, setNewAddressForm] = useState<NewAddressForm>({
    label: '',
    street: '',
    city: '',
    postal_code: '',
  });
  const [creatingAddress, setCreatingAddress] = useState(false);
  const [dateEmission, setDateEmission] = useState(() => new Date().toISOString().slice(0, 10));
  const [dateValidite, setDateValidite] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });
  const [objectField, setObjectField] = useState('');
  const [introduction, setIntroduction] = useState('');
  const [conditions, setConditions] = useState('');

  // Step 3 — Lines
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogItems, setCatalogItems] = useState<ItemRow[]>([]);
  const [catalogWorkUnits, setCatalogWorkUnits] = useState<WorkUnitRow[]>([]);
  const [searchingCatalog, setSearchingCatalog] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);

  // ─── Load clients on search ────────────────────────────────────────────────

  useEffect(() => {
    const fetchClients = async () => {
      if (clientSearch.length < 2) {
        setClients([]);
        return;
      }
      const { data } = await supabase
        .from('client')
        .select('*')
        .or(
          `first_name.ilike.%${clientSearch}%,last_name.ilike.%${clientSearch}%,company_name.ilike.%${clientSearch}%,email.ilike.%${clientSearch}%`
        )
        .eq('is_active', true)
        .limit(10);
      if (data) setClients(data);
    };
    fetchClients();
  }, [clientSearch]);

  // ─── Load site addresses when client selected ──────────────────────────────

  useEffect(() => {
    if (!selectedClient) {
      setSiteAddresses([]);
      setSelectedSiteAddress(null);
      return;
    }
    const fetchAddresses = async () => {
      const { data } = await supabase
        .from('site_address')
        .select('*')
        .eq('client_id', selectedClient.id)
        .order('is_billing_address', { ascending: false });
      if (data) setSiteAddresses(data);
    };
    fetchAddresses();
  }, [selectedClient]);

  // ─── Search catalogue ──────────────────────────────────────────────────────

  useEffect(() => {
    if (catalogSearch.length < 2) {
      setCatalogItems([]);
      setCatalogWorkUnits([]);
      return;
    }
    const search = async () => {
      setSearchingCatalog(true);
      const [itemsRes, wuRes] = await Promise.all([
        supabase
          .from('item')
          .select('*')
          .ilike('label', `%${catalogSearch}%`)
          .eq('is_active', true)
          .limit(8),
        supabase
          .from('work_unit')
          .select('*')
          .ilike('label', `%${catalogSearch}%`)
          .eq('is_active', true)
          .limit(8),
      ]);
      if (itemsRes.data) setCatalogItems(itemsRes.data);
      if (wuRes.data) setCatalogWorkUnits(wuRes.data);
      setSearchingCatalog(false);
    };
    search();
  }, [catalogSearch]);

  // ─── Calculations ──────────────────────────────────────────────────────────

  const totals = {
    total_ht: lines.reduce((sum, l) => sum + l.total_ht, 0),
    total_tva: lines.reduce((sum, l) => sum + l.total_ht * (l.vat_rate / 100), 0),
    get total_ttc() {
      return this.total_ht + this.total_tva;
    },
  };

  const marginPercent =
    totals.total_ht > 0
      ? Math.max(0, ((totals.total_ht - totals.total_ht * 0.7) / totals.total_ht) * 100)
      : 0;

  // ─── Client display name ───────────────────────────────────────────────────

  function clientDisplayName(c: ClientRow) {
    if (c.client_type === 'pro' && c.company_name) return c.company_name;
    return `${c.first_name ?? ''} ${c.last_name ?? ''}`.trim();
  }

  // ─── Create new client ─────────────────────────────────────────────────────

  const handleCreateClient = async () => {
    setCreatingClient(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const { data: profile } = await supabase
        .from('user_profile')
        .select('company_id')
        .eq('id', session.user.id)
        .single();

      if (!profile) throw new Error('Profil introuvable');

      const { data, error: err } = await supabase
        .from('client')
        .insert({
          company_id: profile.company_id,
          client_type: newClientForm.client_type,
          first_name: newClientForm.first_name || null,
          last_name: newClientForm.last_name || null,
          company_name: newClientForm.company_name || null,
          email: newClientForm.email || null,
          phone: newClientForm.phone || null,
          is_active: true,
        })
        .select()
        .single();

      if (err) throw err;
      if (data) {
        setSelectedClient(data);
        setShowNewClientForm(false);
        setNewClientForm({ first_name: '', last_name: '', company_name: '', email: '', phone: '', client_type: 'particulier' });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la création du client');
    } finally {
      setCreatingClient(false);
    }
  };

  // ─── Create new address ────────────────────────────────────────────────────

  const handleCreateAddress = async () => {
    if (!selectedClient) return;
    setCreatingAddress(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const { data: profile } = await supabase
        .from('user_profile')
        .select('company_id')
        .eq('id', session.user.id)
        .single();

      if (!profile) throw new Error('Profil introuvable');

      const { data, error: err } = await supabase
        .from('site_address')
        .insert({
          company_id: profile.company_id,
          client_id: selectedClient.id,
          label: newAddressForm.label || 'Adresse chantier',
          street: newAddressForm.street,
          city: newAddressForm.city,
          postal_code: newAddressForm.postal_code,
          country: 'France',
          is_billing_address: false,
        })
        .select()
        .single();

      if (err) throw err;
      if (data) {
        setSiteAddresses(prev => [...prev, data]);
        setSelectedSiteAddress(data);
        setShowNewAddressForm(false);
        setNewAddressForm({ label: '', street: '', city: '', postal_code: '' });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erreur lors de la création de l'adresse");
    } finally {
      setCreatingAddress(false);
    }
  };

  // ─── Add item to lines ─────────────────────────────────────────────────────

  const addItemLine = (item: ItemRow) => {
    const newLine: QuoteLine = {
      id: generateId(),
      item_id: item.id,
      work_unit_id: null,
      label: item.label,
      description: item.description ?? '',
      quantity: 1,
      unit: item.unit ?? 'u',
      unit_price_ht: item.unit_price_ht ?? 0,
      vat_rate: item.vat_rate ?? 20,
      total_ht: item.unit_price_ht ?? 0,
      sort_order: lines.length,
    };
    setLines(prev => [...prev, newLine]);
    setShowCatalog(false);
    setCatalogSearch('');
  };

  const addWorkUnitLine = (wu: WorkUnitRow) => {
    const newLine: QuoteLine = {
      id: generateId(),
      item_id: null,
      work_unit_id: wu.id,
      label: wu.label,
      description: wu.description ?? '',
      quantity: 1,
      unit: wu.unit ?? 'u',
      unit_price_ht: wu.total_price_ht ?? 0,
      vat_rate: 20,
      total_ht: wu.total_price_ht ?? 0,
      sort_order: lines.length,
    };
    setLines(prev => [...prev, newLine]);
    setShowCatalog(false);
    setCatalogSearch('');
  };

  const addBlankLine = () => {
    const newLine: QuoteLine = {
      id: generateId(),
      item_id: null,
      work_unit_id: null,
      label: '',
      description: '',
      quantity: 1,
      unit: 'u',
      unit_price_ht: 0,
      vat_rate: 20,
      total_ht: 0,
      sort_order: lines.length,
    };
    setLines(prev => [...prev, newLine]);
  };

  const updateLine = (id: string, field: keyof QuoteLine, value: string | number) => {
    setLines(prev =>
      prev.map(l => {
        if (l.id !== id) return l;
        const updated = { ...l, [field]: value };
        if (field === 'quantity' || field === 'unit_price_ht') {
          updated.total_ht = calcLineTotalHT(updated.quantity, updated.unit_price_ht);
        }
        return updated;
      })
    );
  };

  const removeLine = (id: string) => {
    setLines(prev => prev.filter(l => l.id !== id));
  };

  // ─── Step validation ───────────────────────────────────────────────────────

  const canProceedStep1 = selectedClient !== null;
  const canProceedStep2 = objectField.trim().length > 0;
  const canProceedStep3 = lines.length > 0;

  // ─── Save quote ────────────────────────────────────────────────────────────

  const handleSave = async (status: 'brouillon' | 'envoye') => {
    if (!selectedClient) return;
    setSaving(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Non authentifié');

      const { data: profile } = await supabase
        .from('user_profile')
        .select('company_id')
        .eq('id', session.user.id)
        .single();

      if (!profile) throw new Error('Profil introuvable');

      const quoteInsert: QuoteInsert = {
        company_id: profile.company_id,
        client_id: selectedClient.id,
        site_address_id: selectedSiteAddress?.id ?? null,
        created_by: session.user.id,
        status: status,
        title: objectField,
        description: introduction || null,
        notes_public: conditions || null,
        date_emission: dateEmission,
        date_validity: dateValidite,
        total_ht: totals.total_ht,
        total_tva: totals.total_tva,
        total_ttc: totals.total_ttc,
        discount_amount: null,
        discount_percent: null,
      };

      const { data: quote, error: quoteErr } = await supabase
        .from('quote')
        .insert(quoteInsert)
        .select()
        .single();

      if (quoteErr) throw quoteErr;
      if (!quote) throw new Error('Devis non créé');

      const quoteLines: QuoteLineInsert[] = lines.map((l, idx) => ({
        quote_id: quote.id,
        item_id: l.item_id,
        work_unit_id: l.work_unit_id,
        label: l.label,
        description: l.description || null,
        quantity: l.quantity,
        unit: l.unit,
        unit_price_ht: l.unit_price_ht,
        vat_rate: l.vat_rate,
        total_ht: l.total_ht,
        sort_order: idx,
        is_section: false,
        discount_percent: null,
        section_title: null,
        parent_line_id: null,
      }));

      const { error: linesErr } = await supabase
        .from('quote_line')
        .insert(quoteLines);

      if (linesErr) throw linesErr;

      router.push(`/dashboard/documents/devis/${quote.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  // ─── Render helpers ────────────────────────────────────────────────────────

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const isActive = currentStep === step.id;
        const isDone = currentStep > step.id;
        return (
          <div key={step.id} className="flex items-center">
            <div
              className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all',
                isActive && 'bg-primary text-primary-foreground',
                isDone && 'bg-emerald-500/20 text-emerald-500',
                !isActive && !isDone && 'text-muted-foreground'
              )}
            >
              {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              <span className="hidden sm:inline">{step.label}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <ChevronRight className="w-4 h-4 text-muted-foreground mx-1" />
            )}
          </div>
        );
      })}
    </div>
  );

  // ─── Step 1: Client ────────────────────────────────────────────────────────

  const renderStep1 = () => (
    <div className="space-y-6">
      <CardHeader className="px-0 pt-0">
        <CardTitle>Sélectionner un client</CardTitle>
      </CardHeader>

      {selectedClient ? (
        <div className="flex items-center justify-between p-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
          <div>
            <p className="font-medium">{clientDisplayName(selectedClient)}</p>
            {selectedClient.email && (
              <p className="text-sm text-muted-foreground">{selectedClient.email}</p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSelectedClient(null)}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un client (nom, email...)"
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {clients.length > 0 && (
            <div className="border rounded-lg divide-y">
              {clients.map(c => (
                <button
                  key={c.id}
                  className="w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors"
                  onClick={() => {
                    setSelectedClient(c);
                    setClientSearch('');
                    setClients([]);
                  }}
                >
                  <p className="font-medium text-sm">{clientDisplayName(c)}</p>
                  {c.email && <p className="text-xs text-muted-foreground">{c.email}</p>}
                </button>
              ))}
            </div>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={() => setShowNewClientForm(v => !v)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nouveau client
          </Button>

          {showNewClientForm && (
            <Card className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Prénom</Label>
                  <Input
                    value={newClientForm.first_name}
                    onChange={e => setNewClientForm(f => ({ ...f, first_name: e.target.value }))}
                  />
                </div>
                <div>
                  <Label>Nom</Label>
                  <Input
                    value={newClientForm.last_name}
                    onChange={e => setNewClientForm(f => ({ ...f, last_name: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <Label>Société</Label>
                <Input
                  value={newClientForm.company_name}
                  onChange={e => setNewClientForm(f => ({ ...f, company_name: e.target.value }))}
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={newClientForm.email}
                  onChange={e => setNewClientForm(f => ({ ...f, email: e.target.value }))}
                />
              </div>
              <div>
                <Label>Téléphone</Label>
                <Input
                  value={newClientForm.phone}
                  onChange={e => setNewClientForm(f => ({ ...f, phone: e.target.value }))}
                />
              </div>
              <div>
                <Label>Type</Label>
                <Select
                  value={newClientForm.client_type}
                  onValueChange={v => setNewClientForm(f => ({ ...f, client_type: v as 'particulier' | 'pro' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="particulier">Particulier</SelectItem>
                    <SelectItem value="pro">Professionnel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateClient} disabled={creatingClient} className="w-full">
                {creatingClient && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Créer le client
              </Button>
            </Card>
          )}
        </div>
      )}
    </div>
  );

  // ─── Step 2: Chantier ──────────────────────────────────────────────────────

  const renderStep2 = () => (
    <div className="space-y-6">
      <CardHeader className="px-0 pt-0">
        <CardTitle>Informations du devis</CardTitle>
      </CardHeader>

      <div className="space-y-4">
        <div>
          <Label>Objet du devis *</Label>
          <Input
            value={objectField}
            onChange={e => setObjectField(e.target.value)}
            placeholder="Ex: Rénovation salle de bain"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Date d&apos;émission</Label>
            <Input
              type="date"
              value={dateEmission}
              onChange={e => setDateEmission(e.target.value)}
            />
          </div>
          <div>
            <Label>Date de validité</Label>
            <Input
              type="date"
              value={dateValidite}
              onChange={e => setDateValidite(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label>Introduction</Label>
          <Textarea
            value={introduction}
            onChange={e => setIntroduction(e.target.value)}
            placeholder="Message d'introduction..."
            rows={3}
          />
        </div>

        <Separator />

        <div>
          <Label className="mb-2 block">Adresse de chantier</Label>
          {selectedSiteAddress ? (
            <div className="flex items-center justify-between p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5">
              <div>
                <p className="font-medium text-sm">{selectedSiteAddress.label}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedSiteAddress.street}, {selectedSiteAddress.postal_code} {selectedSiteAddress.city}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedSiteAddress(null)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {siteAddresses.map(addr => (
                <button
                  key={addr.id}
                  className="w-full text-left px-3 py-2 rounded-lg border hover:bg-muted/50 transition-colors"
                  onClick={() => setSelectedSiteAddress(addr)}
                >
                  <p className="font-medium text-sm">{addr.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {addr.street}, {addr.postal_code} {addr.city}
                  </p>
                </button>
              ))}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowNewAddressForm(v => !v)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle adresse
              </Button>

              {showNewAddressForm && (
                <Card className="p-4 space-y-3">
                  <div>
                    <Label>Libellé</Label>
                    <Input
                      value={newAddressForm.label}
                      onChange={e => setNewAddressForm(f => ({ ...f, label: e.target.value }))}
                      placeholder="Ex: Chantier principal"
                    />
                  </div>
                  <div>
                    <Label>Rue</Label>
                    <Input
                      value={newAddressForm.street}
                      onChange={e => setNewAddressForm(f => ({ ...f, street: e.target.value }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label>Code postal</Label>
                      <Input
                        value={newAddressForm.postal_code}
                        onChange={e => setNewAddressForm(f => ({ ...f, postal_code: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label>Ville</Label>
                      <Input
                        value={newAddressForm.city}
                        onChange={e => setNewAddressForm(f => ({ ...f, city: e.target.value }))}
                      />
                    </div>
                  </div>
                  <Button onClick={handleCreateAddress} disabled={creatingAddress} className="w-full">
                    {creatingAddress && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Créer l&apos;adresse
                  </Button>
                </Card>
              )}
            </div>
          )}
        </div>

        <div>
          <Label>Conditions</Label>
          <Textarea
            value={conditions}
            onChange={e => setConditions(e.target.value)}
            placeholder="Conditions générales, modalités de paiement..."
            rows={3}
          />
        </div>
      </div>
    </div>
  );

  // ─── Step 3: Lines ─────────────────────────────────────────────────────────

  const renderStep3 = () => (
    <div className="space-y-6">
      <CardHeader className="px-0 pt-0">
        <CardTitle>Lignes du devis</CardTitle>
      </CardHeader>

      {/* Catalog search */}
      <div className="relative">
        <Button
          variant="outline"
          className="w-full justify-start text-muted-foreground"
          onClick={() => setShowCatalog(v => !v)}
        >
          <Search className="w-4 h-4 mr-2" />
          Rechercher dans le catalogue...
        </Button>

        {showCatalog && (
          <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-background border rounded-lg shadow-xl p-3 space-y-2">
            <Input
              autoFocus
              placeholder="Nom de l'article ou unité d'oeuvre..."
              value={catalogSearch}
              onChange={e => setCatalogSearch(e.target.value)}
            />
            {searchingCatalog && (
              <div className="flex justify-center py-4">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            )}
            {catalogItems.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-1">Articles</p>
                {catalogItems.map(item => (
                  <button
                    key={item.id}
                    className="w-full text-left px-3 py-2 rounded hover:bg-muted/50 flex items-center justify-between"
                    onClick={() => addItemLine(item)}
                  >
                    <span className="text-sm font-medium">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{formatCurrency(item.unit_price_ht ?? 0)} / {item.unit}</span>
                  </button>
                ))}
              </div>
            )}
            {catalogWorkUnits.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1 mb-1">Unités d&apos;oeuvre</p>
                {catalogWorkUnits.map(wu => (
                  <button
                    key={wu.id}
                    className="w-full text-left px-3 py-2 rounded hover:bg-muted/50 flex items-center justify-between"
                    onClick={() => addWorkUnitLine(wu)}
                  >
                    <span className="text-sm font-medium">{wu.label}</span>
                    <span className="text-xs text-muted-foreground">{formatCurrency(wu.total_price_ht ?? 0)} / {wu.unit}</span>
                  </button>
                ))}
              </div>
            )}
            {catalogSearch.length >= 2 && !searchingCatalog && catalogItems.length === 0 && catalogWorkUnits.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-3">Aucun résultat</p>
            )}
          </div>
        )}
      </div>

      {/* Lines */}
      <div className="space-y-2">
        {lines.map((line, idx) => (
          <Card key={line.id} className="p-3">
            <div className="flex items-start gap-2">
              <GripVertical className="w-4 h-4 text-muted-foreground mt-2 shrink-0" />
              <div className="flex-1 grid grid-cols-12 gap-2">
                <div className="col-span-12 sm:col-span-5">
                  <Input
                    placeholder="Désignation"
                    value={line.label}
                    onChange={e => updateLine(line.id, 'label', e.target.value)}
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Input
                    type="number"
                    placeholder="Qté"
                    value={line.quantity}
                    onChange={e => updateLine(line.id, 'quantity', Number(e.target.value))}
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <Input
                    type="number"
                    placeholder="P.U. HT"
                    value={line.unit_price_ht}
                    onChange={e => updateLine(line.id, 'unit_price_ht', Number(e.target.value))}
                  />
                </div>
                <div className="col-span-4 sm:col-span-1">
                  <Input
                    type="number"
                    placeholder="TVA%"
                    value={line.vat_rate}
                    onChange={e => updateLine(line.id, 'vat_rate', Number(e.target.value))}
                  />
                </div>
                <div className="col-span-12 sm:col-span-2 flex items-center justify-between">
                  <span className="text-sm font-medium">{formatCurrency(line.total_ht)}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => removeLine(line.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Button variant="outline" className="w-full" onClick={addBlankLine}>
        <Plus className="w-4 h-4 mr-2" />
        Ajouter une ligne
      </Button>

      {/* Totals */}
      {lines.length > 0 && (
        <div className="rounded-lg border p-4 space-y-2 bg-muted/20">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total HT</span>
            <span className="font-medium">{formatCurrency(totals.total_ht)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">TVA</span>
            <span className="font-medium">{formatCurrency(totals.total_tva)}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="font-semibold">Total TTC</span>
            <span className="font-bold text-lg">{formatCurrency(totals.total_ttc)}</span>
          </div>
        </div>
      )}
    </div>
  );

  // ─── Step 4: Recap ─────────────────────────────────────────────────────────

  const renderStep4 = () => (
    <div className="space-y-6">
      <CardHeader className="px-0 pt-0">
        <CardTitle>Récapitulatif</CardTitle>
      </CardHeader>

      <div className="space-y-4">
        <Card className="p-4">
          <h3 className="font-semibold mb-2 text-sm">Client</h3>
          <p className="text-sm">{selectedClient ? clientDisplayName(selectedClient) : '—'}</p>
          {selectedClient?.email && <p className="text-xs text-muted-foreground">{selectedClient.email}</p>}
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-2 text-sm">Chantier</h3>
          {selectedSiteAddress ? (
            <>
              <p className="text-sm">{selectedSiteAddress.label}</p>
              <p className="text-xs text-muted-foreground">
                {selectedSiteAddress.street}, {selectedSiteAddress.postal_code} {selectedSiteAddress.city}
              </p>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Non spécifié</p>
          )}
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-2 text-sm">Devis</h3>
          <p className="text-sm font-medium">{objectField}</p>
          <p className="text-xs text-muted-foreground">Émis le {dateEmission} · Valide jusqu&apos;au {dateValidite}</p>
        </Card>

        <Card className="p-4">
          <h3 className="font-semibold mb-2 text-sm">{lines.length} ligne(s)</h3>
          <div className="space-y-1">
            {lines.map(l => (
              <div key={l.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground truncate max-w-[60%]">{l.label || '(sans titre)'}</span>
                <span>{formatCurrency(l.total_ht)}</span>
              </div>
            ))}
          </div>
        </Card>

        <div className="rounded-lg border p-4 space-y-2 bg-muted/20">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Total HT</span>
            <span className="font-medium">{formatCurrency(totals.total_ht)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">TVA</span>
            <span className="font-medium">{formatCurrency(totals.total_tva)}</span>
          </div>
          <Separator />
          <div className="flex justify-between">
            <span className="font-semibold">Total TTC</span>
            <span className="font-bold text-lg">{formatCurrency(totals.total_ttc)}</span>
          </div>
          {totals.total_ht > 0 && (
            <div className="flex justify-between items-center pt-1">
              <span className="text-xs text-muted-foreground">Marge estimée</span>
              <Badge variant="outline" className={cn('text-xs', getMarginColor(marginPercent))}>
                {marginPercent.toFixed(1)}%
              </Badge>
            </div>
          )}
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => handleSave('brouillon')}
            disabled={saving}
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Enregistrer en brouillon
          </Button>
          <Button
            className="flex-1"
            onClick={() => handleSave('envoye')}
            disabled={saving}
          >
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Créer et envoyer
          </Button>
        </div>
      </div>
    </div>
  );

  // ─── Nav buttons ───────────────────────────────────────────────────────────

  const canGoNext =
    (currentStep === 1 && canProceedStep1) ||
    (currentStep === 2 && canProceedStep2) ||
    (currentStep === 3 && canProceedStep3) ||
    currentStep === 4;

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="max-w-2xl mx-auto p-4 pb-16">
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/documents/devis')}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          Retour
        </Button>
        <h1 className="text-xl font-bold">Nouveau devis</h1>
      </div>

      {renderStepIndicator()}

      {error && currentStep !== 4 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive text-sm mb-4">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
        </CardContent>
      </Card>

      {currentStep < 4 && (
        <div className="flex justify-between mt-4">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(s => Math.max(1, s - 1) as Step)}
            disabled={currentStep === 1}
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            Précédent
          </Button>
          <Button
            onClick={() => setCurrentStep(s => Math.min(4, s + 1) as Step)}
            disabled={!canGoNext}
          >
            Suivant
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      )}
    </div>
  );
}
