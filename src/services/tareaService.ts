import { supabase } from './supabaseClient';
import {
  Tarea,
  TareaRequest,
  CompletarTareaRequest,
  CancelarTareaRequest,
  PaginatedResponse,
} from '@/types';

const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';

function mapRow(r: any): Tarea {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    patientId: r.patient_id,
    patientNombre: r.patients
      ? `${r.patients.first_name ?? ''} ${r.patients.last_name ?? ''}`.trim()
      : undefined,
    educadoraId: r.educadora_id,
    barreraId: r.barrera_id,
    seguimientoId: r.seguimiento_id,
    prescripcionId: r.prescripcion_id,
    titulo: r.titulo,
    descripcion: r.descripcion,
    tipoTarea: r.tipo_tarea,
    canal: r.canal,
    prioridad: r.prioridad,
    estado: r.estado,
    fechaProgramada: r.fecha_programada,
    fechaLimite: r.fecha_limite,
    fechaCompletada: r.fecha_completada,
    resultado: r.resultado,
    notas: r.notas,
    fechaCreacion: r.created_at,
    fechaActualizacion: r.updated_at,
    createdBy: r.created_by,
  };
}

function buildPaginated(data: any[], count: number | null, page: number, size: number): PaginatedResponse<Tarea> {
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
}

export const tareaService = {

  listar: async (
    params: { estado?: string; educadoraId?: string; page?: number; size?: number } = {}
  ): Promise<PaginatedResponse<Tarea>> => {
    const page = params.page ?? 0;
    const size = params.size ?? 50;
    const from = page * size;
    const to = from + size - 1;

    let query = supabase
      .from('tareas')
      .select('*, patients(first_name, last_name)', { count: 'exact' });

    if (params.estado) query = query.eq('estado', params.estado);
    if (params.educadoraId) query = query.eq('educadora_id', params.educadoraId);

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return buildPaginated(data ?? [], count, page, size);
  },

  listarPorPaciente: async (
    patientId: number,
    params: { estado?: string; prioridad?: string; page?: number; size?: number } = {}
  ): Promise<PaginatedResponse<Tarea>> => {
    const page = params.page ?? 0;
    const size = params.size ?? 20;
    const from = page * size;
    const to = from + size - 1;

    let query = supabase
      .from('tareas')
      .select('*, patients(first_name, last_name)', { count: 'exact' })
      .eq('patient_id', patientId);

    if (params.estado) query = query.eq('estado', params.estado);
    if (params.prioridad) query = query.eq('prioridad', params.prioridad);

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    return buildPaginated(data ?? [], count, page, size);
  },

  pendientesPorPaciente: async (patientId: number): Promise<Tarea[]> => {
    const { data, error } = await supabase
      .from('tareas')
      .select('*, patients(first_name, last_name)')
      .eq('patient_id', patientId)
      .in('estado', ['PENDIENTE', 'EN_PROGRESO'])
      .order('fecha_programada');
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  obtener: async (patientId: number, id: string): Promise<Tarea> => {
    const { data, error } = await supabase
      .from('tareas')
      .select('*, patients(first_name, last_name)')
      .eq('id', id)
      .eq('patient_id', patientId)
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  crear: async (patientId: number, req: TareaRequest): Promise<Tarea> => {
    const { data, error } = await supabase
      .from('tareas')
      .insert({
        tenant_id: DEFAULT_TENANT,
        patient_id: patientId,
        educadora_id: req.educadoraId,
        barrera_id: req.barreraId,
        seguimiento_id: req.seguimientoId,
        prescripcion_id: req.prescripcionId,
        titulo: req.titulo,
        descripcion: req.descripcion,
        tipo_tarea: req.tipoTarea ?? 'OTRO',
        canal: req.canal ?? 'TELEFONO',
        prioridad: req.prioridad ?? 'MEDIA',
        estado: 'PENDIENTE',
        fecha_programada: req.fechaProgramada,
        fecha_limite: req.fechaLimite,
        notas: req.notas,
      })
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  actualizar: async (patientId: number, id: string, req: TareaRequest): Promise<Tarea> => {
    const { data, error } = await supabase
      .from('tareas')
      .update({
        educadora_id: req.educadoraId,
        barrera_id: req.barreraId,
        seguimiento_id: req.seguimientoId,
        prescripcion_id: req.prescripcionId,
        titulo: req.titulo,
        descripcion: req.descripcion,
        tipo_tarea: req.tipoTarea,
        canal: req.canal,
        prioridad: req.prioridad,
        fecha_programada: req.fechaProgramada,
        fecha_limite: req.fechaLimite,
        notas: req.notas,
      })
      .eq('id', id)
      .eq('patient_id', patientId)
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  completar: async (
    patientId: number,
    id: string,
    req?: CompletarTareaRequest
  ): Promise<Tarea> => {
    const { data, error } = await supabase
      .from('tareas')
      .update({
        estado: 'COMPLETADA',
        resultado: req?.resultado,
        notas: req?.notas,
        fecha_completada: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('patient_id', patientId)
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  cancelar: async (
    patientId: number,
    id: string,
    req?: CancelarTareaRequest
  ): Promise<Tarea> => {
    const { data, error } = await supabase
      .from('tareas')
      .update({
        estado: 'CANCELADA',
        motivo_cancelacion: req?.motivo,
      })
      .eq('id', id)
      .eq('patient_id', patientId)
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },
};
