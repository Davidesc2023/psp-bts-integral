import { supabase } from './supabaseClient';

export interface AuditoriaLog {
  id: string;
  tabla: string;
  operacion: 'INSERT' | 'UPDATE' | 'DELETE';
  registroId: string | null;
  usuarioId: string | null;
  datosAnteriores: string | null;
  datosNuevos: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  fechaOperacion: string;
}

export interface AuditoriaFilters {
  tabla?: string;
  operacion?: string;
  from?: string;
  to?: string;
  page?: number;
  size?: number;
}

export interface AuditoriaResumen {
  [tabla: string]: number;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
}

function mapRow(r: any): AuditoriaLog {
  return {
    id: r.id,
    tabla: r.tabla,
    operacion: r.operacion,
    registroId: r.registro_id,
    usuarioId: r.usuario_id,
    datosAnteriores: r.datos_anteriores,
    datosNuevos: r.datos_nuevos,
    ipAddress: r.ip_address,
    userAgent: r.user_agent,
    fechaOperacion: r.fecha_operacion,
  };
}

export const auditoriaService = {
  async getLogs(filters: AuditoriaFilters = {}): Promise<PageResponse<AuditoriaLog>> {
    const page = filters.page ?? 0;
    const size = filters.size ?? 20;
    const from = page * size;
    const to = from + size - 1;

    let query = supabase
      .from('auditoria_logs')
      .select('*', { count: 'exact' });

    if (filters.tabla) query = query.eq('tabla', filters.tabla);
    if (filters.operacion) query = query.eq('operacion', filters.operacion);
    if (filters.from) query = query.gte('fecha_operacion', filters.from);
    if (filters.to) query = query.lte('fecha_operacion', filters.to);

    const { data, error, count } = await query
      .order('fecha_operacion', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { content: (data ?? []).map(mapRow), totalElements: count ?? 0 };
  },

  async getRegistroTrail(registroId: string): Promise<PageResponse<AuditoriaLog>> {
    const { data, error, count } = await supabase
      .from('auditoria_logs')
      .select('*', { count: 'exact' })
      .eq('registro_id', registroId)
      .order('fecha_operacion', { ascending: false });
    if (error) throw error;
    return { content: (data ?? []).map(mapRow), totalElements: count ?? 0 };
  },

  async getResumen(): Promise<AuditoriaResumen> {
    const { data, error } = await supabase
      .from('auditoria_logs')
      .select('tabla');
    if (error) throw error;
    const resumen: AuditoriaResumen = {};
    (data ?? []).forEach((r: any) => {
      resumen[r.tabla] = (resumen[r.tabla] ?? 0) + 1;
    });
    return resumen;
  },
};
