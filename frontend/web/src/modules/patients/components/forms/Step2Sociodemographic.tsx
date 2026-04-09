import {
  Grid,
  TextField,
  MenuItem,
  Typography,
  Box,
} from '@mui/material';
import { GENDERS, MARITAL_STATUS, EDUCATION_LEVELS, OCCUPATIONS } from './constants';
import type { PatientFormData } from './types';

interface Step2SociodemographicProps {
  formData: PatientFormData;
  updateFormData: (data: Partial<PatientFormData>) => void;
  errors: Record<string, string>;
}

/**
 * Paso 2/6: Datos Personales
 * Género, teléfonos de contacto, email y datos sociodemográficos
 * (Fecha de nacimiento y validación de tipo de documento están en el Paso 1)
 */
const Step2Sociodemographic = ({ formData, updateFormData, errors }: Step2SociodemographicProps) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
        Datos Personales y de Contacto
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Información de contacto y datos sociodemográficos del paciente
      </Typography>

      <Grid container spacing={3}>
        {/* Género */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            fullWidth
            label="Género *"
            value={formData.gender}
            onChange={(e) => updateFormData({ gender: e.target.value })}
            error={!!errors.gender}
            helperText={errors.gender}
          >
            {GENDERS.map((g) => (
              <MenuItem key={g.value} value={g.value}>{g.label}</MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Teléfono Principal */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            label="Teléfono Principal *"
            value={formData.phone}
            onChange={(e) => updateFormData({ phone: e.target.value })}
            error={!!errors.phone}
            helperText={errors.phone}
            placeholder="3001234567"
          />
        </Grid>

        {/* Teléfono Alternativo */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            label="Teléfono Alternativo"
            value={formData.alternativePhone || ''}
            onChange={(e) => updateFormData({ alternativePhone: e.target.value })}
            placeholder="3009876543"
          />
        </Grid>

        {/* Teléfono 3 */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            label="Teléfono Adicional"
            value={formData.phone3 || ''}
            onChange={(e) => updateFormData({ phone3: e.target.value })}
            placeholder="Otro número de contacto"
          />
        </Grid>

        {/* Email */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            type="email"
            label="Correo Electrónico"
            value={formData.email || ''}
            onChange={(e) => updateFormData({ email: e.target.value })}
            error={!!errors.email}
            helperText={errors.email}
            placeholder="ejemplo@correo.com"
          />
        </Grid>

        {/* Estado Civil */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            fullWidth
            label="Estado Civil"
            value={formData.maritalStatus || ''}
            onChange={(e) => updateFormData({ maritalStatus: e.target.value })}
          >
            <MenuItem value=""><em>No especificado</em></MenuItem>
            {MARITAL_STATUS.map((s) => (
              <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Nivel Educativo */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            fullWidth
            label="Nivel Educativo"
            value={formData.educationLevel || ''}
            onChange={(e) => updateFormData({ educationLevel: e.target.value })}
          >
            <MenuItem value=""><em>No especificado</em></MenuItem>
            {EDUCATION_LEVELS.map((l) => (
              <MenuItem key={l.value} value={l.value}>{l.label}</MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Ocupación */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            fullWidth
            label="Ocupación"
            value={formData.occupation || ''}
            onChange={(e) => updateFormData({ occupation: e.target.value })}
          >
            <MenuItem value=""><em>No especificado</em></MenuItem>
            {OCCUPATIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Step2Sociodemographic;
