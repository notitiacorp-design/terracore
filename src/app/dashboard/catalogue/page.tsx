'use client';

import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ItemRow, ItemFamilyRow, WorkUnitRow, WorkUnitLineRow, ItemType } from '@/types/database';
import { cn, formatCurrency } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  Search,
  Upload,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Folder,
  Package,
  Wrench,
  X,
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────────────────────

type ItemWithFamily = ItemRow & { family_name?: string | null };
type WorkUnitWithLines = WorkUnitRow & { lines?: (WorkUnitLineRow & { item_name?: string })[] };

// ── Schemas ────────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  description: z.string().optional(),
  family_id: z.string().optional().nullable(),
  item_type: z.enum(['materiau', 'main_oeuvre', 'fourniture', 'location'] as const),
  unit: z.string().min(1, 'Unité requise'),
  purchase_price_ht: z.coerce.number().min(0, 'Prix achat invalide'),
  coefficient: z.coerce.number().min(0, 'Coefficient invalide'),
  tva_rate: z.coerce.number().min(0),
  is_active: z.boolean(),
});

type ItemFormData = z.infer<typeof itemSchema>;

const workUnitSchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  description: z.string().optional(),
  unit: z.string().min(1, 'Unité requise'),
  selling_price_ht: z.coerce.number().min(0),
  tva_rate: z.coerce.number().min(0),
  margin_target: z.coerce.number().min(0).max(100).optional().nullable(),
  is_active: z.boolean(),
});

type WorkUnitFormData = z.infer<typeof workUnitSchema>;

const familySchema = z.object({
  name: z.string().min(1, 'Nom requis'),
  parent_id: z.string().optional().nullable(),
  sort_order: z.coerce.number().optional(),
});

type FamilyFormData = z.infer<typeof familySchema>;

// ── Constants ──────────────────────────────────────────────────────────────────

const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  materiau: 'Matériau',
  main_oeuvre: 'Main d\'œuvre',
  fourniture: 'Fourniture',
  location: 'Location',
};

const ITEM_TYPE_COLORS: Record<ItemType, string> = {
  materiau: 'bg-blue-100 text-blue-800',
  main_oeuvre: 'bg-orange-100 text-orange-800',
  fourniture: 'bg-purple-100 text-purple-800',
  location: 'bg-yellow-100 text-yellow-800',
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CataloguePage() {
  const supabase = createClient();
  const [activeTab, setActiveTab] = useState('articles');

  // ── Items State ──
  const [items, setItems] = useState<ItemWithFamily[]>([]);
  const [itemsLoading, setItemsLoading] = useState(true);
  const [itemSearch, setItemSearch] = useState('');
  const [itemFamilyFilter, setItemFamilyFilter] = useState<string>('all');
  const [itemTypeFilter, setItemTypeFilter] = useState<string>('all');
  const [itemActiveFilter, setItemActiveFilter] = useState<boolean | 'all'>('all');
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemWithFamily | null>(null);
  const [deletingItemId, setDeletingItemId] = useState<string | null>(null);

  // ── Work Units State ──
  const [workUnits, setWorkUnits] = useState<WorkUnitWithLines[]>([]);
  const [workUnitsLoading, setWorkUnitsLoading] = useState(true);
  const [expandedWorkUnits, setExpandedWorkUnits] = useState<Set<string>>(new Set());
  const [workUnitDialogOpen, setWorkUnitDialogOpen] = useState(false);
  const [editingWorkUnit, setEditingWorkUnit] = useState<WorkUnitWithLines | null>(null);
  const [deletingWorkUnitId, setDeletingWorkUnitId] = useState<string | null>(null);

  // ── Families State ──
  const [families, setFamilies] = useState<ItemFamilyRow[]>([]);
  const [familiesLoading, setFamiliesLoading] = useState(true);
  const [familyDialogOpen, setFamilyDialogOpen] = useState(false);
  const [editingFamily, setEditingFamily] = useState<ItemFamilyRow | null>(null);
  const [deletingFamilyId, setDeletingFamilyId] = useState<string | null>(null);

  // ── Company ──
  const [companyId, setCompanyId] = useState<string | null>(null);

  // ── Load company ──
  useEffect(() => {
    const loadCompany = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('user_profile')
        .select('company_id')
        .eq('auth_user_id', user.id)
        .single();
      if (data) setCompanyId(data.company_id);
    };
    loadCompany();
  }, []);

  // ── Load families ──
  const loadFamilies = useCallback(async () => {
    if (!companyId) return;
    setFamiliesLoading(true);
    const { data, error } = await supabase
      .from('item_family')
      .select('*')
      .eq('company_id', companyId)
      .order('sort_order', { ascending: true });
    if (error) toast.error('Erreur chargement familles');
    else setFamilies(data ?? []);
    setFamiliesLoading(false);
  }, [companyId]);

  // ── Load items ──
  const loadItems = useCallback(async () => {
    if (!companyId) return;
    setItemsLoading(true);
    const { data, error } = await supabase
      .from('item')
      .select('*, item_family(name)')
      .eq('company_id', companyId)
      .order('name', { ascending: true });
    if (error) toast.error('Erreur chargement articles');
    else {
      setItems(
        (data ?? []).map((item: any) => ({
          ...item,
          family_name: item.item_family?.name ?? null,
        }))
      );
    }
    setItemsLoading(false);
  }, [companyId]);

  // ── Load work units ──
  const loadWorkUnits = useCallback(async () => {
    if (!companyId) return;
    setWorkUnitsLoading(true);
    const { data, error } = await supabase
      .from('work_unit')
      .select('*')
      .eq('company_id', companyId)
      .order('name', { ascending: true });
    if (error) toast.error('Erreur chargement ouvrages');
    else setWorkUnits((data ?? []).map((wu: WorkUnitRow) => ({ ...wu, lines: [] })));
    setWorkUnitsLoading(false);
  }, [companyId]);

  useEffect(() => {
    if (companyId) {
      loadFamilies();
      loadItems();
      loadWorkUnits();
    }
  }, [companyId, loadFamilies, loadItems, loadWorkUnits]);

  // ── Load work unit lines ──
  const loadWorkUnitLines = useCallback(
    async (workUnitId: string) => {
      const { data, error } = await supabase
        .from('work_unit_line')
        .select('*, item(name)')
        .eq('work_unit_id', workUnitId);
      if (error) {
        toast.error('Erreur chargement lignes ouvrage');
        return;
      }
      setWorkUnits((prev) =>
        prev.map((wu) =>
          wu.id === workUnitId
            ? {
                ...wu,
                lines: (data ?? []).map((l: any) => ({ ...l, item_name: l.item?.name ?? '' })),
              }
            : wu
        )
      );
    },
    []
  );

  // ── Filtered items ──
  const filteredItems = items.filter((item) => {
    const matchSearch =
      !itemSearch ||
      item.name.toLowerCase().includes(itemSearch.toLowerCase()) ||
      (item.description ?? '').toLowerCase().includes(itemSearch.toLowerCase());
    const matchFamily = itemFamilyFilter === 'all' || item.family_id === itemFamilyFilter;
    const matchType = itemTypeFilter === 'all' || item.item_type === itemTypeFilter;
    const matchActive =
      itemActiveFilter === 'all' || item.is_active === itemActiveFilter;
    return matchSearch && matchFamily && matchType && matchActive;
  });

  // ── Compute margin ──
  const computeMargin = (purchaseHt: number, sellingHt: number): string => {
    if (sellingHt <= 0) return '—';
    const margin = ((sellingHt - purchaseHt) / sellingHt) * 100;
    return `${margin.toFixed(1)}%`;
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-white">
      {/* Header */}
      <div className="bg-[#16213e] border-b border-white/10 px-4 py-4 md:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Catalogue</h1>
            <p className="text-sm text-white/60">Articles, ouvrages et familles</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-white/20 text-white hover:bg-white/10 min-h-[48px] gap-2"
            onClick={() => toast.info('Import CSV — fonctionnalité à venir')}
          >
            <Upload className="h-4 w-4" />
            Importer CSV
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-4 md:px-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-[#16213e] border border-white/10 mb-6">
            <TabsTrigger
              value="articles"
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-white/70 min-h-[48px] px-6"
            >
              <Package className="h-4 w-4 mr-2" />
              Articles
            </TabsTrigger>
            <TabsTrigger
              value="ouvrages"
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-white/70 min-h-[48px] px-6"
            >
              <Wrench className="h-4 w-4 mr-2" />
              Ouvrages
            </TabsTrigger>
            <TabsTrigger
              value="familles"
              className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white text-white/70 min-h-[48px] px-6"
            >
              <FolderOpen className="h-4 w-4 mr-2" />
              Familles
            </TabsTrigger>
          </TabsList>

          {/* ── ARTICLES TAB ── */}
          <TabsContent value="articles">
            <ArticlesTab
              items={filteredItems}
              allItems={items}
              families={families}
              loading={itemsLoading}
              itemSearch={itemSearch}
              setItemSearch={setItemSearch}
              itemFamilyFilter={itemFamilyFilter}
              setItemFamilyFilter={setItemFamilyFilter}
              itemTypeFilter={itemTypeFilter}
              setItemTypeFilter={setItemTypeFilter}
              itemActiveFilter={itemActiveFilter}
              setItemActiveFilter={setItemActiveFilter}
              onNew={() => { setEditingItem(null); setItemDialogOpen(true); }}
              onEdit={(item) => { setEditingItem(item); setItemDialogOpen(true); }}
              onDelete={(id) => setDeletingItemId(id)}
              computeMargin={computeMargin}
            />
          </TabsContent>

          {/* ── OUVRAGES TAB ── */}
          <TabsContent value="ouvrages">
            <OuvragesTab
              workUnits={workUnits}
              loading={workUnitsLoading}
              expandedWorkUnits={expandedWorkUnits}
              setExpandedWorkUnits={setExpandedWorkUnits}
              onLoadLines={loadWorkUnitLines}
              onNew={() => { setEditingWorkUnit(null); setWorkUnitDialogOpen(true); }}
              onEdit={(wu) => { setEditingWorkUnit(wu); setWorkUnitDialogOpen(true); }}
              onDelete={(id) => setDeletingWorkUnitId(id)}
            />
          </TabsContent>

          {/* ── FAMILLES TAB ── */}
          <TabsContent value="familles">
            <FamillesTab
              families={families}
              loading={familiesLoading}
              onNew={() => { setEditingFamily(null); setFamilyDialogOpen(true); }}
              onEdit={(f) => { setEditingFamily(f); setFamilyDialogOpen(true); }}
              onDelete={(id) => setDeletingFamilyId(id)}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* ── ITEM DIALOG ── */}
      {itemDialogOpen && (
        <ItemDialog
          open={itemDialogOpen}
          onClose={() => setItemDialogOpen(false)}
          editingItem={editingItem}
          families={families}
          companyId={companyId!}
          onSaved={() => { setItemDialogOpen(false); loadItems(); }}
        />
      )}

      {/* ── WORK UNIT DIALOG ── */}
      {workUnitDialogOpen && (
        <WorkUnitDialog
          open={workUnitDialogOpen}
          onClose={() => setWorkUnitDialogOpen(false)}
          editingWorkUnit={editingWorkUnit}
          companyId={companyId!}
          onSaved={() => { setWorkUnitDialogOpen(false); loadWorkUnits(); }}
        />
      )}

      {/* ── FAMILY DIALOG ── */}
      {familyDialogOpen && (
        <FamilyDialog
          open={familyDialogOpen}
          onClose={() => setFamilyDialogOpen(false)}
          editingFamily={editingFamily}
          families={families}
          companyId={companyId!}
          onSaved={() => { setFamilyDialogOpen(false); loadFamilies(); }}
        />
      )}

      {/* ── DELETE ITEM CONFIRM ── */}
      <DeleteConfirm
        open={!!deletingItemId}
        title="Supprimer l'article ?"
        description="Cette action est irréversible. L'article sera définitivement supprimé."
        onCancel={() => setDeletingItemId(null)}
        onConfirm={async () => {
          if (!deletingItemId) return;
          const { error } = await supabase.from('item').delete().eq('id', deletingItemId);
          if (error) toast.error('Erreur suppression article');
          else { toast.success('Article supprimé'); loadItems(); }
          setDeletingItemId(null);
        }}
      />

      {/* ── DELETE WORK UNIT CONFIRM ── */}
      <DeleteConfirm
        open={!!deletingWorkUnitId}
        title="Supprimer l'ouvrage ?"
        description="Cette action est irréversible. L'ouvrage et ses lignes seront supprimés."
        onCancel={() => setDeletingWorkUnitId(null)}
        onConfirm={async () => {
          if (!deletingWorkUnitId) return;
          const { error } = await supabase.from('work_unit').delete().eq('id', deletingWorkUnitId);
          if (error) toast.error('Erreur suppression ouvrage');
          else { toast.success('Ouvrage supprimé'); loadWorkUnits(); }
          setDeletingWorkUnitId(null);
        }}
      />

      {/* ── DELETE FAMILY CONFIRM ── */}
      <DeleteConfirm
        open={!!deletingFamilyId}
        title="Supprimer la famille ?"
        description="Cette action est irréversible. Les articles liés ne seront pas supprimés mais n'auront plus de famille."
        onCancel={() => setDeletingFamilyId(null)}
        onConfirm={async () => {
          if (!deletingFamilyId) return;
          const { error } = await supabase.from('item_family').delete().eq('id', deletingFamilyId);
          if (error) toast.error('Erreur suppression famille');
          else { toast.success('Famille supprimée'); loadFamilies(); }
          setDeletingFamilyId(null);
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ARTICLES TAB
// ─────────────────────────────────────────────────────────────────────────────

interface ArticlesTabProps {
  items: ItemWithFamily[];
  allItems: ItemWithFamily[];
  families: ItemFamilyRow[];
  loading: boolean;
  itemSearch: string;
  setItemSearch: (v: string) => void;
  itemFamilyFilter: string;
  setItemFamilyFilter: (v: string) => void;
  itemTypeFilter: string;
  setItemTypeFilter: (v: string) => void;
  itemActiveFilter: boolean | 'all';
  setItemActiveFilter: (v: boolean | 'all') => void;
  onNew: () => void;
  onEdit: (item: ItemWithFamily) => void;
  onDelete: (id: string) => void;
  computeMargin: (p: number, s: number) => string;
}

function ArticlesTab({
  items,
  families,
  loading,
  itemSearch,
  setItemSearch,
  itemFamilyFilter,
  setItemFamilyFilter,
  itemTypeFilter,
  setItemTypeFilter,
  itemActiveFilter,
  setItemActiveFilter,
  onNew,
  onEdit,
  onDelete,
  computeMargin,
}: ArticlesTabProps) {
  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              placeholder="Rechercher un article…"
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              className="pl-9 bg-[#16213e] border-white/20 text-white placeholder:text-white/40 min-h-[48px] w-full sm:w-64"
            />
          </div>
          {/* Family filter */}
          <Select value={itemFamilyFilter} onValueChange={setItemFamilyFilter}>
            <SelectTrigger className="bg-[#16213e] border-white/20 text-white min-h-[48px] w-full sm:w-44">
              <SelectValue placeholder="Toutes les familles" />
            </SelectTrigger>
            <SelectContent className="bg-[#16213e] border-white/20 text-white">
              <SelectItem value="all">Toutes les familles</SelectItem>
              {families.map((f) => (
                <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Type filter */}
          <Select value={itemTypeFilter} onValueChange={setItemTypeFilter}>
            <SelectTrigger className="bg-[#16213e] border-white/20 text-white min-h-[48px] w-full sm:w-44">
              <SelectValue placeholder="Tous les types" />
            </SelectTrigger>
            <SelectContent className="bg-[#16213e] border-white/20 text-white">
              <SelectItem value="all">Tous les types</SelectItem>
              {(Object.entries(ITEM_TYPE_LABELS) as [ItemType, string][]).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Active filter */}
          <Select
            value={itemActiveFilter === 'all' ? 'all' : itemActiveFilter ? 'actif' : 'inactif'}
            onValueChange={(v) => {
              if (v === 'all') setItemActiveFilter('all');
              else setItemActiveFilter(v === 'actif');
            }}
          >
            <SelectTrigger className="bg-[#16213e] border-white/20 text-white min-h-[48px] w-full sm:w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#16213e] border-white/20 text-white">
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="actif">Actifs</SelectItem>
              <SelectItem value="inactif">Inactifs</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={onNew}
          className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[48px] gap-2"
        >
          <Plus className="h-4 w-4" />
          Nouvel article
        </Button>
      </div>

      {/* Count */}
      <p className="text-sm text-white/50">{items.length} article{items.length !== 1 ? 's' : ''}</p>

      {/* Table */}
      <div className="rounded-lg border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#16213e] border-white/10 hover:bg-[#16213e]">
                <TableHead className="text-white/60">Nom</TableHead>
                <TableHead className="text-white/60">Famille</TableHead>
                <TableHead className="text-white/60">Type</TableHead>
                <TableHead className="text-white/60">Unité</TableHead>
                <TableHead className="text-white/60 text-right">Prix achat HT</TableHead>
                <TableHead className="text-white/60 text-right">Coeff.</TableHead>
                <TableHead className="text-white/60 text-right">Prix vente HT</TableHead>
                <TableHead className="text-white/60 text-right">TVA</TableHead>
                <TableHead className="text-white/60 text-right">Marge</TableHead>
                <TableHead className="text-white/60 text-center">Actif</TableHead>
                <TableHead className="text-white/60 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i} className="border-white/10">
                    {Array.from({ length: 11 }).map((__, j) => (
                      <TableCell key={j}>
                        <Skeleton className="h-4 bg-white/10" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : items.length === 0 ? (
                <TableRow className="border-white/10">
                  <TableCell colSpan={11} className="text-center text-white/40 py-12">
                    Aucun article trouvé
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow
                    key={item.id}
                    className="border-white/10 hover:bg-white/5 cursor-pointer"
                    onClick={() => onEdit(item)}
                  >
                    <TableCell className="font-medium text-white">
                      <div>
                        <div>{item.name}</div>
                        {item.description && (
                          <div className="text-xs text-white/40 truncate max-w-[200px]">{item.description}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-white/70">{item.family_name ?? '—'}</TableCell>
                    <TableCell>
                      <Badge className={cn('text-xs', ITEM_TYPE_COLORS[item.item_type])}>
                        {ITEM_TYPE_LABELS[item.item_type]}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white/70">{item.unit}</TableCell>
                    <TableCell className="text-right text-white/70">
                      {formatCurrency(item.purchase_price_ht ?? 0)}
                    </TableCell>
                    <TableCell className="text-right text-white/70">{item.coefficient ?? '—'}</TableCell>
                    <TableCell className="text-right text-white font-medium">
                      {formatCurrency(item.selling_price_ht ?? 0)}
                    </TableCell>
                    <TableCell className="text-right text-white/70">{item.tva_rate}%</TableCell>
                    <TableCell className="text-right">
                      <span
                        className={cn(
                          'text-sm font-medium',
                          item.selling_price_ht && item.purchase_price_ht
                            ? ((item.selling_price_ht - item.purchase_price_ht) / item.selling_price_ht) * 100 >= 30
                              ? 'text-emerald-400'
                              : ((item.selling_price_ht - item.purchase_price_ht) / item.selling_price_ht) * 100 >= 15
                              ? 'text-yellow-400'
                              : 'text-red-400'
                            : 'text-white/40'
                        )}
                      >
                        {computeMargin(item.purchase_price_ht ?? 0, item.selling_price_ht ?? 0)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={cn(
                          'text-xs',
                          item.is_active
                            ? 'border-emerald-500 text-emerald-400'
                            : 'border-white/20 text-white/40'
                        )}
                      >
                        {item.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div
                        className="flex items-center justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
                          onClick={() => onEdit(item)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-400/60 hover:text-red-400 hover:bg-red-400/10"
                          onClick={() => onDelete(item.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// OUVRAGES TAB
// ─────────────────────────────────────────────────────────────────────────────

interface OuvragesTabProps {
  workUnits: WorkUnitWithLines[];
  loading: boolean;
  expandedWorkUnits: Set<string>;
  setExpandedWorkUnits: React.Dispatch<React.SetStateAction<Set<string>>>;
  onLoadLines: (id: string) => void;
  onNew: () => void;
  onEdit: (wu: WorkUnitWithLines) => void;
  onDelete: (id: string) => void;
}

function OuvragesTab({
  workUnits,
  loading,
  expandedWorkUnits,
  setExpandedWorkUnits,
  onLoadLines,
  onNew,
  onEdit,
  onDelete,
}: OuvragesTabProps) {
  const toggleExpand = (id: string) => {
    setExpandedWorkUnits((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        onLoadLines(id);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/50">{workUnits.length} ouvrage{workUnits.length !== 1 ? 's' : ''}</p>
        <Button
          onClick={onNew}
          className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[48px] gap-2"
        >
          <Plus className="h-4 w-4" />
          Nouvel ouvrage
        </Button>
      </div>

      <div className="rounded-lg border border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#16213e] border-white/10 hover:bg-[#16213e]">
                <TableHead className="text-white/60 w-8"></TableHead>
                <TableHead className="text-white/60">Nom</TableHead>
                <TableHead className="text-white/60">Description</TableHead>
                <TableHead className="text-white/60">Unité</TableHead>
                <TableHead className="text-white/60 text-right">Prix vente HT</TableHead>
                <TableHead className="text-white/60 text-right">TVA</TableHead>
                <TableHead className="text-white/60 text-right">Marge cible</TableHead>
                <TableHead className="text-white/60 text-center">Actif</TableHead>
                <TableHead className="text-white/60 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i} className="border-white/10">
                    {Array.from({ length: 9 }).map((__, j) => (
                      <TableCell key={j}><Skeleton className="h-4 bg-white/10" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : workUnits.length === 0 ? (
                <TableRow className="border-white/10">
                  <TableCell colSpan={9} className="text-center text-white/40 py-12">
                    Aucun ouvrage trouvé
                  </TableCell>
                </TableRow>
              ) : (
                workUnits.map((wu) => (
                  <>
                    <TableRow
                      key={wu.id}
                      className="border-white/10 hover:bg-white/5"
                    >
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-white/60 hover:text-white hover:bg-white/10"
                          onClick={() => toggleExpand(wu.id)}
                        >
                          {expandedWorkUnits.has(wu.id) ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium text-white">{wu.name}</TableCell>
                      <TableCell className="text-white/60 max-w-[200px] truncate">{wu.description ?? '—'}</TableCell>
                      <TableCell className="text-white/70">{wu.unit}</TableCell>
                      <TableCell className="text-right text-white font-medium">
                        {formatCurrency(wu.selling_price_ht ?? 0)}
                      </TableCell>
                      <TableCell className="text-right text-white/70">{wu.tva_rate}%</TableCell>
                      <TableCell className="text-right text-white/70">
                        {wu.margin_target != null ? `${wu.margin_target}%` : '—'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-xs',
                            wu.is_active
                              ? 'border-emerald-500 text-emerald-400'
                              : 'border-white/20 text-white/40'
                          )}
                        >
                          {wu.is_active ? 'Actif' : 'Inactif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
                            onClick={() => onEdit(wu)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-red-400/60 hover:text-red-400 hover:bg-red-400/10"
                            onClick={() => onDelete(wu.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    {expandedWorkUnits.has(wu.id) && (
                      <TableRow key={`${wu.id}-lines`} className="border-white/10 bg-[#16213e]/50">
                        <TableCell colSpan={9} className="py-0">
                          <div className="ml-8 py-3">
                            {!wu.lines || wu.lines.length === 0 ? (
                              <p className="text-sm text-white/40 italic">Aucune ligne de composition</p>
                            ) : (
                              <div className="space-y-1">
                                <p className="text-xs font-semibold text-white/50 uppercase tracking-wider mb-2">Composition</p>
                                <div className="grid grid-cols-4 gap-2 text-xs text-white/40 mb-1 px-2">
                                  <span>Article</span>
                                  <span className="text-right">Quantité</span>
                                  <span>Unité</span>
                                  <span></span>
                                </div>
                                {wu.lines.map((line) => (
                                  <div
                                    key={line.id}
                                    className="grid grid-cols-4 gap-2 text-sm text-white/70 bg-white/5 rounded px-2 py-1.5"
                                  >
                                    <span>{line.item_name}</span>
                                    <span className="text-right">{line.quantity}</span>
                                    <span>{line.unit}</span>
                                    <span></span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FAMILLES TAB
// ─────────────────────────────────────────────────────────────────────────────

interface FamillesTabProps {
  families: ItemFamilyRow[];
  loading: boolean;
  onNew: () => void;
  onEdit: (f: ItemFamilyRow) => void;
  onDelete: (id: string) => void;
}

function FamillesTab({ families, loading, onNew, onEdit, onDelete }: FamillesTabProps) {
  const roots = families.filter((f) => !f.parent_id);
  const children = (parentId: string) => families.filter((f) => f.parent_id === parentId);

  const renderFamily = (family: ItemFamilyRow, depth = 0): React.ReactNode => (
    <div key={family.id}>
      <div
        className={cn(
          'flex items-center justify-between rounded-lg px-4 py-3 hover:bg-white/5 group min-h-[56px]',
          depth > 0 && 'ml-6 border-l border-white/10'
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn('text-white/40', depth === 0 ? '' : 'ml-2')}>
            {children(family.id).length > 0 ? (
              <FolderOpen className="h-4 w-4" />
            ) : (
              <Folder className="h-4 w-4" />
            )}
          </div>
          <div>
            <span className="text-white font-medium">{family.name}</span>
            {family.sort_order != null && (
              <span className="ml-2 text-xs text-white/30">ordre: {family.sort_order}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10"
            onClick={() => onEdit(family)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-red-400/60 hover:text-red-400 hover:bg-red-400/10"
            onClick={() => onDelete(family.id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      {children(family.id).map((child) => renderFamily(child, depth + 1))}
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-white/50">{families.length} famille{families.length !== 1 ? 's' : ''}</p>
        <Button
          onClick={onNew}
          className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[48px] gap-2"
        >
          <Plus className="h-4 w-4" />
          Nouvelle famille
        </Button>
      </div>

      <div className="rounded-lg border border-white/10 bg-[#16213e]/50 p-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="mb-3">
              <Skeleton className="h-12 bg-white/10 rounded-lg" />
            </div>
          ))
        ) : families.length === 0 ? (
          <div className="text-center text-white/40 py-12">
            Aucune famille créée
          </div>
        ) : (
          roots.map((f) => renderFamily(f))
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// ITEM DIALOG
// ─────────────────────────────────────────────────────────────────────────────

interface ItemDialogProps {
  open: boolean;
  onClose: () => void;
  editingItem: ItemWithFamily | null;
  families: ItemFamilyRow[];
  companyId: string;
  onSaved: () => void;
}

function ItemDialog({ open, onClose, editingItem, families, companyId, onSaved }: ItemDialogProps) {
  const supabase = createClient();
  const isEditing = !!editingItem;

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      name: editingItem?.name ?? '',
      description: editingItem?.description ?? '',
      family_id: editingItem?.family_id ?? null,
      item_type: editingItem?.item_type ?? 'materiau',
      unit: editingItem?.unit ?? '',
      purchase_price_ht: editingItem?.purchase_price_ht ?? 0,
      coefficient: editingItem?.coefficient ?? 1,
      tva_rate: editingItem?.tva_rate ?? 20,
      is_active: editingItem?.is_active ?? true,
    },
  });

  const purchasePrice = watch('purchase_price_ht');
  const coefficient = watch('coefficient');
  const computedSellingPrice = (purchasePrice ?? 0) * (coefficient ?? 1);

  const onSubmit = async (data: ItemFormData) => {
    const payload = {
      ...data,
      selling_price_ht: computedSellingPrice,
      company_id: companyId,
      family_id: data.family_id || null,
    };

    if (isEditing && editingItem) {
      const { error } = await supabase
        .from('item')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editingItem.id);
      if (error) { toast.error('Erreur mise à jour article'); return; }
      toast.success('Article mis à jour');
    } else {
      const { error } = await supabase.from('item').insert(payload);
      if (error) { toast.error('Erreur création article'); return; }
      toast.success('Article créé');
    }
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isEditing ? 'Modifier l\'article' : 'Nouvel article'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {/* Name + Active */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-white/70">Nom *</Label>
              <Input
                {...register('name')}
                className="bg-[#16213e] border-white/20 text-white min-h-[48px]"
                placeholder="Nom de l'article"
              />
              {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70">Actif</Label>
              <div className="flex items-center gap-2 min-h-[48px]">
                <Controller
                  name="is_active"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-emerald-600"
                    />
                  )}
                />
                <span className="text-sm text-white/60">{watch('is_active') ? 'Actif' : 'Inactif'}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-white/70">Description</Label>
            <Input
              {...register('description')}
              className="bg-[#16213e] border-white/20 text-white min-h-[48px]"
              placeholder="Description optionnelle"
            />
          </div>

          {/* Family + Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-white/70">Famille</Label>
              <Controller
                name="family_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? 'none'} onValueChange={(v) => field.onChange(v === 'none' ? null : v)}>
                    <SelectTrigger className="bg-[#16213e] border-white/20 text-white min-h-[48px]">
                      <SelectValue placeholder="Sans famille" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#16213e] border-white/20 text-white">
                      <SelectItem value="none">Sans famille</SelectItem>
                      {families.map((f) => (
                        <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70">Type *</Label>
              <Controller
                name="item_type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="bg-[#16213e] border-white/20 text-white min-h-[48px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#16213e] border-white/20 text-white">
                      {(Object.entries(ITEM_TYPE_LABELS) as [ItemType, string][]).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.item_type && <p className="text-xs text-red-400">{errors.item_type.message}</p>}
            </div>
          </div>

          {/* Unit + TVA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-white/70">Unité *</Label>
              <Input
                {...register('unit')}
                className="bg-[#16213e] border-white/20 text-white min-h-[48px]"
                placeholder="ex: m², u, ml, kg…"
              />
              {errors.unit && <p className="text-xs text-red-400">{errors.unit.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70">Taux TVA (%)</Label>
              <Input
                {...register('tva_rate')}
                type="number"
                step="0.1"
                className="bg-[#16213e] border-white/20 text-white min-h-[48px]"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="rounded-lg border border-white/10 p-4 bg-[#16213e]/50 space-y-3">
            <p className="text-sm font-semibold text-white/70">Tarification</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-white/70">Prix achat HT (€)</Label>
                <Input
                  {...register('purchase_price_ht')}
                  type="number"
                  step="0.01"
                  className="bg-[#1a1a2e] border-white/20 text-white min-h-[48px]"
                />
                {errors.purchase_price_ht && <p className="text-xs text-red-400">{errors.purchase_price_ht.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/70">Coefficient</Label>
                <Input
                  {...register('coefficient')}
                  type="number"
                  step="0.01"
                  className="bg-[#1a1a2e] border-white/20 text-white min-h-[48px]"
                />
                {errors.coefficient && <p className="text-xs text-red-400">{errors.coefficient.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className="text-white/70">Prix vente HT (calculé)</Label>
                <div className="flex items-center min-h-[48px] px-3 rounded-md border border-emerald-500/30 bg-emerald-500/10">
                  <span className="text-emerald-400 font-semibold">
                    {formatCurrency(computedSellingPrice)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-white/20 text-white hover:bg-white/10 min-h-[48px]"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[48px]"
            >
              {isSubmitting ? 'Enregistrement…' : isEditing ? 'Mettre à jour' : 'Créer l\'article'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// WORK UNIT DIALOG
// ─────────────────────────────────────────────────────────────────────────────

interface WorkUnitDialogProps {
  open: boolean;
  onClose: () => void;
  editingWorkUnit: WorkUnitWithLines | null;
  companyId: string;
  onSaved: () => void;
}

function WorkUnitDialog({ open, onClose, editingWorkUnit, companyId, onSaved }: WorkUnitDialogProps) {
  const supabase = createClient();
  const isEditing = !!editingWorkUnit;

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<WorkUnitFormData>({
    resolver: zodResolver(workUnitSchema),
    defaultValues: {
      name: editingWorkUnit?.name ?? '',
      description: editingWorkUnit?.description ?? '',
      unit: editingWorkUnit?.unit ?? '',
      selling_price_ht: editingWorkUnit?.selling_price_ht ?? 0,
      tva_rate: editingWorkUnit?.tva_rate ?? 20,
      margin_target: editingWorkUnit?.margin_target ?? null,
      is_active: editingWorkUnit?.is_active ?? true,
    },
  });

  const onSubmit = async (data: WorkUnitFormData) => {
    const payload = {
      ...data,
      company_id: companyId,
      margin_target: data.margin_target ?? null,
    };

    if (isEditing && editingWorkUnit) {
      const { error } = await supabase
        .from('work_unit')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', editingWorkUnit.id);
      if (error) { toast.error('Erreur mise à jour ouvrage'); return; }
      toast.success('Ouvrage mis à jour');
    } else {
      const { error } = await supabase.from('work_unit').insert(payload);
      if (error) { toast.error('Erreur création ouvrage'); return; }
      toast.success('Ouvrage créé');
    }
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isEditing ? 'Modifier l\'ouvrage' : 'Nouvel ouvrage'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          {/* Name + Active */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1.5">
              <Label className="text-white/70">Nom *</Label>
              <Input
                {...register('name')}
                className="bg-[#16213e] border-white/20 text-white min-h-[48px]"
                placeholder="Nom de l'ouvrage"
              />
              {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70">Actif</Label>
              <div className="flex items-center gap-2 min-h-[48px]">
                <Controller
                  name="is_active"
                  control={control}
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="data-[state=checked]:bg-emerald-600"
                    />
                  )}
                />
                <span className="text-sm text-white/60">{watch('is_active') ? 'Actif' : 'Inactif'}</span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-white/70">Description</Label>
            <Input
              {...register('description')}
              className="bg-[#16213e] border-white/20 text-white min-h-[48px]"
              placeholder="Description de l'ouvrage"
            />
          </div>

          {/* Unit + TVA */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-white/70">Unité *</Label>
              <Input
                {...register('unit')}
                className="bg-[#16213e] border-white/20 text-white min-h-[48px]"
                placeholder="ex: m², u, ml…"
              />
              {errors.unit && <p className="text-xs text-red-400">{errors.unit.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70">Taux TVA (%)</Label>
              <Input
                {...register('tva_rate')}
                type="number"
                step="0.1"
                className="bg-[#16213e] border-white/20 text-white min-h-[48px]"
              />
            </div>
          </div>

          {/* Pricing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-white/70">Prix vente HT (€)</Label>
              <Input
                {...register('selling_price_ht')}
                type="number"
                step="0.01"
                className="bg-[#16213e] border-white/20 text-white min-h-[48px]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-white/70">Marge cible (%)</Label>
              <Input
                {...register('margin_target')}
                type="number"
                step="0.1"
                min="0"
                max="100"
                className="bg-[#16213e] border-white/20 text-white min-h-[48px]"
                placeholder="ex: 35"
              />
              {errors.margin_target && <p className="text-xs text-red-400">{errors.margin_target.message}</p>}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-white/20 text-white hover:bg-white/10 min-h-[48px]"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[48px]"
            >
              {isSubmitting ? 'Enregistrement…' : isEditing ? 'Mettre à jour' : 'Créer l\'ouvrage'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// FAMILY DIALOG
// ─────────────────────────────────────────────────────────────────────────────

interface FamilyDialogProps {
  open: boolean;
  onClose: () => void;
  editingFamily: ItemFamilyRow | null;
  families: ItemFamilyRow[];
  companyId: string;
  onSaved: () => void;
}

function FamilyDialog({ open, onClose, editingFamily, families, companyId, onSaved }: FamilyDialogProps) {
  const supabase = createClient();
  const isEditing = !!editingFamily;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<FamilyFormData>({
    resolver: zodResolver(familySchema),
    defaultValues: {
      name: editingFamily?.name ?? '',
      parent_id: editingFamily?.parent_id ?? null,
      sort_order: editingFamily?.sort_order ?? 0,
    },
  });

  const availableParents = families.filter((f) => f.id !== editingFamily?.id);

  const onSubmit = async (data: FamilyFormData) => {
    const payload = {
      name: data.name,
      parent_id: data.parent_id || null,
      sort_order: data.sort_order ?? 0,
      company_id: companyId,
    };

    if (isEditing && editingFamily) {
      const { error } = await supabase
        .from('item_family')
        .update(payload)
        .eq('id', editingFamily.id);
      if (error) { toast.error('Erreur mise à jour famille'); return; }
      toast.success('Famille mise à jour');
    } else {
      const { error } = await supabase.from('item_family').insert(payload);
      if (error) { toast.error('Erreur création famille'); return; }
      toast.success('Famille créée');
    }
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-[#1a1a2e] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">
            {isEditing ? 'Modifier la famille' : 'Nouvelle famille'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-2">
          <div className="space-y-1.5">
            <Label className="text-white/70">Nom *</Label>
            <Input
              {...register('name')}
              className="bg-[#16213e] border-white/20 text-white min-h-[48px]"
              placeholder="Nom de la famille"
            />
            {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/70">Famille parente</Label>
            <Controller
              name="parent_id"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? 'none'} onValueChange={(v) => field.onChange(v === 'none' ? null : v)}>
                  <SelectTrigger className="bg-[#16213e] border-white/20 text-white min-h-[48px]">
                    <SelectValue placeholder="Aucune (racine)" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#16213e] border-white/20 text-white">
                    <SelectItem value="none">Aucune (racine)</SelectItem>
                    {availableParents.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-white/70">Ordre d'affichage</Label>
            <Input
              {...register('sort_order')}
              type="number"
              className="bg-[#16213e] border-white/20 text-white min-h-[48px]"
              placeholder="0"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="border-white/20 text-white hover:bg-white/10 min-h-[48px]"
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[48px]"
            >
              {isSubmitting ? 'Enregistrement…' : isEditing ? 'Mettre à jour' : 'Créer la famille'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE CONFIRM
// ─────────────────────────────────────────────────────────────────────────────

interface DeleteConfirmProps {
  open: boolean;
  title: string;
  description: string;
  onCancel: () => void;
  onConfirm: () => void;
}

function DeleteConfirm({ open, title, description, onCancel, onConfirm }: DeleteConfirmProps) {
  return (
    <AlertDialog open={open} onOpenChange={(v) => { if (!v) onCancel(); }}>
      <AlertDialogContent className="bg-[#1a1a2e] border-white/10 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-white">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-white/60">{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel
            onClick={onCancel}
            className="border-white/20 text-white hover:bg-white/10 bg-transparent min-h-[48px]"
          >
            Annuler
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700 text-white min-h-[48px]"
          >
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
