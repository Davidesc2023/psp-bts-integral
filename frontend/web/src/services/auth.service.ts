import { supabase } from './supabaseClient';
import { LoginRequest, LoginResponse, User } from '@/types';
import { clearTenantCache } from '@/utils/getCurrentTenant';

/**
 * Servicio de autenticación — Supabase Auth
 */

export const authService = {
  /**
   * Login de usuario con Supabase Auth
   */
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: credentials.email,
      password: credentials.password,
    });

    if (error) throw new Error(error.message);

    // Obtener perfil extendido desde user_profiles
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    const user: User = {
      id: data.user.id,
      email: data.user.email ?? '',
      nombre: profile?.nombre ?? data.user.email?.split('@')[0] ?? '',
      apellido: profile?.apellido ?? '',
      role: profile?.role ?? 'ENFERMERIA',
      institucionId: profile?.institucion_id ?? '',
      institucionNombre: profile?.institucion_nombre ?? '',
      permisos: [],
    };

    return {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      tokenType: 'Bearer',
      expiresIn: data.session.expires_in ?? 3600,
      user,
    };
  },

  /**
   * Refresh token
   */
  refreshToken: async (_refreshToken: string) => {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) throw new Error(error.message);
    return data;
  },

  /**
   * Logout
   */
  logout: async () => {
    clearTenantCache();
    await supabase.auth.signOut();
  },

  /**
   * Obtener usuario actual
   */
  getCurrentUser: async (): Promise<User | null> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    return {
      id: user.id,
      email: user.email ?? '',
      nombre: profile?.nombre ?? '',
      apellido: profile?.apellido ?? '',
      role: profile?.role ?? 'ENFERMERIA',
      institucionId: profile?.institucion_id ?? '',
      institucionNombre: profile?.institucion_nombre ?? '',
      permisos: [],
    };
  },
};
