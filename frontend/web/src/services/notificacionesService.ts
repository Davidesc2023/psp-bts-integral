import { supabase } from '@/services/supabaseClient';
import type { Notificacion } from '@/types/notificaciones.types';
import type { RealtimeChannel } from '@supabase/supabase-js';

const TABLE = 'notifications';

/**
 * Filtro base: tenant + (usuario propio O broadcast)
 */
function baseQuery(tenantId: string, userId: string) {
  return supabase
    .from(TABLE)
    .select('*')
    .eq('tenant_id', tenantId)
    .or(`user_id.eq.${userId},user_id.is.null`);
}

/**
 * Obtiene notificaciones NO leídas del usuario actual
 */
export async function getUnreadNotifications(
  tenantId: string,
  userId: string,
): Promise<Notificacion[]> {
  const { data, error } = await baseQuery(tenantId, userId)
    .eq('leida', false)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;
  return (data as Notificacion[]) ?? [];
}

/**
 * Obtiene todas las notificaciones (historial completo) para la página /notifications
 */
export async function getAllNotifications(
  tenantId: string,
  userId: string,
): Promise<Notificacion[]> {
  const { data, error } = await baseQuery(tenantId, userId)
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) throw error;
  return (data as Notificacion[]) ?? [];
}

/**
 * Retorna el conteo de notificaciones no leídas
 */
export async function getUnreadCount(
  tenantId: string,
  userId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from(TABLE)
    .select('*', { count: 'exact', head: true })
    .eq('tenant_id', tenantId)
    .eq('leida', false)
    .or(`user_id.eq.${userId},user_id.is.null`);

  if (error) throw error;
  return count ?? 0;
}

/**
 * Marca una notificación como leída
 */
export async function marcarLeida(id: string): Promise<void> {
  const { error } = await supabase
    .from(TABLE)
    .update({ leida: true, fecha_lectura: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

/**
 * Marca todas las notificaciones no leídas del usuario como leídas
 */
export async function marcarTodasLeidas(
  tenantId: string,
  userId: string,
): Promise<void> {
  const now = new Date().toISOString();

  const { error } = await supabase
    .from(TABLE)
    .update({ leida: true, fecha_lectura: now })
    .eq('tenant_id', tenantId)
    .eq('leida', false)
    .or(`user_id.eq.${userId},user_id.is.null`);

  if (error) throw error;
}

/**
 * Suscripción en tiempo real a cambios en la tabla notifications
 * Llama a onChanged() cuando hay INSERT o UPDATE relevante
 */
export function subscribeToNotifications(
  tenantId: string,
  userId: string,
  onChanged: () => void,
): RealtimeChannel {
  const channel = supabase
    .channel(`notifications-${tenantId}-${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: TABLE,
        filter: `tenant_id=eq.${tenantId}`,
      },
      () => {
        onChanged();
      },
    )
    .subscribe();

  return channel;
}
