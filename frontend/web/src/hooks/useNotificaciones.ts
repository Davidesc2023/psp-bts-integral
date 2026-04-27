import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { authStore } from '@/stores/auth.store';
import { getCurrentTenantId } from '@/utils/getCurrentTenant';
import {
  getUnreadNotifications,
  getAllNotifications,
  getUnreadCount,
  subscribeToNotifications,
} from '@/services/notificacionesService';
import type { Notificacion } from '@/types/notificaciones.types';

const QUERY_COUNT = 'notifications-count';
const QUERY_UNREAD = 'notifications-unread';
const QUERY_ALL = 'notifications-all';

/**
 * Hook que provee el conteo de notificaciones no leídas.
 * Se mantiene actualizado en tiempo real via Supabase Realtime.
 * Úsalo en Sidebar para el badge.
 */
export function useUnreadCount(): { count: number; isLoading: boolean } {
  const queryClient = useQueryClient();
  const user = authStore((state) => state.user);

  const { data: count = 0, isLoading } = useQuery<number>({
    queryKey: [QUERY_COUNT, user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const tenantId = await getCurrentTenantId();
      return getUnreadCount(tenantId, user.id);
    },
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!user?.id) return;

    // Supabase Realtime necesita el tenantId, esperamos a que se resuelva
    const setupRealtime = async () => {
      try {
        const tid = await getCurrentTenantId();
        const channel = subscribeToNotifications(tid, user.id, () => {
          queryClient.invalidateQueries({ queryKey: [QUERY_COUNT, user.id] });
          queryClient.invalidateQueries({ queryKey: [QUERY_UNREAD, user.id] });
        });
        return () => {
          channel.unsubscribe();
        };
      } catch {
        return () => {};
      }
    };

    let cleanup: (() => void) | undefined;
    setupRealtime().then((fn) => {
      cleanup = fn;
    });

    return () => {
      cleanup?.();
    };
  }, [user?.id, queryClient]);

  return { count, isLoading };
}

/**
 * Hook que provee la lista de notificaciones NO leídas.
 * Úsalo en NotificationsDrawer.
 */
export function useNotificacionesUnread(): {
  notifications: Notificacion[];
  isLoading: boolean;
  refetch: () => void;
} {
  const queryClient = useQueryClient();
  const user = authStore((state) => state.user);

  const { data: notifications = [], isLoading, refetch } = useQuery<Notificacion[]>({
    queryKey: [QUERY_UNREAD, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const tenantId = await getCurrentTenantId();
      return getUnreadNotifications(tenantId, user.id);
    },
    enabled: !!user?.id,
    staleTime: 0,
  });

  return { notifications, isLoading, refetch: () => refetch() };
}

/**
 * Hook que provee el historial completo de notificaciones.
 * Úsalo en la página /notifications.
 */
export function useNotificacionesAll(): {
  notifications: Notificacion[];
  isLoading: boolean;
} {
  const user = authStore((state) => state.user);

  const { data: notifications = [], isLoading } = useQuery<Notificacion[]>({
    queryKey: [QUERY_ALL, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const tenantId = await getCurrentTenantId();
      return getAllNotifications(tenantId, user.id);
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  return { notifications, isLoading };
}
