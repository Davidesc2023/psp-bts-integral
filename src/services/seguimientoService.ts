import { supabase } from './supabaseClient';
import {
  Seguimiento,
  SeguimientoRequest,
  EfectuarSeguimientoRequest,
  CancelarSeguimientoRequest,
  PaginatedResponse,
} from '@/types';

const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';

function mapRow(r: any): Seguimiento {
  return {
    id: r.id,
    patientId: r.patient_id,
    patientName: r.patients
      ? `${r.patients.first_name ?? ''} ${r.patients.last_name ?? ''}`.trim()
      : undefined,
    responsableId: r.responsable_id,
    motivoSeguimiento: r.motivo_seguimiento,
    tipoContacto: r.tipo_contacto,
    prioridad: r.prioridad,
    fechaProgramada: r.fecha_programada,
    fechaRealizada: r.fecha_realizada,
    estadoTarea: r.estado_tarea,
    resultado: r.resultado,
    observaciones: r.observaciones,
    fechaCreacion: r.created_at,
    fechaActualizacion: r.updated_at,
  };
}

export const seguimientoService = {

  crear: async (patientId: number, data: SeguimientoRequest): Promise<Seguimiento> => {
    const { data: row, error } = await supabase
      .from('seguimientos')
      .insert({
        tenant_id: DEFAULT_TENANT,
        patient_id: patientId,
        motivo_seguimiento: data.motivoSeguimiento,
        tipo_contacto: data.tipoContacto,
        prioridad: data.prioridad,
        fecha_programada: data.fechaProgramada,
        responsable_id: data.responsableId,
        observaciones: data.observaciones,
        estado_tarea: 'PENDIENTE',
      })
      .select()
      .single();
    if (error) throw error;
    return mapRow(row);
  },

  listarPorPaciente: async (
    patientId: number,
    params: { estado?: string; page?: number; size?: number } = {}
  ): Promise<PaginatedResponse<Seguimiento>> => {
    const page = params.page ?? 0;
    const size = params.size ?? 20;
    const from = page * size;
    const to = from + size - 1;

    let query = supabase
      .from('seguimientos')
      .select('*, patients(first_name, last_name)', { count: 'exact' })
      .eq('patient_id', patientId);

    if (params.estado) query = query.eq('estado_tarea', params.estado);

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

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

  listar: async (
    params: { estado?: string; page?: number; size?: number } = {}
  ): Promise<PaginatedResponse<Seguimiento>> => {
    const page = params.page ?? 0;
    const size = params.size ?? 100;
    const from = page * size;
    const to = from + size - 1;

    let query = supabase
      .from('seguimientos')
      .select('*, patients(first_name, last_name)', { count: 'exact' });

    if (params.estado) query = query.eq('estado_tarea', params.estado);

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

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

  ultimos: async (patientId: number): Promise<Seguimiento[]> => {
    const { data, error } = await supabase
      .from('seguimientos')
      .select('*, patients(first_name, last_name)')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false })
      .limit(5);
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  obtener: async (id: string): Promise<Seguimiento> => {
    const { data, error } = await supabase
      .from('seguimientos')
      .select('*, patients(first_name, last_name)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  actualizar: async (id: string, data: SeguimientoRequest): Promise<Seguimiento> => {
    const { data: row, error } = await supabase
      .from('seguimientos')
      .update({
        motivo_seguimiento: data.motivoSeguimiento,
        tipo_contacto: data.tipoContacto,
        prioridad: data.prioridad,
        fecha_programada: data.fechaProgramada,
        responsable_id: data.responsableId,
        observaciones: data.observaciones,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapRow(row);
  },

  efectuar: async (id: string, data: EfectuarSeguimientoRequest): Promise<Seguimiento> => {
    const { data: row, error } = await supabase
      .from('seguimientos')
      .update({
        estado_tarea: 'EFECTIVA',
        resultado: data.resultado,
        observaciones: data.observaciones,
        fecha_realizada: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapRow(row);
  },

  cancelar: async (id: string, data: CancelarSeguimientoRequest): Promise<Seguimiento> => {
    const { data: row, error } = await supabase
      .from('seguimientos')
      .update({
        estado_tarea: 'CANCELADA',
        motivo_cancelacion: data.motivo,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapRow(row);
  },

  eliminar: async (id: string): Promise<void> => {
    const { error } = await supabase
      .from('seguimientos')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
