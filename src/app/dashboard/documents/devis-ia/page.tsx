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
  vat_rate: number;
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
      { name: 'Main d\'œuvre tonte', item_type: 'main_oeuvre', unit: 'h', unit_price_ht: 35, vat_rate: 10, total_ht: 0 },
      { name: 'Passage tondeuse', item_type: 'fourniture', unit: 'm²', unit_price_ht: 0.08, vat_rate: 10, total_ht: 0 },
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
      { name: 'Main d\'œuvre taille haie', item_type: 'main_oeuvre', unit: 'h', unit_price_ht: 38, vat_rate: 10, total_ht: 0 },
      { name: 'Matériel de taille', item_type: 'location', unit: 'j', unit_price_ht: 45, vat_rate: 20, total_ht: 0 },
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
      { name: 'Transport benne déchets verts', item_type: 'location', unit: 'passage', unit_price_ht: 180, vat_rate: 20, total_ht: 0 },
      { name: 'Éco-taxe déchets verts', item_type: 'fourniture', unit: 'T', unit_price_ht: 65, vat_rate: 20, total_ht: 0 },
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
      { name: 'Main d\'œuvre plantation', item_type: 'main_oeuvre', unit: 'h', unit_price_ht: 40, vat_rate: 10, total_ht: 0 },
      { name: 'Terreau plantation', item_type: 'materiau', unit: 'sac', unit_price_ht: 8.5, vat_rate: 10, total_ht: 0 },
      { name: 'Engrais de fond', item_type: 'materiau', unit: 'kg', unit_price_ht: 3.2, vat_rate: 10, total_ht: 0 },
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
      { name: 'Main d\'œuvre terrassement', item_type: 'main_oeuvre', unit: 'h', unit_price_ht: 45, vat_rate: 10, total_ht: 0 },
      { name: 'Location mini-pelle', item_type: 'location', unit: 'j', unit_price_ht: 280, vat_rate: 20, total_ht: 0 },
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
      { name: 'Main d\'œuvre installation arrosage', item_type: 'main_oeuvre', unit: 'h', unit_price_ht: 42, vat_rate: 10, total_ht: 0 },
      { name: 'Tuyaux goutte-à-goutte', item_type: 'materiau', unit: 'ml', unit_price_ht: 1.8, vat_rate: 10, total_ht: 0 },
      { name: 'Programmateur arrosage', item_type: 'fourniture', unit: 'u', unit_price_ht: 95, vat_rate: 10, total_ht: 0 },
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
      { name: 'Semences gazon', item_type: 'materiau', unit: 'kg', unit_price_ht: 6.5, vat_rate: 10, total_ht: 0 },
      { name: 'Main d\'œuvre ensemencement', item_type: 'main_oeuvre', unit: 'h', unit_price_ht: 38, vat_rate: 10, total_ht: 0 },
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
      { name: 'Main d\'œuvre pose dallage', item_type: 'main_oeuvre', unit: 'h', unit_price_ht: 48, vat_rate: 10, total_ht: 0 },
      { name: 'Dalles béton 40x40', item_type: 'materiau', unit: 'm²', unit_price_ht: 12, vat_rate: 10, total_ht: 0 },
      { name: 'Sable de pose', item_type: 'materiau', unit: 'T', unit_price_ht: 45, vat_rate: 10, total_ht: 0 },
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
  const total_tva = items.reduce((sum, i) => sum + i.total_ht * (i.vat_rate / 100), 0);
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

      // Fix bug 4: check for authenticated user
      if (!user) {
        setError('Utilisateur non authentifié');
        setIsLoading(false);
        return;
      }

      // Fix bug 1: use 'id' not 'auth_user_id'
      const { data: profile } = await supabase
        .from('user_profile')
        .select('company_id')
        .eq('id', user.id)
        .single();

      const companyId = profile?.company_id;

      // Fix bug 2: removed 'created_by' column (does not exist in ai_agent_run)
      const { data: agentRun, error: runError } = await supabase
        .from('ai_agent_run')
        .insert({
          company_id: companyId,
          agent_type: 'devis_assist' as const,
          input_data: { text: inputText },
          status: 'running',
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
          // Fix bug 3: removed 'error_message' column, store error in output_data
          await supabase
            .from('ai_agent_run')
            .update({
              status: 'error',
              output_data: { error: 'Aucune prestation détectée', prestations: [] },
            })
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
        await supabase
          .from('ai_proposal')
          .insert({
            company_id: companyId,
            agent_run_id: agentRun.id,
            entity_type: 'quote',
            entity_id: null,
            title: `Pré-devis IA : ${result.object}`,
            description: inputText,
            action_data: {
              object: result.object,
              items: result.items,
              total_ht: result.total_ht,
              total_ttc: result.total_ttc,
            },
            confidence_score: result.confidence_score / 100,
            is_accepted: false,
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

  const handleCreateQuote = () => {
    if (!analysis) return;
    // Navigate to quote creation with pre-filled data
    router.push('/dashboard/documents/devis/nouveau');
  };

  const exampleTexts = [
    'Tonte de gazon sur 200m², taille de haie 30ml et évacuation des déchets verts',
    'Terrassement et nivellement d\'une zone de 80m² avec plantation de 10 arbres',
    'Installation système d\'arrosage goutte-à-goutte et engazonnement 150m²',
    'Dallage terrasse 40m² avec allée pavée 20m²',
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2.5 rounded-xl bg-violet-100 dark:bg-violet-900/30">
          <Sparkles className="h-6 w-6 text-violet-600 dark:text-violet-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Devis assisté par IA</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Décrivez vos travaux en langage naturel, l\'IA génère automatiquement le devis
          </p>
        </div>
      </div>

      {/* Input Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-violet-500" />
            Décrivez vos travaux
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ex: Tonte de gazon sur 200m², taille de haie sur 30ml, évacuation des déchets verts..."
            className="min-h-[120px] resize-none text-sm"
          />

          {/* Example chips */}
          <div className="space-y-2">
            <p className="text-xs text-gray-500 font-medium">Exemples :</p>
            <div className="flex flex-wrap gap-2">
              {exampleTexts.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setInputText(ex)}
                  className="text-xs px-3 py-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:border-violet-300 hover:text-violet-600 dark:hover:text-violet-400 transition-colors"
                >
                  {ex.length > 60 ? ex.slice(0, 60) + '…' : ex}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleGenerate}
              disabled={isLoading || !inputText.trim()}
              className="gap-2 bg-violet-600 hover:bg-violet-700"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Analyse en cours…
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Générer le devis
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
          <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
        </div>
      )}

      {/* Analysis Result */}
      {analysis && (
        <div className="space-y-6">
          {/* Detected Prestations */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Prestations détectées
                </CardTitle>
                <ConfidenceBadge score={analysis.confidence_score} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {analysis.prestations.map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800"
                  >
                    <span className="text-violet-600 dark:text-violet-400">{p.icon}</span>
                    <span className="text-sm font-medium text-violet-700 dark:text-violet-300">{p.label}</span>
                    {p.quantity && p.unit && (
                      <Badge variant="outline" className="text-xs">
                        {p.quantity} {p.unit}
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Items Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-blue-500" />
                Détail des lignes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800">
                      <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Désignation</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Type</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Qté</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">PU HT</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">TVA</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-600 dark:text-gray-400">Total HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.items.map((item, i) => (
                      <tr
                        key={i}
                        className="border-b border-gray-50 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">{item.name}</td>
                        <td className="px-4 py-3">
                          <span className={cn('text-xs px-2 py-0.5 rounded-full font-medium', getItemTypeBadgeColor(item.item_type))}>
                            {getItemTypeLabel(item.item_type)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-700 dark:text-gray-300">
                          {formatCurrency(item.unit_price_ht)}
                        </td>
                        <td className="px-4 py-3 text-right text-gray-500">{item.vat_rate}%</td>
                        <td className="px-4 py-3 text-right font-medium text-gray-900 dark:text-gray-100">
                          {formatCurrency(item.total_ht)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Totals */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-end gap-2 text-sm">
                <div className="flex justify-between w-full max-w-xs">
                  <span className="text-gray-500">Total HT</span>
                  <span className="font-medium">{formatCurrency(analysis.total_ht)}</span>
                </div>
                <div className="flex justify-between w-full max-w-xs">
                  <span className="text-gray-500">Total TVA</span>
                  <span className="font-medium">{formatCurrency(analysis.total_tva)}</span>
                </div>
                <Separator className="w-full max-w-xs" />
                <div className="flex justify-between w-full max-w-xs">
                  <span className="font-semibold text-gray-900 dark:text-gray-100">Total TTC</span>
                  <span className="font-bold text-lg text-violet-600 dark:text-violet-400">
                    {formatCurrency(analysis.total_ttc)}
                  </span>
                </div>
                <div className="flex justify-between w-full max-w-xs mt-1">
                  <span className="text-gray-500">Marge estimée</span>
                  <Badge variant="outline" className="text-emerald-600 border-emerald-200">
                    ~{analysis.margin_percent}%
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setAnalysis(null);
                setInputText('');
              }}
            >
              Recommencer
            </Button>
            <Button
              onClick={handleCreateQuote}
              className="gap-2 bg-violet-600 hover:bg-violet-700"
            >
              Créer le devis
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
