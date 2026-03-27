import React, { useEffect, useState } from 'react';
import { Box, Card, CardContent, Typography, Grid, Chip } from '@mui/material';
import { TrendingUp, TrendingDown, LocalShipping } from '@mui/icons-material';
import { entregaService } from '@/services/entregaService';

interface EntregasChartProps {
  totalTransportes?: number;
  transportesPendientes?: number;
  transportesEfectivos?: number;
}

interface KPICardProps {
  title: string;
  value: string;
  change?: string;
  trend?: 'up' | 'down';
  color: string;
}

const KPICard: React.FC<KPICardProps> = ({ title, value, change, trend, color }) => (
  <Box
    sx={{
      p: 2,
      bgcolor: 'white',
      borderRadius: 2,
      border: '1px solid #E5E7EB',
      height: '100%',
    }}
  >
    <Typography variant="body2" color="text.secondary" gutterBottom>
      {title}
    </Typography>
    <Typography variant="h4" fontWeight={700} color={color} mb={1}>
      {value}
    </Typography>
    {change && (
      <Box display="flex" alignItems="center" gap={0.5}>
        {trend === 'up' ? (
          <TrendingUp sx={{ fontSize: 16, color: '#10B981' }} />
        ) : (
          <TrendingDown sx={{ fontSize: 16, color: '#EF4444' }} />
        )}
        <Typography variant="caption" color={trend === 'up' ? '#10B981' : '#EF4444'} fontWeight={600}>
          {change}
        </Typography>
      </Box>
    )}
  </Box>
);

export const EntregasChart: React.FC<EntregasChartProps> = ({
  totalTransportes = 0,
  transportesPendientes = 0,
  transportesEfectivos = 0,
}) => {
  const [entregas, setEntregas] = useState<any[]>([]);
  const [enTransito, setEnTransito] = useState<any[]>([]);

  useEffect(() => {
    entregaService.getAll(0, 100)
      .then((r) => setEntregas(r.content ?? []))
      .catch(() => {});
    entregaService.getEnTransito()
      .then((r) => setEnTransito(r ?? []))
      .catch(() => {});
  }, []);

  const totalEntregas = entregas.length;
  const entregasEnTransito = enTransito.length;
  const completionRate = totalEntregas > 0
    ? ((totalEntregas - entregasEnTransito) / totalEntregas * 100).toFixed(1)
    : '0';

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
              <LocalShipping sx={{ color: '#4F46E5', fontSize: 24 }} />
              <Typography variant="h6" fontWeight={700}>
                Entregas de Medicamentos
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Rendimiento semanal y tendencias
            </Typography>
          </Box>
          <Chip
            label="Última semana"
            size="small"
            sx={{
              bgcolor: '#EEF2FF',
              color: '#4F46E5',
              fontWeight: 600,
            }}
          />
        </Box>

        {/* KPIs */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={4}>
            <KPICard
              title="Total Entregas"
              value={String(totalEntregas)}
              change={`${entregasEnTransito} en tránsito`}
              trend="up"
              color="#4F46E5"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <KPICard
              title="Tasa Completadas"
              value={`${completionRate}%`}
              color="#06B6D4"
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <KPICard
              title="Transportes"
              value={String(totalTransportes)}
              change={`${transportesPendientes} pendientes`}
              trend={transportesPendientes > 0 ? 'down' : 'up'}
              color="#10B981"
            />
          </Grid>
        </Grid>

        {/* Resumen */}
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Box
              sx={{
                p: 3,
                bgcolor: '#F7F8FA',
                borderRadius: 2,
                border: '1px solid #E5E7EB',
                textAlign: 'center',
              }}
            >
              <Typography variant="h3" fontWeight={700} color="#4F46E5" mb={1}>
                {totalEntregas + totalTransportes}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total registros logísticos (entregas + transportes)
              </Typography>
              <Box mt={2} display="flex" justifyContent="center" gap={3}>
                <Box>
                  <Typography variant="h5" fontWeight={700} color="#06B6D4">
                    {transportesEfectivos}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Transportes efectivos
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={700} color="#F59E0B">
                    {transportesPendientes}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Transportes pendientes
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="h5" fontWeight={700} color="#10B981">
                    {entregasEnTransito}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    En tránsito
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};
