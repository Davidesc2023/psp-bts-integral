import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Stack,
  Typography,
  Card,
  CardContent,
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  LocalHospital as HospitalIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  EventBusy as NoAsistioIcon,
  MedicalServices as SoapIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { consultaService } from '@services/consultaService';
import type {
  ConsultaMedica,
  CreateConsultaRequest,
  RegistrarResultadoConsultaRequest,
} from '../../types/consulta.types';
import { TipoConsulta, EstadoConsulta } from '../../types/consulta.types';
import { PatientSelector } from '@modules/shared/components/PatientSelector';
import type { Patient } from '@/types';
import { supabase } from '@services/supabaseClient';

// ── colores de estado ───────────────────────────────────────────────────────
const ESTADO_COLOR: Record<EstadoConsulta, 'info' | 'success' | 'default' | 'error'> = {
  [EstadoConsulta.PROGRAMADA]: 'info',
  [EstadoConsulta.REALIZADA]: 'success',
  [EstadoConsulta.CANCELADA]: 'default',
  [EstadoConsulta.NO_ASISTIO]: 'error',
};

const ESTADO_LABEL: Record<EstadoConsulta, string> = {
  [EstadoConsulta.PROGRAMADA]: 'Programada',
  [EstadoConsulta.REALIZADA]: 'Realizada',
  [EstadoConsulta.CANCELADA]: 'Cancelada',
  [EstadoConsulta.NO_ASISTIO]: 'No asistió',
};

const TIPO_LABEL: Record<TipoConsulta, string> = {
  [TipoConsulta.INICIAL]: 'Consulta Inicial',
  [TipoConsulta.SEGUIMIENTO]: 'Seguimiento',
  [TipoConsulta.CONTROL]: 'Control',
  [TipoConsulta.URGENCIA]: 'Urgencia',
  [TipoConsulta.TELECONSULTA]: 'Teleconsulta',
};

// ── componente principal ────────────────────────────────────────────────────
export const ConsultasPage = () => {
  const [consultas, setConsultas] = useState<ConsultaMedica[]>([]);
  const [loading, setLoading] = useState(false);
  const [openCrearDialog, setOpenCrearDialog] = useState(false);
  const [openResultadoDialog, setOpenResultadoDialog] = useState(false);
  const [selectedConsulta, setSelectedConsulta] = useState<ConsultaMedica | null>(null);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [medicos, setMedicos] = useState<{ id: string; nombre: string }[]>([]);
  const [error, setError] = useState('');

  // Formulario de creación
  const [crearForm, setCrearForm] = useState<Partial<CreateConsultaRequest>>({});
  // Formulario de resultado (SOAP + signos vitales)
  const [resultadoForm, setResultadoForm] = useState<Partial<RegistrarResultadoConsultaRequest>>({});

  useEffect(() => {
    loadConsultas();
    loadMedicos();
  }, []);

  const loadConsultas = async () => {
    setLoading(true);
    try {
      const data = await consultaService.getAll(0, 50);
      setConsultas(data.content ?? []);
    } catch (e) {
      console.error('Error cargando consultas médicas:', e);
      setError('No se pudieron cargar las consultas médicas.');
    } finally {
      setLoading(false);
    }
  };

  const loadMedicos = async () => {
    try {
      const { data } = await supabase
        .from('doctors')
        .select('id, nombre, apellido')
        .order('apellido');
      setMedicos(
        (data ?? []).map((d: any) => ({
          id: d.id,
          nombre: `Dr. ${d.nombre ?? ''} ${d.apellido ?? ''}`.trim(),
        }))
      );
    } catch (e) {
      console.error('Error cargando médicos:', e);
    }
  };

  const handleCrear = async () => {
    if (!crearForm.pacienteId || !crearForm.tipo || !crearForm.fechaProgramada) {
      setError('Paciente, tipo y fecha programada son obligatorios.');
      return;
    }
    try {
      await consultaService.create(crearForm as CreateConsultaRequest);
      setOpenCrearDialog(false);
      setCrearForm({});
      setSelectedPatient(null);
      setError('');
      loadConsultas();
    } catch (e) {
      console.error('Error creando consulta:', e);
      setError('Error al guardar la consulta. Intente nuevamente.');
    }
  };

  const handleRegistrarResultado = async () => {
    if (!selectedConsulta) return;
    try {
      await consultaService.registrarResultado(selectedConsulta.id, resultadoForm as RegistrarResultadoConsultaRequest);
      setOpenResultadoDialog(false);
      setResultadoForm({});
      setSelectedConsulta(null);
      loadConsultas();
    } catch (e) {
      console.error('Error registrando resultado:', e);
      setError('Error al registrar resultado. Intente nuevamente.');
    }
  };

  const handleCancelar = async (consulta: ConsultaMedica) => {
    const motivo = window.prompt('Motivo de cancelación:');
    if (motivo === null) return;
    try {
      await consultaService.cancelar(consulta.id, motivo);
      loadConsultas();
    } catch (e) {
      console.error('Error cancelando consulta:', e);
    }
  };

  const handleNoAsistio = async (consulta: ConsultaMedica) => {
    const motivo = window.prompt('Motivo de no asistencia (opcional):') ?? '';
    try {
      await consultaService.marcarNoAsistio(consulta.id, motivo);
      loadConsultas();
    } catch (e) {
      console.error('Error marcando no asistió:', e);
    }
  };

  const openResultado = (consulta: ConsultaMedica) => {
    setSelectedConsulta(consulta);
    setResultadoForm({
      fechaRealizacion: new Date().toISOString().slice(0, 10),
    });
    setOpenResultadoDialog(true);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* ── Encabezado ── */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="#111827">
            Consultas Médicas
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestión de citas y consultas clínicas de pacientes
          </Typography>
        </Box>
        <Stack direction="row" spacing={1.5}>
          <Tooltip title="Recargar">
            <IconButton onClick={loadConsultas} disabled={loading}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => { setCrearForm({}); setError(''); setOpenCrearDialog(true); }}
            sx={{ backgroundColor: '#0e7490', '&:hover': { backgroundColor: '#0c6680' } }}
          >
            Nueva Consulta
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* ── Listado ── */}
      {consultas.length === 0 && !loading ? (
        <Alert severity="info">No hay consultas médicas registradas aún.</Alert>
      ) : (
        <Grid container spacing={2}>
          {consultas.map((c) => (
            <Grid item xs={12} md={6} lg={4} key={c.id}>
              <Card
                variant="outlined"
                sx={{
                  borderRadius: 3,
                  '&:hover': { boxShadow: 4, borderColor: '#0e7490' },
                  transition: 'all .2s',
                }}
              >
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1.5}>
                    <Box>
                      <Typography variant="subtitle2" fontWeight={700} color="#111827">
                        {TIPO_LABEL[c.tipo as TipoConsulta] ?? c.tipo}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {c.fechaProgramada}
                        {c.horaProgramada ? ` · ${c.horaProgramada.slice(0, 5)}` : ''}
                      </Typography>
                    </Box>
                    <Chip
                      label={ESTADO_LABEL[c.estado as EstadoConsulta] ?? c.estado}
                      color={ESTADO_COLOR[c.estado as EstadoConsulta] ?? 'default'}
                      size="small"
                      sx={{ fontWeight: 600 }}
                    />
                  </Stack>

                  {c.medicoNombre && (
                    <Typography variant="body2" color="text.secondary" mb={0.5}>
                      <strong>Médico:</strong> {c.medicoNombre}
                    </Typography>
                  )}
                  {c.motivoConsulta && (
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260 }}
                    >
                      <strong>Motivo:</strong> {c.motivoConsulta}
                    </Typography>
                  )}
                  {c.respuestaAlTratamiento && (
                    <Typography variant="body2" color="text.secondary" mt={0.5}>
                      <strong>Respuesta al tratamiento:</strong> {c.respuestaAlTratamiento}
                    </Typography>
                  )}

                  {/* Acciones */}
                  {c.estado === EstadoConsulta.PROGRAMADA && (
                    <Stack direction="row" spacing={1} mt={2} flexWrap="wrap">
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={<SoapIcon />}
                        onClick={() => openResultado(c)}
                        sx={{ backgroundColor: '#0e7490', '&:hover': { backgroundColor: '#0c6680' }, textTransform: 'none', fontSize: '0.75rem' }}
                      >
                        Registrar Resultado
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<NoAsistioIcon />}
                        color="warning"
                        onClick={() => handleNoAsistio(c)}
                        sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                      >
                        No Asistió
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<CancelIcon />}
                        color="error"
                        onClick={() => handleCancelar(c)}
                        sx={{ textTransform: 'none', fontSize: '0.75rem' }}
                      >
                        Cancelar
                      </Button>
                    </Stack>
                  )}
                  {c.estado === EstadoConsulta.REALIZADA && (
                    <Stack direction="row" spacing={1} mt={2}>
                      <Chip icon={<CheckIcon />} label="Consulta realizada" color="success" size="small" variant="outlined" />
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* ── Diálogo: Nueva Consulta ── */}
      <Dialog open={openCrearDialog} onClose={() => setOpenCrearDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Nueva Consulta Médica</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1.5 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <PatientSelector
              value={crearForm.pacienteId ?? null}
              onChange={(id, patient) => {
                setCrearForm({ ...crearForm, pacienteId: id ?? undefined });
                setSelectedPatient(patient ?? null);
              }}
              label="Paciente *"
              required
            />

            <FormControl fullWidth required>
              <InputLabel>Tipo de Consulta *</InputLabel>
              <Select
                value={crearForm.tipo || ''}
                onChange={(e) => setCrearForm({ ...crearForm, tipo: e.target.value as TipoConsulta })}
                label="Tipo de Consulta *"
              >
                {Object.values(TipoConsulta).map((t) => (
                  <MenuItem key={t} value={t}>{TIPO_LABEL[t]}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Médico Tratante</InputLabel>
              <Select
                value={crearForm.medicoId || ''}
                onChange={(e) => setCrearForm({ ...crearForm, medicoId: Number(e.target.value) || undefined })}
                label="Médico Tratante"
              >
                <MenuItem value=""><em>Sin asignar</em></MenuItem>
                {medicos.map((m) => (
                  <MenuItem key={m.id} value={m.id}>{m.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Fecha Programada *"
                type="date"
                value={crearForm.fechaProgramada || ''}
                onChange={(e) => setCrearForm({ ...crearForm, fechaProgramada: e.target.value })}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
              <TextField
                label="Hora"
                type="time"
                value={crearForm.horaProgramada || ''}
                onChange={(e) => setCrearForm({ ...crearForm, horaProgramada: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Stack>

            <TextField
              label="Motivo de Consulta"
              value={crearForm.motivoConsulta || ''}
              onChange={(e) => setCrearForm({ ...crearForm, motivoConsulta: e.target.value })}
              fullWidth
              multiline
              rows={2}
              placeholder="Describa brevemente el motivo de la consulta"
            />

            <TextField
              label="Observaciones"
              value={crearForm.observaciones || ''}
              onChange={(e) => setCrearForm({ ...crearForm, observaciones: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setOpenCrearDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleCrear}
            sx={{ backgroundColor: '#0e7490', '&:hover': { backgroundColor: '#0c6680' } }}
          >
            Guardar
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Diálogo: Registrar Resultado (SOAP + signos vitales) ── */}
      <Dialog open={openResultadoDialog} onClose={() => setOpenResultadoDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Registrar Resultado de Consulta
          {selectedConsulta && (
            <Typography variant="caption" display="block" color="text.secondary">
              {TIPO_LABEL[selectedConsulta.tipo as TipoConsulta] ?? selectedConsulta.tipo} · {selectedConsulta.fechaProgramada}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1.5 }}>

            <TextField
              label="Fecha de Realización *"
              type="date"
              value={resultadoForm.fechaRealizacion || ''}
              onChange={(e) => setResultadoForm({ ...resultadoForm, fechaRealizacion: e.target.value })}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />

            {/* Signos Vitales */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} color="#0e7490" mb={1.5}>
                Signos Vitales y Antropometría
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="Peso (kg)"
                    type="number"
                    value={resultadoForm.pesoKg ?? ''}
                    onChange={(e) => setResultadoForm({ ...resultadoForm, pesoKg: Number(e.target.value) || undefined })}
                    fullWidth
                    size="small"
                    inputProps={{ min: 0, step: 0.1 }}
                    placeholder="70.5"
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="Talla (cm)"
                    type="number"
                    value={resultadoForm.tallaCm ?? ''}
                    onChange={(e) => setResultadoForm({ ...resultadoForm, tallaCm: Number(e.target.value) || undefined })}
                    fullWidth
                    size="small"
                    inputProps={{ min: 0 }}
                    placeholder="170"
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="T/A Sistólica"
                    type="number"
                    value={resultadoForm.tensionArterialSistolica ?? ''}
                    onChange={(e) => setResultadoForm({ ...resultadoForm, tensionArterialSistolica: Number(e.target.value) || undefined })}
                    fullWidth
                    size="small"
                    placeholder="120"
                  />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <TextField
                    label="T/A Diastólica"
                    type="number"
                    value={resultadoForm.tensionArterialDiastolica ?? ''}
                    onChange={(e) => setResultadoForm({ ...resultadoForm, tensionArterialDiastolica: Number(e.target.value) || undefined })}
                    fullWidth
                    size="small"
                    placeholder="80"
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <TextField
                    label="Frec. Cardíaca (rpm)"
                    type="number"
                    value={resultadoForm.frecuenciaCardiacaRpm ?? ''}
                    onChange={(e) => setResultadoForm({ ...resultadoForm, frecuenciaCardiacaRpm: Number(e.target.value) || undefined })}
                    fullWidth
                    size="small"
                    placeholder="72"
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <TextField
                    label="Saturación O₂ (%)"
                    type="number"
                    value={resultadoForm.saturacionOxigenoPct ?? ''}
                    onChange={(e) => setResultadoForm({ ...resultadoForm, saturacionOxigenoPct: Number(e.target.value) || undefined })}
                    fullWidth
                    size="small"
                    inputProps={{ min: 0, max: 100 }}
                    placeholder="98"
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <TextField
                    label="Temperatura (°C)"
                    type="number"
                    value={resultadoForm.temperaturaGrados ?? ''}
                    onChange={(e) => setResultadoForm({ ...resultadoForm, temperaturaGrados: Number(e.target.value) || undefined })}
                    fullWidth
                    size="small"
                    inputProps={{ step: 0.1 }}
                    placeholder="36.5"
                  />
                </Grid>
              </Grid>
            </Box>

            <Divider />

            {/* Nota SOAP */}
            <Box>
              <Typography variant="subtitle2" fontWeight={700} color="#0e7490" mb={1.5}>
                Nota Clínica SOAP
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="S — Subjetivo (síntomas referidos por el paciente)"
                  value={resultadoForm.hallazgosClinicosSubjetivos || ''}
                  onChange={(e) => setResultadoForm({ ...resultadoForm, hallazgosClinicosSubjetivos: e.target.value })}
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Lo que el paciente reporta…"
                />
                <TextField
                  label="O — Objetivo (hallazgos clínicos)"
                  value={resultadoForm.hallazgosClinicosObjetivos || ''}
                  onChange={(e) => setResultadoForm({ ...resultadoForm, hallazgosClinicosObjetivos: e.target.value })}
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Hallazgos del examen físico…"
                />
                <TextField
                  label="A — Evaluación / Diagnóstico"
                  value={resultadoForm.evaluacionDiagnostica || ''}
                  onChange={(e) => setResultadoForm({ ...resultadoForm, evaluacionDiagnostica: e.target.value })}
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Diagnóstico e impresión clínica…"
                />
                <TextField
                  label="P — Plan de Manejo"
                  value={resultadoForm.planManejo || ''}
                  onChange={(e) => setResultadoForm({ ...resultadoForm, planManejo: e.target.value })}
                  fullWidth
                  multiline
                  rows={2}
                  placeholder="Tratamiento, seguimiento, derivaciones…"
                />
              </Stack>
            </Box>

            <Divider />

            <FormControl fullWidth>
              <InputLabel>Respuesta al Tratamiento</InputLabel>
              <Select
                value={resultadoForm.respuestaAlTratamiento || ''}
                onChange={(e) => setResultadoForm({ ...resultadoForm, respuestaAlTratamiento: e.target.value as ConsultaMedica['respuestaAlTratamiento'] })}
                label="Respuesta al Tratamiento"
              >
                <MenuItem value=""><em>Sin evaluar aún</em></MenuItem>
                <MenuItem value="EXCELENTE">Excelente</MenuItem>
                <MenuItem value="BUENA">Buena</MenuItem>
                <MenuItem value="REGULAR">Regular</MenuItem>
                <MenuItem value="MALA">Mala</MenuItem>
                <MenuItem value="SIN_EVALUAR">Sin evaluar</MenuItem>
              </Select>
            </FormControl>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Fecha Próxima Cita"
                type="date"
                value={resultadoForm.proxCitaFecha || ''}
                onChange={(e) => setResultadoForm({ ...resultadoForm, proxCitaFecha: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
              <FormControl fullWidth>
                <InputLabel>Tipo Próxima Cita</InputLabel>
                <Select
                  value={resultadoForm.proxCitaTipo || ''}
                  onChange={(e) => setResultadoForm({ ...resultadoForm, proxCitaTipo: e.target.value as TipoConsulta })}
                  label="Tipo Próxima Cita"
                >
                  <MenuItem value=""><em>Sin programar</em></MenuItem>
                  {Object.values(TipoConsulta).map((t) => (
                    <MenuItem key={t} value={t}>{TIPO_LABEL[t]}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <TextField
              label="Observaciones"
              value={resultadoForm.observaciones || ''}
              onChange={(e) => setResultadoForm({ ...resultadoForm, observaciones: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setOpenResultadoDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            startIcon={<CheckIcon />}
            onClick={handleRegistrarResultado}
            sx={{ backgroundColor: '#0e7490', '&:hover': { backgroundColor: '#0c6680' } }}
          >
            Guardar Resultado
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConsultasPage;
