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
type WorkUnitWithLines = WorkUnitRow & { lines?: (WorkUnitLineRow & { item_label?: string })[] };

// ── Schemas ────────────────────────────────────────────────────────────────────

const itemSchema = z.object({
  label: z.string().min(1, 'Nom requis'),
  description: z.string().optional(),
  family_id: z.string().optional().nullable(),
  item_type: z.enum(['materiau', 'main_oeuvre', 'fourniture', 'location'] as const),
  unit: z.string().min(1, 'Unité requise'),
  purchase_price_ht: z.coerce.number().min(0, 'Prix achat invalide'),
  unit_price_ht: z.coerce.number().min(0, 'Prix vente invalide'),
  vat_rate: z.coerce.number().min(0),
  is_active: z.boolean(),
});

type ItemFormData = z.infer<typeof itemSchema>;

const workUnitSchema = z.object({
  label: z.string().min(1, 'Nom requis'),
  description: z.string().optional(),
  unit: z.string().min(1, 'Unité requise'),
  total_price_ht: z.coerce.number().min(0),
  vat_rate: z.coerce.number().min(0),
  margin_percent: z.coerce.number().min(0).max(100).optional().nullable(),
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
      // FIX 1: user_profile PK 'id' references auth.users(id) — no auth_user_id column
      const { data } = await supabase
        .from('user_profile')
        .select('company_id')
        .eq('id', user.id)
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
    // FIX 2: item table uses 'label' not 'name'; order by 'label'
    const { data, error } = await supabase
      .from('item')
      .select('*, item_family(name)')
      .eq('company_id', companyId)
      .order('label', { ascending: true });
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
    // FIX 6: work_unit uses 'label' not 'name'; order by 'label'
    const { data, error } = await supabase
      .from('work_unit')
      .select('*')
      .eq('company_id', companyId)
      .order('label', { ascending: true });
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
      // FIX 8: item table uses 'label' not 'name'
      const { data, error } = await supabase
        .from('work_unit_line')
        .select('*, item(label)')
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
                // FIX 9: use l.item?.label instead of l.item?.name
                lines: (data ?? []).map((l: any) => ({ ...l, item_label: l.item?.label ?? '' })),
              }
            : wu
        )
      );
    },
    []
  );

  // ── Filtered items ──
  const filteredItems = items.filter((item) => {
    // FIX 3 & 4: item.label not item.name
    const matchSearch =
      !itemSearch ||
      item.label.toLowerCase().includes(itemSearch.toLowerCase()) ||
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
      <AlertDialog open={!!deletingItemId} onOpenChange={(open) => { if (!open) setDeletingItemId(null); }}>
        <AlertDialogContent className="bg-[#16213e] border border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l&apos;article ?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                if (!deletingItemId) return;
                const supabaseClient = createClient();
                const { error } = await supabaseClient.from('item').delete().eq('id', deletingItemId);
                if (error) toast.error('Erreur suppression article');
                else { toast.success('Article supprimé'); loadItems(); }
                setDeletingItemId(null);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── DELETE WORK UNIT CONFIRM ── */}
      <AlertDialog open={!!deletingWorkUnitId} onOpenChange={(open) => { if (!open) setDeletingWorkUnitId(null); }}>
        <AlertDialogContent className="bg-[#16213e] border border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l&apos;ouvrage ?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                if (!deletingWorkUnitId) return;
                const supabaseClient = createClient();
                const { error } = await supabaseClient.from('work_unit').delete().eq('id', deletingWorkUnitId);
                if (error) toast.error('Erreur suppression ouvrage');
                else { toast.success('Ouvrage supprimé'); loadWorkUnits(); }
                setDeletingWorkUnitId(null);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── DELETE FAMILY CONFIRM ── */}
      <AlertDialog open={!!deletingFamilyId} onOpenChange={(open) => { if (!open) setDeletingFamilyId(null); }}>
        <AlertDialogContent className="bg-[#16213e] border border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la famille ?</AlertDialogTitle>
            <AlertDialogDescription className="text-white/60">
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/20 text-white hover:bg-white/10">Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={async () => {
                if (!deletingFamilyId) return;
                const supabaseClient = createClient();
                const { error } = await supabaseClient.from('item_family').delete().eq('id', deletingFamilyId);
                if (error) toast.error('Erreur suppression famille');
                else { toast.success('Famille supprimée'); loadFamilies(); }
                setDeletingFamilyId(null);
              }}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ── ArticlesTab ───────────────────────────────────────────────────────────────

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
  computeMargin: (purchaseHt: number, sellingHt: number) => string;
}

function ArticlesTab({
  items,
  allItems,
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
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <Input
              placeholder="Rechercher un article..."
              value={itemSearch}
              onChange={(e) => setItemSearch(e.target.value)}
              className="pl-9 bg-[#16213e] border-white/20 text-white placeholder:text-white/40 min-h-[44px]"
            />
          </div>
          <Select value={itemFamilyFilter} onValueChange={setItemFamilyFilter}>
            <SelectTrigger className="w-[160px] bg-[#16213e] border-white/20 text-white min-h-[44px]">
              <SelectValue placeholder="Famille" />
            </SelectTrigger>
            <SelectContent className="bg-[#16213e] border-white/20">
              <SelectItem value="all" className="text-white">Toutes familles</SelectItem>
              {families.map((f) => (
                <SelectItem key={f.id} value={f.id} className="text-white">{f.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={itemTypeFilter} onValueChange={setItemTypeFilter}>
            <SelectTrigger className="w-[160px] bg-[#16213e] border-white/20 text-white min-h-[44px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent className="bg-[#16213e] border-white/20">
              <SelectItem value="all" className="text-white">Tous types</SelectItem>
              {(Object.entries(ITEM_TYPE_LABELS) as [ItemType, string][]).map(([k, v]) => (
                <SelectItem key={k} value={k} className="text-white">{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={itemActiveFilter === 'all' ? 'all' : itemActiveFilter ? 'active' : 'inactive'}
            onValueChange={(v) => setItemActiveFilter(v === 'all' ? 'all' : v === 'active')}
          >
            <SelectTrigger className="w-[140px] bg-[#16213e] border-white/20 text-white min-h-[44px]">
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent className="bg-[#16213e] border-white/20">
              <SelectItem value="all" className="text-white">Tous</SelectItem>
              <SelectItem value="active" className="text-white">Actifs</SelectItem>
              <SelectItem value="inactive" className="text-white">Inactifs</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={onNew}
          className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] gap-2"
        >
          <Plus className="h-4 w-4" />
          Nouvel article
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-white/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-white/60">Libellé</TableHead>
              <TableHead className="text-white/60">Type</TableHead>
              <TableHead className="text-white/60">Famille</TableHead>
              <TableHead className="text-white/60">Unité</TableHead>
              <TableHead className="text-white/60 text-right">Prix achat HT</TableHead>
              <TableHead className="text-white/60 text-right">Prix vente HT</TableHead>
              <TableHead className="text-white/60 text-right">Marge</TableHead>
              <TableHead className="text-white/60">Statut</TableHead>
              <TableHead className="text-white/60 w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i} className="border-white/10">
                  {Array.from({ length: 9 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full bg-white/10" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : items.length === 0 ? (
              <TableRow className="border-white/10">
                <TableCell colSpan={9} className="text-center text-white/40 py-12">
                  Aucun article trouvé
                </TableCell>
              </TableRow>
            ) : (
              items.map((item) => (
                <TableRow key={item.id} className="border-white/10 hover:bg-white/5">
                  {/* FIX: use item.label not item.name */}
                  <TableCell className="text-white font-medium">{item.label}</TableCell>
                  <TableCell>
                    <Badge className={cn('text-xs', ITEM_TYPE_COLORS[item.item_type as ItemType])}>
                      {ITEM_TYPE_LABELS[item.item_type as ItemType]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-white/70">{item.family_name ?? '—'}</TableCell>
                  <TableCell className="text-white/70">{item.unit}</TableCell>
                  <TableCell className="text-right text-white/70">
                    {formatCurrency(item.purchase_price_ht ?? 0)}
                  </TableCell>
                  <TableCell className="text-right text-white/70">
                    {formatCurrency(item.unit_price_ht ?? 0)}
                  </TableCell>
                  <TableCell className="text-right text-white/70">
                    {computeMargin(item.purchase_price_ht ?? 0, item.unit_price_ht ?? 0)}
                  </TableCell>
                  <TableCell>
                    <Badge className={item.is_active ? 'bg-emerald-600/20 text-emerald-400' : 'bg-white/10 text-white/40'}>
                      {item.is_active ? 'Actif' : 'Inactif'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
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
  );
}

// ── OuvragesTab ───────────────────────────────────────────────────────────────

interface OuvragesTabProps {
  workUnits: WorkUnitWithLines[];
  loading: boolean;
  expandedWorkUnits: Set<string>;
  setExpandedWorkUnits: React.Dispatch<React.SetStateAction<Set<string>>>;
  onLoadLines: (id: string) => Promise<void>;
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
  const toggleExpand = async (id: string) => {
    const next = new Set(expandedWorkUnits);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
      await onLoadLines(id);
    }
    setExpandedWorkUnits(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={onNew}
          className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] gap-2"
        >
          <Plus className="h-4 w-4" />
          Nouvel ouvrage
        </Button>
      </div>

      <div className="rounded-lg border border-white/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-white/60 w-[40px]"></TableHead>
              <TableHead className="text-white/60">Libellé</TableHead>
              <TableHead className="text-white/60">Unité</TableHead>
              {/* FIX 5: use total_price_ht not selling_price_ht */}
              <TableHead className="text-white/60 text-right">Prix HT</TableHead>
              {/* FIX 5: use margin_percent not margin_target */}
              <TableHead className="text-white/60 text-right">Marge %</TableHead>
              <TableHead className="text-white/60">Statut</TableHead>
              <TableHead className="text-white/60 w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i} className="border-white/10">
                  {Array.from({ length: 7 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full bg-white/10" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : workUnits.length === 0 ? (
              <TableRow className="border-white/10">
                <TableCell colSpan={7} className="text-center text-white/40 py-12">
                  Aucun ouvrage trouvé
                </TableCell>
              </TableRow>
            ) : (
              workUnits.map((wu) => (
                <>
                  <TableRow key={wu.id} className="border-white/10 hover:bg-white/5">
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-white/60 hover:text-white"
                        onClick={() => toggleExpand(wu.id)}
                      >
                        {expandedWorkUnits.has(wu.id)
                          ? <ChevronDown className="h-4 w-4" />
                          : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </TableCell>
                    {/* FIX 6: wu.label not wu.name */}
                    <TableCell className="text-white font-medium">{wu.label}</TableCell>
                    <TableCell className="text-white/70">{wu.unit}</TableCell>
                    {/* FIX 5: wu.total_price_ht not wu.selling_price_ht */}
                    <TableCell className="text-right text-white/70">{formatCurrency(wu.total_price_ht ?? 0)}</TableCell>
                    {/* FIX 5: wu.margin_percent not wu.margin_target */}
                    <TableCell className="text-right text-white/70">
                      {wu.margin_percent != null ? `${wu.margin_percent}%` : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={wu.is_active ? 'bg-emerald-600/20 text-emerald-400' : 'bg-white/10 text-white/40'}>
                        {wu.is_active ? 'Actif' : 'Inactif'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
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
                    <TableRow key={`${wu.id}-lines`} className="border-white/10 bg-white/3">
                      <TableCell colSpan={7} className="py-2 px-8">
                        {(wu.lines ?? []).length === 0 ? (
                          <p className="text-white/40 text-sm py-2">Aucune ligne</p>
                        ) : (
                          <table className="w-full text-sm">
                            <thead>
                              <tr className="text-white/50">
                                <th className="text-left font-normal py-1">Article</th>
                                <th className="text-right font-normal py-1">Qté</th>
                                <th className="text-right font-normal py-1">PU HT</th>
                                <th className="text-right font-normal py-1">Total HT</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(wu.lines ?? []).map((line) => (
                                <tr key={line.id} className="text-white/70">
                                  {/* FIX 8+9: use item_label */}
                                  <td className="py-1">{line.item_label || '—'}</td>
                                  <td className="text-right py-1">{line.quantity}</td>
                                  <td className="text-right py-1">{formatCurrency(line.unit_price_ht ?? 0)}</td>
                                  <td className="text-right py-1">{formatCurrency((line.quantity ?? 0) * (line.unit_price_ht ?? 0))}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        )}
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
  );
}

// ── FamillesTab ───────────────────────────────────────────────────────────────

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

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={onNew}
          className="bg-emerald-600 hover:bg-emerald-700 text-white min-h-[44px] gap-2"
        >
          <Plus className="h-4 w-4" />
          Nouvelle famille
        </Button>
      </div>

      <div className="rounded-lg border border-white/10 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/10 hover:bg-transparent">
              <TableHead className="text-white/60">Nom</TableHead>
              <TableHead className="text-white/60">Parent</TableHead>
              <TableHead className="text-white/60">Ordre</TableHead>
              <TableHead className="text-white/60 w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i} className="border-white/10">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full bg-white/10" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : families.length === 0 ? (
              <TableRow className="border-white/10">
                <TableCell colSpan={4} className="text-center text-white/40 py-12">
                  Aucune famille trouvée
                </TableCell>
              </TableRow>
            ) : (
              roots.map((root) => (
                <>
                  <TableRow key={root.id} className="border-white/10 hover:bg-white/5">
                    <TableCell className="text-white font-medium">
                      <div className="flex items-center gap-2">
                        <Folder className="h-4 w-4 text-yellow-400" />
                        {root.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-white/40">—</TableCell>
                    <TableCell className="text-white/70">{root.sort_order ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10" onClick={() => onEdit(root)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400/60 hover:text-red-400 hover:bg-red-400/10" onClick={() => onDelete(root.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {children(root.id).map((child) => (
                    <TableRow key={child.id} className="border-white/10 hover:bg-white/5">
                      <TableCell className="text-white/80">
                        <div className="flex items-center gap-2 pl-6">
                          <FolderOpen className="h-4 w-4 text-yellow-300/60" />
                          {child.name}
                        </div>
                      </TableCell>
                      <TableCell className="text-white/60">{root.name}</TableCell>
                      <TableCell className="text-white/70">{child.sort_order ?? '—'}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-white/60 hover:text-white hover:bg-white/10" onClick={() => onEdit(child)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400/60 hover:text-red-400 hover:bg-red-400/10" onClick={() => onDelete(child.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ── ItemDialog ────────────────────────────────────────────────────────────────

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
  const isEdit = !!editingItem;

  const { register, handleSubmit, control, formState: { errors, isSubmitting }, reset } = useForm<ItemFormData>({
    resolver: zodResolver(itemSchema),
    defaultValues: {
      label: editingItem?.label ?? '',
      description: editingItem?.description ?? '',
      family_id: editingItem?.family_id ?? null,
      item_type: (editingItem?.item_type as ItemType) ?? 'fourniture',
      unit: editingItem?.unit ?? '',
      purchase_price_ht: editingItem?.purchase_price_ht ?? 0,
      unit_price_ht: editingItem?.unit_price_ht ?? 0,
      vat_rate: editingItem?.vat_rate ?? 20,
      is_active: editingItem?.is_active ?? true,
    },
  });

  const onSubmit = async (data: ItemFormData) => {
    const payload = {
      label: data.label,
      description: data.description || null,
      family_id: data.family_id || null,
      item_type: data.item_type,
      unit: data.unit,
      purchase_price_ht: data.purchase_price_ht,
      unit_price_ht: data.unit_price_ht,
      vat_rate: data.vat_rate,
      is_active: data.is_active,
      company_id: companyId,
    };

    if (isEdit && editingItem) {
      const { error } = await supabase.from('item').update(payload).eq('id', editingItem.id);
      if (error) { toast.error('Erreur modification article'); return; }
      toast.success('Article modifié');
    } else {
      const { error } = await supabase.from('item').insert(payload);
      if (error) { toast.error('Erreur création article'); return; }
      toast.success('Article créé');
    }
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="bg-[#16213e] border border-white/10 text-white max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier l\'article' : 'Nouvel article'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-white/80">Libellé *</Label>
            <Input {...register('label')} className="bg-[#1a1a2e] border-white/20 text-white" />
            {errors.label && <p className="text-red-400 text-xs">{errors.label.message}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-white/80">Description</Label>
            <Input {...register('description')} className="bg-[#1a1a2e] border-white/20 text-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white/80">Type *</Label>
              <Controller
                name="item_type"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="bg-[#1a1a2e] border-white/20 text-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#16213e] border-white/20">
                      {(Object.entries(ITEM_TYPE_LABELS) as [ItemType, string][]).map(([k, v]) => (
                        <SelectItem key={k} value={k} className="text-white">{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">Famille</Label>
              <Controller
                name="family_id"
                control={control}
                render={({ field }) => (
                  <Select value={field.value ?? 'none'} onValueChange={(v) => field.onChange(v === 'none' ? null : v)}>
                    <SelectTrigger className="bg-[#1a1a2e] border-white/20 text-white">
                      <SelectValue placeholder="Aucune" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#16213e] border-white/20">
                      <SelectItem value="none" className="text-white">Aucune</SelectItem>
                      {families.map((f) => (
                        <SelectItem key={f.id} value={f.id} className="text-white">{f.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white/80">Unité *</Label>
              <Input {...register('unit')} className="bg-[#1a1a2e] border-white/20 text-white" />
              {errors.unit && <p className="text-red-400 text-xs">{errors.unit.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">TVA (%)</Label>
              <Input {...register('vat_rate')} type="number" step="0.1" className="bg-[#1a1a2e] border-white/20 text-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white/80">Prix achat HT</Label>
              <Input {...register('purchase_price_ht')} type="number" step="0.01" className="bg-[#1a1a2e] border-white/20 text-white" />
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">Prix vente HT</Label>
              <Input {...register('unit_price_ht')} type="number" step="0.01" className="bg-[#1a1a2e] border-white/20 text-white" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label className="text-white/80">Article actif</Label>
          </div>
          <DialogFooter className="gap-2 mt-6">
            <Button type="button" variant="outline" onClick={onClose} className="border-white/20 text-white hover:bg-white/10">
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isSubmitting ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── WorkUnitDialog ────────────────────────────────────────────────────────────

interface WorkUnitDialogProps {
  open: boolean;
  onClose: () => void;
  editingWorkUnit: WorkUnitWithLines | null;
  companyId: string;
  onSaved: () => void;
}

function WorkUnitDialog({ open, onClose, editingWorkUnit, companyId, onSaved }: WorkUnitDialogProps) {
  const supabase = createClient();
  const isEdit = !!editingWorkUnit;

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<WorkUnitFormData>({
    resolver: zodResolver(workUnitSchema),
    defaultValues: {
      label: editingWorkUnit?.label ?? '',
      description: editingWorkUnit?.description ?? '',
      unit: editingWorkUnit?.unit ?? '',
      // FIX 5: use total_price_ht not selling_price_ht
      total_price_ht: editingWorkUnit?.total_price_ht ?? 0,
      vat_rate: editingWorkUnit?.vat_rate ?? 20,
      // FIX 5: use margin_percent not margin_target
      margin_percent: editingWorkUnit?.margin_percent ?? null,
      is_active: editingWorkUnit?.is_active ?? true,
    },
  });

  const onSubmit = async (data: WorkUnitFormData) => {
    const payload = {
      label: data.label,
      description: data.description || null,
      unit: data.unit,
      // FIX 5: correct column names
      total_price_ht: data.total_price_ht,
      vat_rate: data.vat_rate,
      margin_percent: data.margin_percent ?? null,
      is_active: data.is_active,
      company_id: companyId,
    };

    if (isEdit && editingWorkUnit) {
      const { error } = await supabase.from('work_unit').update(payload).eq('id', editingWorkUnit.id);
      if (error) { toast.error('Erreur modification ouvrage'); return; }
      toast.success('Ouvrage modifié');
    } else {
      const { error } = await supabase.from('work_unit').insert(payload);
      if (error) { toast.error('Erreur création ouvrage'); return; }
      toast.success('Ouvrage créé');
    }
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="bg-[#16213e] border border-white/10 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier l\'ouvrage' : 'Nouvel ouvrage'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-white/80">Libellé *</Label>
            <Input {...register('label')} className="bg-[#1a1a2e] border-white/20 text-white" />
            {errors.label && <p className="text-red-400 text-xs">{errors.label.message}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-white/80">Description</Label>
            <Input {...register('description')} className="bg-[#1a1a2e] border-white/20 text-white" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white/80">Unité *</Label>
              <Input {...register('unit')} className="bg-[#1a1a2e] border-white/20 text-white" />
              {errors.unit && <p className="text-red-400 text-xs">{errors.unit.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className="text-white/80">TVA (%)</Label>
              <Input {...register('vat_rate')} type="number" step="0.1" className="bg-[#1a1a2e] border-white/20 text-white" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              {/* FIX 5: label and field name use total_price_ht */}
              <Label className="text-white/80">Prix total HT</Label>
              <Input {...register('total_price_ht')} type="number" step="0.01" className="bg-[#1a1a2e] border-white/20 text-white" />
            </div>
            <div className="space-y-2">
              {/* FIX 5: label and field name use margin_percent */}
              <Label className="text-white/80">Marge cible (%)</Label>
              <Input {...register('margin_percent')} type="number" step="0.1" className="bg-[#1a1a2e] border-white/20 text-white" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Controller
              name="is_active"
              control={control}
              render={({ field }) => (
                <Switch checked={field.value} onCheckedChange={field.onChange} />
              )}
            />
            <Label className="text-white/80">Ouvrage actif</Label>
          </div>
          <DialogFooter className="gap-2 mt-6">
            <Button type="button" variant="outline" onClick={onClose} className="border-white/20 text-white hover:bg-white/10">
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isSubmitting ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ── FamilyDialog ──────────────────────────────────────────────────────────────

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
  const isEdit = !!editingFamily;

  const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<FamilyFormData>({
    resolver: zodResolver(familySchema),
    defaultValues: {
      name: editingFamily?.name ?? '',
      parent_id: editingFamily?.parent_id ?? null,
      sort_order: editingFamily?.sort_order ?? 0,
    },
  });

  const onSubmit = async (data: FamilyFormData) => {
    const payload = {
      name: data.name,
      parent_id: data.parent_id || null,
      sort_order: data.sort_order ?? 0,
      company_id: companyId,
    };

    if (isEdit && editingFamily) {
      const { error } = await supabase.from('item_family').update(payload).eq('id', editingFamily.id);
      if (error) { toast.error('Erreur modification famille'); return; }
      toast.success('Famille modifiée');
    } else {
      const { error } = await supabase.from('item_family').insert(payload);
      if (error) { toast.error('Erreur création famille'); return; }
      toast.success('Famille créée');
    }
    onSaved();
  };

  const availableParents = families.filter((f) => f.id !== editingFamily?.id && !f.parent_id);

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="bg-[#16213e] border border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier la famille' : 'Nouvelle famille'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label className="text-white/80">Nom *</Label>
            <Input {...register('name')} className="bg-[#1a1a2e] border-white/20 text-white" />
            {errors.name && <p className="text-red-400 text-xs">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label className="text-white/80">Famille parente</Label>
            <Controller
              name="parent_id"
              control={control}
              render={({ field }) => (
                <Select value={field.value ?? 'none'} onValueChange={(v) => field.onChange(v === 'none' ? null : v)}>
                  <SelectTrigger className="bg-[#1a1a2e] border-white/20 text-white">
                    <SelectValue placeholder="Aucune" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#16213e] border-white/20">
                    <SelectItem value="none" className="text-white">Aucune (racine)</SelectItem>
                    {availableParents.map((f) => (
                      <SelectItem key={f.id} value={f.id} className="text-white">{f.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-white/80">Ordre d&apos;affichage</Label>
            <Input {...register('sort_order')} type="number" className="bg-[#1a1a2e] border-white/20 text-white" />
          </div>
          <DialogFooter className="gap-2 mt-6">
            <Button type="button" variant="outline" onClick={onClose} className="border-white/20 text-white hover:bg-white/10">
              Annuler
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              {isSubmitting ? 'Enregistrement...' : isEdit ? 'Modifier' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
