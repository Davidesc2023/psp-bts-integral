import React from 'react';
import {
  Box,
  Typography,
  Drawer,
  IconButton,
  Avatar,
  Button,
  Tooltip,
  Badge,
  CircularProgress,
} from '@mui/material';
import {
  Close,
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
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { useNotificacionesUnread } from '@/hooks/useNotificaciones';
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
  if (diffH < 24) return `Hace ${diffH} hora${diffH > 1 ? 's' : ''}`;
  if (diffD === 1) return 'Ayer';
  return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' });
}


interface NotificationsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  open,
  onClose,
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = authStore((state) => state.user);
  const { notifications, isLoading } = useNotificacionesUnread();

  const noLeidas = notifications.length;

  const handleMarcarLeida = async (notif: Notificacion) => {
    try {
      await svcMarcarLeida(notif.id);
      queryClient.invalidateQueries({ queryKey: ['notifications-count', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications-unread', user?.id] });
    } catch {
      toast.error('No se pudo marcar como leída');
    }
  };

  const handleClickNotif = async (notif: Notificacion) => {
    await handleMarcarLeida(notif);
    onClose();
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
      toast.success('Todas las notificaciones marcadas como leídas');
    } catch {
      toast.error('No se pudo completar la acción');
    }
  };


  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        sx: {
          width: 380,
          backgroundColor: '#F7F8FA',
          border: 'none',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        },
      }}
    >
      {/* Header */}
      <Box
        sx={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E5E7EB',
          px: 2,
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 1,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Badge
            badgeContent={noLeidas}
            color="error"
            sx={{
              '& .MuiBadge-badge': {
                fontSize: '0.65rem',
                fontWeight: 700,
                minWidth: 18,
                height: 18,
              },
            }}
          >
            <NotificationsNone sx={{ color: '#0E7490', fontSize: 24 }} />
          </Badge>
          <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1rem' }}>
            Notificaciones
            {noLeidas > 0 && (
              <Typography
                component="span"
                variant="caption"
                sx={{
                  ml: 1,
                  backgroundColor: '#FEE2E2',
                  color: '#DC2626',
                  borderRadius: '10px',
                  px: 0.8,
                  py: 0.2,
                  fontWeight: 700,
                }}
              >
                {noLeidas} nuevas
              </Typography>
            )}
          </Typography>
        </Box>
        <Tooltip title="Cerrar">
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: '#6B7280',
              '&:hover': { backgroundColor: '#F3F4F6' },
            }}
          >
            <Close fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Lista de notificaciones */}
      <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1.5 }}>
        {isLoading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={28} sx={{ color: '#0E7490' }} />
          </Box>
        )}
        {!isLoading && notifications.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 6, color: '#9CA3AF' }}>
            <NotificationsNone sx={{ fontSize: 48, mb: 1, opacity: 0.4 }} />
            <Typography variant="body2" fontWeight={500}>Sin notificaciones pendientes</Typography>
          </Box>
        )}
        <AnimatePresence>
          {notifications.map((notif, index) => {
            const cfg = NOTIF_UI_CONFIG[notif.tipo] ?? NOTIF_UI_CONFIG['SEGUIMIENTO_PROXIMO'];
            return (
              <motion.div
                key={notif.id}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 30 }}
                transition={{ duration: 0.25, delay: index * 0.05 }}
              >
                <Box
                  sx={{
                    backgroundColor: notif.leida ? '#FFFFFF' : '#FAFEFF',
                    border: `1px solid ${notif.leida ? '#E5E7EB' : cfg.borderColor}`,
                    borderRadius: '12px',
                    p: 1.5,
                    mb: 1,
                    position: 'relative',
                    transition: 'all 0.2s',
                    '&:hover': {
                      boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                    },
                  }}
                >
                  {/* Unread dot */}
                  {!notif.leida && (
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 12,
                        right: 12,
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        backgroundColor: '#0E7490',
                      }}
                    />
                  )}

                  <Box
                    onClick={() => handleClickNotif(notif)}
                    sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start', cursor: 'pointer' }}
                  >
                    {/* Icon avatar */}
                    <Avatar
                      sx={{
                        backgroundColor: cfg.bg,
                        color: cfg.color,
                        width: 38,
                        height: 38,
                        flexShrink: 0,
                      }}
                    >
                      {React.cloneElement(getNotifIcon(notif.tipo) as React.ReactElement, {
                        sx: { fontSize: 18 },
                      })}
                    </Avatar>

                    {/* Content */}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box
                        sx={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 0.5,
                          mb: 0.3,
                        }}
                      >
                        <Box
                          sx={{
                            backgroundColor: cfg.bg,
                            color: cfg.color,
                            borderRadius: '6px',
                            px: 0.8,
                            py: 0.15,
                            fontSize: '0.65rem',
                            fontWeight: 700,
                          }}
                        >
                          {cfg.label}
                        </Box>
                      </Box>
                      <Typography
                        variant="body2"
                        fontWeight={notif.leida ? 500 : 700}
                        sx={{
                          color: '#111827',
                          fontSize: '0.82rem',
                          lineHeight: 1.3,
                          mb: 0.4,
                        }}
                      >
                        {notif.titulo}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: 'block',
                          lineHeight: 1.4,
                          fontSize: '0.75rem',
                          mb: 0.8,
                        }}
                      >
                        {notif.mensaje ?? ''}
                      </Typography>

                      <Box
                        sx={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                        }}
                      >
                        <Typography
                          variant="caption"
                          sx={{ color: '#9CA3AF', fontSize: '0.7rem' }}
                        >
                          {formatTimestamp(notif.created_at)}
                        </Typography>
                        <Button
                          size="small"
                          sx={{
                            fontSize: '0.68rem',
                            textTransform: 'none',
                            color: '#0E7490',
                            py: 0,
                            px: 1,
                            minWidth: 'auto',
                            '&:hover': { backgroundColor: '#E0F2FE' },
                          }}
                          onClick={(e) => { e.stopPropagation(); handleMarcarLeida(notif); }}
                        >
                          Marcar leída
                        </Button>
                      </Box>
                    </Box>
                  </Box>
                </Box>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </Box>

      {/* Footer */}
      <Box
        sx={{
          backgroundColor: '#FFFFFF',
          borderTop: '1px solid #E5E7EB',
          px: 2,
          py: 1.5,
          display: 'flex',
          gap: 1,
          position: 'sticky',
          bottom: 0,
        }}
      >
        <Button
          fullWidth
          variant="outlined"
          startIcon={<MarkEmailRead />}
          size="small"
          sx={{
            borderRadius: '8px',
            textTransform: 'none',
            fontSize: '0.78rem',
            borderColor: '#E5E7EB',
            color: '#374151',
            '&:hover': { borderColor: '#0E7490', color: '#0E7490' },
          }}
          onClick={handleMarcarTodasLeidas}
          disabled={noLeidas === 0}
        >
          Marcar todas
        </Button>
        <Button
          fullWidth
          variant="contained"
          size="small"
          sx={{
            borderRadius: '8px',
            textTransform: 'none',
            fontSize: '0.78rem',
            backgroundColor: '#0E7490',
            '&:hover': { backgroundColor: '#0c6680' },
          }}
          onClick={() => {
            onClose();
            navigate('/notifications');
          }}
        >
          Ver todas
        </Button>
      </Box>
    </Drawer>
  );
};
