import React, { useState, useEffect } from 'react';
import { Box, Grid, Card, CardContent, Typography, Chip, Skeleton } from '@mui/material';
import { motion } from 'framer-motion';
import {
  People,
  TrendingUp,
  LocalShipping,
  CalendarMonth,
  CheckCircle,
} from '@mui/icons-material';
import { dashboardService, DashboardStats } from '@/services/dashboardService';

// Importar componentes especializados
import { EntregasChart } from './components/EntregasChart';
import { PrescripcionesTable } from './components/PrescripcionesTable';
import { AdherenciaChart } from './components/AdherenciaChart';
import { BarrerasChart } from './components/BarrerasChart';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 100,
      damping: 15,
    },
  },
};

interface TopKPI {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  bgcolor: string;
  trend?: string;
  trendUp?: boolean;
}

export const DashboardPageEnriched: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    dashboardService
      .getStats()
      .then((data) => setStats(data))
      .catch(() => {
        // Error silencioso - el dashboard muestra "—" en los KPIs cuando no hay datos
        console.warn('Dashboard: backend no disponible, mostrando datos vacíos.');
      })
      .finally(() => setLoading(false));
  }, []);

  // Top KPIs principales — datos reales
  const topKPIs: TopKPI[] = [
    {
      title: 'Pacientes Activos',
      value: stats ? String(stats.pacientesActivos) : '—',
      subtitle: `${stats?.totalPacientes ?? 0} totales`,
      icon: <People sx={{ fontSize: 36 }} />,
      color: '#4F46E5',
      bgcolor: '#EEF2FF',
      trend: stats ? `${stats.pacientesEnProceso} en proceso` : undefined,
      trendUp: true,
    },
    {
      title: 'Barreras Activas',
      value: stats ? String(stats.barrerasActivas) : '—',
      subtitle: `${stats?.totalBarreras ?? 0} totales`,
      icon: <CheckCircle sx={{ fontSize: 36 }} />,
      color: '#10B981',
      bgcolor: '#D1FAE5',
      trend: stats ? `${stats.totalBarreras - stats.barrerasActivas} cerradas` : undefined,
      trendUp: (stats?.barrerasActivas ?? 0) === 0,
    },
    {
      title: 'Transportes Pendientes',
      value: stats ? String(stats.transportesPendientes) : '—',
      subtitle: `${stats?.transportesEfectivos ?? 0} efectivos`,
      icon: <LocalShipping sx={{ fontSize: 36 }} />,
      color: '#06B6D4',
      bgcolor: '#CFFAFE',
      trend: stats ? `${stats.totalTransportes} total` : undefined,
      trendUp: false,
    },
    {
      title: 'Seguimientos',
      value: stats ? String(stats.totalSeguimientos) : '—',
      subtitle: `${stats?.totalTareas ?? 0} tareas`,
      icon: <CalendarMonth sx={{ fontSize: 36 }} />,
      color: '#F59E0B',
      bgcolor: '#FEF3C7',
      trend: stats ? `${stats.totalParaclinicos} paraclínicos` : undefined,
      trendUp: true,
    },
  ];

  if (loading) {
    return (
      <Box sx={{ maxWidth: '1800px', mx: 'auto', px: 3, py: 4 }}>
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} lg={3} key={i}>
              <Skeleton variant="rectangular" height={140} sx={{ borderRadius: 2 }} />
            </Grid>
          ))}
          <Grid item xs={12}>
            <Skeleton variant="rectangular" height={400} sx={{ borderRadius: 2 }} />
          </Grid>
        </Grid>
      </Box>
    );
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        bgcolor: '#F7F8FA',
        pb: 6,
      }}
    >
      <motion.div variants={containerVariants} initial="hidden" animate="visible">
        <Box sx={{ maxWidth: '1800px', mx: 'auto', px: { xs: 2, sm: 3 }, py: 4 }}>
          {/* Header */}
          <motion.div variants={itemVariants}>
            <Box sx={{ mb: 4 }}>
              <Typography
                variant="h3"
                sx={{
                  fontWeight: 800,
                  color: '#1F2937',
                  mb: 1,
                  letterSpacing: '-0.5px',
                  fontSize: { xs: '1.75rem', md: '2.5rem' },
                }}
              >
                Dashboard Principal
              </Typography>
              <Box display="flex" alignItems="center" gap={2} flexWrap="wrap">
                <Typography variant="body1" color="text.secondary" fontWeight={500}>
                  Visión completa del Programa de Soporte a Pacientes
                </Typography>
                <Chip
                  label="Actualizado hace 2 min"
                  size="small"
                  icon={<TrendingUp sx={{ fontSize: 16 }} />}
                  sx={{
                    bgcolor: '#D1FAE5',
                    color: '#065F46',
                    fontWeight: 600,
                    '& .MuiChip-icon': {
                      color: '#10B981',
                    },
                  }}
                />
              </Box>
            </Box>
          </motion.div>

          {/* Sección 1: Top KPIs */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            {topKPIs.map((kpi, index) => (
              <Grid item xs={12} sm={6} lg={3} key={index}>
                <motion.div
                  variants={itemVariants}
                  whileHover={{ scale: 1.02, y: -4 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                >
                  <Card
                    elevation={0}
                    sx={{
                      height: '100%',
                      borderRadius: 2,
                      border: '1px solid #E5E7EB',
                      bgcolor: 'white',
                      transition: 'all 0.3s ease',
                      '&:hover': {
                        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                      },
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Box display="flex" alignItems="flex-start" justifyContent="space-between">
                        <Box flex={1}>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            fontWeight={600}
                            mb={1}
                          >
                            {kpi.title}
                          </Typography>
                          <Typography
                            variant="h3"
                            fontWeight={800}
                            color={kpi.color}
                            mb={0.5}
                            sx={{ fontSize: { xs: '1.75rem', sm: '2rem' } }}
                          >
                            {kpi.value}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {kpi.subtitle}
                          </Typography>
                          {kpi.trend && (
                            <Box mt={1}>
                              <Chip
                                label={kpi.trend}
                                size="small"
                                sx={{
                                  height: 22,
                                  fontSize: '0.7rem',
                                  fontWeight: 700,
                                  bgcolor: kpi.trendUp ? '#D1FAE5' : '#FEE2E2',
                                  color: kpi.trendUp ? '#065F46' : '#991B1B',
                                }}
                              />
                            </Box>
                          )}
                        </Box>
                        <Box
                          sx={{
                            width: 64,
                            height: 64,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: kpi.bgcolor,
                            borderRadius: 2,
                            color: kpi.color,
                          }}
                        >
                          {kpi.icon}
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>

          {/* Sección 2: Entregas */}
          <motion.div variants={itemVariants}>
            <Box sx={{ mb: 4 }}>
              <EntregasChart
                totalTransportes={stats?.totalTransportes}
                transportesPendientes={stats?.transportesPendientes}
                transportesEfectivos={stats?.transportesEfectivos}
              />
            </Box>
          </motion.div>

          {/* Sección 3: Prescripciones Activas (estilo Invoice Table) */}
          <motion.div variants={itemVariants}>
            <Box sx={{ mb: 4 }}>
              <PrescripcionesTable />
            </Box>
          </motion.div>

          {/* Sección 4 y 5: Adherencia + Barreras (lado a lado) */}
          <Grid container spacing={3}>
            <Grid item xs={12} lg={7}>
              <motion.div variants={itemVariants}>
                <AdherenciaChart stats={stats} />
              </motion.div>
            </Grid>
            <Grid item xs={12} lg={5}>
              <motion.div variants={itemVariants}>
                <BarrerasChart data={stats?.barrerasPorCategoria} />
              </motion.div>
            </Grid>
          </Grid>

          {/* Footer Info */}
          <motion.div variants={itemVariants}>
            <Box
              sx={{
                mt: 4,
                p: 3,
                bgcolor: 'white',
                borderRadius: 2,
                border: '1px solid #E5E7EB',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2,
              }}
            >
              <Box>
                <Typography variant="body2" fontWeight={600} color="text.primary" mb={0.5}>
                  Programa de Soporte a Pacientes - PSP
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Todos los datos se actualizan en tiempo real. Última sincronización:{' '}
                  {new Date().toLocaleTimeString('es-ES')}
                </Typography>
              </Box>
              <Box display="flex" gap={1}>
                <Chip
                  label="Sistema Operativo"
                  size="small"
                  icon={<CheckCircle sx={{ fontSize: 14 }} />}
                  sx={{
                    bgcolor: '#D1FAE5',
                    color: '#065F46',
                    fontWeight: 600,
                    '& .MuiChip-icon': {
                      color: '#10B981',
                    },
                  }}
                />
                <Chip
                  label="v1.0.0"
                  size="small"
                  sx={{
                    bgcolor: '#EEF2FF',
                    color: '#4F46E5',
                    fontWeight: 600,
                  }}
                />
              </Box>
            </Box>
          </motion.div>
        </Box>
      </motion.div>
    </Box>
  );
};

export default DashboardPageEnriched;
