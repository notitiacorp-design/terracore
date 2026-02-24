'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { cn, formatCurrency } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Sparkles,
  Loader2,
  ChevronRight,
  Package,
  Wrench,
  Leaf,
  Truck,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  ArrowRight,
} from 'lucide-react';

interface DetectedPrestation {
  label: string;
  icon: React.ReactNode;
  quantity?: number;
  unit?: string;
  keywords: string[];
}

interface SuggestedItem {
  name: string;
  item_type: 'materiau' | 'main_oeuvre' | 'fourniture' | 'location';
  unit: string;
  quantity: number;
  unit_price_ht: number;
  tva_rate: number;
  total_ht: number;
}

interface AIAnalysis {
  prestations: DetectedPrestation[];
  items: SuggestedItem[];
  total_ht: number;
  total_tva: number;
  total_ttc: number;
  margin_percent: number;
  confidence_score: number;
  object: string;
}

const KEYWORD_RULES: {
  keywords: string[];
  label: string;
  icon: React.ReactNode;
  items: Omit<SuggestedItem, 'quantity'>[];
  defaultQty: number;
  unit: string;
  qtyMultiplier?: number;
}[] = [
  {
    keywords: ['tonte', 'tondre', 'gazon', 'pelouse'],
    label: 'Tonte de gazon',
    icon: <Leaf className="h-4 w-4" />,
    unit: 'm²',
    defaultQty: 100,
    qtyMultiplier: 1,
    items: [
      { name: 'Main d\'œuvre tonte', item_type: 'main_oeuvre', unit: 'h', unit_price_ht: 35, tva_rate: 10, total_ht: 0 },
      { name: 'Passage tondeuse', item_type: 'fourniture', unit: 'm²', unit_price_ht: 0.08, tva_rate: 10, total_ht: 0 },
    ],
  },
  {
    keywords: ['taille', 'haie', 'arbuste', 'buisson', 'bordure'],
    label: 'Taille de haie / arbustes',
    icon: <Leaf className="h-4 w-4" />,
    unit: 'ml',
    defaultQty: 20,
    qtyMultiplier: 1,
    items: [
      { name: 'Main d\'œuvre taille haie', item_type: 'main_oeuvre', unit: 'h', unit_price_ht: 38, tva_rate: 10, total_ht: 0 },
      { name: 'Matériel de taille', item_type: 'location', unit: 'j', unit_price_ht: 45, tva_rate: 20, total_ht: 0 },
    ],
  },
  {
    keywords: ['évacuation', 'evacuation', 'déchets', 'dechet', 'déchetterie', 'benne'],
    label: 'Évacuation des déchets verts',
    icon: <Truck className="h-4 w-4" />,
    unit: 'T',
    defaultQty: 1,
    qtyMultiplier: 0.02,
    items: [
      { name: 'Transport benne déchets verts', item_type: 'location', unit: 'passage', unit_price_ht: 180, tva_rate: 20, total_ht: 0 },
      { name: 'Éco-taxe déchets verts', item_type: 'fourniture', unit: 'T', unit_price_ht: 65, tva_rate: 20, total_ht: 0 },
    ],
  },
  {
    keywords: ['plantation', 'planter', 'plant', 'arbre', 'arbres'],
    label: 'Plantation',
    icon: <Leaf className="h-4 w-4" />,
    unit: 'u',
    defaultQty: 5,
    qtyMultiplier: 1,
    items: [
      { name: 'Main d\'œuvre plantation', item_type: 'main_oeuvre', unit: 'h', unit_price_ht: 40, tva_rate: 10, total_ht: 0 },
      { name: 'Terreau plantation', item_type: 'materiau', unit: 'sac', unit_price_ht: 8.5, tva_rate: 10, total_ht: 0 },
      { name: 'Engrais de fond', item_type: 'materiau', unit: 'kg', unit_price_ht: 3.2, tva_rate: 10, total_ht: 0 },
    ],
  },
  {
    keywords: ['terrassement', 'terras', 'nivellement', 'décaissement', 'decaissement'],
    label: 'Terrassement / Nivellement',
    icon: <Wrench className="h-4 w-4" />,
    unit: 'm²',
    defaultQty: 50,
    qtyMultiplier: 1,
    items: [
      { name: 'Main d\'œuvre terrassement', item_type: 'main_oeuvre', unit: 'h', unit_price_ht: 45, tva_rate: 10, total_ht: 0 },
      { name: 'Location mini-pelle', item_type: 'location', unit: 'j', unit_price_ht: 280, tva_rate: 20, total_ht: 0 },
    ],
  },
  {
    keywords: ['arrosage', 'irrigation', 'goutte', 'asperseur'],
    label: 'Système d\'arrosage',
    icon: <Package className="h-4 w-4" />,
    unit: 'forfait',
    defaultQty: 1,
    qtyMultiplier: 1,
    items: [
      { name: 'Main d\'œuvre installation arrosage', item_type: 'main_oeuvre', unit: 'h', unit_price_ht: 42, tva_rate: 10, total_ht: 0 },
      { name: 'Tuyaux goutte-à-goutte', item_type: 'materiau', unit: 'ml', unit_price_ht: 1.8, tva_rate: 10, total_ht: 0 },
      { name: 'Programmateur arrosage', item_type: 'fourniture', unit: 'u', unit_price_ht: 95, tva_rate: 10, total_ht: 0 },
    ],
  },
  {
    keywords: ['engazonnement', 'gazon', 'semis', 'ensemencement'],
    label: 'Engazonnement',
    icon: <Leaf className="h-4 w-4" />,
    unit: 'm²',
    defaultQty: 100,
    qtyMultiplier: 1,
    items: [
      { name: 'Semences gazon', item_type: 'materiau', unit: 'kg', unit_price_ht: 6.5, tva_rate: 10, total_ht: 0 },
      { name: 'Main d\'œuvre ensemencement', item_type: 'main_oeuvre', unit: 'h', unit_price_ht: 38, tva_rate: 10, total_ht: 0 },
    ],
  },
  {
    keywords: ['dallage', 'dalle', 'pavé', 'pave', 'terrasse', 'allée', 'allee'],
    label: 'Dallage / Pavage',
    icon: <Wrench className="h-4 w-4" />,
    unit: 'm²',
    defaultQty: 30,
    qtyMultiplier: 1,
    items: [
      { name: 'Main d\'œuvre pose dallage', item_type: 'main_oeuvre', unit: 'h', unit_price_ht: 48, tva_rate: 10, total_ht: 0 },
      { name: 'Dalles béton 40x40', item_type: 'materiau', unit: 'm²', unit_price_ht: 12, tva_rate: 10, total_ht: 0 },
      { name: 'Sable de pose', item_type: 'materiau', unit: 'T', unit_price_ht: 45, tva_rate: 10, total_ht: 0 },
    ],
  },
];

function extractNumber(text: string, keyword: string): number | null {
  const patterns = [
    new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*(?:m²|m2|ml|m|ha)\\s*(?:de\\s+)?${keyword}`, 'i'),
    new RegExp(`${keyword}\\s+(?:de\\s+)?(\\d+(?:[.,]\\d+)?)\\s*(?:m²|m2|ml|m|ha)`, 'i'),
    new RegExp(`(\\d+(?:[.,]\\d+)?)\\s*m(?:²|2|l)?`, 'i'),
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return parseFloat(match[1].replace(',', '.'));
    }
  }
  return null;
}

function parseTextToAnalysis(text: string): AIAnalysis {
  const lower = text.toLowerCase();
  const prestations: DetectedPrestation[] = [];
  const items: SuggestedItem[] = [];

  let matchCount = 0;

  for (const rule of KEYWORD_RULES) {
    const matched = rule.keywords.some((kw) => lower.includes(kw));
    if (!matched) continue;

    const detectedQty = extractNumber(text, rule.keywords[0]) ?? rule.defaultQty;
    const qty = detectedQty;

    prestations.push({
      label: rule.label,
      icon: rule.icon,
      quantity: qty,
      unit: rule.unit,
      keywords: rule.keywords,
    });

    for (const item of rule.items) {
      const itemQty = rule.qtyMultiplier ? qty * rule.qtyMultiplier : qty;
      const total_ht = Math.round(itemQty * item.unit_price_ht * 100) / 100;
      items.push({ ...item, quantity: Math.round(itemQty * 100) / 100, total_ht });
    }

    matchCount++;
  }

  const total_ht = items.reduce((sum, i) => sum + i.total_ht, 0);
  const total_tva = items.reduce((sum, i) => sum + i.total_ht * (i.tva_rate / 100), 0);
  const total_ttc = total_ht + total_tva;
  const margin_percent = 32;

  const confidence_score = matchCount === 0 ? 0 : Math.min(95, 45 + matchCount * 12);

  const objectParts: string[] = [];
  for (const p of prestations) {
    objectParts.push(p.label);
  }
  const object = objectParts.length > 0 ? objectParts.join(' + ') : 'Travaux d\'espaces verts';

  return {
    prestations,
    items,
    total_ht: Math.round(total_ht * 100) / 100,
    total_tva: Math.round(total_tva * 100) / 100,
    total_ttc: Math.round(total_ttc * 100) / 100,
    margin_percent,
    confidence_score,
    object,
  };
}

function getItemTypeLabel(type: string): string {
  switch (type) {
    case 'main_oeuvre': return 'Main d\'œuvre';
    case 'materiau': return 'Matériau';
    case 'fourniture': return 'Fourniture';
    case 'location': return 'Location';
    default: return type;
  }
}

function getItemTypeBadgeColor(type: string): string {
  switch (type) {
    case 'main_oeuvre': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300';
    case 'materiau': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300';
    case 'fourniture': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
    case 'location': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300';
    default: return 'bg-gray-100 text-gray-700';
  }
}

function ConfidenceBadge({ score }: { score: number }) {
  const color =
    score >= 75
      ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
      : score >= 50
      ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
      : 'bg-red-100 text-red-700 border-red-200';
  const label =
    score >= 75 ? 'Haute confiance' : score >= 50 ? 'Confiance moyenne' : 'Confiance faible';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border',
        color
      )}
    >
      {score >= 75 ? (
        <CheckCircle2 className="h-3 w-3" />
      ) : (
        <AlertCircle className="h-3 w-3" />
      )}
      {label} ({score}%)
    </span>
  );
}

export default function DevisIAPage() {
  const router = useRouter();
  const supabase = createClient();
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AIAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agentRunId, setAgentRunId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleGenerate = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('user_profile')
        .select('company_id')
        .eq('auth_user_id', user?.id ?? '')
        .single();

      const companyId = profile?.company_id;

      // Create ai_agent_run record
      const { data: agentRun, error: runError } = await supabase
        .from('ai_agent_run')
        .insert({
          company_id: companyId,
          agent_type: 'devis_assist' as const,
          input_data: { text: inputText },
          status: 'running',
          created_by: user?.id,
        })
        .select()
        .single();

      if (runError) {
        console.error('Erreur création agent run:', runError);
      }

      // Simulate processing delay
      await new Promise((resolve) => setTimeout(resolve, 1200));

      // Parse locally
      const result = parseTextToAnalysis(inputText);

      if (result.prestations.length === 0) {
        setError('Aucune prestation détectée. Essayez de décrire plus précisément (ex: tonte, taille haie, plantation, terrassement...).');
        setIsLoading(false);

        if (agentRun?.id) {
          await supabase
            .from('ai_agent_run')
            .update({ status: 'error', error_message: 'Aucune prestation détectée', output_data: { prestations: [] } })
            .eq('id', agentRun.id);
        }
        return;
      }

      // Update agent run with result
      if (agentRun?.id) {
        await supabase
          .from('ai_agent_run')
          .update({
            status: 'completed',
            output_data: {
              prestations: result.prestations.map((p) => ({ label: p.label, quantity: p.quantity, unit: p.unit })),
              items: result.items,
              totals: { total_ht: result.total_ht, total_tva: result.total_tva, total_ttc: result.total_ttc },
              confidence_score: result.confidence_score,
            },
            tokens_used: Math.floor(inputText.split(' ').length * 1.3),
          })
          .eq('id', agentRun.id);

        // Create ai_proposal
        const { data: proposal } = await supabase
          .from('ai_proposal')
          .insert({
            company_id: companyId,
            agent_run_id: agentRun.id,
            entity_type: 'quote',
            entity_id: null,
            proposal_type: 'pre_devis',
            title: `Pré-devis IA : ${result.object}`,
            description: inputText,
            proposed_data: {
              object: result.object,
              items: result.items,
              total_ht: result.total_ht,
              total_ttc: result.total_ttc,
            },
            confidence_score: result.confidence_score / 100,
            status: 'pending',
          })
          .select()
          .single();

        setAgentRunId(agentRun.id);
      }

      setAnalysis(result);
    } catch (err: unknown) {
      console.error(err);
      setError('Une erreur est survenue lors de l\'analyse. Veuillez réessayer.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenWizard = () => {
    if (!analysis) return;
    const params = new URLSearchParams({
      object: analysis.object,
      source: 'ia',
      ...(agentRunId ? { agent_run_id: agentRunId } : {}),
    });
    router.push(`/dashboard/documents/devis/nouveau?${params.toString()}`);
  };

  const examplePrompts = [
    'Tonte pelouse 500m² + taille haie 30ml + évacuation déchets',
    'Terrassement 80m² + plantation 10 arbustes + engazonnement',
    'Création allée dallage 25m² + arrosage automatique',
  ];

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-[#1a1a2e]/95 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30">
              <Sparkles className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white">Devis IA</h1>
              <p className="text-sm text-white/50">Agent IA #3 — Génération automatique de devis</p>
            </div>
            <div className="ml-auto">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                IA Active
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* LEFT: Input Panel */}
          <div className="flex flex-col gap-4">
            <Card className="bg-white/5 border-white/10">
              <CardHeader className="pb-3">
                <CardTitle className="text-white text-base flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  Décrivez votre chantier
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <Textarea
                  ref={textareaRef}
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Décrivez le chantier : ex. Tonte 500m², taille haie 30ml, évacuation déchets..."
                  className="min-h-[200px] bg-white/5 border-white/20 text-white placeholder:text-white/30 resize-none focus:border-emerald-500/50 focus:ring-emerald-500/20 text-base leading-relaxed"
                  disabled={isLoading}
                />

                {/* Example prompts */}
                <div className="flex flex-col gap-2">
                  <p className="text-xs text-white/40 uppercase tracking-wider font-medium">Exemples rapides</p>
                  <div className="flex flex-col gap-2">
                    {examplePrompts.map((prompt, i) => (
                      <button
                        key={i}
                        onClick={() => setInputText(prompt)}
                        disabled={isLoading}
                        className="text-left text-sm text-white/60 hover:text-emerald-400 transition-colors py-1 flex items-center gap-2 min-h-[36px] disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 text-emerald-500/50" />
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    <p className="text-sm text-red-300">{error}</p>
                  </div>
                )}

                {/* Generate Button */}
                <Button
                  onClick={handleGenerate}
                  disabled={!inputText.trim() || isLoading}
                  className={cn(
                    'min-h-[52px] text-base font-semibold rounded-xl transition-all duration-200',
                    'bg-emerald-500 hover:bg-emerald-400 text-white border-0',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    !isLoading && inputText.trim() && 'shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)]'
                  )}
                >
                  {isLoading ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Analyse en cours...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      Générer le devis
                    </span>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* How it works */}
            <Card className="bg-white/3 border-white/8">
              <CardContent className="pt-4 pb-4">
                <p className="text-xs text-white/40 uppercase tracking-wider font-medium mb-3">Comment ça fonctionne</p>
                <div className="flex flex-col gap-3">
                  {[
                    { step: '1', text: 'Décrivez votre chantier en langage naturel' },
                    { step: '2', text: 'L\'IA analyse et détecte les prestations' },
                    { step: '3', text: 'Les articles du catalogue sont suggérés' },
                    { step: '4', text: 'Ouvrez dans le wizard pour finaliser' },
                  ].map((item) => (
                    <div key={item.step} className="flex items-start gap-3">
                      <span className="flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold shrink-0 mt-0.5">
                        {item.step}
                      </span>
                      <p className="text-sm text-white/50">{item.text}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Preview Panel */}
          <div className="flex flex-col gap-4">
            {!analysis && !isLoading && (
              <div className="flex flex-col items-center justify-center min-h-[400px] rounded-2xl border border-dashed border-white/10 bg-white/2">
                <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
                  <Sparkles className="h-7 w-7 text-emerald-400/50" />
                </div>
                <p className="text-white/30 text-sm text-center max-w-[240px]">
                  La prévisualisation du devis apparaîtra ici après analyse
                </p>
              </div>
            )}

            {isLoading && (
              <div className="flex flex-col items-center justify-center min-h-[400px] rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center">
                    <Sparkles className="h-7 w-7 text-emerald-400" />
                  </div>
                  <div className="absolute inset-0 rounded-2xl border border-emerald-500/30 animate-ping" />
                </div>
                <div className="mt-6 flex items-center gap-3">
                  <Loader2 className="h-5 w-5 text-emerald-400 animate-spin" />
                  <p className="text-emerald-300 text-sm font-medium">Analyse du chantier en cours...</p>
                </div>
                <div className="mt-3 flex flex-col items-center gap-1">
                  <p className="text-white/30 text-xs">Détection des prestations</p>
                  <p className="text-white/30 text-xs">Recherche des articles catalogue</p>
                  <p className="text-white/30 text-xs">Calcul des estimations</p>
                </div>
              </div>
            )}

            {analysis && !isLoading && (
              <>
                {/* Header bar */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-300">Analyse terminée</p>
                      <p className="text-xs text-white/50">{analysis.prestations.length} prestation(s) détectée(s)</p>
                    </div>
                  </div>
                  <ConfidenceBadge score={analysis.confidence_score} />
                </div>

                {/* Object */}
                <Card className="bg-white/5 border-white/10">
                  <CardContent className="pt-4 pb-4">
                    <p className="text-xs text-white/40 uppercase tracking-wider font-medium mb-2">Objet du devis</p>
                    <p className="text-white font-medium text-sm">{analysis.object}</p>
                  </CardContent>
                </Card>

                {/* Prestations détectées */}
                <Card className="bg-white/5 border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <Leaf className="h-4 w-4 text-emerald-400" />
                      Prestations détectées
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex flex-col gap-2">
                    {analysis.prestations.map((p, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-lg bg-white/3 border border-white/8"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400">{p.icon}</span>
                          <span className="text-sm text-white/90">{p.label}</span>
                        </div>
                        {p.quantity && (
                          <span className="text-sm font-mono text-emerald-300">
                            {p.quantity} {p.unit}
                          </span>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Articles suggérés */}
                <Card className="bg-white/5 border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <Package className="h-4 w-4 text-emerald-400" />
                      Articles catalogue suggérés
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2">
                      {analysis.items.map((item, i) => (
                        <div
                          key={i}
                          className="grid grid-cols-[1fr_auto] gap-2 p-3 rounded-lg bg-white/3 border border-white/8"
                        >
                          <div className="flex flex-col gap-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm text-white/90 truncate">{item.name}</span>
                              <span
                                className={cn(
                                  'inline-block px-1.5 py-0.5 rounded text-[10px] font-medium',
                                  getItemTypeBadgeColor(item.item_type)
                                )}
                              >
                                {getItemTypeLabel(item.item_type)}
                              </span>
                            </div>
                            <p className="text-xs text-white/40">
                              {item.quantity} {item.unit} × {formatCurrency(item.unit_price_ht)} HT
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-semibold text-white">{formatCurrency(item.total_ht)}</p>
                            <p className="text-[10px] text-white/30">HT</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Totals */}
                <Card className="bg-white/5 border-white/10">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-white text-sm flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-emerald-400" />
                      Estimation financière
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between py-1">
                        <span className="text-sm text-white/60">Total HT</span>
                        <span className="text-sm font-medium text-white">{formatCurrency(analysis.total_ht)}</span>
                      </div>
                      <div className="flex items-center justify-between py-1">
                        <span className="text-sm text-white/60">Total TVA</span>
                        <span className="text-sm text-white/60">{formatCurrency(analysis.total_tva)}</span>
                      </div>
                      <Separator className="bg-white/10" />
                      <div className="flex items-center justify-between py-1">
                        <span className="text-base font-semibold text-white">Total TTC</span>
                        <span className="text-base font-bold text-emerald-400">{formatCurrency(analysis.total_ttc)}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 px-3 mt-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <span className="text-sm text-emerald-300">Marge estimée</span>
                        <span className="text-sm font-bold text-emerald-300">{analysis.margin_percent}%</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* CTA */}
                <Button
                  onClick={handleOpenWizard}
                  className="min-h-[52px] text-base font-semibold rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white border-0 shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_30px_rgba(16,185,129,0.6)] transition-all duration-200"
                >
                  <span className="flex items-center gap-2">
                    Ouvrir dans le wizard de devis
                    <ArrowRight className="h-5 w-5" />
                  </span>
                </Button>

                <p className="text-xs text-white/30 text-center">
                  Les données pré-remplies pourront être modifiées dans le wizard
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
