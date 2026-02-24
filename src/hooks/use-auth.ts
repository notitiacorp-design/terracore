'use client';

import { useState, useEffect, useCallback } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { UserProfileRow, CompanyRow } from '@/types/database';

interface AuthState {
  user: User | null;
  profile: UserProfileRow | null;
  company: CompanyRow | null;
  loading: boolean;
}

interface SignInParams {
  email: string;
  password: string;
}

interface SignUpParams {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

interface AuthActions {
  signIn: (params: SignInParams) => Promise<{ error: string | null }>;
  signUp: (params: SignUpParams) => Promise<{ error: string | null }>;
  signOut: () => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

export type UseAuthReturn = AuthState & AuthActions;

export function useAuth(): UseAuthReturn {
  const supabase = createClient();

  const [state, setState] = useState<AuthState>({
    user: null,
    profile: null,
    company: null,
    loading: true,
  });

  const fetchProfileAndCompany = useCallback(
    async (userId: string) => {
      try {
        const { data: profileData, error: profileError } = await supabase
          .from('user_profile')
          .select('*')
          .eq('id', userId)
          .single();

        if (profileError || !profileData) {
          setState((prev) => ({ ...prev, profile: null, company: null, loading: false }));
          return;
        }

        const { data: companyData, error: companyError } = await supabase
          .from('company')
          .select('*')
          .eq('id', profileData.company_id)
          .single();

        setState((prev) => ({
          ...prev,
          profile: profileData as UserProfileRow,
          company: companyError ? null : (companyData as CompanyRow),
          loading: false,
        }));
      } catch {
        setState((prev) => ({ ...prev, profile: null, company: null, loading: false }));
      }
    },
    [supabase]
  );

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!mounted) return;

        if (session?.user) {
          setState((prev) => ({ ...prev, user: session.user }));
          await fetchProfileAndCompany(session.user.id);
        } else {
          setState({ user: null, profile: null, company: null, loading: false });
        }
      } catch {
        if (mounted) {
          setState({ user: null, profile: null, company: null, loading: false });
        }
      }
    };

    initAuth();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (session?.user) {
        setState((prev) => ({ ...prev, user: session.user, loading: true }));
        await fetchProfileAndCompany(session.user.id);
      } else {
        setState({ user: null, profile: null, company: null, loading: false });
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [fetchProfileAndCompany, supabase.auth]);

  const signIn = useCallback(
    async ({ email, password }: SignInParams): Promise<{ error: string | null }> => {
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };
        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Une erreur est survenue lors de la connexion.' };
      }
    },
    [supabase]
  );

  const signUp = useCallback(
    async ({ email, password, firstName, lastName }: SignUpParams): Promise<{ error: string | null }> => {
      try {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              first_name: firstName,
              last_name: lastName,
            },
          },
        });
        if (error) return { error: error.message };
        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err.message : "Une erreur est survenue lors de l'inscription." };
      }
    },
    [supabase]
  );

  const signOut = useCallback(async (): Promise<{ error: string | null }> => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) return { error: error.message };
      setState({ user: null, profile: null, company: null, loading: false });
      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err.message : 'Une erreur est survenue lors de la déconnexion.' };
    }
  }, [supabase]);

  const resetPassword = useCallback(
    async (email: string): Promise<{ error: string | null }> => {
      try {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) return { error: error.message };
        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err.message : 'Une erreur est survenue lors de la réinitialisation.' };
      }
    },
    [supabase]
  );

  return {
    ...state,
    signIn,
    signUp,
    signOut,
    resetPassword,
  };
}
