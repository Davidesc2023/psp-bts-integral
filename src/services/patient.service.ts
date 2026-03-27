import { supabase } from './supabaseClient';
import { 
  Patient, 
  PatientFormData, 
  PaginatedResponse 
} from '@/types';

const DEFAULT_TENANT = '00000000-0000-0000-0000-000000000001';

/** Mapea un row de Supabase al tipo Patient del frontend */
function mapRow(r: any): Patient {
  return {
    id: r.id,
    nombre: r.first_name,
    apellido: r.last_name,
    nombreCompleto: [r.first_name, r.second_name, r.last_name, r.second_last_name].filter(Boolean).join(' '),
    firstName: r.first_name,
    secondName: r.second_name,
    lastName: r.last_name,
    fullName: [r.first_name, r.second_name, r.last_name, r.second_last_name].filter(Boolean).join(' '),
    documentType: r.document_types?.code,
    documentNumber: r.document_number,
    documentoIdentidad: r.document_types ? `${r.document_types.code} ${r.document_number}` : r.document_number,
    fechaNacimiento: r.birth_date,
    birthDate: r.birth_date,
    genero: r.genres?.name?.toUpperCase(),
    gender: r.genres?.name,
    email: r.email,
    telefono: r.phone,
    phone: r.phone,
    direccion: r.address,
    address: r.address,
    ciudad: r.cities?.name,
    cityName: r.cities?.name,
    cityId: r.city_id,
    departamento: r.departments?.name,
    departmentName: r.departments?.name,
    departmentId: r.department_id,
    countryId: r.country_id,
    epsId: r.eps_id,
    epsName: r.eps?.name,
    ipsId: r.ips_id,
    ipsName: r.ips?.name,
    regime: r.regime,
    status: r.status,
    estado: r.status,
    neighborhood: r.neighborhood,
    stratum: r.stratum,
    contactoEmergencia: r.emergency_contact_name ? {
      nombre: r.emergency_contact_name,
      parentesco: r.emergency_contact_relationship ?? '',
      telefono: r.emergency_contact_phone ?? '',
    } : undefined,
    consentimientoFirmado: r.consentimiento_firmado,
    anonymized: r.anonymized,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    createdBy: r.created_by,
    updatedBy: r.updated_by,
  };
}

const SELECT_WITH_JOINS = `
  *,
  document_types(code, name),
  genres(code, name),
  cities(name),
  departments(name),
  eps(name),
  ips(name)
`;

export interface PatientFilters {
  departamento_id?: number;
  ciudad_id?: number;
  eps_id?: number;
  estado?: string;
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export const patientService = {
  getPatients: async (filters: PatientFilters = {}): Promise<PaginatedResponse<Patient>> => {
    const page = filters.page ?? 0;
    const size = filters.size ?? 20;
    const from = page * size;
    const to = from + size - 1;

    let query = supabase
      .from('patients')
      .select(SELECT_WITH_JOINS, { count: 'exact' })
      .or('deleted.is.null,deleted.eq.false')
      .range(from, to)
      .order('id', { ascending: false });

    if (filters.estado) query = query.eq('status', filters.estado);
    if (filters.eps_id) query = query.eq('eps_id', filters.eps_id);
    if (filters.departamento_id) query = query.eq('department_id', filters.departamento_id);
    if (filters.ciudad_id) query = query.eq('city_id', filters.ciudad_id);
    if (filters.search) {
      query = query.or(
        `first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,document_number.ilike.%${filters.search}%,email.ilike.%${filters.search}%`
      );
    }

    const { data, count, error } = await query;
    if (error) throw error;

    const content = (data ?? []).map(mapRow);
    const total = count ?? content.length;

    return {
      content,
      totalElements: total,
      totalPages: Math.ceil(total / size),
      size,
      number: page,
      first: page === 0,
      last: (page + 1) * size >= total,
    };
  },

  getPatientById: async (id: number): Promise<Patient> => {
    const { data, error } = await supabase
      .from('patients')
      .select(SELECT_WITH_JOINS)
      .eq('id', id)
      .single();

    if (error) throw error;
    return mapRow(data);
  },

  createPatient: async (formData: any): Promise<Patient> => {
    // Mapeo: código de tipo de documento → ID en Supabase
    const DOC_TYPE_MAP: Record<string, number> = {
      CC: 1, TI: 2, RC: 5, CE: 3, PA: 4,
    };
    // Mapeo: género del form → genre_id en Supabase
    const GENRE_MAP: Record<string, number> = {
      MASCULINO: 1, FEMENINO: 2, NO_BINARIO: 3, OTRO: 3, NO_INFORMA: 3,
    };
    const row = {
      tenant_id: DEFAULT_TENANT,
      document_type_id: DOC_TYPE_MAP[formData.documentType] ?? 1,
      document_number: formData.documentNumber ?? formData.documentoIdentidad ?? formData.documento,
      first_name: formData.firstName ?? formData.nombre,
      second_name: formData.secondName ?? null,
      last_name: formData.lastName ?? formData.apellido,
      birth_date: formData.birthDate ?? formData.fechaNacimiento,
      genre_id: GENRE_MAP[formData.gender] ?? 3,
      email: formData.email || null,
      phone: formData.phone ?? formData.telefono ?? null,
      address: formData.address ?? formData.direccion ?? null,
      department_id: formData.departmentId ?? formData.departamento_id ?? null,
      city_id: formData.cityId ?? formData.ciudad_id ?? null,
      eps_id: formData.epsId ?? formData.eps_id ?? null,
      ips_id: formData.ipsId ?? formData.ips_id ?? null,
      consentimiento_firmado: formData.consentSigned ?? formData.consentimientoFirmado ?? false,
      country_id: 1,
      status: formData.status ?? 'EN_PROCESO',
      emergency_contact_name: formData.guardianName ?? formData.contactoEmergencia?.nombre ?? null,
      emergency_contact_phone: formData.guardianPhone ?? formData.contactoEmergencia?.telefono ?? null,
      emergency_contact_relationship: formData.guardianRelationship ?? formData.contactoEmergencia?.parentesco ?? null,
    };

    const { data, error } = await supabase
      .from('patients')
      .insert(row)
      .select(SELECT_WITH_JOINS)
      .single();

    if (error) throw error;
    return mapRow(data);
  },

  updatePatient: async (id: number, formData: PatientFormData): Promise<Patient> => {
    const row: Record<string, unknown> = {
      first_name: formData.nombre,
      last_name: formData.apellido,
      birth_date: formData.fechaNacimiento,
      email: formData.email,
      phone: formData.telefono,
      address: formData.direccion,
      department_id: formData.departamento_id,
      city_id: formData.ciudad_id,
      eps_id: formData.eps_id,
      ips_id: formData.ips_id,
      consentimiento_firmado: formData.consentimientoFirmado,
      updated_at: new Date().toISOString(),
    };
    if (formData.contactoEmergencia) {
      row.emergency_contact_name = formData.contactoEmergencia.nombre;
      row.emergency_contact_phone = formData.contactoEmergencia.telefono;
      row.emergency_contact_relationship = formData.contactoEmergencia.parentesco;
    }

    const { data, error } = await supabase
      .from('patients')
      .update(row)
      .eq('id', id)
      .select(SELECT_WITH_JOINS)
      .single();

    if (error) throw error;
    return mapRow(data);
  },

  deletePatient: async (id: number): Promise<void> => {
    const { error } = await supabase
      .from('patients')
      .update({ deleted: true, deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;
  },

  getPatientPrescriptions: async (patientId: number) => {
    const { data, error } = await supabase
      .from('prescripciones')
      .select('*, medications(nombre, nombre_comercial), doctors(nombre, apellido)')
      .eq('paciente_id', patientId)
      .order('fecha_inicio', { ascending: false });

    if (error) throw error;
    return data ?? [];
  },
};
