/**
 * Tipos TypeScript para el Wizard de Pacientes (6 pasos)
 */

export interface PatientFormData {
  // ── Paso 1: Identificación ─────────────────────────────────
  documentType: string;
  documentNumber: string;
  firstName: string;
  secondName?: string;
  firstLastName: string;
  secondLastName?: string;
  iniciales?: string;

  // ── Paso 2: Datos Personales ────────────────────────────────
  birthDate: string;
  gender: string;
  phone: string;
  alternativePhone?: string;
  phone3?: string;
  email: string;

  // ── Paso 3: Ubicación ───────────────────────────────────────
  countryId: number;
  departmentId?: number;
  cityId?: number;
  address: string;
  comunidad?: string;
  barrio?: string;
  residenceZone?: string;
  stratum?: number;

  // ── Paso 4: Programa Clínico ────────────────────────────────
  epsId?: number;
  ipsId?: number;                 // IPS aseguradora / genérica
  ipsTratanteId?: number;         // IPS Tratante Principal
  tratamientoId?: number;
  programaId?: string;
  laboratorioId?: number;
  medicoId?: number;
  enfermedad?: string;
  otrosDiagnosticos?: string;
  otrosMedicamentos?: string;
  status: string;
  subestado?: string;
  startDate: string;              // fecha_ingreso_psp
  fechaActivacion?: string;
  treatmentStartDate?: string;    // fecha_inicio_tratamiento
  fechaRetiro?: string;
  motivoRetiro?: string;
  cambioTratamientoDestino?: string;
  // Operativos
  msl?: string;
  ram?: string;
  educadorId?: string;
  coordinadorId?: string;
  fundacion?: string;
  observaciones?: string;
  tutela?: boolean;
  fallaTutela?: boolean;
  vacunas?: string;               // JSON string of vaccines list
  // Otros sociodemográficos
  maritalStatus?: string;
  educationLevel?: string;
  occupation?: string;
  populationTypeId?: number;
  regime?: string;

  // ── Paso 5: Acudiente ───────────────────────────────────────
  guardianName?: string;
  guardianDocumentType?: string;
  guardianDocumentNumber?: string;
  guardianRelationship?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  guardianAddress?: string;

  // ── Paso 6: Documentos y Consentimientos ───────────────────
  consentSigned: boolean;
  consentDocument?: File | null;
  tieneConsentimientoTratamiento?: boolean;
  tieneConsentimientoDatos?: boolean;
  tieneCarnet?: boolean;
  tieneFormulaMedica?: boolean;
  tieneAutorizacion?: boolean;
  tieneCopiaDocumento?: boolean;
  tieneEps?: boolean;
  tieneHistoriaClinica?: boolean;
  tieneRegistroFoto?: boolean;
  tieneOtrosDocumentos?: boolean;
}

export interface StepProps {
  formData: PatientFormData;
  updateFormData: (data: Partial<PatientFormData>) => void;
  errors: Record<string, string>;
}
