import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';
import { supabase } from '@services/supabaseClient';

/**
 * Store de autenticación usando Zustand + Supabase
 */

interface AuthState {
  user: User | null;
  token: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  
  // Actions
  setUser: (user: User) => void;
  setTokens: (token: string, refreshToken: string) => void;
  logout: () => void;
  isTokenExpired: () => boolean;
}

export const authStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,

      setUser: (user) => 
        set({ user, isAuthenticated: true }),

      setTokens: (token, refreshToken) => {
        set({ 
          token, 
          refreshToken,
          isAuthenticated: true 
        });
      },

      logout: () => {
        supabase.auth.signOut();
        set({ 
          user: null, 
          token: null, 
          refreshToken: null,
          isAuthenticated: false 
        });
      },

      isTokenExpired: () => {
        const { token } = get();
        if (!token) return true;
        if (token.startsWith('mock_')) return false;

        try {
          // Supabase JWT: decode payload to check exp
          const payload = JSON.parse(atob(token.split('.')[1]));
          return payload.exp < Date.now() / 1000;
        } catch {
          return true;
        }
      },
    }),
    {
      name: 'psp-auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
