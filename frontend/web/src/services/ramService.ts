import { supabase } from '@services/supabaseClient';
import { getCurrentTenantId } from '@/utils/getCurrentTenant';

export interface Ram {
  id: number;
  pacienteId: number;
  medicamentoId?: number;
  medicamentoNombre?: string;
  fechaRam: string;
  descripcion: string;
  gravedad: 'LEVE' | 'MODERADA' | 'GRAVE' | 'MORTAL';
  estado: 'ACTIVA' | 'RESUELTA' | 'EN_SEGUIMIENTO';
  reportadoAInvima: boolean;
  observaciones?: string;
  registradoPor?: string;
  createdAt?: string;
}

function mapRow(r: any): Ram {
  return {
    id: r.id,
    pacienteId: r.paciente_id,
    medicamentoId: r.medicamento_id,
    medicamentoNombre: r.medications?.nombre,
    fechaRam: r.fecha_ram,
    descripcion: r.descripcion,
    gravedad: r.gravedad,
    estado: r.estado,
    reportadoAInvima: r.reportado_a_invima ?? false,
    observaciones: r.observaciones,
    registradoPor: r.registrado_por,
    createdAt: r.created_at,
  };
}

export const ramService = {
  listar: async (pacienteId: number): Promise<Ram[]> => {
    const tenantId = await getCurrentTenantId();
    const { data, error } = await supabase
      .from('rams')
      .select('*, medications(nombre)')
      .eq('tenant_id', tenantId)
      .eq('paciente_id', pacienteId)
      .order('fecha_ram', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  crear: async (payload: {
    pacienteId: number;
    medicamentoId?: number;
    fechaRam: string;
    descripcion: string;
    gravedad: Ram['gravedad'];
    estado?: Ram['estado'];
    reportadoAInvima?: boolean;
    observaciones?: string;
    registradoPor?: string;
  }): Promise<Ram> => {
    const tenantId = await getCurrentTenantId();
    const { data, error } = await supabase
      .from('rams')
      .insert({
        tenant_id: tenantId,
        paciente_id: payload.pacienteId,
        medicamento_id: payload.medicamentoId ?? null,
        fecha_ram: payload.fechaRam,
        descripcion: payload.descripcion,
        gravedad: payload.gravedad,
        estado: payload.estado ?? 'ACTIVA',
        reportado_a_invima: payload.reportadoAInvima ?? false,
        observaciones: payload.observaciones ?? null,
        registrado_por: payload.registradoPor ?? null,
      })
      .select('*, medications(nombre)')
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  actualizar: async (
    id: number,
    patch: Partial<Pick<Ram, 'estado' | 'reportadoAInvima' | 'observaciones'>>
  ): Promise<void> => {
    const { error } = await supabase
      .from('rams')
      .update({
        ...(patch.estado !== undefined && { estado: patch.estado }),
        ...(patch.reportadoAInvima !== undefined && { reportado_a_invima: patch.reportadoAInvima }),
        ...(patch.observaciones !== undefined && { observaciones: patch.observaciones }),
      })
      .eq('id', id);
    if (error) throw error;
  },
};
