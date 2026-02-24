'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/components/ui/use-toast';
import { Building2, Users, Brain, CreditCard, Bell, BarChart3, Loader2, Save, RefreshCw, Plus, Eye, EyeOff, Copy, Check, AlertCircle, Zap } from 'lucide-react';
import { z } from 'zod';
import type { CompanyRow, CompanySettingsRow, UserProfileRow } from '@/types/database';

type UserRole = 'admin' | 'bureau' | 'terrain' | 'lecture';
type AiAgentType = 'meteo_replan' | 'relance_auto' | 'devis_assist' | 'marge_alert';

const companySchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  siret: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  logo_url: z.string().url('URL invalide').optional().or(z.literal('')),
  iban: z.string().optional(),
  tva_number: z.string().optional(),
});

const settingsSchema = z.object({
  default_vat_rate: z.number().min(0).max(100),
  default_payment_terms: z.number().min(0).max(365),
  quote_validity_days: z.number().min(1).max(365),
});

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrateur',
  bureau: 'Bureau',
  terrain: 'Terrain',
  lecture: 'Lecture seule',
};

const roleColors: Record<UserRole, string> = {
  admin: 'bg-red-100 text-red-800 border-red-200',
  bureau: 'bg-blue-100 text-blue-800 border-blue-200',
  terrain: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  lecture: 'bg-gray-100 text-gray-700 border-gray-200',
};

const aiAgentLabels: Record<AiAgentType, { label: string; description: string }> = {
  meteo_replan: { label: 'Replanification météo', description: 'Propose automatiquement des reports de chantier en cas de météo défavorable' },
  relance_auto: { label: 'Relances automatiques', description: 'Gère les relances clients selon les intervalles configurés' },
  devis_assist: { label: 'Assistant devis', description: "Suggère des lignes de devis basées sur l'historique" },
  marge_alert: { label: 'Alertes de marge', description: 'Notifie lorsque la marge dépasse le seuil défini' },
};

const TVA_RATES = [0, 5.5, 10, 20];

// Helper to read nested settings from company.settings JSONB
function getCompanyJsonSetting<T>(settings: Record<string, unknown>, key: string, fallback: T): T {
  const val = settings[key];
  if (val === undefined || val === null) return fallback;
  return val as T;
}

export default function SettingsPage() {
  const supabase = createClient();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [savingCompany, setSavingCompany] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingStripe, setSavingStripe] = useState(false);
  const [savingReminders, setSavingReminders] = useState(false);
  const [savingThresholds, setSavingThresholds] = useState(false);

  const [company, setCompany] = useState<CompanyRow | null>(null);
  const [companySettings, setCompanySettings] = useState<CompanySettingsRow | null>(null);
  const [users, setUsers] = useState<UserProfileRow[]>([]);
  const [currentUser, setCurrentUser] = useState<UserProfileRow | null>(null);

  // Company form state
  const [companyForm, setCompanyForm] = useState({
    name: '',
    siret: '',
    address: '',
    phone: '',
    email: '',
    logo_url: '',
    iban: '',
    tva_number: '',
  });
  const [companyErrors, setCompanyErrors] = useState<Record<string, string>>({});

  // AI form state — stored in company.settings JSONB
  const [aiModes, setAiModes] = useState<Record<AiAgentType, boolean>>({
    meteo_replan: false,
    relance_auto: false,
    devis_assist: false,
    marge_alert: false,
  });

  // Stripe form state — only public key on client; stored in company.settings JSONB
  const [stripeForm, setStripeForm] = useState({
    stripe_public_key: '',
  });
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Reminders form state — stored in company.settings JSONB
  const [remindersForm, setRemindersForm] = useState({
    reminder_auto_send: false,
    email_from: '',
    email_reply_to: '',
    interval_1: 7,
    interval_2: 15,
    interval_3: 30,
    template_1: '',
    template_2: '',
    template_3: '',
  });

  // Thresholds form state — maps to real company_settings columns + company.settings JSONB
  const [thresholdsForm, setThresholdsForm] = useState({
    margin_alert_threshold: 20,
    default_vat_rate: 20,
    quote_validity_days: 30,
    default_payment_terms: 30,
    sap_agreement_number: '',
  });

  const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/stripe/webhook`;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // user_profile.id IS the auth user id — no auth_user_id column
      const { data: profile } = await supabase
        .from('user_profile')
        .select('*')
        .eq('id', user.id)
        .single();

      if (!profile) return;

      // Validate role at runtime
      const validRoles: UserRole[] = ['admin', 'bureau', 'terrain', 'lecture'];
      const profileRole = validRoles.includes(profile.role as UserRole) ? profile.role as UserRole : 'lecture';
      const typedProfile: UserProfileRow = { ...profile, role: profileRole };
      setCurrentUser(typedProfile);

      const { data: companyData } = await supabase
        .from('company')
        .select('*')
        .eq('id', profile.company_id)
        .single();

      if (companyData) {
        setCompany(companyData as CompanyRow);
        const settings = (companyData.settings as Record<string, unknown>) || {};
        setCompanyForm({
          name: companyData.name || '',
          siret: companyData.siret || '',
          address: companyData.address || '',
          phone: companyData.phone || '',
          email: companyData.email || '',
          logo_url: companyData.logo_url || '',
          iban: getCompanyJsonSetting<string>(settings, 'iban', ''),
          tva_number: getCompanyJsonSetting<string>(settings, 'tva_number', ''),
        });

        // Load AI modes from company.settings JSONB
        const aiModeData = getCompanyJsonSetting<string>(settings, 'ai_mode', '');
        const aiModeList = aiModeData.split(',').filter(Boolean);
        setAiModes({
          meteo_replan: aiModeList.includes('meteo_replan'),
          relance_auto: aiModeList.includes('relance_auto'),
          devis_assist: aiModeList.includes('devis_assist'),
          marge_alert: aiModeList.includes('marge_alert'),
        });

        // Load Stripe public key from company.settings JSONB (secret key is server-only)
        setStripeForm({
          stripe_public_key: getCompanyJsonSetting<string>(settings, 'stripe_public_key', ''),
        });

        // Load reminders config from company.settings JSONB
        const intervals = getCompanyJsonSetting<Record<string, unknown>>(settings, 'reminder_intervals', {});
        setRemindersForm({
          reminder_auto_send: getCompanyJsonSetting<boolean>(settings, 'reminder_auto_send', false),
          email_from: getCompanyJsonSetting<string>(settings, 'email_from', ''),
          email_reply_to: getCompanyJsonSetting<string>(settings, 'email_reply_to', ''),
          interval_1: (intervals.interval_1 as number) || 7,
          interval_2: (intervals.interval_2 as number) || 15,
          interval_3: (intervals.interval_3 as number) || 30,
          template_1: (intervals.template_1 as string) || '',
          template_2: (intervals.template_2 as string) || '',
          template_3: (intervals.template_3 as string) || '',
        });

        // Load thresholds from company.settings JSONB (for fields not in company_settings)
        setThresholdsForm(prev => ({
          ...prev,
          margin_alert_threshold: getCompanyJsonSetting<number>(settings, 'margin_alert_threshold', 20),
          sap_agreement_number: getCompanyJsonSetting<string>(settings, 'sap_agreement_number', ''),
        }));
      }

      const { data: settingsData } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', profile.company_id)
        .single();

      if (settingsData) {
        setCompanySettings(settingsData as CompanySettingsRow);
        // Map real company_settings columns: default_vat_rate, default_payment_terms, quote_validity_days
        setThresholdsForm(prev => ({
          ...prev,
          default_vat_rate: settingsData.default_vat_rate ?? 20,
          quote_validity_days: settingsData.quote_validity_days ?? 30,
          default_payment_terms: settingsData.default_payment_terms ?? 30,
        }));
      }

      const { data: usersData } = await supabase
        .from('user_profile')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('is_active', true)
        .order('updated_at', { ascending: false });

      if (usersData) setUsers(usersData as UserProfileRow[]);
    } catch (error) {
      console.error('Erreur chargement paramètres:', error);
      toast({ title: 'Erreur', description: 'Impossible de charger les paramètres', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [supabase, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveCompany = async () => {
    setCompanyErrors({});
    const result = companySchema.safeParse(companyForm);
    if (!result.success) {
      const errors: Record<string, string> = {};
      result.error.errors.forEach(e => {
        if (e.path[0]) errors[String(e.path[0])] = e.message;
      });
      setCompanyErrors(errors);
      return;
    }

    setSavingCompany(true);
    try {
      if (!company) return;
      const existingSettings = (company.settings as Record<string, unknown>) || {};
      const { error } = await supabase
        .from('company')
        .update({
          name: companyForm.name,
          siret: companyForm.siret || null,
          address: companyForm.address || null,
          phone: companyForm.phone || null,
          email: companyForm.email || null,
          logo_url: companyForm.logo_url || null,
          settings: {
            ...existingSettings,
            iban: companyForm.iban,
            tva_number: companyForm.tva_number,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', company.id);

      if (error) throw error;
      toast({ title: 'Entreprise mise à jour', description: 'Les informations ont été sauvegardées.' });
      loadData();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder', variant: 'destructive' });
    } finally {
      setSavingCompany(false);
    }
  };

  // AI config is stored in company.settings JSONB
  const handleSaveAI = async () => {
    setSavingSettings(true);
    try {
      if (!company) return;
      const existingSettings = (company.settings as Record<string, unknown>) || {};
      const aiModeString = Object.entries(aiModes)
        .filter(([, enabled]) => enabled)
        .map(([key]) => key)
        .join(',');

      const { error } = await supabase
        .from('company')
        .update({
          settings: {
            ...existingSettings,
            ai_mode: aiModeString,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', company.id);

      if (error) throw error;
      toast({ title: 'Préférences IA mises à jour', description: 'Les agents IA ont été configurés.' });
      loadData();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder', variant: 'destructive' });
    } finally {
      setSavingSettings(false);
    }
  };

  // Only stripe_public_key is stored client-side in company.settings JSONB
  // Secret key must be handled server-side via API route
  const handleSaveStripe = async () => {
    setSavingStripe(true);
    try {
      if (!company) return;
      const existingSettings = (company.settings as Record<string, unknown>) || {};

      const { error } = await supabase
        .from('company')
        .update({
          settings: {
            ...existingSettings,
            stripe_public_key: stripeForm.stripe_public_key || null,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', company.id);

      if (error) throw error;
      toast({ title: 'Stripe mis à jour', description: 'La clé publique a été sauvegardée.' });
      loadData();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder', variant: 'destructive' });
    } finally {
      setSavingStripe(false);
    }
  };

  // Reminder config stored in company.settings JSONB
  const handleSaveReminders = async () => {
    setSavingReminders(true);
    try {
      if (!company) return;
      const existingSettings = (company.settings as Record<string, unknown>) || {};

      const { error } = await supabase
        .from('company')
        .update({
          settings: {
            ...existingSettings,
            reminder_auto_send: remindersForm.reminder_auto_send,
            email_from: remindersForm.email_from || null,
            email_reply_to: remindersForm.email_reply_to || null,
            reminder_intervals: {
              interval_1: remindersForm.interval_1,
              interval_2: remindersForm.interval_2,
              interval_3: remindersForm.interval_3,
              template_1: remindersForm.template_1,
              template_2: remindersForm.template_2,
              template_3: remindersForm.template_3,
            },
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', company.id);

      if (error) throw error;
      toast({ title: 'Relances mises à jour', description: 'La configuration des relances a été sauvegardée.' });
      loadData();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder', variant: 'destructive' });
    } finally {
      setSavingReminders(false);
    }
  };

  // Thresholds: use real company_settings columns for VAT/payment/quote, JSONB for others
  const handleSaveThresholds = async () => {
    setSavingThresholds(true);
    try {
      if (!companySettings) return;
      if (!company) return;

      // Validate against schema
      const result = settingsSchema.safeParse({
        default_vat_rate: thresholdsForm.default_vat_rate,
        default_payment_terms: thresholdsForm.default_payment_terms,
        quote_validity_days: thresholdsForm.quote_validity_days,
      });
      if (!result.success) {
        toast({ title: 'Validation échouée', description: result.error.errors[0]?.message || 'Données invalides', variant: 'destructive' });
        return;
      }

      // Update real company_settings columns
      const { error: settingsError } = await supabase
        .from('company_settings')
        .update({
          default_vat_rate: thresholdsForm.default_vat_rate,
          quote_validity_days: thresholdsForm.quote_validity_days,
          default_payment_terms: thresholdsForm.default_payment_terms,
        })
        .eq('id', companySettings.id);

      if (settingsError) throw settingsError;

      // Store margin_alert_threshold and sap_agreement_number in company.settings JSONB
      const existingSettings = (company.settings as Record<string, unknown>) || {};
      const { error: companyError } = await supabase
        .from('company')
        .update({
          settings: {
            ...existingSettings,
            margin_alert_threshold: thresholdsForm.margin_alert_threshold,
            sap_agreement_number: thresholdsForm.sap_agreement_number,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', company.id);

      if (companyError) throw companyError;

      toast({ title: 'Seuils mis à jour', description: 'Les paramètres ont été sauvegardés.' });
      loadData();
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder', variant: 'destructive' });
    } finally {
      setSavingThresholds(false);
    }
  };

  const copyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(webhookUrl);
      setCopiedWebhook(true);
      setTimeout(() => setCopiedWebhook(false), 2000);
    } catch {
      // ignore
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="container mx-auto py-6 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Paramètres</h1>
        <p className="text-muted-foreground">Configurez votre espace de travail</p>
      </div>

      <Tabs defaultValue="company">
        <TabsList className="mb-6 flex flex-wrap gap-1 h-auto">
          <TabsTrigger value="company" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            Entreprise
          </TabsTrigger>
          <TabsTrigger value="users" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Utilisateurs
          </TabsTrigger>
          <TabsTrigger value="ai" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            IA
          </TabsTrigger>
          <TabsTrigger value="stripe" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Paiement
          </TabsTrigger>
          <TabsTrigger value="reminders" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Relances
          </TabsTrigger>
          <TabsTrigger value="thresholds" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Seuils
          </TabsTrigger>
        </TabsList>

        {/* ── COMPANY TAB ── */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>Informations de l'entreprise</CardTitle>
              <CardDescription>Gérez les informations de votre entreprise</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isAdmin && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Seuls les administrateurs peuvent modifier ces informations.</AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nom de l'entreprise *</Label>
                  <Input
                    id="name"
                    value={companyForm.name}
                    onChange={e => setCompanyForm(f => ({ ...f, name: e.target.value }))}
                    disabled={!isAdmin}
                  />
                  {companyErrors.name && <p className="text-sm text-destructive">{companyErrors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siret">SIRET</Label>
                  <Input
                    id="siret"
                    value={companyForm.siret}
                    onChange={e => setCompanyForm(f => ({ ...f, siret: e.target.value }))}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={companyForm.email}
                    onChange={e => setCompanyForm(f => ({ ...f, email: e.target.value }))}
                    disabled={!isAdmin}
                  />
                  {companyErrors.email && <p className="text-sm text-destructive">{companyErrors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Téléphone</Label>
                  <Input
                    id="phone"
                    value={companyForm.phone}
                    onChange={e => setCompanyForm(f => ({ ...f, phone: e.target.value }))}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="address">Adresse</Label>
                  <Textarea
                    id="address"
                    value={companyForm.address}
                    onChange={e => setCompanyForm(f => ({ ...f, address: e.target.value }))}
                    disabled={!isAdmin}
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="iban">IBAN</Label>
                  <Input
                    id="iban"
                    value={companyForm.iban}
                    onChange={e => setCompanyForm(f => ({ ...f, iban: e.target.value }))}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tva_number">Numéro TVA</Label>
                  <Input
                    id="tva_number"
                    value={companyForm.tva_number}
                    onChange={e => setCompanyForm(f => ({ ...f, tva_number: e.target.value }))}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="logo_url">URL du logo</Label>
                  <Input
                    id="logo_url"
                    value={companyForm.logo_url}
                    onChange={e => setCompanyForm(f => ({ ...f, logo_url: e.target.value }))}
                    disabled={!isAdmin}
                    placeholder="https://..."
                  />
                  {companyErrors.logo_url && <p className="text-sm text-destructive">{companyErrors.logo_url}</p>}
                </div>
              </div>
              {isAdmin && (
                <div className="flex justify-end">
                  <Button onClick={handleSaveCompany} disabled={savingCompany}>
                    {savingCompany ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Sauvegarder
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── USERS TAB ── */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>Utilisateurs</CardTitle>
              <CardDescription>Gérez les membres de votre équipe</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Téléphone</TableHead>
                    <TableHead>Rôle</TableHead>
                    <TableHead>Statut</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(u => {
                    const role = u.role as UserRole;
                    return (
                      <TableRow key={u.id}>
                        <TableCell>{u.first_name} {u.last_name}</TableCell>
                        <TableCell>{u.phone || '—'}</TableCell>
                        <TableCell>
                          <Badge className={cn('border text-xs', roleColors[role] ?? 'bg-gray-100 text-gray-700 border-gray-200')}>
                            {roleLabels[role] ?? role}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={u.is_active ? 'default' : 'secondary'}>
                            {u.is_active ? 'Actif' : 'Inactif'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">Aucun utilisateur</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── AI TAB ── */}
        <TabsContent value="ai">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                Agents IA
              </CardTitle>
              <CardDescription>Activez ou désactivez les agents d'intelligence artificielle</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isAdmin && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Seuls les administrateurs peuvent modifier ces paramètres.</AlertDescription>
                </Alert>
              )}
              {(Object.keys(aiModes) as AiAgentType[]).map(agent => (
                <div key={agent} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1">
                    <p className="font-medium">{aiAgentLabels[agent].label}</p>
                    <p className="text-sm text-muted-foreground">{aiAgentLabels[agent].description}</p>
                  </div>
                  <Switch
                    checked={aiModes[agent]}
                    onCheckedChange={checked => setAiModes(m => ({ ...m, [agent]: checked }))}
                    disabled={!isAdmin}
                  />
                </div>
              ))}
              {isAdmin && (
                <div className="flex justify-end">
                  <Button onClick={handleSaveAI} disabled={savingSettings}>
                    {savingSettings ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Sauvegarder
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── STRIPE TAB ── */}
        <TabsContent value="stripe">
          <Card>
            <CardHeader>
              <CardTitle>Paiement en ligne (Stripe)</CardTitle>
              <CardDescription>Configurez votre intégration Stripe pour accepter les paiements en ligne</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isAdmin && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Seuls les administrateurs peuvent modifier ces paramètres.</AlertDescription>
                </Alert>
              )}
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  La clé secrète Stripe doit être configurée côté serveur uniquement via les variables d'environnement (<code>STRIPE_SECRET_KEY</code>). Ne saisissez jamais votre clé secrète dans cette interface.
                </AlertDescription>
              </Alert>
              <div className="space-y-2">
                <Label htmlFor="stripe_public_key">Clé publique Stripe (pk_...)</Label>
                <Input
                  id="stripe_public_key"
                  value={stripeForm.stripe_public_key}
                  onChange={e => setStripeForm(f => ({ ...f, stripe_public_key: e.target.value }))}
                  disabled={!isAdmin}
                  placeholder="pk_live_..."
                />
              </div>
              <Separator />
              <div className="space-y-2">
                <Label>URL du webhook Stripe</Label>
                <div className="flex gap-2">
                  <Input value={webhookUrl} readOnly className="font-mono text-sm" />
                  <Button variant="outline" size="icon" onClick={copyWebhookUrl}>
                    {copiedWebhook ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Ajoutez cette URL dans votre tableau de bord Stripe → Webhooks.</p>
              </div>
              {isAdmin && (
                <div className="flex justify-end">
                  <Button onClick={handleSaveStripe} disabled={savingStripe}>
                    {savingStripe ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Sauvegarder
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── REMINDERS TAB ── */}
        <TabsContent value="reminders">
          <Card>
            <CardHeader>
              <CardTitle>Configuration des relances</CardTitle>
              <CardDescription>Paramétrez l'envoi automatique des relances clients</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isAdmin && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Seuls les administrateurs peuvent modifier ces paramètres.</AlertDescription>
                </Alert>
              )}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Envoi automatique</p>
                  <p className="text-sm text-muted-foreground">Activer l'envoi automatique des relances</p>
                </div>
                <Switch
                  checked={remindersForm.reminder_auto_send}
                  onCheckedChange={checked => setRemindersForm(f => ({ ...f, reminder_auto_send: checked }))}
                  disabled={!isAdmin}
                />
              </div>
              <Separator />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email_from">Email expéditeur</Label>
                  <Input
                    id="email_from"
                    type="email"
                    value={remindersForm.email_from}
                    onChange={e => setRemindersForm(f => ({ ...f, email_from: e.target.value }))}
                    disabled={!isAdmin}
                    placeholder="noreply@monentreprise.fr"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email_reply_to">Email de réponse</Label>
                  <Input
                    id="email_reply_to"
                    type="email"
                    value={remindersForm.email_reply_to}
                    onChange={e => setRemindersForm(f => ({ ...f, email_reply_to: e.target.value }))}
                    disabled={!isAdmin}
                    placeholder="contact@monentreprise.fr"
                  />
                </div>
              </div>
              <Separator />
              {([1, 2, 3] as const).map(n => (
                <div key={n} className="space-y-3 p-4 border rounded-lg">
                  <h4 className="font-medium">Relance {n}</h4>
                  <div className="space-y-2">
                    <Label>Délai (jours après échéance)</Label>
                    <div className="flex items-center gap-4">
                      <Slider
                        value={[remindersForm[`interval_${n}` as keyof typeof remindersForm] as number]}
                        onValueChange={([v]) => setRemindersForm(f => ({ ...f, [`interval_${n}`]: v }))}
                        min={1}
                        max={90}
                        step={1}
                        disabled={!isAdmin}
                        className="flex-1"
                      />
                      <span className="w-12 text-right font-mono text-sm">
                        {remindersForm[`interval_${n}` as keyof typeof remindersForm]} j
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Message</Label>
                    <Textarea
                      value={remindersForm[`template_${n}` as keyof typeof remindersForm] as string}
                      onChange={e => setRemindersForm(f => ({ ...f, [`template_${n}`]: e.target.value }))}
                      disabled={!isAdmin}
                      rows={3}
                      placeholder="Corps du message de relance..."
                    />
                  </div>
                </div>
              ))}
              {isAdmin && (
                <div className="flex justify-end">
                  <Button onClick={handleSaveReminders} disabled={savingReminders}>
                    {savingReminders ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Sauvegarder
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── THRESHOLDS TAB ── */}
        <TabsContent value="thresholds">
          <Card>
            <CardHeader>
              <CardTitle>Seuils et valeurs par défaut</CardTitle>
              <CardDescription>Configurez les valeurs par défaut utilisées dans l'application</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {!isAdmin && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>Seuls les administrateurs peuvent modifier ces paramètres.</AlertDescription>
                </Alert>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Taux de TVA par défaut (%)</Label>
                  <Select
                    value={String(thresholdsForm.default_vat_rate)}
                    onValueChange={v => setThresholdsForm(f => ({ ...f, default_vat_rate: Number(v) }))}
                    disabled={!isAdmin}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TVA_RATES.map(r => (
                        <SelectItem key={r} value={String(r)}>{r} %</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Validité des devis (jours)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={365}
                    value={thresholdsForm.quote_validity_days}
                    onChange={e => setThresholdsForm(f => ({ ...f, quote_validity_days: Number(e.target.value) }))}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Délai de paiement par défaut (jours)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={365}
                    value={thresholdsForm.default_payment_terms}
                    onChange={e => setThresholdsForm(f => ({ ...f, default_payment_terms: Number(e.target.value) }))}
                    disabled={!isAdmin}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Seuil d'alerte de marge (%)</Label>
                  <div className="flex items-center gap-4">
                    <Slider
                      value={[thresholdsForm.margin_alert_threshold]}
                      onValueChange={([v]) => setThresholdsForm(f => ({ ...f, margin_alert_threshold: v }))}
                      min={0}
                      max={100}
                      step={1}
                      disabled={!isAdmin}
                      className="flex-1"
                    />
                    <span className="w-12 text-right font-mono text-sm">{thresholdsForm.margin_alert_threshold} %</span>
                  </div>
                </div>
                <div className="md:col-span-2 space-y-2">
                  <Label htmlFor="sap_agreement_number">Numéro d'accord SAP</Label>
                  <Input
                    id="sap_agreement_number"
                    value={thresholdsForm.sap_agreement_number}
                    onChange={e => setThresholdsForm(f => ({ ...f, sap_agreement_number: e.target.value }))}
                    disabled={!isAdmin}
                  />
                </div>
              </div>
              {isAdmin && (
                <div className="flex justify-end">
                  <Button onClick={handleSaveThresholds} disabled={savingThresholds}>
                    {savingThresholds ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Sauvegarder
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
