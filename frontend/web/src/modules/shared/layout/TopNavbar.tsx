import React from 'react';
import {
  AppBar,
  Toolbar,
  Box,
  Button,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Typography,
  Divider,
  Badge,
} from '@mui/material';
import {
  Dashboard,
  People,
  Assignment,
  Block,
  LocalHospital,
  Medication,
  CalendarMonth,
  LocalShipping,
  BarChart,
  Notifications,
  Settings,
  Logout,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { authStore } from '@/stores/auth.store';

interface NavItem {
  text: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
}

export const TopNavbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = authStore((state) => state.user);
  const logout = authStore((state) => state.logout);
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const navItems: NavItem[] = [
    { text: 'Dashboard', icon: <Dashboard sx={{ fontSize: 20 }} />, path: '/dashboard' },
    { text: 'Pacientes', icon: <People sx={{ fontSize: 20 }} />, path: '/patients', badge: 12 },
    { text: 'Seguimientos', icon: <Assignment sx={{ fontSize: 20 }} />, path: '/followups' },
    { text: 'Barreras', icon: <Block sx={{ fontSize: 20 }} />, path: '/barriers', badge: 5 },
    { text: 'Paraclínicos', icon: <LocalHospital sx={{ fontSize: 20 }} />, path: '/diagnostics' },
    { text: 'Prescripciones', icon: <Medication sx={{ fontSize: 20 }} />, path: '/prescriptions' },
    { text: 'Aplicaciones', icon: <CalendarMonth sx={{ fontSize: 20 }} />, path: '/applications' },
    { text: 'Entregas', icon: <LocalShipping sx={{ fontSize: 20 }} />, path: '/deliveries' },
    { text: 'Reportes', icon: <BarChart sx={{ fontSize: 20 }} />, path: '/reports' },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleMenuClose();
  };

  return (
    <AppBar
      position="sticky"
      elevation={0}
      sx={{
        backgroundColor: '#FFFFFF',
        color: '#111827',
        borderBottom: '1px solid #E5E7EB',
        zIndex: 1300,
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', px: 3, minHeight: '64px' }}>
        {/* Logo / Brand */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              cursor: 'pointer',
            }}
            onClick={() => navigate('/dashboard')}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontWeight: 700,
                fontSize: '16px',
              }}
            >
              PS
            </Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                fontSize: '18px',
                color: '#111827',
                letterSpacing: '-0.5px',
              }}
            >
              PSP • Integral
            </Typography>
          </Box>

          <Divider orientation="vertical" flexItem sx={{ mx: 1, borderColor: '#E5E7EB' }} />

          {/* Navigation Items */}
          <Box sx={{ display: 'flex', gap: 0.5 }}>
            {navItems.map((item) => (
              <Button
                key={item.path}
                onClick={() => navigate(item.path)}
                startIcon={item.icon}
                sx={{
                  color: isActive(item.path) ? '#4F46E5' : '#6B7280',
                  backgroundColor: isActive(item.path) ? 'rgba(79, 70, 229, 0.08)' : 'transparent',
                  fontWeight: isActive(item.path) ? 600 : 500,
                  fontSize: '14px',
                  textTransform: 'none',
                  px: 2,
                  py: 1,
                  borderRadius: '8px',
                  minWidth: 'auto',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    backgroundColor: isActive(item.path)
                      ? 'rgba(79, 70, 229, 0.12)'
                      : 'rgba(107, 114, 128, 0.08)',
                    color: isActive(item.path) ? '#4F46E5' : '#111827',
                  },
                  '&::after': isActive(item.path)
                    ? {
                        content: '""',
                        position: 'absolute',
                        bottom: 0,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '60%',
                        height: '3px',
                        background: 'linear-gradient(90deg, #4F46E5 0%, #06B6D4 100%)',
                        borderRadius: '3px 3px 0 0',
                      }
                    : {},
                }}
              >
                {item.badge ? (
                  <Badge
                    badgeContent={item.badge}
                    color="error"
                    sx={{
                      '& .MuiBadge-badge': {
                        fontSize: '10px',
                        height: '18px',
                        minWidth: '18px',
                        fontWeight: 600,
                      },
                    }}
                  >
                    {item.text}
                  </Badge>
                ) : (
                  item.text
                )}
              </Button>
            ))}
          </Box>
        </Box>

        {/* Right Section */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {/* Notifications */}
          <IconButton
            sx={{
              color: '#6B7280',
              '&:hover': { backgroundColor: 'rgba(107, 114, 128, 0.08)' },
            }}
          >
            <Badge badgeContent={3} color="error">
              <Notifications />
            </Badge>
          </IconButton>

          {/* Settings */}
          <IconButton
            sx={{
              color: '#6B7280',
              '&:hover': { backgroundColor: 'rgba(107, 114, 128, 0.08)' },
            }}
          >
            <Settings />
          </IconButton>

          {/* User Avatar */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              cursor: 'pointer',
              px: 1.5,
              py: 0.5,
              borderRadius: '8px',
              transition: 'background-color 0.2s',
              '&:hover': {
                backgroundColor: 'rgba(107, 114, 128, 0.08)',
              },
            }}
            onClick={handleProfileMenuOpen}
          >
            <Box sx={{ textAlign: 'right' }}>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#111827', fontSize: '14px' }}>
                {user?.nombre || 'Usuario'}
              </Typography>
              <Typography variant="caption" sx={{ color: '#6B7280', fontSize: '12px' }}>
                {user?.role || 'Educador'}
              </Typography>
            </Box>
            <Avatar
              sx={{
                width: 36,
                height: 36,
                background: 'linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)',
                fontWeight: 600,
                fontSize: '14px',
              }}
            >
              {user?.nombre?.charAt(0) || 'U'}
            </Avatar>
          </Box>

          {/* User Menu */}
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            PaperProps={{
              sx: {
                mt: 1.5,
                minWidth: 200,
                borderRadius: '12px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
              },
            }}
          >
            <MenuItem onClick={handleMenuClose} sx={{ py: 1.5 }}>
              <Settings sx={{ mr: 2, fontSize: 20, color: '#6B7280' }} />
              Configuración
            </MenuItem>
            <Divider sx={{ my: 1 }} />
            <MenuItem onClick={handleLogout} sx={{ py: 1.5, color: '#EF4444' }}>
              <Logout sx={{ mr: 2, fontSize: 20 }} />
              Cerrar Sesión
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};
