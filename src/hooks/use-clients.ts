'use client';

import { useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ClientRow, ClientInsert, ClientUpdate, ClientType } from '@/types/database';

export interface ClientFilters {
  client_type?: ClientType;
  is_active?: boolean;
  search?: string;
}

export interface UseClientsReturn {
  clients: ClientRow[];
  loading: boolean;
  error: string | null;
  fetchClients: (companyId: string, filters?: ClientFilters) => Promise<void>;
  createClient: (data: ClientInsert) => Promise<{ data: ClientRow | null; error: string | null }>;
  updateClient: (id: string, data: ClientUpdate) => Promise<{ data: ClientRow | null; error: string | null }>;
  deleteClient: (id: string) => Promise<{ error: string | null }>;
  searchClients: (companyId: string, query: string) => Promise<ClientRow[]>;
}

export function useClients(): UseClientsReturn {
  const supabase = createClient();

  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchClients = useCallback(
    async (companyId: string, filters?: ClientFilters): Promise<void> => {
      setLoading(true);
      setError(null);

      try {
        let query = supabase
          .from('clients')
          .select('*')
          .eq('company_id', companyId)
          .order('created_at', { ascending: false });

        if (filters?.client_type) {
          query = query.eq('client_type', filters.client_type);
        }

        if (filters?.is_active !== undefined) {
          query = query.eq('is_active', filters.is_active);
        }

        if (filters?.search && filters.search.trim().length > 0) {
          const term = `%${filters.search.trim()}%`;
          query = query.or(`name.ilike.${term},email.ilike.${term}`);
        }

        const { data, error: fetchError } = await query;

        if (fetchError) {
          setError(fetchError.message);
          setClients([]);
        } else {
          setClients((data as ClientRow[]) ?? []);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Erreur lors du chargement des clients.');
        setClients([]);
      } finally {
        setLoading(false);
      }
    },
    [supabase]
  );

  const createClient = useCallback(
    async (data: ClientInsert): Promise<{ data: ClientRow | null; error: string | null }> => {
      try {
        const { data: created, error: insertError } = await supabase
          .from('clients')
          .insert(data)
          .select()
          .single();

        if (insertError) {
          return { data: null, error: insertError.message };
        }

        const newClient = created as ClientRow;
        setClients((prev) => [newClient, ...prev]);
        return { data: newClient, error: null };
      } catch (err) {
        return {
          data: null,
          error: err instanceof Error ? err.message : 'Erreur lors de la création du client.',
        };
      }
    },
    [supabase]
  );

  const updateClient = useCallback(
    async (id: string, data: ClientUpdate): Promise<{ data: ClientRow | null; error: string | null }> => {
      try {
        const { data: updated, error: updateError } = await supabase
          .from('clients')
          .update(data)
          .eq('id', id)
          .select()
          .single();

        if (updateError) {
          return { data: null, error: updateError.message };
        }

        const updatedClient = updated as ClientRow;
        setClients((prev) => prev.map((c) => (c.id === id ? updatedClient : c)));
        return { data: updatedClient, error: null };
      } catch (err) {
        return {
          data: null,
          error: err instanceof Error ? err.message : 'Erreur lors de la mise à jour du client.',
        };
      }
    },
    [supabase]
  );

  const deleteClient = useCallback(
    async (id: string): Promise<{ error: string | null }> => {
      try {
        const { error: deleteError } = await supabase
          .from('clients')
          .delete()
          .eq('id', id);

        if (deleteError) {
          return { error: deleteError.message };
        }

        setClients((prev) => prev.filter((c) => c.id !== id));
        return { error: null };
      } catch (err) {
        return {
          error: err instanceof Error ? err.message : 'Erreur lors de la suppression du client.',
        };
      }
    },
    [supabase]
  );

  const searchClients = useCallback(
    async (companyId: string, query: string): Promise<ClientRow[]> => {
      if (!query.trim()) return [];

      try {
        const term = `%${query.trim()}%`;
        const { data, error: searchError } = await supabase
          .from('clients')
          .select('*')
          .eq('company_id', companyId)
          .or(`name.ilike.${term},email.ilike.${term}`)
          .order('name', { ascending: true })
          .limit(20);

        if (searchError) return [];
        return (data as ClientRow[]) ?? [];
      } catch {
        return [];
      }
    },
    [supabase]
  );

  return {
    clients,
    loading,
    error,
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
    searchClients,
  };
}
