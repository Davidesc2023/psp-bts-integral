import { useEffect } from 'react';
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
import {
  EDUCATION_LEVELS,
  MARITAL_STATUS,
  OCCUPATIONS,
} from './constants';
import type { PatientFormData } from './types';

interface Step2SociodemographicProps {
  formData: PatientFormData;
  updateFormData: (data: Partial<PatientFormData>) => void;
  errors: Record<string, string>;
}

const RESIDENCE_ZONES = [
  { value: 'URBANO', label: 'Urbano' },
  { value: 'RURAL', label: 'Rural' },
];

const STRATUMS = [
  { value: 1, label: 'Estrato 1' },
  { value: 2, label: 'Estrato 2' },
  { value: 3, label: 'Estrato 3' },
  { value: 4, label: 'Estrato 4' },
  { value: 5, label: 'Estrato 5' },
  { value: 6, label: 'Estrato 6' },
];

/**
 * Paso 2/4: Datos Sociodemográficos
 * - Ubicación: país, departamento, ciudad
 * - Zona de residencia, estrato socioeconómico
 * - Estado civil, nivel educativo, ocupación
 */
const Step2Sociodemographic = ({
  formData,
  updateFormData,
  errors,
}: Step2SociodemographicProps) => {
  // Queries para catálogos
  const { data: departments = [], isLoading: loadingDepartments } = useQuery({
    queryKey: ['departments'],
    queryFn: catalogService.getDepartments,
  });

  const { data: cities = [], isLoading: loadingCities } = useQuery({
    queryKey: ['cities', formData.departmentId],
    queryFn: () => catalogService.getCitiesByDepartment(formData.departmentId!),
    enabled: !!formData.departmentId,
  });

  // Limpiar ciudad cuando cambia el departamento
  useEffect(() => {
    if (formData.departmentId) {
      updateFormData({ cityId: undefined });
    }
  }, [formData.departmentId]);

  return (
    <Box>
      <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
        Información Sociodemográfica
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Datos sobre ubicación geográfica y características socioeconómicas
      </Typography>

      <Grid container spacing={3}>
        {/* País (Por ahora solo Colombia) */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            label="País *"
            value="Colombia"
            disabled
            helperText="Por defecto: Colombia"
          />
        </Grid>

        {/* Departamento */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            fullWidth
            label="Departamento *"
            value={formData.departmentId || ''}
            onChange={(e) =>
              updateFormData({ departmentId: Number(e.target.value) })
            }
            error={!!errors.departmentId}
            helperText={errors.departmentId}
            disabled={loadingDepartments}
          >
            {loadingDepartments ? (
              <MenuItem disabled>
                <CircularProgress size={20} />
              </MenuItem>
            ) : (
              departments.map((dept) => (
                <MenuItem key={dept.id} value={dept.id}>
                  {dept.name}
                </MenuItem>
              ))
            )}
          </TextField>
        </Grid>

        {/* Ciudad */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            fullWidth
            label="Ciudad *"
            value={formData.cityId || ''}
            onChange={(e) => updateFormData({ cityId: Number(e.target.value) })}
            error={!!errors.cityId}
            helperText={errors.cityId}
            disabled={!formData.departmentId || loadingCities}
          >
            {loadingCities ? (
              <MenuItem disabled>
                <CircularProgress size={20} />
              </MenuItem>
            ) : cities.length === 0 ? (
              <MenuItem disabled>Seleccione un departamento primero</MenuItem>
            ) : (
              cities.map((city) => (
                <MenuItem key={city.id} value={city.id}>
                  {city.name}
                </MenuItem>
              ))
            )}
          </TextField>
        </Grid>

        {/* Zona de Residencia */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            fullWidth
            label="Zona de Residencia *"
            value={formData.residenceZone || ''}
            onChange={(e) => updateFormData({ residenceZone: e.target.value })}
            error={!!errors.residenceZone}
            helperText={errors.residenceZone}
          >
            {RESIDENCE_ZONES.map((zone) => (
              <MenuItem key={zone.value} value={zone.value}>
                {zone.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Estrato Socioeconómico */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            fullWidth
            label="Estrato Socioeconómico *"
            value={formData.stratum || ''}
            onChange={(e) => updateFormData({ stratum: Number(e.target.value) })}
            error={!!errors.stratum}
            helperText={errors.stratum}
          >
            {STRATUMS.map((stratum) => (
              <MenuItem key={stratum.value} value={stratum.value}>
                {stratum.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Estado Civil */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            fullWidth
            label="Estado Civil *"
            value={formData.maritalStatus || ''}
            onChange={(e) => updateFormData({ maritalStatus: e.target.value })}
            error={!!errors.maritalStatus}
            helperText={errors.maritalStatus}
          >
            {MARITAL_STATUS.map((status) => (
              <MenuItem key={status.value} value={status.value}>
                {status.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Nivel Educativo */}
        <Grid item xs={12} sm={6}>
          <TextField
            select
            fullWidth
            label="Nivel Educativo"
            value={formData.educationLevel || ''}
            onChange={(e) => updateFormData({ educationLevel: e.target.value })}
            error={!!errors.educationLevel}
            helperText={errors.educationLevel || 'Opcional'}
          >
            <MenuItem value="">
              <em>No especificado</em>
            </MenuItem>
            {EDUCATION_LEVELS.map((level) => (
              <MenuItem key={level.value} value={level.value}>
                {level.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Ocupación */}
        <Grid item xs={12} sm={6}>
          <TextField
            select
            fullWidth
            label="Ocupación"
            value={formData.occupation || ''}
            onChange={(e) => updateFormData({ occupation: e.target.value })}
            helperText="Opcional"
          >
            <MenuItem value=""><em>No especificado</em></MenuItem>
            {OCCUPATIONS.map((occ) => (
              <MenuItem key={occ.value} value={occ.value}>
                {occ.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Step2Sociodemographic;
