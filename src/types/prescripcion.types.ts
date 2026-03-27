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
  frecuencia: string;
  fechaInicio: string;
  fechaFin?: string;
  duracionDias?: number;
  viaAdministracion: string;
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
  frecuencia: string;
  fechaInicio: string;
  fechaFin?: string;
  duracionDias?: number;
  viaAdministracion: string;
  indicaciones?: string;
  observaciones?: string;
}

export interface UpdatePrescripcionRequest {
  dosis?: string;
  frecuencia?: string;
  fechaFin?: string;
  viaAdministracion?: string;
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
