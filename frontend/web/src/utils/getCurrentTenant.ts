import { supabase } from '@/services/supabaseClient';

/**
 * Caché en memoria del tenant_id del usuario actual.
 * Se limpia al hacer logout mediante clearTenantCache().
 */
let cachedTenantId: string | null = null;

/**
 * Retorna el tenant_id del usuario autenticado.
 * Lee user_profiles una sola vez por sesión; las llamadas siguientes usan caché.
 *
 * @throws Error si no hay sesión activa o el usuario no tiene tenant asignado.
 */
export async function getCurrentTenantId(): Promise<string> {
  if (cachedTenantId) return cachedTenantId;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log('[DIAG] USER AUTH:', user);

  if (!user) throw new Error('No hay sesión activa');

  const { data: profile, error } = await supabase
    .from('user_profiles')
    .select('tenant_id')
    .eq('id', user.id)
    .single();

  console.log('[DIAG] PROFILE DB:', profile);
  console.log('[DIAG] PROFILE ERROR:', error);
  console.log('[DIAG] user.id usado en query:', user.id);

  if (error || !profile?.tenant_id) {
    throw new Error('El usuario no tiene un tenant asignado. Contacta al administrador.');
  }

  cachedTenantId = profile.tenant_id as string;
  return cachedTenantId;
}

/**
 * Limpia el caché del tenant. Debe llamarse en el logout del usuario.
 */
export function clearTenantCache(): void {
  cachedTenantId = null;
}

/**
 * Inyecta tenant_id en cualquier payload de INSERT / UPSERT.
 * Usar en todos los .insert() y .upsert() para garantizar aislamiento multi-tenant.
 * Lanza un error descriptivo si el usuario no tiene tenant asignado,
 * en lugar de dejar que el servidor retorne un error RLS críptico.
 *
 * @example
 *   .insert(await withTenant({ patient_id: 1, status: 'ACTIVO' }))
 */
export async function withTenant<T extends object>(
  data: T
): Promise<T & { tenant_id: string }> {
  const tenantId = await getCurrentTenantId();
  return { ...data, tenant_id: tenantId } as T & { tenant_id: string };
}
