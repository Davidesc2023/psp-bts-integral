/**
 * Constantes del módulo de Pacientes
 */

import { PatientStatus } from '@/types';

/**
 * Colores de estado según diseño Sypher
 * NOTA: Estos colores deben usarse con theme.palette en componentes
 * Para ACTIVO usar: alpha(theme.palette.primary.main, 0.1) y theme.palette.primary.dark
 */
export const PATIENT_STATUS_COLORS: Record<PatientStatus, { bg: string; text: string }> = {
  EN_PROCESO:           { bg: '#dbeafe', text: '#2563eb' },
  ACTIVO:               { bg: '#d1fae5', text: '#065f46' },
  SUSPENDIDO:           { bg: '#fef3c7', text: '#d97706' },
  INTERRUMPIDO:         { bg: '#fde68a', text: '#92400e' },
  DROP_OUT:             { bg: '#fee2e2', text: '#dc2626' },
  PRESCRITO_SIN_INICIO: { bg: '#ede9fe', text: '#6d28d9' },
  RETIRADO:             { bg: '#f3f4f6', text: '#6b7280' },
  FALLECIDO:            { bg: '#1f2937', text: '#f9fafb' },
};

/**
 * Etiquetas de estado
 */
export const PATIENT_STATUS_LABELS: Record<PatientStatus, string> = {
  EN_PROCESO:           'En Proceso',
  ACTIVO:               'Activo',
  SUSPENDIDO:           'Suspendido',
  INTERRUMPIDO:         'Interrumpido',
  DROP_OUT:             'Drop Out',
  PRESCRITO_SIN_INICIO: 'Prescrito Sin Inicio',
  RETIRADO:             'Retirado',
  FALLECIDO:            'Fallecido',
};

/**
 * Opciones de tipo de documento
 */
export const DOCUMENT_TYPES = [
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'TI', label: 'Tarjeta de Identidad' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'PA', label: 'Pasaporte' },
];

/**
 * Opciones de género
 */
export const GENDER_OPTIONS = [
  { value: 'MASCULINO', label: 'Masculino' },
  { value: 'FEMENINO', label: 'Femenino' },
  { value: 'OTRO', label: 'Otro' },
];

/**
 * Opciones de estado del paciente
 */
export const STATUS_OPTIONS = [
  { value: 'EN_PROCESO', label: 'En Proceso' },
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'SUSPENDIDO', label: 'Suspendido' },
  { value: 'DROP_OUT', label: 'Drop Out' },
  { value: 'RETIRADO', label: 'Retirado' },
];
