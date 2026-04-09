import { supabase } from './supabaseClient';
import { withTenant } from '@/utils/getCurrentTenant';
import type {
  Entrega,
  CreateEntregaRequest,
  UpdateEntregaRequest,
  MarcarEnTransitoRequest,
  MarcarEntregadaRequest,
  MarcarDevueltaRequest,
} from '../types/entrega.types';


function mapRow(r: any): Entrega {
  return {
    id: r.id,
    pacienteId: r.paciente_id,
    prescripcionId: r.prescripcion_id,
    operadorLogisticoId: r.operador_logistico_id,
    tipo: r.tipo,
    estado: r.estado,
    fechaProgramada: r.fecha_programada,
    fechaDespacho: r.fecha_despacho,
    fechaEntrega: r.fecha_entrega,
    lote: r.lote,
    fechaVencimiento: r.fecha_vencimiento,
    fechaFinMedicamento: r.fecha_fin_medicamento,
    cantidadEntregada: r.cantidad_entregada,
    numeroGuia: r.numero_guia,
    numeroEntrega: r.numero_entrega,
    facturaDespacho: r.factura_despacho,
    comprobanteEntrega: r.comprobante_entrega,
    direccionEntrega: r.direccion_entrega,
    nombreReceptor: r.nombre_receptor,
    cedulaReceptor: r.cedula_receptor,
    observaciones: r.observaciones,
    motivoDevolucion: r.motivo_devolucion,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    createdBy: r.created_by,
    updatedBy: r.updated_by,
  };
}

export const entregaService = {
  async getAll(page = 0, size = 10) {
    const from = page * size;
    const to = from + size - 1;
    const { data, error, count } = await supabase
      .from('entregas')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    return { content: (data ?? []).map(mapRow), totalElements: count ?? 0 };
  },

  async getById(id: number) {
    const { data, error } = await supabase
      .from('entregas')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async getByPacienteId(pacienteId: number, page = 0, size = 10) {
    const from = page * size;
    const to = from + size - 1;
    const { data, error, count } = await supabase
      .from('entregas')
      .select('*', { count: 'exact' })
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    return { content: (data ?? []).map(mapRow), totalElements: count ?? 0 };
  },

  async getEnTransito() {
    const { data, error } = await supabase
      .from('entregas')
      .select('*')
      .eq('estado', 'EN_TRANSITO')
      .order('fecha_programada');
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async getProgramadasHasta(fecha: string) {
    const { data, error } = await supabase
      .from('entregas')
      .select('*')
      .eq('estado', 'PROGRAMADA')
      .lte('fecha_programada', fecha)
      .order('fecha_programada');
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async getMedicamentosPorVencer(dias = 30) {
    const limitDate = new Date();
    limitDate.setDate(limitDate.getDate() + dias);
    const { data, error } = await supabase
      .from('entregas')
      .select('*')
      .not('fecha_vencimiento', 'is', null)
      .lte('fecha_vencimiento', limitDate.toISOString().split('T')[0])
      .order('fecha_vencimiento');
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async create(req: CreateEntregaRequest) {
    const { data, error } = await supabase
      .from('entregas')
      .insert(await withTenant({
        paciente_id: req.pacienteId,
        prescripcion_id: req.prescripcionId,
        operador_logistico_id: req.operadorLogisticoId,
        tipo: req.tipo,
        estado: 'PROGRAMADA',
        fecha_programada: req.fechaProgramada,
        lote: req.lote,
        fecha_vencimiento: req.fechaVencimiento,
        fecha_fin_medicamento: req.fechaFinMedicamento,
        factura_despacho: req.facturaDespacho,
        direccion_entrega: req.direccionEntrega,
        observaciones: req.observaciones,
      }))
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async update(id: number, req: UpdateEntregaRequest) {
    const update: Record<string, unknown> = {};
    if (req.operadorLogisticoId !== undefined) update.operador_logistico_id = req.operadorLogisticoId;
    if (req.fechaProgramada !== undefined) update.fecha_programada = req.fechaProgramada;
    if (req.lote !== undefined) update.lote = req.lote;
    if (req.fechaVencimiento !== undefined) update.fecha_vencimiento = req.fechaVencimiento;
    if (req.direccionEntrega !== undefined) update.direccion_entrega = req.direccionEntrega;
    if (req.observaciones !== undefined) update.observaciones = req.observaciones;

    const { data, error } = await supabase
      .from('entregas')
      .update(update)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async marcarEnTransito(id: number, req: MarcarEnTransitoRequest) {
    const { data, error } = await supabase
      .from('entregas')
      .update({
        estado: 'EN_TRANSITO',
        numero_guia: req.numeroGuia,
        fecha_despacho: new Date().toISOString(),
        updated_by: req.actualizadoPor,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async marcarEntregada(id: number, req: MarcarEntregadaRequest) {
    const { data, error } = await supabase
      .from('entregas')
      .update({
        estado: 'ENTREGADA',
        nombre_receptor: req.nombreReceptor,
        cedula_receptor: req.cedulaReceptor,
        cantidad_entregada: req.cantidadEntregada,
        factura_despacho: req.facturaDespacho,
        comprobante_entrega: req.comprobanteEntrega,
        fecha_entrega: new Date().toISOString(),
        updated_by: req.recibidoPor,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async marcarDevuelta(id: number, req: MarcarDevueltaRequest) {
    const { data, error } = await supabase
      .from('entregas')
      .update({
        estado: 'DEVUELTA',
        motivo_devolucion: req.motivo,
        updated_by: req.actualizadoPor,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async delete(id: number) {
    const { error } = await supabase.from('entregas').delete().eq('id', id);
    if (error) throw error;
  },
};
