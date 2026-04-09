import { useEffect } from 'react';
import {
  Grid,
  TextField,
  MenuItem,
  Typography,
  Box,
  Chip,
  Alert,
} from '@mui/material';
import { DOCUMENT_TYPES } from './constants';
import type { PatientFormData } from './types';

interface Step1BasicDataProps {
  formData: PatientFormData;
  updateFormData: (data: Partial<PatientFormData>) => void;
  errors: Record<string, string>;
}

function calcIniciales(firstName: string, firstLastName: string): string {
  const f = firstName?.trim()[0]?.toUpperCase() ?? '';
  const l = firstLastName?.trim()[0]?.toUpperCase() ?? '';
  return `${f}${l}`;
}

function calcAge(birthDate: string): number {
  if (!birthDate) return -1;
  const today = new Date();
  const dob = new Date(birthDate);
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age;
}

function docAgeWarning(docType: string, birthDate: string): string | null {
  if (!birthDate || !docType) return null;
  const age = calcAge(birthDate);
  if (age < 0) return null;
  if (docType === 'CC' && age < 18)
    return `La Cédula de Ciudadanía es para mayores de 18 años. El paciente tiene ${age} años.`;
  if (docType === 'TI' && (age < 7 || age > 17))
    return `La Tarjeta de Identidad es para personas de 7 a 17 años. El paciente tiene ${age} años.`;
  if (docType === 'RC' && age >= 7)
    return `El Registro Civil es para menores de 7 años. El paciente tiene ${age} años.`;
  if (docType === 'MS' && age >= 18)
    return `El documento "Menor sin identificación" es para menores de 18 años. El paciente tiene ${age} años.`;
  return null;
}

/**
 * Paso 1/6: Identificación
 * Tipo/número de documento + fecha de nacimiento (validación cruzada) + nombres + iniciales
 */
const Step1BasicData = ({ formData, updateFormData, errors }: Step1BasicDataProps) => {
  useEffect(() => {
    const ini = calcIniciales(formData.firstName, formData.firstLastName);
    if (ini !== formData.iniciales) {
      updateFormData({ iniciales: ini });
    }
  }, [formData.firstName, formData.firstLastName]);

  const ageWarning = docAgeWarning(formData.documentType, formData.birthDate);
  const age = calcAge(formData.birthDate);

  return (
    <Box>
      <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
        Datos de Identificación
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Ingrese el tipo y número de documento, la fecha de nacimiento y los nombres completos del paciente
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

        {/* Fecha de Nacimiento — aquí junto al tipo de documento para validación cruzada */}
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            type="date"
            label="Fecha de Nacimiento *"
            value={formData.birthDate || ''}
            onChange={(e) => updateFormData({ birthDate: e.target.value })}
            error={!!errors.birthDate}
            helperText={errors.birthDate || (age >= 0 ? `Edad: ${age} años` : '')}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        {/* Alerta de coherencia tipo documento / edad */}
        {ageWarning && (
          <Grid item xs={12}>
            <Alert severity="warning">⚠️ {ageWarning}</Alert>
          </Grid>
        )}

        {/* Iniciales (auto-calculadas) */}
        <Grid item xs={12} sm={6} md={3} sx={{ display: 'flex', alignItems: 'center', pt: '28px !important' }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Iniciales (auto)</Typography>
            <Box>
              <Chip
                label={formData.iniciales || '—'}
                color="primary"
                variant="outlined"
                sx={{ mt: 0.5, fontWeight: 'bold', fontSize: '1rem', minWidth: 60 }}
              />
            </Box>
          </Box>
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
        <Grid item xs={12} sm={6} md={3}>
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
        <Grid item xs={12} sm={6} md={3}>
          <TextField
            fullWidth
            label="Segundo Apellido"
            value={formData.secondLastName || ''}
            onChange={(e) => updateFormData({ secondLastName: e.target.value })}
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Step1BasicData;
