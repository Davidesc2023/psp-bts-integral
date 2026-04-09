import { supabase } from './supabaseClient';
import { withTenant } from '@/utils/getCurrentTenant';
import type {
  ConsultaMedica,
  CreateConsultaRequest,
  RegistrarResultadoConsultaRequest,
} from '../types/consulta.types';
import { EstadoConsulta } from '../types/consulta.types';


function mapRow(r: any): ConsultaMedica {
  const medicoNombre = r.doctors
    ? `Dr. ${r.doctors.nombre ?? ''} ${r.doctors.apellido ?? ''}`.trim()
    : undefined;
  return {
    id: r.id,
    pacienteId: r.paciente_id,
    medicoId: r.medico_id,
    medicoNombre,
    tipo: r.tipo,
    estado: r.estado,
    fechaProgramada: r.fecha_programada,
    horaProgramada: r.hora_programada,
    fechaRealizacion: r.fecha_realizacion,
    motivoConsulta: r.motivo_consulta,
    hallazgosClinicosSubjetivos: r.hallazgos_subjetivos,
    hallazgosClinicosObjetivos: r.hallazgos_objetivos,
    evaluacionDiagnostica: r.evaluacion_diagnostica,
    planManejo: r.plan_manejo,
    pesoKg: r.peso_kg,
    tallaCm: r.talla_cm,
    imcCalculado: r.imc_calculado,
    tensionArterialSistolica: r.tension_sistolica,
    tensionArterialDiastolica: r.tension_diastolica,
    frecuenciaCardiacaRpm: r.frecuencia_cardiaca,
    saturacionOxigenoPct: r.saturacion_oxigeno,
    temperaturaGrados: r.temperatura,
    respuestaAlTratamiento: r.respuesta_tratamiento,
    proxCitaFecha: r.prox_cita_fecha,
    proxCitaTipo: r.prox_cita_tipo,
    observaciones: r.observaciones,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    createdBy: r.created_by,
  };
}

const SELECT_WITH_JOINS = '*, doctors(nombre, apellido)';

export const consultaService = {
  async getAll(page = 0, size = 20) {
    const from = page * size;
    const to = from + size - 1;
    const { data, error, count } = await supabase
      .from('consultas_medicas')
      .select(SELECT_WITH_JOINS, { count: 'exact' })
      .order('fecha_programada', { ascending: false })
      .range(from, to);
    if (error) throw error;
    return { content: (data ?? []).map(mapRow), totalElements: count ?? 0 };
  },

  async getByPacienteId(pacienteId: number) {
    const { data, error } = await supabase
      .from('consultas_medicas')
      .select(SELECT_WITH_JOINS)
      .eq('paciente_id', pacienteId)
      .order('fecha_programada', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async getById(id: number) {
    const { data, error } = await supabase
      .from('consultas_medicas')
      .select(SELECT_WITH_JOINS)
      .eq('id', id)
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async create(req: CreateConsultaRequest) {
    const { data, error } = await supabase
      .from('consultas_medicas')
      .insert(await withTenant({
        paciente_id: req.pacienteId,
        medico_id: req.medicoId,
        tipo: req.tipo,
        estado: EstadoConsulta.PROGRAMADA,
        fecha_programada: req.fechaProgramada,
        hora_programada: req.horaProgramada,
        motivo_consulta: req.motivoConsulta,
        observaciones: req.observaciones,
      }))
      .select(SELECT_WITH_JOINS)
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async registrarResultado(id: number, req: RegistrarResultadoConsultaRequest) {
    const imcCalculado =
      req.pesoKg && req.tallaCm
        ? parseFloat((req.pesoKg / Math.pow(req.tallaCm / 100, 2)).toFixed(2))
        : undefined;

    const { data, error } = await supabase
      .from('consultas_medicas')
      .update({
        estado: EstadoConsulta.REALIZADA,
        fecha_realizacion: req.fechaRealizacion,
        hallazgos_subjetivos: req.hallazgosClinicosSubjetivos,
        hallazgos_objetivos: req.hallazgosClinicosObjetivos,
        evaluacion_diagnostica: req.evaluacionDiagnostica,
        plan_manejo: req.planManejo,
        peso_kg: req.pesoKg,
        talla_cm: req.tallaCm,
        imc_calculado: imcCalculado,
        tension_sistolica: req.tensionArterialSistolica,
        tension_diastolica: req.tensionArterialDiastolica,
        frecuencia_cardiaca: req.frecuenciaCardiacaRpm,
        saturacion_oxigeno: req.saturacionOxigenoPct,
        temperatura: req.temperaturaGrados,
        respuesta_tratamiento: req.respuestaAlTratamiento,
        prox_cita_fecha: req.proxCitaFecha,
        prox_cita_tipo: req.proxCitaTipo,
        observaciones: req.observaciones,
      })
      .eq('id', id)
      .select(SELECT_WITH_JOINS)
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async cancelar(id: number, motivo?: string) {
    const { data, error } = await supabase
      .from('consultas_medicas')
      .update({ estado: EstadoConsulta.CANCELADA, observaciones: motivo })
      .eq('id', id)
      .select(SELECT_WITH_JOINS)
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async marcarNoAsistio(id: number, motivo?: string) {
    const { data, error } = await supabase
      .from('consultas_medicas')
      .update({ estado: EstadoConsulta.NO_ASISTIO, observaciones: motivo || undefined })
      .eq('id', id)
      .select(SELECT_WITH_JOINS)
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async delete(id: number) {
    const { error } = await supabase
      .from('consultas_medicas')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },
};
