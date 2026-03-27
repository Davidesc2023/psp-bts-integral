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
  ACTIVO: { bg: 'primary.light', text: 'primary.dark' },      // Teal (usar con theme)
  SUSPENDIDO: { bg: '#fef3c7', text: '#d97706' },  // Amarillo
  DROP_OUT: { bg: '#fee2e2', text: '#dc2626' },    // Rojo
  RETIRADO: { bg: '#f3f4f6', text: '#6b7280' },    // Gris
  EN_PROCESO: { bg: '#dbeafe', text: '#2563eb' },  // Azul
};

/**
 * Etiquetas de estado
 */
export const PATIENT_STATUS_LABELS: Record<PatientStatus, string> = {
  ACTIVO: 'Activo',
  SUSPENDIDO: 'Suspendido',
  DROP_OUT: 'Drop Out',
  RETIRADO: 'Retirado',
  EN_PROCESO: 'En Proceso',
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
