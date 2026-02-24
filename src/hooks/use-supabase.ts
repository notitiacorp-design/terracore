'use client';

import { useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export function useSupabase(): SupabaseClient<Database> {
  const client = useMemo(() => createClient(), []);
  return client;
}
