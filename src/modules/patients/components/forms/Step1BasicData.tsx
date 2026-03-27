import {
  Grid,
  TextField,
  MenuItem,
  Typography,
  Box,
} from '@mui/material';
import { DOCUMENT_TYPES, GENDERS } from './constants';
import type { PatientFormData } from './types';

interface Step1BasicDataProps {
  formData: PatientFormData;
  updateFormData: (data: Partial<PatientFormData>) => void;
  errors: Record<string, string>;
}

/**
 * Paso 1/4: Datos Básicos + Contacto
 * - Identificación, nombres, fecha de nacimiento, género
 * - Teléfono, email, dirección
 */
const Step1BasicData = ({ formData, updateFormData, errors }: Step1BasicDataProps) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
        Información Personal
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Complete los datos de identificación y contacto del paciente
      </Typography>

      <Grid container spacing={3}>
        {/* Tipo de Documento */}
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            select
            fullWidth
            label="Tipo de Documento *"
            value={formData.documentType}
            onChange={(e) => updateFormData({ documentType: e.target.value })}
            error={!!errors.documentType}
            helperText={errors.documentType}
          >
            {DOCUMENT_TYPES.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                {type.label}
              </MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Número de Documento */}
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            label="Número de Documento *"
            value={formData.documentNumber}
            onChange={(e) => updateFormData({ documentNumber: e.target.value })}
            error={!!errors.documentNumber}
            helperText={errors.documentNumber}
          />
        </Grid>

        {/* Primer Nombre */}
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            label="Primer Nombre *"
            value={formData.firstName}
            onChange={(e) => updateFormData({ firstName: e.target.value })}
            error={!!errors.firstName}
            helperText={errors.firstName}
          />
        </Grid>

        {/* Segundo Nombre */}
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            label="Segundo Nombre"
            value={formData.secondName || ''}
            onChange={(e) => updateFormData({ secondName: e.target.value })}
          />
        </Grid>

        {/* Primer Apellido */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Primer Apellido *"
            value={formData.firstLastName}
            onChange={(e) => updateFormData({ firstLastName: e.target.value })}
            error={!!errors.firstLastName}
            helperText={errors.firstLastName}
          />
        </Grid>

        {/* Segundo Apellido */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Segundo Apellido"
            value={formData.secondLastName || ''}
            onChange={(e) => updateFormData({ secondLastName: e.target.value })}
          />
        </Grid>

        {/* Fecha de Nacimiento */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            type="date"
            label="Fecha de Nacimiento *"
            value={formData.birthDate}
            onChange={(e) => updateFormData({ birthDate: e.target.value })}
            error={!!errors.birthDate}
            helperText={errors.birthDate}
            InputLabelProps={{
              shrink: true,
            }}
          />
        </Grid>

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
            {GENDERS.map((gender) => (
              <MenuItem key={gender.value} value={gender.value}>
                {gender.label}
              </MenuItem>
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
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Teléfono Alternativo"
            value={formData.alternativePhone || ''}
            onChange={(e) => updateFormData({ alternativePhone: e.target.value })}
            placeholder="3009876543"
          />
        </Grid>

        {/* Email */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            type="email"
            label="Correo Electrónico *"
            value={formData.email}
            onChange={(e) => updateFormData({ email: e.target.value })}
            error={!!errors.email}
            helperText={errors.email}
            placeholder="ejemplo@correo.com"
          />
        </Grid>

        {/* Dirección */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Dirección de Residencia *"
            value={formData.address}
            onChange={(e) => updateFormData({ address: e.target.value })}
            error={!!errors.address}
            helperText={errors.address}
            placeholder="Calle 123 # 45-67, Apto 801"
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Step1BasicData;
