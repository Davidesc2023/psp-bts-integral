import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  CircularProgress,
  Breadcrumbs,
  Link,
  useTheme,
} from '@mui/material';
import { NavigateNext } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { patientService } from '@services/patient.service';
import { PacienteTabs } from '../components/PacienteTabs';

const PatientDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const theme = useTheme();

  const { data: patient, isLoading, error } = useQuery({
    queryKey: ['patient', id],
    queryFn: () => patientService.getPatientById(Number(id)),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
        <CircularProgress sx={{ color: theme.palette.primary.main }} />
      </Box>
    );
  }

  if (error || !patient) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h5" color="error" gutterBottom>
          Error al cargar el paciente
        </Typography>
        <Typography variant="body1" color="text.secondary">
          No se pudo encontrar la información del paciente
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Breadcrumbs separator={<NavigateNext fontSize="small" />} sx={{ mb: 2 }}>
        <Link
          color="inherit"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate('/dashboard');
          }}
          sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
        >
          Dashboard
        </Link>
        <Link
          color="inherit"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate('/patients');
          }}
          sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
        >
          Pacientes
        </Link>
        <Typography color="text.primary">Detalle</Typography>
      </Breadcrumbs>

      <Typography variant="h4" gutterBottom fontWeight="bold" color="#111827">
        {patient.nombreCompleto}
      </Typography>
      <Typography variant="body1" color="#6b7280" sx={{ mb: 3 }}>
        CC {patient.documentoIdentidad}
      </Typography>

      <PacienteTabs patient={patient} onEdit={() => navigate(`/patients/${id}/editar`)} />
    </Box>
  );
};

export default PatientDetailPage;
