import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Avatar,
  Button,
  Chip,
  CircularProgress,
} from '@mui/material';
import {
  Warning,
  Info,
  NotificationsNone,
  MarkEmailRead,
  Error,
  CalendarToday,
  Science,
  Person,
  LocalShipping,
  AssignmentLate,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useNotificacionesAll } from '@/hooks/useNotificaciones';
import {
  marcarLeida as svcMarcarLeida,
  marcarTodasLeidas as svcMarcarTodasLeidas,
} from '@/services/notificacionesService';
import { getCurrentTenantId } from '@/utils/getCurrentTenant';
import { authStore } from '@/stores/auth.store';
import {
  NOTIF_UI_CONFIG,
  MODULO_FALLBACK_ROUTES,
  type Notificacion,
  type NotifTipo,
} from '@/types/notificaciones.types';

const NOTIF_ICONS: Record<string, React.ReactNode> = {
  warning: <Warning />,
  calendar: <CalendarToday />,
  info: <Info />,
  error: <Error />,
  science: <Science />,
  person: <Person />,
  delivery: <LocalShipping />,
  task: <AssignmentLate />,
};

function getNotifIcon(tipo: NotifTipo): React.ReactNode {
  const iconKey = NOTIF_UI_CONFIG[tipo]?.icon ?? 'info';
  return NOTIF_ICONS[iconKey] ?? <Info />;
}

function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffH = Math.floor(diffMs / 3600000);
  const diffD = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return 'Ahora';
  if (diffMin < 60) return `Hace ${diffMin} min`;
  if (diffH < 24) return `Hace ${diffH} h`;
  if (diffD === 1) return 'Ayer';
  if (diffD < 7) return `Hace ${diffD} días`;
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' });
}

type FilterTab = 'todas' | 'no_leidas' | 'leidas';

const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = authStore((state) => state.user);
  const { notifications, isLoading } = useNotificacionesAll();
  const [activeTab, setActiveTab] = useState<FilterTab>('todas');

  const filtered = useMemo(() => {
    if (activeTab === 'no_leidas') return notifications.filter((n) => !n.leida);
    if (activeTab === 'leidas') return notifications.filter((n) => n.leida);
    return notifications;
  }, [notifications, activeTab]);

  const noLeidasCount = useMemo(() => notifications.filter((n) => !n.leida).length, [notifications]);

  const handleMarcarLeida = async (notif: Notificacion) => {
    if (notif.leida) return;
    try {
      await svcMarcarLeida(notif.id);
      queryClient.invalidateQueries({ queryKey: ['notifications-count', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-all', user?.id] });
    } catch {
      toast.error('No se pudo marcar como leída');
    }
  };

  const handleClickNotif = async (notif: Notificacion) => {
    if (!notif.leida) await handleMarcarLeida(notif);
    if (notif.nav_url) {
      navigate(notif.nav_url);
    } else if (notif.modulo && MODULO_FALLBACK_ROUTES[notif.modulo]) {
      navigate(MODULO_FALLBACK_ROUTES[notif.modulo]);
    }
  };

  const handleMarcarTodasLeidas = async () => {
    if (!user?.id) return;
    try {
      const tenantId = await getCurrentTenantId();
      await svcMarcarTodasLeidas(tenantId, user.id);
      queryClient.invalidateQueries({ queryKey: ['notifications-count', user.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread', user.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-all', user.id] });
      toast.success('Todas las notificaciones marcadas como leídas');
    } catch {
      toast.error('No se pudo completar la acción');
    }
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 860, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ color: '#111827' }}>
            Notificaciones
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {noLeidasCount > 0
              ? `${noLeidasCount} sin leer`
              : 'Todo al día'}
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<MarkEmailRead />}
          size="small"
          onClick={handleMarcarTodasLeidas}
          disabled={noLeidasCount === 0}
          sx={{
            borderRadius: '8px',
            textTransform: 'none',
            borderColor: '#E5E7EB',
            color: '#374151',
            '&:hover': { borderColor: '#0E7490', color: '#0E7490' },
          }}
        >
          Marcar todas como leídas
        </Button>
      </Box>

      {/* Tabs */}
      <Paper
        elevation={0}
        sx={{ border: '1px solid #E5E7EB', borderRadius: '12px', overflow: 'hidden', mb: 3 }}
      >
        <Tabs
          value={activeTab}
          onChange={(_, v: FilterTab) => setActiveTab(v)}
          sx={{
            px: 2,
            borderBottom: '1px solid #E5E7EB',
            '& .MuiTab-root': { textTransform: 'none', fontSize: '0.85rem', fontWeight: 500, minHeight: 48 },
            '& .Mui-selected': { color: '#0E7490', fontWeight: 700 },
            '& .MuiTabs-indicator': { backgroundColor: '#0E7490' },
          }}
        >
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Todas
                <Chip label={notifications.length} size="small" sx={{ height: 18, fontSize: '0.65rem', backgroundColor: '#F3F4F6' }} />
              </Box>
            }
            value="todas"
          />
          <Tab
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                No leídas
                {noLeidasCount > 0 && (
                  <Chip label={noLeidasCount} size="small" sx={{ height: 18, fontSize: '0.65rem', backgroundColor: '#FEE2E2', color: '#DC2626', fontWeight: 700 }} />
                )}
              </Box>
            }
            value="no_leidas"
          />
          <Tab label="Leídas" value="leidas" />
        </Tabs>

        {/* Content */}
        <Box sx={{ p: 2 }}>
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={32} sx={{ color: '#0E7490' }} />
            </Box>
          )}
          {!isLoading && filtered.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8, color: '#9CA3AF' }}>
              <NotificationsNone sx={{ fontSize: 56, mb: 1.5, opacity: 0.35 }} />
              <Typography variant="body1" fontWeight={500}>Sin notificaciones</Typography>
              <Typography variant="body2" sx={{ mt: 0.5, fontSize: '0.82rem' }}>
                {activeTab === 'no_leidas' ? 'No tienes notificaciones pendientes' : 'No hay registros en este filtro'}
              </Typography>
            </Box>
          )}

          <AnimatePresence>
            {filtered.map((notif, index) => {
              const cfg = NOTIF_UI_CONFIG[notif.tipo] ?? NOTIF_UI_CONFIG['SEGUIMIENTO_PROXIMO'];
              return (
                <motion.div
                  key={notif.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2, delay: index * 0.03 }}
                >
                  <Box
                    onClick={() => handleClickNotif(notif)}
                    sx={{
                      backgroundColor: notif.leida ? '#FAFAFA' : '#FFFFFF',
                      border: `1px solid ${notif.leida ? '#E5E7EB' : cfg.borderColor}`,
                      borderRadius: '10px',
                      p: 2,
                      mb: 1.5,
                      cursor: notif.nav_url || notif.modulo ? 'pointer' : 'default',
                      position: 'relative',
                      transition: 'all 0.15s',
                      opacity: notif.leida ? 0.75 : 1,
                      '&:hover': {
                        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
                        opacity: 1,
                      },
                    }}
                  >
                    {!notif.leida && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 14,
                          right: 14,
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          backgroundColor: '#0E7490',
                        }}
                      />
                    )}

                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                      <Avatar
                        sx={{
                          backgroundColor: cfg.bg,
                          color: cfg.color,
                          width: 42,
                          height: 42,
                          flexShrink: 0,
                        }}
                      >
                        {React.cloneElement(getNotifIcon(notif.tipo) as React.ReactElement, {
                          sx: { fontSize: 20 },
                        })}
                      </Avatar>

                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                          <Box
                            sx={{
                              backgroundColor: cfg.bg,
                              color: cfg.color,
                              borderRadius: '6px',
                              px: 1,
                              py: 0.2,
                              fontSize: '0.65rem',
                              fontWeight: 700,
                            }}
                          >
                            {cfg.label}
                          </Box>
                          <Typography variant="caption" sx={{ color: '#9CA3AF', fontSize: '0.7rem', ml: 'auto' }}>
                            {formatTimestamp(notif.created_at)}
                          </Typography>
                        </Box>

                        <Typography
                          variant="body2"
                          fontWeight={notif.leida ? 400 : 700}
                          sx={{ color: '#111827', fontSize: '0.85rem', lineHeight: 1.35, mb: 0.4 }}
                        >
                          {notif.titulo}
                        </Typography>

                        {notif.mensaje && (
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ display: 'block', lineHeight: 1.45, fontSize: '0.78rem' }}
                          >
                            {notif.mensaje}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </Box>
      </Paper>
    </Box>
  );
};

export default NotificationsPage;
