import { supabase } from './supabaseClient';
import { withTenant } from '@/utils/getCurrentTenant';
import type {
  Prescripcion,
  CreatePrescripcionRequest,
  UpdatePrescripcionRequest,
  Medicamento,
  CreateMedicamentoRequest,
  MedicoPrescriptor,
  CreateMedicoRequest,
} from '../types/prescripcion.types';


function mapPrescripcion(r: any): Prescripcion {
  return {
    id: r.id,
    pacienteId: r.paciente_id,
    medicamento: r.medications ? mapMedicamento(r.medications) : r.medicamento,
    medico: r.doctors ? mapMedico(r.doctors) : r.medico,
    dosis: r.dosis,
    dosis2: r.dosis_2,
    frecuencia: r.frecuencia,
    viaAdministracion: r.via_administracion,
    fechaInicio: r.fecha_inicio,
    fechaFin: r.fecha_fin,
    duracionDias: r.duracion_dias,
    unidadesTotales: r.unidades_totales,
    cantidadPrescrita: r.cantidad_prescrita,
    numeroPrescripcionMipres: r.numero_prescripcion_mipres,
    pesoPacienteKg: r.peso_paciente_kg,
    tallaPacienteCm: r.talla_paciente_cm,
    ipsPrescriptoraId: r.ips_id_prescriptora,
    estado: r.estado,
    indicaciones: r.indicaciones,
    observaciones: r.observaciones,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    createdBy: r.created_by,
    updatedBy: r.updated_by,
  };
}

function mapMedicamento(r: any): Medicamento {
  return {
    id: r.id,
    nombre: r.nombre,
    concentracion: r.concentracion,
    unidad: r.unidad,
    laboratorio: r.laboratorio,
    codigoAtc: r.codigo_atc,
    descripcion: r.descripcion,
    activo: r.activo,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function mapMedico(r: any): MedicoPrescriptor {
  return {
    id: r.id,
    nombre: r.nombre,
    apellido: r.apellido,
    registroMedico: r.registro_medico,
    especialidad: r.especialidad,
    telefono: r.telefono,
    email: r.email,
    activo: r.active ?? r.activo,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

// Prescripciones
export const prescripcionService = {
  async getAll(page = 0, size = 10) {
    const from = page * size;
    const to = from + size - 1;
    const { data, error, count } = await supabase
      .from('prescripciones')
      .select('*, medications(*), doctors(*)', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    return { content: (data ?? []).map(mapPrescripcion), totalElements: count ?? 0 };
  },

  async getById(id: number) {
    const { data, error } = await supabase
      .from('prescripciones')
      .select('*, medications(*), doctors(*)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return mapPrescripcion(data);
  },

  async getByPacienteId(pacienteId: number, page = 0, size = 10) {
    const from = page * size;
    const to = from + size - 1;
    const { data, error, count } = await supabase
      .from('prescripciones')
      .select('*, medications(*), doctors(*)', { count: 'exact' })
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    return { content: (data ?? []).map(mapPrescripcion), totalElements: count ?? 0 };
  },

  async getVigentesByPaciente(pacienteId: number) {
    const { data, error } = await supabase
      .from('prescripciones')
      .select('*, medications(*), doctors(*)')
      .eq('paciente_id', pacienteId)
      .eq('estado', 'VIGENTE')
      .order('fecha_inicio', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapPrescripcion);
  },

  async create(data: CreatePrescripcionRequest) {
    const { data: row, error } = await supabase
      .from('prescripciones')
      .insert(await withTenant({
        paciente_id: data.pacienteId,
        medicamento_id: data.medicamentoId,
        medico_id: data.medicoId,
        dosis: data.dosis,
        dosis_2: data.dosis2,
        frecuencia: data.frecuencia,
        via_administracion: data.viaAdministracion,
        fecha_inicio: data.fechaInicio,
        fecha_fin: data.fechaFin,
        duracion_dias: data.duracionDias,
        unidades_totales: data.unidadesTotales,
        cantidad_prescrita: data.cantidadPrescrita,
        numero_prescripcion_mipres: data.numeroPrescripcionMipres,
        peso_paciente_kg: data.pesoPacienteKg,
        talla_paciente_cm: data.tallaPacienteCm,
        ips_id_prescriptora: data.ipsPrescriptoraId,
        indicaciones: data.indicaciones,
        observaciones: data.observaciones,
        estado: 'VIGENTE',
      }))
      .select('*, medications(*), doctors(*)')
      .single();
    if (error) throw error;
    return mapPrescripcion(row);
  },

  async update(id: number, data: UpdatePrescripcionRequest) {
    const update: Record<string, unknown> = {};
    if (data.dosis !== undefined) update.dosis = data.dosis;
    if (data.dosis2 !== undefined) update.dosis_2 = data.dosis2;
    if (data.frecuencia !== undefined) update.frecuencia = data.frecuencia;
    if (data.fechaFin !== undefined) update.fecha_fin = data.fechaFin;
    if (data.viaAdministracion !== undefined) update.via_administracion = data.viaAdministracion;
    if (data.duracionDias !== undefined) update.duracion_dias = data.duracionDias;
    if (data.unidadesTotales !== undefined) update.unidades_totales = data.unidadesTotales;
    if (data.cantidadPrescrita !== undefined) update.cantidad_prescrita = data.cantidadPrescrita;
    if (data.numeroPrescripcionMipres !== undefined) update.numero_prescripcion_mipres = data.numeroPrescripcionMipres;
    if (data.pesoPacienteKg !== undefined) update.peso_paciente_kg = data.pesoPacienteKg;
    if (data.tallaPacienteCm !== undefined) update.talla_paciente_cm = data.tallaPacienteCm;
    if (data.ipsPrescriptoraId !== undefined) update.ips_id_prescriptora = data.ipsPrescriptoraId;
    if (data.indicaciones !== undefined) update.indicaciones = data.indicaciones;
    if (data.observaciones !== undefined) update.observaciones = data.observaciones;
    if (data.estado !== undefined) update.estado = data.estado;

    const { data: row, error } = await supabase
      .from('prescripciones')
      .update(update)
      .eq('id', id)
      .select('*, medications(*), doctors(*)')
      .single();
    if (error) throw error;
    return mapPrescripcion(row);
  },

  async delete(id: number) {
    const { error } = await supabase.from('prescripciones').delete().eq('id', id);
    if (error) throw error;
  },

  async marcarVencidas() {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('prescripciones')
      .update({ estado: 'VENCIDA' })
      .eq('estado', 'VIGENTE')
      .lt('fecha_fin', today)
      .select('id');
    if (error) throw error;
    return { marcadas: data?.length ?? 0 };
  },
};

// Medicamentos
export const medicamentoService = {
  async getAll(page = 0, size = 10) {
    const from = page * size;
    const to = from + size - 1;
    const { data, error, count } = await supabase
      .from('medications')
      .select('*', { count: 'exact' })
      .order('nombre')
      .range(from, to);
    if (error) throw error;
    return { content: (data ?? []).map(mapMedicamento), totalElements: count ?? 0 };
  },

  async getById(id: number) {
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return mapMedicamento(data);
  },

  async getActivos() {
    const { data, error } = await supabase
      .from('medications')
      .select('*')
      .eq('activo', true)
      .order('nombre');
    if (error) throw error;
    return (data ?? []).map(mapMedicamento);
  },

  async create(data: CreateMedicamentoRequest) {
    const { data: row, error } = await supabase
      .from('medications')
      .insert({
        nombre: data.nombre,
        concentracion: data.concentracion,
        unidad: data.unidad,
        laboratorio: data.laboratorio,
        codigo_atc: data.codigoAtc,
        descripcion: data.descripcion,
        activo: true,
      })
      .select()
      .single();
    if (error) throw error;
    return mapMedicamento(row);
  },

  async update(id: number, data: CreateMedicamentoRequest) {
    const { data: row, error } = await supabase
      .from('medications')
      .update({
        nombre: data.nombre,
        concentracion: data.concentracion,
        unidad: data.unidad,
        laboratorio: data.laboratorio,
        codigo_atc: data.codigoAtc,
        descripcion: data.descripcion,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapMedicamento(row);
  },
};

// Médicos Prescriptores
export const medicoService = {
  async getAll(page = 0, size = 10) {
    const from = page * size;
    const to = from + size - 1;
    const { data, error, count } = await supabase
      .from('doctors')
      .select('*', { count: 'exact' })
      .order('nombre')
      .range(from, to);
    if (error) throw error;
    return { content: (data ?? []).map(mapMedico), totalElements: count ?? 0 };
  },

  async getById(id: number) {
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return mapMedico(data);
  },

  async getActivos() {
    const { data, error } = await supabase
      .from('doctors')
      .select('*')
      .eq('active', true)
      .order('nombre');
    if (error) throw error;
    return (data ?? []).map(mapMedico);
  },

  async create(data: CreateMedicoRequest) {
    const { data: row, error } = await supabase
      .from('doctors')
      .insert({
        nombre: data.nombre,
        apellido: data.apellido,
        registro_medico: data.registroMedico,
        especialidad: data.especialidad,
        telefono: data.telefono,
        email: data.email,
        active: true,
      })
      .select()
      .single();
    if (error) throw error;
    return mapMedico(row);
  },
};
