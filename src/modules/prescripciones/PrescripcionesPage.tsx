import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Stack,
  Typography,
  Card,
  Chip,
  Grid,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  DialogActions,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Visibility as ViewIcon, AttachFile as AttachFileIcon } from '@mui/icons-material';
import { prescripcionService, medicamentoService, medicoService } from '@services/prescripcionService';
import type { Prescripcion, CreatePrescripcionRequest, Medicamento, MedicoPrescriptor } from '@/types/prescripcion.types';
import { EstadoPrescripcion } from '@/types/prescripcion.types';
import { PatientSelector } from '@modules/shared/components/PatientSelector';
import type { Patient } from '@/types';

export const PrescripcionesPage = () => {
  const [prescripciones, setPrescripciones] = useState<Prescripcion[]>([]);
  const [medicamentos, setMedicamentos] = useState<Medicamento[]>([]);
  const [medicos, setMedicos] = useState<MedicoPrescriptor[]>([]);
  const [loading, setLoading] = useState(false);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedPrescripcion, setSelectedPrescripcion] = useState<Prescripcion | null>(null);
  const [formData, setFormData] = useState<Partial<CreatePrescripcionRequest>>(
    { pacienteId: undefined } // paciente se selecciona con PatientSelector
  );
  const [prescripcionFile, setPrescripcionFile] = useState<File | null>(null);

  useEffect(() => {
    loadPrescripciones();
    loadMedicamentos();
    loadMedicos();
  }, []);

  const loadPrescripciones = async () => {
    setLoading(true);
    try {
      const data = await prescripcionService.getAll(0, 50);
      setPrescripciones(data.content || []);
    } catch (error) {
      console.error('Error cargando prescripciones:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMedicamentos = async () => {
    try {
      const data = await medicamentoService.getActivos();
      setMedicamentos(data);
    } catch (error) {
      console.error('Error cargando medicamentos:', error);
    }
  };

  const loadMedicos = async () => {
    try {
      const data = await medicoService.getActivos();
      setMedicos(data);
    } catch (error) {
      console.error('Error cargando médicos:', error);
    }
  };

  const handleCreate = () => {
    setSelectedPrescripcion(null);
    setFormData({ pacienteId: undefined });
    setPrescripcionFile(null);
    setOpenDialog(true);
  };

  const handleEdit = (prescripcion: Prescripcion) => {
    setSelectedPrescripcion(prescripcion);
    setFormData({
      pacienteId: prescripcion.pacienteId,
      medicamentoId: prescripcion.medicamento.id,
      medicoId: prescripcion.medico.id,
      dosis: prescripcion.dosis,
      frecuencia: prescripcion.frecuencia,
      viaAdministracion: prescripcion.viaAdministracion,
      indicaciones: prescripcion.indicaciones,
      observaciones: prescripcion.observaciones,
      duracionDias: prescripcion.duracionDias,
      // fechaPrescripcion y fechaFin calculada
      ...({ fechaPrescripcion: prescripcion.fechaInicio, diasTratamiento: prescripcion.duracionDias } as any),
    });
    setPrescripcionFile(null);
    setOpenDialog(true);
  };

  const computeEndDate = (startDate: string, days: number): string => {
    if (!startDate || !days) return '';
    const date = new Date(startDate);
    date.setDate(date.getDate() + Number(days));
    return date.toISOString().split('T')[0];
  };

  const handleSave = async () => {
    try {
      const fp = (formData as any).fechaPrescripcion as string | undefined;
      const dias = (formData as any).diasTratamiento as number | undefined;
      const payload = {
        ...formData,
        fechaInicio: fp || formData.fechaInicio,
        fechaFin: fp && dias ? computeEndDate(fp, dias) : formData.fechaFin,
        duracionDias: dias ? Number(dias) : formData.duracionDias,
      };
      if (selectedPrescripcion) {
        await prescripcionService.update(selectedPrescripcion.id, payload);
      } else {
        await prescripcionService.create(payload as CreatePrescripcionRequest);
      }
      setOpenDialog(false);
      loadPrescripciones();
    } catch (error) {
      console.error('Error guardando prescripción:', error);
    }
  };

  const getEstadoColor = (estado: EstadoPrescripcion) => {
    switch (estado) {
      case EstadoPrescripcion.VIGENTE:
        return 'success';
      case EstadoPrescripcion.VENCIDA:
        return 'error';
      case EstadoPrescripcion.CANCELADA:
        return 'default';
      case EstadoPrescripcion.SUSPENDIDA:
        return 'warning';
      default:
        return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight="bold">
          Prescripciones Médicas
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreate}
          color="primary"
        >
          Nueva Prescripción
        </Button>
      </Stack>

      {loading ? (
        <Typography>Cargando...</Typography>
      ) : (
        <Grid container spacing={2}>
          {prescripciones.map((prescripcion) => (
            <Grid item xs={12} md={6} lg={4} key={prescripcion.id}>
              <Card sx={{ p: 2, height: '100%' }}>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                    <Typography variant="h6" fontWeight="bold">
                      {prescripcion.medicamento.nombre}
                    </Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" justifyContent="flex-end">
                      <Chip
                        label={prescripcion.estado}
                        color={getEstadoColor(prescripcion.estado)}
                        size="small"
                      />
                      {prescripcion.fechaFin && (
                        <Chip
                          label={new Date(prescripcion.fechaFin) >= new Date() ? 'VIGENTE' : 'VENCIDA'}
                          color={new Date(prescripcion.fechaFin) >= new Date() ? 'success' : 'error'}
                          size="small"
                          variant="outlined"
                        />
                      )}
                    </Stack>
                  </Stack>

                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Médico:</strong> Dr. {prescripcion.medico.nombre} {prescripcion.medico.apellido}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      <strong>Especialidad:</strong> {prescripcion.medico.especialidad}
                    </Typography>
                  </Box>

                  <Box>
                    <Typography variant="body2">
                      <strong>Dosis:</strong> {prescripcion.dosis}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Frecuencia:</strong> {prescripcion.frecuencia}
                    </Typography>
                    <Typography variant="body2">
                      <strong>Vía:</strong> {prescripcion.viaAdministracion}
                    </Typography>
                  </Box>

                  <Typography variant="body2" color="text.secondary">
                    <strong>Prescripción:</strong> {new Date(prescripcion.fechaInicio).toLocaleDateString()}
                    {prescripcion.fechaFin && (
                      <> · <strong>Vence:</strong> {new Date(prescripcion.fechaFin).toLocaleDateString()}</>
                    )}
                    {prescripcion.duracionDias && (
                      <> · <strong>{prescripcion.duracionDias} días</strong></>
                    )}
                  </Typography>

                  {prescripcion.indicaciones && (
                    <Typography variant="body2" color="text.secondary">
                      <strong>Indicaciones:</strong> {prescripcion.indicaciones}
                    </Typography>
                  )}

                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <IconButton size="small" onClick={() => handleEdit(prescripcion)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton size="small">
                      <ViewIcon />
                    </IconButton>
                  </Stack>
                </Stack>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Dialog Crear/Editar */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {selectedPrescripcion ? 'Editar Prescripción' : 'Nueva Prescripción'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 2 }}>
            {/* Selector de paciente */}
            {!selectedPrescripcion && (
              <PatientSelector
                value={formData.pacienteId ?? null}
                onChange={(_id, patient: Patient | null) => setFormData({ ...formData, pacienteId: patient?.id ?? undefined })}
                label="Paciente *"
                required
                size="small"
              />
            )}

            <FormControl fullWidth>
              <InputLabel>Medicamento</InputLabel>
              <Select
                value={formData.medicamentoId || ''}
                onChange={(e) => setFormData({ ...formData, medicamentoId: Number(e.target.value) })}
                label="Medicamento"
              >
                {medicamentos.map((med) => (
                  <MenuItem key={med.id} value={med.id}>
                    {med.nombre} - {med.concentracion}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Médico Prescriptor</InputLabel>
              <Select
                value={formData.medicoId || ''}
                onChange={(e) => setFormData({ ...formData, medicoId: Number(e.target.value) })}
                label="Médico Prescriptor"
              >
                {medicos.map((med) => (
                  <MenuItem key={med.id} value={med.id}>
                    Dr. {med.nombre} {med.apellido} - {med.especialidad}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <TextField
              label="Dosis"
              value={formData.dosis || ''}
              onChange={(e) => setFormData({ ...formData, dosis: e.target.value })}
              fullWidth
              required
            />

            <TextField
              label="Frecuencia"
              value={formData.frecuencia || ''}
              onChange={(e) => setFormData({ ...formData, frecuencia: e.target.value })}
              fullWidth
              required
              placeholder="Ej: Cada 8 horas, 3 veces al día"
            />

            <TextField
              label="Vía de Administración"
              value={formData.viaAdministracion || ''}
              onChange={(e) => setFormData({ ...formData, viaAdministracion: e.target.value })}
              fullWidth
              required
              placeholder="Ej: Oral, Intramuscular, Intravenosa"
            />

            <TextField
              label="Fecha de Prescripción"
              type="date"
              value={(formData as any).fechaPrescripcion || ''}
              onChange={(e) => setFormData({ ...formData, ...({ fechaPrescripcion: e.target.value } as any) })}
              fullWidth
              required
              InputLabelProps={{ shrink: true }}
              helperText="Fecha en que se emitió la prescripción"
            />

            <TextField
              label="Indicaciones"
              value={formData.indicaciones || ''}
              onChange={(e) => setFormData({ ...formData, indicaciones: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />

            <Stack direction="row" spacing={2}>
              <TextField
                label="Cantidad Prescrita"
                type="number"
                value={(formData as any).cantidadPrescrita || ''}
                onChange={(e) => setFormData({ ...formData, cantidadPrescrita: Number(e.target.value) } as any)}
                fullWidth
                inputProps={{ min: 1 }}
                placeholder="Ej: 30"
              />
              <TextField
                label="Días de Tratamiento"
                type="number"
                value={(formData as any).diasTratamiento || ''}
                onChange={(e) => setFormData({ ...formData, ...({ diasTratamiento: Number(e.target.value) } as any) })}
                fullWidth
                inputProps={{ min: 1 }}
                placeholder="Ej: 90"
              />
            </Stack>

            {/* Fecha fin calculada automáticamente */}
            {(formData as any).fechaPrescripcion && (formData as any).diasTratamiento ? (
              <Box sx={{ p: 1.5, backgroundColor: '#E0F2FE', borderRadius: '8px', border: '1px solid #BAE6FD' }}>
                <Typography variant="body2" color="#0369A1" fontWeight={600}>
                  📅 Fecha fin calculada: {(() => {
                    const fp = (formData as any).fechaPrescripcion as string;
                    const dias = Number((formData as any).diasTratamiento);
                    const end = new Date(fp);
                    end.setDate(end.getDate() + dias);
                    return end.toLocaleDateString('es-CO', { day: '2-digit', month: 'long', year: 'numeric' });
                  })()}
                </Typography>
                <Typography variant="caption" color="#0284C7">
                  Fecha prescripción + {(formData as any).diasTratamiento} días de tratamiento
                </Typography>
              </Box>
            ) : (
              <Typography variant="caption" color="text.secondary">
                ℹ️ Ingrese la fecha de prescripción y los días de tratamiento para calcular automáticamente la fecha de vencimiento.
              </Typography>
            )}

            <TextField
              label="Observaciones"
              value={formData.observaciones || ''}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />

            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Documento de Prescripción (PDF / Imagen)
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AttachFileIcon />}
                  component="label"
                >
                  {prescripcionFile ? 'Cambiar archivo' : 'Cargar Prescripción'}
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setPrescripcionFile(e.target.files?.[0] ?? null)}
                  />
                </Button>
                {prescripcionFile && (
                  <Chip
                    label={prescripcionFile.name}
                    onDelete={() => setPrescripcionFile(null)}
                    size="small"
                    color="primary"
                  />
                )}
              </Stack>
            </Box>

          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave} color="primary">Guardar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
