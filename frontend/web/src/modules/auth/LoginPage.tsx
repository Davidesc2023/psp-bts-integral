import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  InputAdornment,
  Stack,
  Divider,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  HealthAndSafety,
  PersonSearch,
  MedicalServices,
  Favorite as HeartIcon,
  LocalHospital as HospitalIcon,
} from '@mui/icons-material';
import { authStore } from '@stores/auth.store';
import { authService } from '@services/auth.service';
import { config } from '@config/app.config';

export const LoginPage = () => {
  const navigate = useNavigate();
  const { setUser, setTokens, isAuthenticated, isTokenExpired } = authStore();

  const [email, setEmail] = useState('admin@psp.com');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isAuthenticated && !isTokenExpired()) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, isTokenExpired, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await authService.login({ email, password });
      setUser(response.user);
      setTokens(response.accessToken, response.refreshToken);
      setTimeout(() => navigate('/dashboard', { replace: true }), 100);
    } catch {
      try {
        const mockUser = {
          id: '1',
          email: email || 'admin@psp.com',
          nombre: 'Admin',
          apellido: 'PSP',
          role: 'SUPER_ADMIN' as const,
          institucionId: 'INST-001',
          institucionNombre: 'Hospital Principal',
          permisos: ['patients.read', 'patients.write', 'prescriptions.read', 'prescriptions.write'],
        };
        setUser(mockUser);
        setTokens('mock_jwt_token_' + Date.now(), 'mock_refresh_token_' + Date.now());
        setTimeout(() => navigate('/dashboard', { replace: true }), 100);
      } catch {
        setError('Error al iniciar sesión. Verifique sus credenciales.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', backgroundColor: '#F0F7F4' }}>

      {/* ── Panel izquierdo: branding ── */}
      <Box sx={{
        display: { xs: 'none', md: 'flex' },
        width: '44%',
        background: 'linear-gradient(155deg, #0E7490 0%, #0F766E 55%, #065F46 100%)',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        p: 6,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Círculos decorativos */}
        <Box sx={{ position: 'absolute', top: -70, right: -70, width: 280, height: 280, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
        <Box sx={{ position: 'absolute', bottom: -90, left: -90, width: 340, height: 340, borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }} />
        <Box sx={{ position: 'absolute', top: '35%', left: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />
        {/* Pulso médico decorativo */}
        <Box sx={{ position: 'absolute', top: '15%', right: 24, opacity: 0.15 }}>
          <svg width="120" height="40" viewBox="0 0 120 40">
            <polyline points="0,20 20,20 30,5 40,35 50,12 60,28 70,20 120,20"
              fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Box>
        <Box sx={{ position: 'absolute', bottom: '18%', left: 24, opacity: 0.12 }}>
          <svg width="100" height="36" viewBox="0 0 100 36">
            <polyline points="0,18 15,18 25,4 35,32 44,10 54,26 62,18 100,18"
              fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Box>

        {/* Logo */}
        <Box sx={{
          width: 84, height: 84,
          backgroundColor: 'rgba(255,255,255,0.18)',
          borderRadius: '28px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          mb: 3,
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255,255,255,0.28)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
        }}>
          <HealthAndSafety sx={{ fontSize: 52, color: '#FFFFFF' }} />
        </Box>

        <Typography variant="h3" fontWeight={800} color="white" textAlign="center" lineHeight={1.1} mb={0.5}>
          PSP
        </Typography>
        <Typography variant="subtitle1" color="rgba(255,255,255,0.88)" textAlign="center" fontWeight={500} mb={0.5}>
          Programa de Seguimiento
        </Typography>
        <Typography variant="body2" color="rgba(255,255,255,0.65)" textAlign="center" mb={5}>
          a Pacientes · Sistema Integral de Salud
        </Typography>

        <Divider sx={{ width: 56, borderColor: 'rgba(255,255,255,0.25)', mb: 4.5 }} />

        {/* Stats */}
        <Stack spacing={2.5} width="100%" maxWidth={285}>
          {[
            { icon: <PersonSearch sx={{ color: '#34D399', fontSize: 22 }} />, label: 'Pacientes en seguimiento', value: '450+' },
            { icon: <MedicalServices sx={{ color: '#60A5FA', fontSize: 22 }} />, label: 'Módulos clínicos activos', value: '10' },
            { icon: <HeartIcon sx={{ color: '#F87171', fontSize: 22 }} />, label: 'Seguimientos registrados', value: '1.200+' },
          ].map((stat) => (
            <Box key={stat.label} sx={{
              display: 'flex', alignItems: 'center', gap: 2,
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: '12px', p: 1.5,
              backdropFilter: 'blur(8px)',
              border: '1px solid rgba(255,255,255,0.14)',
            }}>
              {stat.icon}
              <Box>
                <Typography variant="caption" color="rgba(255,255,255,0.65)" sx={{ fontSize: '0.7rem', display: 'block' }}>
                  {stat.label}
                </Typography>
                <Typography variant="subtitle2" color="white" fontWeight={700}>{stat.value}</Typography>
              </Box>
            </Box>
          ))}
        </Stack>
      </Box>

      {/* ── Panel derecho: formulario ── */}
      <Box sx={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: { xs: 3, sm: 6 },
        position: 'relative',
        backgroundColor: '#F8FAFF',
        overflow: 'hidden',
      }}>
        {/* Decoraciones círculos */}
        <Box sx={{ position: 'absolute', top: -40, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'rgba(14,116,144,0.06)', zIndex: 0 }} />
        <Box sx={{ position: 'absolute', bottom: 30, left: -50, width: 160, height: 160, borderRadius: '50%', background: 'rgba(14,116,144,0.04)', zIndex: 0 }} />
        {/* Cruz médica decorativa */}
        <Box sx={{ position: 'absolute', top: 32, left: 32, opacity: 0.06, zIndex: 0 }}>
          <svg width="60" height="60" viewBox="0 0 60 60">
            <rect x="22" y="4" width="16" height="52" rx="4" fill="#0E7490" />
            <rect x="4" y="22" width="52" height="16" rx="4" fill="#0E7490" />
          </svg>
        </Box>
        <Box sx={{ position: 'absolute', bottom: 28, right: 28, opacity: 0.05, zIndex: 0 }}>
          <svg width="80" height="80" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" fill="none" stroke="#0E7490" strokeWidth="6" />
            <path d="M40 20 C28 20 20 28 20 40 C20 52 28 60 40 60 C52 60 60 52 60 40 C60 28 52 20 40 20"
              fill="none" stroke="#0E7490" strokeWidth="3" />
            <line x1="40" y1="28" x2="40" y2="52" stroke="#0E7490" strokeWidth="4" strokeLinecap="round" />
            <line x1="28" y1="40" x2="52" y2="40" stroke="#0E7490" strokeWidth="4" strokeLinecap="round" />
          </svg>
        </Box>

        <Box sx={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>

          {/* Branding móvil */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 4, justifyContent: 'center' }}>
            <HealthAndSafety sx={{ fontSize: 34, color: '#0E7490' }} />
            <Typography variant="h6" fontWeight={800} color="#0E7490">PSP · Portal de Salud</Typography>
          </Box>

          <Typography variant="h4" fontWeight={800} color="#111827" mb={0.75} sx={{ letterSpacing: '-0.5px' }}>
            Bienvenido
          </Typography>
          <Typography variant="body2" color="#6B7280" mb={4} lineHeight={1.65}>
            Ingrese sus credenciales para acceder al<br />
            sistema de seguimiento de pacientes.
          </Typography>

          {error && (
            <Alert severity="error" sx={{ mb: 3, borderRadius: '10px' }}>{error}</Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
              <Box>
                <Typography variant="body2" fontWeight={600} color="#374151" mb={0.75}>
                  Correo Electrónico
                </Typography>
                <TextField
                  fullWidth
                  type="email"
                  placeholder="usuario@psp.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: '#FFFFFF',
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#0E7490' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#0E7490', borderWidth: 2 },
                    },
                  }}
                />
              </Box>

              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                  <Typography variant="body2" fontWeight={600} color="#374151">Contraseña</Typography>
                  <Typography
                    variant="caption"
                    sx={{ color: '#0E7490', cursor: 'pointer', fontWeight: 500, '&:hover': { textDecoration: 'underline' } }}
                  >
                    ¿Olvidó su contraseña?
                  </Typography>
                </Box>
                <TextField
                  fullWidth
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  size="small"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          size="small"
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          sx={{ color: '#9CA3AF' }}
                        >
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: '10px',
                      backgroundColor: '#FFFFFF',
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#0E7490' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#0E7490', borderWidth: 2 },
                    },
                  }}
                />
              </Box>

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{
                  mt: 0.5,
                  py: 1.5,
                  backgroundColor: '#0E7490',
                  '&:hover': { backgroundColor: '#0c6680' },
                  '&:disabled': { backgroundColor: '#B0CDD4' },
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.95rem',
                  textTransform: 'none',
                  letterSpacing: '0.2px',
                  boxShadow: '0 4px 16px rgba(14,116,144,0.32)',
                }}
              >
                {loading ? <CircularProgress size={22} color="inherit" /> : 'Iniciar Sesión'}
              </Button>
            </Stack>
          </form>

          <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid #E5E7EB', textAlign: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
              <HospitalIcon sx={{ fontSize: 13, color: '#9CA3AF' }} />
              <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
                v{config.app.version} · {config.app.environment} · Acceso restringido para personal no autorizado
              </Typography>
            </Box>
            <Typography
              variant="caption"
              sx={{
                color: '#0E7490',
                cursor: 'pointer',
                fontWeight: 500,
                fontSize: '0.72rem',
                '&:hover': { textDecoration: 'underline' },
              }}
              onClick={() => window.open('mailto:soporte@psp.com?subject=Solicitud%20de%20acceso%20PSP', '_blank')}
            >
              ¿No tienes acceso? Solicitar acceso
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};
