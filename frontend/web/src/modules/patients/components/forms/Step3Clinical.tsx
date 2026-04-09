import { useEffect, useRef } from 'react';
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

const RESIDENCE_ZONES = [
  { value: 'URBANO', label: 'Urbano' },
  { value: 'RURAL', label: 'Rural' },
];

const STRATUMS = [1, 2, 3, 4, 5, 6].map((n) => ({ value: n, label: `Estrato ${n}` }));

/**
 * Paso 3/6: Ubicación
 * Departamento, ciudad, dirección, comunidad, barrio, zona, estrato
 */
const Step3Clinical = ({ formData, updateFormData, errors }: Step3ClinicalProps) => {
  const { data: departments = [], isLoading: loadingDepts } = useQuery({
    queryKey: ['departments'],
    queryFn: catalogService.getDepartments,
  });

  const { data: cities = [], isLoading: loadingCities } = useQuery({
    queryKey: ['cities', formData.departmentId],
    queryFn: () => catalogService.getCitiesByDepartment(formData.departmentId!),
    enabled: !!formData.departmentId,
  });

  const prevDeptRef = useRef<number | undefined>(formData.departmentId);
  useEffect(() => {
    if (prevDeptRef.current !== undefined && prevDeptRef.current !== formData.departmentId) {
      updateFormData({ cityId: undefined });
    }
    prevDeptRef.current = formData.departmentId;
  }, [formData.departmentId]);

  return (
    <Box>
      <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
        Ubicación y Residencia
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Datos sobre la ubicación geográfica del paciente
      </Typography>

      <Grid container spacing={3}>
        {/* Departamento */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            fullWidth
            label="Departamento *"
            value={formData.departmentId || ''}
            onChange={(e) => updateFormData({ departmentId: Number(e.target.value) })}
            error={!!errors.departmentId}
            helperText={errors.departmentId}
            disabled={loadingDepts}
          >
            {loadingDepts ? (
              <MenuItem disabled><CircularProgress size={20} /></MenuItem>
            ) : (
              departments.map((d) => (
                <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>
              ))
            )}
          </TextField>
        </Grid>

        {/* Ciudad */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            fullWidth
            label="Ciudad/Municipio *"
            value={formData.cityId || ''}
            onChange={(e) => updateFormData({ cityId: Number(e.target.value) })}
            error={!!errors.cityId}
            helperText={errors.cityId}
            disabled={!formData.departmentId || loadingCities}
          >
            {loadingCities ? (
              <MenuItem disabled><CircularProgress size={20} /></MenuItem>
            ) : cities.length === 0 ? (
              <MenuItem disabled>Seleccione un departamento primero</MenuItem>
            ) : (
              cities.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))
            )}
          </TextField>
        </Grid>

        {/* Zona de Residencia */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            fullWidth
            label="Zona de Residencia"
            value={formData.residenceZone || ''}
            onChange={(e) => updateFormData({ residenceZone: e.target.value })}
          >
            <MenuItem value=""><em>No especificado</em></MenuItem>
            {RESIDENCE_ZONES.map((z) => (
              <MenuItem key={z.value} value={z.value}>{z.label}</MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Dirección */}
        <Grid item xs={12} sm={8}>
          <TextField
            fullWidth
            label="Dirección de Residencia"
            value={formData.address || ''}
            onChange={(e) => updateFormData({ address: e.target.value })}
            placeholder="Calle 123 # 45-67, Apto 801"
          />
        </Grid>

        {/* Estrato */}
        <Grid item xs={12} sm={4} md={2}>
          <TextField
            select
            fullWidth
            label="Estrato"
            value={formData.stratum || ''}
            onChange={(e) => updateFormData({ stratum: Number(e.target.value) })}
          >
            <MenuItem value=""><em>—</em></MenuItem>
            {STRATUMS.map((s) => (
              <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Comunidad */}
        <Grid item xs={12} sm={6} md={5}>
          <TextField
            fullWidth
            label="Comunidad / Vereda / Corregimiento"
            value={formData.comunidad || ''}
            onChange={(e) => updateFormData({ comunidad: e.target.value })}
            placeholder="Nombre de la comunidad o vereda"
          />
        </Grid>

        {/* Barrio */}
        <Grid item xs={12} sm={6} md={5}>
          <TextField
            fullWidth
            label="Barrio / Sector"
            value={formData.barrio || ''}
            onChange={(e) => updateFormData({ barrio: e.target.value })}
            placeholder="Nombre del barrio"
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Step3Clinical;
