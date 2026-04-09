/**
 * Tipos para el módulo de Consultas Médicas (PSP)
 */

export enum TipoConsulta {
  INICIAL         = 'INICIAL',
  SEGUIMIENTO     = 'SEGUIMIENTO',
  CONTROL         = 'CONTROL',
  URGENCIA        = 'URGENCIA',
  TELECONSULTA    = 'TELECONSULTA',
}

export enum EstadoConsulta {
  PROGRAMADA  = 'PROGRAMADA',
  REALIZADA   = 'REALIZADA',
  CANCELADA   = 'CANCELADA',
  NO_ASISTIO  = 'NO_ASISTIO',
}

export interface ConsultaMedica {
  id: number;
  pacienteId: number;
  medicoId?: number;
  medicoNombre?: string;
  tipo: TipoConsulta;
  estado: EstadoConsulta;
  fechaProgramada: string;
  horaProgramada?: string;
  fechaRealizacion?: string;
  motivoConsulta?: string;
  hallazgosClinicosSubjetivos?: string;   // Subjetivo (S) — lo que refiere el paciente
  hallazgosClinicosObjetivos?: string;    // Objetivo (O) — signos vitales, examen físico
  evaluacionDiagnostica?: string;         // Evaluación / Análisis (A)
  planManejo?: string;                    // Plan (P) de manejo
  pesoKg?: number;
  tallaCm?: number;
  imcCalculado?: number;
  tensionArterialSistolica?: number;
  tensionArterialDiastolica?: number;
  frecuenciaCardiacaRpm?: number;
  saturacionOxigenoPct?: number;
  temperaturaGrados?: number;
  respuestaAlTratamiento?: 'EXCELENTE' | 'BUENA' | 'REGULAR' | 'MALA' | 'SIN_EVALUAR';
  proxCitaFecha?: string;
  proxCitaTipo?: TipoConsulta;
  observaciones?: string;
  createdAt: string;
  updatedAt?: string;
  createdBy?: string;
}

export interface CreateConsultaRequest {
  pacienteId: number;
  medicoId?: number;
  tipo: TipoConsulta;
  fechaProgramada: string;
  horaProgramada?: string;
  motivoConsulta?: string;
  observaciones?: string;
}

export interface RegistrarResultadoConsultaRequest {
  fechaRealizacion: string;
  hallazgosClinicosSubjetivos?: string;
  hallazgosClinicosObjetivos?: string;
  evaluacionDiagnostica?: string;
  planManejo?: string;
  pesoKg?: number;
  tallaCm?: number;
  tensionArterialSistolica?: number;
  tensionArterialDiastolica?: number;
  frecuenciaCardiacaRpm?: number;
  saturacionOxigenoPct?: number;
  temperaturaGrados?: number;
  respuestaAlTratamiento?: ConsultaMedica['respuestaAlTratamiento'];
  proxCitaFecha?: string;
  proxCitaTipo?: TipoConsulta;
  observaciones?: string;
}
