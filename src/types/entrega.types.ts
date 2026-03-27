/**
 * Types para el módulo de Entregas
 */

export enum TipoEntrega {
  PUNTO = 'PUNTO',
  DOMICILIO = 'DOMICILIO',
  IPS = 'IPS',
  FARMACIA = 'FARMACIA',
}

export enum EstadoEntrega {
  PROGRAMADA = 'PROGRAMADA',
  EN_TRANSITO = 'EN_TRANSITO',
  ENTREGADA = 'ENTREGADA',
  CANCELADA = 'CANCELADA',
  DEVUELTA = 'DEVUELTA',
}

export interface Entrega {
  id: number;
  pacienteId: number;
  prescripcionId: number;
  operadorLogisticoId?: number;
  tipo: TipoEntrega;
  estado: EstadoEntrega;
  fechaProgramada: string;
  fechaDespacho?: string;
  fechaEntrega?: string;
  lote?: string;
  fechaVencimiento?: string;
  cantidadEntregada?: number;
  numeroGuia?: string;
  direccionEntrega?: string;
  nombreReceptor?: string;
  cedulaReceptor?: string;
  observaciones?: string;
  motivoDevolucion?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateEntregaRequest {
  pacienteId: number;
  prescripcionId: number;
  operadorLogisticoId?: number;
  tipo: TipoEntrega;
  fechaProgramada: string;
  lote?: string;
  fechaVencimiento?: string;
  direccionEntrega?: string;
  observaciones?: string;
}

export interface UpdateEntregaRequest {
  operadorLogisticoId?: number;
  fechaProgramada?: string;
  lote?: string;
  fechaVencimiento?: string;
  direccionEntrega?: string;
  observaciones?: string;
}

export interface MarcarEnTransitoRequest {
  numeroGuia: string;
  actualizadoPor?: string;
}

export interface MarcarEntregadaRequest {
  nombreReceptor: string;
  cedulaReceptor: string;
  cantidadEntregada: number;
  recibidoPor?: string;
}

export interface MarcarDevueltaRequest {
  motivo: string;
  actualizadoPor?: string;
}
