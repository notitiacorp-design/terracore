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
  default_tva_rate: z.number().min(0).max(100),
  default_payment_terms_days: z.number().min(0).max(365),
  quote_validity_days: z.number().min(1).max(365),
  margin_alert_threshold: z.number().min(0).max(100),
  reminder_auto_send: z.boolean(),
  ai_mode: z.string().optional(),
  stripe_public_key: z.string().optional(),
  stripe_secret_key: z.string().optional(),
  email_from: z.string().email().optional().or(z.literal('')),
  email_reply_to: z.string().email().optional().or(z.literal('')),
  sap_agreement_number: z.string().optional(),
  reminder_intervals: z.record(z.string(), z.any()).optional(),
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

  // AI form state
  const [aiModes, setAiModes] = useState<Record<AiAgentType, boolean>>({
    meteo_replan: false,
    relance_auto: false,
    devis_assist: false,
    marge_alert: false,
  });

  // Stripe form state
  const [stripeForm, setStripeForm] = useState({
    stripe_public_key: '',
    stripe_secret_key: '',
  });
  const [showSecretKey, setShowSecretKey] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Reminders form state
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

  // Thresholds form state
  const [thresholdsForm, setThresholdsForm] = useState({
    margin_alert_threshold: 20,
    default_tva_rate: 20,
    quote_validity_days: 30,
    default_payment_terms_days: 30,
    sap_agreement_number: '',
  });

  const webhookUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/api/stripe/webhook`;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('user_profile')
        .select('*')
        .eq('auth_user_id', user.id)
        .single();

      if (!profile) return;
      setCurrentUser(profile as UserProfileRow);

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
          iban: (settings.iban as string) || '',
          tva_number: (settings.tva_number as string) || '',
        });
      }

      const { data: settingsData } = await supabase
        .from('company_settings')
        .select('*')
        .eq('company_id', profile.company_id)
        .single();

      if (settingsData) {
        setCompanySettings(settingsData as CompanySettingsRow);
        const intervals = (settingsData.reminder_intervals as Record<string, number>) || {};
        const aiModeData = (settingsData.ai_mode as string) || '';
        const aiModeList = aiModeData.split(',').filter(Boolean);

        setAiModes({
          meteo_replan: aiModeList.includes('meteo_replan'),
          relance_auto: aiModeList.includes('relance_auto'),
          devis_assist: aiModeList.includes('devis_assist'),
          marge_alert: aiModeList.includes('marge_alert'),
        });

        setStripeForm({
          stripe_public_key: settingsData.stripe_public_key || '',
          stripe_secret_key: settingsData.stripe_secret_key || '',
        });

        setRemindersForm({
          reminder_auto_send: settingsData.reminder_auto_send || false,
          email_from: settingsData.email_from || '',
          email_reply_to: settingsData.email_reply_to || '',
          interval_1: intervals.interval_1 || 7,
          interval_2: intervals.interval_2 || 15,
          interval_3: intervals.interval_3 || 30,
          template_1: (intervals.template_1 as string) || '',
          template_2: (intervals.template_2 as string) || '',
          template_3: (intervals.template_3 as string) || '',
        });

        setThresholdsForm({
          margin_alert_threshold: settingsData.margin_alert_threshold || 20,
          default_tva_rate: settingsData.default_tva_rate || 20,
          quote_validity_days: settingsData.quote_validity_days || 30,
          default_payment_terms_days: settingsData.default_payment_terms_days || 30,
          sap_agreement_number: settingsData.sap_agreement_number || '',
        });
      }

      const { data: usersData } = await supabase
        .from('user_profile')
        .select('*')
        .eq('company_id', profile.company_id)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

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

  const handleSaveAI = async () => {
    setSavingSettings(true);
    try {
      if (!companySettings) return;
      const aiModeString = Object.entries(aiModes)
        .filter(([, enabled]) => enabled)
        .map(([key]) => key)
        .join(',');

      const { error } = await supabase
        .from('company_settings')
        .update({ ai_mode: aiModeString, updated_at: new Date().toISOString() })
        .eq('id', companySettings.id);

      if (error) throw error;
      toast({ title: 'Préférences IA mises à jour', description: 'Les agents IA ont été configurés.' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder', variant: 'destructive' });
    } finally {
      setSavingSettings(false);
    }
  };

  const handleSaveStripe = async () => {
    setSavingStripe(true);
    try {
      if (!companySettings) return;
      const { error } = await supabase
        .from('company_settings')
        .update({
          stripe_public_key: stripeForm.stripe_public_key || null,
          stripe_secret_key: stripeForm.stripe_secret_key || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', companySettings.id);

      if (error) throw error;
      toast({ title: 'Stripe mis à jour', description: 'Les clés API ont été sauvegardées.' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder', variant: 'destructive' });
    } finally {
      setSavingStripe(false);
    }
  };

  const handleSaveReminders = async () => {
    setSavingReminders(true);
    try {
      if (!companySettings) return;
      const { error } = await supabase
        .from('company_settings')
        .update({
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
          updated_at: new Date().toISOString(),
        })
        .eq('id', companySettings.id);

      if (error) throw error;
      toast({ title: 'Relances mises à jour', description: 'La configuration des relances a été sauvegardée.' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder', variant: 'destructive' });
    } finally {
      setSavingReminders(false);
    }
  };

  const handleSaveThresholds = async () => {
    setSavingThresholds(true);
    try {
      if (!companySettings) return;
      const { error } = await supabase
        .from('company_settings')
        .update({
          margin_alert_threshold: thresholdsForm.margin_alert_threshold,
          default_tva_rate: thresholdsForm.default_tva_rate,
          quote_validity_days: thresholdsForm.quote_validity_days,
          default_payment_terms_days: thresholdsForm.default_payment_terms_days,
          sap_agreement_number: thresholdsForm.sap_agreement_number || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', companySettings.id);

      if (error) throw error;
      toast({ title: 'Seuils mis à jour', description: 'Les seuils et alertes ont été configurés.' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur', description: 'Impossible de sauvegarder', variant: 'destructive' });
    } finally {
      setSavingThresholds(false);
    }
  };

  const handleChangeUserRole = async (userId: string, newRole: UserRole) => {
    try {
      const { error } = await supabase
        .from('user_profile')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      toast({ title: 'Rôle modifié', description: 'Le rôle de l\'utilisateur a été mis à jour.' });
    } catch (err) {
      console.error(err);
      toast({ title: 'Erreur', description: 'Impossible de modifier le rôle', variant: 'destructive' });
    }
  };

  const handleCopyWebhook = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopiedWebhook(true);
    setTimeout(() => setCopiedWebhook(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
          <p className="text-sm text-muted-foreground">Chargement des paramètres...</p>
        </div>
      </div>
    );
  }

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#1a1a2e]">Paramètres</h1>
        <p className="text-sm text-muted-foreground mt-1">Configurez votre entreprise et vos préférences</p>
      </div>

      {!isAdmin && (
        <Alert className="mb-6 border-amber-200 bg-amber-50">
          <AlertCircle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            Certains paramètres sont réservés aux administrateurs. Contactez votre administrateur pour toute modification.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="entreprise" className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 h-auto gap-1 p-1 mb-6">
          <TabsTrigger value="entreprise" className="flex items-center gap-1 text-xs py-2 min-h-[48px]">
            <Building2 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Entreprise</span>
          </TabsTrigger>
          <TabsTrigger value="utilisateurs" className="flex items-center gap-1 text-xs py-2 min-h-[48px]">
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Utilisateurs</span>
          </TabsTrigger>
          <TabsTrigger value="ia" className="flex items-center gap-1 text-xs py-2 min-h-[48px]">
            <Brain className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Préf. IA</span>
          </TabsTrigger>
          <TabsTrigger value="stripe" className="flex items-center gap-1 text-xs py-2 min-h-[48px]">
            <CreditCard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Stripe</span>
          </TabsTrigger>
          <TabsTrigger value="relances" className="flex items-center gap-1 text-xs py-2 min-h-[48px]">
            <Bell className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Relances</span>
          </TabsTrigger>
          <TabsTrigger value="seuils" className="flex items-center gap-1 text-xs py-2 min-h-[48px]">
            <BarChart3 className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Seuils</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: Entreprise */}
        <TabsContent value="entreprise">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-600" />
                Profil de l&apos;entreprise
              </CardTitle>
              <CardDescription>Informations légales et coordonnées de votre entreprise</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Nom de l&apos;entreprise *</Label>
                  <Input
                    id="company-name"
                    value={companyForm.name}
                    onChange={e => setCompanyForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Ma Société SAS"
                    disabled={!isAdmin}
                    className={cn('min-h-[48px]', companyErrors.name && 'border-red-500')}
                  />
                  {companyErrors.name && <p className="text-xs text-red-500">{companyErrors.name}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-siret">SIRET</Label>
                  <Input
                    id="company-siret"
                    value={companyForm.siret}
                    onChange={e => setCompanyForm(p => ({ ...p, siret: e.target.value }))}
                    placeholder="12345678901234"
                    disabled={!isAdmin}
                    className="min-h-[48px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-tva">Numéro de TVA intracommunautaire</Label>
                  <Input
                    id="company-tva"
                    value={companyForm.tva_number}
                    onChange={e => setCompanyForm(p => ({ ...p, tva_number: e.target.value }))}
                    placeholder="FR12345678901"
                    disabled={!isAdmin}
                    className="min-h-[48px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-phone">Téléphone</Label>
                  <Input
                    id="company-phone"
                    value={companyForm.phone}
                    onChange={e => setCompanyForm(p => ({ ...p, phone: e.target.value }))}
                    placeholder="+33 1 23 45 67 89"
                    disabled={!isAdmin}
                    className="min-h-[48px]"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-email">Email</Label>
                  <Input
                    id="company-email"
                    type="email"
                    value={companyForm.email}
                    onChange={e => setCompanyForm(p => ({ ...p, email: e.target.value }))}
                    placeholder="contact@masociete.fr"
                    disabled={!isAdmin}
                    className={cn('min-h-[48px]', companyErrors.email && 'border-red-500')}
                  />
                  {companyErrors.email && <p className="text-xs text-red-500">{companyErrors.email}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-iban">IBAN</Label>
                  <Input
                    id="company-iban"
                    value={companyForm.iban}
                    onChange={e => setCompanyForm(p => ({ ...p, iban: e.target.value }))}
                    placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                    disabled={!isAdmin}
                    className="min-h-[48px] font-mono text-sm"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-address">Adresse</Label>
                <Textarea
                  id="company-address"
                  value={companyForm.address}
                  onChange={e => setCompanyForm(p => ({ ...p, address: e.target.value }))}
                  placeholder="12 rue des Jardins, 75001 Paris"
                  disabled={!isAdmin}
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company-logo">URL du logo</Label>
                <div className="flex gap-3 items-start">
                  <Input
                    id="company-logo"
                    value={companyForm.logo_url}
                    onChange={e => setCompanyForm(p => ({ ...p, logo_url: e.target.value }))}
                    placeholder="https://exemple.com/logo.png"
                    disabled={!isAdmin}
                    className={cn('min-h-[48px] flex-1', companyErrors.logo_url && 'border-red-500')}
                  />
                  {companyForm.logo_url && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={companyForm.logo_url}
                      alt="Logo aperçu"
                      className="h-12 w-12 object-contain border rounded"
                      onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                  )}
                </div>
                {companyErrors.logo_url && <p className="text-xs text-red-500">{companyErrors.logo_url}</p>}
              </div>

              {isAdmin && (
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSaveCompany}
                    disabled={savingCompany}
                    className="min-h-[48px] bg-emerald-600 hover:bg-emerald-700 text-white px-6"
                  >
                    {savingCompany ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Sauvegarder
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 2: Utilisateurs */}
        <TabsContent value="utilisateurs">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-emerald-600" />
                    Gestion des utilisateurs
                  </CardTitle>
                  <CardDescription>Gérez les membres et leurs rôles</CardDescription>
                </div>
                {isAdmin && (
                  <Button
                    variant="outline"
                    className="min-h-[48px] border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => toast({ title: 'Invitation', description: 'Fonctionnalité à venir : inviter un utilisateur par email.' })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Inviter
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead>Utilisateur</TableHead>
                      <TableHead className="hidden sm:table-cell">Email</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead className="hidden md:table-cell">Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">Aucun utilisateur trouvé</TableCell>
                      </TableRow>
                    )}
                    {users.map(user => (
                      <TableRow key={user.id} className={cn(user.id === currentUser?.id && 'bg-emerald-50/50')}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-full bg-[#1a1a2e] flex items-center justify-center text-white text-sm font-medium shrink-0">
                              {(user.first_name?.[0] || '').toUpperCase()}{(user.last_name?.[0] || '').toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-sm">{user.first_name} {user.last_name}</p>
                              <p className="text-xs text-muted-foreground sm:hidden">{user.email || '–'}</p>
                              {user.id === currentUser?.id && <span className="text-xs text-emerald-600 font-medium">Vous</span>}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-sm text-muted-foreground">{user.email || '–'}</TableCell>
                        <TableCell>
                          {isAdmin && user.id !== currentUser?.id ? (
                            <Select
                              value={user.role as string}
                              onValueChange={(val) => handleChangeUserRole(user.id, val as UserRole)}
                            >
                              <SelectTrigger className="w-36 min-h-[40px] text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="admin">Administrateur</SelectItem>
                                <SelectItem value="bureau">Bureau</SelectItem>
                                <SelectItem value="terrain">Terrain</SelectItem>
                                <SelectItem value="lecture">Lecture seule</SelectItem>
                              </SelectContent>
                            </Select>
                          ) : (
                            <Badge variant="outline" className={cn('text-xs', roleColors[user.role as UserRole] || '')}>
                              {roleLabels[user.role as UserRole] || user.role}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                            Actif
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              <p className="text-xs text-muted-foreground mt-3">Total : {users.length} utilisateur{users.length > 1 ? 's' : ''}</p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 3: Préférences IA */}
        <TabsContent value="ia">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-emerald-600" />
                Préférences des agents IA
              </CardTitle>
              <CardDescription>Activez ou désactivez les agents IA automatiques</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert className="border-emerald-200 bg-emerald-50">
                <Zap className="h-4 w-4 text-emerald-600" />
                <AlertDescription className="text-emerald-800 text-sm">
                  Les agents activés fonctionnent en mode automatique. En mode manuel, les propositions sont soumises à validation.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                {(Object.entries(aiAgentLabels) as [AiAgentType, { label: string; description: string }][]).map(([key, { label, description }]) => (
                  <div key={key} className="flex items-start justify-between gap-4 p-4 rounded-lg border bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-medium text-sm text-[#1a1a2e]">{label}</p>
                        {aiModes[key] && (
                          <Badge className="text-xs bg-emerald-100 text-emerald-700 border-emerald-200 border">
                            Auto
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{description}</p>
                    </div>
                    <Switch
                      checked={aiModes[key]}
                      onCheckedChange={val => setAiModes(p => ({ ...p, [key]: val }))}
                      disabled={!isAdmin}
                      className="shrink-0 mt-1"
                    />
                  </div>
                ))}
              </div>

              {isAdmin && (
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSaveAI}
                    disabled={savingSettings}
                    className="min-h-[48px] bg-emerald-600 hover:bg-emerald-700 text-white px-6"
                  >
                    {savingSettings ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Sauvegarder
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: Stripe */}
        <TabsContent value="stripe">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-emerald-600" />
                Paiement Stripe
              </CardTitle>
              <CardDescription>Configurez votre intégration Stripe pour les paiements en ligne</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="stripe-public">Clé publique Stripe (pk_...)</Label>
                <Input
                  id="stripe-public"
                  value={stripeForm.stripe_public_key}
                  onChange={e => setStripeForm(p => ({ ...p, stripe_public_key: e.target.value }))}
                  placeholder="pk_live_xxxxxxxx"
                  disabled={!isAdmin}
                  className="min-h-[48px] font-mono text-sm"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="stripe-secret">Clé secrète Stripe (sk_...)</Label>
                <div className="relative flex items-center">
                  <Input
                    id="stripe-secret"
                    type={showSecretKey ? 'text' : 'password'}
                    value={stripeForm.stripe_secret_key}
                    onChange={e => setStripeForm(p => ({ ...p, stripe_secret_key: e.target.value }))}
                    placeholder="sk_live_xxxxxxxx"
                    disabled={!isAdmin}
                    className="min-h-[48px] font-mono text-sm pr-12"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 h-9 w-9"
                    onClick={() => setShowSecretKey(p => !p)}
                  >
                    {showSecretKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">⚠️ Ne partagez jamais votre clé secrète</p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>URL du Webhook Stripe</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={webhookUrl}
                    readOnly
                    className="min-h-[48px] font-mono text-sm bg-muted flex-1"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="min-h-[48px] min-w-[48px] shrink-0"
                    onClick={handleCopyWebhook}
                  >
                    {copiedWebhook ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Configurez cette URL dans votre tableau de bord Stripe pour recevoir les événements de paiement.</p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center pt-2">
                <Button
                  variant="outline"
                  onClick={() => toast({ title: 'Test Stripe', description: 'Fonctionnalité de test en cours de développement.' })}
                  className="min-h-[48px] border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  disabled={!isAdmin}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Tester la connexion
                </Button>

                {isAdmin && (
                  <Button
                    onClick={handleSaveStripe}
                    disabled={savingStripe}
                    className="min-h-[48px] bg-emerald-600 hover:bg-emerald-700 text-white px-6"
                  >
                    {savingStripe ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Sauvegarder
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 5: Relances */}
        <TabsContent value="relances">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5 text-emerald-600" />
                  Configuration des relances
                </CardTitle>
                <CardDescription>Paramétrez les délais et modèles d&apos;emails de relance</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/20">
                  <div>
                    <p className="font-medium text-sm">Envoi automatique des relances</p>
                    <p className="text-xs text-muted-foreground">Les relances seront envoyées sans intervention manuelle</p>
                  </div>
                  <Switch
                    checked={remindersForm.reminder_auto_send}
                    onCheckedChange={val => setRemindersForm(p => ({ ...p, reminder_auto_send: val }))}
                    disabled={!isAdmin}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email-from">Email expéditeur</Label>
                    <Input
                      id="email-from"
                      type="email"
                      value={remindersForm.email_from}
                      onChange={e => setRemindersForm(p => ({ ...p, email_from: e.target.value }))}
                      placeholder="relances@masociete.fr"
                      disabled={!isAdmin}
                      className="min-h-[48px]"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email-reply-to">Email de réponse</Label>
                    <Input
                      id="email-reply-to"
                      type="email"
                      value={remindersForm.email_reply_to}
                      onChange={e => setRemindersForm(p => ({ ...p, email_reply_to: e.target.value }))}
                      placeholder="contact@masociete.fr"
                      disabled={!isAdmin}
                      className="min-h-[48px]"
                    />
                  </div>
                </div>

                <Separator />
                <p className="text-sm font-medium text-[#1a1a2e]">Intervalles de relance (jours après échéance)</p>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {[1, 2, 3].map(level => (
                    <div key={level} className="space-y-2">
                      <Label htmlFor={`interval-${level}`}>
                        Relance {level} &mdash; <span className="text-emerald-600 font-medium">{remindersForm[`interval_${level}` as keyof typeof remindersForm]} jour{(remindersForm[`interval_${level}` as keyof typeof remindersForm] as number) > 1 ? 's' : ''}</span>
                      </Label>
                      <Input
                        id={`interval-${level}`}
                        type="number"
                        min={1}
                        max={365}
                        value={remindersForm[`interval_${level}` as keyof typeof remindersForm] as number}
                        onChange={e => setRemindersForm(p => ({ ...p, [`interval_${level}`]: parseInt(e.target.value) || 1 }))}
                        disabled={!isAdmin}
                        className="min-h-[48px]"
                      />
                    </div>
                  ))}
                </div>

                <Separator />
                <p className="text-sm font-medium text-[#1a1a2e]">Modèles d&apos;email</p>

                {[1, 2, 3].map(level => (
                  <div key={level} className="space-y-2">
                    <Label htmlFor={`template-${level}`}>Modèle relance {level}</Label>
                    <Textarea
                      id={`template-${level}`}
                      value={remindersForm[`template_${level}` as keyof typeof remindersForm] as string}
                      onChange={e => setRemindersForm(p => ({ ...p, [`template_${level}`]: e.target.value }))}
                      placeholder={`Bonjour {{client_nom}},\n\nNous vous rappelons que la facture {{reference}} d'un montant de {{montant_ttc}} est échue depuis {{jours_retard}} jour(s).\n\nCordialement,\n{{entreprise_nom}}`}
                      disabled={!isAdmin}
                      rows={4}
                      className="font-mono text-xs resize-y"
                    />
                    <p className="text-xs text-muted-foreground">Variables : &#123;&#123;client_nom&#125;&#125;, &#123;&#123;reference&#125;&#125;, &#123;&#123;montant_ttc&#125;&#125;, &#123;&#123;jours_retard&#125;&#125;, &#123;&#123;entreprise_nom&#125;&#125;</p>
                  </div>
                ))}

                {isAdmin && (
                  <div className="flex justify-end pt-2">
                    <Button
                      onClick={handleSaveReminders}
                      disabled={savingReminders}
                      className="min-h-[48px] bg-emerald-600 hover:bg-emerald-700 text-white px-6"
                    >
                      {savingReminders ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Sauvegarder
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* TAB 6: Seuils & Alertes */}
        <TabsContent value="seuils">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-emerald-600" />
                Seuils &amp; Alertes
              </CardTitle>
              <CardDescription>Paramétrez les valeurs par défaut et les seuils d&apos;alerte</CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Margin threshold */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Seuil d&apos;alerte de marge</Label>
                    <p className="text-xs text-muted-foreground">Alerte déclenchée si la marge est inférieure à ce seuil</p>
                  </div>
                  <span className="text-lg font-bold text-emerald-600">{thresholdsForm.margin_alert_threshold}%</span>
                </div>
                <Slider
                  min={0}
                  max={100}
                  step={1}
                  value={[thresholdsForm.margin_alert_threshold]}
                  onValueChange={([val]) => setThresholdsForm(p => ({ ...p, margin_alert_threshold: val }))}
                  disabled={!isAdmin}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              <Separator />

              {/* TVA par défaut */}
              <div className="space-y-2">
                <Label>Taux de TVA par défaut</Label>
                <Select
                  value={String(thresholdsForm.default_tva_rate)}
                  onValueChange={val => setThresholdsForm(p => ({ ...p, default_tva_rate: parseFloat(val) }))}
                  disabled={!isAdmin}
                >
                  <SelectTrigger className="min-h-[48px] max-w-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TVA_RATES.map(rate => (
                      <SelectItem key={rate} value={String(rate)}>
                        {rate}%{rate === 20 ? ' (taux normal)' : rate === 10 ? ' (taux réduit)' : rate === 5.5 ? ' (taux super-réduit)' : ' (exonéré)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Validité devis + conditions paiement */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="quote-validity">Validité des devis (jours)</Label>
                  <Input
                    id="quote-validity"
                    type="number"
                    min={1}
                    max={365}
                    value={thresholdsForm.quote_validity_days}
                    onChange={e => setThresholdsForm(p => ({ ...p, quote_validity_days: parseInt(e.target.value) || 30 }))}
                    disabled={!isAdmin}
                    className="min-h-[48px]"
                  />
                  <p className="text-xs text-muted-foreground">Durée de validité par défaut des devis émis</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-terms">Délai de paiement par défaut (jours)</Label>
                  <Input
                    id="payment-terms"
                    type="number"
                    min={0}
                    max={365}
                    value={thresholdsForm.default_payment_terms_days}
                    onChange={e => setThresholdsForm(p => ({ ...p, default_payment_terms_days: parseInt(e.target.value) || 30 }))}
                    disabled={!isAdmin}
                    className="min-h-[48px]"
                  />
                  <p className="text-xs text-muted-foreground">Délai de règlement appliqué aux nouvelles factures</p>
                </div>
              </div>

              <Separator />

              {/* SAP */}
              <div className="space-y-2">
                <Label htmlFor="sap-number">Numéro de convention SAP</Label>
                <Input
                  id="sap-number"
                  value={thresholdsForm.sap_agreement_number}
                  onChange={e => setThresholdsForm(p => ({ ...p, sap_agreement_number: e.target.value }))}
                  placeholder="N° agrément services à la personne"
                  disabled={!isAdmin}
                  className="min-h-[48px] max-w-sm"
                />
                <p className="text-xs text-muted-foreground">Numéro affiché sur les documents SAP éligibles</p>
              </div>

              {isAdmin && (
                <div className="flex justify-end pt-2">
                  <Button
                    onClick={handleSaveThresholds}
                    disabled={savingThresholds}
                    className="min-h-[48px] bg-emerald-600 hover:bg-emerald-700 text-white px-6"
                  >
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
