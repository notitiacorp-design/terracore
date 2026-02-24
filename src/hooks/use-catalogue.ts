'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type {
  ItemRow,
  ItemInsert,
  ItemUpdate,
  ItemFamilyRow,
  WorkUnitRow,
  WorkUnitInsert,
  WorkUnitUpdate,
  WorkUnitLineRow,
} from '@/types/database';
import type { ItemType } from '@/types/database';

export interface ItemWithFamily extends ItemRow {
  item_family?: ItemFamilyRow | null;
}

export interface WorkUnitLineWithItem extends WorkUnitLineRow {
  item?: ItemRow | null;
}

export interface ItemFilters {
  family_id?: string;
  item_type?: ItemType;
  search?: string;
  is_active?: boolean;
}

export interface WorkUnitFilters {
  search?: string;
  is_active?: boolean;
}

export interface UseCatalogueReturn {
  items: ItemWithFamily[];
  itemFamilies: ItemFamilyRow[];
  workUnits: WorkUnitRow[];
  workUnitLines: WorkUnitLineWithItem[];
  loading: boolean;
  error: string | null;
  fetchItems: (companyId: string, filters?: ItemFilters) => Promise<void>;
  fetchItemFamilies: (companyId: string) => Promise<void>;
  fetchWorkUnits: (companyId: string, filters?: WorkUnitFilters) => Promise<void>;
  createItem: (data: ItemInsert) => Promise<ItemRow | null>;
  updateItem: (id: string, data: ItemUpdate) => Promise<ItemRow | null>;
  createWorkUnit: (data: WorkUnitInsert) => Promise<WorkUnitRow | null>;
  updateWorkUnit: (id: string, data: WorkUnitUpdate) => Promise<WorkUnitRow | null>;
  fetchWorkUnitLines: (workUnitId: string) => Promise<WorkUnitLineWithItem[]>;
  searchItems: (companyId: string, query: string) => Promise<ItemWithFamily[]>;
  clearError: () => void;
}

export function useCatalogue(): UseCatalogueReturn {
  const [items, setItems] = useState<ItemWithFamily[]>([]);
  const [itemFamilies, setItemFamilies] = useState<ItemFamilyRow[]>([]);
  const [workUnits, setWorkUnits] = useState<WorkUnitRow[]>([]);
  const [workUnitLines, setWorkUnitLines] = useState<WorkUnitLineWithItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchItems = useCallback(
    async (companyId: string, filters?: ItemFilters): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        let query = supabase
          .from('item')
          .select('*, item_family(*)')
          .eq('company_id', companyId)
          .order('name', { ascending: true });

        if (filters?.family_id) {
          query = query.eq('family_id', filters.family_id);
        }
        if (filters?.item_type) {
          query = query.eq('item_type', filters.item_type);
        }
        if (filters?.is_active !== undefined) {
          query = query.eq('is_active', filters.is_active);
        }
        if (filters?.search && filters.search.trim() !== '') {
          const searchTerm = `%${filters.search.trim()}%`;
          query = query.or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`);
        }

        const { data, error: supabaseError } = await query;

        if (supabaseError) {
          throw new Error(supabaseError.message);
        }

        setItems((data as ItemWithFamily[]) ?? []);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erreur lors du chargement des articles';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchItemFamilies = useCallback(async (companyId: string): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: supabaseError } = await supabase
        .from('item_family')
        .select('*')
        .eq('company_id', companyId)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true });

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      setItemFamilies(data ?? []);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors du chargement des familles d\'articles';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchWorkUnits = useCallback(
    async (companyId: string, filters?: WorkUnitFilters): Promise<void> => {
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        let query = supabase
          .from('work_unit')
          .select('*')
          .eq('company_id', companyId)
          .order('name', { ascending: true });

        if (filters?.is_active !== undefined) {
          query = query.eq('is_active', filters.is_active);
        }
        if (filters?.search && filters.search.trim() !== '') {
          const searchTerm = `%${filters.search.trim()}%`;
          query = query.or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`);
        }

        const { data, error: supabaseError } = await query;

        if (supabaseError) {
          throw new Error(supabaseError.message);
        }

        setWorkUnits(data ?? []);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erreur lors du chargement des ouvrages';
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const createItem = useCallback(async (data: ItemInsert): Promise<ItemRow | null> => {
    setLoading(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: created, error: supabaseError } = await supabase
        .from('item')
        .insert(data)
        .select('*')
        .single();

      if (supabaseError) {
        throw new Error(supabaseError.message);
      }

      if (created) {
        setItems((prev) => [...prev, created as ItemWithFamily].sort((a, b) => a.name.localeCompare(b.name, 'fr')));
      }

      return created as ItemRow;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Erreur lors de la création de l\'article';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const updateItem = useCallback(
    async (id: string, data: ItemUpdate): Promise<ItemRow | null> => {
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const { data: updated, error: supabaseError } = await supabase
          .from('item')
          .update(data)
          .eq('id', id)
          .select('*, item_family(*)')
          .single();

        if (supabaseError) {
          throw new Error(supabaseError.message);
        }

        if (updated) {
          setItems((prev) =>
            prev
              .map((item) => (item.id === id ? (updated as ItemWithFamily) : item))
              .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
          );
        }

        return updated as ItemRow;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erreur lors de la mise à jour de l\'article';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const createWorkUnit = useCallback(
    async (data: WorkUnitInsert): Promise<WorkUnitRow | null> => {
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const { data: created, error: supabaseError } = await supabase
          .from('work_unit')
          .insert(data)
          .select('*')
          .single();

        if (supabaseError) {
          throw new Error(supabaseError.message);
        }

        if (created) {
          setWorkUnits((prev) =>
            [...prev, created as WorkUnitRow].sort((a, b) => a.name.localeCompare(b.name, 'fr'))
          );
        }

        return created as WorkUnitRow;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erreur lors de la création de l\'ouvrage';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const updateWorkUnit = useCallback(
    async (id: string, data: WorkUnitUpdate): Promise<WorkUnitRow | null> => {
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const { data: updated, error: supabaseError } = await supabase
          .from('work_unit')
          .update(data)
          .eq('id', id)
          .select('*')
          .single();

        if (supabaseError) {
          throw new Error(supabaseError.message);
        }

        if (updated) {
          setWorkUnits((prev) =>
            prev
              .map((wu) => (wu.id === id ? (updated as WorkUnitRow) : wu))
              .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
          );
        }

        return updated as WorkUnitRow;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erreur lors de la mise à jour de l\'ouvrage';
        setError(message);
        return null;
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const fetchWorkUnitLines = useCallback(
    async (workUnitId: string): Promise<WorkUnitLineWithItem[]> => {
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const { data, error: supabaseError } = await supabase
          .from('work_unit_line')
          .select('*, item(*)')
          .eq('work_unit_id', workUnitId)
          .order('created_at', { ascending: true });

        if (supabaseError) {
          throw new Error(supabaseError.message);
        }

        const lines = (data as WorkUnitLineWithItem[]) ?? [];
        setWorkUnitLines(lines);
        return lines;
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : 'Erreur lors du chargement des composants de l\'ouvrage';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const searchItems = useCallback(
    async (companyId: string, query: string): Promise<ItemWithFamily[]> => {
      if (!query || query.trim() === '') {
        return [];
      }
      setLoading(true);
      setError(null);
      try {
        const supabase = createClient();
        const searchTerm = `%${query.trim()}%`;
        const { data, error: supabaseError } = await supabase
          .from('item')
          .select('*, item_family(*)')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .or(`name.ilike.${searchTerm},description.ilike.${searchTerm}`)
          .order('name', { ascending: true })
          .limit(50);

        if (supabaseError) {
          throw new Error(supabaseError.message);
        }

        return (data as ItemWithFamily[]) ?? [];
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Erreur lors de la recherche d\'articles';
        setError(message);
        return [];
      } finally {
        setLoading(false);
      }
    },
    []
  );

  return {
    items,
    itemFamilies,
    workUnits,
    workUnitLines,
    loading,
    error,
    fetchItems,
    fetchItemFamilies,
    fetchWorkUnits,
    createItem,
    updateItem,
    createWorkUnit,
    updateWorkUnit,
    fetchWorkUnitLines,
    searchItems,
    clearError,
  };
}
