import { supabase } from './supabaseClient';
import { withTenant } from '@/utils/getCurrentTenant';
import type {
  Transporte,
  CreateTransporteRequest,
  CambiarEstadoRequest,
} from '../types/transporte.types';


function mapRow(r: any): Transporte {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    pacienteId: r.paciente_id,
    pacienteNombre: r.paciente_nombre,
    direccionOrigen: r.direccion_origen,
    barrioOrigen: r.barrio_origen,
    municipioOrigen: r.municipio_origen,
    departamentoOrigen: r.departamento_origen,
    telefonoContacto: r.telefono_contacto,
    tratamiento: r.tratamiento,
    direccionDestino: r.direccion_destino,
    barrioDestino: r.barrio_destino,
    municipioDestino: r.municipio_destino,
    departamentoDestino: r.departamento_destino,
    nombreIpsDestino: r.nombre_ips_destino,
    fechaServicio: r.fecha_servicio,
    horaServicio: r.hora_servicio,
    tipoServicio: r.tipo_servicio,
    fechaRegreso: r.fecha_regreso,
    horaRegreso: r.hora_regreso,
    requiereAcompanante: r.requiere_acompanante,
    nombreAcompanante: r.nombre_acompanante,
    gestoraSolicitante: r.gestora_solicitante,
    requerimientoTransporte: r.requerimiento_transporte,
    condicionesEspeciales: r.condiciones_especiales,
    comentarios: r.comentarios,
    estado: r.estado,
    fechaCierre: r.fecha_cierre,
    observacionesCierre: r.observaciones_cierre,
    quienCierra: r.quien_cierra,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    createdBy: r.created_by,
    updatedBy: r.updated_by,
  };
}

export const transporteService = {
  async getAll(page = 0, size = 20) {
    const from = page * size;
    const to = from + size - 1;
    const { data, error, count } = await supabase
      .from('transportes')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    return { content: (data ?? []).map(mapRow), totalElements: count ?? 0 };
  },

  async getById(id: number) {
    const { data, error } = await supabase
      .from('transportes')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async getByPacienteId(pacienteId: number, page = 0, size = 20) {
    const from = page * size;
    const to = from + size - 1;
    const { data, error, count } = await supabase
      .from('transportes')
      .select('*', { count: 'exact' })
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    return { content: (data ?? []).map(mapRow), totalElements: count ?? 0 };
  },

  async getByEstado(estado: string, page = 0, size = 20) {
    const from = page * size;
    const to = from + size - 1;
    const { data, error, count } = await supabase
      .from('transportes')
      .select('*', { count: 'exact' })
      .eq('estado', estado)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    return { content: (data ?? []).map(mapRow), totalElements: count ?? 0 };
  },

  async getHoy() {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('transportes')
      .select('*')
      .eq('fecha_servicio', today)
      .order('hora_servicio');
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async getPendientes() {
    const { data, error } = await supabase
      .from('transportes')
      .select('*')
      .eq('estado', 'PENDIENTE')
      .order('fecha_servicio');
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async create(req: CreateTransporteRequest) {
    const { data, error } = await supabase
      .from('transportes')
      .insert(await withTenant({
        paciente_id: req.pacienteId,
        paciente_nombre: req.pacienteNombre,
        direccion_origen: req.direccionOrigen,
        barrio_origen: req.barrioOrigen,
        municipio_origen: req.municipioOrigen,
        departamento_origen: req.departamentoOrigen,
        telefono_contacto: req.telefonoContacto,
        tratamiento: req.tratamiento,
        direccion_destino: req.direccionDestino,
        barrio_destino: req.barrioDestino,
        municipio_destino: req.municipioDestino,
        departamento_destino: req.departamentoDestino,
        nombre_ips_destino: req.nombreIpsDestino,
        fecha_servicio: req.fechaServicio,
        hora_servicio: req.horaServicio,
        tipo_servicio: req.tipoServicio ?? 'SENCILLO',
        fecha_regreso: req.fechaRegreso,
        hora_regreso: req.horaRegreso,
        requiere_acompanante: req.requiereAcompanante ?? false,
        nombre_acompanante: req.nombreAcompanante,
        gestora_solicitante: req.gestoraSolicitante,
        requerimiento_transporte: req.requerimientoTransporte,
        condiciones_especiales: req.condicionesEspeciales,
        comentarios: req.comentarios,
        estado: 'PENDIENTE',
      }))
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async update(id: number, req: Partial<CreateTransporteRequest>) {
    const update: Record<string, unknown> = {};
    if (req.pacienteNombre !== undefined) update.paciente_nombre = req.pacienteNombre;
    if (req.direccionOrigen !== undefined) update.direccion_origen = req.direccionOrigen;
    if (req.barrioOrigen !== undefined) update.barrio_origen = req.barrioOrigen;
    if (req.municipioOrigen !== undefined) update.municipio_origen = req.municipioOrigen;
    if (req.departamentoOrigen !== undefined) update.departamento_origen = req.departamentoOrigen;
    if (req.telefonoContacto !== undefined) update.telefono_contacto = req.telefonoContacto;
    if (req.tratamiento !== undefined) update.tratamiento = req.tratamiento;
    if (req.direccionDestino !== undefined) update.direccion_destino = req.direccionDestino;
    if (req.barrioDestino !== undefined) update.barrio_destino = req.barrioDestino;
    if (req.municipioDestino !== undefined) update.municipio_destino = req.municipioDestino;
    if (req.departamentoDestino !== undefined) update.departamento_destino = req.departamentoDestino;
    if (req.nombreIpsDestino !== undefined) update.nombre_ips_destino = req.nombreIpsDestino;
    if (req.fechaServicio !== undefined) update.fecha_servicio = req.fechaServicio;
    if (req.horaServicio !== undefined) update.hora_servicio = req.horaServicio;
    if (req.tipoServicio !== undefined) update.tipo_servicio = req.tipoServicio;
    if (req.fechaRegreso !== undefined) update.fecha_regreso = req.fechaRegreso;
    if (req.horaRegreso !== undefined) update.hora_regreso = req.horaRegreso;
    if (req.requiereAcompanante !== undefined) update.requiere_acompanante = req.requiereAcompanante;
    if (req.nombreAcompanante !== undefined) update.nombre_acompanante = req.nombreAcompanante;
    if (req.gestoraSolicitante !== undefined) update.gestora_solicitante = req.gestoraSolicitante;
    if (req.requerimientoTransporte !== undefined) update.requerimiento_transporte = req.requerimientoTransporte;
    if (req.condicionesEspeciales !== undefined) update.condiciones_especiales = req.condicionesEspeciales;
    if (req.comentarios !== undefined) update.comentarios = req.comentarios;

    const { data, error } = await supabase
      .from('transportes')
      .update(update)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async cambiarEstado(id: number, req: CambiarEstadoRequest) {
    const { data, error } = await supabase
      .from('transportes')
      .update({
        estado: req.estado,
        observaciones_cierre: req.observacionesCierre,
        quien_cierra: req.quienCierra,
        fecha_cierre: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async delete(id: number) {
    const { error } = await supabase.from('transportes').delete().eq('id', id);
    if (error) throw error;
  },
};
