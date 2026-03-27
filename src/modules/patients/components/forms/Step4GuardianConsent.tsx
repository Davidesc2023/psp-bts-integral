import {
  Grid,
  TextField,
  Typography,
  Box,
  FormControlLabel,
  Checkbox,
  Alert,
} from '@mui/material';
import FileUpload from '../FileUpload';
import type { PatientFormData } from './types';

interface Step4GuardianConsentProps {
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
  { value: 'OTRO', label: 'Otro' },
];

/**
 * Paso 4/4: Acudiente y Consentimiento Informado
 * - Datos del acudiente (nombre, relación, contacto)
 * - Consentimiento firmado (checkbox)
 * - Upload de documento PDF (cuando consentimiento = true)
 */
const Step4GuardianConsent = ({
  formData,
  updateFormData,
  errors,
}: Step4GuardianConsentProps) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
        Acudiente y Consentimiento Informado
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Información del acudiente y consentimiento para tratamiento de datos
      </Typography>

      <Grid container spacing={3}>
        {/* Información del Acudiente */}
        <Grid item xs={12}>
          <Typography
            variant="subtitle1"
            fontWeight="medium"
            color="text.primary"
            sx={{ mb: 2 }}
          >
            Datos del Acudiente
          </Typography>
        </Grid>

        {/* Nombre del Acudiente */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Nombre Completo del Acudiente"
            value={formData.guardianName || ''}
            onChange={(e) => updateFormData({ guardianName: e.target.value })}
            error={!!errors.guardianName}
            helperText={errors.guardianName || 'Opcional'}
            placeholder="Juan Pérez García"
          />
        </Grid>

        {/* Relación/Parentesco */}
        <Grid item xs={12} sm={6}>
          <TextField
            select
            fullWidth
            label="Relación con el Paciente"
            value={formData.guardianRelationship || ''}
            onChange={(e) =>
              updateFormData({ guardianRelationship: e.target.value })
            }
            error={!!errors.guardianRelationship}
            helperText={errors.guardianRelationship || 'Opcional'}
          >
            <option value=""></option>
            {GUARDIAN_RELATIONSHIPS.map((rel) => (
              <option key={rel.value} value={rel.value}>
                {rel.label}
              </option>
            ))}
          </TextField>
        </Grid>

        {/* Teléfono del Acudiente */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Teléfono del Acudiente"
            value={formData.guardianPhone || ''}
            onChange={(e) => updateFormData({ guardianPhone: e.target.value })}
            error={!!errors.guardianPhone}
            helperText={errors.guardianPhone || 'Opcional'}
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
            error={!!errors.guardianEmail}
            helperText={errors.guardianEmail || 'Opcional'}
            placeholder="acudiente@correo.com"
          />
        </Grid>

        {/* Dirección del Acudiente */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Dirección del Acudiente"
            value={formData.guardianAddress || ''}
            onChange={(e) => updateFormData({ guardianAddress: e.target.value })}
            error={!!errors.guardianAddress}
            helperText={errors.guardianAddress || 'Opcional'}
            placeholder="Calle 123 # 45-67"
          />
        </Grid>

        {/* Separador */}
        <Grid item xs={12} sx={{ mt: 2 }}>
          <Typography
            variant="subtitle1"
            fontWeight="medium"
            color="text.primary"
            sx={{ mb: 2 }}
          >
            Consentimiento Informado
          </Typography>
        </Grid>

        {/* Checkbox de Consentimiento */}
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.consentSigned || false}
                onChange={(e) =>
                  updateFormData({ consentSigned: e.target.checked })
                }
                color="primary"
              />
            }
            label={
              <Typography variant="body2">
                El paciente o su acudiente ha firmado el consentimiento informado
                para el tratamiento de datos personales y atención médica *
              </Typography>
            }
          />
          {errors.consentSigned && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {errors.consentSigned}
            </Alert>
          )}
        </Grid>

        {/* Upload de Documento PDF */}
        {formData.consentSigned && (
          <Grid item xs={12}>
            <Typography variant="body2" fontWeight="medium" sx={{ mb: 2 }}>
              Documento de Consentimiento Firmado *
            </Typography>
            <FileUpload
              value={formData.consentDocument || null}
              onChange={(file) => updateFormData({ consentDocument: file })}
              error={errors.consentDocument}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
              Por favor adjunte el consentimiento informado firmado en formato PDF
              (máximo 5MB)
            </Typography>
          </Grid>
        )}

        {!formData.consentSigned && (
          <Grid item xs={12}>
            <Alert severity="info">
              Marque la casilla de consentimiento para habilitar la carga del
              documento PDF
            </Alert>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default Step4GuardianConsent;
