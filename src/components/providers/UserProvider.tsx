'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

interface UserContextValue {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  logout: () => Promise<void>;
  favoriteIds: Set<string>;
  refreshFavorites: () => Promise<void>;
  toggleFavoriteLocal: (assetId: string, favorited: boolean) => void;
}

const UserContext = createContext<UserContextValue | null>(null);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const supabase = createClient();

  const fetchRole = useCallback(async (uid: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', uid)
        .maybeSingle();
      setRole((data?.role as string | undefined) ?? null);
    } catch {
      setRole(null);
    }
  }, [supabase]);

  const refreshFavorites = useCallback(async () => {
    if (!user) {
      setFavoriteIds(new Set());
      return;
    }
    try {
      const res = await fetch('/api/favorites');
      if (res.ok) {
        const data = await res.json();
        if (data.data?.asset_ids) {
          setFavoriteIds(new Set(data.data.asset_ids));
        }
      }
    } catch {}
  }, [user]);

  const toggleFavoriteLocal = useCallback((assetId: string, favorited: boolean) => {
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (favorited) next.add(assetId);
      else next.delete(assetId);
      return next;
    });
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      setLoading(false);
      if (data.user) {
        fetchRole(data.user.id);
        try {
          const res = await fetch('/api/favorites');
          if (res.ok) {
            const favData = await res.json();
            if (favData.data?.asset_ids) {
              setFavoriteIds(new Set(favData.data.asset_ids));
            }
          }
        } catch {}
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRole(session.user.id);
        try {
          const res = await fetch('/api/favorites');
          if (res.ok) {
            const favData = await res.json();
            if (favData.data?.asset_ids) {
              setFavoriteIds(new Set(favData.data.asset_ids));
            }
          }
        } catch {}
      } else {
        setRole(null);
        setFavoriteIds(new Set());
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, fetchRole]);

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
    setFavoriteIds(new Set());
  };

  return (
    <UserContext.Provider
      value={{ user, isAdmin: role === 'admin', loading, logout, favoriteIds, refreshFavorites, toggleFavoriteLocal }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error('useUser must be used within UserProvider');
  return ctx;
}