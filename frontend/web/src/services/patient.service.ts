import { supabase } from './supabaseClient';
import { getCurrentTenantId, withTenant } from '@/utils/getCurrentTenant';
import { 
  Patient, 
  PaginatedResponse 
} from '@/types';

/**
 * Statuses that require PII anonymization per Ley 1581/2012 Colombia.
 * DROP_OUT: withdrawal by patient. FALLECIDO: deceased. RETIRADO: removed by program.
 */
const TERMINAL_STATUSES = ['DROP_OUT', 'FALLECIDO', 'RETIRADO'] as const;
type TerminalStatus = typeof TERMINAL_STATUSES[number];

/**
 * Builds the anonymization patch applied when a patient reaches a terminal status.
 * Keeps: tenant_id, status, genre, program, diagnosis, dates (year-only birth_date),
 *        EPS/IPS (for pharmacovigilance), and a masked document suffix for legal traceability.
 * Nullifies: name, full document, email, phone, address, contact data, guardian PII.
 */
function buildAnonymizationPatch(docNumber: string | null | undefined): Record<string, unknown> {
  const masked = docNumber ? `***${String(docNumber).slice(-4)}` : '***';
  return {
    first_name: 'ANONIMIZADO',
    second_name: null,
    last_name: 'ANONIMIZADO',
    second_last_name: null,
    iniciales: '##',
    document_number: masked,
    email: null,
    phone: null,
    phone2: null,
    phone3: null,
    address: null,
    comunidad: null,
    barrio: null,
    neighborhood: null,
    emergency_contact_name: null,
    emergency_contact_phone: null,
    emergency_contact_relationship: null,
    guardian_document_number: null,
    guardian_email: null,
    guardian_address: null,
    marital_status: null,
    occupation: null,
    anonymized: true,
    // anonymized_at will be set by trg_anonymize_patient DB trigger
  };
}


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
    iniciales: r.iniciales,
    codigoPaciente: r.codigo_paciente,
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
    phone2: r.phone2,
    phone3: r.phone3,
    direccion: r.address,
    address: r.address,
    comunidad: r.comunidad,
    barrio: r.barrio,
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
    ipsTratantePrincipalId: r.ips_tratante_principal_id,
    regime: r.regime,
    status: r.status,
    estado: r.status,
    subestado: r.subestado,
    neighborhood: r.neighborhood,
    stratum: r.stratum,
    // Clínico / Programa
    enfermedad: r.enfermedad,
    otrosDiagnosticos: r.otros_diagnosticos,
    otrosMedicamentos: r.otros_medicamentos,
    tratamientoId: r.tratamiento_id,
    programaId: r.programa_psp_id,
    laboratorioId: r.laboratorio_id,
    medicoId: r.medico_id,
    fechaIngresoPsp: r.fecha_ingreso_psp,
    fechaActivacion: r.fecha_activacion,
    fechaInicioTratamiento: r.fecha_inicio_tratamiento,
    fechaRetiro: r.fecha_retiro,
    motivoRetiro: r.motivo_retiro,
    cambioTratamientoDestino: r.cambio_tratamiento_destino,
    // Operativos
    msl: r.msl,
    ram: r.ram,
    educadorId: r.educador_id,
    coordinadorId: r.coordinador_id,
    fundacion: r.fundacion,
    observaciones: r.observaciones,
    tutela: r.tutela_si_no,
    fallaTutela: r.fallo_tutela,
    vacunas: r.vacunas ?? [],
    // Acudiente
    contactoEmergencia: r.emergency_contact_name ? {
      nombre: r.emergency_contact_name,
      parentesco: r.emergency_contact_relationship ?? '',
      telefono: r.emergency_contact_phone ?? '',
    } : undefined,
    guardianDocumentTypeId: r.guardian_document_type_id,
    guardianDocumentNumber: r.guardian_document_number,
    guardianEmail: r.guardian_email,
    guardianAddress: r.guardian_address,
    // Consentimientos checklist
    tieneConsentimientoTratamiento: r.tiene_consentimiento_tratamiento,
    tieneConsentimientoPsp: r.tiene_consentimiento_psp,
    tieneCartaRedApoyo: r.tiene_carta_red_apoyo,
    tieneIdentificacion: r.tiene_identificacion,
    tieneIdentificacionAcudiente: r.tiene_identificacion_acudiente,
    tieneCertVacunacion: r.tiene_cert_vacunacion,
    tieneCartaNecesidadMedica: r.tiene_carta_necesidad_medica,
    tieneReporteSivigila: r.tiene_reporte_sivigila,
    tieneReporteFarmacovigilancia: r.tiene_reporte_farmacovigilancia,
    tieneEvidenciaTutela: r.tiene_evidencia_tutela,
    // Misc
    consentimientoFirmado: r.consentimiento_firmado,
    maritalStatus: r.marital_status,
    educationLevel: r.education_level,
    occupation: r.occupation,
    residenceZone: r.residence_zone,
    anonymized: r.anonymized,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    createdBy: r.created_by,
    updatedBy: r.updated_by,
    edad: r.birth_date
      ? Math.floor(
          (Date.now() - new Date(r.birth_date).getTime()) /
            (1000 * 60 * 60 * 24 * 365.25)
        )
      : undefined,
  };
}

const SELECT_WITH_JOINS = `
  *,
  document_types:document_types!patients_document_type_id_fkey(code, name),
  guardian_document_types:document_types!patients_guardian_document_type_id_fkey(code, name),
  genres(code, name),
  cities(name),
  departments(name),
  eps(name),
  ips:ips!patients_ips_id_fkey(name),
  ips_tratante_principal:ips!patients_ips_tratante_principal_id_fkey(name)
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
    const DOC_TYPE_MAP: Record<string, number> = { CC: 1, TI: 2, RC: 5, CE: 3, PA: 4 };
    const GENRE_MAP: Record<string, number> = { MASCULINO: 1, FEMENINO: 2, NO_BINARIO: 3, OTRO: 3, NO_INFORMA: 3 };

    // Auto-calcular iniciales desde el nombre
    const calcIniciales = (fd: any) => {
      const fn = (fd.firstName ?? fd.nombre ?? '').charAt(0).toUpperCase();
      const ln = (fd.firstLastName ?? fd.lastName ?? fd.apellido ?? '').charAt(0).toUpperCase();
      return fn + ln;
    };

    const row = await withTenant({
      document_type_id: DOC_TYPE_MAP[formData.documentType] ?? 1,
      document_number: formData.documentNumber ?? formData.documentoIdentidad ?? formData.documento,
      first_name: formData.firstName ?? formData.nombre,
      second_name: formData.secondName ?? null,
      last_name: formData.firstLastName ?? formData.lastName ?? formData.apellido,
      second_last_name: formData.secondLastName ?? null,
      iniciales: formData.iniciales ?? calcIniciales(formData),
      birth_date: formData.birthDate ?? formData.fechaNacimiento,
      genre_id: GENRE_MAP[formData.gender] ?? 3,
      email: formData.email || null,
      phone: formData.phone ?? formData.telefono ?? null,
      phone2: formData.alternativePhone ?? formData.phone2 ?? null,
      phone3: formData.phone3 ?? null,
      address: formData.address ?? formData.direccion ?? null,
      comunidad: formData.comunidad ?? null,
      barrio: formData.barrio ?? null,
      department_id: formData.departmentId ?? formData.departamento_id ?? null,
      city_id: formData.cityId ?? formData.ciudad_id ?? null,
      country_id: formData.countryId ?? 1,
      eps_id: formData.epsId ?? formData.eps_id ?? null,
      ips_id: formData.ipsId ?? formData.ips_id ?? null,
      ips_tratante_principal_id: formData.ipsTratanteId ?? null,
      regime: formData.regime ?? null,
      stratum: formData.stratum ?? null,
      status: formData.status ?? 'EN_PROCESO',
      subestado: formData.subestado ?? null,
      // Clínico / Programa
      enfermedad: formData.enfermedad ?? null,
      otros_diagnosticos: formData.otrosDiagnosticos ?? null,
      otros_medicamentos: formData.otrosMedicamentos ?? null,
      tratamiento_id: formData.tratamientoId ?? null,
      programa_psp_id: formData.programaId ?? null,
      laboratorio_id: formData.laboratorioId ?? null,
      medico_id: formData.medicoId ?? null,
      fecha_ingreso_psp: formData.startDate ?? null,
      fecha_activacion: formData.fechaActivacion ?? null,
      fecha_inicio_tratamiento: formData.treatmentStartDate ?? null,
      fecha_retiro: formData.fechaRetiro ?? null,
      motivo_retiro: formData.motivoRetiro ?? null,
      cambio_tratamiento_destino: formData.cambioTratamientoDestino ?? null,
      // Operativos
      msl: formData.msl ?? null,
      ram: formData.ram ?? null,
      educador_id: formData.educadorId ?? null,
      coordinador_id: formData.coordinadorId ?? null,
      fundacion: formData.fundacion ?? null,
      observaciones: formData.observaciones ?? null,
      tutela_si_no: formData.tutela ?? false,
      fallo_tutela: formData.fallaTutela ?? null,
      vacunas: formData.vacunas ? JSON.parse(formData.vacunas) : [],
      // Acudiente
      consentimiento_firmado: formData.consentSigned ?? formData.consentimientoFirmado ?? false,
      emergency_contact_name: formData.guardianName ?? null,
      emergency_contact_phone: formData.guardianPhone ?? null,
      emergency_contact_relationship: formData.guardianRelationship ?? null,
      guardian_document_type_id: formData.guardianDocumentType ? DOC_TYPE_MAP[formData.guardianDocumentType] ?? null : null,
      guardian_document_number: formData.guardianDocumentNumber ?? null,
      guardian_email: formData.guardianEmail ?? null,
      guardian_address: formData.guardianAddress ?? null,
      // Documentos checklist
      tiene_consentimiento_tratamiento: formData.tieneConsentimientoTratamiento ?? false,
      tiene_consentimiento_psp: formData.tieneConsentimientoPsp ?? false,
      tiene_carta_red_apoyo: formData.tieneCartaRedApoyo ?? false,
      tiene_identificacion: formData.tieneIdentificacion ?? false,
      tiene_identificacion_acudiente: formData.tieneIdentificacionAcudiente ?? false,
      tiene_cert_vacunacion: formData.tieneCertVacunacion ?? false,
      tiene_carta_necesidad_medica: formData.tieneCartaNecesidadMedica ?? false,
      tiene_reporte_sivigila: formData.tieneReporteSivigila ?? false,
      tiene_reporte_farmacovigilancia: formData.tieneReporteFarmacovigilancia ?? false,
      tiene_evidencia_tutela: formData.tieneEvidenciaTutela ?? false,
      // Sociodemográfico
      marital_status: formData.maritalStatus ?? null,
      education_level: formData.educationLevel ?? null,
      occupation: formData.occupation ?? null,
      residence_zone: formData.residenceZone ?? null,
    });

    const { data, error } = await supabase
      .from('patients')
      .insert(row)
      .select(SELECT_WITH_JOINS)
      .single();

    if (error) throw error;
    return mapRow(data);
  },

  updatePatient: async (id: number, formData: any): Promise<Patient> => {
    const DOC_TYPE_MAP: Record<string, number> = { CC: 1, TI: 2, RC: 5, CE: 3, PA: 4 };
    const GENRE_MAP: Record<string, number> = { MASCULINO: 1, FEMENINO: 2, NO_BINARIO: 3, OTRO: 3, NO_INFORMA: 3 };

    const calcIniciales = (fd: any) => {
      const fn = (fd.firstName ?? fd.nombre ?? '').charAt(0).toUpperCase();
      const ln = (fd.firstLastName ?? fd.lastName ?? fd.apellido ?? '').charAt(0).toUpperCase();
      return fn + ln;
    };

    const row: Record<string, unknown> = {
      document_type_id: DOC_TYPE_MAP[formData.documentType] ?? 1,
      document_number: formData.documentNumber,
      first_name: formData.firstName,
      second_name: formData.secondName ?? null,
      last_name: formData.firstLastName,
      second_last_name: formData.secondLastName ?? null,
      iniciales: formData.iniciales ?? calcIniciales(formData),
      birth_date: formData.birthDate,
      genre_id: GENRE_MAP[formData.gender] ?? 3,
      email: formData.email || null,
      phone: formData.phone ?? null,
      phone2: formData.alternativePhone ?? null,
      phone3: formData.phone3 ?? null,
      address: formData.address ?? null,
      comunidad: formData.comunidad ?? null,
      barrio: formData.barrio ?? null,
      department_id: formData.departmentId ?? null,
      city_id: formData.cityId ?? null,
      country_id: formData.countryId ?? null,
      eps_id: formData.epsId ?? null,
      ips_id: formData.ipsId ?? null,
      ips_tratante_principal_id: formData.ipsTratanteId ?? null,
      regime: formData.regime ?? null,
      stratum: formData.stratum ?? null,
      status: formData.status ?? 'EN_PROCESO',
      subestado: formData.subestado ?? null,
      enfermedad: formData.enfermedad ?? null,
      otros_diagnosticos: formData.otrosDiagnosticos ?? null,
      otros_medicamentos: formData.otrosMedicamentos ?? null,
      tratamiento_id: formData.tratamientoId ?? null,
      programa_psp_id: formData.programaId ?? null,
      laboratorio_id: formData.laboratorioId ?? null,
      medico_id: formData.medicoId ?? null,
      fecha_ingreso_psp: formData.startDate ?? null,
      fecha_activacion: formData.fechaActivacion ?? null,
      fecha_inicio_tratamiento: formData.treatmentStartDate ?? null,
      fecha_retiro: formData.fechaRetiro ?? null,
      motivo_retiro: formData.motivoRetiro ?? null,
      cambio_tratamiento_destino: formData.cambioTratamientoDestino ?? null,
      msl: formData.msl ?? null,
      ram: formData.ram ?? null,
      educador_id: formData.educadorId ?? null,
      coordinador_id: formData.coordinadorId ?? null,
      fundacion: formData.fundacion ?? null,
      observaciones: formData.observaciones ?? null,
      tutela_si_no: formData.tutela ?? false,
      fallo_tutela: formData.fallaTutela ?? null,
      vacunas: formData.vacunas ? JSON.parse(formData.vacunas) : [],
      consentimiento_firmado: formData.consentSigned ?? false,
      emergency_contact_name: formData.guardianName ?? null,
      emergency_contact_phone: formData.guardianPhone ?? null,
      emergency_contact_relationship: formData.guardianRelationship ?? null,
      guardian_document_type_id: formData.guardianDocumentType ? DOC_TYPE_MAP[formData.guardianDocumentType] ?? null : null,
      guardian_document_number: formData.guardianDocumentNumber ?? null,
      guardian_email: formData.guardianEmail ?? null,
      guardian_address: formData.guardianAddress ?? null,
      tiene_consentimiento_tratamiento: formData.tieneConsentimientoTratamiento ?? false,
      tiene_consentimiento_psp: formData.tieneConsentimientoPsp ?? false,
      tiene_carta_red_apoyo: formData.tieneCartaRedApoyo ?? false,
      tiene_identificacion: formData.tieneIdentificacion ?? false,
      tiene_identificacion_acudiente: formData.tieneIdentificacionAcudiente ?? false,
      tiene_cert_vacunacion: formData.tieneCertVacunacion ?? false,
      tiene_carta_necesidad_medica: formData.tieneCartaNecesidadMedica ?? false,
      tiene_reporte_sivigila: formData.tieneReporteSivigila ?? false,
      tiene_reporte_farmacovigilancia: formData.tieneReporteFarmacovigilancia ?? false,
      tiene_evidencia_tutela: formData.tieneEvidenciaTutela ?? false,
      marital_status: formData.maritalStatus ?? null,
      education_level: formData.educationLevel ?? null,
      occupation: formData.occupation ?? null,
      residence_zone: formData.residenceZone ?? null,
      updated_at: new Date().toISOString(),
    };

    // Ley 1581/2012: anonymize PII when patient enters a terminal status.
    // Runs AFTER building `row` so the patch always overrides any PII from formData.
    const incomingStatus = formData.status as string | undefined;
    if (incomingStatus && TERMINAL_STATUSES.includes(incomingStatus as TerminalStatus)) {
      Object.assign(row, buildAnonymizationPatch(formData.documentNumber));
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

  /**
   * Sube el documento de consentimiento a Supabase Storage.
   * Bucket requerido: "documentos-psp" (crearlo en el dashboard de Supabase → Storage).
   * Retorna la URL pública del archivo.
   */
  uploadConsentDocument: async (patientId: number, file: File): Promise<string> => {
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const tenantId = await getCurrentTenantId();
    const filePath = `${tenantId}/consentimientos/${patientId}/${Date.now()}_${safeFileName}`;

    const { error: uploadError } = await supabase.storage
      .from('consentimientos')
      .upload(filePath, file, { cacheControl: '3600', upsert: true });

    if (uploadError) throw uploadError;

    const { data: urlData } = supabase.storage
      .from('consentimientos')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  },

  /**
   * Guarda (o actualiza) el registro de consentimiento con la URL del documento.
   */
  saveConsentRecord: async (patientId: number, documentUrl: string): Promise<void> => {
    const { error } = await supabase
      .from('consentimientos')
      .upsert(
        await withTenant({
          patient_id: patientId,
          consentimiento_psp: true,
          consentimiento_tratamiento: true,
          archivo_documento: documentUrl,
          fecha_carga: new Date().toISOString(),
        }),
        { onConflict: 'patient_id' }
      );

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

  /**
   * Anonimiza los datos sensibles de un paciente (ley colombiana art. 17 Ley 1581/2012).
   * Se aplica cuando el paciente pasa a DROP_OUT o RETIRADO.
   */
  anonymizePatient: async (patientId: number, reason: string): Promise<void> => {
    const { error } = await supabase.rpc('anonymize_patient', {
      p_patient_id: patientId,
      p_reason: reason,
    });
    if (error) throw error;
  },

  /**
   * Actualiza solo el estado del paciente y registra el historial.
   */
  updateStatus: async (
    patientId: number,
    newStatus: string,
    reason?: string,
    extraFields?: Record<string, unknown>
  ): Promise<void> => {
    const update: Record<string, unknown> = {
      status: newStatus,
      updated_at: new Date().toISOString(),
      ...(extraFields ?? {}),
    };
    const { error } = await supabase.from('patients').update(update).eq('id', patientId);
    if (error) throw error;
    // Log history
    await supabase.from('patient_status_history').insert({
      patient_id: patientId,
      new_status: newStatus,
      reason: reason ?? null,
      changed_at: new Date().toISOString(),
    });
  },

  /**
   * Obtiene la vista 360 del paciente desde la función RPC de Supabase.
   */
  get360: async (patientId: number) => {
    const { data, error } = await supabase.rpc('get_patient_360', {
      p_patient_id: patientId,
    });
    if (error) throw error;
    return data;
  },
};
