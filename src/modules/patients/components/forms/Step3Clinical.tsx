import {
  Grid,
  TextField,
  MenuItem,
  Typography,
  Box,
  CircularProgress,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { catalogService } from '@services/catalog.service';
import type { PatientFormData } from './types';

interface Step3ClinicalProps {
  formData: PatientFormData;
  updateFormData: (data: Partial<PatientFormData>) => void;
  errors: Record<string, string>;
}

const PATIENT_STATUS = [
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'SUSPENDIDO', label: 'Suspendido' },
  { value: 'RETIRADO', label: 'Retirado' },
  { value: 'FALLECIDO', label: 'Fallecido' },
];

const POPULATION_TYPES = [
  { value: 1, label: 'Población General' },
  { value: 2, label: 'Desplazado' },
  { value: 3, label: 'Víctima del Conflicto' },
  { value: 4, label: 'Discapacitado' },
  { value: 5, label: 'Adulto Mayor' },
  { value: 6, label: 'Gestante' },
  { value: 7, label: 'Menor de Edad' },
];

/**
 * Paso 3/4: Datos Clínicos
 * - EPS e IPS
 * - Estado del paciente
 * - Fechas de ingreso/suspensión/retiro
 * - Tipo de población
 */
const Step3Clinical = ({ formData, updateFormData, errors }: Step3ClinicalProps) => {
  // Queries para catálogos
  const { data: epsList = [], isLoading: loadingEPS } = useQuery({
    queryKey: ['eps'],
    queryFn: catalogService.getEPSList,
  });

  const { data: ipsList = [], isLoading: loadingIPS } = useQuery({
    queryKey: ['ips'],
    queryFn: catalogService.getIPSList,
  });

  return (
    <Box>
      <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
        Información Clínica y Aseguramiento
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Datos sobre EPS, IPS y estado del paciente en el programa
      </Typography>

      <Grid container spacing={3}>
        {/* EPS */}
        <Grid item xs={12} sm={6}>
          <TextField
            select
            fullWidth
            label="EPS *"
            value={formData.epsId || ''}
            onChange={(e) => updateFormData({ epsId: Number(e.target.value) })}
            error={!!errors.epsId}
            helperText={errors.epsId}
            disabled={loadingEPS}
          >
            {loadingEPS ? (
              <MenuItem disabled>
                <CircularProgress size={20} /> Cargando...
              </MenuItem>
            ) : (
              epsList.map((eps) => (
                <MenuItem key={eps.id} value={eps.id}>
                  {eps.name}
                </MenuItem>
              ))
            )}
          </TextField>
        </Grid>

        {/* IPS */}
        <Grid item xs={12} sm={6}>
          <TextField
            select
            fullWidth
            label="IPS *"
            value={formData.ipsId || ''}
            onChange={(e) => updateFormData({ ipsId: Number(e.target.value) })}
            error={!!errors.ipsId}
            helperText={errors.ipsId}
            disabled={loadingIPS}
          >
            {loadingIPS ? (
              <MenuItem disabled>
                <CircularProgress size={20} /> Cargando...
              </MenuItem>
            ) : (
              ipsList.map((ips) => (
                <MenuItem key={ips.id} value={ips.id}>
                  {ips.name}
                </MenuItem>
              ))
            )}
          </TextField>
        </Grid>

        {/* Estado del Paciente */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            fullWidth
            label="Estado del Paciente *"
            value={formData.status || 'ACTIVO'}
            onChange={(e) => updateFormData({ status: e.target.value })}
            error={!!errors.status}
            helperText={errors.status}
          >
            {PATIENT_STATUS.map((status) => (
              <MenuItem key={status.value} value={status.value}>
                {status.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Fecha de Ingreso */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            type="date"
            label="Fecha de Ingreso *"
            value={formData.startDate || ''}
            onChange={(e) => updateFormData({ startDate: e.target.value })}
            error={!!errors.startDate}
            helperText={errors.startDate}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Grid>

        {/* Tipo de Población */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            fullWidth
            label="Tipo de Población"
            value={formData.populationTypeId || ''}
            onChange={(e) =>
              updateFormData({ populationTypeId: Number(e.target.value) })
            }
            helperText="Opcional"
          >
            <MenuItem value="">
              <em>No especificado</em>
            </MenuItem>
            {POPULATION_TYPES.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                {type.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Fecha de Suspensión (condicional) */}
        {formData.status === 'SUSPENDIDO' && (
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="date"
              label="Fecha de Suspensión"
              value={formData.suspensionDate || ''}
              onChange={(e) => updateFormData({ suspensionDate: e.target.value })}
              error={!!errors.suspensionDate}
              helperText={errors.suspensionDate || 'Requerido cuando está suspendido'}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>
        )}

        {/* Fecha de Retiro (condicional) */}
        {formData.status === 'RETIRADO' && (
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="date"
              label="Fecha de Retiro"
              value={formData.retirementDate || ''}
              onChange={(e) => updateFormData({ retirementDate: e.target.value })}
              error={!!errors.retirementDate}
              helperText={errors.retirementDate || 'Requerido cuando está retirado'}
              InputLabelProps={{
                shrink: true,
              }}
            />
          </Grid>
        )}

        {/* Motivo de Suspensión/Retiro */}
        {(formData.status === 'SUSPENDIDO' || formData.status === 'RETIRADO') && (
          <Grid item xs={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label={`Motivo de ${
                formData.status === 'SUSPENDIDO' ? 'Suspensión' : 'Retiro'
              }`}
              value={formData.statusReason || ''}
              onChange={(e) => updateFormData({ statusReason: e.target.value })}
              placeholder="Describa brevemente el motivo..."
            />
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default Step3Clinical;
