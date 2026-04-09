import { supabase } from './supabaseClient';
import { getCurrentTenantId } from '@/utils/getCurrentTenant';
import { Department, City, EPS, IPS, Laboratory, Doctor, DocumentType, MedicamentoCatalog, ProgramaPSP, PatientStatusConfig } from '@/types';


export const catalogService = {
  getDepartments: async (): Promise<Department[]> => {
    const { data, error } = await supabase
      .from('departments')
      .select('id, code, name, country_id')
      .order('name');
    if (error) throw error;
    return (data ?? []) as Department[];
  },

  getCitiesByDepartment: async (departmentId: number): Promise<City[]> => {
    const { data, error } = await supabase
      .from('cities')
      .select('id, code, name, department_id')
      .eq('department_id', departmentId)
      .order('name');
    if (error) throw error;
    return (data ?? []) as City[];
  },

  getAllCities: async (): Promise<City[]> => {
    const { data, error } = await supabase
      .from('cities')
      .select('id, code, name, department_id')
      .order('name');
    if (error) throw error;
    return (data ?? []) as City[];
  },

  getEPSList: async (): Promise<EPS[]> => {
    const { data, error } = await supabase
      .from('eps')
      .select('id, code, name, regime, active')
      .eq('active', true)
      .order('name');
    if (error) throw error;
    return (data ?? []) as EPS[];
  },

  getIPSList: async (): Promise<IPS[]> => {
    const { data, error } = await supabase
      .from('ips')
      .select('id, name, type, city_id, active')
      .eq('active', true)
      .order('name');
    if (error) throw error;
    return (data ?? []) as IPS[];
  },

  getLaboratories: async (): Promise<Laboratory[]> => {
    const { data, error } = await supabase
      .from('laboratories')
      .select('id, name, nit, email, representante, descripcion, active')
      .eq('active', true)
      .order('name');
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id, name: r.name, nit: r.nit, email: r.email,
      representante: r.representante, descripcion: r.descripcion, active: r.active,
    }));
  },

  getDoctors: async (): Promise<Doctor[]> => {
    const { data, error } = await supabase
      .from('doctors')
      .select('id, nombre, apellido, registro_medico, especialidad, telefono, email, institution, active')
      .eq('active', true)
      .order('nombre');
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id, nombre: r.nombre, apellido: r.apellido,
      registroMedico: r.registro_medico, especialidad: r.especialidad,
      telefono: r.telefono, email: r.email, institution: r.institution, active: r.active,
    }));
  },

  getDocumentTypes: async (): Promise<DocumentType[]> => {
    const { data, error } = await supabase
      .from('document_types')
      .select('id, code, name')
      .order('name');
    if (error) throw error;
    return (data ?? []) as DocumentType[];
  },

  getMedications: async (): Promise<MedicamentoCatalog[]> => {
    const { data, error } = await supabase
      .from('medications')
      .select('id, nombre, nombre_comercial, concentracion, unidad, laboratorio, laboratorio_id, programa_id, via_administracion, tipo_administracion, unidades_ml, forma_farmaceutica, activo')
      .eq('activo', true)
      .order('nombre');
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id, nombre: r.nombre, nombreComercial: r.nombre_comercial,
      concentracion: r.concentracion, unidad: r.unidad, laboratorio: r.laboratorio,
      laboratorioId: r.laboratorio_id, programaId: r.programa_id,
      viaAdministracion: r.via_administracion, tipoAdministracion: r.tipo_administracion,
      unidadesMl: r.unidades_ml, formaFarmaceutica: r.forma_farmaceutica, activo: r.activo,
    }));
  },

  getProgramas: async (): Promise<ProgramaPSP[]> => {
    const { data, error } = await supabase
      .from('programas_psp')
      .select('id, nombre, descripcion, laboratorio, medicamento_principal, activo')
      .eq('activo', true)
      .order('nombre');
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id, nombre: r.nombre, descripcion: r.descripcion,
      laboratorio: r.laboratorio, medicamentoPrincipal: r.medicamento_principal, activo: r.activo,
    }));
  },

  getPatientStatusConfig: async (): Promise<PatientStatusConfig[]> => {
    const { data, error } = await supabase
      .from('patient_status_config')
      .select('*')
      .or(`tenant_id.eq.${await getCurrentTenantId()},programa_id.is.null`)
      .eq('activo', true)
      .order('orden');
    if (error) throw error;
    return (data ?? []).map((r: any) => ({
      id: r.id, tenantId: r.tenant_id, programaId: r.programa_id,
      codigo: r.codigo, nombre: r.nombre, descripcion: r.descripcion,
      requiereFechaIngreso: r.requiere_fecha_ingreso,
      requiereFechaActivacion: r.requiere_fecha_activacion,
      requiereFechaInicioTratamiento: r.requiere_fecha_inicio_tratamiento,
      requiereFechaRetiro: r.requiere_fecha_retiro,
      requiereMotivoRetiro: r.requiere_motivo_retiro,
      activo: r.activo, orden: r.orden,
    }));
  },
};
