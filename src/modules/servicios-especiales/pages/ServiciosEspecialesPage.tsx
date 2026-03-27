import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Tabs,
  Tab,
  Avatar,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Stack,
  Divider,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  MedicalServices,
  Person,
  CalendarToday,
  CheckCircle,
  Schedule,
  Warning,
  Cancel,
  VerifiedUser,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { PatientSelector } from '@modules/shared/components/PatientSelector';
import { servicioComplementarioService } from '@services/servicioComplementarioService';
import type {
  ServicioComplementario as ServicioComplementarioType,
  TipoServicioComplementario,
  EstadoServicioComplementario,
} from '../../../types';

type ServicioTipo = 'ENFERMERÍA' | 'NUTRICIÓN' | 'PSICOLOGÍA' | 'TRABAJO SOCIAL';
type ServicioEstado = 'ACTIVO' | 'PENDIENTE' | 'CERRADO_EFECTIVO' | 'CERRADO_NO_EFECTIVO' | 'CANCELADO';

// Maps between backend enums and frontend display names
const TIPO_BACKEND_TO_DISPLAY: Record<string, ServicioTipo> = {
  ENFERMERIA: 'ENFERMERÍA',
  NUTRICION: 'NUTRICIÓN',
  PSICOLOGIA: 'PSICOLOGÍA',
  TRABAJO_SOCIAL: 'TRABAJO SOCIAL',
};

const TIPO_DISPLAY_TO_BACKEND: Record<ServicioTipo, TipoServicioComplementario> = {
  'ENFERMERÍA': 'ENFERMERIA',
  'NUTRICIÓN': 'NUTRICION',
  'PSICOLOGÍA': 'PSICOLOGIA',
  'TRABAJO SOCIAL': 'TRABAJO_SOCIAL',
};

const ESTADO_BACKEND_TO_DISPLAY: Record<EstadoServicioComplementario, ServicioEstado> = {
  SOLICITADO: 'PENDIENTE',
  PROGRAMADO: 'ACTIVO',
  REALIZADO: 'CERRADO_EFECTIVO',
  CANCELADO: 'CANCELADO',
};

interface Servicio {
  id: string;
  paciente: string;
  patientId: number;
  tipo: ServicioTipo;
  profesional: string;
  proximaCita: string;
  estado: ServicioEstado;
  descripcion: string;
  fechaCierre?: string;
  cierreResultado?: 'EFECTIVO' | 'NO_EFECTIVO';
  cierrePor?: string;
  notaCierre?: string;
}

function mapApiToServicio(sc: ServicioComplementarioType): Servicio {
  const tipo = TIPO_BACKEND_TO_DISPLAY[sc.tipoServicio];
  if (!tipo) return null as unknown as Servicio; // skip TRANSPORTE
  return {
    id: sc.id,
    paciente: sc.patientName || `Paciente #${sc.patientId}`,
    patientId: sc.patientId,
    tipo,
    profesional: sc.profesionalAtiende || 'Por asignar',
    proximaCita: sc.fechaServicio || sc.fechaSolicitud || 'Por definir',
    estado: ESTADO_BACKEND_TO_DISPLAY[sc.estadoServicio],
    descripcion: sc.observaciones || '',
  };
}

const tipoConfig: Record<
  ServicioTipo,
  { color: string; bg: string; avatarBg: string }
> = {
  ENFERMERÍA: { color: '#0E7490', bg: '#E0F2FE', avatarBg: '#0E7490' },
  NUTRICIÓN: { color: '#166534', bg: '#DCFCE7', avatarBg: '#16A34A' },
  PSICOLOGÍA: { color: '#7C3AED', bg: '#EDE9FE', avatarBg: '#7C3AED' },
  'TRABAJO SOCIAL': { color: '#D97706', bg: '#FEF3C7', avatarBg: '#D97706' },
};

const estadoConfig: Record<
  ServicioEstado,
  { label: string; color: 'success' | 'warning' | 'default' | 'error' }
> = {
  ACTIVO: { label: 'Activo', color: 'success' },
  PENDIENTE: { label: 'Pendiente', color: 'warning' },
  CERRADO_EFECTIVO: { label: 'Cerrado Efectivo', color: 'success' },
  CERRADO_NO_EFECTIVO: { label: 'Cerrado No Efectivo', color: 'error' },
  CANCELADO: { label: 'Cancelado', color: 'error' },
};

const tipoIniciales: Record<ServicioTipo, string> = {
  ENFERMERÍA: 'ENF',
  NUTRICIÓN: 'NUT',
  PSICOLOGÍA: 'PSI',
  'TRABAJO SOCIAL': 'TS',
};

const TABS = ['TODOS', 'ENFERMERÍA', 'NUTRICIÓN', 'PSICOLOGÍA', 'TRABAJO SOCIAL'];

const ServiciosEspecialesPage = () => {
  const theme = useTheme();
  const [tabIndex, setTabIndex] = useState(0);
  const [servicios, setServicios] = useState<Servicio[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openCierreDialog, setOpenCierreDialog] = useState(false);
  const [selectedServicio, setSelectedServicio] = useState<Servicio | null>(null);
  const [form, setForm] = useState({ pacienteId: undefined as number | undefined, tipo: '' as ServicioTipo | '', profesional: '', proximaCita: '', descripcion: '' });
  const [cierreForm, setCierreForm] = useState({
    resultado: '' as 'EFECTIVO' | 'NO_EFECTIVO' | '',
    cierrePor: '' as 'EDUCADORA' | 'ESPECIALISTA' | '',
    notaCierre: '',
    fechaCierre: new Date().toISOString().split('T')[0],
  });

  const loadServicios = useCallback(async () => {
    setLoading(true);
    try {
      const data = await servicioComplementarioService.listar();
      const mapped = data
        .map(mapApiToServicio)
        .filter((s): s is Servicio => s !== null);
      setServicios(mapped);
    } catch (err) {
      console.error('Error cargando servicios:', err);
      toast.error('Error al cargar servicios especiales');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServicios();
  }, [loadServicios]);

  const handleAbrirCierre = (servicio: Servicio) => {
    setSelectedServicio(servicio);
    setCierreForm({ resultado: '', cierrePor: '', notaCierre: '', fechaCierre: new Date().toISOString().split('T')[0] });
    setOpenCierreDialog(true);
  };

  const handleCerrar = async () => {
    if (!selectedServicio || !cierreForm.resultado || !cierreForm.cierrePor) {
      toast.error('Seleccione resultado y quién realiza el cierre');
      return;
    }
    try {
      if (cierreForm.resultado === 'EFECTIVO') {
        await servicioComplementarioService.completar(selectedServicio.id, {
          profesionalAtiende: cierreForm.cierrePor,
          observaciones: cierreForm.notaCierre || undefined,
        });
      } else {
        await servicioComplementarioService.cancelar(selectedServicio.id, {
          motivoCancelacion: cierreForm.notaCierre || 'No efectivo',
        });
      }
      setOpenCierreDialog(false);
      toast.success(cierreForm.resultado === 'EFECTIVO' ? '✅ Servicio cerrado exitosamente (Efectivo)' : '❌ Servicio cerrado (No Efectivo)');
      loadServicios();
    } catch (err) {
      console.error('Error cerrando servicio:', err);
      toast.error('Error al cerrar el servicio');
    }
  };

  const tabFiltro = TABS[tabIndex];
  const serviciosFiltrados =
    tabFiltro === 'TODOS'
      ? servicios
      : servicios.filter((s) => s.tipo === tabFiltro);

  const handleSave = async () => {
    if (!form.pacienteId) { toast.error('Seleccione un paciente'); return; }
    if (!form.tipo) { toast.error('Seleccione el tipo de servicio'); return; }
    try {
      const backendTipo = TIPO_DISPLAY_TO_BACKEND[form.tipo as ServicioTipo];
      await servicioComplementarioService.crear({
        patientId: form.pacienteId,
        tipoServicio: backendTipo,
        fechaSolicitud: new Date().toISOString().split('T')[0],
        fechaServicio: form.proximaCita || undefined,
        observaciones: form.descripcion || undefined,
      });
      setOpenDialog(false);
      setForm({ pacienteId: undefined, tipo: '', profesional: '', proximaCita: '', descripcion: '' });
      toast.success('Servicio especial agendado');
      loadServicios();
    } catch (err) {
      console.error('Error creando servicio:', err);
      toast.error('Error al agendar servicio');
    }
  };

  return (
    <Box sx={{ p: 3, backgroundColor: '#F7F8FA', minHeight: '100vh' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 3,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <MedicalServices sx={{ color: '#0E7490', fontSize: 32 }} />
            <Typography variant="h5" fontWeight={700} color="text.primary">
              Servicios Especiales
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            sx={{
              backgroundColor: '#0E7490',
              '&:hover': { backgroundColor: '#0c6680' },
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 600,
            }}
            onClick={() => setOpenDialog(true)}
          >
            Agendar Servicio
          </Button>
        </Box>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Box
          sx={{
            mb: 3,
            backgroundColor: '#FFFFFF',
            borderRadius: '12px',
            border: '1px solid #E5E7EB',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          }}
        >
          <Tabs
            value={tabIndex}
            onChange={(_, v) => setTabIndex(v)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 600,
                fontSize: '0.85rem',
                color: '#6B7280',
              },
              '& .Mui-selected': { color: '#0E7490' },
              '& .MuiTabs-indicator': { backgroundColor: '#0E7490' },
            }}
          >
            {TABS.map((tab) => {
              const count =
                tab === 'TODOS'
                  ? servicios.length
                  : servicios.filter((s) => s.tipo === tab).length;
              return (
                <Tab
                  key={tab}
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                      {tab}
                      <Box
                        sx={{
                          backgroundColor:
                            TABS[tabIndex] === tab ? '#0E7490' : '#E5E7EB',
                          color: TABS[tabIndex] === tab ? '#FFFFFF' : '#6B7280',
                          borderRadius: '10px',
                          px: 0.8,
                          py: 0.1,
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          minWidth: 20,
                          textAlign: 'center',
                        }}
                      >
                        {count}
                      </Box>
                    </Box>
                  }
                />
              );
            })}
          </Tabs>
        </Box>
      </motion.div>

      {/* Cards Grid */}
      <Grid container spacing={2}>
        {serviciosFiltrados.map((servicio, index) => {
          const tipoCfg = tipoConfig[servicio.tipo];
          const estadoCfg = estadoConfig[servicio.estado];
          return (
            <Grid item xs={12} sm={6} md={4} key={servicio.id}>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.07 }}
              >
                <Card
                  sx={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                    transition: 'box-shadow 0.2s, transform 0.2s',
                    '&:hover': {
                      boxShadow: '0 4px 12px rgba(14,116,144,0.15)',
                      transform: 'translateY(-2px)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 2 }}>
                    {/* Tipo Badge + Estado */}
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        mb: 2,
                      }}
                    >
                      <Box
                        sx={{
                          backgroundColor: tipoCfg.bg,
                          color: tipoCfg.color,
                          borderRadius: '8px',
                          px: 1.5,
                          py: 0.4,
                          fontSize: '0.72rem',
                          fontWeight: 700,
                        }}
                      >
                        {servicio.tipo}
                      </Box>
                      <Chip
                        label={estadoCfg.label}
                        color={estadoCfg.color}
                        size="small"
                        sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                      />
                    </Box>

                    {/* Paciente — dato protegido, no se muestra nombre */}
                    <Box
                      sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}
                    >
                      <Avatar
                        sx={{
                          backgroundColor: tipoCfg.avatarBg,
                          width: 36,
                          height: 36,
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}
                      >
                        P
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" fontWeight={700}>
                          Paciente PSP
                        </Typography>
                        <Box
                          sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                        >
                          <Person sx={{ fontSize: 12, color: '#6B7280' }} />
                          <Typography variant="caption" color="text.secondary">
                            {servicio.profesional}
                          </Typography>
                        </Box>
                      </Box>
                    </Box>

                    {/* Descripción */}
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        mb: 1.5,
                        fontSize: '0.8rem',
                        lineHeight: 1.4,
                      }}
                    >
                      {servicio.descripcion}
                    </Typography>

                    {/* Info de cierre si el servicio está cerrado */}
                    {(servicio.estado === 'CERRADO_EFECTIVO' || servicio.estado === 'CERRADO_NO_EFECTIVO') && servicio.fechaCierre && (
                      <Box sx={{
                        p: 1.2,
                        backgroundColor: servicio.estado === 'CERRADO_EFECTIVO' ? '#F0FDF4' : '#FFF5F5',
                        borderRadius: '8px',
                        border: `1px solid ${servicio.estado === 'CERRADO_EFECTIVO' ? '#BBF7D0' : '#FECACA'}`,
                        mb: 0.5,
                      }}>
                        <Stack direction="row" alignItems="center" spacing={0.5} mb={0.25}>
                          {servicio.estado === 'CERRADO_EFECTIVO'
                            ? <VerifiedUser sx={{ fontSize: 13, color: '#16A34A' }} />
                            : <Cancel sx={{ fontSize: 13, color: '#DC2626' }} />}
                          <Typography variant="caption" fontWeight={700} color={servicio.estado === 'CERRADO_EFECTIVO' ? '#16A34A' : '#DC2626'}>
                            {servicio.estado === 'CERRADO_EFECTIVO' ? 'Cierre Efectivo' : 'Cierre No Efectivo'}
                          </Typography>
                        </Stack>
                        <Typography variant="caption" color="text.secondary" display="block">
                          {servicio.fechaCierre} · Cerrado por: {servicio.cierrePor}
                        </Typography>
                        {servicio.notaCierre && (
                          <Typography variant="caption" color="text.secondary" display="block" sx={{ fontStyle: 'italic' }}>
                            "{servicio.notaCierre}"
                          </Typography>
                        )}
                      </Box>
                    )}

                    {/* Próxima cita */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.8,
                        backgroundColor: '#F9FAFB',
                        borderRadius: '8px',
                        p: 1,
                        border: '1px solid #E5E7EB',
                      }}
                    >
                      <CalendarToday sx={{ fontSize: 14, color: '#0E7490' }} />
                      <Box>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          display="block"
                        >
                          Próxima cita
                        </Typography>
                        <Typography variant="body2" fontWeight={600}>
                          {servicio.proximaCita}
                        </Typography>
                      </Box>
                    </Box>

                    {/* Actions */}
                    <Box sx={{ display: 'flex', gap: 1, mt: 1.5 }}>
                      <Button
                        size="small"
                        variant="outlined"
                        fullWidth
                        sx={{ borderRadius: '8px', textTransform: 'none', fontSize: '0.75rem', borderColor: '#E5E7EB', color: '#374151' }}
                        onClick={() => toast(`Ver detalles: ${servicio.paciente}`, { icon: '👁️' })}
                      >
                        Ver Detalle
                      </Button>
                      {(servicio.estado === 'ACTIVO' || servicio.estado === 'PENDIENTE') && (
                        <Button
                          size="small"
                          variant="contained"
                          fullWidth
                          sx={{ borderRadius: '8px', textTransform: 'none', fontSize: '0.75rem', backgroundColor: '#DC2626', '&:hover': { backgroundColor: '#B91C1C' } }}
                          onClick={() => handleAbrirCierre(servicio)}
                        >
                          Cerrar
                        </Button>
                      )}
                      {(servicio.estado === 'ACTIVO' || servicio.estado === 'PENDIENTE') && (
                        <Button
                          size="small"
                          variant="outlined"
                          sx={{ borderRadius: '8px', textTransform: 'none', fontSize: '0.75rem', borderColor: '#0E7490', color: '#0E7490', px: 1 }}
                          onClick={() => toast.success(`Cita reagendada: ${servicio.paciente}`)}
                        >
                          📅
                        </Button>
                      )}
                    </Box>
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          );
        })}
      </Grid>

      {loading && (
        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary" mt={2}>
            Cargando servicios...
          </Typography>
        </Box>
      )}

      {!loading && serviciosFiltrados.length === 0 && (
        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <MedicalServices sx={{ fontSize: 64, color: '#D1D5DB' }} />
          <Typography variant="h6" color="text.secondary" mt={2}>
            No hay servicios en esta categoría
          </Typography>
        </Box>
      )}

      {/* Dialog: Agendar Servicio Especial */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Agendar Servicio Especial</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <PatientSelector
              value={form.pacienteId ?? null}
              onChange={(id) => setForm({ ...form, pacienteId: id ?? undefined })}
              label="Paciente"
              required
            />
            <FormControl fullWidth required>
              <InputLabel>Tipo de Servicio</InputLabel>
              <Select value={form.tipo} label="Tipo de Servicio" onChange={(e) => setForm({ ...form, tipo: e.target.value as ServicioTipo })}>
                <MenuItem value="ENFERMERÍA">Enfermería</MenuItem>
                <MenuItem value="NUTRICIÓN">Nutrición</MenuItem>
                <MenuItem value="PSICOLOGÍA">Psicología</MenuItem>
                <MenuItem value="TRABAJO SOCIAL">Trabajo Social</MenuItem>
                <MenuItem value="FISIOTERAPIA">Fisioterapia</MenuItem>
                <MenuItem value="OTRO">Otro</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Profesional Asignado" value={form.profesional} onChange={(e) => setForm({ ...form, profesional: e.target.value })} fullWidth placeholder="Nombre del profesional" />
            <TextField label="Fecha Programada" type="date" value={form.proximaCita} onChange={(e) => setForm({ ...form, proximaCita: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label="Descripción / Motivo" value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} fullWidth multiline rows={3} required />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>Agendar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Cerrar Servicio */}
      <Dialog open={openCierreDialog} onClose={() => setOpenCierreDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          Cerrar Servicio
          {selectedServicio && (
            <Typography variant="body2" color="text.secondary">{selectedServicio.tipo} – {selectedServicio.profesional}</Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Resultado del Cierre</InputLabel>
              <Select
                value={cierreForm.resultado}
                label="Resultado del Cierre"
                onChange={(e) => setCierreForm({ ...cierreForm, resultado: e.target.value as 'EFECTIVO' | 'NO_EFECTIVO' })}
              >
                <MenuItem value="EFECTIVO">✅ Efectivo – El servicio logró su objetivo</MenuItem>
                <MenuItem value="NO_EFECTIVO">❌ No Efectivo – No se logró el objetivo</MenuItem>
              </Select>
            </FormControl>
            <FormControl fullWidth required>
              <InputLabel>Cerrado Por</InputLabel>
              <Select
                value={cierreForm.cierrePor}
                label="Cerrado Por"
                onChange={(e) => setCierreForm({ ...cierreForm, cierrePor: e.target.value as 'EDUCADORA' | 'ESPECIALISTA' })}
              >
                <MenuItem value="EDUCADORA">👩‍⚕️ Educadora</MenuItem>
                <MenuItem value="ESPECIALISTA">👨‍⚕️ Especialista Asignado</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Fecha de Cierre"
              type="date"
              value={cierreForm.fechaCierre}
              onChange={(e) => setCierreForm({ ...cierreForm, fechaCierre: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Nota de Cierre (opcional)"
              value={cierreForm.notaCierre}
              onChange={(e) => setCierreForm({ ...cierreForm, notaCierre: e.target.value })}
              fullWidth
              multiline
              rows={2}
              placeholder="Observaciones sobre el resultado del servicio"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenCierreDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleCerrar}
            sx={{ backgroundColor: cierreForm.resultado === 'EFECTIVO' ? '#16A34A' : '#DC2626', '&:hover': { backgroundColor: cierreForm.resultado === 'EFECTIVO' ? '#15803D' : '#B91C1C' } }}
          >
            Confirmar Cierre
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ServiciosEspecialesPage;
