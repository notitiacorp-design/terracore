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
  tva_rate: number;
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
  address: string;
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
    address: '',
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
          .ilike('name', `%${catalogSearch}%`)
          .eq('is_active', true)
          .limit(8),
        supabase
          .from('work_unit')
          .select('*')
          .ilike('name', `%${catalogSearch}%`)
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
    total_tva: lines.reduce((sum, l) => sum + l.total_ht * (l.tva_rate / 100), 0),
    get total_ttc() {
      return this.total_ht + this.total_tva;
    },
  };

  // Margin: rough estimate using 30% cost assumption if no purchase price context
  const marginPercent =
    totals.total_ttc > 0
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
        .eq('auth_user_id', session.user.id)
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
          sap_eligible: false,
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
      const { data, error: err } = await supabase
        .from('site_address')
        .insert({
          client_id: selectedClient.id,
          label: newAddressForm.label || 'Adresse chantier',
          address: newAddressForm.address,
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
        setNewAddressForm({ label: '', address: '', city: '', postal_code: '' });
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la création de l\'adresse');
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
      label: item.name,
      description: item.description ?? '',
      quantity: 1,
      unit: item.unit ?? 'u',
      unit_price_ht: item.selling_price_ht ?? 0,
      tva_rate: item.tva_rate ?? 20,
      total_ht: item.selling_price_ht ?? 0,
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
      label: wu.name,
      description: wu.description ?? '',
      quantity: 1,
      unit: wu.unit ?? 'u',
      unit_price_ht: wu.selling_price_ht ?? 0,
      tva_rate: wu.tva_rate ?? 20,
      total_ht: wu.selling_price_ht ?? 0,
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
      tva_rate: 20,
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
          updated.total_ht = calcLineTotalHT(
            field === 'quantity' ? Number(value) : l.quantity,
            field === 'unit_price_ht' ? Number(value) : l.unit_price_ht
          );
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
        .eq('auth_user_id', session.user.id)
        .single();

      if (!profile) throw new Error('Profil introuvable');

      // Generate reference
      const year = new Date().getFullYear();
      const { count } = await supabase
        .from('quote')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', profile.company_id);

      const refNumber = String((count ?? 0) + 1).padStart(4, '0');
      const reference = `DEV-${year}-${refNumber}`;

      const quoteInsert = {
        company_id: profile.company_id,
        client_id: selectedClient.id,
        reference,
        date_emission: dateEmission,
        date_validite: dateValidite,
        object: objectField,
        introduction: introduction || null,
        conditions: conditions || null,
        total_ht: Math.round(totals.total_ht * 100) / 100,
        total_tva: Math.round(totals.total_tva * 100) / 100,
        total_ttc: Math.round(totals.total_ttc * 100) / 100,
        margin_percent: Math.round(marginPercent * 100) / 100,
        status,
        notes: null,
        sap_eligible: selectedClient.sap_eligible ?? false,
        created_by: session.user.id,
      };

      const { data: quote, error: quoteErr } = await supabase
        .from('quote')
        .insert(quoteInsert)
        .select()
        .single();

      if (quoteErr) throw quoteErr;
      if (!quote) throw new Error('Erreur lors de la création du devis');

      // Insert lines
      const linesInsert = lines.map((l, idx) => ({
        quote_id: quote.id,
        item_id: l.item_id,
        work_unit_id: l.work_unit_id,
        label: l.label,
        description: l.description || null,
        quantity: l.quantity,
        unit: l.unit,
        unit_price_ht: l.unit_price_ht,
        tva_rate: l.tva_rate,
        total_ht: l.total_ht,
        sort_order: idx,
      }));

      const { error: linesErr } = await supabase.from('quote_line').insert(linesInsert);
      if (linesErr) throw linesErr;

      router.push(`/dashboard/documents/devis/${quote.id}`);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Une erreur est survenue');
      setSaving(false);
    }
  };

  // ─── Step indicator component ──────────────────────────────────────────────

  const StepIndicator = () => (
    <div className="flex items-center justify-between mb-6 px-1">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const isActive = currentStep === step.id;
        const isDone = currentStep > step.id;
        return (
          <div key={step.id} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all',
                  isActive && 'bg-[#10b981] border-[#10b981] text-white',
                  isDone && 'bg-[#10b981]/20 border-[#10b981] text-[#10b981]',
                  !isActive && !isDone && 'bg-white/5 border-white/20 text-white/40'
                )}
              >
                {isDone ? <Check className="w-5 h-5" /> : <Icon className="w-5 h-5" />}
              </div>
              <span
                className={cn(
                  'text-xs mt-1 font-medium',
                  isActive && 'text-[#10b981]',
                  isDone && 'text-[#10b981]/70',
                  !isActive && !isDone && 'text-white/30'
                )}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-0.5 mx-2 mb-4 transition-all',
                  currentStep > step.id ? 'bg-[#10b981]' : 'bg-white/10'
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );

  // ─── Render Steps ──────────────────────────────────────────────────────────

  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Sélectionner un client</h2>
        <p className="text-sm text-white/50">Recherchez un client existant ou créez-en un nouveau</p>
      </div>

      {/* Selected client display */}
      {selectedClient && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-[#10b981]/10 border border-[#10b981]/30">
          <div>
            <p className="font-medium text-white">{clientDisplayName(selectedClient)}</p>
            <p className="text-sm text-white/50">{selectedClient.email}</p>
            {selectedClient.phone && <p className="text-sm text-white/50">{selectedClient.phone}</p>}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setSelectedClient(null); setClientSearch(''); }}
            className="text-white/40 hover:text-white min-h-[48px] min-w-[48px]"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      {!selectedClient && !showNewClientForm && (
        <>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/30 min-h-[48px]"
              placeholder="Nom, email ou entreprise..."
              value={clientSearch}
              onChange={e => setClientSearch(e.target.value)}
            />
          </div>

          {clients.length > 0 && (
            <div className="rounded-lg border border-white/10 overflow-hidden">
              {clients.map(client => (
                <button
                  key={client.id}
                  onClick={() => { setSelectedClient(client); setClientSearch(''); setClients([]); }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0 min-h-[60px]"
                >
                  <div className="w-9 h-9 rounded-full bg-[#10b981]/20 flex items-center justify-center flex-shrink-0">
                    <User className="w-4 h-4 text-[#10b981]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{clientDisplayName(client)}</p>
                    <p className="text-sm text-white/50 truncate">{client.email}</p>
                  </div>
                  <Badge variant="outline" className="text-xs border-white/20 text-white/50 flex-shrink-0">
                    {client.client_type === 'pro' ? 'Pro' : 'Particulier'}
                  </Badge>
                </button>
              ))}
            </div>
          )}

          {clientSearch.length >= 2 && clients.length === 0 && (
            <p className="text-sm text-white/40 text-center py-2">Aucun client trouvé</p>
          )}

          <Button
            variant="outline"
            onClick={() => setShowNewClientForm(true)}
            className="w-full border-dashed border-white/20 text-white/60 hover:text-white hover:border-white/40 min-h-[48px]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Créer un nouveau client
          </Button>
        </>
      )}

      {showNewClientForm && (
        <Card className="bg-white/5 border-white/10">
          <CardHeader className="pb-3">
            <CardTitle className="text-white text-base">Nouveau client</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-white/70 text-sm">Type</Label>
              <Select
                value={newClientForm.client_type}
                onValueChange={v => setNewClientForm(p => ({ ...p, client_type: v as 'particulier' | 'pro' }))}
              >
                <SelectTrigger className="bg-white/5 border-white/20 text-white min-h-[48px] mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a1a2e] border-white/20">
                  <SelectItem value="particulier" className="text-white">Particulier</SelectItem>
                  <SelectItem value="pro" className="text-white">Professionnel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {newClientForm.client_type === 'pro' && (
              <div>
                <Label className="text-white/70 text-sm">Nom de l&apos;entreprise</Label>
                <Input
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/30 min-h-[48px] mt-1"
                  placeholder="Entreprise SARL"
                  value={newClientForm.company_name}
                  onChange={e => setNewClientForm(p => ({ ...p, company_name: e.target.value }))}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-white/70 text-sm">Prénom</Label>
                <Input
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/30 min-h-[48px] mt-1"
                  placeholder="Jean"
                  value={newClientForm.first_name}
                  onChange={e => setNewClientForm(p => ({ ...p, first_name: e.target.value }))}
                />
              </div>
              <div>
                <Label className="text-white/70 text-sm">Nom</Label>
                <Input
                  className="bg-white/5 border-white/20 text-white placeholder:text-white/30 min-h-[48px] mt-1"
                  placeholder="Dupont"
                  value={newClientForm.last_name}
                  onChange={e => setNewClientForm(p => ({ ...p, last_name: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label className="text-white/70 text-sm">Email</Label>
              <Input
                type="email"
                className="bg-white/5 border-white/20 text-white placeholder:text-white/30 min-h-[48px] mt-1"
                placeholder="jean.dupont@email.fr"
                value={newClientForm.email}
                onChange={e => setNewClientForm(p => ({ ...p, email: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-white/70 text-sm">Téléphone</Label>
              <Input
                type="tel"
                className="bg-white/5 border-white/20 text-white placeholder:text-white/30 min-h-[48px] mt-1"
                placeholder="06 00 00 00 00"
                value={newClientForm.phone}
                onChange={e => setNewClientForm(p => ({ ...p, phone: e.target.value }))}
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setShowNewClientForm(false)}
                className="flex-1 border-white/20 text-white/70 hover:text-white min-h-[48px]"
                disabled={creatingClient}
              >
                Annuler
              </Button>
              <Button
                onClick={handleCreateClient}
                disabled={creatingClient || (!newClientForm.first_name && !newClientForm.last_name && !newClientForm.company_name)}
                className="flex-1 bg-[#10b981] hover:bg-[#10b981]/90 text-white min-h-[48px]"
              >
                {creatingClient ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Créer'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Détails du chantier</h2>
        <p className="text-sm text-white/50">Renseignez les informations du chantier</p>
      </div>

      {/* Object */}
      <div>
        <Label className="text-white/70 text-sm">Objet du devis *</Label>
        <Input
          className="bg-white/5 border-white/20 text-white placeholder:text-white/30 min-h-[48px] mt-1"
          placeholder="Ex: Aménagement jardin, Tonte pelouse..."
          value={objectField}
          onChange={e => setObjectField(e.target.value)}
        />
      </div>

      {/* Dates */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-white/70 text-sm">Date d&apos;émission</Label>
          <Input
            type="date"
            className="bg-white/5 border-white/20 text-white min-h-[48px] mt-1"
            value={dateEmission}
            onChange={e => setDateEmission(e.target.value)}
          />
        </div>
        <div>
          <Label className="text-white/70 text-sm">Date de validité</Label>
          <Input
            type="date"
            className="bg-white/5 border-white/20 text-white min-h-[48px] mt-1"
            value={dateValidite}
            onChange={e => setDateValidite(e.target.value)}
          />
        </div>
      </div>

      {/* Site address */}
      <div>
        <Label className="text-white/70 text-sm">Adresse du chantier</Label>
        <div className="mt-1 space-y-2">
          {siteAddresses.map(addr => (
            <button
              key={addr.id}
              onClick={() => setSelectedSiteAddress(addr)}
              className={cn(
                'w-full flex items-start gap-3 p-3 rounded-lg border transition-all text-left min-h-[60px]',
                selectedSiteAddress?.id === addr.id
                  ? 'border-[#10b981] bg-[#10b981]/10'
                  : 'border-white/10 bg-white/5 hover:border-white/30'
              )}
            >
              <MapPin className={cn('w-4 h-4 mt-0.5 flex-shrink-0', selectedSiteAddress?.id === addr.id ? 'text-[#10b981]' : 'text-white/40')} />
              <div>
                <p className="font-medium text-white text-sm">{addr.label}</p>
                <p className="text-xs text-white/50">{addr.address}, {addr.city} {addr.postal_code}</p>
              </div>
              {selectedSiteAddress?.id === addr.id && <Check className="w-4 h-4 text-[#10b981] ml-auto flex-shrink-0" />}
            </button>
          ))}

          {!showNewAddressForm && (
            <Button
              variant="outline"
              onClick={() => setShowNewAddressForm(true)}
              className="w-full border-dashed border-white/20 text-white/60 hover:text-white min-h-[48px]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une adresse
            </Button>
          )}

          {showNewAddressForm && (
            <Card className="bg-white/5 border-white/10">
              <CardContent className="pt-4 space-y-3">
                <div>
                  <Label className="text-white/70 text-sm">Libellé</Label>
                  <Input
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/30 min-h-[48px] mt-1"
                    placeholder="Jardin principal"
                    value={newAddressForm.label}
                    onChange={e => setNewAddressForm(p => ({ ...p, label: e.target.value }))}
                  />
                </div>
                <div>
                  <Label className="text-white/70 text-sm">Adresse</Label>
                  <Input
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/30 min-h-[48px] mt-1"
                    placeholder="12 rue des Lilas"
                    value={newAddressForm.address}
                    onChange={e => setNewAddressForm(p => ({ ...p, address: e.target.value }))}
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-white/70 text-sm">Code postal</Label>
                    <Input
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/30 min-h-[48px] mt-1"
                      placeholder="75001"
                      value={newAddressForm.postal_code}
                      onChange={e => setNewAddressForm(p => ({ ...p, postal_code: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label className="text-white/70 text-sm">Ville</Label>
                    <Input
                      className="bg-white/5 border-white/20 text-white placeholder:text-white/30 min-h-[48px] mt-1"
                      placeholder="Paris"
                      value={newAddressForm.city}
                      onChange={e => setNewAddressForm(p => ({ ...p, city: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setShowNewAddressForm(false)}
                    className="flex-1 border-white/20 text-white/70 min-h-[48px]"
                    disabled={creatingAddress}
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleCreateAddress}
                    disabled={creatingAddress || !newAddressForm.address}
                    className="flex-1 bg-[#10b981] hover:bg-[#10b981]/90 text-white min-h-[48px]"
                  >
                    {creatingAddress ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Ajouter'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Introduction */}
      <div>
        <Label className="text-white/70 text-sm">Introduction (optionnel)</Label>
        <Textarea
          className="bg-white/5 border-white/20 text-white placeholder:text-white/30 mt-1 resize-none"
          placeholder="Faisant suite à notre visite..."
          rows={3}
          value={introduction}
          onChange={e => setIntroduction(e.target.value)}
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Lignes de devis</h2>
        <p className="text-sm text-white/50">{lines.length} ligne{lines.length > 1 ? 's' : ''}</p>
      </div>

      {/* Lines list */}
      <div className="space-y-3">
        {lines.map((line, idx) => (
          <Card key={line.id} className="bg-white/5 border-white/10">
            <CardContent className="pt-3 pb-3 space-y-3">
              <div className="flex items-start gap-2">
                <GripVertical className="w-4 h-4 text-white/20 mt-3 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="flex gap-2">
                    <Input
                      className="flex-1 bg-white/5 border-white/20 text-white placeholder:text-white/30 min-h-[48px] text-sm"
                      placeholder="Libellé de la prestation"
                      value={line.label}
                      onChange={e => updateLine(line.id, 'label', e.target.value)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeLine(line.id)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10 min-h-[48px] min-w-[48px] px-3"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <Input
                    className="bg-white/5 border-white/20 text-white placeholder:text-white/30 min-h-[44px] text-sm"
                    placeholder="Description (optionnel)"
                    value={line.description}
                    onChange={e => updateLine(line.id, 'description', e.target.value)}
                  />

                  <div className="grid grid-cols-4 gap-2">
                    <div>
                      <Label className="text-white/40 text-xs">Qté</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="bg-white/5 border-white/20 text-white min-h-[44px] text-sm mt-0.5"
                        value={line.quantity}
                        onChange={e => updateLine(line.id, 'quantity', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label className="text-white/40 text-xs">Unité</Label>
                      <Input
                        className="bg-white/5 border-white/20 text-white min-h-[44px] text-sm mt-0.5"
                        value={line.unit}
                        onChange={e => updateLine(line.id, 'unit', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-white/40 text-xs">PU HT</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="bg-white/5 border-white/20 text-white min-h-[44px] text-sm mt-0.5"
                        value={line.unit_price_ht}
                        onChange={e => updateLine(line.id, 'unit_price_ht', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    <div>
                      <Label className="text-white/40 text-xs">TVA %</Label>
                      <Select
                        value={String(line.tva_rate)}
                        onValueChange={v => updateLine(line.id, 'tva_rate', parseFloat(v))}
                      >
                        <SelectTrigger className="bg-white/5 border-white/20 text-white min-h-[44px] text-sm mt-0.5">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#1a1a2e] border-white/20">
                          <SelectItem value="0" className="text-white">0%</SelectItem>
                          <SelectItem value="5.5" className="text-white">5,5%</SelectItem>
                          <SelectItem value="10" className="text-white">10%</SelectItem>
                          <SelectItem value="20" className="text-white">20%</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <span className="text-sm font-semibold text-[#10b981]">
                      Total HT : {formatCurrency(line.total_ht)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Catalogue search */}
      <div className="space-y-2">
        {showCatalog ? (
          <Card className="bg-white/5 border-white/10">
            <CardContent className="pt-3 pb-3 space-y-3">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                  <Input
                    className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-white/30 min-h-[48px]"
                    placeholder="Rechercher dans le catalogue..."
                    value={catalogSearch}
                    onChange={e => setCatalogSearch(e.target.value)}
                    autoFocus
                  />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setShowCatalog(false); setCatalogSearch(''); }}
                  className="text-white/40 hover:text-white min-h-[48px] min-w-[48px]"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>

              {searchingCatalog && (
                <div className="flex justify-center py-3">
                  <Loader2 className="w-5 h-5 animate-spin text-[#10b981]" />
                </div>
              )}

              {catalogWorkUnits.length > 0 && (
                <div>
                  <p className="text-xs text-white/40 mb-1 px-1">Unités d&apos;œuvre</p>
                  {catalogWorkUnits.map(wu => (
                    <button
                      key={wu.id}
                      onClick={() => addWorkUnitLine(wu)}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-white/10 transition-colors text-left min-h-[52px]"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{wu.name}</p>
                        <p className="text-xs text-white/40">{wu.unit}</p>
                      </div>
                      <span className="text-sm text-[#10b981] font-medium">{formatCurrency(wu.selling_price_ht ?? 0)}</span>
                    </button>
                  ))}
                </div>
              )}

              {catalogItems.length > 0 && (
                <div>
                  <p className="text-xs text-white/40 mb-1 px-1">Articles</p>
                  {catalogItems.map(item => (
                    <button
                      key={item.id}
                      onClick={() => addItemLine(item)}
                      className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-white/10 transition-colors text-left min-h-[52px]"
                    >
                      <div>
                        <p className="text-sm font-medium text-white">{item.name}</p>
                        <p className="text-xs text-white/40">{item.unit} · {item.item_type}</p>
                      </div>
                      <span className="text-sm text-[#10b981] font-medium">{formatCurrency(item.selling_price_ht ?? 0)}</span>
                    </button>
                  ))}
                </div>
              )}

              {catalogSearch.length >= 2 && !searchingCatalog && catalogItems.length === 0 && catalogWorkUnits.length === 0 && (
                <p className="text-sm text-white/40 text-center py-2">Aucun résultat</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCatalog(true)}
              className="flex-1 border-dashed border-white/20 text-white/60 hover:text-white min-h-[48px]"
            >
              <Search className="w-4 h-4 mr-2" />
              Ajouter depuis le catalogue
            </Button>
            <Button
              variant="outline"
              onClick={addBlankLine}
              className="border-dashed border-white/20 text-white/60 hover:text-white min-h-[48px] min-w-[48px] px-3"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Running totals */}
      {lines.length > 0 && (
        <Card className="bg-[#10b981]/5 border-[#10b981]/20">
          <CardContent className="pt-4 pb-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Total HT</span>
              <span className="text-white font-medium">{formatCurrency(totals.total_ht)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-white/60">Total TVA</span>
              <span className="text-white">{formatCurrency(totals.total_tva)}</span>
            </div>
            <Separator className="bg-white/10" />
            <div className="flex justify-between">
              <span className="text-white font-semibold">Total TTC</span>
              <span className="text-[#10b981] font-bold text-lg">{formatCurrency(totals.total_ttc)}</span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold text-white mb-1">Récapitulatif</h2>
        <p className="text-sm text-white/50">Vérifiez les informations avant d&apos;enregistrer</p>
      </div>

      {/* Client recap */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm text-white/60 font-medium flex items-center gap-2">
            <User className="w-4 h-4" /> Client
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4">
          {selectedClient && (
            <div>
              <p className="font-semibold text-white">{clientDisplayName(selectedClient)}</p>
              {selectedClient.email && <p className="text-sm text-white/60">{selectedClient.email}</p>}
              {selectedClient.phone && <p className="text-sm text-white/60">{selectedClient.phone}</p>}
              {selectedClient.sap_eligible && (
                <Badge className="mt-2 bg-blue-500/20 text-blue-400 border-blue-400/30 text-xs">
                  Éligible SAP
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Chantier recap */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm text-white/60 font-medium flex items-center gap-2">
            <MapPin className="w-4 h-4" /> Chantier
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4 space-y-1">
          <p className="font-semibold text-white">{objectField}</p>
          <p className="text-sm text-white/60">Émission : {dateEmission} · Validité : {dateValidite}</p>
          {selectedSiteAddress && (
            <p className="text-sm text-white/60">
              {selectedSiteAddress.address}, {selectedSiteAddress.city} {selectedSiteAddress.postal_code}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Lines recap */}
      <Card className="bg-white/5 border-white/10">
        <CardHeader className="pb-2 pt-4">
          <CardTitle className="text-sm text-white/60 font-medium flex items-center gap-2">
            <Package className="w-4 h-4" /> {lines.length} ligne{lines.length > 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-4 space-y-2">
          {lines.map(line => (
            <div key={line.id} className="flex justify-between items-start py-1 border-b border-white/5 last:border-0">
              <div className="flex-1 min-w-0 pr-4">
                <p className="text-sm text-white truncate">{line.label || '—'}</p>
                <p className="text-xs text-white/40">{line.quantity} {line.unit} × {formatCurrency(line.unit_price_ht)}</p>
              </div>
              <span className="text-sm text-white/80 font-medium flex-shrink-0">{formatCurrency(line.total_ht)}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Totals & margin */}
      <Card className="bg-[#10b981]/5 border-[#10b981]/20">
        <CardContent className="pt-4 pb-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Total HT</span>
            <span className="text-white font-medium">{formatCurrency(totals.total_ht)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-white/60">Total TVA</span>
            <span className="text-white">{formatCurrency(totals.total_tva)}</span>
          </div>
          <Separator className="bg-white/10" />
          <div className="flex justify-between items-center">
            <span className="text-white font-semibold">Total TTC</span>
            <span className="text-[#10b981] font-bold text-xl">{formatCurrency(totals.total_ttc)}</span>
          </div>
          <div className="flex justify-between items-center pt-1">
            <span className="text-sm text-white/60">Marge estimée</span>
            <Badge className={cn('text-xs font-semibold border', getMarginColor(marginPercent))}>
              {Math.round(marginPercent)}%
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* SAP notice */}
      {selectedClient?.sap_eligible && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-blue-400">Client éligible SAP</p>
            <p className="text-xs text-blue-400/70 mt-0.5">
              Ce client bénéficie du crédit d&apos;impôt services à la personne. Pensez à mentionner le numéro d&apos;agrément SAP sur le devis.
            </p>
          </div>
        </div>
      )}

      {/* Conditions */}
      <div>
        <Label className="text-white/70 text-sm">Conditions (optionnel)</Label>
        <Textarea
          className="bg-white/5 border-white/20 text-white placeholder:text-white/30 mt-1 resize-none"
          placeholder="Paiement à 30 jours, acompte de 30%..."
          rows={3}
          value={conditions}
          onChange={e => setConditions(e.target.value)}
        />
      </div>
    </div>
  );

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#1a1a2e] pb-32">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#1a1a2e]/95 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center gap-3 px-4 py-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-white/60 hover:text-white min-h-[48px] min-w-[48px] -ml-2"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-base font-bold text-white">Nouveau devis</h1>
            <p className="text-xs text-white/40">Étape {currentStep} sur 4</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-5 max-w-2xl mx-auto">
        <StepIndicator />

        {/* Error */}
        {error && (
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 mb-4">
            <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-400">{error}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setError(null)}
              className="ml-auto text-red-400 hover:text-red-300 min-h-[32px] min-w-[32px] p-1"
            >
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}

        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
        {currentStep === 4 && renderStep4()}
      </div>

      {/* Bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-[#1a1a2e]/95 backdrop-blur-sm border-t border-white/10 px-4 py-3 safe-area-bottom">
        <div className="max-w-2xl mx-auto">
          {currentStep < 4 ? (
            <div className="flex gap-3">
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(prev => (prev - 1) as Step)}
                  className="flex-1 border-white/20 text-white/70 hover:text-white min-h-[52px]"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Précédent
                </Button>
              )}
              <Button
                onClick={() => setCurrentStep(prev => (prev + 1) as Step)}
                disabled={
                  (currentStep === 1 && !canProceedStep1) ||
                  (currentStep === 2 && !canProceedStep2) ||
                  (currentStep === 3 && !canProceedStep3)
                }
                className="flex-1 bg-[#10b981] hover:bg-[#10b981]/90 text-white min-h-[52px] font-semibold"
              >
                Suivant
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setCurrentStep(3)}
                  className="border-white/20 text-white/70 hover:text-white min-h-[52px] px-4"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleSave('brouillon')}
                  disabled={saving}
                  className="flex-1 border-white/30 text-white hover:bg-white/10 min-h-[52px] font-medium"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Enregistrer brouillon
                </Button>
              </div>
              <Button
                onClick={() => handleSave('envoye')}
                disabled={saving}
                className="w-full bg-[#10b981] hover:bg-[#10b981]/90 text-white min-h-[52px] font-semibold"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                Enregistrer et envoyer
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
