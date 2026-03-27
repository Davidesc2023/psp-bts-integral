import { supabase } from './supabaseClient';
import {
  Paraclinico,
  TipoParaclinico,
  CreateParaclinicoRequest,
  RegistrarResultadoRequest,
  PaginatedResponse,
} from '@/types';

const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';

function mapRow(r: any): Paraclinico {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    patientId: r.patient_id,
    patientName: r.patients
      ? `${r.patients.first_name ?? ''} ${r.patients.last_name ?? ''}`.trim()
      : undefined,
    tipoParaclinicoId: r.tipo_paraclinico_id,
    tipoParaclinicoNombre: r.tipos_paraclinicos?.nombre,
    tipoParaclinicoCodigo: r.tipos_paraclinicos?.codigo,
    fechaSolicitud: r.fecha_solicitud,
    fechaRealizacion: r.fecha_realizacion,
    fechaResultado: r.fecha_resultado,
    valorResultado: r.valor_resultado,
    valorTexto: r.valor_texto,
    estadoResultado: r.estado_resultado,
    esNormal: r.es_normal,
    interpretacion: r.interpretacion,
    observaciones: r.observaciones,
    medicoSolicitaId: r.medico_solicita_id,
    laboratorioExterno: r.laboratorio_externo,
    profesionalResponsable: r.profesional_responsable,
    fechaCreacion: r.created_at,
    fechaActualizacion: r.updated_at,
  };
}

function mapTipo(r: any): TipoParaclinico {
  return {
    id: r.id,
    codigo: r.codigo,
    nombre: r.nombre,
    categoria: r.categoria,
    unidadMedida: r.unidad_medida,
    valorReferenciaMin: r.valor_referencia_min,
    valorReferenciaMax: r.valor_referencia_max,
    descripcion: r.descripcion,
    activo: r.activo,
  };
}

const SELECT_WITH_JOINS = '*, patients(first_name, last_name), tipos_paraclinicos(nombre, codigo)';

export const paraclinicoService = {

  listar: async (params: { page?: number; size?: number } = {}): Promise<Paraclinico[]> => {
    const { page = 0, size = 50 } = params;
    const from = page * size;
    const to = from + size - 1;
    const { data, error } = await supabase
      .from('paraclinicos')
      .select(SELECT_WITH_JOINS)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  listarPorPaciente: async (patientId: number): Promise<Paraclinico[]> => {
    const { data, error } = await supabase
      .from('paraclinicos')
      .select(SELECT_WITH_JOINS)
      .eq('patient_id', patientId)
      .order('fecha_solicitud', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  pendientesPorPaciente: async (patientId: number): Promise<Paraclinico[]> => {
    const { data, error } = await supabase
      .from('paraclinicos')
      .select(SELECT_WITH_JOINS)
      .eq('patient_id', patientId)
      .in('estado_resultado', ['PENDIENTE', 'EN_PROCESO'])
      .order('fecha_solicitud', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  obtener: async (id: string): Promise<Paraclinico> => {
    const { data, error } = await supabase
      .from('paraclinicos')
      .select(SELECT_WITH_JOINS)
      .eq('id', id)
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  crear: async (req: CreateParaclinicoRequest): Promise<Paraclinico> => {
    const { data, error } = await supabase
      .from('paraclinicos')
      .insert({
        tenant_id: DEFAULT_TENANT,
        patient_id: req.patientId,
        tipo_paraclinico_id: req.tipoParaclinicoId,
        fecha_solicitud: req.fechaSolicitud,
        fecha_realizacion: req.fechaRealizacion,
        medico_solicita_id: req.medicoSolicitaId,
        laboratorio_externo: req.laboratorioExterno,
        observaciones: req.observaciones,
        estado_resultado: 'PENDIENTE',
      })
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  registrarResultado: async (id: string, req: RegistrarResultadoRequest): Promise<Paraclinico> => {
    const { data, error } = await supabase
      .from('paraclinicos')
      .update({
        valor_resultado: req.valorResultado,
        valor_texto: req.valorTexto,
        es_normal: req.esNormal,
        interpretacion: req.interpretacion,
        profesional_responsable: req.profesionalResponsable,
        observaciones: req.observaciones,
        estado_resultado: 'REALIZADO',
        fecha_resultado: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  registrarResultadoTexto: async (id: string, valorTexto: string, observaciones?: string): Promise<Paraclinico> => {
    const { data, error } = await supabase
      .from('paraclinicos')
      .update({
        valor_texto: valorTexto,
        observaciones,
        estado_resultado: 'REALIZADO',
        fecha_resultado: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  cancelar: async (id: string, motivoCancelacion?: string): Promise<Paraclinico> => {
    const { data, error } = await supabase
      .from('paraclinicos')
      .update({
        estado_resultado: 'CANCELADO',
        observaciones: motivoCancelacion,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  listarTipos: async (): Promise<TipoParaclinico[]> => {
    const { data, error } = await supabase
      .from('tipos_paraclinicos')
      .select('*')
      .order('nombre');
    if (error) throw error;
    return (data ?? []).map(mapTipo);
  },
};
