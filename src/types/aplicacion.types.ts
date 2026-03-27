/**
 * Types para el módulo de Aplicaciones
 */

export enum TipoAplicacion {
  INYECCION = 'INYECCION',
  INFUSION = 'INFUSION',
  CREMA = 'CREMA',
  CURACION = 'CURACION',
  ORAL = 'ORAL',
  CRISIS = 'CRISIS',
}

export enum EstadoAplicacion {
  PROGRAMADA = 'PROGRAMADA',
  APLICADA = 'APLICADA',
  NO_APLICADA = 'NO_APLICADA',
}

export interface Aplicacion {
  id: number;
  pacienteId: number;
  prescripcionId: number;
  educadoraId?: number;
  tipo: TipoAplicacion;
  estado: EstadoAplicacion;
  fechaProgramada: string;
  horaProgramada?: string;
  fechaAplicacion?: string;
  dosisAplicada?: string;
  observaciones?: string;
  motivoNoAplicacion?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateAplicacionRequest {
  pacienteId: number;
  prescripcionId: number;
  educadoraId?: number;
  tipo: TipoAplicacion;
  fechaProgramada: string;
  horaProgramada?: string;
  observaciones?: string;
}

export interface UpdateAplicacionRequest {
  educadoraId?: number;
  fechaProgramada?: string;
  horaProgramada?: string;
  observaciones?: string;
}

export interface AplicarRequest {
  dosisAplicada: string;
  observaciones?: string;
  aplicadoPor?: string;
}

export interface NoAplicarRequest {
  motivo: string;
  actualizadoPor?: string;
}

export interface GenerarAplicacionesMasivasRequest {
  prescripcionId: number;
  fechaInicio: string;
  fechaFin: string;
  tipo: TipoAplicacion;
  educadoraId?: number;
  horaProgramada?: string;
}
