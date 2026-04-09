// ============================================================
// PSP – Módulo de Transportes — TypeScript Types
// ============================================================

export type EstadoTransporte = 'PENDIENTE' | 'EFECTIVO' | 'CANCELADO';
export type TipoServicio = 'SENCILLO' | 'DOBLE';

export interface Transporte {
  id: number;
  tenantId?: string;

  // Paciente
  pacienteId: number;
  pacienteNombre?: string;

  // Origen
  direccionOrigen: string;
  barrioOrigen?: string;
  municipioOrigen: string;
  departamentoOrigen: string;
  telefonoContacto?: string;
  tratamiento?: string;

  // Destino
  direccionDestino: string;
  barrioDestino?: string;
  municipioDestino: string;
  departamentoDestino: string;
  nombreIpsDestino?: string;

  // Fecha / Horario
  fechaServicio: string;      // ISO date "YYYY-MM-DD"
  horaServicio: string;       // "HH:mm"
  tipoServicio: TipoServicio;
  fechaRegreso?: string;
  horaRegreso?: string;

  // Acompañante
  requiereAcompanante: boolean;
  nombreAcompanante?: string;

  // Datos del Servicio
  gestoraSolicitante: string;
  requerimientoTransporte: string;
  condicionesEspeciales?: string;
  comentarios?: string;

  // Estado / Cierre
  estado: EstadoTransporte;
  fechaCierre?: string;
  observacionesCierre?: string;
  quienCierra?: string;

  // Auditoría
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
}

export interface CreateTransporteRequest {
  pacienteId: number;
  pacienteNombre?: string;
  direccionOrigen: string;
  barrioOrigen?: string;
  municipioOrigen: string;
  departamentoOrigen: string;
  telefonoContacto?: string;
  tratamiento?: string;
  direccionDestino: string;
  barrioDestino?: string;
  municipioDestino: string;
  departamentoDestino: string;
  nombreIpsDestino?: string;
  fechaServicio: string;
  horaServicio: string;
  tipoServicio?: TipoServicio;
  fechaRegreso?: string;
  horaRegreso?: string;
  requiereAcompanante?: boolean;
  nombreAcompanante?: string;
  gestoraSolicitante: string;
  requerimientoTransporte: string;
  condicionesEspeciales?: string;
  comentarios?: string;
}

export interface CambiarEstadoRequest {
  estado: EstadoTransporte;
  observacionesCierre?: string;
  quienCierra: string;
}

// Catálogos para dropdowns
export const GESTORAS = [
  'Ana María López',
  'Carolina Martínez',
  'Diana Pérez',
  'Fernanda Gómez',
  'Gloria Jiménez',
] as const;

export const REQUERIMIENTOS_TRANSPORTE = [
  'Consulta médica especialista',
  'Control médico',
  'Examen de laboratorio',
  'Procedimiento quirúrgico',
  'Terapia física',
  'Terapia ocupacional',
  'Urgencias',
  'Otro',
] as const;
