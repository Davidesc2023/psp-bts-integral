import { supabase } from './supabaseClient';
import {
  Barrier,
  BarrierRequest,
  CloseBarrierRequest,
  PaginatedResponse,
} from '@/types';

const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';

function mapRow(r: any): Barrier {
  return {
    id: r.id,
    patientId: r.patient_id,
    patientName: r.patients
      ? `${r.patients.first_name ?? ''} ${r.patients.last_name ?? ''}`.trim()
      : undefined,
    patientDocument: r.patients?.document_number,
    tenantId: r.tenant_id,
    category: r.category,
    subcategory: r.subcategory,
    description: r.description,
    detailedNotes: r.detailed_notes,
    responsibleArea: r.responsible_area,
    status: r.status,
    prioridad: r.prioridad,
    openedAt: r.opened_at,
    expectedResolutionDate: r.expected_resolution_date,
    closedAt: r.closed_at,
    resolvedBy: r.resolved_by,
    resolutionNotes: r.resolution_notes,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    createdBy: r.created_by,
  };
}

export const barrierService = {

  listar: async (
    params: { status?: string; category?: string; page?: number; size?: number } = {}
  ): Promise<PaginatedResponse<Barrier>> => {
    const { status, category, page = 0, size = 20 } = params;
    const from = page * size;
    const to = from + size - 1;

    let query = supabase
      .from('barriers')
      .select('*, patients(first_name, last_name, document_number)', { count: 'exact' });

    if (status) query = query.eq('status', status);
    if (category) query = query.eq('category', category);

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;
    const totalElements = count ?? 0;
    const totalPages = Math.ceil(totalElements / size);
    return {
      content: (data ?? []).map(mapRow),
      totalElements,
      totalPages,
      size,
      number: page,
      first: page === 0,
      last: page >= totalPages - 1,
    };
  },

  listarPorPaciente: async (patientId: number): Promise<Barrier[]> => {
    const { data, error } = await supabase
      .from('barriers')
      .select('*, patients(first_name, last_name, document_number)')
      .eq('patient_id', patientId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  obtenerActivo: async (patientId: number): Promise<Barrier | null> => {
    const { data, error } = await supabase
      .from('barriers')
      .select('*, patients(first_name, last_name, document_number)')
      .eq('patient_id', patientId)
      .in('status', ['ABIERTA', 'EN_PROCESO'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) throw error;
    return data ? mapRow(data) : null;
  },

  tieneActiva: async (patientId: number): Promise<boolean> => {
    const { count, error } = await supabase
      .from('barriers')
      .select('id', { count: 'exact', head: true })
      .eq('patient_id', patientId)
      .in('status', ['ABIERTA', 'EN_PROCESO']);
    if (error) throw error;
    return (count ?? 0) > 0;
  },

  obtener: async (id: string): Promise<Barrier> => {
    const { data, error } = await supabase
      .from('barriers')
      .select('*, patients(first_name, last_name, document_number)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  crear: async (data: BarrierRequest): Promise<Barrier> => {
    const { data: row, error } = await supabase
      .from('barriers')
      .insert({
        tenant_id: DEFAULT_TENANT,
        patient_id: data.patientId,
        category: data.category,
        subcategory: data.subcategory,
        description: data.description,
        detailed_notes: data.detailedNotes,
        responsible_area: data.responsibleArea,
        expected_resolution_date: data.expectedResolutionDate,
        prioridad: data.prioridad ?? 'MEDIA',
        status: 'ABIERTA',
        opened_at: new Date().toISOString(),
      })
      .select()
      .single();
    if (error) throw error;
    return mapRow(row);
  },

  actualizar: async (id: string, data: BarrierRequest): Promise<Barrier> => {
    const { data: row, error } = await supabase
      .from('barriers')
      .update({
        patient_id: data.patientId,
        category: data.category,
        subcategory: data.subcategory,
        description: data.description,
        detailed_notes: data.detailedNotes,
        responsible_area: data.responsibleArea,
        expected_resolution_date: data.expectedResolutionDate,
        prioridad: data.prioridad,
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapRow(row);
  },

  enProceso: async (id: string): Promise<Barrier> => {
    const { data: row, error } = await supabase
      .from('barriers')
      .update({ status: 'EN_PROCESO' })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapRow(row);
  },

  cerrar: async (id: string, data: CloseBarrierRequest): Promise<Barrier> => {
    const { data: row, error } = await supabase
      .from('barriers')
      .update({
        status: 'CERRADA',
        resolved_by: data.resolvedBy,
        resolution_notes: data.resolutionNotes,
        closed_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapRow(row);
  },

  contarActivas: async (): Promise<number> => {
    const { count, error } = await supabase
      .from('barriers')
      .select('id', { count: 'exact', head: true })
      .in('status', ['ABIERTA', 'EN_PROCESO']);
    if (error) throw error;
    return count ?? 0;
  },

  vencidas: async (): Promise<Barrier[]> => {
    const { data, error } = await supabase
      .from('barriers')
      .select('*, patients(first_name, last_name, document_number)')
      .in('status', ['ABIERTA', 'EN_PROCESO'])
      .lt('expected_resolution_date', new Date().toISOString())
      .order('expected_resolution_date');
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },
};
