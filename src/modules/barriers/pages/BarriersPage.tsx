import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Stack,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Avatar,
  LinearProgress,
  IconButton,
  Tooltip,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add,
  Search,
  Block,
  CheckCircle,
  Warning,
  Error as ErrorIcon,
  LocalHospital,
  AttachMoney,
  Psychology,
  Accessibility,
  Edit,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { barrierService } from '@services/barrierService';
import { PatientSelector } from '@modules/shared/components/PatientSelector';
import type { Barrier, BarrierCategory, BarrierPrioridad, Patient } from '@/types';/**
 * Página de Barreras
 */
const BarriersPage = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [openDialog, setOpenDialog] = useState(false);
  const [openCloseDialog, setOpenCloseDialog] = useState(false);
  const [closingBarrier, setClosingBarrier] = useState<Barrier | null>(null);
  const [closeBarrierObs, setCloseBarrierObs] = useState('');
  const [saving, setSaving] = useState(false);
  const [barriersList, setBarriersList] = useState<Barrier[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({
    patientId: null as number | null,
    patientName: '',
    category: '' as BarrierCategory | '',
    subcategory: '',
    description: '',
    prioridad: 'MEDIA' as BarrierPrioridad,
  });

  // Auto-open create dialog when redirected from other modules with patientId
  useEffect(() => {
    const pid = searchParams.get('patientId');
    if (pid) {
      setCreateForm((prev) => ({ ...prev, patientId: Number(pid) }));
      setOpenDialog(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const loadBarriers = useCallback(async () => {
    setLoading(true);
    setApiError(null);
    try {
      const page = await barrierService.listar({ page: 0, size: 100 });
      setBarriersList(page.content ?? []);
    } catch (e) {
      console.error('Error cargando barreras:', e);
      setApiError('No se pudieron cargar las barreras. Verifique la conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBarriers();
  }, [loadBarriers]);

  // Barreras y Sub-barreras del modelo oficial PSP
  const BARRERAS_SUB: Record<string, { value: string; label: string; definicion: string }[]> = {
    FORMULACION: [
      { value: 'SIN_CITA_ASIGNADA', label: 'Sin cita asignada', definicion: 'Cita autorizada sin agenda' },
      { value: 'SIN_RED_ATENCION', label: 'Sin red de atención', definicion: 'IPS direccionada sin contrato vigente' },
      { value: 'FORMULACION_INADECUADA', label: 'Formulación inadecuada', definicion: 'Errores en la prescripción' },
      { value: 'SIN_SIVIGILA', label: 'Sin SIVIGILA', definicion: 'Con Mipres sin Sivigila' },
      { value: 'RECHAZADA', label: 'Rechazada', definicion: 'Solicitud de nuevo alcance por la EPS' },
      { value: 'CONCEPTO_MEDICO', label: 'Concepto médico', definicion: 'Médico tratante define' },
      { value: 'CITA_ASIGNADA_INOPORTUNA', label: 'Cita asignada inoportuna', definicion: 'Cita asignada pero no alcanza a cubrir el tiempo de tratamiento' },
    ],
    AUTORIZACION: [
      { value: 'PRODUCTO_NO_CODIFICADO', label: 'Producto no codificado', definicion: 'Tecnología sin codificación en la EPS' },
      { value: 'AUTORIZACION_RECHAZADA', label: 'Autorización rechazada', definicion: 'Tecnología no autorizada por la EPS' },
      { value: 'NUEVO_ALCANCE', label: 'Nuevo alcance', definicion: 'EPS solicita ampliación de HC o mejor justificación' },
      { value: 'AUTORIZACION_ERRADA', label: 'Autorización errada', definicion: 'Autorización que requiere cambio' },
      { value: 'DIRECCIONAMIENTOS', label: 'Direccionamientos', definicion: 'Sin autorización oportuna o requiere cambio de direccionamiento' },
    ],
    COMPRA: [
      { value: 'SIN_COMPRA', label: 'Sin compra', definicion: 'Tecnología autorizada sin compra gestionada' },
      { value: 'COMPRA_PARCIAL', label: 'Compra parcial', definicion: 'Unidades disponibles incompletas según autorización' },
      { value: 'CARTERA', label: 'Cartera', definicion: 'Cartera' },
    ],
    RESPONSABILIDAD_PACIENTE: [
      { value: 'PACIENTE_DE_VIAJE', label: 'Paciente de viaje', definicion: 'Fuera de la ciudad o región de cobertura' },
      { value: 'PACIENTE_CON_CALAMIDAD', label: 'Paciente con calamidad', definicion: 'No asiste a su infusión el día programado' },
      { value: 'PACIENTE_INHADERENTE', label: 'Paciente inhaderente', definicion: 'Por varias razones el paciente decide no dar continuidad al tratamiento' },
      { value: 'PACIENTE_INACTIVO_EPS', label: 'Paciente inactivo EPS', definicion: 'Sin cobertura del SGSS' },
    ],
    INFUSION: [
      { value: 'AGENDAMIENTO_PENDIENTE', label: 'Agendamiento pendiente', definicion: 'Agendamiento pendiente' },
    ],
    ENFERMEDAD: [
      { value: 'ENFERMEDAD', label: 'Enfermedad', definicion: 'Situación médica que impide dar continuidad al tratamiento de manera temporal' },
    ],
    DESPACHO: [
      { value: 'NO_DISPONIBLE', label: 'No disponible', definicion: 'Inventario de medicamento no disponible en la fecha de infusión o aplicación' },
      { value: 'EN_TRANSITO', label: 'En tránsito', definicion: 'Medicamento en camino' },
    ],
  };

  const BARRERA_LABELS: Record<string, string> = {
    FORMULACION: 'Formulación',
    AUTORIZACION: 'Autorización',
    COMPRA: 'Compra',
    RESPONSABILIDAD_PACIENTE: 'Responsabilidad del Paciente',
    INFUSION: 'Infusión',
    ENFERMEDAD: 'Enfermedad',
    DESPACHO: 'Despacho',
  };

  const subBarrerasDisponibles = createForm.category ? (BARRERAS_SUB[createForm.category] || []) : [];

  const handleCerrarBarrera = async () => {
    if (!closingBarrier) return;
    if (!closeBarrierObs.trim()) { toast.error('Ingresa las observaciones de cierre'); return; }
    try {
      const updated = await barrierService.cerrar(closingBarrier.id, {
        resolvedBy: 'Sistema',
        resolutionNotes: closeBarrierObs,
      });
      setBarriersList((prev) =>
        prev.map((b) => b.id === closingBarrier.id ? updated : b)
      );
      toast.success('✅ Barrera cerrada exitosamente');
      setOpenCloseDialog(false);
      setClosingBarrier(null);
      setCloseBarrierObs('');
    } catch (e) {
      console.error(e);
      toast.error('Error al cerrar la barrera');
    }
  };

  const getPriorityColor = (prioridad: string) => {
    switch (prioridad) {
      case 'ALTA': return '#d32f2f';
      case 'MEDIA': return '#f57c00';
      case 'BAJA': return '#388e3c';
      default: return '#757575';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ABIERTA': return 'info';
      case 'EN_PROCESO': return 'warning';
      case 'CERRADA': return 'success';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ABIERTA': return 'Abierta';
      case 'EN_PROCESO': return 'En Proceso';
      case 'CERRADA': return 'Cerrada';
      default: return status;
    }
  };

  const getTypeIcon = (category: string) => {
    switch (category) {
      case 'COMPRA': return <AttachMoney />;
      case 'RESPONSABILIDAD_PACIENTE': return <Psychology />;
      case 'AUTORIZACION': return <Accessibility />;
      case 'INFUSION': return <LocalHospital />;
      case 'ENFERMEDAD': return <LocalHospital />;
      case 'FORMULACION': return <Warning />;
      case 'DESPACHO': return <Block />;
      default: return <Block />;
    }
  };

  const getProgressFromStatus = (status: string): number => {
    switch (status) {
      case 'ABIERTA': return 10;
      case 'EN_PROCESO': return 50;
      case 'CERRADA': return 100;
      default: return 0;
    }
  };

  const filteredBarriers = barriersList.filter((barrier) => {
    const matchesSearch =
      (barrier.patientName ?? '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      barrier.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || barrier.prioridad === priorityFilter;
    const matchesStatus = statusFilter === 'all' || barrier.status === statusFilter;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  const stats = {
    total: barriersList.length,
    alta: barriersList.filter((b) => b.prioridad === 'ALTA').length,
    abiertas: barriersList.filter((b) => b.status === 'ABIERTA').length,
    cerradas: barriersList.filter((b) => b.status === 'CERRADA').length,
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom color="#111827">
            Barreras de Acceso
          </Typography>
          <Typography variant="body1" color="#6b7280">
            Identificación y gestión de barreras de los pacientes
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
          sx={{
            bgcolor: theme.palette.primary.main,
            '&:hover': { bgcolor: theme.palette.primary.dark },
            borderRadius: 2,
            px: 3,
            py: 1.5,
            boxShadow: '0 1px 3px rgba(34,197,94,0.3)',
          }}
        >
          Nueva Barrera
        </Button>
      </Box>

      {apiError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setApiError(null)}>
          {apiError}
        </Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card sx={{ bgcolor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 48, height: 48 }}>
                    <Block />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight={700}>
                      {stats.total}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Total Barreras
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card sx={{ bgcolor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: '#d32f2f', width: 48, height: 48 }}>
                    <ErrorIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight={700}>
                      {stats.alta}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Prioridad Alta
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card sx={{ bgcolor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: '#2196f3', width: 48, height: 48 }}>
                    <Warning />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight={700}>
                      {stats.abiertas}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Abiertas
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Card sx={{ bgcolor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: '#4caf50', width: 48, height: 48 }}>
                    <CheckCircle />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight={700}>
                      {stats.cerradas}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Cerradas
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* Filtros */}
      <Card sx={{ mb: 4, bgcolor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Buscar barreras..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: '#6b7280' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': { borderColor: '#d1d5db' },
                    '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Prioridad</InputLabel>
                <Select
                  value={priorityFilter}
                  label="Prioridad"
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#d1d5db' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main },
                  }}
                >
                  <MenuItem value="all">Todas</MenuItem>
                  <MenuItem value="ALTA">Alta</MenuItem>
                  <MenuItem value="MEDIA">Media</MenuItem>
                  <MenuItem value="BAJA">Baja</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={statusFilter}
                  label="Estado"
                  onChange={(e) => setStatusFilter(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#d1d5db' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main },
                  }}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="ABIERTA">Abierta</MenuItem>
                  <MenuItem value="EN_PROCESO">En Proceso</MenuItem>
                  <MenuItem value="CERRADA">Cerrada</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Lista de Barreras */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
      <Grid container spacing={3}>
        {filteredBarriers.map((barrier, index) => (
          <Grid item xs={12} md={6} key={barrier.id}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              whileHover={{ y: -4 }}
            >
              <Card
                sx={{
                  height: '100%',
                  bgcolor: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  borderLeft: `4px solid ${getPriorityColor(barrier.prioridad)}`,
                  transition: 'all 0.3s ease',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                  },
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flex: 1 }}>
                      <Avatar
                        sx={{
                          bgcolor: `${getPriorityColor(barrier.prioridad)}20`,
                          color: getPriorityColor(barrier.prioridad),
                        }}
                      >
                        {getTypeIcon(barrier.category)}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" fontWeight={600} gutterBottom>
                          {barrier.patientName ?? `Paciente #${barrier.patientId}`}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                          <Chip
                            label={barrier.prioridad}
                            size="small"
                            sx={{
                              bgcolor: getPriorityColor(barrier.prioridad),
                              color: 'white',
                              fontWeight: 600,
                            }}
                          />
                          <Chip
                            label={getStatusLabel(barrier.status)}
                            size="small"
                            color={getStatusColor(barrier.status) as any}
                          />
                          <Chip label={BARRERA_LABELS[barrier.category] ?? barrier.category} size="small" variant="outlined" />
                        </Stack>
                      </Box>
                    </Box>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="Editar">
                        <IconButton size="small" color="primary">
                          <Edit />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {barrier.description}
                  </Typography>

                  {barrier.status === 'CERRADA' && barrier.resolutionNotes && (
                    <Alert severity="success" sx={{ mb: 1.5, py: 0.5 }}>
                      <Typography variant="caption">
                        <strong>Cierre:</strong> {barrier.resolutionNotes}
                        {barrier.closedAt && ` — ${new Date(barrier.closedAt).toLocaleDateString('es-CO')}`}
                      </Typography>
                    </Alert>
                  )}

                  {barrier.subcategoryDescription && (
                    <Box sx={{ bgcolor: '#f5f5f5', p: 1.5, borderRadius: 2, mb: 2 }}>
                      <Typography variant="caption" fontWeight={600} color="primary" gutterBottom>
                        Subcategoría:
                      </Typography>
                      <Typography variant="body2">{barrier.subcategoryDescription}</Typography>
                    </Box>
                  )}

                  <Box sx={{ mb: 1 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="caption" color="text.secondary">
                        Progreso
                      </Typography>
                      <Typography variant="caption" fontWeight={600}>
                        {getProgressFromStatus(barrier.status)}%
                      </Typography>
                    </Box>
                    <LinearProgress
                      variant="determinate"
                      value={getProgressFromStatus(barrier.status)}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: '#e0e0e0',
                        '& .MuiLinearProgress-bar': {
                          borderRadius: 4,
                          bgcolor: getPriorityColor(barrier.prioridad),
                        },
                      }}
                    />
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      mt: 2,
                      pt: 2,
                      borderTop: '1px solid #e0e0e0',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      {barrier.categoryDescription ?? BARRERA_LABELS[barrier.category]}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {barrier.responsibleArea && <>Área: <strong>{barrier.responsibleArea}</strong></>}
                    </Typography>
                  </Box>
                  {barrier.status !== 'CERRADA' && (
                    <Button
                      size="small"
                      variant="contained"
                      color="success"
                      fullWidth
                      sx={{ mt: 1.5 }}
                      onClick={() => { setClosingBarrier(barrier); setCloseBarrierObs(''); setOpenCloseDialog(true); }}
                    >
                      Cerrar Barrera
                    </Button>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>
      )}

      {filteredBarriers.length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Block sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No se encontraron barreras
          </Typography>
        </Box>
      )}

      {/* Dialog Nueva Barrera */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Nueva Barrera</DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2 }}>
            Recuerda: un paciente solo puede tener <strong>1 barrera ACTIVA</strong> a la vez.
          </Alert>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <PatientSelector
              value={createForm.patientId}
              onChange={(_id, patient: Patient | null) => setCreateForm((p) => ({ ...p, patientId: patient?.id ?? null, patientName: patient?.nombreCompleto || (patient ? `${patient.nombre} ${patient.apellido}` : '') }))}
              label="Paciente *"
              required
              size="small"
            />
            <FormControl fullWidth size="small" required>
              <InputLabel>Tipo de Barrera *</InputLabel>
              <Select value={createForm.category} label="Tipo de Barrera *" onChange={(e) => setCreateForm((p) => ({ ...p, category: e.target.value as BarrierCategory, subcategory: '' }))}>
                {Object.keys(BARRERAS_SUB).map((key) => (
                  <MenuItem key={key} value={key}>{BARRERA_LABELS[key] || key}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {subBarrerasDisponibles.length > 0 && (
              <FormControl fullWidth size="small" required>
                <InputLabel>Sub-Barrera *</InputLabel>
                <Select value={createForm.subcategory} label="Sub-Barrera *" onChange={(e) => {
                  const selected = subBarrerasDisponibles.find((s) => s.value === e.target.value);
                  setCreateForm((p) => ({ ...p, subcategory: e.target.value, description: selected?.definicion || p.description }));
                }}>
                  {subBarrerasDisponibles.map((sub) => (
                    <MenuItem key={sub.value} value={sub.value}>{sub.label}</MenuItem>
                  ))}
                </Select>
                {createForm.subcategory && (
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, ml: 1 }}>
                    {subBarrerasDisponibles.find((s) => s.value === createForm.subcategory)?.definicion}
                  </Typography>
                )}
              </FormControl>
            )}
            <TextField label="Descripción *" value={createForm.description} onChange={(e) => setCreateForm((p) => ({ ...p, description: e.target.value }))} fullWidth size="small" multiline rows={2} required />
            <FormControl fullWidth size="small">
              <InputLabel>Prioridad</InputLabel>
              <Select value={createForm.prioridad} label="Prioridad" onChange={(e) => setCreateForm((p) => ({ ...p, prioridad: e.target.value as BarrierPrioridad }))}>
                <MenuItem value="ALTA">Alta</MenuItem>
                <MenuItem value="MEDIA">Media</MenuItem>
                <MenuItem value="BAJA">Baja</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setOpenDialog(false)} variant="outlined" color="inherit">Cancelar</Button>
          <Button
            onClick={async () => {
              if (!createForm.patientId) { toast.error('Selecciona un paciente'); return; }
              if (!createForm.category) { toast.error('Selecciona el tipo de barrera'); return; }
              if (!createForm.description.trim()) { toast.error('Ingresa una descripción'); return; }
              setSaving(true);
              try {
                const created = await barrierService.crear({
                  patientId: createForm.patientId!,
                  category: createForm.category as BarrierCategory,
                  subcategory: createForm.subcategory || createForm.category,
                  description: createForm.description,
                  prioridad: createForm.prioridad,
                });
                setBarriersList((prev) => [created, ...prev]);
                toast.success('✅ Barrera registrada exitosamente');
              } catch (e: any) {
                const msg = e?.response?.data?.message ?? 'Error al crear la barrera';
                toast.error(msg);
              } finally {
                setSaving(false);
                setOpenDialog(false);
                setCreateForm({ patientId: null, patientName: '', category: '', subcategory: '', description: '', prioridad: 'MEDIA' });
              }
            }}
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : undefined}
          >
            {saving ? 'Guardando...' : 'Crear Barrera'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Cerrar Barrera */}
      <Dialog open={openCloseDialog} onClose={() => setOpenCloseDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>
          Cerrar Barrera
          {closingBarrier && (
            <Typography variant="body2" color="text.secondary">
              {closingBarrier.patientName ?? `Paciente #${closingBarrier.patientId}`} — {BARRERA_LABELS[closingBarrier.category] ?? closingBarrier.category}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Alert severity="info" sx={{ py: 0.5 }}>
              La fecha de cierre será registrada como <strong>{new Date().toLocaleDateString('es-CO')}</strong> y el estado cambiará a <strong>CERRADA</strong>.
            </Alert>
            <TextField
              label="Observaciones de cierre *"
              value={closeBarrierObs}
              onChange={(e) => setCloseBarrierObs(e.target.value)}
              fullWidth
              multiline
              rows={3}
              size="small"
              placeholder="Describa la resolución o motivo del cierre de esta barrera..."
              required
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setOpenCloseDialog(false)} variant="outlined" color="inherit">Cancelar</Button>
          <Button onClick={handleCerrarBarrera} variant="contained" color="success" disabled={!closeBarrierObs.trim()}>
            Confirmar Cierre
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BarriersPage;
