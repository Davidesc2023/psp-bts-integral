import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  Typography,
  IconButton,
  Chip,
  Grid,
  useMediaQuery,
  useTheme,
  CircularProgress,
  Checkbox,
  alpha,
} from '@mui/material';
import {
  Add,
  Visibility,
  Edit,
  Delete,
  Person,
  Badge,
} from '@mui/icons-material';
import { DataGrid, GridColDef, GridPaginationModel } from '@mui/x-data-grid';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientService, PatientFilters as ServiceFilters } from '@services/patient.service';
import { Patient, PatientStatus } from '@/types';
import { PacienteFilters } from '../components/PacienteFilters';
import { PacienteCard } from '../components/PacienteCard';
import toast from 'react-hot-toast';

const statusLabels: Record<PatientStatus, string> = {
  ACTIVO: 'Activo',
  SUSPENDIDO: 'Suspendido',
  DROP_OUT: 'Drop Out',
  RETIRADO: 'Retirado',
  EN_PROCESO: 'En Proceso',
};

const PacientesPage = () => {
  const navigate = useNavigate();
  const muiTheme = useTheme();
  
  const statusColors: Record<PatientStatus, { bg: string; text: string }> = {
    ACTIVO: { bg: alpha(muiTheme.palette.primary.main, 0.1), text: muiTheme.palette.primary.dark },
    SUSPENDIDO: { bg: '#fef3c7', text: '#d97706' },
    DROP_OUT: { bg: '#fee2e2', text: '#dc2626' },
    RETIRADO: { bg: '#f3f4f6', text: '#6b7280' },
    EN_PROCESO: { bg: '#dbeafe', text: '#2563eb' },
  };
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<ServiceFilters>({
    search: '',
    page: 0,
    size: 20,
  });

  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 20,
  });

  // Cargar pacientes
  const { data, isLoading } = useQuery({
    queryKey: ['patients', filters],
    queryFn: () => patientService.getPatients(filters),
  });

  // Mutación para eliminar paciente
  const deleteMutation = useMutation({
    mutationFn: (id: number) => patientService.deletePatient(id),
    onSuccess: () => {
      toast.success('Paciente eliminado correctamente');
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    },
    onError: () => {
      toast.error('Error al eliminar paciente');
    },
  });

  const handleFilterChange = (newFilters: any) => {
    setFilters({
      ...newFilters,
      page: 0,
      size: paginationModel.pageSize,
    });
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  };

  const handlePaginationChange = (model: GridPaginationModel) => {
    setPaginationModel(model);
    setFilters(prev => ({
      ...prev,
      page: model.page,
      size: model.pageSize,
    }));
  };

  const handleDelete = (id: number) => {
    if (confirm('¿Está seguro de eliminar este paciente?')) {
      deleteMutation.mutate(id);
    }
  };

  // Columnas para la tabla (Desktop)
  const columns: GridColDef<Patient>[] = [
    {
      field: 'select',
      headerName: '',
      width: 50,
      sortable: false,
      renderHeader: () => <Checkbox size="small" />,
      renderCell: () => <Checkbox size="small" />,
    },
    {
      field: 'documentoIdentidad',
      headerName: 'Documento',
      width: 130,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Badge sx={{ color: 'text.secondary', fontSize: 18 }} />
          {params.value}
        </Box>
      ),
    },
    {
      field: 'nombreCompleto',
      headerName: 'Nombre Completo',
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Person sx={{ color: theme.palette.primary.main, fontSize: 18 }} />
          <strong>{params.value}</strong>
        </Box>
      ),
    },
    {
      field: 'edad',
      headerName: 'Edad',
      width: 80,
      renderCell: (params) => `${params.value} años`,
    },
    {
      field: 'eps',
      headerName: 'EPS',
      width: 150,
      valueGetter: (params: any) => params.row.epsName || 'N/A',
    },
    {
      field: 'estado',
      headerName: 'Estado',
      width: 120,
      renderCell: (params) => {
        const status = (params.value as PatientStatus) || 'ACTIVO';
        const color = statusColors[status] || statusColors.ACTIVO;
        return (
          <Chip
            label={statusLabels[status]}
            size="small"
            sx={{
              bgcolor: color.bg,
              color: color.text,
              fontWeight: 600,
            }}
          />
        );
      },
    },
    {
      field: 'actions',
      headerName: 'Acciones',
      width: 150,
      sortable: false,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <IconButton
            size="small"
            onClick={() => navigate(`/patients/${params.row.id}`)}
            sx={{ color: theme.palette.primary.main, '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) } }}
          >
            <Visibility fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => navigate(`/patients/${params.row.id}/editar`)}
            sx={{ color: '#3b82f6', '&:hover': { bgcolor: '#dbeafe' } }}
          >
            <Edit fontSize="small" />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => handleDelete(params.row.id)}
            sx={{ color: '#ef4444', '&:hover': { bgcolor: '#fee2e2' } }}
          >
            <Delete fontSize="small" />
          </IconButton>
        </Box>
      ),
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" gutterBottom fontWeight="bold" color="#111827">
            Pacientes
          </Typography>
          <Typography variant="body1" color="#6b7280">
            Gestión de pacientes del programa
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => navigate('/patients/new')}
          sx={{
            bgcolor: theme.palette.primary.main,
            '&:hover': { bgcolor: theme.palette.primary.dark },
            textTransform: 'none',
            fontWeight: 600,
          }}
        >
          + Crear Paciente
        </Button>
      </Box>

      {/* Filtros */}
      <PacienteFilters
        onFilterChange={handleFilterChange}
        initialValues={{ search: filters.search || '' }}
      />

      {/* Loading State */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress sx={{ color: theme.palette.primary.main }} />
        </Box>
      )}

      {/* Vista Desktop - DataGrid */}
      {!isLoading && !isMobile && (
        <Card sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <DataGrid
            rows={data?.content || []}
            columns={columns}
            loading={isLoading}
            paginationMode="server"
            paginationModel={paginationModel}
            onPaginationModelChange={handlePaginationChange}
            rowCount={data?.totalElements || 0}
            pageSizeOptions={[10, 20, 50, 100]}
            disableRowSelectionOnClick
            autoHeight
            sx={{
              border: 'none',
              '& .MuiDataGrid-columnHeaders': {
                bgcolor: '#f9fafb',
                color: '#111827',
                fontWeight: 600,
              },
              '& .MuiDataGrid-row:hover': {
                bgcolor: '#f9fafb',
              },
              '& .MuiDataGrid-cell:focus': {
                outline: 'none',
              },
              '& .MuiDataGrid-footerContainer': {
                borderTop: '1px solid #e5e7eb',
                '& .MuiTablePagination-actions button': {
                  color: theme.palette.primary.main,
                },
              },
            }}
          />
        </Card>
      )}

      {/* Vista Móvil - Cards */}
      {!isLoading && isMobile && (
        <Grid container spacing={2}>
          {data?.content.map((patient) => (
            <Grid item xs={12} key={patient.id}>
              <PacienteCard patient={patient} onDelete={handleDelete} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Empty State */}
      {!isLoading && data?.content.length === 0 && (
        <Card sx={{ p: 6, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <Person sx={{ fontSize: 64, color: '#d1d5db', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No se encontraron pacientes
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Intenta ajustar los filtros o crea un nuevo paciente
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate('/patients/new')}
            sx={{
              bgcolor: theme.palette.primary.main,
              '&:hover': { bgcolor: theme.palette.primary.dark },
            }}
          >
            Crear Paciente
          </Button>
        </Card>
      )}
    </Box>
  );
};

export default PacientesPage;

