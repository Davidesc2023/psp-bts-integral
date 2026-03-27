import { supabase } from './supabaseClient';
import type {
  ServicioComplementario,
  CreateServicioComplementarioRequest,
  CompletarServicioRequest,
  CancelarServicioRequest,
  ProgramarServicioRequest,
  TipoServicioComplementario,
  EstadoServicioComplementario,
} from '../types';

const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';

function mapRow(r: any): ServicioComplementario {
  return {
    id: r.id,
    patientId: r.patient_id,
    patientName: r.patients
      ? `${r.patients.first_name ?? ''} ${r.patients.last_name ?? ''}`.trim()
      : undefined,
    tipoServicio: r.tipo_servicio,
    profesionalSolicitaId: r.profesional_solicita_id,
    fechaSolicitud: r.fecha_solicitud,
    fechaServicio: r.fecha_servicio,
    profesionalAtiende: r.profesional_atiende,
    estadoServicio: r.estado_servicio,
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
      .in('estado_servicio', ['SOLICITADO', 'PROGRAMADO'])
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
      .eq('estado_servicio', estado)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async listarProgramados(fechaInicio: string, fechaFin: string) {
    const { data, error } = await supabase
      .from('servicios_complementarios')
      .select('*, patients(first_name, last_name)')
      .eq('estado_servicio', 'PROGRAMADO')
      .gte('fecha_servicio', fechaInicio)
      .lte('fecha_servicio', fechaFin)
      .order('fecha_servicio');
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async crear(req: CreateServicioComplementarioRequest) {
    const { data, error } = await supabase
      .from('servicios_complementarios')
      .insert({
        tenant_id: DEFAULT_TENANT,
        patient_id: req.patientId,
        tipo_servicio: req.tipoServicio,
        profesional_solicita_id: req.profesionalSolicitaId,
        fecha_solicitud: req.fechaSolicitud ?? new Date().toISOString(),
        fecha_servicio: req.fechaServicio,
        observaciones: req.observaciones,
        estado_servicio: 'SOLICITADO',
      })
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async programar(id: string, req: ProgramarServicioRequest) {
    const { data, error } = await supabase
      .from('servicios_complementarios')
      .update({
        estado_servicio: 'PROGRAMADO',
        fecha_servicio: (req as any).fechaServicio,
        profesional_atiende: (req as any).profesionalAtiende,
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
        estado_servicio: 'REALIZADO',
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
        estado_servicio: 'CANCELADO',
        observaciones: (req as any).motivo ?? (req as any).observaciones,
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
