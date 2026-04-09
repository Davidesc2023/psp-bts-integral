/**
 * TypeScript types para la aplicación PSP
 */

// ============================================
// COMMON TYPES
// ============================================

export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: number;
}

export interface PaginatedResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface ErrorResponse {
  timestamp: string;
  status: number;
  error: string;
  message: string;
  path: string;
  validationErrors?: Record<string, string>;
}

// ============================================
// AUTH TYPES
// ============================================

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresIn: number;
  user: User;
}

export interface User {
  id: string;
  email: string;
  nombre: string;
  apellido: string;
  role: UserRole;
  institucionId: string;
  institucionNombre: string;
  permisos: string[];
}

export type UserRole = 
  | 'SUPER_ADMIN' 
  | 'ADMIN_INSTITUCION' 
  | 'MEDICO' 
  | 'ENFERMERIA' 
  | 'COORDINADOR'
  | 'EDUCADORA'
  | 'FARMACEUTICA'
  | 'AUDITOR'
  | 'MSL'
  | 'PACIENTE' 
  | 'CUIDADOR';

// ============================================
// PATIENT TYPES
// ============================================

export interface Patient {
  id: number;
  // Legacy Spanish keys (kept for backward compatibility with UI)
  nombre?: string;
  apellido?: string;
  nombreCompleto?: string;
  documentoIdentidad?: string;
  // API response keys (PatientResponseDTO)
  firstName?: string;
  secondName?: string;
  lastName?: string;
  fullName?: string;
  iniciales?: string;
  codigoPaciente?: string;
  documentType?: string;
  documentNumber?: string;
  fechaNacimiento?: string;
  birthDate?: string;
  edad?: number;
  age?: number;
  genero?: 'MASCULINO' | 'FEMENINO' | 'OTRO';
  gender?: string;
  email?: string;
  telefono?: string;
  phone?: string;
  phone2?: string;
  phone3?: string;
  direccion?: string;
  address?: string;
  comunidad?: string;
  barrio?: string;
  ciudad?: string;
  cityName?: string;
  cityId?: number;
  departamento?: string;
  departmentName?: string;
  departmentId?: number;
  countryName?: string;
  countryId?: number;
  epsId?: number;
  epsName?: string;
  ipsId?: number;
  ipsName?: string;
  ipsTratantePrincipalId?: number;
  ipsTratantePrincipalName?: string;
  regime?: string;
  status?: string;
  estado?: string;
  subestado?: string;
  neighborhood?: string;
  stratum?: number;
  maritalStatus?: string;
  educationLevel?: string;
  occupation?: string;
  residenceZone?: string;
  // Clínico / Programa
  enfermedad?: string;
  otrosDiagnosticos?: string;
  otrosMedicamentos?: string;
  tratamientoId?: number;
  tratamientoNombre?: string;
  programaId?: string;
  programaNombre?: string;
  laboratorioId?: number;
  laboratorioNombre?: string;
  medicoId?: number;
  medicoNombre?: string;
  fechaIngresoPsp?: string;
  fechaActivacion?: string;
  fechaInicioTratamiento?: string;
  fechaRetiro?: string;
  motivoRetiro?: string;
  cambioTratamientoDestino?: string;
  // Operativos
  msl?: string;
  ram?: string;
  educadorId?: string;
  educadorNombre?: string;
  coordinadorId?: string;
  coordinadorNombre?: string;
  fundacion?: string;
  observaciones?: string;
  tutela?: boolean;
  fallaTutela?: boolean;
  vacunas?: string[];
  // Acudiente ampliado
  mobile?: string;              // alias for phone2
  startDate?: string;           // alias for fechaIngresoPsp
  treatmentStartDate?: string;  // alias for fechaInicioTratamiento
  guardianName?: string;
  guardianRelationship?: string;
  guardianPhone?: string;
  guardianDocumentTypeId?: number;
  guardianDocumentNumber?: string;
  guardianEmail?: string;
  guardianAddress?: string;
  // Documentos / Consentimientos checklist
  tieneConsentimientoTratamiento?: boolean;
  tieneConsentimientoDatos?: boolean;
  tieneConsentimientoPsp?: boolean;
  tieneCarnet?: boolean;
  tieneFormulaMedica?: boolean;
  tieneAutorizacion?: boolean;
  tieneCopiaDocumento?: boolean;
  tieneEps?: boolean;
  tieneHistoriaClinica?: boolean;
  tieneRegistroFoto?: boolean;
  tieneOtrosDocumentos?: boolean;
  tieneCartaRedApoyo?: boolean;
  tieneIdentificacion?: boolean;
  tieneIdentificacionAcudiente?: boolean;
  tieneCertVacunacion?: boolean;
  tieneCartaNecesidadMedica?: boolean;
  tieneReporteSivigila?: boolean;
  tieneReporteFarmacovigilancia?: boolean;
  tieneEvidenciaTutela?: boolean;
  contactoEmergencia?: EmergencyContact;
  institucionId?: string;
  consentimientoFirmado?: boolean;
  codigoTipificacion?: string;
  anonymized?: boolean;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface EmergencyContact {
  nombre: string;
  parentesco: string;
  telefono: string;
}

export interface PatientFormData {
  tipoDocumento?: 'CC' | 'TI' | 'CE' | 'PA';
  documentoIdentidad?: string;
  documento?: string;
  nombre: string;
  apellido: string;
  fechaNacimiento: string;
  genero: 'MASCULINO' | 'FEMENINO' | 'OTRO';
  telefono?: string;
  email?: string;
  direccion?: string;
  departamento_id?: number;
  ciudad_id?: number;
  eps_id?: number;
  ips_id?: number;
  institucionId?: string;
  consentimientoFirmado: boolean;
  contactoEmergencia?: EmergencyContact;
}

export type PatientStatus = 
  | 'EN_PROCESO' 
  | 'ACTIVO'
  | 'SUSPENDIDO'
  | 'INTERRUMPIDO'
  | 'DROP_OUT' 
  | 'PRESCRITO_SIN_INICIO'
  | 'RETIRADO'
  | 'FALLECIDO';

export interface PatientStatusConfig {
  id: string;
  tenantId: string;
  programaId?: string;
  codigo: string;
  nombre: string;
  descripcion?: string;
  requiereFechaIngreso: boolean;
  requiereFechaActivacion: boolean;
  requiereFechaInicioTratamiento: boolean;
  requiereFechaRetiro: boolean;
  requiereMotivoRetiro: boolean;
  activo: boolean;
  orden: number;
}

// ============================================
// CATALOG TYPES
// ============================================

export interface Department {
  id: number;
  code: string;
  name: string;
}

export interface City {
  id: number;
  code: string;
  name: string;
  department?: Department;
}

export interface EPS {
  id: number;
  code: string;
  name: string;
  regime?: string;
  active: boolean;
}

export interface IPS {
  id: number;
  name: string;
  type?: string;
  city?: City;
  active: boolean;
  nit?: string;
  dv?: string;
}

export interface Laboratory {
  id: number;
  name: string;
  nit?: string;
  email?: string;
  representante?: string;
  descripcion?: string;
  active: boolean;
}

export interface Doctor {
  id: number;
  nombre: string;
  apellido?: string;
  registroMedico?: string;
  especialidad?: string;
  telefono?: string;
  email?: string;
  institution?: string;
  active: boolean;
}

export interface DocumentType {
  id: number;
  code: string;
  name: string;
}

export interface ProgramaPSP {
  id: string;
  nombre: string;
  descripcion?: string;
  laboratorio?: string;
  medicamentoPrincipal?: string;
  activo: boolean;
}

export interface MedicamentoCatalog {
  id: number;
  nombre: string;
  nombreComercial?: string;
  concentracion?: string;
  unidad?: string;
  laboratorio?: string;
  laboratorioId?: number;
  programaId?: string;
  viaAdministracion?: string;
  tipoAdministracion?: string;
  unidadesMl?: number;
  formaFarmaceutica?: string;
  activo: boolean;
}

// ============================================
// PRESCRIPTION TYPES
// ============================================

export interface Prescription {
  id: string | number;
  pacienteId: number;
  codigoPaciente?: string;
  consultaMedicaId?: number;
  medicoId?: string | number;
  medicoNombre?: string;
  numeroMipres?: string;
  ipsPrescriptoraId?: number;
  ipsPrescriptoraNombre?: string;
  prescriptorId?: number;
  prescriptorNombre?: string;
  medicamentoId?: number;
  nombreMedicamento?: string;
  dosis: string;
  unidadDosis?: string;
  dosis2?: string;
  unidadDosis2?: string;
  frecuencia: string;
  frecuencia2?: string;
  unidadesTotales1?: number;
  unidadesTotales2?: number;
  unidadesComerciales?: number;
  unidadesPrimarias1?: number;
  unidadesPrimarias2?: number;
  pesoKg?: number;
  tallaCm?: number;
  viaAdministracion?: string;
  fechaInicio: string;
  fechaFin?: string;
  duracionDias?: number;
  diasTratamiento?: number;
  indicaciones?: string;
  observaciones?: string;
  estado: 'VIGENTE' | 'SUSPENDIDA' | 'VENCIDA' | 'CANCELADA';
  fechaVencimientoPrescripcion?: string;
  createdAt?: string;
}

// ============================================
// CONSULTA MÉDICA TYPES
// ============================================

export interface ConsultaMedica {
  id: number;
  tenantId?: string;
  pacienteId: number;
  codigoPaciente?: string;
  fechaConsulta: string;
  medicoId?: number;
  medicoNombre?: string;
  ipsId?: number;
  ipsNombre?: string;
  ipsNit?: string;
  ipsDv?: string;
  tienePrescripcion: boolean;
  prescripcionId?: number;
  fechaEstimadaProximaConsulta?: string;
  fechaConfirmadaProximaConsulta?: string;
  tieneHistoriaClinica: boolean;
  observaciones?: string;
  createdAt?: string;
}

export interface CreateConsultaMedicaRequest {
  pacienteId: number;
  codigoPaciente?: string;
  fechaConsulta: string;
  medicoId?: number;
  ipsId?: number;
  ipsNit?: string;
  ipsDv?: string;
  tienePrescripcion?: boolean;
  prescripcionId?: number;
  fechaEstimadaProximaConsulta?: string;
  fechaConfirmadaProximaConsulta?: string;
  tieneHistoriaClinica?: boolean;
  observaciones?: string;
}

// ============================================
// IMPORT / EXPORT TYPES
// ============================================

export interface ImportJob {
  id: string;
  tenantId: string;
  tabla: string;
  estado: 'PENDIENTE' | 'PROCESANDO' | 'COMPLETADO' | 'ERROR';
  totalFilas: number;
  filasOk: number;
  filasError: number;
  errores: Array<{ fila: number; mensaje: string }>;
  archivoUrl?: string;
  iniciadoPor?: string;
  createdAt: string;
  completedAt?: string;
}

// ============================================
// NOTIFICATION TYPES
// ============================================

export interface Notification {
  id: string;
  tenantId: string;
  userId?: string;
  tipo: string;
  titulo: string;
  mensaje?: string;
  patientId?: number;
  modulo?: string;
  referenciaId?: string;
  navUrl?: string;
  leida: boolean;
  fechaLectura?: string;
  createdAt: string;
}

// ============================================
// PATIENT 360 VIEW
// ============================================

export interface Patient360 {
  prescripcionVigente?: {
    id: number;
    estado: string;
    fechaInicio: string;
    fechaFin?: string;
    nombreMedicamento?: string;
    diasTratamiento?: number;
    fechaVencimientoPrescripcion?: string;
  } | null;
  barrerasAbiertas: number;
  diasEnBarrera: number;
  aplicacionesPendientes: number;
  proximaEntrega?: string | null;
  diasMedicamento: number;
  tareasPendientesAlta: number;
  proximaConsulta?: string | null;
  stockDisponible: number;
}


// ============================================
// FOLLOW-UP / SEGUIMIENTO TYPES
// ============================================

export type TipoContacto = 'VIRTUAL' | 'PRESENCIAL' | 'TELEFONICO';
export type PrioridadSeguimiento = 'ALTA' | 'MEDIA' | 'BAJA';
export type EstadoSeguimiento = 'PENDIENTE' | 'EFECTIVA' | 'CANCELADA';

export interface Seguimiento {
  id: string;
  patientId: number;
  patientName?: string;
  responsableId?: string;
  motivoSeguimiento: string;
  tipoContacto: TipoContacto;
  prioridad: PrioridadSeguimiento;
  fechaProgramada: string;
  fechaRealizada?: string;
  estadoTarea: EstadoSeguimiento;
  resultado?: string;
  observaciones?: string;
  titulo?: string;
  tipoSeguimiento?: string;
  modalidad?: string;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export interface SeguimientoRequest {
  motivoSeguimiento: string;
  tipoContacto: TipoContacto;
  prioridad: PrioridadSeguimiento;
  fechaProgramada: string;
  responsableId?: string;
  observaciones?: string;
}

export interface EfectuarSeguimientoRequest {
  resultado: string;
  observaciones?: string;
}

export interface CancelarSeguimientoRequest {
  motivo: string;
}

/** @deprecated use Seguimiento */
export interface FollowUp {
  id: string;
  pacienteId: number;
  tipo: 'EVOLUCION' | 'NOTA_ENFERMERIA' | 'ENCUESTA';
  contenido: string;
  autor: string;
  createdAt: string;
}

// ============================================
// TAREA TYPES (Tareas para Educadoras)
// ============================================

export type TipoTarea =
  | 'SEGUIMIENTO'
  | 'EDUCACION'
  | 'ADHERENCIA'
  | 'FARMACIA'
  | 'CITA_MEDICA'
  | 'TOMA_MUESTRA'
  | 'LLAMADA'
  | 'VISITA_DOMICILIARIA'
  | 'OTRO';

export type CanalTarea =
  | 'TELEFONO'
  | 'WHATSAPP'
  | 'EMAIL'
  | 'PRESENCIAL'
  | 'VIDEOLLAMADA'
  | 'SMS';

export type EstadoTarea =
  | 'PENDIENTE'
  | 'EN_PROGRESO'
  | 'COMPLETADA'
  | 'CANCELADA'
  | 'REPROGRAMADA';

export type PrioridadTarea = 'ALTA' | 'MEDIA' | 'BAJA';

export interface Tarea {
  id: string;
  tenantId?: string;
  patientId: number;
  patientNombre?: string;
  educadoraId?: string;
  barreraId?: string;
  seguimientoId?: string;
  prescripcionId?: number;
  titulo: string;
  descripcion?: string;
  tipoTarea: TipoTarea;
  canal: CanalTarea;
  prioridad: PrioridadTarea;
  estado: EstadoTarea;
  fechaProgramada?: string;
  fechaLimite?: string;
  fechaCompletada?: string;
  resultado?: string;
  notas?: string;
  fechaCreacion: string;
  fechaActualizacion: string;
  createdBy?: string;
}

export interface TareaRequest {
  patientId: number;
  educadoraId?: string;
  barreraId?: string;
  seguimientoId?: string;
  prescripcionId?: number;
  titulo: string;
  descripcion?: string;
  tipoTarea?: TipoTarea;
  canal?: CanalTarea;
  prioridad?: PrioridadTarea;
  fechaProgramada?: string;
  fechaLimite?: string;
  notas?: string;
}

export interface CompletarTareaRequest {
  resultado?: string;
  notas?: string;
}

export interface CancelarTareaRequest {
  motivo?: string;
}

// ============================================
// BARRIER TYPES
// ============================================

export type BarrierCategory =
  | 'FORMULACION'
  | 'AUTORIZACION'
  | 'COMPRA'
  | 'RESPONSABILIDAD_PACIENTE'
  | 'INFUSION'
  | 'ENFERMEDAD'
  | 'DESPACHO'
  | 'INVIMA';

export type BarrierSubcategory =
  | 'FORMULA_MEDICA_INCOMPLETA'
  | 'FORMULA_MEDICA_VENCIDA'
  | 'NEGACION_AUTORIZACION'
  | 'PROCESO_AUTORIZACION_PENDIENTE'
  | 'SIN_STOCK'
  | 'PROBLEMAS_COMPRA'
  | 'ADHERENCIA_PACIENTE'
  | 'EVENTO_ADVERSO'
  | 'HOSPITALIZACION'
  | 'INFUSION_INCOMPLETA'
  | 'REACCION_ADVERSA'
  | 'ENFERMEDAD_INTERCURRENTE'
  | 'COMPLICACION_ENFERMEDAD_BASE'
  | 'PROBLEMA_DESPACHO'
  | 'INVIMA_PENDIENTE'
  | string;

export type BarrierStatus = 'ABIERTA' | 'EN_PROCESO' | 'CERRADA';

export type BarrierPrioridad = 'ALTA' | 'MEDIA' | 'BAJA';

export interface Barrier {
  id: string;
  patientId: number;
  patientName?: string;
  patientDocument?: string;
  tenantId?: string;
  category: BarrierCategory;
  categoryDescription?: string;
  subcategory: BarrierSubcategory;
  subcategoryDescription?: string;
  responsibleArea?: string;
  description: string;
  detailedNotes?: string;
  openedAt?: string;
  closedAt?: string;
  expectedResolutionDate?: string;
  status: BarrierStatus;
  resolvedBy?: string;
  resolutionNotes?: string;
  prioridad: BarrierPrioridad;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BarrierRequest {
  patientId: number;
  category: BarrierCategory;
  subcategory: BarrierSubcategory;
  description: string;
  detailedNotes?: string;
  responsibleArea?: string;
  expectedResolutionDate?: string;
  prioridad?: BarrierPrioridad;
}

export interface CloseBarrierRequest {
  resolvedBy: string;
  resolutionNotes?: string;
}

// ============================================
// DELIVERY TYPES (placeholder)
// ============================================

export interface Delivery {
  id: string;
  pacienteId: number;
  prescripcionId: string;
  direccion: string;
  estado: 'PENDIENTE' | 'EN_CAMINO' | 'COMPLETADA' | 'FALLIDA';
  operadorLogistico?: string;
  trackingNumber?: string;
  createdAt: string;
}

// ============================================
// PARACLINICOS TYPES
// ============================================

export interface TipoParaclinico {
  id: number;
  codigo: string;
  nombre: string;
  categoria?: string;
  unidadMedida?: string;
  valorReferenciaMin?: number;
  valorReferenciaMax?: number;
  descripcion?: string;
  activo: boolean;
}

export type EstadoResultado = 'PENDIENTE' | 'EN_PROCESO' | 'REALIZADO' | 'CANCELADO';
export type InterpretacionParaclinico = 'NORMAL' | 'ANORMAL' | 'CRITICO' | 'BORDERLINE';

export interface Paraclinico {
  id: string;
  tenantId?: string;
  patientId: number;
  patientName?: string;
  tipoParaclinicoId: number;
  tipoParaclinicoNombre?: string;
  tipoParaclinicoCodigo?: string;
  fechaSolicitud: string;
  fechaRealizacion?: string;
  fechaResultado?: string;
  valorResultado?: number;
  valorTexto?: string;
  estadoResultado: EstadoResultado;
  esNormal?: boolean;
  interpretacion?: InterpretacionParaclinico;
  observaciones?: string;
  medicoSolicitaId?: string;
  laboratorioExterno?: string;
  profesionalResponsable?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

export interface CreateParaclinicoRequest {
  patientId: number;
  tipoParaclinicoId: number;
  fechaSolicitud: string;
  fechaRealizacion?: string;
  medicoSolicitaId?: string;
  laboratorioExterno?: string;
  observaciones?: string;
}

export interface RegistrarResultadoRequest {
  valorResultado?: number;
  valorTexto?: string;
  esNormal?: boolean;
  interpretacion?: InterpretacionParaclinico;
  profesionalResponsable?: string;
  observaciones?: string;
}

// ============================================
// SERVICIOS COMPLEMENTARIOS TYPES
// ============================================

export type TipoServicioComplementario =
  | 'TRANSPORTE'
  | 'NUTRICION'
  | 'PSICOLOGIA'
  | 'TRABAJO_SOCIAL'
  | 'ENFERMERIA';

export type EstadoServicioComplementario =
  | 'PENDIENTE'
  | 'PROGRAMADO'
  | 'COMPLETADO'
  | 'CANCELADO';

export interface ServicioComplementario {
  id: string;
  patientId: number;
  patientName?: string;
  tipoServicio: TipoServicioComplementario;
  profesionalSolicitaId?: string;
  fechaSolicitud: string;
  fechaServicio?: string;
  profesionalAtiende?: string;
  estadoServicio: EstadoServicioComplementario;
  observaciones?: string;
  fechaCreacion?: string;
  fechaActualizacion?: string;
}

export interface CreateServicioComplementarioRequest {
  patientId: number;
  tipoServicio: TipoServicioComplementario;
  profesionalSolicitaId?: string;
  fechaSolicitud?: string;
  fechaServicio?: string;
  observaciones?: string;
}

export interface ProgramarServicioRequest {
  fechaServicio: string;
}

export interface CompletarServicioRequest {
  profesionalAtiende: string;
  observaciones?: string;
}

export interface CancelarServicioRequest {
  motivoCancelacion: string;
}

// ============================================
// FORM VALIDATION TYPES
// ============================================

export interface FieldError {
  field: string;
  message: string;
}
