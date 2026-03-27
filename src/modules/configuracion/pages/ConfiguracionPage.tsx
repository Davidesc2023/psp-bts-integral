import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Switch,
  FormControlLabel,
  FormGroup,
  TextField,
  Chip,
  Button,
  Divider,
  Avatar,
  Snackbar,
  Alert,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Notifications as NotificationsIcon,
  Security as SecurityIcon,
  Tune as TuneIcon,
  Save as SaveIcon,
} from '@mui/icons-material';

const ACCENT = '#0E7490';

const sectionHeaderSx = {
  '& .MuiCardHeader-title': {
    fontWeight: 700,
    fontSize: '1.1rem',
    color: '#111827',
  },
  '& .MuiCardHeader-subheader': {
    fontSize: '0.85rem',
    color: '#6b7280',
  },
};

const cardSx = {
  borderRadius: 3,
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
  height: '100%',
};

const ConfiguracionPage: React.FC = () => {
  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    tareasVencidas: true,
    recordatorios: true,
  });

  const [snackbar, setSnackbar] = useState(false);

  const handleToggle = (key: keyof typeof notifications) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
  const entorno = import.meta.env.VITE_ENV || 'Desarrollo';

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1200, mx: 'auto' }}>
      <Typography variant="h4" sx={{ fontWeight: 800, color: '#111827', mb: 0.5 }}>
        Configuración del Sistema
      </Typography>
      <Typography variant="body2" sx={{ color: '#6b7280', mb: 4 }}>
        Parámetros generales, notificaciones y seguridad del PSP
      </Typography>

      <Grid container spacing={3}>
        {/* Información del Sistema */}
        <Grid item xs={12} md={6}>
          <Card sx={cardSx}>
            <CardHeader
              sx={sectionHeaderSx}
              avatar={
                <Avatar sx={{ bgcolor: `${ACCENT}14`, color: ACCENT }}>
                  <SettingsIcon />
                </Avatar>
              }
              title="Información del Sistema"
              subheader="Datos generales del programa"
            />
            <Divider />
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 3 }}>
              <InfoRow label="Nombre del sistema" value="PSP - Programa de Seguimiento a Pacientes" />
              <InfoRow label="Versión" value="1.0.0" />
              <InfoRow label="Entorno" value={entorno} />
              <InfoRow label="API Base URL" value={apiUrl} mono />
            </CardContent>
          </Card>
        </Grid>

        {/* Configuración de Notificaciones */}
        <Grid item xs={12} md={6}>
          <Card sx={cardSx}>
            <CardHeader
              sx={sectionHeaderSx}
              avatar={
                <Avatar sx={{ bgcolor: '#FFF7ED', color: '#EA580C' }}>
                  <NotificationsIcon />
                </Avatar>
              }
              title="Configuración de Notificaciones"
              subheader="Canales y alertas activas"
            />
            <Divider />
            <CardContent sx={{ pt: 2 }}>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={notifications.email}
                      onChange={() => handleToggle('email')}
                      sx={switchSx}
                    />
                  }
                  label="Notificaciones por email"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={notifications.push}
                      onChange={() => handleToggle('push')}
                      sx={switchSx}
                    />
                  }
                  label="Notificaciones push"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={notifications.tareasVencidas}
                      onChange={() => handleToggle('tareasVencidas')}
                      sx={switchSx}
                    />
                  }
                  label="Alertas de tareas vencidas"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={notifications.recordatorios}
                      onChange={() => handleToggle('recordatorios')}
                      sx={switchSx}
                    />
                  }
                  label="Recordatorios de seguimiento"
                />
              </FormGroup>
            </CardContent>
          </Card>
        </Grid>

        {/* Configuración del Programa */}
        <Grid item xs={12} md={6}>
          <Card sx={cardSx}>
            <CardHeader
              sx={sectionHeaderSx}
              avatar={
                <Avatar sx={{ bgcolor: '#EEF2FF', color: '#4F46E5' }}>
                  <TuneIcon />
                </Avatar>
              }
              title="Configuración del Programa"
              subheader="Parámetros operativos (solo lectura)"
            />
            <Divider />
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 3 }}>
              <TextField
                label="Días máximo sin seguimiento"
                type="number"
                value={30}
                disabled
                fullWidth
                size="small"
              />
              <TextField
                label="Días para alerta de barrera activa"
                type="number"
                value={15}
                disabled
                fullWidth
                size="small"
              />
              <TextField
                label="Máximo de intentos de contacto"
                type="number"
                value={5}
                disabled
                fullWidth
                size="small"
              />
            </CardContent>
          </Card>
        </Grid>

        {/* Seguridad y Datos */}
        <Grid item xs={12} md={6}>
          <Card sx={cardSx}>
            <CardHeader
              sx={sectionHeaderSx}
              avatar={
                <Avatar sx={{ bgcolor: '#ECFDF5', color: '#059669' }}>
                  <SecurityIcon />
                </Avatar>
              }
              title="Seguridad y Datos"
              subheader="Políticas de protección de información"
            />
            <Divider />
            <CardContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, pt: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2" sx={{ color: '#374151', fontWeight: 500 }}>
                  Anonimización automática en DROP_OUT
                </Typography>
                <Chip
                  label="Activo"
                  size="small"
                  sx={{
                    bgcolor: '#ECFDF5',
                    color: '#059669',
                    fontWeight: 600,
                    fontSize: '0.75rem',
                  }}
                />
              </Box>
              <InfoRow label="Política de retención de datos" value="5 años después de inactividad" />
              <InfoRow label="Nivel de cifrado" value="AES-256" />
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Guardar Cambios */}
      <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 4 }}>
        <Button
          variant="contained"
          startIcon={<SaveIcon />}
          disabled
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 2,
            px: 4,
            bgcolor: ACCENT,
            '&.Mui-disabled': {
              bgcolor: '#e5e7eb',
              color: '#9ca3af',
            },
          }}
        >
          Guardar Cambios
        </Button>
      </Box>

      <Snackbar
        open={snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnackbar(false)} severity="success" variant="filled" sx={{ width: '100%' }}>
          Configuración guardada correctamente
        </Alert>
      </Snackbar>
    </Box>
  );
};

/* ── helpers ───────────────────────────────────────────── */

interface InfoRowProps {
  label: string;
  value: string;
  mono?: boolean;
}

const InfoRow: React.FC<InfoRowProps> = ({ label, value, mono }) => (
  <Box>
    <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 500 }}>
      {label}
    </Typography>
    <Typography
      variant="body2"
      sx={{
        color: '#111827',
        fontWeight: 600,
        fontFamily: mono ? '"Fira Code", "Roboto Mono", monospace' : undefined,
        fontSize: mono ? '0.8rem' : undefined,
        mt: 0.25,
      }}
    >
      {value}
    </Typography>
  </Box>
);

const switchSx = {
  '& .MuiSwitch-switchBase.Mui-checked': {
    color: ACCENT,
  },
  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
    backgroundColor: ACCENT,
  },
};

export default ConfiguracionPage;
