import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  FormControlLabel,
  Checkbox,
  Alert,
  AlertTitle,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
  RadioGroup,
  Radio,
  FormLabel,
} from '@mui/material';
import {
  Add as AddIcon,
  DirectionsCar as CarIcon,
  LocationOn as LocationIcon,
  AccessTime as TimeIcon,
  Person as PersonIcon,
  CheckCircle as CheckIcon,
  Cancel as CancelIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon,
  TodayOutlined as TodayIcon,
  PendingActions as PendingIcon,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { PatientSelector } from '@modules/shared/components/PatientSelector';
import { transporteService } from '@/services/transporteService';
import type {
  Transporte,
  CreateTransporteRequest,
  EstadoTransporte,
  TipoServicio,
} from '@/types/transporte.types';
import type { Patient } from '@/types';

// -----------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------
const ESTADO_COLOR: Record<EstadoTransporte, 'warning' | 'success' | 'error'> = {
  PENDIENTE: 'warning',
  EFECTIVO:  'success',
  CANCELADO: 'error',
};

const GESTORAS = [
  'Ana Maria Lopez',
  'Carolina Martinez',
  'Diana Perez',
  'Fernanda Gomez',
  'Gloria Jimenez',
];

const REQUERIMIENTOS = [
  'Consulta medica especialista',
  'Control medico',
  'Examen de laboratorio',
  'Procedimiento quirurgico',
  'Terapia fisica',
  'Terapia ocupacional',
  'Urgencias',
  'Otro',
];

const EMPTY_FORM: CreateTransporteRequest = {
  pacienteId: 0,
  pacienteNombre: '',
  direccionOrigen: '',
  barrioOrigen: '',
  municipioOrigen: '',
  departamentoOrigen: '',
  telefonoContacto: '',
  tratamiento: '',
  direccionDestino: '',
  barrioDestino: '',
  municipioDestino: '',
  departamentoDestino: '',
  nombreIpsDestino: '',
  fechaServicio: '',
  horaServicio: '',
  tipoServicio: 'SENCILLO',
  fechaRegreso: '',
  horaRegreso: '',
  requiereAcompanante: false,
  nombreAcompanante: '',
  gestoraSolicitante: '',
  requerimientoTransporte: '',
  condicionesEspeciales: '',
  comentarios: '',
};

// -----------------------------------------------------------------
// Section heading helper
// -----------------------------------------------------------------
function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} mb={2}>
      <Box sx={{ color: 'primary.main' }}>{icon}</Box>
      <Typography variant="subtitle1" fontWeight={700} color="primary.main">
        {title}
      </Typography>
      <Divider sx={{ flex: 1 }} />
    </Stack>
  );
}

// -----------------------------------------------------------------
// Main Component
// -----------------------------------------------------------------
export default function TransportesPage() {
  const [transportes, setTransportes] = useState<Transporte[]>([]);
  const [loading, setLoading]         = useState(false);
  const [openForm, setOpenForm]       = useState(false);
  const [openCierre, setOpenCierre]   = useState(false);
  const [editingId, setEditingId]     = useState<number | null>(null);
  const [cierreId, setCierreId]       = useState<number | null>(null);
  const [filtroEstado, setFiltroEstado] = useState<EstadoTransporte | 'Todos'>('Todos');

  const [form, setForm]                       = useState<CreateTransporteRequest>(EMPTY_FORM);
  const [selectedPatientId, setSelectedPatientId] = useState<number | null>(null);

  const [cierreForm, setCierreForm] = useState({
    estado: 'EFECTIVO' as EstadoTransporte,
    observacionesCierre: '',
    quienCierra: '',
  });

  useEffect(() => { loadTransportes(); }, []);

  async function loadTransportes() {
    setLoading(true);
    try {
      const data = await transporteService.getAll(0, 100);
      setTransportes(data.content ?? []);
    } catch {
      setTransportes([]);
    } finally {
      setLoading(false);
    }
  }

  // Patient autofill — PatientSelector gives (id, patient)
  function handlePatientSelect(_id: number | null, patient: Patient | null) {
    setSelectedPatientId(_id);
    if (!patient) {
      setForm(prev => ({
        ...prev,
        pacienteId: 0, pacienteNombre: '',
        direccionOrigen: '', barrioOrigen: '',
        municipioOrigen: '', departamentoOrigen: '',
        telefonoContacto: '', tratamiento: '',
      }));
      return;
    }
    const nombre = patient.nombreCompleto
      ?? `${patient.nombre ?? ''} ${patient.apellido ?? ''}`.trim()
      ?? patient.fullName ?? '';
    setForm(prev => ({
      ...prev,
      pacienteId:         patient.id,
      pacienteNombre:     nombre,
      direccionOrigen:    patient.direccion ?? patient.address ?? '',
      barrioOrigen:       patient.neighborhood ?? '',
      municipioOrigen:    patient.ciudad ?? patient.cityName ?? '',
      departamentoOrigen: patient.departamento ?? patient.departmentName ?? '',
      telefonoContacto:   patient.telefono ?? patient.phone ?? '',
      tratamiento:        patient.epsName ?? '',
    }));
  }

  function handleChange(field: keyof CreateTransporteRequest, value: unknown) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function openNew() {
    setForm(EMPTY_FORM); setSelectedPatientId(null); setEditingId(null); setOpenForm(true);
  }

  function openEdit(t: Transporte) {
    setForm({
      pacienteId: t.pacienteId, pacienteNombre: t.pacienteNombre ?? '',
      direccionOrigen: t.direccionOrigen, barrioOrigen: t.barrioOrigen ?? '',
      municipioOrigen: t.municipioOrigen, departamentoOrigen: t.departamentoOrigen,
      telefonoContacto: t.telefonoContacto ?? '', tratamiento: t.tratamiento ?? '',
      direccionDestino: t.direccionDestino, barrioDestino: t.barrioDestino ?? '',
      municipioDestino: t.municipioDestino, departamentoDestino: t.departamentoDestino,
      nombreIpsDestino: t.nombreIpsDestino ?? '',
      fechaServicio: t.fechaServicio, horaServicio: t.horaServicio,
      tipoServicio: t.tipoServicio,
      fechaRegreso: t.fechaRegreso ?? '', horaRegreso: t.horaRegreso ?? '',
      requiereAcompanante: t.requiereAcompanante, nombreAcompanante: t.nombreAcompanante ?? '',
      gestoraSolicitante: t.gestoraSolicitante, requerimientoTransporte: t.requerimientoTransporte,
      condicionesEspeciales: t.condicionesEspeciales ?? '', comentarios: t.comentarios ?? '',
    });
    setEditingId(t.id); setOpenForm(true);
  }

  async function handleSubmit() {
    if (!form.pacienteId || !form.direccionOrigen || !form.direccionDestino
      || !form.municipioOrigen || !form.departamentoOrigen
      || !form.municipioDestino || !form.departamentoDestino
      || !form.fechaServicio || !form.horaServicio
      || !form.gestoraSolicitante || !form.requerimientoTransporte) {
      toast.error('Completa todos los campos obligatorios (*)');
      return;
    }
    try {
      if (editingId) {
        await transporteService.update(editingId, form);
        toast.success('Transporte actualizado');
      } else {
        await transporteService.create(form);
        toast.success('Transporte creado');
      }
      setOpenForm(false);
      loadTransportes();
    } catch {
      toast.error('Error al guardar el transporte');
    }
  }

  function openCierreDialog(t: Transporte) {
    setCierreId(t.id);
    setCierreForm({ estado: 'EFECTIVO', observacionesCierre: '', quienCierra: '' });
    setOpenCierre(true);
  }

  async function handleCierre() {
    if (!cierreId || !cierreForm.quienCierra) {
      toast.error('Indica quien realiza el cierre');
      return;
    }
    try {
      await transporteService.cambiarEstado(cierreId, cierreForm);
      toast.success(`Transporte marcado como ${cierreForm.estado}`);
      setOpenCierre(false);
      loadTransportes();
    } catch {
      toast.error('Error al cerrar el transporte');
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Eliminar este transporte?')) return;
    try {
      await transporteService.delete(id);
      toast.success('Transporte eliminado');
      loadTransportes();
    } catch {
      toast.error('Error al eliminar');
    }
  }

  const filtered = filtroEstado === 'Todos'
    ? transportes
    : transportes.filter(t => t.estado === filtroEstado);

  const counts = {
    total:     transportes.length,
    pendiente: transportes.filter(t => t.estado === 'PENDIENTE').length,
    efectivo:  transportes.filter(t => t.estado === 'EFECTIVO').length,
    cancelado: transportes.filter(t => t.estado === 'CANCELADO').length,
  };

  return (
    <Box p={3}>
      {/* Header */}
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <CarIcon sx={{ fontSize: 32, color: 'primary.main' }} />
          <Box>
            <Typography variant="h5" fontWeight={700}>Transportes</Typography>
            <Typography variant="body2" color="text.secondary">
              Gestion de traslados de pacientes PSP
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Actualizar">
            <IconButton onClick={loadTransportes} disabled={loading}>
              {loading ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNew}>
            Nuevo Transporte
          </Button>
        </Stack>
      </Stack>

      {/* Summary cards */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Total',      value: counts.total,     color: 'info.main',    icon: <CarIcon /> },
          { label: 'Pendientes', value: counts.pendiente, color: 'warning.main', icon: <PendingIcon /> },
          { label: 'Efectivos',  value: counts.efectivo,  color: 'success.main', icon: <CheckIcon /> },
          { label: 'Cancelados', value: counts.cancelado, color: 'error.main',   icon: <CancelIcon /> },
        ].map(({ label, value, color, icon }) => (
          <Grid item xs={6} sm={3} key={label}>
            <Card variant="outlined" sx={{ borderRadius: 2 }}>
              <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h4" fontWeight={800} color={color}>{value}</Typography>
                    <Typography variant="caption" color="text.secondary">{label}</Typography>
                  </Box>
                  <Box sx={{ color, opacity: 0.4, fontSize: 36 }}>{icon}</Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Filter chips */}
      <Stack direction="row" spacing={1} mb={2}>
        {(['Todos', 'PENDIENTE', 'EFECTIVO', 'CANCELADO'] as const).map(e => (
          <Chip
            key={e}
            label={e}
            clickable
            variant={filtroEstado === e ? 'filled' : 'outlined'}
            color={e === 'Todos' ? 'default' : e === 'PENDIENTE' ? 'warning' : e === 'EFECTIVO' ? 'success' : 'error'}
            onClick={() => setFiltroEstado(e as typeof filtroEstado)}
          />
        ))}
      </Stack>

      {/* Table */}
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead sx={{ bgcolor: 'grey.50' }}>
            <TableRow>
              {['Paciente', 'Fecha', 'Hora', 'Tipo', 'Destino / IPS', 'Gestora', 'Estado', 'Acciones'].map(h => (
                <TableCell key={h} sx={{ fontWeight: 700, fontSize: 12 }}>{h}</TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    {loading ? 'Cargando...' : 'No hay transportes registrados'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map(t => (
                <TableRow key={t.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {t.pacienteNombre ?? `Paciente #${t.pacienteId}`}
                    </Typography>
                    {t.tratamiento && (
                      <Typography variant="caption" color="text.secondary">{t.tratamiento}</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <TodayIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="body2">{t.fechaServicio}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <TimeIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                      <Typography variant="body2">{t.horaServicio}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={t.tipoServicio}
                      size="small"
                      variant="outlined"
                      color={t.tipoServicio === 'DOBLE' ? 'secondary' : 'default'}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{t.nombreIpsDestino ?? t.municipioDestino}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {t.municipioDestino}, {t.departamentoDestino}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{t.gestoraSolicitante}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={t.estado} size="small" color={ESTADO_COLOR[t.estado]} />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      {t.estado === 'PENDIENTE' && (
                        <>
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => openEdit(t)}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Cerrar transporte">
                            <IconButton size="small" color="success" onClick={() => openCierreDialog(t)}>
                              <CheckIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                      <Tooltip title="Eliminar">
                        <IconButton size="small" color="error" onClick={() => handleDelete(t.id)}>
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* ============= FORM DIALOG ============= */}
      <Dialog open={openForm} onClose={() => setOpenForm(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <CarIcon color="primary" />
            <Typography variant="h6" fontWeight={700}>
              {editingId ? 'Editar Transporte' : 'Nuevo Transporte'}
            </Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers sx={{ p: 3 }}>
          <Stack spacing={4}>

            {/* Section 1: Paciente */}
            <Box>
              <SectionTitle icon={<PersonIcon />} title="1. Paciente" />
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <PatientSelector
                    value={selectedPatientId}
                    onChange={handlePatientSelect}
                    label="Buscar paciente *"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Direccion de origen" fullWidth size="small" disabled
                    value={form.direccionOrigen} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField label="Barrio" fullWidth size="small" disabled
                    value={form.barrioOrigen} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField label="Ciudad / Municipio" fullWidth size="small" disabled
                    value={form.municipioOrigen} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField label="Departamento" fullWidth size="small" disabled
                    value={form.departamentoOrigen} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField label="Telefono de contacto" fullWidth size="small" disabled
                    value={form.telefonoContacto} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Tratamiento / EPS" fullWidth size="small" disabled
                    value={form.tratamiento} InputLabelProps={{ shrink: true }} />
                </Grid>
              </Grid>
            </Box>

            {/* Section 2: Destino */}
            <Box>
              <SectionTitle icon={<LocationIcon />} title="2. Destino" />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={8}>
                  <TextField label="Direccion de destino *" fullWidth size="small"
                    value={form.direccionDestino}
                    onChange={e => handleChange('direccionDestino', e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField label="Barrio destino" fullWidth size="small"
                    value={form.barrioDestino}
                    onChange={e => handleChange('barrioDestino', e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField label="Municipio destino *" fullWidth size="small"
                    value={form.municipioDestino}
                    onChange={e => handleChange('municipioDestino', e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField label="Departamento destino *" fullWidth size="small"
                    value={form.departamentoDestino}
                    onChange={e => handleChange('departamentoDestino', e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField label="Nombre IPS / Centro medico" fullWidth size="small"
                    value={form.nombreIpsDestino}
                    onChange={e => handleChange('nombreIpsDestino', e.target.value)} />
                </Grid>
              </Grid>
            </Box>

            {/* Section 3: Fecha y Horario */}
            <Box>
              <SectionTitle icon={<TimeIcon />} title="3. Fecha y Horario" />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={4}>
                  <TextField label="Fecha del servicio *" type="date" fullWidth size="small"
                    InputLabelProps={{ shrink: true }}
                    value={form.fechaServicio}
                    onChange={e => handleChange('fechaServicio', e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <TextField label="Hora del servicio *" type="time" fullWidth size="small"
                    InputLabelProps={{ shrink: true }}
                    value={form.horaServicio}
                    onChange={e => handleChange('horaServicio', e.target.value)} />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl component="fieldset">
                    <FormLabel component="legend" sx={{ fontSize: 12 }}>Tipo de servicio</FormLabel>
                    <RadioGroup row
                      value={form.tipoServicio}
                      onChange={e => handleChange('tipoServicio', e.target.value as TipoServicio)}>
                      <FormControlLabel value="SENCILLO" control={<Radio size="small" />} label="Sencillo" />
                      <FormControlLabel value="DOBLE"    control={<Radio size="small" />} label="Doble (regreso)" />
                    </RadioGroup>
                  </FormControl>
                </Grid>
                {form.tipoServicio === 'DOBLE' && (
                  <>
                    <Grid item xs={12} sm={6}>
                      <TextField label="Fecha de regreso" type="date" fullWidth size="small"
                        InputLabelProps={{ shrink: true }}
                        value={form.fechaRegreso}
                        onChange={e => handleChange('fechaRegreso', e.target.value)} />
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <TextField label="Hora de regreso" type="time" fullWidth size="small"
                        InputLabelProps={{ shrink: true }}
                        value={form.horaRegreso}
                        onChange={e => handleChange('horaRegreso', e.target.value)} />
                    </Grid>
                  </>
                )}
              </Grid>
            </Box>

            {/* Section 4: Acompanante */}
            <Box>
              <SectionTitle icon={<PersonIcon />} title="4. Acompanante" />
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={form.requiereAcompanante}
                        onChange={e => handleChange('requiereAcompanante', e.target.checked)} />
                    }
                    label="Requiere acompanante"
                  />
                </Grid>
                {form.requiereAcompanante && (
                  <Grid item xs={12} sm={8}>
                    <TextField label="Nombre del acompanante" fullWidth size="small"
                      value={form.nombreAcompanante}
                      onChange={e => handleChange('nombreAcompanante', e.target.value)} />
                  </Grid>
                )}
              </Grid>
            </Box>

            {/* Section 5: Datos del Servicio */}
            <Box>
              <SectionTitle icon={<CarIcon />} title="5. Datos del Servicio" />
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Gestora solicitante *</InputLabel>
                    <Select value={form.gestoraSolicitante} label="Gestora solicitante *"
                      onChange={e => handleChange('gestoraSolicitante', e.target.value)}>
                      {GESTORAS.map(g => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Requerimiento de transporte *</InputLabel>
                    <Select value={form.requerimientoTransporte} label="Requerimiento de transporte *"
                      onChange={e => handleChange('requerimientoTransporte', e.target.value)}>
                      {REQUERIMIENTOS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Condiciones especiales"
                    fullWidth size="small" multiline rows={2}
                    placeholder="Oxigeno, silla de ruedas, camilla..."
                    value={form.condicionesEspeciales}
                    onChange={e => handleChange('condicionesEspeciales', e.target.value)} />
                </Grid>
                <Grid item xs={12}>
                  <TextField label="Comentarios adicionales"
                    fullWidth size="small" multiline rows={2}
                    value={form.comentarios}
                    onChange={e => handleChange('comentarios', e.target.value)} />
                </Grid>
              </Grid>
            </Box>

          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpenForm(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSubmit}>
            {editingId ? 'Actualizar' : 'Crear Transporte'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ============= CIERRE DIALOG ============= */}
      <Dialog open={openCierre} onClose={() => setOpenCierre(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          <Stack direction="row" alignItems="center" spacing={1}>
            <CheckIcon color="success" />
            <Typography variant="h6" fontWeight={700}>Cerrar Transporte</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2.5} pt={1}>
            <Alert severity="info">
              <AlertTitle>Registro de cierre</AlertTitle>
              Marca el transporte como <strong>Efectivo</strong> (se realizo) o{' '}
              <strong>Cancelado</strong> (no se realizo).
            </Alert>
            <FormControl fullWidth size="small">
              <InputLabel>Resultado *</InputLabel>
              <Select value={cierreForm.estado} label="Resultado *"
                onChange={e => setCierreForm(p => ({ ...p, estado: e.target.value as EstadoTransporte }))}>
                <MenuItem value="EFECTIVO">
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <CheckIcon fontSize="small" color="success" />
                    <span>Efectivo - el traslado se realizo</span>
                  </Stack>
                </MenuItem>
                <MenuItem value="CANCELADO">
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <CancelIcon fontSize="small" color="error" />
                    <span>Cancelado - el traslado no se realizo</span>
                  </Stack>
                </MenuItem>
              </Select>
            </FormControl>
            <TextField label="Observaciones de cierre" fullWidth size="small" multiline rows={3}
              value={cierreForm.observacionesCierre}
              onChange={e => setCierreForm(p => ({ ...p, observacionesCierre: e.target.value }))} />
            <TextField label="Registrado por *" fullWidth size="small"
              placeholder="Nombre de la educadora / gestora"
              value={cierreForm.quienCierra}
              onChange={e => setCierreForm(p => ({ ...p, quienCierra: e.target.value }))} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setOpenCierre(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color={cierreForm.estado === 'EFECTIVO' ? 'success' : 'error'}
            onClick={handleCierre}>
            Confirmar {cierreForm.estado}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}