import { supabase } from './supabaseClient';
import { withTenant, getCurrentTenantId } from '@/utils/getCurrentTenant';

// TASK-010: Descuenta 1 unidad del inventario del paciente al registrar una aplicación.
// Usa el medicamento de la prescripción como primer criterio de búsqueda.
// Si no existe fila de inventario, no lanza error (silently skip).
async function descontarUnidadInventario(pacienteId: number, prescripcionId: number): Promise<void> {
  try {
    // Buscar medicamento_id en la prescripción
    const { data: presc } = await supabase
      .from('prescripciones')
      .select('medicamento_id')
      .eq('id', prescripcionId)
      .maybeSingle();

    // Buscar fila de inventario activa con stock > 0
    let q = supabase
      .from('inventario_paciente')
      .select('id, cantidad_disponible, cantidad_aplicada, tenant_id')
      .eq('paciente_id', pacienteId)
      .gt('cantidad_disponible', 0);

    if (presc?.medicamento_id) {
      q = q.eq('medicamento_id', presc.medicamento_id);
    }

    const { data: rows } = await q.limit(1);
    if (!rows || rows.length === 0) return;

    const inv = rows[0];
    const newDisp = Math.max(0, (inv.cantidad_disponible ?? 0) - 1);
    const newAplic = (inv.cantidad_aplicada ?? 0) + 1;

    await supabase
      .from('inventario_paciente')
      .update({
        cantidad_disponible: newDisp,
        cantidad_aplicada: newAplic,
        updated_at: new Date().toISOString(),
      })
      .eq('id', inv.id);

    // Registrar movimiento
    const tenantId = await getCurrentTenantId();
    await supabase.from('movimientos_inventario').insert({
      inventario_id: inv.id,
      tipo_movimiento: 'APLICACION',
      cantidad: 1,
      observaciones: 'Descuento automático por aplicación registrada',
      tenant_id: tenantId,
    });
  } catch {
    // No bloquear la aplicación si el inventario falla
  }
}
import type {
  Aplicacion,
  CreateAplicacionRequest,
  UpdateAplicacionRequest,
  AplicarRequest,
  NoAplicarRequest,
  GenerarAplicacionesMasivasRequest,
} from '../types/aplicacion.types';


function mapRow(r: any): Aplicacion {
  return {
    id: r.id,
    pacienteId: r.paciente_id,
    prescripcionId: r.prescripcion_id,
    educadoraId: r.educadora_id,
    tipo: r.tipo,
    estado: r.estado,
    estadoEfectividad: r.estado_efectividad,
    fase: r.fase,
    tipoInfusion: r.tipo_infusion,
    dosisAplicada: r.dosis_aplicada,
    dosisReal: r.dosis_real,
    sinPrescripcion: r.sin_prescripcion ?? false,
    fechaProgramada: r.fecha_programada,
    horaProgramada: r.hora_programada,
    fechaAplicacion: r.fecha_aplicacion,
    observaciones: r.observaciones,
    motivoNoAplicacion: r.motivo_no_aplicacion,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    createdBy: r.created_by,
    updatedBy: r.updated_by,
  };
}

export const aplicacionService = {
  async getAll(page = 0, size = 10) {
    const from = page * size;
    const to = from + size - 1;
    const { data, error, count } = await supabase
      .from('aplicaciones')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    return { content: (data ?? []).map(mapRow), totalElements: count ?? 0 };
  },

  async getById(id: number) {
    const { data, error } = await supabase
      .from('aplicaciones')
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
      .from('aplicaciones')
      .select('*', { count: 'exact' })
      .eq('paciente_id', pacienteId)
      .order('created_at', { ascending: false })
      .range(from, to);
    if (error) throw error;
    return { content: (data ?? []).map(mapRow), totalElements: count ?? 0 };
  },

  async getProgramadasDelDia(educadoraId: number, fecha: string) {
    const { data, error } = await supabase
      .from('aplicaciones')
      .select('*')
      .eq('educadora_id', educadoraId)
      .eq('fecha_programada', fecha)
      .eq('estado', 'PROGRAMADA')
      .order('hora_programada');
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async create(req: CreateAplicacionRequest) {
    const { data, error } = await supabase
      .from('aplicaciones')
      .insert(await withTenant({
        paciente_id: req.pacienteId,
        prescripcion_id: req.prescripcionId,
        educadora_id: req.educadoraId,
        tipo: req.tipo,
        estado: 'PROGRAMADA',
        fase: req.fase,
        tipo_infusion: req.tipoInfusion,
        sin_prescripcion: req.sinPrescripcion ?? false,
        fecha_programada: req.fechaProgramada,
        hora_programada: req.horaProgramada,
        observaciones: req.observaciones,
      }))
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async update(id: number, req: UpdateAplicacionRequest) {
    const update: Record<string, unknown> = {};
    if (req.educadoraId !== undefined) update.educadora_id = req.educadoraId;
    if (req.fechaProgramada !== undefined) update.fecha_programada = req.fechaProgramada;
    if (req.horaProgramada !== undefined) update.hora_programada = req.horaProgramada;
    if (req.observaciones !== undefined) update.observaciones = req.observaciones;

    const { data, error } = await supabase
      .from('aplicaciones')
      .update(update)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async marcarComoAplicada(id: number, req: AplicarRequest) {
    const { data, error } = await supabase
      .from('aplicaciones')
      .update({
        estado: 'APLICADA',
        dosis_aplicada: req.dosisAplicada,
        observaciones: req.observaciones,
        fecha_aplicacion: new Date().toISOString(),
        updated_by: req.aplicadoPor,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;

    // TASK-010: Descontar unidad del inventario del paciente
    await descontarUnidadInventario(data.paciente_id, data.prescripcion_id);

    return mapRow(data);
  },

  async marcarComoNoAplicada(id: number, req: NoAplicarRequest) {
    const { data, error } = await supabase
      .from('aplicaciones')
      .update({
        estado: 'NO_APLICADA',
        motivo_no_aplicacion: req.motivo,
        updated_by: req.actualizadoPor,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  async generarMasivas(req: GenerarAplicacionesMasivasRequest) {
    const rows: Record<string, unknown>[] = [];
    const start = new Date(req.fechaInicio);
    const end = new Date(req.fechaFin);
    // Obtener tenant una sola vez y preparar base del payload
    const base = await withTenant({
      paciente_id: req.pacienteId,
      prescripcion_id: req.prescripcionId,
      tipo: req.tipo,
      estado: 'PROGRAMADA',
      hora_programada: req.horaProgramada,
      educadora_id: req.educadoraId,
    });
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      rows.push({
        ...base,
        fecha_programada: d.toISOString().split('T')[0],
      });
    }
    const { data, error } = await supabase
      .from('aplicaciones')
      .insert(rows)
      .select();
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  async delete(id: number) {
    const { error } = await supabase.from('aplicaciones').delete().eq('id', id);
    if (error) throw error;
  },
};
