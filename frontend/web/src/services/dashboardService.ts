import { supabase } from './supabaseClient';
import { getCurrentTenantId } from '@/utils/getCurrentTenant';

export interface CategoryCount {
  category: string;
  count: number;
}

export interface DashboardStats {
  // Pacientes
  totalPacientes: number;
  pacientesActivos: number;
  pacientesEnProceso: number;
  pacientesSuspendidos: number;
  pacientesPorEstado: CategoryCount[];

  // Seguimientos & Tareas
  totalSeguimientos: number;
  totalTareas: number;

  // Barreras
  barrerasActivas: number;
  totalBarreras: number;
  barrerasPorCategoria: CategoryCount[];

  // Transportes
  totalTransportes: number;
  transportesPendientes: number;
  transportesEfectivos: number;

  // Inventario
  totalInventario: number;
  inventarioCritico: number;
  inventarioAgotado: number;

  // Paraclínicos
  totalParaclinicos: number;
  paraclinicosNormales: number;
  paraclinicosAnormales: number;
  paraclinicosPendientes: number;

  // Servicios Complementarios
  totalServiciosComplementarios: number;
  serviciosPendientes: number;
  serviciosCompletados: number;

  // Adherencia (PRD §21)
  adherenciaTratamiento: number;
  adherenciaEntrega: number;
  barrerasResueltas: number;
}

export interface DashboardFilters {
  programaId?: string;
  laboratorioId?: number;
}

export const dashboardService = {
  getStats: async (filters?: DashboardFilters): Promise<DashboardStats> => {
    const tenantId = await getCurrentTenantId();
    const params: Record<string, unknown> = { p_tenant_id: tenantId };
    if (filters?.programaId) params.p_programa_id = filters.programaId;
    if (filters?.laboratorioId) params.p_laboratorio_id = filters.laboratorioId;
    const { data, error } = await supabase.rpc('get_dashboard_stats', params);
    if (error) throw error;
    return data as DashboardStats;
  },
};
