import { supabase } from './supabaseClient';

export type EstadoFactura = 'PENDIENTE' | 'FACTURADA' | 'PAGADA' | 'ANULADA';

export interface FacturacionItem {
  id: string;
  patientId: number;
  patientName: string;
  servicioId: string | null;
  tipoConcepto: string;
  fechaServicio: string;
  valor: number;
  estadoFactura: EstadoFactura;
  numeroFactura: string | null;
  fechaFacturacion: string | null;
  fechaPago: string | null;
  observaciones: string | null;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface CreateFacturacionRequest {
  patientId: number;
  servicioId?: string;
  tipoConcepto: string;
  fechaServicio: string;
  valor: number;
  estadoFactura?: string;
  numeroFactura?: string;
  fechaFacturacion?: string;
  observaciones?: string;
}

export interface UpdateFacturacionRequest {
  patientId?: number;
  servicioId?: string;
  tipoConcepto?: string;
  fechaServicio?: string;
  valor?: number;
  estadoFactura?: string;
  numeroFactura?: string;
  fechaFacturacion?: string;
  fechaPago?: string;
  observaciones?: string;
}

const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';

function mapRow(r: any): FacturacionItem {
  return {
    id: r.id,
    patientId: r.patient_id,
    patientName: r.patients
      ? `${r.patients.first_name ?? ''} ${r.patients.last_name ?? ''}`.trim()
      : '',
    servicioId: r.servicio_id,
    tipoConcepto: r.tipo_concepto,
    fechaServicio: r.fecha_servicio,
    valor: r.valor,
    estadoFactura: r.estado_factura,
    numeroFactura: r.numero_factura,
    fechaFacturacion: r.fecha_facturacion,
    fechaPago: r.fecha_pago,
    observaciones: r.observaciones,
    fechaCreacion: r.created_at,
    fechaActualizacion: r.updated_at,
  };
}

export const facturacionService = {
  async listar() {
    const { data, error } = await supabase
      .from('facturacion')
      .select('*, patients(first_name, last_name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async obtenerPorId(id: string) {
    const { data, error } = await supabase
      .from('facturacion')
      .select('*, patients(first_name, last_name)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async obtenerPorPaciente(pacienteId: number) {
    const { data, error } = await supabase
      .from('facturacion')
      .select('*, patients(first_name, last_name)')
      .eq('patient_id', pacienteId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async obtenerPorEstado(estado: EstadoFactura) {
    const { data, error } = await supabase
      .from('facturacion')
      .select('*, patients(first_name, last_name)')
      .eq('estado_factura', estado)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async obtenerPorRangoFechas(desde: string, hasta: string) {
    const { data, error } = await supabase
      .from('facturacion')
      .select('*, patients(first_name, last_name)')
      .gte('fecha_servicio', desde)
      .lte('fecha_servicio', hasta)
      .order('fecha_servicio', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async crear(req: CreateFacturacionRequest) {
    const { data, error } = await supabase
      .from('facturacion')
      .insert({
        tenant_id: DEFAULT_TENANT,
        patient_id: req.patientId,
        servicio_id: req.servicioId,
        tipo_concepto: req.tipoConcepto,
        fecha_servicio: req.fechaServicio,
        valor: req.valor,
        estado_factura: req.estadoFactura ?? 'PENDIENTE',
        numero_factura: req.numeroFactura,
        fecha_facturacion: req.fechaFacturacion,
        observaciones: req.observaciones,
      })
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async actualizar(id: string, req: UpdateFacturacionRequest) {
    const update: Record<string, unknown> = {};
    if (req.patientId !== undefined) update.patient_id = req.patientId;
    if (req.servicioId !== undefined) update.servicio_id = req.servicioId;
    if (req.tipoConcepto !== undefined) update.tipo_concepto = req.tipoConcepto;
    if (req.fechaServicio !== undefined) update.fecha_servicio = req.fechaServicio;
    if (req.valor !== undefined) update.valor = req.valor;
    if (req.estadoFactura !== undefined) update.estado_factura = req.estadoFactura;
    if (req.numeroFactura !== undefined) update.numero_factura = req.numeroFactura;
    if (req.fechaFacturacion !== undefined) update.fecha_facturacion = req.fechaFacturacion;
    if (req.fechaPago !== undefined) update.fecha_pago = req.fechaPago;
    if (req.observaciones !== undefined) update.observaciones = req.observaciones;

    const { data, error } = await supabase
      .from('facturacion')
      .update(update)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async eliminar(id: string) {
    const { error } = await supabase.from('facturacion').delete().eq('id', id);
    if (error) throw error;
  },
};
