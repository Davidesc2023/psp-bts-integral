import { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Description,
  Block,
  LocalShipping,
  Vaccines,
  Inventory2,
  MedicalServices,
  WarningAmber,
  CheckCircle,
  EventAvailable,
  Medication,
} from '@mui/icons-material';
import { patientService } from '@services/patient.service';

interface Patient360Data {
  prescripcionVigente: {
    id: number;
    estado: string;
    fecha_inicio: string;
    fecha_fin: string;
    nombre_medicamento: string;
    dias_tratamiento: number;
    fecha_vencimiento_prescripcion: string;
  } | null;
  barrerasAbiertas: number;
  diasEnBarrera: number;
  aplicacionesPendientes: number;
  proximaEntrega: string | null;
  diasMedicamento: number;
  tareasPendientesAlta: number;
  proximaConsulta: string | null;
  stockDisponible: number;
}

interface Patient360PanelProps {
  patientId: number;
}

const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return '—';
  try {
    return new Intl.DateTimeFormat('es-CO', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return '—';
  }
};

interface KpiCardProps {
  icon: React.ReactNode;
  title: string;
  value: React.ReactNode;
  subtitle?: string;
  accent: string;
  alert?: boolean;
}

const KpiCard = ({ icon, title, value, subtitle, accent, alert }: KpiCardProps) => {
  const theme = useTheme();
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        height: '100%',
        border: `1px solid ${alert ? theme.palette.error.light : '#e5e7eb'}`,
        borderLeft: `4px solid ${alert ? theme.palette.error.main : accent}`,
        borderRadius: 2,
        bgcolor: alert ? alpha(theme.palette.error.main, 0.04) : '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        gap: 1,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ color: alert ? theme.palette.error.main : accent, display: 'flex' }}>
          {icon}
        </Box>
        <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {title}
        </Typography>
      </Box>
      <Box>{value}</Box>
      {subtitle && (
        <Typography variant="caption" sx={{ color: '#9ca3af' }}>
          {subtitle}
        </Typography>
      )}
    </Paper>
  );
};

export const Patient360Panel = ({ patientId }: Patient360PanelProps) => {
  const theme = useTheme();
  const [data, setData] = useState<Patient360Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    patientService
      .get360(patientId)
      .then((result) => {
        if (!cancelled) setData(result as Patient360Data);
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setError(
            err instanceof Error ? err.message : 'Error al cargar la vista 360°'
          );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [patientId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!data) return null;

  const diasMedSafe = data.diasMedicamento ?? 0;
  const stockBajo = data.stockDisponible <= 5;
  const medicamentoUrgente = diasMedSafe <= 7 && diasMedSafe >= 0;

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827' }}>
          Vista 360° del Paciente
        </Typography>
        <Chip
          label="Tiempo real"
          size="small"
          sx={{ bgcolor: alpha(theme.palette.primary.main, 0.1), color: theme.palette.primary.main, fontWeight: 600 }}
        />
      </Box>

      <Grid container spacing={2}>
        {/* Prescripción vigente */}
        <Grid item xs={12} md={6} lg={4}>
          <KpiCard
            icon={<Description />}
            title="Prescripción vigente"
            accent={theme.palette.primary.main}
            alert={!data.prescripcionVigente}
            value={
              data.prescripcionVigente ? (
                <Box>
                  <Typography variant="body1" sx={{ fontWeight: 700, color: '#111827' }}>
                    {data.prescripcionVigente.nombre_medicamento}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>
                    {data.prescripcionVigente.dias_tratamiento} días · Vence:{' '}
                    {formatDate(data.prescripcionVigente.fecha_vencimiento_prescripcion)}
                  </Typography>
                </Box>
              ) : (
                <Typography variant="body2" sx={{ color: theme.palette.error.main, fontWeight: 600 }}>
                  Sin prescripción vigente
                </Typography>
              )
            }
            subtitle={
              data.prescripcionVigente
                ? `Fin tratamiento: ${formatDate(data.prescripcionVigente.fecha_fin)}`
                : 'Requiere atención inmediata'
            }
          />
        </Grid>

        {/* Barreras abiertas */}
        <Grid item xs={12} md={6} lg={4}>
          <KpiCard
            icon={<Block />}
            title="Barreras activas"
            accent="#f59e0b"
            alert={data.barrerasAbiertas > 0}
            value={
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: data.barrerasAbiertas > 0 ? theme.palette.error.main : theme.palette.success.main }}>
                  {data.barrerasAbiertas}
                </Typography>
                {data.barrerasAbiertas > 0 && (
                  <Typography variant="caption" sx={{ color: '#6b7280' }}>
                    barrera{data.barrerasAbiertas !== 1 ? 's' : ''} abierta{data.barrerasAbiertas !== 1 ? 's' : ''}
                  </Typography>
                )}
              </Box>
            }
            subtitle={
              data.barrerasAbiertas > 0
                ? `${Math.round(Number(data.diasEnBarrera))} días acumulados en barrera`
                : 'Sin barreras activas'
            }
          />
        </Grid>

        {/* Próxima entrega */}
        <Grid item xs={12} md={6} lg={4}>
          <KpiCard
            icon={<LocalShipping />}
            title="Próxima entrega"
            accent="#06b6d4"
            alert={!data.proximaEntrega}
            value={
              <Typography variant="body1" sx={{ fontWeight: 700, color: '#111827' }}>
                {data.proximaEntrega ? formatDate(data.proximaEntrega) : '—'}
              </Typography>
            }
            subtitle={
              diasMedSafe > 0
                ? `${diasMedSafe} días de medicamento restantes`
                : medicamentoUrgente
                ? '⚠ Medicamento próximo a agotarse'
                : 'Sin entrega programada'
            }
          />
        </Grid>

        {/* Aplicaciones pendientes */}
        <Grid item xs={12} md={6} lg={4}>
          <KpiCard
            icon={<Vaccines />}
            title="Aplicaciones programadas"
            accent="#8b5cf6"
            value={
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="h4" sx={{ fontWeight: 800, color: '#111827' }}>
                  {data.aplicacionesPendientes}
                </Typography>
                <Typography variant="caption" sx={{ color: '#6b7280' }}>
                  pendiente{data.aplicacionesPendientes !== 1 ? 's' : ''}
                </Typography>
              </Box>
            }
          />
        </Grid>

        {/* Tareas urgentes */}
        <Grid item xs={12} md={6} lg={4}>
          <KpiCard
            icon={<WarningAmber />}
            title="Tareas prioridad alta"
            accent="#ef4444"
            alert={data.tareasPendientesAlta > 0}
            value={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 800, color: data.tareasPendientesAlta > 0 ? theme.palette.error.main : theme.palette.success.main }}
                >
                  {data.tareasPendientesAlta}
                </Typography>
                {data.tareasPendientesAlta === 0 && (
                  <CheckCircle sx={{ color: theme.palette.success.main }} />
                )}
              </Box>
            }
            subtitle={data.tareasPendientesAlta > 0 ? 'Pendientes de atención' : 'Sin tareas urgentes'}
          />
        </Grid>

        {/* Stock de medicamento */}
        <Grid item xs={12} md={6} lg={4}>
          <KpiCard
            icon={<Inventory2 />}
            title="Stock disponible"
            accent="#10b981"
            alert={stockBajo}
            value={
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography
                  variant="h4"
                  sx={{ fontWeight: 800, color: stockBajo ? theme.palette.error.main : '#111827' }}
                >
                  {data.stockDisponible}
                </Typography>
                <Typography variant="caption" sx={{ color: '#6b7280' }}>
                  unidades
                </Typography>
              </Box>
            }
            subtitle={stockBajo ? '⚠ Stock crítico — requiere reposición' : 'Stock adecuado'}
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* Próxima consulta */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          border: '1px solid #e5e7eb',
          borderRadius: 2,
          bgcolor: '#f9fafb',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
        }}
      >
        <Box sx={{ color: theme.palette.primary.main, display: 'flex' }}>
          <EventAvailable fontSize="large" />
        </Box>
        <Box>
          <Typography variant="caption" sx={{ color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Próxima consulta médica
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#111827' }}>
            {data.proximaConsulta ? formatDate(data.proximaConsulta) : 'No programada'}
          </Typography>
        </Box>
        {data.proximaConsulta && (
          <Box sx={{ ml: 'auto' }}>
            <Chip
              icon={<MedicalServices sx={{ fontSize: 16 }} />}
              label="Confirmada"
              size="small"
              sx={{ bgcolor: alpha(theme.palette.success.main, 0.1), color: theme.palette.success.dark, fontWeight: 600 }}
            />
          </Box>
        )}
      </Paper>
    </Box>
  );
};
