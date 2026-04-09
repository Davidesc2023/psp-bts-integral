import { supabase } from '@/services/supabaseClient';
import { PaginatedResponse } from '@/types';
import { getCurrentTenantId } from '@/utils/getCurrentTenant';


// ── TYPES ──────────────────────────────────────────────────────────────────

export interface CatalogParams {
  search?: string;
  active?: boolean;
  page?: number;
  size?: number;
}

export interface EpsRecord {
  id: number;
  codigo: string;
  nombre: string;
  regimen: 'CONTRIBUTIVO' | 'SUBSIDIADO' | 'ESPECIAL' | 'EXCEPCIONES';
  activo: boolean;
}

export interface IpsRecord {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
}

export interface LogisticsOperatorRecord {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
}

export interface CityRecord {
  id: number;
  codigo: string;
  nombre: string;
  departamento: string;
  activo: boolean;
}

export interface DiagnosticoCie10Record {
  id: number;
  codigo: string;
  descripcion: string;
  categoria: string;
  activo: boolean;
}

export interface ProgramaPspRecord {
  id: number;
  codigo: string;
  nombre: string;
  descripcion: string;
  activo: boolean;
}

export interface TipoParaclinicoRecord {
  id: number;
  codigo: string;
  nombre: string;
  activo: boolean;
}

export interface BulkUploadResult {
  creados: number;
  actualizados: number;
  errores: number;
  mensajesError?: string[];
}

// ── HELPERS ───────────────────────────────────────────────────────────────

async function paginatedQuery<T>(
  table: string,
  params: CatalogParams,
  searchColumns: string[],
  mapFn: (row: any) => T,
  tenantFilter = true,
): Promise<PaginatedResponse<T>> {
  const page = params.page ?? 0;
  const size = params.size ?? 20;
  const from = page * size;
  const to = from + size - 1;

  let query = supabase.from(table).select('*', { count: 'exact' }).range(from, to);

  if (tenantFilter) {
    query = query.eq('tenant_id', await getCurrentTenantId());
  }

  if (params.search && searchColumns.length) {
    const orFilter = searchColumns.map((c) => `${c}.ilike.%${params.search}%`).join(',');
    query = query.or(orFilter);
  }
  if (params.active !== undefined) {
    // Try 'active' first — some tables use 'activo'
    query = query.eq('active', params.active);
  }

  const { data, count, error } = await query;
  if (error) throw error;

  const totalElements = count ?? 0;
  const totalPages = Math.ceil(totalElements / size);

  return {
    content: (data ?? []).map(mapFn),
    totalElements,
    totalPages,
    size,
    number: page,
    first: page === 0,
    last: page >= totalPages - 1,
  };
}

// ── EPS ───────────────────────────────────────────────────────────────────

function mapEps(row: any): EpsRecord {
  return { id: row.id, codigo: row.code ?? '', nombre: row.name ?? '', regimen: row.regime ?? 'CONTRIBUTIVO', activo: row.active ?? true };
}

export const epsService = {
  getEps: (params: CatalogParams = {}) =>
    paginatedQuery<EpsRecord>('eps', params, ['code', 'name'], mapEps),

  createEps: async (data: Omit<EpsRecord, 'id'>) => {
    const { data: row, error } = await supabase
      .from('eps')
      .insert({ code: data.codigo, name: data.nombre, regime: data.regimen, active: data.activo, tenant_id: await getCurrentTenantId() })
      .select()
      .single();
    if (error) throw error;
    return mapEps(row);
  },

  updateEps: async (id: number, data: Omit<EpsRecord, 'id'>) => {
    const { data: row, error } = await supabase
      .from('eps')
      .update({ code: data.codigo, name: data.nombre, regime: data.regimen, active: data.activo })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapEps(row);
  },

  toggleEpsStatus: async (id: number) => {
    const { data: cur, error: fe } = await supabase.from('eps').select('active').eq('id', id).single();
    if (fe) throw fe;
    const { data: row, error } = await supabase.from('eps').update({ active: !cur.active }).eq('id', id).select().single();
    if (error) throw error;
    return mapEps(row);
  },
};

// ── IPS ───────────────────────────────────────────────────────────────────

function mapIps(row: any): IpsRecord {
  return { id: row.id, codigo: row.code ?? row.name ?? '', nombre: row.name ?? '', activo: row.active ?? true };
}

export const ipsService = {
  getIps: (params: CatalogParams = {}) =>
    paginatedQuery<IpsRecord>('ips', params, ['name'], mapIps),

  createIps: async (data: Omit<IpsRecord, 'id'>) => {
    const { data: row, error } = await supabase
      .from('ips')
      .insert({ name: data.nombre, active: data.activo, tenant_id: await getCurrentTenantId() })
      .select()
      .single();
    if (error) throw error;
    return mapIps(row);
  },

  updateIps: async (id: number, data: Omit<IpsRecord, 'id'>) => {
    const { data: row, error } = await supabase
      .from('ips')
      .update({ name: data.nombre, active: data.activo })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapIps(row);
  },

  toggleIpsStatus: async (id: number) => {
    const { data: cur, error: fe } = await supabase.from('ips').select('active').eq('id', id).single();
    if (fe) throw fe;
    const { data: row, error } = await supabase.from('ips').update({ active: !cur.active }).eq('id', id).select().single();
    if (error) throw error;
    return mapIps(row);
  },
};

// ── LOGISTICS OPERATORS ───────────────────────────────────────────────────

function mapLogOp(row: any): LogisticsOperatorRecord {
  return { id: row.id, codigo: row.code ?? row.name ?? '', nombre: row.name ?? '', activo: row.active ?? true };
}

export const logisticsOperatorsService = {
  getLogisticsOperators: (params: CatalogParams = {}) =>
    paginatedQuery<LogisticsOperatorRecord>('logistics_operators', params, ['name'], mapLogOp),

  createLogisticsOperator: async (data: Omit<LogisticsOperatorRecord, 'id'>) => {
    const { data: row, error } = await supabase
      .from('logistics_operators')
      .insert({ name: data.nombre, active: data.activo, tenant_id: await getCurrentTenantId() })
      .select()
      .single();
    if (error) throw error;
    return mapLogOp(row);
  },

  updateLogisticsOperator: async (id: number, data: Omit<LogisticsOperatorRecord, 'id'>) => {
    const { data: row, error } = await supabase
      .from('logistics_operators')
      .update({ name: data.nombre, active: data.activo })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapLogOp(row);
  },

  toggleLogisticsOperatorStatus: async (id: number) => {
    const { data: cur, error: fe } = await supabase.from('logistics_operators').select('active').eq('id', id).single();
    if (fe) throw fe;
    const { data: row, error } = await supabase.from('logistics_operators').update({ active: !cur.active }).eq('id', id).select().single();
    if (error) throw error;
    return mapLogOp(row);
  },
};

// ── CITIES ────────────────────────────────────────────────────────────────

function mapCity(row: any): CityRecord {
  return { id: row.id, codigo: row.code ?? '', nombre: row.name ?? '', departamento: row.department_id ?? '', activo: true };
}

export const adminCitiesService = {
  getCities: (params: CatalogParams = {}) =>
    paginatedQuery<CityRecord>('cities', params, ['code', 'name'], mapCity, false),

  createCity: async (data: Omit<CityRecord, 'id'>) => {
    const { data: row, error } = await supabase
      .from('cities')
      .insert({ code: data.codigo, name: data.nombre, department_id: data.departamento })
      .select()
      .single();
    if (error) throw error;
    return mapCity(row);
  },

  updateCity: async (id: number, data: Omit<CityRecord, 'id'>) => {
    const { data: row, error } = await supabase
      .from('cities')
      .update({ code: data.codigo, name: data.nombre, department_id: data.departamento })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapCity(row);
  },

  toggleCityStatus: async (_id: number) => {
    // cities table lacks an active column — no-op returning current row
    const { data: row, error } = await supabase.from('cities').select('*').eq('id', _id).single();
    if (error) throw error;
    return mapCity(row);
  },
};

// ── DIAGNÓSTICOS CIE-10 ───────────────────────────────────────────────────

function mapDiag(row: any): DiagnosticoCie10Record {
  return { id: row.id, codigo: row.codigo ?? '', descripcion: row.nombre ?? '', categoria: row.capitulo ?? row.grupo ?? '', activo: true };
}

export const diagnosticosCie10Service = {
  getDiagnosticos: (params: CatalogParams = {}) =>
    paginatedQuery<DiagnosticoCie10Record>('diagnosticos_cie10', params, ['codigo', 'nombre'], mapDiag, false),

  createDiagnostico: async (data: Omit<DiagnosticoCie10Record, 'id'>) => {
    const { data: row, error } = await supabase
      .from('diagnosticos_cie10')
      .insert({ codigo: data.codigo, nombre: data.descripcion, capitulo: data.categoria })
      .select()
      .single();
    if (error) throw error;
    return mapDiag(row);
  },

  updateDiagnostico: async (id: number, data: Omit<DiagnosticoCie10Record, 'id'>) => {
    const { data: row, error } = await supabase
      .from('diagnosticos_cie10')
      .update({ codigo: data.codigo, nombre: data.descripcion, capitulo: data.categoria })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapDiag(row);
  },

  toggleDiagnosticoStatus: async (_id: number) => {
    // diagnosticos_cie10 has no active column — no-op
    const { data: row, error } = await supabase.from('diagnosticos_cie10').select('*').eq('id', _id).single();
    if (error) throw error;
    return mapDiag(row);
  },
};

// ── PROGRAMAS PSP ─────────────────────────────────────────────────────────

function mapPrograma(row: any): ProgramaPspRecord {
  return { id: row.id, codigo: row.id ?? '', nombre: row.nombre ?? '', descripcion: row.descripcion ?? '', activo: row.activo ?? true };
}

export const programasPspService = {
  getProgramas: async (params: CatalogParams = {}) => {
    const page = params.page ?? 0;
    const size = params.size ?? 20;
    const from = page * size;
    const to = from + size - 1;

    let query = supabase
      .from('programas_psp')
      .select('*', { count: 'exact' })
      .eq('tenant_id', await getCurrentTenantId())
      .range(from, to);

    if (params.search) {
      query = query.or(`nombre.ilike.%${params.search}%,descripcion.ilike.%${params.search}%`);
    }
    if (params.active !== undefined) {
      query = query.eq('activo', params.active);
    }

    const { data, count, error } = await query;
    if (error) throw error;

    const totalElements = count ?? 0;
    const totalPages = Math.ceil(totalElements / size);
    return {
      content: (data ?? []).map(mapPrograma),
      totalElements,
      totalPages,
      size,
      number: page,
      first: page === 0,
      last: page >= totalPages - 1,
    } as PaginatedResponse<ProgramaPspRecord>;
  },

  createPrograma: async (data: Omit<ProgramaPspRecord, 'id'>) => {
    const { data: row, error } = await supabase
      .from('programas_psp')
      .insert({ nombre: data.nombre, descripcion: data.descripcion, activo: data.activo, tenant_id: await getCurrentTenantId() })
      .select()
      .single();
    if (error) throw error;
    return mapPrograma(row);
  },

  updatePrograma: async (id: number, data: Omit<ProgramaPspRecord, 'id'>) => {
    const { data: row, error } = await supabase
      .from('programas_psp')
      .update({ nombre: data.nombre, descripcion: data.descripcion, activo: data.activo })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapPrograma(row);
  },

  toggleProgramaStatus: async (id: number) => {
    const { data: cur, error: fe } = await supabase.from('programas_psp').select('activo').eq('id', id).single();
    if (fe) throw fe;
    const { data: row, error } = await supabase.from('programas_psp').update({ activo: !cur.activo }).eq('id', id).select().single();
    if (error) throw error;
    return mapPrograma(row);
  },
};

// ── TIPOS PARACLÍNICO ─────────────────────────────────────────────────────

function mapTipoPara(row: any): TipoParaclinicoRecord {
  return { id: row.id, codigo: row.codigo ?? '', nombre: row.nombre ?? '', activo: row.activo ?? true };
}

export const tiposParaclinicoService = {
  // tipos_paraclinicos no tiene tenant_id → tenantFilter = false
  getTiposParaclinico: (params: CatalogParams = {}) =>
    paginatedQuery<TipoParaclinicoRecord>('tipos_paraclinicos', params, ['codigo', 'nombre'], mapTipoPara, false),

  createTipoParaclinico: async (data: Omit<TipoParaclinicoRecord, 'id'>) => {
    const { data: row, error } = await supabase
      .from('tipos_paraclinicos')
      .insert({ codigo: data.codigo, nombre: data.nombre, activo: data.activo })
      .select()
      .single();
    if (error) throw error;
    return mapTipoPara(row);
  },

  updateTipoParaclinico: async (id: number, data: Omit<TipoParaclinicoRecord, 'id'>) => {
    const { data: row, error } = await supabase
      .from('tipos_paraclinicos')
      .update({ codigo: data.codigo, nombre: data.nombre, activo: data.activo })
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    return mapTipoPara(row);
  },

  toggleTipoParaclinicoStatus: async (id: number) => {
    const { data: cur, error: fe } = await supabase.from('tipos_paraclinicos').select('activo').eq('id', id).single();
    if (fe) throw fe;
    const { data: row, error } = await supabase.from('tipos_paraclinicos').update({ activo: !cur.activo }).eq('id', id).select().single();
    if (error) throw error;
    return mapTipoPara(row);
  },
};

// ── BULK UPLOAD ───────────────────────────────────────────────────────────

export type CatalogName =
  | 'eps'
  | 'ips'
  | 'logistics-operators'
  | 'cities'
  | 'diagnosticos-cie10'
  | 'programas-psp'
  | 'tipos-paraclinico';

export const bulkUpload = async (_catalog: CatalogName, _file: File): Promise<BulkUploadResult> => {
  throw new Error('Bulk upload not supported in Supabase mode');
};
