import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Avatar,
  Stack,
  TextField,
  InputAdornment,
  Tab,
  Tabs,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  FormControlLabel,
  Checkbox,
  Alert,
} from '@mui/material';
import {
  Add,
  Assignment,
  Schedule,
  Phone,
  VideoCall,
  MedicalServices,
  Search,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { supabase } from '@services/supabaseClient';
import { seguimientoService } from '@services/seguimientoService';
import { PatientSelector } from '@modules/shared/components/PatientSelector';
import type { Patient } from '@/types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

interface Seguimiento {
  id: number | string;
  patientId?: number;
  patient: string;
  tipoSeguimiento: string;
  tipoContacto: string;
  prioridad: string;
  fechaProgramada: string;
  estado: string;
  motivoSeguimiento?: string;
  observaciones?: string;
  modalidad?: string;
  titulo?: string;
}



interface CreateForm {
  patientId: number | null;
  patientName: string;
  titulo: string;
  motivoSeguimiento: string;
  tipoSeguimiento: string;
  tipoContacto: string;
  prioridad: string;
  fechaProgramada: string;
  modalidad: string;
  observaciones: string;
}

const TIPO_SEG_OPTIONS = [
  { value: 'CITA_MEDICA', label: 'Cita Médica' },
  { value: 'ACOMPANAMIENTO_EPS', label: 'Acompañamiento EPS' },
  { value: 'DOCUMENTACION', label: 'Documentación' },
  { value: 'GESTION_ASEGURADOR', label: 'Gestión Asegurador' },
  { value: 'SEGUIMIENTO_CLINICO', label: 'Seguimiento Clínico' },
  { value: 'EDUCACION_PACIENTE', label: 'Educación al Paciente' },
  { value: 'ADHERENCIA', label: 'Adherencia' },
  { value: 'ENTREGA_MEDICAMENTO', label: 'Entrega Medicamento' },
  { value: 'LABORATORIO', label: 'Laboratorio' },
  { value: 'OTRO', label: 'Otro' },
];

const MODALIDAD_OPTIONS = [
  { value: 'PRESENCIAL', label: 'Presencial' },
  { value: 'VIRTUAL', label: 'Virtual' },
  { value: 'TELEFONICO', label: 'Telefónico' },
  { value: 'TELEORIENTACION', label: 'Teleorientación' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'EMAIL', label: 'Email' },
];

const mapApiToSeguimiento = (s: any): Seguimiento => ({
  id: s.id,
  patientId: s.patientId,
  patient: s.patientName || `Paciente #${s.patientId}`,
  tipoSeguimiento: s.tipoSeguimiento || 'OTRO',
  tipoContacto: s.tipoContacto || 'TELEFONICO',
  prioridad: s.prioridad || 'MEDIA',
  fechaProgramada: s.fechaProgramada || '',
  estado:
    s.estadoTarea === 'PENDIENTE'    ? 'PROGRAMADO'
    : s.estadoTarea === 'EFECTIVA'   ? 'EFECTIVO'
    : s.estadoTarea === 'CANCELADA'  ? 'CANCELADO'
    : s.estadoTarea === 'NO_EFECTIVA'? 'NO_EFECTIVO'
    : (s.estadoTarea || 'PROGRAMADO'),
  motivoSeguimiento: s.motivoSeguimiento,
  observaciones: s.observaciones,
  modalidad: s.modalidad,
  titulo: s.titulo,
});

/**
 * Página de Seguimientos — con creación real via API del backend
 */
const FollowupsPage = () => {
  const theme = useTheme();
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [seguimientos, setSeguimientos] = useState<Seguimiento[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openCloseDialog, setOpenCloseDialog] = useState(false);
  const [closingSeg, setClosingSeg] = useState<Seguimiento | null>(null);
  const [closeData, setCloseData] = useState({
    resultado: 'EFECTIVO' as string,
    observaciones: '',
    barreraIdentificada: false,
  });

  const EMPTY_FORM: CreateForm = {
    patientId: null, patientName: '', titulo: '', motivoSeguimiento: '',
    tipoSeguimiento: '', tipoContacto: 'TELEFONICO', prioridad: 'MEDIA',
    fechaProgramada: '', modalidad: 'TELEFONICO', observaciones: '',
  };
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);

  const loadSeguimientos = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await seguimientoService.listar();
      setSeguimientos((res.content || []).map(mapApiToSeguimiento));
    } catch {
      setErrorMsg('No se pudo cargar la lista de seguimientos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSeguimientos(); }, [loadSeguimientos]);

  const handlePatientChange = (_id: number | null, patient: Patient | null) => {
    setForm((prev) => ({
      ...prev,
      patientId: patient?.id ?? null,
      patientName: patient?.nombreCompleto || (patient ? `${patient.nombre} ${patient.apellido}` : ''),
    }));
  };

  const calcularPrioridad = (fecha: string): string => {
    if (!fecha) return 'MEDIA';
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const target = new Date(fecha);
    target.setHours(0, 0, 0, 0);
    const diffDias = Math.floor((target.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDias <= 1) return 'ALTA';
    if (diffDias <= 7) return 'MEDIA';
    return 'BAJA';
  };

  const handleCloseSeguimiento = (seg: Seguimiento) => {
    setClosingSeg(seg);
    setCloseData({ resultado: 'EFECTIVO', observaciones: '', barreraIdentificada: false });
    setOpenCloseDialog(true);
  };

  const handleConfirmClose = async () => {
    if (!closingSeg) return;
    try {
      try {
        await supabase
          .from('seguimientos')
          .update({ estado_tarea: closeData.resultado, observaciones: closeData.observaciones })
          .eq('id', closingSeg.id);
      } catch {
        // local mode fallback
      }
      setSeguimientos((prev) =>
        prev.map((s) =>
          s.id === closingSeg.id ? { ...s, estado: closeData.resultado, observaciones: closeData.observaciones } : s
        )
      );
      toast.success(`Seguimiento marcado como ${closeData.resultado === 'EFECTIVO' ? 'Efectivo' : 'No Efectivo'}`);
      setOpenCloseDialog(false);
      if (closeData.barreraIdentificada && closingSeg.patientId) {
        navigate(`/barriers?patientId=${closingSeg.patientId}`);
      }
    } catch (error) {
      console.error('Error cerrando seguimiento:', error);
      toast.error('Error al cerrar el seguimiento');
    }
  };

  const handleSave = async () => {
    if (!form.patientId) { toast.error('Selecciona un paciente'); return; }
    if (!form.tipoSeguimiento) { toast.error('Selecciona el tipo de seguimiento'); return; }
    if (!form.fechaProgramada) { toast.error('Indica la fecha programada'); return; }
    setSaving(true);
    try {
      const created = await seguimientoService.crear(form.patientId, {
        titulo: form.titulo || `Seguimiento ${form.tipoSeguimiento}`,
        motivoSeguimiento: form.motivoSeguimiento || form.tipoSeguimiento,
        tipoSeguimiento: form.tipoSeguimiento,
        tipoContacto: form.tipoContacto,
        prioridad: form.prioridad,
        fechaProgramada: form.fechaProgramada,
        modalidad: form.modalidad,
        observaciones: form.observaciones,
      } as any);
      toast.success('✅ Seguimiento creado exitosamente');
      setSeguimientos((prev) => [mapApiToSeguimiento(created), ...prev]);
      setOpenDialog(false);
      setForm(EMPTY_FORM);
    } catch {
      toast.error('Error al guardar el seguimiento');
    } finally {
      setSaving(false);
    }
  };

  const getTipoLabel = (tipo: string) => TIPO_SEG_OPTIONS.find((o) => o.value === tipo)?.label || tipo;

  const getStatusIcon = (tipo: string) => {
    switch (tipo) {
      case 'SEGUIMIENTO_CLINICO': return <MedicalServices />;
      case 'ADHERENCIA': case 'EDUCACION_PACIENTE': return <Phone />;
      case 'ACOMPANAMIENTO_EPS': return <VideoCall />;
      default: return <Assignment />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'EFECTIVO': return 'success';
      case 'PROGRAMADO': return 'info';
      case 'NO_EFECTIVO': return 'warning';
      case 'CANCELADO': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (s: string) => ({ EFECTIVO: 'Efectivo', PROGRAMADO: 'Programado', NO_EFECTIVO: 'No Efectivo', CANCELADO: 'Cancelado' }[s] || s);
  const getPrioColor = (p: string) => ({ ALTA: '#d32f2f', MEDIA: '#f57c00', BAJA: '#388e3c' }[p] || '#757575');
  const getTypeColor = (t: string) => ({ SEGUIMIENTO_CLINICO:'#9c27b0', EDUCACION_PACIENTE:'#2196f3', ADHERENCIA:'#4caf50', ACOMPANAMIENTO_EPS:'#ff9800', CITA_MEDICA:'#e91e63' }[t] || '#024d56');

  const filtered = seguimientos.filter((s) =>
    s.patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.titulo || '').toLowerCase().includes(searchTerm.toLowerCase())
  );
  const programados = filtered.filter((s) => s.estado === 'PROGRAMADO');
  const completados = filtered.filter((s) => ['EFECTIVO','NO_EFECTIVO'].includes(s.estado));

  const renderCard = (seg: Seguimiento, index: number) => (
    <Grid item xs={12} md={6} key={seg.id}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.05 }}>
        <Card sx={{ bgcolor: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.12)' }, borderRadius: 2 }}>
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="flex-start">
              <Avatar sx={{ bgcolor: getTypeColor(seg.tipoSeguimiento), width: 48, height: 48 }}>
                {getStatusIcon(seg.tipoSeguimiento)}
              </Avatar>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" mb={0.5}>
                  <Typography variant="subtitle1" fontWeight={700} color="#111827" noWrap>{seg.patient}</Typography>
                  <Chip label={getStatusLabel(seg.estado)} color={getStatusColor(seg.estado) as any} size="small" sx={{ fontWeight: 600, ml: 1, flexShrink: 0 }} />
                </Stack>
                {seg.titulo && <Typography variant="body2" fontWeight={600} color="#374151" mb={0.5}>{seg.titulo}</Typography>}
                <Stack direction="row" spacing={1} mb={1} flexWrap="wrap" useFlexGap>
                  <Chip label={getTipoLabel(seg.tipoSeguimiento)} size="small" sx={{ bgcolor: `${getTypeColor(seg.tipoSeguimiento)}20`, color: getTypeColor(seg.tipoSeguimiento), fontWeight: 600 }} />
                  <Chip label={seg.tipoContacto} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                  <Chip label={seg.prioridad} size="small" sx={{ bgcolor: `${getPrioColor(seg.prioridad)}20`, color: getPrioColor(seg.prioridad), fontWeight: 600 }} />
                </Stack>
                {seg.motivoSeguimiento && <Typography variant="body2" color="text.secondary" mb={1}>{seg.motivoSeguimiento}</Typography>}
                <Stack direction="row" alignItems="center" gap={0.5}>
                  <Schedule sx={{ fontSize: 14, color: 'text.secondary' }} />
                  <Typography variant="caption" color="text.secondary">
                    {new Date(seg.fechaProgramada).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                  </Typography>
                </Stack>
                {seg.estado === 'PROGRAMADO' && (
                  <Button
                    size="small"
                    variant="contained"
                    color="primary"
                    sx={{ mt: 1.5 }}
                    onClick={() => handleCloseSeguimiento(seg)}
                    fullWidth
                  >
                    Cerrar Seguimiento
                  </Button>
                )}
              </Box>
            </Stack>
          </CardContent>
        </Card>
      </motion.div>
    </Grid>
  );

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom color="#111827">Seguimientos</Typography>
          <Typography variant="body1" color="#6b7280">Gestión de seguimientos y tareas a pacientes del PSP</Typography>
        </Box>
        <Button variant="contained" size="large" startIcon={<Add />} onClick={() => { setForm(EMPTY_FORM); setOpenDialog(true); }}
          sx={{ bgcolor: theme.palette.primary.main, '&:hover': { bgcolor: theme.palette.primary.dark }, borderRadius: 2, px: 3, py: 1.5 }}>
          Nuevo Seguimiento
        </Button>
      </Box>

      <Card sx={{ mb: 4, bgcolor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <CardContent>
          <TextField fullWidth placeholder="Buscar por paciente o título..." value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><Search sx={{ color: '#6b7280' }} /></InputAdornment> }}
            sx={{ '& .MuiOutlinedInput-root': { '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main } } }}
          />
        </CardContent>
      </Card>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}
      {errorMsg && !loading && (
        <Alert severity="warning" sx={{ mb: 2 }}>{errorMsg}</Alert>
      )}

      <Box sx={{ borderBottom: 1, borderColor: '#e5e7eb', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)}
          sx={{ '& .MuiTab-root': { color: '#6b7280' }, '& .Mui-selected': { color: theme.palette.primary.main }, '& .MuiTabs-indicator': { bgcolor: theme.palette.primary.main } }}>
          <Tab label={`Programados (${programados.length})`} />
          <Tab label={`Realizados (${completados.length})`} />
          <Tab label={`Todos (${filtered.length})`} />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Grid container spacing={3}>{programados.map((s, i) => renderCard(s, i))}</Grid>
        {programados.length === 0 && <Box sx={{ textAlign: 'center', py: 6 }}><Schedule sx={{ fontSize: 48, color: '#d1d5db', mb: 2 }} /><Typography color="text.secondary">No hay seguimientos programados</Typography></Box>}
      </TabPanel>
      <TabPanel value={tabValue} index={1}>
        <Grid container spacing={3}>{completados.map((s, i) => renderCard(s, i))}</Grid>
        {completados.length === 0 && <Box sx={{ textAlign: 'center', py: 6 }}><Assignment sx={{ fontSize: 48, color: '#d1d5db', mb: 2 }} /><Typography color="text.secondary">No hay seguimientos realizados</Typography></Box>}
      </TabPanel>
      <TabPanel value={tabValue} index={2}>
        <Grid container spacing={3}>{filtered.map((s, i) => renderCard(s, i))}</Grid>
        {filtered.length === 0 && <Box sx={{ textAlign: 'center', py: 6 }}><Assignment sx={{ fontSize: 48, color: '#d1d5db', mb: 2 }} /><Typography color="text.secondary">No se encontraron seguimientos</Typography></Box>}
      </TabPanel>

      {/* Dialog Crear Seguimiento */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Nuevo Seguimiento</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <PatientSelector value={form.patientId} onChange={handlePatientChange} label="Paciente *" required size="small" />
            <TextField label="Motivo del seguimiento *" value={form.motivoSeguimiento} onChange={(e) => setForm({ ...form, motivoSeguimiento: e.target.value })} fullWidth size="small" multiline rows={2} />
            <FormControl fullWidth size="small" required>
              <InputLabel>Tipo de Seguimiento *</InputLabel>
              <Select value={form.tipoSeguimiento} label="Tipo de Seguimiento *" onChange={(e) => setForm({ ...form, tipoSeguimiento: e.target.value })}>
                {TIPO_SEG_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>
            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Tipo Contacto</InputLabel>
                  <Select value={form.tipoContacto} label="Tipo Contacto" onChange={(e) => setForm({ ...form, tipoContacto: e.target.value })}>
                    <MenuItem value="VIRTUAL">Virtual</MenuItem>
                    <MenuItem value="PRESENCIAL">Presencial</MenuItem>
                    <MenuItem value="TELEFONICO">Telefónico</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Prioridad</InputLabel>
                  <Select value={form.prioridad} label="Prioridad" onChange={(e) => setForm({ ...form, prioridad: e.target.value })}>
                    <MenuItem value="ALTA">Alta</MenuItem>
                    <MenuItem value="MEDIA">Media</MenuItem>
                    <MenuItem value="BAJA">Baja</MenuItem>
                  </Select>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1 }}>Se calcula automáticamente según la fecha</Typography>
                </FormControl>
              </Grid>
            </Grid>
            <TextField label="Fecha y Hora Programada *" type="datetime-local" value={form.fechaProgramada} onChange={(e) => {
              const val = e.target.value;
              setForm({ ...form, fechaProgramada: val, prioridad: calcularPrioridad(val) });
            }} fullWidth size="small" InputLabelProps={{ shrink: true }} />
            <FormControl fullWidth size="small">
              <InputLabel>Modalidad</InputLabel>
              <Select value={form.modalidad} label="Modalidad" onChange={(e) => setForm({ ...form, modalidad: e.target.value })}>
                {MODALIDAD_OPTIONS.map((o) => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField label="Observaciones" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} fullWidth size="small" multiline rows={2} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setOpenDialog(false)} variant="outlined" color="inherit">Cancelar</Button>
          <Button onClick={handleSave} variant="contained" disabled={saving} startIcon={saving ? <CircularProgress size={16} /> : undefined}>
            {saving ? 'Guardando...' : 'Crear Seguimiento'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Cerrar Seguimiento */}
      <Dialog open={openCloseDialog} onClose={() => setOpenCloseDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
          Cerrar Seguimiento
          {closingSeg && (
            <Typography variant="body2" color="text.secondary">{closingSeg.patient} — {closingSeg.titulo || getTipoLabel(closingSeg.tipoSeguimiento)}</Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <FormControl fullWidth size="small" required>
              <InputLabel>Resultado</InputLabel>
              <Select value={closeData.resultado} label="Resultado" onChange={(e) => setCloseData({ ...closeData, resultado: e.target.value })}>
                <MenuItem value="EFECTIVO">✅ Efectivo — Se logró contacto / objetivo</MenuItem>
                <MenuItem value="NO_EFECTIVO">❌ No Efectivo — No se logró contacto / objetivo</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Observaciones del seguimiento" value={closeData.observaciones} onChange={(e) => setCloseData({ ...closeData, observaciones: e.target.value })} fullWidth size="small" multiline rows={3} placeholder="Describa el resultado del seguimiento, hallazgos, próximos pasos..." />
            <FormControlLabel
              control={<Checkbox checked={closeData.barreraIdentificada} onChange={(e) => setCloseData({ ...closeData, barreraIdentificada: e.target.checked })} color="warning" />}
              label={<Typography variant="body2">¿Se identificó una <strong>barrera de acceso</strong> durante este seguimiento?</Typography>}
            />
            {closeData.barreraIdentificada && (
              <Alert severity="warning">
                Al confirmar, será redirigido al módulo de Barreras para registrar la barrera identificada para este paciente.
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setOpenCloseDialog(false)} variant="outlined" color="inherit">Cancelar</Button>
          <Button onClick={handleConfirmClose} variant="contained" color={closeData.resultado === 'EFECTIVO' ? 'success' : 'warning'}>
            Confirmar {closeData.resultado === 'EFECTIVO' ? 'Efectivo' : 'No Efectivo'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FollowupsPage;
