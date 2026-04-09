import {
  Grid,
  TextField,
  MenuItem,
  Typography,
  Box,
  FormControlLabel,
  Switch,
  Divider,
  Alert,
  CircularProgress,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { catalogService } from '@services/catalog.service';
import type { PatientFormData } from './types';

interface Step4GuardianConsentProps {
  formData: PatientFormData;
  updateFormData: (data: Partial<PatientFormData>) => void;
  errors: Record<string, string>;
}

const ENTRY_STATUS = [
  { value: 'EN_PROCESO', label: 'En Proceso' },
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'PRESCRITO_SIN_INICIO', label: 'Prescrito sin Inicio' },
  { value: 'INTERRUMPIDO', label: 'Interrumpido' },
  { value: 'DROP_OUT', label: 'Drop Out' },
  { value: 'RETIRADO', label: 'Retirado' },
  { value: 'FALLECIDO', label: 'Fallecido' },
];

const REGIMEN_OPTIONS = [
  { value: 'CONTRIBUTIVO', label: 'Contributivo' },
  { value: 'SUBSIDIADO', label: 'Subsidiado' },
  { value: 'ESPECIAL', label: 'Especial' },
  { value: 'EXCEPCION', label: 'Excepción' },
  { value: 'NO_AFILIADO', label: 'No Afiliado' },
];

const MOTIVO_RETIRO_OPTIONS = [
  { value: 'FALTA_ADHERENCIA', label: 'Falta de Adherencia' },
  { value: 'CAMBIO_TRATAMIENTO', label: 'Cambio de Tratamiento' },
  { value: 'ALTA_MEDICA', label: 'Alta Médica' },
  { value: 'FALLECIMIENTO', label: 'Fallecimiento' },
  { value: 'PERDIDA_SEGUIMIENTO', label: 'Pérdida de Seguimiento' },
  { value: 'SOLICITUD_PACIENTE', label: 'Solicitud del Paciente' },
  { value: 'CAMBIO_EPS', label: 'Cambio de EPS' },
  { value: 'OTRO', label: 'Otro' },
];

/**
 * Paso 4/6: Programa Clínico
 * EPS, IPS, tratamiento, laboratorio, médico, estado, fechas, MSL, RAM, educador, coordinador, etc.
 */
const Step4GuardianConsent = ({ formData, updateFormData, errors }: Step4GuardianConsentProps) => {
  const { data: epsList = [], isLoading: loadingEPS } = useQuery({
    queryKey: ['eps'],
    queryFn: catalogService.getEPSList,
  });

  const { data: ipsList = [], isLoading: loadingIPS } = useQuery({
    queryKey: ['ips'],
    queryFn: catalogService.getIPSList,
  });

  const { data: medications = [], isLoading: loadingMeds } = useQuery({
    queryKey: ['medications'],
    queryFn: catalogService.getMedications,
  });

  const { data: programas = [], isLoading: loadingProgramas } = useQuery({
    queryKey: ['programas'],
    queryFn: catalogService.getProgramas,
  });

  const { data: labs = [], isLoading: loadingLabs } = useQuery({
    queryKey: ['laboratories'],
    queryFn: catalogService.getLaboratories,
  });

  const { data: doctors = [], isLoading: loadingDoctors } = useQuery({
    queryKey: ['doctors'],
    queryFn: catalogService.getDoctors,
  });

  const isRetiro = formData.status === 'DROP_OUT' || formData.status === 'RETIRADO';
  const isActivo = formData.status === 'ACTIVO';

  return (
    <Box>
      <Typography variant="h6" gutterBottom fontWeight="bold" color="primary">
        Programa Clínico
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Información del programa PSP, aseguramiento y datos clínicos del paciente
      </Typography>

      <Grid container spacing={3}>
        {/* EPS */}
        <Grid item xs={12} sm={6} md={4}>
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
            {loadingEPS ? <MenuItem disabled><CircularProgress size={20} /></MenuItem>
              : epsList.map((e) => <MenuItem key={e.id} value={e.id}>{e.name}</MenuItem>)}
          </TextField>
        </Grid>

        {/* Régimen */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            fullWidth
            label="Régimen"
            value={formData.regime || ''}
            onChange={(e) => updateFormData({ regime: e.target.value })}
          >
            <MenuItem value=""><em>No especificado</em></MenuItem>
            {REGIMEN_OPTIONS.map((r) => <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>)}
          </TextField>
        </Grid>

        {/* IPS (afiliada/aseguradora) */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            fullWidth
            label="IPS Aseguradora"
            value={formData.ipsId || ''}
            onChange={(e) => updateFormData({ ipsId: Number(e.target.value) })}
            disabled={loadingIPS}
          >
            <MenuItem value=""><em>No especificado</em></MenuItem>
            {loadingIPS ? <MenuItem disabled><CircularProgress size={20} /></MenuItem>
              : ipsList.map((i) => <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>)}
          </TextField>
        </Grid>

        {/* IPS Tratante */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            fullWidth
            label="IPS Tratante Principal"
            value={formData.ipsTratanteId || ''}
            onChange={(e) => updateFormData({ ipsTratanteId: Number(e.target.value) })}
            disabled={loadingIPS}
          >
            <MenuItem value=""><em>No especificado</em></MenuItem>
            {ipsList.map((i) => <MenuItem key={i.id} value={i.id}>{i.name}</MenuItem>)}
          </TextField>
        </Grid>

        {/* Tratamiento / Medicamento */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            fullWidth
            label="Tratamiento / Medicamento"
            value={formData.tratamientoId || ''}
            onChange={(e) => updateFormData({ tratamientoId: Number(e.target.value) })}
            disabled={loadingMeds}
          >
            <MenuItem value=""><em>No especificado</em></MenuItem>
            {loadingMeds ? <MenuItem disabled><CircularProgress size={20} /></MenuItem>
              : medications.map((m: any) => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
          </TextField>
        </Grid>

        {/* Programa PSP */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            fullWidth
            label="Programa PSP"
            value={formData.programaId || ''}
            onChange={(e) => updateFormData({ programaId: e.target.value })}
            disabled={loadingProgramas}
          >
            <MenuItem value=""><em>No especificado</em></MenuItem>
            {loadingProgramas ? <MenuItem disabled><CircularProgress size={20} /></MenuItem>
              : programas.map((p: any) => <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>)}
          </TextField>
        </Grid>

        {/* Laboratorio */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            fullWidth
            label="Laboratorio"
            value={formData.laboratorioId || ''}
            onChange={(e) => updateFormData({ laboratorioId: Number(e.target.value) })}
            disabled={loadingLabs}
          >
            <MenuItem value=""><em>No especificado</em></MenuItem>
            {loadingLabs ? <MenuItem disabled><CircularProgress size={20} /></MenuItem>
              : labs.map((l: any) => <MenuItem key={l.id} value={l.id}>{l.name}</MenuItem>)}
          </TextField>
        </Grid>

        {/* Médico Tratante */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            fullWidth
            label="Médico Tratante"
            value={formData.medicoId || ''}
            onChange={(e) => updateFormData({ medicoId: Number(e.target.value) })}
            disabled={loadingDoctors}
          >
            <MenuItem value=""><em>No especificado</em></MenuItem>
            {loadingDoctors ? <MenuItem disabled><CircularProgress size={20} /></MenuItem>
              : doctors.map((d: any) => <MenuItem key={d.id} value={d.id}>{d.full_name ?? `${d.first_name} ${d.last_name}`}</MenuItem>)}
          </TextField>
        </Grid>

        {/* Diagnóstico / Enfermedad */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            label="Diagnóstico / Enfermedad"
            value={formData.enfermedad || ''}
            onChange={(e) => updateFormData({ enfermedad: e.target.value })}
            placeholder="CIE-10 o descripción"
          />
        </Grid>

        <Grid item xs={12}><Divider textAlign="left">Estado y Fechas</Divider></Grid>

        {/* Estado */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            select
            fullWidth
            label="Estado en el Programa *"
            value={formData.status || 'EN_PROCESO'}
            onChange={(e) => updateFormData({ status: e.target.value, treatmentStartDate: e.target.value !== 'ACTIVO' ? formData.treatmentStartDate : formData.treatmentStartDate })}
            error={!!errors.status}
            helperText={errors.status}
          >
            {ENTRY_STATUS.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
          </TextField>
        </Grid>

        {/* Fecha Ingreso PSP */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            type="date"
            label="Fecha de Ingreso al PSP *"
            value={formData.startDate || ''}
            onChange={(e) => updateFormData({ startDate: e.target.value })}
            error={!!errors.startDate}
            helperText={errors.startDate}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        {/* Fecha Activación */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            type="date"
            label="Fecha de Activación"
            value={formData.fechaActivacion || ''}
            onChange={(e) => updateFormData({ fechaActivacion: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>

        {/* Fecha inicio tratamiento (si ACTIVO) */}
        {isActivo && (
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth
              type="date"
              label="Fecha de Inicio de Tratamiento *"
              value={formData.treatmentStartDate || ''}
              onChange={(e) => updateFormData({ treatmentStartDate: e.target.value })}
              error={!!errors.treatmentStartDate}
              helperText={errors.treatmentStartDate}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        )}

        {/* Retiro/Drop Out */}
        {isRetiro && (
          <>
            <Grid item xs={12}>
              <Alert severity="warning">
                Al marcar como <strong>{formData.status === 'DROP_OUT' ? 'Drop Out' : 'Retirado'}</strong>, los datos sensibles del paciente serán anonimizados conforme a la Ley 1581/2012 (Colombia) al guardar.
              </Alert>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                select
                fullWidth
                label="Motivo de Retiro *"
                value={formData.motivoRetiro || ''}
                onChange={(e) => updateFormData({ motivoRetiro: e.target.value })}
                error={!!errors.motivoRetiro}
                helperText={errors.motivoRetiro}
              >
                {MOTIVO_RETIRO_OPTIONS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <TextField
                fullWidth
                type="date"
                label="Fecha de Retiro *"
                value={formData.fechaRetiro || ''}
                onChange={(e) => updateFormData({ fechaRetiro: e.target.value })}
                error={!!errors.fechaRetiro}
                helperText={errors.fechaRetiro}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            {formData.motivoRetiro === 'CAMBIO_TRATAMIENTO' && (
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Medicamento Destino (cambio)"
                  value={formData.cambioTratamientoDestino || ''}
                  onChange={(e) => updateFormData({ cambioTratamientoDestino: e.target.value })}
                  placeholder="Nombre del nuevo tratamiento"
                />
              </Grid>
            )}
          </>
        )}

        <Grid item xs={12}><Divider textAlign="left">Gestión Operativa</Divider></Grid>

        {/* MSL */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            label="MSL (Medical Science Liaison)"
            value={formData.msl || ''}
            onChange={(e) => updateFormData({ msl: e.target.value })}
          />
        </Grid>

        {/* RAM */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            label="RAM (Responsable Atención Médica)"
            value={formData.ram || ''}
            onChange={(e) => updateFormData({ ram: e.target.value })}
          />
        </Grid>

        {/* Fundación */}
        <Grid item xs={12} sm={6} md={4}>
          <TextField
            fullWidth
            label="Fundación"
            value={formData.fundacion || ''}
            onChange={(e) => updateFormData({ fundacion: e.target.value })}
          />
        </Grid>

        {/* Observaciones */}
        <Grid item xs={12}>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Observaciones Generales"
            value={formData.observaciones || ''}
            onChange={(e) => updateFormData({ observaciones: e.target.value })}
          />
        </Grid>

        {/* Tutela */}
        <Grid item xs={12} sm={6} md={3}>
          <FormControlLabel
            control={
              <Switch
                checked={formData.tutela ?? false}
                onChange={(e) => updateFormData({ tutela: e.target.checked })}
                color="warning"
              />
            }
            label="¿Tiene Tutela?"
          />
        </Grid>

        {formData.tutela && (
          <Grid item xs={12} sm={6} md={3}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.fallaTutela ?? false}
                  onChange={(e) => updateFormData({ fallaTutela: e.target.checked })}
                  color="error"
                />
              }
              label="¿Falla de Tutela?"
            />
          </Grid>
        )}

        {/* Vacunas */}
        <Grid item xs={12} sm={6}>
          <TextField
            fullWidth
            label="Vacunas requeridas / estado"
            value={formData.vacunas || ''}
            onChange={(e) => updateFormData({ vacunas: e.target.value })}
            placeholder="Ej: COVID-19 completo, Influenza pendiente"
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default Step4GuardianConsent;
