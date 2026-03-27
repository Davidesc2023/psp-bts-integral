import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Stack,
  Typography,
  Card,
  Chip,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Alert,
  Stepper,
  Step,
  StepLabel,
  Badge,
  FormControlLabel,
  Checkbox,
  DialogActions,
} from '@mui/material';
import {
  Add as AddIcon,
  LocalShipping as ShippingIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Assignment as AssignmentIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { entregaService } from '@services/entregaService';
import type { Entrega, CreateEntregaRequest } from '../../types/entrega.types';
import { EstadoEntrega, TipoEntrega } from '../../types/entrega.types';
import { PatientSelector } from '@modules/shared/components/PatientSelector';
import type { Patient } from '@/types';

export const EntregasPage = () => {
  const [entregas, setEntregas] = useState<Entrega[]>([]);
  const [medicamentosPorVencer, setMedicamentosPorVencer] = useState<Entrega[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openTransitoDialog, setOpenTransitoDialog] = useState(false);
  const [openEntregadaDialog, setOpenEntregadaDialog] = useState(false);
  const [openNoEntregadoDialog, setOpenNoEntregadoDialog] = useState(false);
  const [selectedEntrega, setSelectedEntrega] = useState<Entrega | null>(null);
  const [formData, setFormData] = useState<Partial<CreateEntregaRequest>>({});
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [transitoData, setTransitoData] = useState({ numeroGuia: '' });
  const [entregadaData, setEntregadaData] = useState({
    nombreReceptor: '',
    cedulaReceptor: '',
    cantidadEntregada: 0,
    fechaProximaEntrega: '',
  });
  const [noEntregadoData, setNoEntregadoData] = useState({
    motivo: '',
    crearBarrera: false,
  });
  const navigate = useNavigate();

  useEffect(() => {
    loadEntregas();
    loadMedicamentosPorVencer();
  }, []);

  const loadEntregas = async () => {
    setLoading(true);
    try {
      const data = await entregaService.getAll(0, 50);
      setEntregas(data.content || []);
    } catch (error) {
      console.error('Error cargando entregas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMedicamentosPorVencer = async () => {
    try {
      const data = await entregaService.getMedicamentosPorVencer(30);
      setMedicamentosPorVencer(data);
    } catch (error) {
      console.error('Error cargando medicamentos por vencer:', error);
    }
  };

  const handleCreate = () => {
    setFormData({ pacienteId: undefined });
    setOpenDialog(true);
  };

  const handleSave = async () => {
    try {
      await entregaService.create(formData as CreateEntregaRequest);
      setOpenDialog(false);
      loadEntregas();
    } catch (error) {
      console.error('Error guardando entrega:', error);
    }
  };

  const handleMarcarEnTransito = (entrega: Entrega) => {
    setSelectedEntrega(entrega);
    setTransitoData({ numeroGuia: '' });
    setOpenTransitoDialog(true);
  };

  const handleTransito = async () => {
    if (!selectedEntrega) return;
    try {
      await entregaService.marcarEnTransito(selectedEntrega.id, {
        numeroGuia: transitoData.numeroGuia,
        actualizadoPor: 'USUARIO_ACTUAL',
      });
      setOpenTransitoDialog(false);
      loadEntregas();
    } catch (error) {
      console.error('Error marcando en tránsito:', error);
    }
  };

  const handleMarcarEntregada = (entrega: Entrega) => {
    setSelectedEntrega(entrega);
    setEntregadaData({ 
      nombreReceptor: '', 
      cedulaReceptor: '', 
      cantidadEntregada: 0,
      fechaProximaEntrega: '',
    });
    setOpenEntregadaDialog(true);
  };

  const handleMarcarNoEntregado = (entrega: Entrega) => {
    setSelectedEntrega(entrega);
    setNoEntregadoData({ motivo: '', crearBarrera: false });
    setOpenNoEntregadoDialog(true);
  };

  const handleNoEntregado = async () => {
    if (!selectedEntrega) return;
    try {
      try {
        await entregaService.marcarDevuelta(selectedEntrega.id, {
          motivo: noEntregadoData.motivo,
          actualizadoPor: 'USUARIO_ACTUAL',
        });
      } catch {
        // local mode fallback
      }
      setOpenNoEntregadoDialog(false);
      loadEntregas();
      if (noEntregadoData.crearBarrera && selectedEntrega.pacienteId) {
        navigate(`/barriers?patientId=${selectedEntrega.pacienteId}`);
      }
    } catch (error) {
      console.error('Error marcando como no entregado:', error);
    }
  };

  const handleEntregada = async () => {
    if (!selectedEntrega) return;
    try {
      await entregaService.marcarEntregada(selectedEntrega.id, {
        ...entregadaData,
        recibidoPor: 'USUARIO_ACTUAL',
      });
      setOpenEntregadaDialog(false);
      loadEntregas();
    } catch (error) {
      console.error('Error marcando como entregada:', error);
    }
  };

  const handleDevolver = async (entrega: Entrega) => {
    const motivo = prompt('Ingrese el motivo de la devolución:');
    if (!motivo) return;

    try {
      await entregaService.marcarDevuelta(entrega.id, {
        motivo,
        actualizadoPor: 'USUARIO_ACTUAL',
      });
      loadEntregas();
    } catch (error) {
      console.error('Error marcando como devuelta:', error);
    }
  };

  const getEstadoColor = (estado: EstadoEntrega) => {
    switch (estado) {
      case EstadoEntrega.PROGRAMADA:
        return 'info';
      case EstadoEntrega.EN_TRANSITO:
        return 'warning';
      case EstadoEntrega.ENTREGADA:
        return 'success';
      case EstadoEntrega.DEVUELTA:
        return 'error';
      case EstadoEntrega.CANCELADA:
        return 'default';
      default:
        return 'default';
    }
  };

  const getEstadoStep = (estado: EstadoEntrega) => {
    switch (estado) {
      case EstadoEntrega.PROGRAMADA:
        return 0;
      case EstadoEntrega.EN_TRANSITO:
        return 1;
      case EstadoEntrega.ENTREGADA:
        return 2;
      default:
        return -1;
    }
  };

  const getTipoIcon = (tipo: TipoEntrega) => {
    switch (tipo) {
      case TipoEntrega.DOMICILIO:
        return '🏠';
      case TipoEntrega.PUNTO:
        return '📍';
      case TipoEntrega.IPS:
        return '🏥';
      case TipoEntrega.FARMACIA:
        return '💊';
      default:
        return '📦';
    }
  };

  const estaProximoAVencer = (entrega: Entrega) => {
    if (!entrega.fechaVencimiento) return false;
    const fechaVenc = new Date(entrega.fechaVencimiento);
    const hoy = new Date();
    const diasRestantes = Math.floor((fechaVenc.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return diasRestantes <= 30 && diasRestantes >= 0;
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Entregas de Medicamentos
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
          color="primary"
        >
          Nueva Entrega
        </Button>
      </Stack>

      {medicamentosPorVencer.length > 0 && (
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 3 }}>
          <Typography fontWeight="bold">
            {medicamentosPorVencer.length} medicamento(s) próximos a vencer en los próximos 30 días
          </Typography>
        </Alert>
      )}

      {loading ? (
        <Typography>Cargando...</Typography>
      ) : (
        <Grid container spacing={2}>
          {entregas.map((entrega) => (
            <Grid item xs={12} md={6} lg={4} key={entrega.id}>
              <Card sx={{ p: 2, position: 'relative' }}>
                {estaProximoAVencer(entrega) && (
                  <Box sx={{ position: 'absolute', top: 8, right: 8 }}>
                    <Badge color="warning">
                      <WarningIcon color="warning" />
                    </Badge>
                  </Box>
                )}

                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography fontSize={24}>{getTipoIcon(entrega.tipo)}</Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {entrega.tipo}
                      </Typography>
                    </Stack>
                    <Chip
                      label={entrega.estado}
                      color={getEstadoColor(entrega.estado)}
                      size="small"
                    />
                  </Stack>

                  {entrega.estado !== EstadoEntrega.DEVUELTA && entrega.estado !== EstadoEntrega.CANCELADA && (
                    <Stepper activeStep={getEstadoStep(entrega.estado)} alternativeLabel>
                      <Step>
                        <StepLabel>Programada</StepLabel>
                      </Step>
                      <Step>
                        <StepLabel>En Tránsito</StepLabel>
                      </Step>
                      <Step>
                        <StepLabel>Entregada</StepLabel>
                      </Step>
                    </Stepper>
                  )}

                  <Box>
                    <Typography variant="body2">
                      <strong>Fecha programada:</strong> {new Date(entrega.fechaProgramada).toLocaleDateString()}
                    </Typography>
                    {entrega.lote && (
                      <Typography variant="body2">
                        <strong>Lote:</strong> {entrega.lote}
                      </Typography>
                    )}
                    {entrega.fechaVencimiento && (
                      <Typography
                        variant="body2"
                        color={estaProximoAVencer(entrega) ? 'warning.main' : 'text.primary'}
                      >
                        <strong>Vencimiento:</strong> {new Date(entrega.fechaVencimiento).toLocaleDateString()}
                      </Typography>
                    )}
                    {entrega.prescripcionId && (
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                        <Typography variant="body2">
                          <strong>Prescripción:</strong> #{entrega.prescripcionId}
                        </Typography>
                        <Chip
                          label={entrega.fechaVencimiento && new Date(entrega.fechaVencimiento) >= new Date() ? 'VIGENTE' : 'VENCIDA'}
                          color={entrega.fechaVencimiento && new Date(entrega.fechaVencimiento) >= new Date() ? 'success' : 'error'}
                          size="small"
                        />
                      </Stack>
                    )}
                  </Box>

                  {entrega.numeroGuia && (
                    <Alert severity="info" icon={<AssignmentIcon />} sx={{ py: 0 }}>
                      Guía: {entrega.numeroGuia}
                    </Alert>
                  )}

                  {entrega.estado === EstadoEntrega.ENTREGADA && (
                    <Alert severity="success" sx={{ py: 0 }}>
                      Entregado a: {entrega.nombreReceptor}
                      <br />
                      CC: {entrega.cedulaReceptor}
                      <br />
                      Cantidad: {entrega.cantidadEntregada}
                    </Alert>
                  )}

                  {entrega.estado === EstadoEntrega.DEVUELTA && entrega.motivoDevolucion && (
                    <Alert severity="error" sx={{ py: 0 }}>
                      Devuelto: {entrega.motivoDevolucion}
                    </Alert>
                  )}

                  {entrega.direccionEntrega && (
                    <Typography variant="body2" color="text.secondary">
                      📍 {entrega.direccionEntrega}
                    </Typography>
                  )}

                  {entrega.estado === EstadoEntrega.PROGRAMADA && (
                    <Button
                      size="small"
                      variant="contained"
                      color="warning"
                      startIcon={<ShippingIcon />}
                      onClick={() => handleMarcarEnTransito(entrega)}
                      fullWidth
                    >
                      Marcar en Tránsito
                    </Button>
                  )}

                  {entrega.estado === EstadoEntrega.EN_TRANSITO && (
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<CheckIcon />}
                        onClick={() => handleMarcarEntregada(entrega)}
                        fullWidth
                      >
                        Entregado
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        onClick={() => handleMarcarNoEntregado(entrega)}
                      >
                        No Entregado
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="warning"
                        onClick={() => handleDevolver(entrega)}
                      >
                        Devolver
                      </Button>
                    </Stack>
                  )}
                </Stack>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog Crear */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar Entrega Informada por Paciente</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Alert severity="info">
              El paciente informa al PSP que recibió su medicamento. Registre los datos de la entrega.
            </Alert>

            <PatientSelector
              value={formData.pacienteId ?? null}
              onChange={(id, patient) => {
                setFormData({ ...formData, pacienteId: id ?? undefined });
                setSelectedPatient(patient ?? null);
              }}
              label="Paciente"
              required
            />

            <TextField
              label="ID Prescripción"
              type="number"
              value={formData.prescripcionId || ''}
              onChange={(e) => setFormData({ ...formData, prescripcionId: Number(e.target.value) })}
              fullWidth
            />

            <FormControl fullWidth required>
              <InputLabel>Tipo de Entrega</InputLabel>
              <Select
                value={formData.tipo || ''}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value as TipoEntrega })}
                label="Tipo de Entrega"
              >
                {Object.values(TipoEntrega).map((tipo) => (
                  <MenuItem key={tipo} value={tipo}>
                    {getTipoIcon(tipo)} {tipo}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Fecha Programada"
              type="date"
              value={formData.fechaProgramada || ''}
              onChange={(e) => setFormData({ ...formData, fechaProgramada: e.target.value })}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Lote"
              value={formData.lote || ''}
              onChange={(e) => setFormData({ ...formData, lote: e.target.value })}
              fullWidth
              placeholder="LOT-2024-001"
            />

            <TextField
              label="Fecha de Vencimiento"
              type="date"
              value={formData.fechaVencimiento || ''}
              onChange={(e) => setFormData({ ...formData, fechaVencimiento: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Dirección / Lugar de Entrega"
              value={formData.direccionEntrega || ''}
              onChange={(e) => setFormData({ ...formData, direccionEntrega: e.target.value })}
              fullWidth
              placeholder="Ej: Domicilio, EPS Sura, IPS Clínica Norte, Operador Logístico"
              multiline
              rows={2}
            />

            <FormControl fullWidth>
              <InputLabel>Lugar de Entrega</InputLabel>
              <Select
                value={(formData as any).lugarEntrega || ''}
                onChange={(e) => setFormData({ ...formData, ...(formData as any), lugarEntrega: e.target.value } as any)}
                label="Lugar de Entrega"
              >
                <MenuItem value="DOMICILIO">🏠 Domicilio</MenuItem>
                <MenuItem value="EPS">🏢 EPS</MenuItem>
                <MenuItem value="IPS">🏥 IPS</MenuItem>
                <MenuItem value="OPERADOR_LOGISTICO">🚚 Operador Logístico</MenuItem>
                <MenuItem value="FARMACIA">💊 Farmacia</MenuItem>
              </Select>
            </FormControl>

            <TextField
              label="Quién Entrega"
              value={(formData as any).quienEntrega || ''}
              onChange={(e) => setFormData({ ...formData, ...(formData as any), quienEntrega: e.target.value } as any)}
              fullWidth
              placeholder="Persona o entidad responsable de la entrega"
            />

            <TextField
              label="Observaciones"
              value={formData.observaciones || ''}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />

            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
              <Button
                variant="contained"
                onClick={handleSave}
                color="primary"
              >
                Guardar
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Dialog En Tránsito */}
      <Dialog open={openTransitoDialog} onClose={() => setOpenTransitoDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirmar Despacho de Medicamento</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Alert severity="info">
              Registre que el medicamento fue despachado al paciente
            </Alert>

            <TextField
              label="Referencia de Despacho"
              value={transitoData.numeroGuia}
              onChange={(e) => setTransitoData({ numeroGuia: e.target.value })}
              fullWidth
              placeholder="Ej: DESP-2024-001"
            />

            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button onClick={() => setOpenTransitoDialog(false)}>Cancelar</Button>
              <Button
                variant="contained"
                onClick={handleTransito}
                color="primary"
              >
                Confirmar
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Dialog Entregada */}
      <Dialog open={openEntregadaDialog} onClose={() => setOpenEntregadaDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Marcar como Entregada</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Alert severity="success">
              Registre los datos de quien recibió la entrega
            </Alert>

            <TextField
              label="Nombre del Receptor"
              value={entregadaData.nombreReceptor}
              onChange={(e) => setEntregadaData({ ...entregadaData, nombreReceptor: e.target.value })}
              fullWidth
              required
            />

            <TextField
              label="Cédula del Receptor"
              value={entregadaData.cedulaReceptor}
              onChange={(e) => setEntregadaData({ ...entregadaData, cedulaReceptor: e.target.value })}
              fullWidth
              required
            />

            <TextField
              label="Cantidad Entregada"
              type="number"
              value={entregadaData.cantidadEntregada}
              onChange={(e) => setEntregadaData({ ...entregadaData, cantidadEntregada: Number(e.target.value) })}
              fullWidth
              required
              helperText="Unidades o dosis entregadas"
            />

            <TextField
              label="Fecha Próxima Entrega"
              type="date"
              value={entregadaData.fechaProximaEntrega}
              onChange={(e) => setEntregadaData({ ...entregadaData, fechaProximaEntrega: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
              helperText="Dejar vacío si no aplica próxima entrega"
            />

            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button onClick={() => setOpenEntregadaDialog(false)}>Cancelar</Button>
              <Button
                variant="contained"
                onClick={handleEntregada}
                color="primary"
              >
                Confirmar Entrega
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Dialog NO Entregado */}
      <Dialog open={openNoEntregadoDialog} onClose={() => setOpenNoEntregadoDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'error.main' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <CancelIcon />
            <Typography variant="h6">Marcar como NO Entregado</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Alert severity="error">
              Registre el motivo por el cual NO se pudo entregar el medicamento
            </Alert>

            <TextField
              label="Motivo de No Entrega"
              multiline
              rows={4}
              value={noEntregadoData.motivo}
              onChange={(e) => setNoEntregadoData({ ...noEntregadoData, motivo: e.target.value })}
              fullWidth
              required
              placeholder="Ejemplo: Paciente no se encontraba en domicilio, Dirección incorrecta, Paciente rechazó la entrega"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={noEntregadoData.crearBarrera}
                  onChange={(e) => setNoEntregadoData({ ...noEntregadoData, crearBarrera: e.target.checked })}
                  color="error"
                />
              }
              label={
                <Typography variant="body2">
                  Crear barrera automática de <strong>Logística</strong> para seguimiento
                </Typography>
              }
            />

            {noEntregadoData.crearBarrera && (
              <Alert severity="warning" sx={{ py: 1 }}>
                <Typography variant="caption">
                  Se creará una barrera que requerirá gestión del equipo de logística
                </Typography>
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenNoEntregadoDialog(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleNoEntregado} 
            color="error" 
            variant="contained"
            disabled={!noEntregadoData.motivo.trim()}
          >
            Confirmar No Entregado
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
