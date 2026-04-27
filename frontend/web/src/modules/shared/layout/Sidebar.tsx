import React, { useState } from 'react';
import {
  Drawer,
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  Typography,
  Divider,
  Badge,
  IconButton,
  Tooltip,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/services/supabaseClient';
import {
  Dashboard,
  People,
  Assignment,
  Block,
  LocalHospital,
  Medication,
  CalendarMonth,
  LocalShipping,
  Notifications,
  Settings,
  Logout,
  ChevronLeft,
  Menu as MenuIcon,
  Science,
  Inventory2,
  DirectionsCar,
  MedicalServices,
  Assessment,
  CheckBox,
  AdminPanelSettings,
  ReceiptLong,
  Handshake,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { authStore } from '@/stores/auth.store';
import { NotificationsDrawer } from '@modules/shared/components/NotificationsDrawer';
import { useUnreadCount } from '@/hooks/useNotificaciones';

const DRAWER_WIDTH = 260;
const DRAWER_WIDTH_COLLAPSED = 72;

interface NavItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
  /** If defined, only users with one of these roles see the item. Undefined = visible to all. */
  roles?: string[];
}

interface SidebarProps {
  open?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ open: externalOpen }) => {
  const [open, setOpen] = useState(externalOpen ?? true);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = authStore((state) => state.user);
  const logout = authStore((state) => state.logout);
  const { count: unreadCount } = useUnreadCount();

  // Conteos dinámicos para badges
  const { data: patientsCount } = useQuery({
    queryKey: ['sidebar-patients-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('patients')
        .select('*', { count: 'exact', head: true })
        .or('deleted.is.null,deleted.eq.false');
      return count ?? 0;
    },
    staleTime: 30000,
  });
  const { data: barriersCount } = useQuery({
    queryKey: ['sidebar-barriers-count'],
    queryFn: async () => {
      const { count } = await supabase
        .from('barriers')
        .select('*', { count: 'exact', head: true })
        .in('status', ['ABIERTA', 'EN_PROCESO']);
      return count ?? 0;
    },
    staleTime: 30000,
  });

  // Roles with full access (no nav filtering needed)
  const FULL_ACCESS_ROLES = ['SUPER_ADMIN', 'ADMIN_INSTITUCION', 'MEDICO', 'ENFERMERIA', 'COORDINADOR', 'FARMACEUTICA', 'AUDITOR'];
  // EDUCADORA: patient-facing clinical follow-up modules only
  const EDUCADORA_ALLOWED = ['EDUCADORA'];
  // MSL: analytics and reporting only
  const MSL_ALLOWED = ['MSL'];

  const navItems: NavItem[] = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
    { text: 'Pacientes', icon: <People />, path: '/patients', badge: patientsCount || undefined },
    { text: 'Seguimientos', icon: <Assignment />, path: '/followups' },
    { text: 'Barreras', icon: <Block />, path: '/barriers', badge: barriersCount || undefined, roles: [...FULL_ACCESS_ROLES, ...EDUCADORA_ALLOWED] },
    { text: 'Paraclínicos', icon: <Science />, path: '/diagnostics', roles: FULL_ACCESS_ROLES },
    { text: 'Prescripciones', icon: <Medication />, path: '/prescriptions', roles: FULL_ACCESS_ROLES },
    { text: 'Aplicaciones', icon: <CalendarMonth />, path: '/applications', roles: [...FULL_ACCESS_ROLES, ...EDUCADORA_ALLOWED] },
    { text: 'Entregas', icon: <LocalShipping />, path: '/deliveries', roles: [...FULL_ACCESS_ROLES, ...EDUCADORA_ALLOWED] },
    { text: 'Transportes', icon: <DirectionsCar />, path: '/transport', roles: [...FULL_ACCESS_ROLES, ...EDUCADORA_ALLOWED] },
    { text: 'Inventario', icon: <Inventory2 />, path: '/inventory', roles: FULL_ACCESS_ROLES },
    { text: 'Serv. Especiales', icon: <MedicalServices />, path: '/special-services', roles: FULL_ACCESS_ROLES },
    { text: 'Consultas Médicas', icon: <LocalHospital />, path: '/consultas', roles: FULL_ACCESS_ROLES },
    { text: 'Consentimientos', icon: <Handshake />, path: '/consents', roles: [...FULL_ACCESS_ROLES, ...MSL_ALLOWED] },
    { text: 'Reportes', icon: <Assessment />, path: '/reports', roles: [...FULL_ACCESS_ROLES, ...MSL_ALLOWED] },
  ];

  const visibleNavItems = navItems.filter(
    (item) => !item.roles || !user?.role || item.roles.includes(user.role)
  );

  const isAdminUser =
    user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN_INSTITUCION';

  const isActive = (path: string) => location.pathname === path;

  const toggleDrawer = () => {
    setOpen(!open);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: open ? DRAWER_WIDTH : DRAWER_WIDTH_COLLAPSED,
          boxSizing: 'border-box',
          borderRight: '1px solid #E5E7EB',
          backgroundColor: '#FFFFFF',
          transition: 'width 0.3s ease-in-out',
          overflowX: 'hidden',
        },
      }}
    >
      {/* Logo Section */}
      <Box
        sx={{
          p: open ? 2.5 : 1.5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: open ? 'space-between' : 'center',
          minHeight: 76,
          borderBottom: '1px solid #E5E7EB',
        }}
      >
        {open ? (
          <>
            {/* Logo BTS Integral */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {/* Logo Icon - Círculo teal con puntos de conexión */}
              <Box
                sx={{
                  width: 40,
                  height: 40,
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {/* Centro amarillo */}
                <Box
                  sx={{
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    backgroundColor: '#FCD34D',
                    position: 'relative',
                    zIndex: 2,
                  }}
                />
                {/* Puntos de conexión teal */}
                {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
                  <Box
                    key={i}
                    sx={{
                      position: 'absolute',
                      width: i % 2 === 0 ? 8 : 5,
                      height: i % 2 === 0 ? 8 : 5,
                      borderRadius: '50%',
                      backgroundColor: '#0E7490',
                      top: '50%',
                      left: '50%',
                      transform: `translate(-50%, -50%) translate(${
                        Math.cos((angle * Math.PI) / 180) * 16
                      }px, ${Math.sin((angle * Math.PI) / 180) * 16}px)`,
                    }}
                  />
                ))}
              </Box>
              {/* Texto BTS */}
              <Box>
                <Typography
                  sx={{
                    fontWeight: 800,
                    fontSize: '18px',
                    color: '#0E7490',
                    letterSpacing: '-0.5px',
                    lineHeight: 1,
                  }}
                >
                  BTS
                </Typography>
                <Typography
                  sx={{
                    fontWeight: 500,
                    fontSize: '11px',
                    color: '#0369A1',
                    letterSpacing: '0.5px',
                    textTransform: 'uppercase',
                    lineHeight: 1,
                    mt: 0.3,
                  }}
                >
                  INTEGRAL
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={toggleDrawer} size="small">
              <ChevronLeft />
            </IconButton>
          </>
        ) : (
          <IconButton onClick={toggleDrawer} size="small">
            <MenuIcon />
          </IconButton>
        )}
      </Box>

      {/* Navigation Items */}
      <List sx={{ flexGrow: 1, px: 1, py: 2 }}>
        {visibleNavItems.map((item) => (
          <Tooltip
            key={item.path}
            title={!open ? item.text : ''}
            placement="right"
            arrow
          >
            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => navigate(item.path)}
                selected={isActive(item.path)}
                sx={{
                  borderRadius: '8px',
                  minHeight: 48,
                  justifyContent: open ? 'initial' : 'center',
                  px: open ? 2 : 1.5,
                  backgroundColor: isActive(item.path)
                    ? 'rgba(6, 182, 212, 0.08)'
                    : 'transparent',
                  color: isActive(item.path) ? '#0E7490' : '#6B7280',
                  '&:hover': {
                    backgroundColor: isActive(item.path)
                      ? 'rgba(6, 182, 212, 0.12)'
                      : 'rgba(107, 114, 128, 0.08)',
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(6, 182, 212, 0.08)',
                    borderLeft: '3px solid #06B6D4',
                    '&:hover': {
                      backgroundColor: 'rgba(6, 182, 212, 0.12)',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 0,
                    mr: open ? 2 : 'auto',
                    justifyContent: 'center',
                    color: isActive(item.path) ? '#0E7490' : '#6B7280',
                  }}
                >
                  {item.badge ? (
                    <Badge
                      badgeContent={item.badge}
                      color="error"
                      sx={{
                        '& .MuiBadge-badge': {
                          fontSize: '9px',
                          height: '16px',
                          minWidth: '16px',
                          fontWeight: 600,
                        },
                      }}
                    >
                      {item.icon}
                    </Badge>
                  ) : (
                    item.icon
                  )}
                </ListItemIcon>
                {open && (
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: '14px',
                      fontWeight: isActive(item.path) ? 600 : 500,
                    }}
                  />
                )}
              </ListItemButton>
            </ListItem>
          </Tooltip>
        ))}
      </List>

      <Divider />

      {/* Admin Panel — visible only for SUPER_ADMIN and ADMIN_INSTITUCION */}
      {isAdminUser && (
        <Box sx={{ px: 1, py: 1 }}>
          <Tooltip title={!open ? 'Panel Admin' : ''} placement="right" arrow>
            <ListItemButton
              onClick={() => navigate('/admin')}
              selected={location.pathname.startsWith('/admin')}
              sx={{
                borderRadius: '8px',
                minHeight: 48,
                justifyContent: open ? 'initial' : 'center',
                px: open ? 2 : 1.5,
                backgroundColor: location.pathname.startsWith('/admin')
                  ? 'rgba(6, 182, 212, 0.08)'
                  : 'transparent',
                color: location.pathname.startsWith('/admin') ? '#0E7490' : '#6B7280',
                '&:hover': {
                  backgroundColor: 'rgba(6, 182, 212, 0.08)',
                },
                '&.Mui-selected': {
                  backgroundColor: 'rgba(6, 182, 212, 0.08)',
                  borderLeft: '3px solid #06B6D4',
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 0,
                  mr: open ? 2 : 'auto',
                  justifyContent: 'center',
                  color: location.pathname.startsWith('/admin') ? '#0E7490' : '#6B7280',
                }}
              >
                <AdminPanelSettings />
              </ListItemIcon>
              {open && (
                <ListItemText
                  primary="Panel Admin"
                  primaryTypographyProps={{
                    fontSize: '14px',
                    fontWeight: location.pathname.startsWith('/admin') ? 600 : 500,
                  }}
                />
              )}
            </ListItemButton>
          </Tooltip>
        </Box>
      )}

      <Divider />

      {/* Notifications */}
      <Box sx={{ px: 1, py: 1 }}>
        <Tooltip title={!open ? 'Notificaciones' : ''} placement="right" arrow>
          <ListItemButton
            onClick={() => setNotificationsOpen(true)}
            sx={{
              borderRadius: '8px',
              minHeight: 48,
              justifyContent: open ? 'initial' : 'center',
              px: open ? 2 : 1.5,
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 0,
                mr: open ? 2 : 'auto',
                justifyContent: 'center',
                color: '#6B7280',
              }}
            >
              <Badge badgeContent={unreadCount || 0} color="error" max={99} invisible={!unreadCount}>
                <Notifications />
              </Badge>
            </ListItemIcon>
            {open && (
              <ListItemText
                primary="Notificaciones"
                primaryTypographyProps={{ fontSize: '14px', fontWeight: 500 }}
              />
            )}
          </ListItemButton>
        </Tooltip>
      </Box>

      <NotificationsDrawer open={notificationsOpen} onClose={() => setNotificationsOpen(false)} />

      <Divider />

      {/* User Section */}
      <Box
        sx={{
          p: open ? 2 : 1,
          borderTop: '1px solid #E5E7EB',
        }}
      >
        {open ? (
          <Box>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                mb: 1.5,
                px: 1,
              }}
            >
              <Avatar
                sx={{
                  width: 36,
                  height: 36,
                  background: 'linear-gradient(135deg, #0E7490 0%, #06B6D4 100%)',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                {user?.nombre?.charAt(0) || 'U'}
              </Avatar>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: 600,
                    color: '#111827',
                    fontSize: '13px',
                    lineHeight: 1.2,
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  {user?.nombre || 'Usuario'}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: '#6B7280',
                    fontSize: '11px',
                    lineHeight: 1.2,
                  }}
                >
                  {user?.role || 'Educador'}
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Configuración" arrow>
                <IconButton
                  size="small"
                  onClick={() => navigate('/settings')}
                  sx={{
                    flex: 1,
                    borderRadius: '6px',
                    color: '#6B7280',
                    '&:hover': { backgroundColor: 'rgba(107, 114, 128, 0.08)' },
                  }}
                >
                  <Settings fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Cerrar Sesión" arrow>
                <IconButton
                  onClick={handleLogout}
                  size="small"
                  sx={{
                    flex: 1,
                    borderRadius: '6px',
                    color: '#EF4444',
                    '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.08)' },
                  }}
                >
                  <Logout fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Tooltip title={user?.nombre || 'Usuario'} placement="right" arrow>
              <Avatar
                sx={{
                  width: 40,
                  height: 40,
                  margin: '0 auto',
                  background: 'linear-gradient(135deg, #0E7490 0%, #06B6D4 100%)',
                  fontWeight: 600,
                  fontSize: '14px',
                }}
              >
                {user?.nombre?.charAt(0) || 'U'}
              </Avatar>
            </Tooltip>
            <Tooltip title="Cerrar Sesión" placement="right" arrow>
              <IconButton
                onClick={handleLogout}
                size="small"
                sx={{
                  color: '#EF4444',
                  '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.08)' },
                }}
              >
                <Logout fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};
