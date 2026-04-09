/**
 * Types para el módulo de Prescripciones
 */

export enum EstadoPrescripcion {
  VIGENTE = 'VIGENTE',
  VENCIDA = 'VENCIDA',
  CANCELADA = 'CANCELADA',
  SUSPENDIDA = 'SUSPENDIDA',
}

export interface Medicamento {
  id: number;
  nombre: string;
  concentracion: string;
  unidad: string;
  laboratorio: string;
  codigoAtc: string;
  descripcion?: string;
  activo: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface MedicoPrescriptor {
  id: number;
  nombre: string;
  apellido: string;
  registroMedico: string;
  especialidad: string;
  telefono?: string;
  email?: string;
  activo: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface Prescripcion {
  id: number;
  pacienteId: number;
  medicamento: Medicamento;
  medico: MedicoPrescriptor;
  dosis: string;
  dosis2?: string;                     // Segunda dosis (p. ej. dosis de carga)
  frecuencia: string;
  viaAdministracion: string;
  fechaInicio: string;
  fechaFin?: string;
  duracionDias?: number;
  unidadesTotales?: number;            // Unidades totales prescritas
  numeroPrescripcionMipres?: string;   // Número MIPRES (Registro Nacional de Prescripción)
  pesoPacienteKg?: number;             // Peso del paciente al momento de la prescripción
  tallaPacienteCm?: number;            // Talla del paciente en cm
  ipsPrescriptoraId?: number;          // IPS donde se emitió la prescripción
  ipsPrescriptoraNombre?: string;
  cantidadPrescrita?: number;           // Cantidad de unidades prescritas
  indicaciones?: string;
  observaciones?: string;
  estado: EstadoPrescripcion;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreatePrescripcionRequest {
  pacienteId: number;
  medicamentoId: number;
  medicoId: number;
  dosis: string;
  dosis2?: string;
  frecuencia: string;
  viaAdministracion: string;
  fechaInicio: string;
  fechaFin?: string;
  duracionDias?: number;
  unidadesTotales?: number;
  cantidadPrescrita?: number;
  numeroPrescripcionMipres?: string;
  pesoPacienteKg?: number;
  tallaPacienteCm?: number;
  ipsPrescriptoraId?: number;
  indicaciones?: string;
  observaciones?: string;
}

export interface UpdatePrescripcionRequest {
  dosis?: string;
  dosis2?: string;
  frecuencia?: string;
  viaAdministracion?: string;
  fechaFin?: string;
  duracionDias?: number;
  unidadesTotales?: number;
  cantidadPrescrita?: number;
  numeroPrescripcionMipres?: string;
  pesoPacienteKg?: number;
  tallaPacienteCm?: number;
  ipsPrescriptoraId?: number;
  indicaciones?: string;
  observaciones?: string;
  estado?: EstadoPrescripcion;
}

export interface CreateMedicamentoRequest {
  nombre: string;
  concentracion: string;
  unidad: string;
  laboratorio: string;
  codigoAtc: string;
  descripcion?: string;
}

export interface CreateMedicoRequest {
  nombre: string;
  apellido: string;
  registroMedico: string;
  especialidad: string;
  telefono?: string;
  email?: string;
}
