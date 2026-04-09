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

export enum EstadoEfectividad {
  EFECTIVA    = 'EFECTIVA',
  NO_EFECTIVA = 'NO_EFECTIVA',
  PARCIAL     = 'PARCIAL',
  PENDIENTE   = 'PENDIENTE',
}

export interface Aplicacion {
  id: number;
  pacienteId: number;
  prescripcionId: number;
  educadoraId?: number;
  tipo: TipoAplicacion;
  estado: EstadoAplicacion;
  estadoEfectividad?: EstadoEfectividad;  // Resultado de efectividad del tratamiento
  fase?: number;                           // Número de fase o ciclo del tratamiento
  tipoInfusion?: string;                  // Subtipo de infusión (carga, mantenimiento, etc.)
  dosisAplicada?: string;                 // Dosis planificada
  dosisReal?: string;                     // Dosis realmente administrada
  sinPrescripcion?: boolean;              // Aplicación sin prescripción activa
  fechaProgramada: string;
  horaProgramada?: string;
  fechaAplicacion?: string;
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
  fase?: number;
  tipoInfusion?: string;
  sinPrescripcion?: boolean;
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
  pacienteId: number;
  prescripcionId: number;
  fechaInicio: string;
  fechaFin: string;
  tipo: TipoAplicacion;
  educadoraId?: number;
  horaProgramada?: string;
}
