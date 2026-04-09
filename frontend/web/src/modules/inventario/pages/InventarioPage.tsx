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
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add,
  Edit,
  History,
  Inventory,
  Warning,
  CheckCircle,
  Error,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { PatientSelector } from '@modules/shared/components/PatientSelector';
import { inventarioService } from '../services/inventario.service';

type MedEstado = 'DISPONIBLE' | 'CRITICO' | 'AGOTADO';

interface Medicamento {
  id: number;
  nombre: string;
  codigo: string;
  categoria: string;
  tratamiento?: string;
  pacienteNombre?: string;
  pacienteId?: number;
  stockActual: number;
  stockMinimo: number;
  unidad: string;
  vencimiento: string;
  estado: MedEstado;
  prescripcionVinculada?: string;
}



const estadoChip = (estado: MedEstado) => {
  const map: Record<MedEstado, { color: string; bg: string; icon: React.ReactNode }> = {
    DISPONIBLE: {
      color: '#166534',
      bg: '#DCFCE7',
      icon: <CheckCircle sx={{ fontSize: 14 }} />,
    },
    CRITICO: {
      color: '#9A3412',
      bg: '#FEF3C7',
      icon: <Warning sx={{ fontSize: 14 }} />,
    },
    AGOTADO: {
      color: '#991B1B',
      bg: '#FEE2E2',
      icon: <Error sx={{ fontSize: 14 }} />,
    },
  };
  return map[estado];
};



const InventarioPage = () => {
  const theme = useTheme();
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openAjusteDialog, setOpenAjusteDialog] = useState(false);
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false);
  const [historyMed, setHistoryMed] = useState<Medicamento | null>(null);
  const [historyMovimientos, setHistoryMovimientos] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [selectedMed, setSelectedMed] = useState<Medicamento | null>(null);
  const [form, setForm] = useState({ nombre: '', codigo: '', categoria: '', tratamiento: '', pacienteId: undefined as number | undefined, pacienteNombre: '', stockActual: '', stockMinimo: '', unidad: 'Vial', vencimiento: '', tipoMovimiento: 'ENTRADA' as 'ENTRADA' | 'SALIDA' | 'AJUSTE', lote: '', observaciones: '', prescripcionVinculada: '' });
  const [ajuste, setAjuste] = useState({ tipoMovimiento: 'ENTRADA' as 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'DESCUENTO_APLICACION', cantidad: '', lote: '', observaciones: '' });

  const kpis = [
    { label: 'Total Medicamentos', value: medicamentos.length, color: '#0E7490', bg: '#E0F2FE' },
    { label: 'Stock Crítico', value: medicamentos.filter((m) => m.estado === 'CRITICO').length, color: '#D97706', bg: '#FEF3C7', alert: true },
    { label: 'Valor Total Inventario', value: '$—', color: '#166534', bg: '#DCFCE7' },
    { label: 'Próximos a Vencer', value: medicamentos.filter((m) => {
      const ven = new Date(m.vencimiento);
      const hoy = new Date();
      return ven > hoy && ven.getTime() - hoy.getTime() < 30 * 24 * 60 * 60 * 1000;
    }).length, color: '#7C3AED', bg: '#EDE9FE' },
  ];

  const loadMedicamentos = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await inventarioService.getInventario();
      setMedicamentos(data);
    } catch {
      setErrorMsg('No se pudo cargar el inventario desde el servidor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMedicamentos(); }, [loadMedicamentos]);

  const handleSaveNuevo = async () => {
    if (!form.nombre || !form.stockActual) { toast.error('Complete los campos obligatorios'); return; }
    if (!form.pacienteId) { toast.error('Seleccione un paciente'); return; }
    try {
      await inventarioService.registrar({
        pacienteId: form.pacienteId,
        nombre: form.nombre,
        codigo: form.codigo || `MED-${Date.now().toString().slice(-4)}`,
        categoria: form.tratamiento || form.categoria,
        tratamiento: form.tratamiento,
        stockActual: Number(form.stockActual),
        stockMinimo: Number(form.stockMinimo) || 0,
        unidad: form.unidad,
        vencimiento: form.vencimiento || undefined,
        prescripcionVinculada: form.prescripcionVinculada || undefined,
        lote: form.lote || undefined,
      } as any);
      setOpenDialog(false);
      setForm({ nombre: '', codigo: '', categoria: '', tratamiento: '', pacienteId: undefined, pacienteNombre: '', stockActual: '', stockMinimo: '', unidad: 'Vial', vencimiento: '', tipoMovimiento: 'ENTRADA', lote: '', observaciones: '', prescripcionVinculada: '' });
      toast.success('Medicamento registrado en inventario');
      loadMedicamentos();
    } catch (err) {
      console.error('Error registrando medicamento:', err);
      toast.error('Error al registrar medicamento');
    }
  };

  const handleSaveAjuste = async () => {
    if (!selectedMed || !ajuste.cantidad) { toast.error('Ingrese la cantidad'); return; }
    try {
      await inventarioService.ajustarStock(selectedMed.id, {
        tipoMovimiento: ajuste.tipoMovimiento,
        cantidad: Number(ajuste.cantidad),
        lote: ajuste.lote || undefined,
        observaciones: ajuste.observaciones || undefined,
      });
      setOpenAjusteDialog(false);
      setAjuste({ tipoMovimiento: 'ENTRADA', cantidad: '', lote: '', observaciones: '' });
      toast.success(ajuste.tipoMovimiento === 'DESCUENTO_APLICACION' ? `Descuento por aplicación aplicado a ${selectedMed.nombre}` : `Stock ajustado para ${selectedMed.nombre}`);
      loadMedicamentos();
    } catch (err) {
      console.error('Error ajustando stock:', err);
      toast.error('Error al ajustar stock');
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
            <Inventory sx={{ color: '#0E7490', fontSize: 32 }} />
            <Typography variant="h5" fontWeight={700} color="text.primary">
              Inventario de Medicamentos
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
            Agregar Medicamento
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
        <Alert severity="warning" sx={{ mb: 2 }}>{errorMsg}</Alert>
      )}

      {/* Info: Descuento automático */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="body2" sx={{ backgroundColor: '#E0F2FE', color: '#0369A1', borderRadius: '8px', px: 2, py: 1, display: 'inline-flex', alignItems: 'center', gap: 1 }}>
          🔄 <strong>Descuento automático:</strong> Cada aplicación registrada en el módulo de Aplicaciones descuenta automáticamente el stock vinculado a la prescripción.
        </Typography>
      </Box>

      {/* KPI Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {kpis.map((kpi, i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Card
                sx={{
                  backgroundColor: '#FFFFFF',
                  border: '1px solid #E5E7EB',
                  borderRadius: '12px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                }}
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
                      {kpi.alert ? (
                        <Warning sx={{ color: kpi.color, fontSize: 24 }} />
                      ) : (
                        <Inventory sx={{ color: kpi.color, fontSize: 24 }} />
                      )}
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </motion.div>

      {/* Table */}
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
        >
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#F9FAFB' }}>
                {[
                  'Medicamento',
                  'Paciente',
                  'Tratamiento',
                  'Stock Actual',
                  'Stock Mínimo',
                  'Unidad',
                  'Vencimiento',
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
              {medicamentos.map((med) => {
                const chip = estadoChip(med.estado);
                return (
                  <TableRow
                    key={med.id}
                    sx={{
                      '&:hover': { backgroundColor: '#F9FAFB' },
                      transition: 'background 0.15s',
                    }}
                  >
                    <TableCell sx={{ fontWeight: 600, fontSize: '0.85rem' }}>
                      {med.nombre}
                      {med.prescripcionVinculada && (
                        <Box sx={{ mt: 0.25 }}>
                          <Chip label={`Rx: ${med.prescripcionVinculada}`} size="small" color="primary" variant="outlined" sx={{ fontSize: '0.68rem', height: 18 }} />
                        </Box>
                      )}
                    </TableCell>
                    <TableCell sx={{ color: '#6B7280', fontSize: '0.82rem' }}>
                      {med.pacienteNombre ? (
                        <Box>
                          <Typography variant="body2" sx={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>{med.pacienteNombre}</Typography>
                          {med.pacienteId && <Typography variant="caption" color="text.secondary">ID: {med.pacienteId}</Typography>}
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.disabled">Sin paciente</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.82rem' }}>
                      {med.tratamiento ? (
                        <Chip label={med.tratamiento} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
                      ) : (
                        <Typography variant="caption" color="text.disabled">{med.categoria}</Typography>
                      )}
                    </TableCell>
                    <TableCell
                      sx={{
                        fontWeight: 700,
                        color:
                          med.stockActual === 0
                            ? '#DC2626'
                            : med.stockActual <= med.stockMinimo
                            ? '#D97706'
                            : '#166534',
                      }}
                    >
                      {med.stockActual}
                    </TableCell>
                    <TableCell sx={{ color: '#6B7280', fontSize: '0.82rem' }}>
                      {med.stockMinimo}
                    </TableCell>
                    <TableCell sx={{ color: '#6B7280', fontSize: '0.82rem' }}>
                      {med.unidad}
                    </TableCell>
                    <TableCell sx={{ fontSize: '0.82rem' }}>{med.vencimiento}</TableCell>
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
                        {med.estado}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        <Tooltip title="Ajustar Stock">
                          <IconButton
                            size="small"
                            sx={{ color: '#0E7490' }}
                            onClick={() => { setSelectedMed(med); setOpenAjusteDialog(true); }}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Ver Movimientos">
                          <IconButton
                            size="small"
                            sx={{ color: '#6B7280' }}
                            onClick={async () => {
                              setHistoryMed(med);
                              setHistoryMovimientos([]);
                              setOpenHistoryDialog(true);
                              setHistoryLoading(true);
                              try {
                                const movs = await inventarioService.getMovimientos(med.id);
                                setHistoryMovimientos(movs);
                              } catch {
                                toast.error('Error cargando movimientos');
                              } finally {
                                setHistoryLoading(false);
                              }
                            }}
                          >
                            <History fontSize="small" />
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

      {/* Dialog: Nuevo Medicamento */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar Medicamento en Inventario</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Nombre del Medicamento" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} fullWidth required />
            <PatientSelector
              value={form.pacienteId ?? null}
              onChange={(id, patient) => setForm({ ...form, pacienteId: id ?? undefined, pacienteNombre: (patient as any)?.nombre ?? '' })}
              label="Paciente (opcional)"
            />
            <FormControl fullWidth>
              <InputLabel>Tratamiento</InputLabel>
              <Select value={form.tratamiento} label="Tratamiento" onChange={(e) => setForm({ ...form, tratamiento: e.target.value, categoria: e.target.value })}>
                <MenuItem value="Quimioterapia">Quimioterapia</MenuItem>
                <MenuItem value="Inmunoterapia">Inmunoterapia</MenuItem>
                <MenuItem value="Terapia Biológica">Terapia Biológica</MenuItem>
                <MenuItem value="Terapia Dirigida">Terapia Dirigida</MenuItem>
                <MenuItem value="Radioterapia">Radioterapia</MenuItem>
                <MenuItem value="Hormonoterapia">Hormonoterapia</MenuItem>
                <MenuItem value="Soporte / Sintomático">Soporte / Sintomático</MenuItem>
                <MenuItem value="Otro">Otro</MenuItem>
              </Select>
            </FormControl>
            <Stack direction="row" spacing={2}>
              <TextField label="Stock Actual" type="number" value={form.stockActual} onChange={(e) => setForm({ ...form, stockActual: e.target.value })} fullWidth required />
              <TextField label="Stock Mínimo" type="number" value={form.stockMinimo} onChange={(e) => setForm({ ...form, stockMinimo: e.target.value })} fullWidth />
            </Stack>
            <FormControl fullWidth>
              <InputLabel>Unidad</InputLabel>
              <Select value={form.unidad} label="Unidad" onChange={(e) => setForm({ ...form, unidad: e.target.value })}>
                <MenuItem value="Vial">Vial</MenuItem>
                <MenuItem value="Tableta">Tableta</MenuItem>
                <MenuItem value="Frasco">Frasco</MenuItem>
                <MenuItem value="Ampolla">Ampolla</MenuItem>
                <MenuItem value="Jeringa">Jeringa</MenuItem>
                <MenuItem value="Unidad">Unidad</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Lote" value={form.lote} onChange={(e) => setForm({ ...form, lote: e.target.value })} fullWidth placeholder="Ej: LOT-2024-001" />
            <TextField label="Fecha de Vencimiento" type="date" value={form.vencimiento} onChange={(e) => setForm({ ...form, vencimiento: e.target.value })} fullWidth InputLabelProps={{ shrink: true }} />
            <TextField label="Observaciones" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} fullWidth multiline rows={2} />
            <TextField label="Prescripción Vinculada (ID o código)" value={form.prescripcionVinculada} onChange={(e) => setForm({ ...form, prescripcionVinculada: e.target.value })} fullWidth placeholder="Ej: RX-2026-001 — solo prescripciones VIGENTES" />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveNuevo}>Registrar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Ajuste de Stock */}
      <Dialog open={openAjusteDialog} onClose={() => setOpenAjusteDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Ajustar Stock: {selectedMed?.nombre}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth required>
              <InputLabel>Tipo de Movimiento</InputLabel>
              <Select value={ajuste.tipoMovimiento} label="Tipo de Movimiento" onChange={(e) => setAjuste({ ...ajuste, tipoMovimiento: e.target.value as 'ENTRADA' | 'SALIDA' | 'AJUSTE' | 'DESCUENTO_APLICACION' })}>
                <MenuItem value="ENTRADA">Entrada (suma al stock)</MenuItem>
                <MenuItem value="SALIDA">Salida (resta al stock)</MenuItem>
                <MenuItem value="AJUSTE">Ajuste directo</MenuItem>
                <MenuItem value="DESCUENTO_APLICACION">💉 Descuento por Aplicación (resta automático)</MenuItem>
              </Select>
            </FormControl>
            <TextField label="Cantidad" type="number" value={ajuste.cantidad} onChange={(e) => setAjuste({ ...ajuste, cantidad: e.target.value })} fullWidth required />
            <TextField label="Lote" value={ajuste.lote} onChange={(e) => setAjuste({ ...ajuste, lote: e.target.value })} fullWidth />
            <TextField label="Observaciones" value={ajuste.observaciones} onChange={(e) => setAjuste({ ...ajuste, observaciones: e.target.value })} fullWidth multiline rows={2} />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenAjusteDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveAjuste}>Aplicar Ajuste</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Historial de Movimientos */}
      <Dialog open={openHistoryDialog} onClose={() => setOpenHistoryDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Historial de Movimientos — {historyMed?.nombre}</DialogTitle>
        <DialogContent>
          {historyLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
          ) : historyMovimientos.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>Sin movimientos registrados.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell><strong>Fecha</strong></TableCell>
                  <TableCell><strong>Tipo</strong></TableCell>
                  <TableCell align="right"><strong>Cantidad</strong></TableCell>
                  <TableCell><strong>Lote</strong></TableCell>
                  <TableCell><strong>Observaciones</strong></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historyMovimientos.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>{m.fecha}</TableCell>
                    <TableCell>{m.tipo}</TableCell>
                    <TableCell align="right">{m.cantidad}</TableCell>
                    <TableCell>{m.lote || '—'}</TableCell>
                    <TableCell>{m.observaciones || '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenHistoryDialog(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default InventarioPage;
