import {
  Grid,
  Typography,
  Box,
  FormControlLabel,
  Checkbox,
  Alert,
  Divider,
  Paper,
} from '@mui/material';
import FileUpload from '../FileUpload';
import type { PatientFormData } from './types';

interface Step6DocumentsProps {
  formData: PatientFormData;
  updateFormData: (data: Partial<PatientFormData>) => void;
  errors: Record<string, string>;
}

const CHECKLIST_ITEMS = [
  { key: 'tieneConsentimientoTratamiento', label: 'Consentimiento para Tratamiento Médico' },
  { key: 'tieneConsentimientoDatos', label: 'Consentimiento para Tratamiento de Datos Personales (Ley 1581/2012)' },
  { key: 'tieneCarnet', label: 'Carnet de Paciente PSP' },
  { key: 'tieneFormulaMedica', label: 'Fórmula Médica Vigente' },
  { key: 'tieneAutorizacion', label: 'Autorización de la EPS' },
  { key: 'tieneCopiaDocumento', label: 'Copia del Documento de Identidad' },
  { key: 'tieneEps', label: 'Copia del Carnet de la EPS' },
  { key: 'tieneHistoriaClinica', label: 'Historia Clínica Relevante' },
  { key: 'tieneRegistroFoto', label: 'Registro Fotográfico del Paciente' },
  { key: 'tieneOtrosDocumentos', label: 'Otros Documentos de Soporte' },
] as const;

/**
 * Paso 6/6: Documentos y Consentimientos
 * Lista de verificación documental + consentimiento informado firmado + upload PDF
 */
const Step6Documents = ({ formData, updateFormData, errors }: Step6DocumentsProps) => {
  return (
    <Box>
      <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
        Documentos y Consentimientos
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Verifique y registre los documentos recibidos del paciente
      </Typography>

      <Grid container spacing={3}>
        {/* Lista de verificación */}
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
              Lista de Verificación Documental
            </Typography>
            <Grid container spacing={1}>
              {CHECKLIST_ITEMS.map((item) => (
                <Grid item xs={12} sm={6} key={item.key}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={!!formData[item.key]}
                        onChange={(e) => updateFormData({ [item.key]: e.target.checked } as any)}
                        color="primary"
                        size="small"
                      />
                    }
                    label={<Typography variant="body2">{item.label}</Typography>}
                  />
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12}><Divider /></Grid>

        {/* Consentimiento Informado Principal */}
        <Grid item xs={12}>
          <FormControlLabel
            control={
              <Checkbox
                checked={formData.consentSigned || false}
                onChange={(e) => updateFormData({ consentSigned: e.target.checked })}
                color="primary"
              />
            }
            label={
              <Typography variant="body2">
                <strong>*</strong> El paciente o su acudiente ha firmado el consentimiento informado para el tratamiento de datos personales y atención médica
              </Typography>
            }
          />
          {errors.consentSigned && (
            <Alert severity="error" sx={{ mt: 1 }}>
              {errors.consentSigned}
            </Alert>
          )}
        </Grid>

        {/* Upload del documento PDF */}
        {formData.consentSigned && (
          <Grid item xs={12}>
            <Typography variant="body2" fontWeight="medium" sx={{ mb: 1 }}>
              Cargar Documento de Consentimiento (PDF)
            </Typography>
            <FileUpload
              value={formData.consentDocument ?? null}
              onChange={(file) => updateFormData({ consentDocument: file })}
              error={errors.consentDocument}
            />
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
              Formato PDF, máximo 200 KB. Si no lo tiene disponible ahora, puede cargarlo desde el detalle del paciente.
            </Typography>
          </Grid>
        )}

        {!formData.consentSigned && (
          <Grid item xs={12}>
            <Alert severity="info">
              Marque el consentimiento informado para habilitar la carga del documento PDF.
            </Alert>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};

export default Step6Documents;
