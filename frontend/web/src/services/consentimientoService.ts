import { supabase } from './supabaseClient';
import { getCurrentTenantId, withTenant } from '@/utils/getCurrentTenant';

export interface Consentimiento {
  id: string;
  patientId: number;
  patientName: string;
  consentimientoPsp: boolean;
  consentimientoTratamiento: boolean;
  archivoDocumento: string | null;
  fechaCarga: string | null;
  fechaCreacion: string;
}

export interface CreateConsentimientoRequest {
  patientId: number;
  consentimientoPsp: boolean;
  consentimientoTratamiento: boolean;
  archivoDocumento?: string;
  fechaCarga?: string;
}


function mapRow(r: any): Consentimiento {
  return {
    id: r.id,
    patientId: r.patient_id,
    patientName: r.patients
      ? `${r.patients.first_name ?? ''} ${r.patients.last_name ?? ''}`.trim()
      : '',
    consentimientoPsp: r.consentimiento_psp,
    consentimientoTratamiento: r.consentimiento_tratamiento,
    archivoDocumento: r.archivo_documento,
    fechaCarga: r.fecha_carga,
    fechaCreacion: r.created_at,
  };
}

export const consentimientoService = {
  listar: async () => {
    const { data, error } = await supabase
      .from('consentimientos')
      .select('*, patients(first_name, last_name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    return (data ?? []).map(mapRow);
  },

  obtenerPorId: async (id: string) => {
    const { data, error } = await supabase
      .from('consentimientos')
      .select('*, patients(first_name, last_name)')
      .eq('id', id)
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  obtenerPorPaciente: async (patientId: number) => {
    const { data, error } = await supabase
      .from('consentimientos')
      .select('*, patients(first_name, last_name)')
      .eq('patient_id', patientId)
      .maybeSingle();
    if (error) throw error;
    return data ? mapRow(data) : null;
  },

  crear: async (req: CreateConsentimientoRequest) => {
    const { data, error } = await supabase
      .from('consentimientos')
      .insert(await withTenant({
        patient_id: req.patientId,
        consentimiento_psp: req.consentimientoPsp,
        consentimiento_tratamiento: req.consentimientoTratamiento,
        archivo_documento: req.archivoDocumento,
        fecha_carga: req.fechaCarga,
      }))
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  actualizar: async (id: string, req: Partial<CreateConsentimientoRequest>) => {
    const update: Record<string, unknown> = {};
    if (req.consentimientoPsp !== undefined) update.consentimiento_psp = req.consentimientoPsp;
    if (req.consentimientoTratamiento !== undefined) update.consentimiento_tratamiento = req.consentimientoTratamiento;
    if (req.archivoDocumento !== undefined) update.archivo_documento = req.archivoDocumento;
    if (req.fechaCarga !== undefined) update.fecha_carga = req.fechaCarga;

    const { data, error } = await supabase
      .from('consentimientos')
      .update(update)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapRow(data);
  },

  eliminar: async (id: string) => {
    const { error } = await supabase.from('consentimientos').delete().eq('id', id);
    if (error) throw error;
  },

  subirArchivo: async (patientId: number, file: File): Promise<string> => {
    const MAX_SIZE = 200 * 1024; // 200 KB
    if (file.size > MAX_SIZE) {
      throw new Error('El archivo supera el límite de 200 KB');
    }
    const ext = file.name.split('.').pop() ?? 'bin';
    const tenantId = await getCurrentTenantId();
    const path = `${tenantId}/${patientId}/${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage
      .from('consentimientos')
      .upload(path, file, { upsert: true });
    if (error) throw error;
    const { data: urlData } = supabase.storage
      .from('consentimientos')
      .getPublicUrl(data.path);
    return urlData.publicUrl;
  },
};
