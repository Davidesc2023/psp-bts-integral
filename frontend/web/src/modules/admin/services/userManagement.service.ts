import { supabase } from '@/services/supabaseClient';
import { PaginatedResponse } from '@/types';
import { getCurrentTenantId } from '@/utils/getCurrentTenant';


// ── TYPES ──────────────────────────────────────────────────────────────────

export type AdminUserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN_INSTITUCION'
  | 'MEDICO'
  | 'ENFERMERIA'
  | 'COORDINADOR'
  | 'EDUCADORA'
  | 'FARMACEUTICA'
  | 'AUDITOR'
  | 'MSL'
  | 'PACIENTE'
  | 'CUIDADOR';

export interface AdminUser {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  role: AdminUserRole;
  institucionId: string;
  institucionNombre: string;
  enabled: boolean;
}

export interface UserParams {
  search?: string;
  role?: AdminUserRole;
  enabled?: boolean;
  page?: number;
  size?: number;
}

export interface CreateUserData {
  email: string;
  nombre: string;
  apellido: string;
  role: AdminUserRole;
  institucionId: string;
  institucionNombre: string;
  password: string;
}

export interface UpdateUserData {
  email: string;
  nombre: string;
  apellido: string;
  role: AdminUserRole;
  institucionId: string;
  institucionNombre: string;
}

// ── HELPERS ───────────────────────────────────────────────────────────────

function mapRow(row: any): AdminUser {
  return {
    id: row.id,
    email: row.email,
    nombre: row.nombre,
    apellido: row.apellido,
    role: row.role,
    institucionId: row.institucion_id ?? '',
    institucionNombre: row.institucion_nombre ?? '',
    enabled: row.activo ?? true,
  };
}

// ── SERVICE ───────────────────────────────────────────────────────────────

export const userManagementService = {
  getUsers: async (params: UserParams = {}): Promise<PaginatedResponse<AdminUser>> => {
    const page = params.page ?? 0;
    const size = params.size ?? 20;
    const from = page * size;
    const to = from + size - 1;

    let query = supabase
      .from('user_profiles')
      .select('*', { count: 'exact' })
      .eq('tenant_id', await getCurrentTenantId())
      .order('created_at', { ascending: false })
      .range(from, to);

    if (params.search) {
      query = query.or(`email.ilike.%${params.search}%,nombre.ilike.%${params.search}%,apellido.ilike.%${params.search}%`);
    }
    if (params.role) {
      query = query.eq('role', params.role);
    }
    if (params.enabled !== undefined) {
      query = query.eq('activo', params.enabled);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    const totalElements = count ?? 0;
    const totalPages = Math.ceil(totalElements / size);

    return {
      content: (data ?? []).map(mapRow),
      totalElements,
      totalPages,
      size,
      number: page,
      first: page === 0,
      last: page >= totalPages - 1,
    };
  },

  createUser: async (data: CreateUserData): Promise<AdminUser> => {
    const { data: row, error } = await supabase
      .from('user_profiles')
      .insert({
        email: data.email,
        nombre: data.nombre,
        apellido: data.apellido,
        role: data.role,
        institucion_id: data.institucionId || null,
        institucion_nombre: data.institucionNombre || null,
        activo: true,
        tenant_id: await getCurrentTenantId(),
      })
      .select()
      .single();
    if (error) throw error;
    return mapRow(row);
  },

  updateUser: async (id: string, data: UpdateUserData): Promise<AdminUser> => {
    const { data: row, error } = await supabase
      .from('user_profiles')
      .update({
        email: data.email,
        nombre: data.nombre,
        apellido: data.apellido,
        role: data.role,
        institucion_id: data.institucionId || null,
        institucion_nombre: data.institucionNombre || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapRow(row);
  },

  toggleUserStatus: async (id: string): Promise<AdminUser> => {
    const { data: current, error: fetchErr } = await supabase
      .from('user_profiles')
      .select('activo')
      .eq('id', id)
      .single();
    if (fetchErr) throw fetchErr;

    const { data: row, error } = await supabase
      .from('user_profiles')
      .update({ activo: !current.activo, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapRow(row);
  },

  changeUserRole: async (id: string, role: AdminUserRole): Promise<AdminUser> => {
    const { data: row, error } = await supabase
      .from('user_profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapRow(row);
  },
};
