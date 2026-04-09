import React from 'react';
import { Box, Card, CardContent, Typography, LinearProgress, Chip } from '@mui/material';
import { BarChart } from '@mui/icons-material';
import { CategoryCount } from '@/services/dashboardService';

interface Barrera {
  tipo: string;
  label: string;
  valor: number;
  porcentaje: number;
  color: string;
  icon: string;
}

const CATEGORY_META: Record<string, { label: string; color: string; icon: string }> = {
  ECONOMICA: { label: 'Económicas', color: '#4F46E5', icon: '💰' },
  GEOGRAFICA: { label: 'Geográficas', color: '#06B6D4', icon: '🗺️' },
  SOCIAL: { label: 'Sociales', color: '#10B981', icon: '👥' },
  EDUCATIVA: { label: 'Educativas', color: '#F59E0B', icon: '📚' },
  CLINICA: { label: 'Clínicas', color: '#EF4444', icon: '🏥' },
  DEL_SISTEMA: { label: 'Del Sistema', color: '#8B5CF6', icon: '⚙️' },
  MOTIVACIONAL: { label: 'Motivacionales', color: '#EC4899', icon: '💪' },
};

const PALETTE = ['#4F46E5', '#06B6D4', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

interface BarrerasChartProps {
  data?: CategoryCount[];
}

export const BarrerasChart: React.FC<BarrerasChartProps> = ({ data }) => {
  const totalFromApi = data ? data.reduce((s, c) => s + c.count, 0) : 0;

  const barrerasData: Barrera[] = data
    ? data.map((c, i) => {
        const meta = CATEGORY_META[c.category] ?? {
          label: c.category,
          color: PALETTE[i % PALETTE.length],
          icon: '📋',
        };
        return {
          tipo: c.category,
          label: meta.label,
          valor: c.count,
          porcentaje: totalFromApi > 0 ? Math.round((c.count / totalFromApi) * 100) : 0,
          color: meta.color,
          icon: meta.icon,
        };
      })
    : [];

  const totalBarreras = totalFromApi;

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
              <BarChart sx={{ color: '#4F46E5', fontSize: 24 }} />
              <Typography variant="h6" fontWeight={700}>
                Barreras por Categoría
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Distribución de obstáculos identificados
            </Typography>
          </Box>
          <Chip
            label={`${totalBarreras} Total`}
            size="small"
            sx={{
              bgcolor: '#EEF2FF',
              color: '#4F46E5',
              fontWeight: 600,
            }}
          />
        </Box>

        {/* KPI Total */}
        <Box
          sx={{
            p: 3,
            mb: 3,
            bgcolor: '#F7F8FA',
            borderRadius: 2,
            border: '1px solid #E5E7EB',
          }}
        >
          <Typography variant="h3" fontWeight={700} color="#1F2937" mb={1}>
            {totalBarreras}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Barreras identificadas este mes
          </Typography>
          <Box
            sx={{
              mt: 2,
              display: 'flex',
              gap: 1,
              alignItems: 'center',
            }}
          >
            <Typography variant="caption" color="#10B981" fontWeight={600}>
              -8.3%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              vs mes anterior
            </Typography>
          </Box>
        </Box>

        {/* Lista de Barreras */}
        <Box display="flex" flexDirection="column" gap={2.5}>
          {barrerasData.map((barrera) => (
            <Box key={barrera.tipo}>
              <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
                <Box display="flex" alignItems="center" gap={1.5}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      bgcolor: `${barrera.color}15`,
                      borderRadius: 2,
                      fontSize: '1.25rem',
                    }}
                  >
                    {barrera.icon}
                  </Box>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {barrera.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {barrera.tipo.replace('_', ' ')}
                    </Typography>
                  </Box>
                </Box>
                <Box textAlign="right">
                  <Typography variant="h6" fontWeight={700} color={barrera.color}>
                    {barrera.porcentaje}%
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {barrera.valor} casos
                  </Typography>
                </Box>
              </Box>
              <Box sx={{ position: 'relative' }}>
                <LinearProgress
                  variant="determinate"
                  value={barrera.porcentaje}
                  sx={{
                    height: 12,
                    borderRadius: 6,
                    bgcolor: '#E5E7EB',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: barrera.color,
                      borderRadius: 6,
                    },
                  }}
                />
                {/* Indicador de porcentaje dentro de la barra */}
                {barrera.porcentaje > 15 && (
                  <Box
                    sx={{
                      position: 'absolute',
                      left: `${barrera.porcentaje - 10}%`,
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                  >
                    <Typography
                      variant="caption"
                      fontWeight={700}
                      color="white"
                      sx={{
                        textShadow: '0 1px 2px rgba(0,0,0,0.3)',
                        fontSize: '0.7rem',
                      }}
                    >
                      {barrera.porcentaje}%
                    </Typography>
                  </Box>
                )}
              </Box>
            </Box>
          ))}
        </Box>

        {/* Top 3 Barreras */}
        <Box
          sx={{
            mt: 3,
            p: 2,
            bgcolor: '#FEF3C7',
            borderRadius: 2,
            border: '1px solid #FDE68A',
          }}
        >
          <Typography variant="body2" color="#92400E" fontWeight={600} mb={1}>
            📊 Top 3 Barreras Prioritarias
          </Typography>
          <Box display="flex" gap={2} flexWrap="wrap">
            {barrerasData.slice(0, 3).map((barrera, index) => (
              <Chip
                key={barrera.tipo}
                label={`${index + 1}. ${barrera.label} (${barrera.porcentaje}%)`}
                size="small"
                sx={{
                  bgcolor: 'white',
                  color: barrera.color,
                  fontWeight: 600,
                  border: `1px solid ${barrera.color}`,
                }}
              />
            ))}
          </Box>
        </Box>

        {/* Distribución Visual */}
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
            {barrerasData.map((barrera) => (
              <Box
                key={barrera.tipo}
                sx={{
                  width: `${barrera.porcentaje}%`,
                  bgcolor: barrera.color,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    opacity: 0.8,
                  },
                }}
                title={`${barrera.label}: ${barrera.porcentaje}%`}
              />
            ))}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};
