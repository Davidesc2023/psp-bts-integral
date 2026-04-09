import React, { useState } from 'react';
import {
  Box,
  Typography,
  Drawer,
  IconButton,
  List,
  ListItem,
  Avatar,
  Button,
  Divider,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Close,
  Warning,
  Info,
  NotificationsNone,
  MarkEmailRead,
  Error,
  CalendarToday,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

type NotifTipo = 'ALERTA' | 'RECORDATORIO' | 'INFO' | 'TAREA';

interface Notificacion {
  id: number;
  tipo: NotifTipo;
  titulo: string;
  descripcion: string;
  timestamp: string;
  leida: boolean;
}

const notificacionesIniciales: Notificacion[] = [
  {
    id: 1,
    tipo: 'ALERTA',
    titulo: 'Resultado Crítico',
    descripcion: 'Paciente María González — Resultado crítico en hemograma (3.2 mil/µL)',
    timestamp: 'Hace 10 min',
    leida: false,
  },
  {
    id: 2,
    tipo: 'RECORDATORIO',
    titulo: 'Próxima Entrega de Medicamentos',
    descripcion: 'Pedro Ramírez — Entrega programada para mañana a las 10:00 am',
    timestamp: 'Hace 1 hora',
    leida: false,
  },
  {
    id: 3,
    tipo: 'INFO',
    titulo: 'Nuevo Seguimiento Registrado',
    descripcion: 'Juan López — Seguimiento de adherencia completado por Teresa Álvarez',
    timestamp: 'Hace 2 horas',
    leida: false,
  },
  {
    id: 4,
    tipo: 'TAREA',
    titulo: 'Tarea Pendiente Vence Hoy',
    descripcion: 'Educadora Teresa — Gestión de barrera económica pendiente de resolución',
    timestamp: 'Hace 3 horas',
    leida: true,
  },
  {
    id: 5,
    tipo: 'ALERTA',
    titulo: 'Stock Crítico de Medicamento',
    descripcion: 'Bevacizumab 400mg — Solo 3 unidades disponibles (mínimo: 10)',
    timestamp: 'Hace 5 horas',
    leida: true,
  },
  {
    id: 6,
    tipo: 'INFO',
    titulo: 'Sistema Actualizado',
    descripcion: 'PSP actualizado a la versión v2.1.0 con nuevas funcionalidades',
    timestamp: 'Ayer 18:00',
    leida: true,
  },
];

const tipoConfig: Record<
  NotifTipo,
  { color: string; bg: string; icon: React.ReactNode; borderColor: string }
> = {
  ALERTA: {
    color: '#DC2626',
    bg: '#FEE2E2',
    icon: <Error />,
    borderColor: '#FECACA',
  },
  RECORDATORIO: {
    color: '#D97706',
    bg: '#FEF3C7',
    icon: <CalendarToday />,
    borderColor: '#FDE68A',
  },
  INFO: {
    color: '#1D4ED8',
    bg: '#DBEAFE',
    icon: <Info />,
    borderColor: '#BFDBFE',
  },
  TAREA: {
    color: '#D97706',
    bg: '#FEF3C7',
    icon: <NotificationsNone />,
    borderColor: '#FDE68A',
  },
};

interface NotificationsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const NotificationsDrawer: React.FC<NotificationsDrawerProps> = ({
  open,
  onClose,
}) => {
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>(
    notificacionesIniciales
  );

  const noLeidas = notificaciones.filter((n) => !n.leida).length;

  const marcarLeida = (id: number) => {
    setNotificaciones((prev) =>
      prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
    );
  };

  const marcarTodasLeidas = () => {
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })));
    toast.success('Todas las notificaciones marcadas como leídas');
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
        <AnimatePresence>
          {notificaciones.map((notif, index) => {
            const cfg = tipoConfig[notif.tipo];
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

                  <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
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
                      {React.cloneElement(cfg.icon as React.ReactElement, {
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
                          {notif.tipo}
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
                        {notif.descripcion}
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
                          {notif.timestamp}
                        </Typography>
                        {!notif.leida && (
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
                            onClick={() => marcarLeida(notif.id)}
                          >
                            Marcar leída
                          </Button>
                        )}
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
          onClick={marcarTodasLeidas}
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
            toast('Módulo de notificaciones completo', { icon: '🔔' });
            onClose();
          }}
        >
          Ver todas
        </Button>
      </Box>
    </Drawer>
  );
};
