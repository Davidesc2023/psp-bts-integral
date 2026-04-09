import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Tabs,
  Tab,
  IconButton,
  Skeleton,
} from '@mui/material';
import {
  MedicationLiquid,
  MoreVert,
} from '@mui/icons-material';
import { prescripcionService } from '@/services/prescripcionService';
import type { Prescripcion as PrescripcionAPI } from '@/types/prescripcion.types';
import toast from 'react-hot-toast';

const getEstadoConfig = (estado: string) => {
  switch (estado) {
    case 'VIGENTE':
      return { label: 'Vigente', color: '#10B981', bgcolor: '#D1FAE5' };
    case 'VENCIDA':
      return { label: 'Vencida', color: '#EF4444', bgcolor: '#FEE2E2' };
    case 'CANCELADA':
      return { label: 'Cancelada', color: '#6B7280', bgcolor: '#F3F4F6' };
    case 'SUSPENDIDA':
      return { label: 'Suspendida', color: '#F59E0B', bgcolor: '#FEF3C7' };
    default:
      return { label: 'Desconocido', color: '#6B7280', bgcolor: '#F3F4F6' };
  }
};

export const PrescripcionesTable: React.FC = () => {
  const [prescripciones, setPrescripciones] = useState<PrescripcionAPI[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'todas' | 'VIGENTE' | 'VENCIDA' | 'CANCELADA' | 'SUSPENDIDA'>('todas');
  const [page, setPage] = useState(0);
  const [rowsPerPage] = useState(10);

  useEffect(() => {
    prescripcionService.getAll(0, 200)
      .then((r) => setPrescripciones(r.content ?? []))
      .catch(() => toast.error('Error al cargar prescripciones'))
      .finally(() => setLoading(false));
  }, []);

  const filteredPrescripciones = prescripciones.filter((p) => {
    if (filter === 'todas') return true;
    return p.estado === filter;
  });

  const vigentes = prescripciones.filter((p) => p.estado === 'VIGENTE').length;
  const vencidas = prescripciones.filter((p) => p.estado === 'VENCIDA').length;
  const suspendidas = prescripciones.filter((p) => p.estado === 'SUSPENDIDA').length;

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
              <MedicationLiquid sx={{ color: '#4F46E5', fontSize: 24 }} />
              <Typography variant="h6" fontWeight={700}>
                Prescripciones Activas
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary">
              Gestión de tratamientos y adherencia
            </Typography>
          </Box>
        </Box>

        {/* KPIs */}
        <Box display="flex" gap={2} mb={3} flexWrap="wrap">
          <Box
            sx={{
              px: 3,
              py: 2,
              bgcolor: '#EEF2FF',
              borderRadius: 2,
              flex: 1,
              minWidth: 140,
            }}
          >
            <Typography variant="h4" fontWeight={700} color="#4F46E5">
              {vigentes}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Vigentes
            </Typography>
          </Box>
          <Box
            sx={{
              px: 3,
              py: 2,
              bgcolor: '#FEE2E2',
              borderRadius: 2,
              flex: 1,
              minWidth: 140,
            }}
          >
            <Typography variant="h4" fontWeight={700} color="#EF4444">
              {vencidas}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Vencidas
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
            }}
          >
            <Typography variant="h4" fontWeight={700} color="#F59E0B">
              {suspendidas}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Suspendidas
            </Typography>
          </Box>
        </Box>

        {/* Tabs de Filtro */}
        <Tabs
          value={filter}
          onChange={(_, newValue) => {
            setFilter(newValue);
            setPage(0);
          }}
          sx={{
            mb: 2,
            '& .MuiTab-root': {
              textTransform: 'none',
              fontWeight: 600,
              fontSize: '0.875rem',
            },
            '& .Mui-selected': {
              color: '#4F46E5',
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#4F46E5',
            },
          }}
        >
          <Tab label={`Todas (${prescripciones.length})`} value="todas" />
          <Tab label={`Vigentes (${vigentes})`} value="VIGENTE" />
          <Tab label={`Vencidas (${vencidas})`} value="VENCIDA" />
          <Tab label={`Suspendidas (${suspendidas})`} value="SUSPENDIDA" />
        </Tabs>

        {/* Tabla */}
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 600, color: '#6B7280' }}>Paciente</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#6B7280' }}>Medicamento</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#6B7280' }}>Fecha Inicio</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#6B7280' }}>Fecha Fin</TableCell>
                <TableCell sx={{ fontWeight: 600, color: '#6B7280' }}>Estado</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 6 }).map((__, j) => (
                      <TableCell key={j}><Skeleton variant="text" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredPrescripciones
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((prescripcion) => {
                  const estadoConfig = getEstadoConfig(prescripcion.estado);

                  return (
                    <TableRow key={prescripcion.id} hover>
                      <TableCell>
                        <Box display="flex" alignItems="center" gap={1.5}>
                          <Avatar
                            sx={{
                              width: 36,
                              height: 36,
                              bgcolor: '#4F46E5',
                              fontSize: '0.875rem',
                              fontWeight: 600,
                            }}
                          >
                            {`P${prescripcion.pacienteId}`}
                          </Avatar>
                          <Typography variant="body2" fontWeight={500}>
                            {`Paciente #${prescripcion.pacienteId}`}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{prescripcion.medicamento?.nombre ?? 'N/A'}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {new Date(prescripcion.fechaInicio).toLocaleDateString('es-ES', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={500}>
                          {prescripcion.fechaFin
                            ? new Date(prescripcion.fechaFin).toLocaleDateString('es-ES', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'Sin fecha fin'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={estadoConfig.label}
                          size="small"
                          sx={{
                            bgcolor: estadoConfig.bgcolor,
                            color: estadoConfig.color,
                            fontWeight: 600,
                            fontSize: '0.75rem',
                            height: 24,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <IconButton size="small">
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Paginación */}
        <TablePagination
          component="div"
          count={filteredPrescripciones.length}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[10]}
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
          labelRowsPerPage="Filas por página:"
        />
      </CardContent>
    </Card>
  );
};
