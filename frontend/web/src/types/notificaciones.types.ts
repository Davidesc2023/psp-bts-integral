// Tipos para el Sistema de Notificaciones PSP
// Alineados con el schema de la tabla notifications en Supabase

export type NotifTipo =
  | 'SEGUIMIENTO_PROXIMO'
  | 'PRESCRIPCION_POR_VENCER'
  | 'BARRERA_SIN_RESOLVER'
  | 'APLICACION_NO_EFECTIVA'
  | 'PARACLÍNICO_PROXIMO'
  | 'PACIENTE_SIN_SEGUIMIENTO'
  | 'ENTREGA_PROXIMA'
  | 'TAREA_VENCIDA_ALTA';

export type NotifModulo =
  | 'SEGUIMIENTO'
  | 'ENTREGA'
  | 'APLICACION'
  | 'BARRERA'
  | 'PRESCRIPCION'
  | 'PARACLÍNICO'
  | 'TAREA';

export interface Notificacion {
  id: string;
  tenant_id: string;
  user_id: string | null;
  tipo: NotifTipo;
  titulo: string;
  mensaje: string | null;
  patient_id: number | null;
  modulo: NotifModulo | null;
  referencia_id: string | null;
  nav_url: string | null;
  leida: boolean;
  fecha_lectura: string | null;
  created_at: string;
}

export interface NotifUIConfig {
  color: string;
  bg: string;
  borderColor: string;
  label: string;
  icon: 'warning' | 'calendar' | 'info' | 'error' | 'science' | 'person' | 'delivery' | 'task';
}

export const NOTIF_UI_CONFIG: Record<NotifTipo, NotifUIConfig> = {
  SEGUIMIENTO_PROXIMO: {
    color: '#1D4ED8',
    bg: '#DBEAFE',
    borderColor: '#BFDBFE',
    label: 'Seguimiento',
    icon: 'calendar',
  },
  PRESCRIPCION_POR_VENCER: {
    color: '#D97706',
    bg: '#FEF3C7',
    borderColor: '#FDE68A',
    label: 'Prescripción',
    icon: 'warning',
  },
  BARRERA_SIN_RESOLVER: {
    color: '#DC2626',
    bg: '#FEE2E2',
    borderColor: '#FECACA',
    label: 'Barrera',
    icon: 'error',
  },
  APLICACION_NO_EFECTIVA: {
    color: '#DC2626',
    bg: '#FEE2E2',
    borderColor: '#FECACA',
    label: 'Aplicación',
    icon: 'error',
  },
  'PARACLÍNICO_PROXIMO': {
    color: '#7C3AED',
    bg: '#EDE9FE',
    borderColor: '#DDD6FE',
    label: 'Paraclínico',
    icon: 'science',
  },
  PACIENTE_SIN_SEGUIMIENTO: {
    color: '#D97706',
    bg: '#FEF3C7',
    borderColor: '#FDE68A',
    label: 'Paciente',
    icon: 'person',
  },
  ENTREGA_PROXIMA: {
    color: '#059669',
    bg: '#D1FAE5',
    borderColor: '#A7F3D0',
    label: 'Entrega',
    icon: 'delivery',
  },
  TAREA_VENCIDA_ALTA: {
    color: '#DC2626',
    bg: '#FEE2E2',
    borderColor: '#FECACA',
    label: 'Tarea',
    icon: 'task',
  },
};

export const MODULO_FALLBACK_ROUTES: Record<NotifModulo, string> = {
  SEGUIMIENTO: '/followups',
  ENTREGA: '/deliveries',
  APLICACION: '/applications',
  BARRERA: '/barriers',
  PRESCRIPCION: '/prescriptions',
  'PARACLÍNICO': '/diagnostics',
  TAREA: '/followups',
};
