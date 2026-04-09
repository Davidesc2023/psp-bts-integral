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
  FormControlLabel,
  Checkbox,
  DialogActions,
  Tab,
  Tabs,
} from '@mui/material';
import {
  Add as AddIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  CalendarMonth as CalendarIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { aplicacionService } from '@services/aplicacionService';
import type { Aplicacion, CreateAplicacionRequest, GenerarAplicacionesMasivasRequest } from '../../types/aplicacion.types';
import { EstadoAplicacion, TipoAplicacion } from '../../types/aplicacion.types';
import { PatientSelector } from '@modules/shared/components/PatientSelector';
import type { Patient } from '@/types';
import { supabase } from '@services/supabaseClient';
import { getCurrentTenantId } from '@/utils/getCurrentTenant';


interface Crisis {
  id: number;
  paciente: string;
  pacienteId?: number;
  fechaCrisis: string;
  numeroCrisis: number;
  crisisTratadas: number;
  medicamentoUsado: string;
  estado: 'EFECTIVA' | 'NO_EFECTIVA';
}

interface Herida {
  id: number;
  paciente: string;
  pacienteId?: number;
  fechaHerida: string;
  numeroHeridas: number;
  heridasTratadas: number;
  estado: 'EFECTIVA' | 'NO_EFECTIVA';
}

export const AplicacionesPage = () => {
  const [aplicaciones, setAplicaciones] = useState<Aplicacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [openMasivasDialog, setOpenMasivasDialog] = useState(false);
  const [openAplicarDialog, setOpenAplicarDialog] = useState(false);
  const [openNoAplicadoDialog, setOpenNoAplicadoDialog] = useState(false);
  const [selectedAplicacion, setSelectedAplicacion] = useState<Aplicacion | null>(null);
  const [formData, setFormData] = useState<Partial<CreateAplicacionRequest>>({});
  const [masivasData, setMasivasData] = useState<Partial<GenerarAplicacionesMasivasRequest>>({
    prescripcionId: 1,
  });
  const [aplicarData, setAplicarData] = useState({ 
    cantidadAplicada: '', 
    fechaRealAplicacion: new Date().toISOString().slice(0, 16),
    dosisAplicada: '', 
    observaciones: '',
    proximaAplicacion: '',
  });
  const [noAplicadoData, setNoAplicadoData] = useState({
    motivo: '',
    crearBarrera: false,
  });
  const navigate = useNavigate();
  const [mainTab, setMainTab] = useState(0);
  const [crisis, setCrisis] = useState<Crisis[]>([]);
  const [heridas, setHeridas] = useState<Herida[]>([]);
  const [openCrisisDialog, setOpenCrisisDialog] = useState(false);
  const [openHeridaDialog, setOpenHeridaDialog] = useState(false);
  const [crisisForm, setCrisisForm] = useState({
    pacienteId: null as number | null,
    pacienteNombre: '',
    fechaCrisis: new Date().toISOString().split('T')[0],
    numeroCrisis: 1,
    crisisTratadas: 0,
    medicamentoUsado: '',
    estado: 'EFECTIVA' as 'EFECTIVA' | 'NO_EFECTIVA',
  });
  const [heridaForm, setHeridaForm] = useState({
    pacienteId: null as number | null,
    pacienteNombre: '',
    fechaHerida: new Date().toISOString().split('T')[0],
    numeroHeridas: 1,
    heridasTratadas: 0,
    estado: 'EFECTIVA' as 'EFECTIVA' | 'NO_EFECTIVA',
  });

  useEffect(() => {
    loadAplicaciones();
    loadCrisis();
    loadHeridas();
  }, []);

  const loadCrisis = async () => {
    try {
      const { data, error } = await supabase
        .from('crisis_paciente')
        .select('*, patients(first_name, last_name)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setCrisis((data ?? []).map((r: any) => ({
        id: r.id,
        paciente: r.patients ? `${r.patients.first_name} ${r.patients.last_name}` : `Paciente #${r.patient_id}`,
        pacienteId: r.patient_id,
        fechaCrisis: r.fecha_crisis,
        numeroCrisis: r.numero_crisis,
        crisisTratadas: r.crisis_tratadas,
        medicamentoUsado: r.medicamento_usado ?? '',
        estado: r.estado,
      })));
    } catch { /* silencioso si la tabla aún no existe */ }
  };

  const loadHeridas = async () => {
    try {
      const { data, error } = await supabase
        .from('heridas_paciente')
        .select('*, patients(first_name, last_name)')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      setHeridas((data ?? []).map((r: any) => ({
        id: r.id,
        paciente: r.patients ? `${r.patients.first_name} ${r.patients.last_name}` : `Paciente #${r.patient_id}`,
        pacienteId: r.patient_id,
        fechaHerida: r.fecha_herida,
        numeroHeridas: r.numero_heridas,
        heridasTratadas: r.heridas_tratadas,
        estado: r.estado,
      })));
    } catch { /* silencioso si la tabla aún no existe */ }
  };

  const loadAplicaciones = async () => {
    setLoading(true);
    try {
      const data = await aplicacionService.getAll(0, 50);
      setAplicaciones(data.content || []);
    } catch (error) {
      console.error('Error cargando aplicaciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setFormData({});
    setOpenDialog(true);
  };

  const handleSave = async () => {
    try {
      await aplicacionService.create(formData as CreateAplicacionRequest);
      setOpenDialog(false);
      loadAplicaciones();
    } catch (error) {
      console.error('Error guardando aplicación:', error);
    }
  };

  const handleGenerarMasivas = async () => {
    try {
      await aplicacionService.generarMasivas(masivasData as GenerarAplicacionesMasivasRequest);
      setOpenMasivasDialog(false);
      loadAplicaciones();
    } catch (error) {
      console.error('Error generando aplicaciones:', error);
    }
  };

  const handleMarcarAplicada = (aplicacion: Aplicacion) => {
    setSelectedAplicacion(aplicacion);
    setAplicarData({ 
      cantidadAplicada: '', 
      fechaRealAplicacion: new Date().toISOString().slice(0, 16),
      dosisAplicada: '', 
      observaciones: '',
      proximaAplicacion: '',
    });
    setOpenAplicarDialog(true);
  };

  const handleMarcarNoAplicada = (aplicacion: Aplicacion) => {
    setSelectedAplicacion(aplicacion);
    setNoAplicadoData({ motivo: '', crearBarrera: false });
    setOpenNoAplicadoDialog(true);
  };

  const handleAplicar = async () => {
    if (!selectedAplicacion) return;
    try {
      await aplicacionService.marcarComoAplicada(selectedAplicacion.id, {
        dosisAplicada: aplicarData.dosisAplicada,
        observaciones: aplicarData.observaciones,
        aplicadoPor: 'USUARIO_ACTUAL',
      });
      setOpenAplicarDialog(false);
      loadAplicaciones();
    } catch (error) {
      console.error('Error marcando aplicación:', error);
    }
  };

  const handleNoAplicar = async () => {
    if (!selectedAplicacion) return;
    try {
      try {
        await aplicacionService.marcarComoNoAplicada(selectedAplicacion.id, {
          motivo: noAplicadoData.motivo,
          actualizadoPor: 'USUARIO_ACTUAL',
        });
      } catch {
        // local mode fallback
      }
      setOpenNoAplicadoDialog(false);
      loadAplicaciones();
      if (noAplicadoData.crearBarrera && selectedAplicacion.pacienteId) {
        navigate(`/barriers?patientId=${selectedAplicacion.pacienteId}`);
      }
    } catch (error) {
      console.error('Error marcando como no aplicada:', error);
    }
  };

  const handleSaveCrisis = async () => {
    if (!crisisForm.pacienteId) { return; }
    try {
      const { data, error } = await supabase
        .from('crisis_paciente')
        .insert({
          tenant_id: await getCurrentTenantId(),
          patient_id: crisisForm.pacienteId,
          fecha_crisis: crisisForm.fechaCrisis,
          numero_crisis: crisisForm.numeroCrisis,
          crisis_tratadas: crisisForm.crisisTratadas,
          medicamento_usado: crisisForm.medicamentoUsado || null,
          estado: crisisForm.estado,
        })
        .select('*, patients(first_name, last_name)')
        .single();
      if (error) throw error;
      const nueva: Crisis = {
        id: data.id,
        paciente: data.patients ? `${data.patients.first_name} ${data.patients.last_name}` : crisisForm.pacienteNombre,
        pacienteId: data.patient_id,
        fechaCrisis: data.fecha_crisis,
        numeroCrisis: data.numero_crisis,
        crisisTratadas: data.crisis_tratadas,
        medicamentoUsado: data.medicamento_usado ?? '',
        estado: data.estado,
      };
      setCrisis((prev) => [nueva, ...prev]);
    } catch {
      // Fallback local si la tabla aún no existe en la DB
      const nueva: Crisis = {
        id: Date.now(),
        paciente: crisisForm.pacienteNombre,
        pacienteId: crisisForm.pacienteId,
        fechaCrisis: crisisForm.fechaCrisis,
        numeroCrisis: crisisForm.numeroCrisis,
        crisisTratadas: crisisForm.crisisTratadas,
        medicamentoUsado: crisisForm.medicamentoUsado,
        estado: crisisForm.estado,
      };
      setCrisis((prev) => [nueva, ...prev]);
    }
    setOpenCrisisDialog(false);
    if (crisisForm.estado === 'NO_EFECTIVA') {
      navigate(`/barriers?patientId=${crisisForm.pacienteId}`);
    }
  };

  const handleSaveHerida = async () => {
    if (!heridaForm.pacienteId) { return; }
    try {
      const { data, error } = await supabase
        .from('heridas_paciente')
        .insert({
          tenant_id: await getCurrentTenantId(),
          patient_id: heridaForm.pacienteId,
          fecha_herida: heridaForm.fechaHerida,
          numero_heridas: heridaForm.numeroHeridas,
          heridas_tratadas: heridaForm.heridasTratadas,
          estado: heridaForm.estado,
        })
        .select('*, patients(first_name, last_name)')
        .single();
      if (error) throw error;
      const nueva: Herida = {
        id: data.id,
        paciente: data.patients ? `${data.patients.first_name} ${data.patients.last_name}` : heridaForm.pacienteNombre,
        pacienteId: data.patient_id,
        fechaHerida: data.fecha_herida,
        numeroHeridas: data.numero_heridas,
        heridasTratadas: data.heridas_tratadas,
        estado: data.estado,
      };
      setHeridas((prev) => [nueva, ...prev]);
    } catch {
      // Fallback local
      const nueva: Herida = {
        id: Date.now(),
        paciente: heridaForm.pacienteNombre,
        pacienteId: heridaForm.pacienteId,
        fechaHerida: heridaForm.fechaHerida,
        numeroHeridas: heridaForm.numeroHeridas,
        heridasTratadas: heridaForm.heridasTratadas,
        estado: heridaForm.estado,
      };
      setHeridas((prev) => [nueva, ...prev]);
    }
    setOpenHeridaDialog(false);
    if (heridaForm.estado === 'NO_EFECTIVA') {
      navigate(`/barriers?patientId=${heridaForm.pacienteId}`);
    }
  };

  const getEstadoColor = (estado: EstadoAplicacion) => {
    switch (estado) {
      case EstadoAplicacion.PROGRAMADA:
        return 'info';
      case EstadoAplicacion.APLICADA:
        return 'success';
      case EstadoAplicacion.NO_APLICADA:
        return 'error';
      default:
        return 'default';
    }
  };

  const getTipoIcon = (tipo: TipoAplicacion) => {
    switch (tipo) {
      case TipoAplicacion.INYECCION:
        return '💉';
      case TipoAplicacion.INFUSION:
        return '💧';
      case TipoAplicacion.CREMA:
        return '🧴';
      case TipoAplicacion.ORAL:
        return '💊';
      case TipoAplicacion.CRISIS:
        return '🚨';
      default:
        return '📋';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h4" fontWeight="bold">
          Aplicaciones y Seguimiento Clínico
        </Typography>
        <Stack direction="row" spacing={2}>
          {mainTab === 0 && (
            <>
              <Button variant="outlined" startIcon={<CalendarIcon />} onClick={() => setOpenMasivasDialog(true)} color="primary">Generar Masivas</Button>
              <Button variant="contained" startIcon={<AddIcon />} onClick={handleCreate} color="primary">Nueva Aplicación</Button>
            </>
          )}
          {mainTab === 1 && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCrisisDialog(true)} color="error">Nueva Crisis</Button>
          )}
          {mainTab === 2 && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenHeridaDialog(true)} color="warning">Nueva Herida</Button>
          )}
        </Stack>
      </Stack>

      <Tabs value={mainTab} onChange={(_, v) => setMainTab(v)} sx={{ mb: 3, borderBottom: '1px solid #e5e7eb' }}>
        <Tab label={`Aplicaciones (${aplicaciones.length})`} />
        <Tab label={`Crisis (${crisis.length})`} />
        <Tab label={`Heridas (${heridas.length})`} />
      </Tabs>

      {mainTab === 0 && (<>
      {loading ? (
        <Typography>Cargando...</Typography>
      ) : (
        <Grid container spacing={2}>
          {aplicaciones.map((aplicacion) => (
            <Grid item xs={12} md={6} lg={4} key={aplicacion.id}>
              <Card sx={{ p: 2 }}>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography fontSize={24}>{getTipoIcon(aplicacion.tipo)}</Typography>
                      <Typography variant="h6" fontWeight="bold">
                        {aplicacion.tipo}
                      </Typography>
                    </Stack>
                    <Chip
                      label={aplicacion.estado}
                      color={getEstadoColor(aplicacion.estado)}
                      size="small"
                    />
                  </Stack>

                  <Box>
                    <Typography variant="body2">
                      <strong>Fecha programada:</strong> {new Date(aplicacion.fechaProgramada).toLocaleDateString()}
                    </Typography>
                    {aplicacion.horaProgramada && (
                      <Typography variant="body2">
                        <strong>Hora:</strong> {aplicacion.horaProgramada}
                      </Typography>
                    )}
                  </Box>

                  {aplicacion.estado === EstadoAplicacion.APLICADA && (
                    <Alert severity="success" sx={{ py: 0 }}>
                      Aplicada: {new Date(aplicacion.fechaAplicacion!).toLocaleDateString()}
                      {aplicacion.dosisAplicada && <><br />Dosis: {aplicacion.dosisAplicada}</>}
                    </Alert>
                  )}

                  {aplicacion.estado === EstadoAplicacion.NO_APLICADA && aplicacion.motivoNoAplicacion && (
                    <Alert severity="error" sx={{ py: 0 }}>
                      No aplicada: {aplicacion.motivoNoAplicacion}
                    </Alert>
                  )}

                  {aplicacion.observaciones && (
                    <Typography variant="body2" color="text.secondary">
                      {aplicacion.observaciones}
                    </Typography>
                  )}

                  {aplicacion.estado === EstadoAplicacion.PROGRAMADA && (
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button
                        size="small"
                        variant="contained"
                        color="success"
                        startIcon={<CheckIcon />}
                        onClick={() => handleMarcarAplicada(aplicacion)}
                      >
                        Aplicar
                      </Button>
                      <Button
                        size="small"
                        variant="outlined"
                        color="error"
                        startIcon={<CloseIcon />}
                        onClick={() => handleMarcarNoAplicada(aplicacion)}
                      >
                        No Aplicar
                      </Button>
                    </Stack>
                  )}
                </Stack>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      </>)}

      {/* TAB 1: Crisis */}
      {mainTab === 1 && (
        <Box>
          {crisis.length === 0 ? (
            <Alert severity="info">No hay crisis registradas. Use el botón "Nueva Crisis" para registrar.</Alert>
          ) : (
            <Grid container spacing={2}>
              {crisis.map((c) => (
                <Grid item xs={12} md={6} key={c.id}>
                  <Card sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="subtitle1" fontWeight={700}>{c.paciente}</Typography>
                      <Chip label={c.estado} color={c.estado === 'EFECTIVA' ? 'success' : 'error'} size="small" />
                    </Stack>
                    <Typography variant="body2"><strong>Fecha crisis:</strong> {new Date(c.fechaCrisis).toLocaleDateString('es-CO')}</Typography>
                    <Typography variant="body2"><strong>N° crisis:</strong> {c.numeroCrisis} | <strong>Tratadas:</strong> {c.crisisTratadas}</Typography>
                    {c.medicamentoUsado && <Typography variant="body2"><strong>Medicamento:</strong> {c.medicamentoUsado}</Typography>}
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* TAB 2: Heridas */}
      {mainTab === 2 && (
        <Box>
          {heridas.length === 0 ? (
            <Alert severity="info">No hay heridas registradas. Use el botón "Nueva Herida" para registrar.</Alert>
          ) : (
            <Grid container spacing={2}>
              {heridas.map((h) => (
                <Grid item xs={12} md={6} key={h.id}>
                  <Card sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                      <Typography variant="subtitle1" fontWeight={700}>{h.paciente}</Typography>
                      <Chip label={h.estado} color={h.estado === 'EFECTIVA' ? 'success' : 'error'} size="small" />
                    </Stack>
                    <Typography variant="body2"><strong>Fecha herida:</strong> {new Date(h.fechaHerida).toLocaleDateString('es-CO')}</Typography>
                    <Typography variant="body2"><strong>N° heridas:</strong> {h.numeroHeridas} | <strong>Tratadas:</strong> {h.heridasTratadas}</Typography>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Box>
      )}

      {/* Dialog Crear */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nueva Aplicación</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <PatientSelector
              value={formData.pacienteId ?? null}
              onChange={(_id, patient: Patient | null) => setFormData({ ...formData, pacienteId: patient?.id ?? undefined })}
              label="Paciente *"
              required
              size="small"
            />

            <TextField
              label="ID Prescripción"
              type="number"
              value={formData.prescripcionId || ''}
              onChange={(e) => setFormData({ ...formData, prescripcionId: Number(e.target.value) })}
              fullWidth
              required
            />

            <FormControl fullWidth required>
              <InputLabel>Tipo de Aplicación</InputLabel>
              <Select
                value={formData.tipo || ''}
                onChange={(e) => setFormData({ ...formData, tipo: e.target.value as TipoAplicacion })}
                label="Tipo de Aplicación"
              >
                {Object.values(TipoAplicacion).map((tipo) => (
                  <MenuItem key={tipo} value={tipo}>
                    {getTipoIcon(tipo)} {tipo}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Tipo de Infusión"
              value={(formData as any).tipoInfusion || ''}
              onChange={(e) => setFormData({ ...formData, ...({ tipoInfusion: e.target.value } as any) })}
              fullWidth
              placeholder="Ej: Carga, Mantenimiento, Bolos"
            />

            <Stack direction="row" spacing={2}>
              <TextField
                label="Fase / Ciclo N.º"
                type="number"
                value={(formData as any).fase || ''}
                onChange={(e) => setFormData({ ...formData, ...({ fase: Number(e.target.value) } as any) })}
                fullWidth
                inputProps={{ min: 1 }}
                placeholder="N.º de fase o ciclo"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={(formData as any).sinPrescripcion ?? false}
                    onChange={(e) => setFormData({ ...formData, ...({ sinPrescripcion: e.target.checked } as any) })}
                    color="warning"
                  />
                }
                label="Sin prescripción activa"
                sx={{ mt: 0.5 }}
              />
            </Stack>

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
              label="Hora Programada"
              type="time"
              value={formData.horaProgramada || ''}
              onChange={(e) => setFormData({ ...formData, horaProgramada: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
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

      {/* Dialog Generar Masivas */}
      <Dialog open={openMasivasDialog} onClose={() => setOpenMasivasDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generar Aplicaciones Masivas</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Alert severity="info">
              Esto generará una aplicación por cada día en el rango de fechas especificado.
            </Alert>

            <TextField
              label="ID Prescripción"
              type="number"
              value={masivasData.prescripcionId || ''}
              onChange={(e) => setMasivasData({ ...masivasData, prescripcionId: Number(e.target.value) })}
              fullWidth
              required
            />

            <FormControl fullWidth required>
              <InputLabel>Tipo de Aplicación</InputLabel>
              <Select
                value={masivasData.tipo || ''}
                onChange={(e) => setMasivasData({ ...masivasData, tipo: e.target.value as TipoAplicacion })}
                label="Tipo de Aplicación"
              >
                {Object.values(TipoAplicacion).map((tipo) => (
                  <MenuItem key={tipo} value={tipo}>
                    {getTipoIcon(tipo)} {tipo}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Fecha Inicio"
              type="date"
              value={masivasData.fechaInicio || ''}
              onChange={(e) => setMasivasData({ ...masivasData, fechaInicio: e.target.value })}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Fecha Fin"
              type="date"
              value={masivasData.fechaFin || ''}
              onChange={(e) => setMasivasData({ ...masivasData, fechaFin: e.target.value })}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Hora Programada"
              type="time"
              value={masivasData.horaProgramada || ''}
              onChange={(e) => setMasivasData({ ...masivasData, horaProgramada: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button onClick={() => setOpenMasivasDialog(false)}>Cancelar</Button>
              <Button
                variant="contained"
                onClick={handleGenerarMasivas}
                color="primary"
              >
                Generar
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Dialog Aplicar */}
      <Dialog open={openAplicarDialog} onClose={() => setOpenAplicarDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Marcar como Aplicada</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Alert severity="success">
              Registre los datos de la aplicación realizada
            </Alert>

            <TextField
              label="Cantidad Aplicada (dosis)"
              type="number"
              inputProps={{ step: 0.1 }}
              value={aplicarData.cantidadAplicada}
              onChange={(e) => setAplicarData({ ...aplicarData, cantidadAplicada: e.target.value })}
              fullWidth
              required
              helperText="Ejemplo: 0.5 (ml), 2 (tabletas), 1 (ampolla)"
            />

            <TextField
              label="Fecha y Hora Real de Aplicación"
              type="datetime-local"
              value={aplicarData.fechaRealAplicacion}
              onChange={(e) => setAplicarData({ ...aplicarData, fechaRealAplicacion: e.target.value })}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              label="Dosis Aplicada (descripción)"
              value={aplicarData.dosisAplicada}
              onChange={(e) => setAplicarData({ ...aplicarData, dosisAplicada: e.target.value })}
              fullWidth
              placeholder="Ej: 0.5ml intramuscular, 2 tabletas vía oral"
            />

            <TextField
              label="Observaciones"
              value={aplicarData.observaciones}
              onChange={(e) => setAplicarData({ ...aplicarData, observaciones: e.target.value })}
              fullWidth
              multiline
              rows={3}
              placeholder="Reacciones, tolerancia del paciente, efectos adversos..."
            />

            <TextField
              label="Fecha Próxima Aplicación"
              type="date"
              value={aplicarData.proximaAplicacion || ''}
              onChange={(e) => setAplicarData({ ...aplicarData, proximaAplicacion: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
              helperText="Dejar vacío si no aplica"
            />

            <Stack direction="row" spacing={2} justifyContent="flex-end">
              <Button onClick={() => setOpenAplicarDialog(false)}>Cancelar</Button>
              <Button
                variant="contained"
                onClick={handleAplicar}
                color="success"
                disabled={!aplicarData.cantidadAplicada}
              >
                Confirmar Aplicación
              </Button>
            </Stack>
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Dialog NO Aplicado */}
      <Dialog open={openNoAplicadoDialog} onClose={() => setOpenNoAplicadoDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'error.main' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <CancelIcon />
            <Typography variant="h6">Marcar como NO Aplicado</Typography>
          </Stack>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Alert severity="error">
              Registre el motivo por el cual NO se pudo aplicar el medicamento
            </Alert>

            <TextField
              label="Motivo de No Aplicación"
              multiline
              rows={4}
              value={noAplicadoData.motivo}
              onChange={(e) => setNoAplicadoData({ ...noAplicadoData, motivo: e.target.value })}
              fullWidth
              required
              placeholder="Ejemplo: Paciente presentó alergia, Reactivos no disponibles, Paciente rechazó tratamiento, Condición médica contraindica aplicación"
            />

            <FormControlLabel
              control={
                <Checkbox
                  checked={noAplicadoData.crearBarrera}
                  onChange={(e) => setNoAplicadoData({ ...noAplicadoData, crearBarrera: e.target.checked })}
                  color="error"
                />
              }
              label={
                <Typography variant="body2">
                  Crear barrera automática <strong>Clínica</strong> para seguimiento médico
                </Typography>
              }
            />

            {noAplicadoData.crearBarrera && (
              <Alert severity="warning" sx={{ py: 1 }}>
                <Typography variant="caption">
                  Se creará una barrera que requerirá evaluación y gestión del equipo clínico
                </Typography>
              </Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenNoAplicadoDialog(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleNoAplicar} 
            color="error" 
            variant="contained"
            disabled={!noAplicadoData.motivo.trim()}
          >
            Confirmar No Aplicado
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Nueva Crisis */}
      <Dialog open={openCrisisDialog} onClose={() => setOpenCrisisDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar Crisis</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <PatientSelector
              value={crisisForm.pacienteId}
              onChange={(_id, patient) => setCrisisForm({ ...crisisForm, pacienteId: patient?.id ?? null, pacienteNombre: patient?.nombreCompleto || (patient ? `${patient.nombre} ${patient.apellido}` : '') })}
              label="Paciente *" required size="small"
            />
            <TextField label="Fecha de Crisis" type="date" value={crisisForm.fechaCrisis} onChange={(e) => setCrisisForm({ ...crisisForm, fechaCrisis: e.target.value })} fullWidth required InputLabelProps={{ shrink: true }} />
            <Stack direction="row" spacing={2}>
              <TextField label="N° de Crisis" type="number" value={crisisForm.numeroCrisis} onChange={(e) => setCrisisForm({ ...crisisForm, numeroCrisis: Number(e.target.value) })} fullWidth inputProps={{ min: 1 }} />
              <TextField label="Crisis Tratadas" type="number" value={crisisForm.crisisTratadas} onChange={(e) => setCrisisForm({ ...crisisForm, crisisTratadas: Number(e.target.value) })} fullWidth inputProps={{ min: 0 }} />
            </Stack>
            <TextField label="Medicamento Usado" value={crisisForm.medicamentoUsado} onChange={(e) => setCrisisForm({ ...crisisForm, medicamentoUsado: e.target.value })} fullWidth placeholder="Nombre del medicamento administrado" />
            <FormControl fullWidth size="small" required>
              <InputLabel>Estado</InputLabel>
              <Select value={crisisForm.estado} label="Estado" onChange={(e) => setCrisisForm({ ...crisisForm, estado: e.target.value as 'EFECTIVA' | 'NO_EFECTIVA' })}>
                <MenuItem value="EFECTIVA">✅ Efectiva</MenuItem>
                <MenuItem value="NO_EFECTIVA">❌ No Efectiva</MenuItem>
              </Select>
            </FormControl>
            {crisisForm.estado === 'NO_EFECTIVA' && (
              <Alert severity="warning">Al guardar, será redirigido al módulo de Barreras para registrar la barrera asociada.</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenCrisisDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveCrisis} color="primary">Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Nueva Herida */}
      <Dialog open={openHeridaDialog} onClose={() => setOpenHeridaDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Registrar Herida</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <PatientSelector
              value={heridaForm.pacienteId}
              onChange={(_id, patient) => setHeridaForm({ ...heridaForm, pacienteId: patient?.id ?? null, pacienteNombre: patient?.nombreCompleto || (patient ? `${patient.nombre} ${patient.apellido}` : '') })}
              label="Paciente *" required size="small"
            />
            <TextField label="Fecha de Herida" type="date" value={heridaForm.fechaHerida} onChange={(e) => setHeridaForm({ ...heridaForm, fechaHerida: e.target.value })} fullWidth required InputLabelProps={{ shrink: true }} />
            <Stack direction="row" spacing={2}>
              <TextField label="N° de Heridas" type="number" value={heridaForm.numeroHeridas} onChange={(e) => setHeridaForm({ ...heridaForm, numeroHeridas: Number(e.target.value) })} fullWidth inputProps={{ min: 1 }} />
              <TextField label="Heridas Tratadas" type="number" value={heridaForm.heridasTratadas} onChange={(e) => setHeridaForm({ ...heridaForm, heridasTratadas: Number(e.target.value) })} fullWidth inputProps={{ min: 0 }} />
            </Stack>
            <FormControl fullWidth size="small" required>
              <InputLabel>Estado</InputLabel>
              <Select value={heridaForm.estado} label="Estado" onChange={(e) => setHeridaForm({ ...heridaForm, estado: e.target.value as 'EFECTIVA' | 'NO_EFECTIVA' })}>
                <MenuItem value="EFECTIVA">✅ Efectiva — Herida tratada exitosamente</MenuItem>
                <MenuItem value="NO_EFECTIVA">❌ No Efectiva — Requiere seguimiento adicional</MenuItem>
              </Select>
            </FormControl>
            {heridaForm.estado === 'NO_EFECTIVA' && (
              <Alert severity="warning">Al guardar, será redirigido al módulo de Barreras para registrar la barrera asociada.</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenHeridaDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSaveHerida} color="primary">Guardar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
