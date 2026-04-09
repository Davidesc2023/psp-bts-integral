import React from 'react';
import { Box, Card, CardContent, Typography, Chip, LinearProgress } from '@mui/material';
import { TrendingUp } from '@mui/icons-material';
import { DashboardStats, CategoryCount } from '@/services/dashboardService';

const STATUS_META: Record<string, { label: string; color: string }> = {
  ACTIVO: { label: 'Activos', color: '#10B981' },
  EN_PROCESO: { label: 'En Proceso', color: '#4F46E5' },
  SUSPENDIDO: { label: 'Suspendidos', color: '#F59E0B' },
  DROP_OUT: { label: 'Drop Out', color: '#EF4444' },
  INACTIVO: { label: 'Inactivos', color: '#6B7280' },
  FALLECIDO: { label: 'Fallecidos', color: '#374151' },
};

const PALETTE = ['#10B981', '#4F46E5', '#F59E0B', '#EF4444', '#6B7280', '#374151'];

interface AdherenciaChartProps {
  stats?: DashboardStats | null;
}

export const AdherenciaChart: React.FC<AdherenciaChartProps> = ({ stats }) => {
  const pacientesPorEstado: CategoryCount[] = stats?.pacientesPorEstado ?? [];
  const total = stats?.totalPacientes ?? 0;

  return (
    <Card
      elevation={0}
      sx={{
        borderRadius: 2,
        border: '1px solid #E5E7EB',
        bgcolor: 'white',
      }}
    >
      <CardContent sx={{ p: 3 }}>
        {/* Header */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box>
            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
              <TrendingUp sx={{ color: '#4F46E5', fontSize: 24 }} />
              <Typography variant="h6" fontWeight={700}>
                Distribución de Pacientes
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Estado actual de los pacientes del programa
            </Typography>
          </Box>
          <Chip
            label={`${total} Total`}
            size="small"
            sx={{
              bgcolor: '#EEF2FF',
              color: '#4F46E5',
              fontWeight: 600,
            }}
          />
        </Box>

        {/* KPIs Resumen */}
        <Box display="flex" gap={2} mb={3} flexWrap="wrap">
          <Box
            sx={{
              px: 3,
              py: 2,
              bgcolor: '#D1FAE5',
              borderRadius: 2,
              flex: 1,
              minWidth: 120,
            }}
          >
            <Typography variant="h4" fontWeight={700} color="#10B981">
              {stats?.totalSeguimientos ?? 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Seguimientos
            </Typography>
          </Box>
          <Box
            sx={{
              px: 3,
              py: 2,
              bgcolor: '#EEF2FF',
              borderRadius: 2,
              flex: 1,
              minWidth: 120,
            }}
          >
            <Typography variant="h4" fontWeight={700} color="#4F46E5">
              {stats?.totalTareas ?? 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Tareas
            </Typography>
          </Box>
          <Box
            sx={{
              px: 3,
              py: 2,
              bgcolor: '#CFFAFE',
              borderRadius: 2,
              flex: 1,
              minWidth: 120,
            }}
          >
            <Typography variant="h4" fontWeight={700} color="#06B6D4">
              {stats?.totalParaclinicos ?? 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Paraclínicos
            </Typography>
          </Box>
        </Box>

        {/* Indicadores de Adherencia (PRD §21) */}
        <Box display="flex" gap={2} mb={3} flexWrap="wrap">
          <Box
            sx={{
              px: 3,
              py: 2,
              bgcolor: '#F0FDF4',
              borderRadius: 2,
              flex: 1,
              minWidth: 140,
              border: '1px solid #BBF7D0',
            }}
          >
            <Typography variant="h4" fontWeight={700} color="#15803D">
              {stats?.adherenciaTratamiento ?? 0}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Adherencia Tratamiento
            </Typography>
          </Box>
          <Box
            sx={{
              px: 3,
              py: 2,
              bgcolor: '#EFF6FF',
              borderRadius: 2,
              flex: 1,
              minWidth: 140,
              border: '1px solid #BFDBFE',
            }}
          >
            <Typography variant="h4" fontWeight={700} color="#1D4ED8">
              {stats?.adherenciaEntrega ?? 0}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Adherencia Entrega
            </Typography>
          </Box>
          <Box
            sx={{
              px: 3,
              py: 2,
              bgcolor: '#FEF3C7',
              borderRadius: 2,
              flex: 1,
              minWidth: 140,
              border: '1px solid #FDE68A',
            }}
          >
            <Typography variant="h4" fontWeight={700} color="#B45309">
              {stats?.barrerasResueltas ?? 0}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Barreras Resueltas
            </Typography>
          </Box>
        </Box>

        {/* Distribución por Estado */}
        <Box display="flex" flexDirection="column" gap={2}>
          {pacientesPorEstado.map((item, i) => {
            const meta = STATUS_META[item.category] ?? {
              label: item.category,
              color: PALETTE[i % PALETTE.length],
            };
            const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;

            return (
              <Box key={item.category}>
                <Box display="flex" justifyContent="space-between" mb={0.5}>
                  <Typography variant="body2" fontWeight={600}>
                    {meta.label}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="body2" fontWeight={700} color={meta.color}>
                      {pct}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      ({item.count})
                    </Typography>
                  </Box>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={pct}
                  sx={{
                    height: 10,
                    borderRadius: 5,
                    bgcolor: '#E5E7EB',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: meta.color,
                      borderRadius: 5,
                    },
                  }}
                />
              </Box>
            );
          })}
        </Box>

        {/* Distribución Visual */}
        {pacientesPorEstado.length > 0 && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="caption" color="text.secondary" mb={1} display="block">
              Distribución Visual
            </Typography>
            <Box
              sx={{
                height: 20,
                display: 'flex',
                borderRadius: 2,
                overflow: 'hidden',
                border: '1px solid #E5E7EB',
              }}
            >
              {pacientesPorEstado.map((item, i) => {
                const meta = STATUS_META[item.category] ?? {
                  label: item.category,
                  color: PALETTE[i % PALETTE.length],
                };
                const pct = total > 0 ? (item.count / total) * 100 : 0;
                return (
                  <Box
                    key={item.category}
                    sx={{
                      width: `${pct}%`,
                      bgcolor: meta.color,
                      transition: 'all 0.3s ease',
                      '&:hover': { opacity: 0.8 },
                    }}
                    title={`${meta.label}: ${Math.round(pct)}%`}
                  />
                );
              })}
            </Box>
          </Box>
        )}

        {/* Info Footer */}
        <Box
          sx={{
            mt: 3,
            p: 2,
            bgcolor: '#F0FDF4',
            borderRadius: 2,
            border: '1px solid #BBF7D0',
          }}
        >
          <Typography variant="body2" color="#15803D" fontWeight={600}>
            📊 {stats?.pacientesActivos ?? 0} pacientes activos de {total} totales
            {stats?.serviciosCompletados ? ` · ${stats.serviciosCompletados} servicios completados` : ''}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};
