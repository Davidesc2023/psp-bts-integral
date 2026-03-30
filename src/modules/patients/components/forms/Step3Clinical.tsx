import {
  Grid,
  TextField,
  MenuItem,
  Typography,
  Box,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { catalogService } from '@services/catalog.service';
import type { PatientFormData } from './types';

interface Step3ClinicalProps {
  formData: PatientFormData;
  updateFormData: (data: Partial<PatientFormData>) => void;
  errors: Record<string, string>;
}

// Estados permitidos al INGRESAR un paciente
const ENTRY_STATUS = [
  { value: 'EN_PROCESO', label: 'En Proceso' },
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'PRESCRITO_SIN_INICIO', label: 'Prescrito sin Inicio' },
];

const REGIMEN_OPTIONS = [
  { value: 'CONTRIBUTIVO', label: 'Contributivo' },
  { value: 'SUBSIDIADO', label: 'Subsidiado' },
  { value: 'ESPECIAL', label: 'Especial' },
  { value: 'EXCEPCION', label: 'Excepción' },
  { value: 'NO_AFILIADO', label: 'No Afiliado' },
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
 * - EPS, régimen e IPS
 * - Estado del paciente al ingreso (EN_PROCESO, ACTIVO, PRESCRITO_SIN_INICIO)
 * - Fechas según estado:
 *   · EN_PROCESO → solo fecha de ingreso
 *   · PRESCRITO_SIN_INICIO → solo fecha de ingreso
 *   · ACTIVO → fecha de ingreso + fecha de inicio de tratamiento
 */
const Step3Clinical = ({ formData, updateFormData, errors }: Step3ClinicalProps) => {
  const { data: epsList = [], isLoading: loadingEPS } = useQuery({
    queryKey: ['eps'],
    queryFn: catalogService.getEPSList,
  });

  const { data: ipsList = [], isLoading: loadingIPS } = useQuery({
    queryKey: ['ips'],
    queryFn: catalogService.getIPSList,
  });

  const isActivo = formData.status === 'ACTIVO';

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

        {/* Régimen */}
        <Grid item xs={12} sm={6}>
          <TextField
            select
            fullWidth
            label="Régimen *"
            value={formData.regime || ''}
            onChange={(e) => updateFormData({ regime: e.target.value })}
            error={!!errors.regime}
            helperText={errors.regime || 'Régimen de afiliación del paciente'}
          >
            <MenuItem value=""><em>Seleccione un régimen</em></MenuItem>
            {REGIMEN_OPTIONS.map((r) => (
              <MenuItem key={r.value} value={r.value}>
                {r.label}
              </MenuItem>
            ))}
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
        <Grid item xs={12} sm={6}>
          <TextField
            select
            fullWidth
            label="Estado de Ingreso *"
            value={formData.status || 'EN_PROCESO'}
            onChange={(e) => {
              // Al cambiar estado limpiar fecha de inicio de tratamiento si no es ACTIVO
              const newStatus = e.target.value;
              updateFormData({
                status: newStatus,
                treatmentStartDate: newStatus !== 'ACTIVO' ? '' : formData.treatmentStartDate,
              });
            }}
            error={!!errors.status}
            helperText={errors.status || 'Estado del paciente al momento del ingreso'}
          >
            {ENTRY_STATUS.map((s) => (
              <MenuItem key={s.value} value={s.value}>
                {s.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Descripción del estado seleccionado */}
        {formData.status === 'EN_PROCESO' && (
          <Grid item xs={12}>
            <Alert severity="info" sx={{ py: 0.5 }}>
              <strong>En Proceso:</strong> El paciente está en trámite de vinculación. Se registra la fecha de ingreso; la fecha de inicio de tratamiento se asigna cuando pase a estado Activo.
            </Alert>
          </Grid>
        )}
        {formData.status === 'PRESCRITO_SIN_INICIO' && (
          <Grid item xs={12}>
            <Alert severity="warning" sx={{ py: 0.5 }}>
              <strong>Prescrito sin Inicio:</strong> El paciente tiene prescripción médica pero aún no ha iniciado el tratamiento.
            </Alert>
          </Grid>
        )}
        {isActivo && (
          <Grid item xs={12}>
            <Alert severity="success" sx={{ py: 0.5 }}>
              <strong>Activo:</strong> Complete tanto la fecha de ingreso como la fecha de inicio de tratamiento.
            </Alert>
          </Grid>
        )}

        {/* Fecha de Ingreso — siempre visible */}
        <Grid item xs={12} sm={isActivo ? 6 : 6} md={isActivo ? 4 : 4}>
          <TextField
            fullWidth
            type="date"
            label="Fecha de Ingreso *"
            value={formData.startDate || ''}
            onChange={(e) => updateFormData({ startDate: e.target.value })}
            error={!!errors.startDate}
            helperText={errors.startDate || 'Fecha en que el paciente ingresa al programa'}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        {/* Fecha de Inicio de Tratamiento — solo cuando ACTIVO */}
        {isActivo && (
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              type="date"
              label="Fecha de Inicio de Tratamiento *"
              value={formData.treatmentStartDate || ''}
              onChange={(e) => updateFormData({ treatmentStartDate: e.target.value })}
              error={!!errors.treatmentStartDate}
              helperText={errors.treatmentStartDate || 'Fecha en que inicia el tratamiento'}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        )}

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
      </Grid>
    </Box>
  );
};

export default Step3Clinical;


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
