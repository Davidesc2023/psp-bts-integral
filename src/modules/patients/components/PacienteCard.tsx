import { useNavigate } from 'react-router-dom';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Chip,
  Box,
  IconButton,
  Stack,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Person,
  Phone,
  Email,
  LocationOn,
  Visibility,
  Edit,
  Delete,
} from '@mui/icons-material';
import { Patient, PatientStatus } from '@/types';

interface PacienteCardProps {
  patient: Patient;
  onDelete?: (id: number) => void;
}

const statusLabels: Record<PatientStatus, string> = {
  ACTIVO: 'Activo',
  SUSPENDIDO: 'Suspendido',
  DROP_OUT: 'Drop Out',
  RETIRADO: 'Retirado',
  EN_PROCESO: 'En Proceso',
};

export const PacienteCard = ({ patient, onDelete }: PacienteCardProps) => {
  const navigate = useNavigate();
  const theme = useTheme();
  
  const statusColors: Record<PatientStatus, { bg: string; text: string }> = {
    ACTIVO: { bg: alpha(theme.palette.primary.main, 0.1), text: theme.palette.primary.dark },
    SUSPENDIDO: { bg: '#fef3c7', text: '#d97706' },
    DROP_OUT: { bg: '#fee2e2', text: '#dc2626' },
    RETIRADO: { bg: '#f3f4f6', text: '#6b7280' },
    EN_PROCESO: { bg: '#dbeafe', text: '#2563eb' },
  };
  
  const status = (patient as any).estado || 'ACTIVO';
  const statusColor = statusColors[status as PatientStatus] || statusColors.ACTIVO;

  return (
    <Card
      sx={{
        bgcolor: '#ffffff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        borderRadius: 2,
        '&:hover': {
          boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        },
      }}
    >
      <CardContent sx={{ pb: 1 }}>
        {/* Nombre y Estado */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h6" color="#111827" sx={{ fontWeight: 600, mb: 0.5 }}>
              {patient.nombreCompleto}
            </Typography>
            <Typography variant="body2" color="#6b7280" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Person sx={{ fontSize: 16 }} />
              CC {patient.documentoIdentidad}
            </Typography>
          </Box>
          <Chip
            label={statusLabels[status as PatientStatus]}
            size="small"
            sx={{
              bgcolor: statusColor.bg,
              color: statusColor.text,
              fontWeight: 600,
              fontSize: '0.75rem',
            }}
          />
        </Box>

        {/* Información adicional */}
        <Stack spacing={1}>
          {patient.edad && (
            <Typography variant="body2" color="text.secondary">
              <strong>Edad:</strong> {patient.edad} años
            </Typography>
          )}
          
          {patient.telefono && (
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Phone sx={{ fontSize: 14 }} />
              {patient.telefono}
            </Typography>
          )}
          
          {patient.email && (
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Email sx={{ fontSize: 14 }} />
              {patient.email}
            </Typography>
          )}
          
          {(patient.ciudad || patient.departamento) && (
            <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <LocationOn sx={{ fontSize: 14 }} />
              {patient.ciudad && patient.departamento 
                ? `${patient.ciudad}, ${patient.departamento}`
                : patient.ciudad || patient.departamento
              }
            </Typography>
          )}
        </Stack>
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2, gap: 1 }}>
        <Button
          size="small"
          startIcon={<Visibility />}
          onClick={() => navigate(`/patients/${patient.id}`)}
          sx={{ 
            color: theme.palette.primary.main,
            '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) },
          }}
        >
          Ver
        </Button>
        <Button
          size="small"
          startIcon={<Edit />}
          onClick={() => navigate(`/patients/${patient.id}/editar`)}
          sx={{ 
            color: '#3b82f6',
            '&:hover': { bgcolor: '#dbeafe' },
          }}
        >
          Editar
        </Button>
        {onDelete && (
          <IconButton
            size="small"
            onClick={() => onDelete(patient.id)}
            sx={{ 
              ml: 'auto',
              color: '#ef4444',
              '&:hover': { bgcolor: '#fee2e2' },
            }}
          >
            <Delete fontSize="small" />
          </IconButton>
        )}
      </CardActions>
    </Card>
  );
};

