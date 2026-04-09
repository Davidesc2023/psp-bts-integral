import { supabase } from './supabaseClient';
import { withTenant } from '@/utils/getCurrentTenant';
import type {
  ServicioComplementario,
  CreateServicioComplementarioRequest,
  CompletarServicioRequest,
  CancelarServicioRequest,
  ProgramarServicioRequest,
  TipoServicioComplementario,
  EstadoServicioComplementario,
} from '../types';


function mapRow(r: any): ServicioComplementario {
  return {
    id: r.id,
    patientId: r.patient_id,
    patientName: r.patients
      ? `${r.patients.first_name ?? ''} ${r.patients.last_name ?? ''}`.trim()
      : undefined,
    tipoServicio: r.tipo_servicio,
    profesionalSolicitaId: r.created_by ?? null,
    fechaSolicitud: r.fecha_solicitud,
    fechaServicio: r.fecha_programada,
    profesionalAtiende: r.profesional_asignado,
    estadoServicio: r.estado,
    observaciones: r.observaciones,
    fechaCreacion: r.created_at,
    fechaActualizacion: r.updated_at,
  };
}

export const servicioComplementarioService = {
  async listar() {
    const { data, error } = await supabase
      .from('servicios_complementarios')
      .select('*, patients(first_name, last_name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async obtenerPorId(id: string) {
    const { data, error } = await supabase
      .from('servicios_complementarios')
      .select('*, patients(first_name, last_name)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async listarPorPaciente(patientId: number) {
    const { data, error } = await supabase
      .from('servicios_complementarios')
      .select('*, patients(first_name, last_name)')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async listarPendientesPorPaciente(patientId: number) {
    const { data, error } = await supabase
      .from('servicios_complementarios')
      .select('*, patients(first_name, last_name)')
      .eq('patient_id', patientId)
      .in('estado', ['PENDIENTE', 'PROGRAMADO'])
      .order('fecha_solicitud', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async listarPorTipo(tipo: TipoServicioComplementario) {
    const { data, error } = await supabase
      .from('servicios_complementarios')
      .select('*, patients(first_name, last_name)')
      .eq('tipo_servicio', tipo)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async listarPorEstado(estado: EstadoServicioComplementario) {
    const { data, error } = await supabase
      .from('servicios_complementarios')
      .select('*, patients(first_name, last_name)')
      .eq('estado', estado)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async listarProgramados(fechaInicio: string, fechaFin: string) {
    const { data, error } = await supabase
      .from('servicios_complementarios')
      .select('*, patients(first_name, last_name)')
      .eq('estado', 'PROGRAMADO')
      .gte('fecha_programada', fechaInicio)
      .lte('fecha_programada', fechaFin)
      .order('fecha_programada');
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async crear(req: CreateServicioComplementarioRequest) {
    const { data, error } = await supabase
      .from('servicios_complementarios')
      .insert(await withTenant({
        patient_id: req.patientId,
        tipo_servicio: req.tipoServicio,
        created_by: req.profesionalSolicitaId ?? null,
        fecha_solicitud: req.fechaSolicitud ?? new Date().toISOString().split('T')[0],
        fecha_programada: req.fechaServicio ?? null,
        observaciones: req.observaciones,
        estado: 'PENDIENTE',
      }))
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async programar(id: string, req: ProgramarServicioRequest) {
    const { data, error } = await supabase
      .from('servicios_complementarios')
      .update({
        estado: 'PROGRAMADO',
        fecha_programada: (req as any).fechaServicio ?? null,
        profesional_asignado: (req as any).profesionalAtiende ?? null,
        observaciones: (req as any).observaciones,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async completar(id: string, req: CompletarServicioRequest) {
    const { data, error } = await supabase
      .from('servicios_complementarios')
      .update({
        estado: 'COMPLETADO',
        fecha_realizacion: new Date().toISOString(),
        resultado: (req as any).resultado ?? null,
        observaciones: (req as any).observaciones,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async cancelar(id: string, req: CancelarServicioRequest) {
    const { data, error } = await supabase
      .from('servicios_complementarios')
      .update({
        estado: 'CANCELADO',
        motivo_cancelacion: (req as any).motivo ?? null,
        observaciones: (req as any).observaciones ?? null,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async eliminar(id: string) {
    const { error } = await supabase.from('servicios_complementarios').delete().eq('id', id);
    if (error) throw error;
  },
};
