import { supabase } from '@services/supabaseClient';

const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';

export interface MedicamentoInventario {
  id: number;
  nombre: string;
  codigo: string;
  categoria: string;
  tratamiento?: string;
  pacienteNombre?: string;
  pacienteId?: number;
  stockActual: number;
  stockMinimo: number;
  unidad: string;
  vencimiento: string;
  estado: 'DISPONIBLE' | 'CRITICO' | 'AGOTADO';
  prescripcionVinculada?: string;
}

function deriveEstado(cantidadDisponible: number): 'DISPONIBLE' | 'CRITICO' | 'AGOTADO' {
  if (cantidadDisponible <= 0) return 'AGOTADO';
  if (cantidadDisponible <= 5) return 'CRITICO';
  return 'DISPONIBLE';
}

function mapRow(row: any): MedicamentoInventario {
  const cantDisp = row.cantidad_disponible ?? 0;
  return {
    id: row.id,
    nombre: row.medications?.nombre ?? row.medicamento_id ?? '',
    codigo: row.lote ?? '',
    categoria: '',
    tratamiento: undefined,
    pacienteNombre: row.patients
      ? `${row.patients.first_name ?? ''} ${row.patients.last_name ?? ''}`.trim()
      : undefined,
    pacienteId: row.paciente_id ?? undefined,
    stockActual: cantDisp,
    stockMinimo: 0,
    unidad: row.unidad_medida ?? '',
    vencimiento: row.fecha_vencimiento ?? '',
    estado: deriveEstado(cantDisp),
    prescripcionVinculada: row.entrega_id ?? undefined,
  };
}

export const inventarioService = {
  getInventario: async (patientId?: number): Promise<MedicamentoInventario[]> => {
    let query = supabase
      .from('inventario_paciente')
      .select('*, medications(nombre), patients(first_name, last_name)')
      .eq('tenant_id', DEFAULT_TENANT);

    if (patientId) {
      query = query.eq('paciente_id', patientId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  registrar: async (data: Partial<MedicamentoInventario>): Promise<MedicamentoInventario> => {
    const { data: row, error } = await supabase
      .from('inventario_paciente')
      .insert({
        tenant_id: DEFAULT_TENANT,
        paciente_id: data.pacienteId,
        medicamento_id: null,
        lote: data.codigo ?? null,
        cantidad_entregada: data.stockActual ?? 0,
        cantidad_disponible: data.stockActual ?? 0,
        cantidad_aplicada: 0,
        unidad_medida: data.unidad ?? '',
        fecha_entrega: new Date().toISOString(),
        fecha_vencimiento: data.vencimiento ?? null,
      })
      .select('*, medications(nombre), patients(first_name, last_name)')
      .single();
    if (error) throw error;
    return mapRow(row);
  },

  ajustarStock: async (
    medicamentoId: number,
    data: { tipoMovimiento: string; cantidad: number; lote?: string; observaciones?: string },
  ): Promise<MedicamentoInventario> => {
    // Insert movement record
    await supabase.from('movimientos_inventario').insert({
      inventario_id: medicamentoId,
      tipo_movimiento: data.tipoMovimiento,
      cantidad: data.cantidad,
      lote: data.lote ?? null,
      observaciones: data.observaciones ?? null,
      tenant_id: DEFAULT_TENANT,
    });

    // Adjust stock on the inventory row
    const { data: current, error: fe } = await supabase
      .from('inventario_paciente')
      .select('cantidad_disponible')
      .eq('id', medicamentoId)
      .single();
    if (fe) throw fe;

    const delta = data.tipoMovimiento === 'SALIDA' ? -data.cantidad : data.cantidad;
    const newQty = Math.max(0, (current.cantidad_disponible ?? 0) + delta);

    const { data: row, error } = await supabase
      .from('inventario_paciente')
      .update({ cantidad_disponible: newQty, updated_at: new Date().toISOString() })
      .eq('id', medicamentoId)
      .select('*, medications(nombre), patients(first_name, last_name)')
      .single();
    if (error) throw error;
    return mapRow(row);
  },
};
