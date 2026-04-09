import {
  Grid,
  TextField,
  MenuItem,
  Typography,
  Box,
} from '@mui/material';
import { DOCUMENT_TYPES } from './constants';
import type { PatientFormData } from './types';

interface Step5GuardianProps {
  formData: PatientFormData;
  updateFormData: (data: Partial<PatientFormData>) => void;
  errors: Record<string, string>;
}

const GUARDIAN_RELATIONSHIPS = [
  { value: 'PADRE', label: 'Padre' },
  { value: 'MADRE', label: 'Madre' },
  { value: 'HIJO', label: 'Hijo(a)' },
  { value: 'CONYUGE', label: 'Cónyuge' },
  { value: 'HERMANO', label: 'Hermano(a)' },
  { value: 'ABUELO', label: 'Abuelo(a)' },
  { value: 'TIO', label: 'Tío(a)' },
  { value: 'PRIMO', label: 'Primo(a)' },
  { value: 'AMIGO', label: 'Amigo(a)' },
  { value: 'TUTOR_LEGAL', label: 'Tutor Legal' },
  { value: 'CUIDADOR', label: 'Cuidador' },
  { value: 'OTRO', label: 'Otro' },
];

/**
 * Paso 5/6: Acudiente
 * Datos del acudiente/responsable del paciente, incluyendo documento de identidad
 */
const Step5Guardian = ({ formData, updateFormData, errors }: Step5GuardianProps) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
        Datos del Acudiente
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Información del familiar, cuidador o responsable del paciente (todos los campos son opcionales)
      </Typography>

      <Grid container spacing={3}>
        {/* Nombre del Acudiente */}
        <Grid item xs={12} sm={8}>
          <TextField
            fullWidth
            label="Nombre Completo del Acudiente"
            value={formData.guardianName || ''}
            onChange={(e) => updateFormData({ guardianName: e.target.value })}
            placeholder="Nombre completo"
          />
        </Grid>

        {/* Parentesco */}
        <Grid item xs={12} sm={4}>
          <TextField
            select
            fullWidth
            label="Parentesco / Relación"
            value={formData.guardianRelationship || ''}
            onChange={(e) => updateFormData({ guardianRelationship: e.target.value })}
          >
            <MenuItem value=""><em>No especificado</em></MenuItem>
            {GUARDIAN_RELATIONSHIPS.map((r) => (
              <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Tipo de documeto del acudiente */}
        <Grid item xs={12} sm={4}>
          <TextField
            select
            fullWidth
            label="Tipo de Documento Acudiente"
            value={formData.guardianDocumentType || 'CC'}
            onChange={(e) => updateFormData({ guardianDocumentType: e.target.value })}
          >
            {DOCUMENT_TYPES.map((t) => (
              <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
            ))}
          </TextField>
        </Grid>

        {/* Número de documento del acudiente */}
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Número de Documento Acudiente"
            value={formData.guardianDocumentNumber || ''}
            onChange={(e) => updateFormData({ guardianDocumentNumber: e.target.value })}
            placeholder="Número de identificación"
          />
        </Grid>

        {/* Teléfono del Acudiente */}
        <Grid item xs={12} sm={4}>
          <TextField
            fullWidth
            label="Teléfono del Acudiente"
            value={formData.guardianPhone || ''}
            onChange={(e) => updateFormData({ guardianPhone: e.target.value })}
            placeholder="3001234567"
          />
        </Grid>

        {/* Email del Acudiente */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            type="email"
            label="Correo Electrónico del Acudiente"
            value={formData.guardianEmail || ''}
            onChange={(e) => updateFormData({ guardianEmail: e.target.value })}
            placeholder="acudiente@correo.com"
          />
        </Grid>

        {/* Dirección del Acudiente */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Dirección del Acudiente"
            value={formData.guardianAddress || ''}
            onChange={(e) => updateFormData({ guardianAddress: e.target.value })}
            placeholder="Dirección de residencia"
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Step5Guardian;
