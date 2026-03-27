import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Stack,
  CircularProgress,
  Alert,
  Avatar,
  Tabs,
  Tab,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Receipt,
  AttachMoney,
  HourglassEmpty,
  CheckCircle,
  Cancel,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { PatientSelector } from '@modules/shared/components/PatientSelector';
import {
  facturacionService,
  type FacturacionItem,
  type CreateFacturacionRequest,
  type EstadoFactura,
} from '@/services/facturacionService';

const CONCEPTOS = [
  'TRANSPORTE',
  'CONSULTA_NUTRICION',
  'CONSULTA_PSICOLOGIA',
  'TRABAJO_SOCIAL',
  'MEDICAMENTO',
  'OTRO',
] as const;

const ESTADOS: EstadoFactura[] = ['PENDIENTE', 'FACTURADA', 'PAGADA', 'ANULADA'];

const estadoConfig: Record<EstadoFactura, { color: string; bg: string; icon: React.ReactNode }> = {
  PENDIENTE: { color: '#92400E', bg: '#FEF3C7', icon: <HourglassEmpty sx={{ fontSize: 14 }} /> },
  FACTURADA: { color: '#1E40AF', bg: '#DBEAFE', icon: <Receipt sx={{ fontSize: 14 }} /> },
  PAGADA: { color: '#166534', bg: '#DCFCE7', icon: <CheckCircle sx={{ fontSize: 14 }} /> },
  ANULADA: { color: '#991B1B', bg: '#FEE2E2', icon: <Cancel sx={{ fontSize: 14 }} /> },
};

const formatCOP = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value);

const INITIAL_FORM = {
  patientId: undefined as number | undefined,
  servicioId: '',
  tipoConcepto: '',
  fechaServicio: '',
  valor: '',
  estadoFactura: 'PENDIENTE' as EstadoFactura,
  numeroFactura: '',
  fechaFacturacion: '',
  fechaPago: '',
  observaciones: '',
};

const FacturacionPage = () => {
  const [items, setItems] = useState<FacturacionItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [tabIndex, setTabIndex] = useState(0);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [editingItem, setEditingItem] = useState<FacturacionItem | null>(null);
  const [deletingItem, setDeletingItem] = useState<FacturacionItem | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);

  const tabLabels: Array<{ label: string; estado: EstadoFactura | null }> = [
    { label: 'Todos', estado: null },
    { label: 'Pendiente', estado: 'PENDIENTE' },
    { label: 'Facturada', estado: 'FACTURADA' },
    { label: 'Pagada', estado: 'PAGADA' },
    { label: 'Anulada', estado: 'ANULADA' },
  ];

  const activeEstado = tabLabels[tabIndex].estado;

  const filteredItems = activeEstado
    ? items.filter((i) => i.estadoFactura === activeEstado)
    : items;

  const kpis = [
    {
      label: 'Total Registros',
      value: items.length,
      sub: formatCOP(items.reduce((s, i) => s + i.valor, 0)),
      color: '#4F46E5',
      bg: '#EEF2FF',
      icon: <Receipt sx={{ color: '#4F46E5', fontSize: 24 }} />,
    },
    {
      label: 'Pendientes',
      value: items.filter((i) => i.estadoFactura === 'PENDIENTE').length,
      sub: formatCOP(items.filter((i) => i.estadoFactura === 'PENDIENTE').reduce((s, i) => s + i.valor, 0)),
      color: '#D97706',
      bg: '#FEF3C7',
      icon: <HourglassEmpty sx={{ color: '#D97706', fontSize: 24 }} />,
    },
    {
      label: 'Facturadas',
      value: items.filter((i) => i.estadoFactura === 'FACTURADA').length,
      sub: formatCOP(items.filter((i) => i.estadoFactura === 'FACTURADA').reduce((s, i) => s + i.valor, 0)),
      color: '#2563EB',
      bg: '#DBEAFE',
      icon: <Receipt sx={{ color: '#2563EB', fontSize: 24 }} />,
    },
    {
      label: 'Pagadas',
      value: items.filter((i) => i.estadoFactura === 'PAGADA').length,
      sub: formatCOP(items.filter((i) => i.estadoFactura === 'PAGADA').reduce((s, i) => s + i.valor, 0)),
      color: '#10B981',
      bg: '#DCFCE7',
      icon: <CheckCircle sx={{ color: '#10B981', fontSize: 24 }} />,
    },
  ];

  const loadItems = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await facturacionService.listar();
      setItems(data);
    } catch {
      setErrorMsg('No se pudo cargar la información de facturación.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const resetForm = () => {
    setForm(INITIAL_FORM);
    setEditingItem(null);
  };

  const handleOpenCreate = () => {
    resetForm();
    setOpenDialog(true);
  };

  const handleOpenEdit = (item: FacturacionItem) => {
    setEditingItem(item);
    setForm({
      patientId: item.patientId,
      servicioId: item.servicioId ?? '',
      tipoConcepto: item.tipoConcepto,
      fechaServicio: item.fechaServicio,
      valor: String(item.valor),
      estadoFactura: item.estadoFactura,
      numeroFactura: item.numeroFactura ?? '',
      fechaFacturacion: item.fechaFacturacion ?? '',
      fechaPago: item.fechaPago ?? '',
      observaciones: item.observaciones ?? '',
    });
    setOpenDialog(true);
  };

  const handleSave = async () => {
    if (!form.patientId) {
      toast.error('Seleccione un paciente');
      return;
    }
    if (!form.tipoConcepto) {
      toast.error('Seleccione el tipo de concepto');
      return;
    }
    if (!form.fechaServicio) {
      toast.error('Ingrese la fecha de servicio');
      return;
    }
    if (!form.valor || Number(form.valor) <= 0) {
      toast.error('Ingrese un valor válido');
      return;
    }

    try {
      if (editingItem) {
        await facturacionService.actualizar(editingItem.id, {
          patientId: form.patientId,
          servicioId: form.servicioId || undefined,
          tipoConcepto: form.tipoConcepto,
          fechaServicio: form.fechaServicio,
          valor: Number(form.valor),
          estadoFactura: form.estadoFactura,
          numeroFactura: form.numeroFactura || undefined,
          fechaFacturacion: form.fechaFacturacion || undefined,
          fechaPago: form.fechaPago || undefined,
          observaciones: form.observaciones || undefined,
        });
        toast.success('Factura actualizada correctamente');
      } else {
        const payload: CreateFacturacionRequest = {
          patientId: form.patientId,
          tipoConcepto: form.tipoConcepto,
          fechaServicio: form.fechaServicio,
          valor: Number(form.valor),
          estadoFactura: form.estadoFactura,
          ...(form.servicioId && { servicioId: form.servicioId }),
          ...(form.numeroFactura && { numeroFactura: form.numeroFactura }),
          ...(form.fechaFacturacion && { fechaFacturacion: form.fechaFacturacion }),
          ...(form.observaciones && { observaciones: form.observaciones }),
        };
        await facturacionService.crear(payload);
        toast.success('Factura creada correctamente');
      }
      setOpenDialog(false);
      resetForm();
      loadItems();
    } catch {
      toast.error(editingItem ? 'Error al actualizar factura' : 'Error al crear factura');
    }
  };

  const handleDelete = async () => {
    if (!deletingItem) return;
    try {
      await facturacionService.eliminar(deletingItem.id);
      toast.success('Registro eliminado');
      setOpenDeleteDialog(false);
      setDeletingItem(null);
      loadItems();
    } catch {
      toast.error('Error al eliminar el registro');
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
            mb: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Receipt sx={{ color: '#4F46E5', fontSize: 32 }} />
            <Box>
              <Typography variant="h5" fontWeight={700} color="text.primary">
                Facturación
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Gestión de facturación de servicios
              </Typography>
            </Box>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            sx={{
              backgroundColor: '#4F46E5',
              '&:hover': { backgroundColor: '#4338CA' },
              borderRadius: '8px',
              textTransform: 'none',
              fontWeight: 600,
            }}
            onClick={handleOpenCreate}
          >
            Nueva Factura
          </Button>
        </Box>
      </motion.div>

      {/* Loading / Error */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}
      {errorMsg && !loading && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}

      {/* KPI Cards */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Grid container spacing={2} sx={{ mb: 3, mt: 1 }}>
            {kpis.map((kpi, i) => (
              <Grid item xs={12} sm={6} md={3} key={i}>
                <Card
                  sx={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                  }}
                  elevation={0}
                >
                  <CardContent sx={{ p: 2 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}
                    >
                      <Box>
                        <Typography variant="caption" color="text.secondary" fontWeight={500}>
                          {kpi.label}
                        </Typography>
                        <Typography
                          variant="h5"
                          fontWeight={700}
                          sx={{ color: kpi.color, mt: 0.5 }}
                        >
                          {kpi.value}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {kpi.sub}
                        </Typography>
                      </Box>
                      <Box
                        sx={{
                          backgroundColor: kpi.bg,
                          borderRadius: '10px',
                          p: 1.5,
                          display: 'flex',
                          alignItems: 'center',
                        }}
                      >
                        {kpi.icon}
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </motion.div>
      )}

      {/* Filter Tabs */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
        >
          <Paper
            sx={{
              borderRadius: '12px',
              border: '1px solid #E5E7EB',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              mb: 2,
            }}
            elevation={0}
          >
            <Tabs
              value={tabIndex}
              onChange={(_, v) => setTabIndex(v)}
              sx={{
                px: 2,
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                },
                '& .Mui-selected': { color: '#4F46E5' },
                '& .MuiTabs-indicator': { backgroundColor: '#4F46E5' },
              }}
            >
              {tabLabels.map((t, i) => (
                <Tab key={i} label={t.label} />
              ))}
            </Tabs>
          </Paper>
        </motion.div>
      )}

      {/* Table */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <TableContainer
            component={Paper}
            sx={{
              borderRadius: '12px',
              border: '1px solid #E5E7EB',
              boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            }}
            elevation={0}
          >
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#F9FAFB' }}>
                  {[
                    'Paciente',
                    'Concepto',
                    'Fecha Servicio',
                    'Valor',
                    'Nro. Factura',
                    'Estado',
                    'Acciones',
                  ].map((col) => (
                    <TableCell
                      key={col}
                      sx={{
                        fontWeight: 700,
                        fontSize: '0.75rem',
                        color: '#6B7280',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                      }}
                    >
                      {col}
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No hay registros de facturación
                        {activeEstado ? ` en estado ${activeEstado}` : ''}.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {filteredItems.map((item) => {
                  const chip = estadoConfig[item.estadoFactura];
                  return (
                    <TableRow
                      key={item.id}
                      sx={{
                        '&:hover': { backgroundColor: '#F9FAFB' },
                        transition: 'background 0.15s',
                      }}
                    >
                      <TableCell>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Avatar
                            sx={{
                              width: 32,
                              height: 32,
                              fontSize: '0.8rem',
                              bgcolor: '#4F46E5',
                            }}
                          >
                            {item.patientName?.charAt(0)?.toUpperCase() || '?'}
                          </Avatar>
                          <Box>
                            <Typography
                              variant="body2"
                              sx={{ fontWeight: 600, fontSize: '0.82rem', color: '#374151' }}
                            >
                              {item.patientName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              ID: {item.patientId}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.tipoConcepto.replace(/_/g, ' ')}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.72rem' }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.82rem', color: '#6B7280' }}>
                        {item.fechaServicio}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#374151' }}>
                        {formatCOP(item.valor)}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.82rem', color: '#6B7280' }}>
                        {item.numeroFactura || '—'}
                      </TableCell>
                      <TableCell>
                        <Box
                          sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 0.5,
                            backgroundColor: chip.bg,
                            color: chip.color,
                            borderRadius: '20px',
                            px: 1.5,
                            py: 0.4,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                          }}
                        >
                          {chip.icon}
                          {item.estadoFactura}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Tooltip title="Editar">
                            <IconButton
                              size="small"
                              sx={{ color: '#4F46E5' }}
                              onClick={() => handleOpenEdit(item)}
                            >
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Eliminar">
                            <IconButton
                              size="small"
                              sx={{ color: '#EF4444' }}
                              onClick={() => {
                                setDeletingItem(item);
                                setOpenDeleteDialog(true);
                              }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </motion.div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingItem ? 'Editar Factura' : 'Nueva Factura'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <PatientSelector
              value={form.patientId ?? null}
              onChange={(id) => setForm({ ...form, patientId: id ?? undefined })}
              label="Paciente"
            />
            <FormControl fullWidth required>
              <InputLabel>Tipo de Concepto</InputLabel>
              <Select
                value={form.tipoConcepto}
                label="Tipo de Concepto"
                onChange={(e) => setForm({ ...form, tipoConcepto: e.target.value })}
              >
                {CONCEPTOS.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c.replace(/_/g, ' ')}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Fecha de Servicio"
              type="date"
              value={form.fechaServicio}
              onChange={(e) => setForm({ ...form, fechaServicio: e.target.value })}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Valor"
              type="number"
              inputProps={{ step: '0.01', min: '0' }}
              value={form.valor}
              onChange={(e) => setForm({ ...form, valor: e.target.value })}
              fullWidth
              required
            />
            <FormControl fullWidth>
              <InputLabel>Estado</InputLabel>
              <Select
                value={form.estadoFactura}
                label="Estado"
                onChange={(e) =>
                  setForm({ ...form, estadoFactura: e.target.value as EstadoFactura })
                }
              >
                {ESTADOS.map((e) => (
                  <MenuItem key={e} value={e}>
                    {e}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Número de Factura"
              value={form.numeroFactura}
              onChange={(e) => setForm({ ...form, numeroFactura: e.target.value })}
              fullWidth
              placeholder="Opcional"
            />
            <TextField
              label="Fecha de Facturación"
              type="date"
              value={form.fechaFacturacion}
              onChange={(e) => setForm({ ...form, fechaFacturacion: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            {form.estadoFactura === 'PAGADA' && (
              <TextField
                label="Fecha de Pago"
                type="date"
                value={form.fechaPago}
                onChange={(e) => setForm({ ...form, fechaPago: e.target.value })}
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            )}
            <TextField
              label="Observaciones"
              value={form.observaciones}
              onChange={(e) => setForm({ ...form, observaciones: e.target.value })}
              fullWidth
              multiline
              rows={3}
              placeholder="Opcional"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => {
              setOpenDialog(false);
              resetForm();
            }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleSave}
            sx={{
              backgroundColor: '#4F46E5',
              '&:hover': { backgroundColor: '#4338CA' },
            }}
          >
            {editingItem ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)} maxWidth="xs">
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            ¿Está seguro de eliminar el registro de facturación de{' '}
            <strong>{deletingItem?.patientName}</strong> por{' '}
            <strong>{deletingItem ? formatCOP(deletingItem.valor) : ''}</strong>?
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            sx={{ backgroundColor: '#EF4444', '&:hover': { backgroundColor: '#DC2626' } }}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FacturacionPage;
