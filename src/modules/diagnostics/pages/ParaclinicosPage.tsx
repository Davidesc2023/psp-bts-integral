import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Grid,
  Card,
  CardContent,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  useTheme,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Add, Search, Science, AttachFile } from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { paraclinicoService } from '@services/paraclinicoService';
import { PatientSelector } from '@modules/shared/components/PatientSelector';
import type { Patient, TipoParaclinico } from '@/types';

type ExamenEstado = 'PENDIENTE' | 'EN_PROCESO' | 'COMPLETADO' | 'CRITICO';

interface Examen {
  id: number | string;
  paciente: string;
  tipoExamen: string;
  fechaSolicitud: string;
  fechaResultado: string | null;
  resultado: string;
  referencia: string;
  estado: ExamenEstado;
}

const estadoChipColor = (
  estado: ExamenEstado
): 'warning' | 'info' | 'success' | 'error' => {
  const map: Record<ExamenEstado, 'warning' | 'info' | 'success' | 'error'> = {
    PENDIENTE: 'warning',
    EN_PROCESO: 'info',
    COMPLETADO: 'success',
    CRITICO: 'error',
  };
  return map[estado];
};

const mapApiToExamen = (dto: any): Examen => ({
  id: dto.id,
  paciente: dto.patientName || `Paciente #${dto.patientId}`,
  tipoExamen: dto.tipoParaclinicoNombre || 'Examen',
  fechaSolicitud: dto.fechaSolicitud || '',
  fechaResultado: dto.fechaResultado ?? null,
  resultado: dto.valorTexto || (dto.valorResultado != null ? String(dto.valorResultado) : '—'),
  // TODO: campo 'referencia' no disponible en GET /api/paraclinicos — el backend no retorna valores de referencia
  referencia: '—',
  estado:
    dto.estadoResultado === 'REALIZADO'
      ? (dto.interpretacion === 'CRITICO' ? 'CRITICO' : 'COMPLETADO')
      : dto.estadoResultado === 'PENDIENTE'
      ? 'PENDIENTE'
      : ('EN_PROCESO' as ExamenEstado),
});

const ParaclinicosPage = () => {
  const theme = useTheme();
  const [search, setSearch] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<string>('TODOS');
  const [openDialog, setOpenDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const [examenes, setExamenes] = useState<Examen[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [resultadoFile, setResultadoFile] = useState<File | null>(null);
  const [tiposParaclinicos, setTiposParaclinicos] = useState<TipoParaclinico[]>([]);
  const [createForm, setCreateForm] = useState({
    patientId: null as number | null,
    tipoParaclinicoId: null as number | null,
    fechaSolicitud: new Date().toISOString().split('T')[0],
    laboratorioExterno: '',
    observaciones: '',
  });

  const loadExamenes = useCallback(async () => {
    setLoadingList(true);
    setListError(null);
    try {
      const data = await paraclinicoService.listar();
      setExamenes(data.map(mapApiToExamen));
    } catch {
      setListError('No se pudo cargar la lista de paraclínicos desde el servidor.');
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadExamenes();
    paraclinicoService.listarTipos().then(setTiposParaclinicos).catch(() => {});
  }, [loadExamenes]);

  const examenesFiltrados = examenes.filter((e) => {
    const matchSearch = e.paciente.toLowerCase().includes(search.toLowerCase()) || e.tipoExamen.toLowerCase().includes(search.toLowerCase());
    const matchEstado = filtroEstado === 'TODOS' || e.estado === filtroEstado;
    return matchSearch && matchEstado;
  });

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
            <Science sx={{ color: '#0E7490', fontSize: 32 }} />
            <Typography variant="h5" fontWeight={700} color="text.primary">
              Paraclínicos
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
            Nuevo Examen
          </Button>
        </Box>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <TextField
            placeholder="Buscar paciente o examen..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            size="small"
            sx={{
              flex: 1,
              minWidth: 220,
              backgroundColor: '#FFFFFF',
              borderRadius: '8px',
              '& .MuiOutlinedInput-root': { borderRadius: '8px' },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search sx={{ color: '#6B7280' }} />
                </InputAdornment>
              ),
            }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Estado</InputLabel>
            <Select
              value={filtroEstado}
              label="Estado"
              onChange={(e) => setFiltroEstado(e.target.value)}
              sx={{ backgroundColor: '#FFFFFF', borderRadius: '8px' }}
            >
              <MenuItem value="TODOS">Todos</MenuItem>
              <MenuItem value="PENDIENTE">Pendiente</MenuItem>
              <MenuItem value="EN_PROCESO">En Proceso</MenuItem>
              <MenuItem value="COMPLETADO">Completado</MenuItem>
              <MenuItem value="CRITICO">Crítico</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </motion.div>

      {/* Loading / Error */}
      {loadingList && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}
      {listError && !loadingList && (
        <Alert severity="warning" sx={{ mb: 2 }}>{listError}</Alert>
      )}

      {/* Grid de Cards */}
      <Grid container spacing={2}>
        {examenesFiltrados.map((examen, index) => (
          <Grid item xs={12} sm={6} md={4} key={examen.id}>
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
                  cursor: 'pointer',
                  transition: 'box-shadow 0.2s, transform 0.2s',
                  '&:hover': {
                    boxShadow: '0 4px 12px rgba(14,116,144,0.15)',
                    transform: 'translateY(-2px)',
                  },
                }}
                onClick={() =>
                  toast(`Ver detalles de examen: ${examen.tipoExamen}`, {
                    icon: '🔬',
                  })
                }
              >
                <CardContent sx={{ p: 2 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'flex-start',
                      mb: 1.5,
                    }}
                  >
                    <Typography variant="subtitle2" fontWeight={700} color="text.primary">
                      {examen.tipoExamen}
                    </Typography>
                    <Chip
                      label={examen.estado.replace('_', ' ')}
                      color={estadoChipColor(examen.estado)}
                      size="small"
                      sx={{ fontWeight: 600, fontSize: '0.7rem' }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 1 }}>
                    <Typography variant="body2" color="text.secondary" fontWeight={500}>
                      Paciente:
                    </Typography>
                    <Typography variant="body2" color="text.primary">
                      {examen.paciente}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Solicitado
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {examen.fechaSolicitud}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Resultado
                      </Typography>
                      <Typography variant="body2" fontWeight={500}>
                        {examen.fechaResultado ?? '—'}
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      backgroundColor: '#F7F8FA',
                      borderRadius: '8px',
                      p: 1,
                      border: '1px solid #E5E7EB',
                    }}
                  >
                    <Typography variant="caption" color="text.secondary">
                      Resultado / Referencia
                    </Typography>
                    <Typography
                      variant="body2"
                      fontWeight={700}
                      color={
                        examen.estado === 'CRITICO'
                          ? 'error.main'
                          : 'text.primary'
                      }
                    >
                      {examen.resultado}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Ref: {examen.referencia}
                    </Typography>
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {examenesFiltrados.length === 0 && (
        <Box sx={{ textAlign: 'center', mt: 8 }}>
          <Science sx={{ fontSize: 64, color: '#D1D5DB' }} />
          <Typography variant="h6" color="text.secondary" mt={2}>
            No se encontraron exámenes
          </Typography>
        </Box>
      )}

      {/* Dialog Nuevo Paraclínico */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Nuevo Paraclínico / Examen</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <PatientSelector
              value={createForm.patientId}
              onChange={(_id, patient: Patient | null) => setCreateForm((p) => ({ ...p, patientId: patient?.id ?? null }))}
              label="Paciente *"
              required
              size="small"
            />
            <FormControl fullWidth size="small" required>
              <InputLabel>Tipo de Examen *</InputLabel>
              <Select
                value={createForm.tipoParaclinicoId ?? ''}
                label="Tipo de Examen *"
                onChange={(e) => setCreateForm((p) => ({ ...p, tipoParaclinicoId: Number(e.target.value) }))}
              >
                {tiposParaclinicos.map((t) => (
                  <MenuItem key={t.id} value={t.id}>
                    {t.nombre}
                  </MenuItem>
                ))}
                {tiposParaclinicos.length === 0 && (
                  <MenuItem disabled value="">
                    Cargando tipos...
                  </MenuItem>
                )}
              </Select>
            </FormControl>
            <TextField
              label="Fecha de Solicitud *"
              type="date"
              value={createForm.fechaSolicitud}
              onChange={(e) => setCreateForm((p) => ({ ...p, fechaSolicitud: e.target.value }))}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Laboratorio Externo (opcional)"
              value={createForm.laboratorioExterno}
              onChange={(e) => setCreateForm((p) => ({ ...p, laboratorioExterno: e.target.value }))}
              fullWidth
              size="small"
              placeholder="Nombre del laboratorio"
            />
            <TextField
              label="Observaciones"
              value={createForm.observaciones}
              onChange={(e) => setCreateForm((p) => ({ ...p, observaciones: e.target.value }))}
              fullWidth
              size="small"
              multiline
              rows={2}
            />
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Resultados (PDF / Imagen) — opcional
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<AttachFile />}
                  component="label"
                >
                  {resultadoFile ? 'Cambiar archivo' : 'Cargar Resultados'}
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => setResultadoFile(e.target.files?.[0] ?? null)}
                  />
                </Button>
                {resultadoFile && (
                  <Chip
                    label={resultadoFile.name}
                    onDelete={() => setResultadoFile(null)}
                    size="small"
                    color="success"
                  />
                )}
              </Stack>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button onClick={() => setOpenDialog(false)} variant="outlined" color="inherit">Cancelar</Button>
          <Button
            onClick={async () => {
              if (!createForm.patientId) { toast.error('Selecciona un paciente'); return; }
              if (!createForm.tipoParaclinicoId) { toast.error('Selecciona el tipo de examen'); return; }
              setSaving(true);
              try {
                await paraclinicoService.crear({
                  patientId: createForm.patientId,
                  tipoParaclinicoId: createForm.tipoParaclinicoId,
                  fechaSolicitud: createForm.fechaSolicitud,
                  laboratorioExterno: createForm.laboratorioExterno || undefined,
                  observaciones: createForm.observaciones || undefined,
                });
                toast.success('✅ Paraclínico registrado exitosamente');
                setOpenDialog(false);
                setResultadoFile(null);
                setCreateForm({ patientId: null, tipoParaclinicoId: null, fechaSolicitud: new Date().toISOString().split('T')[0], laboratorioExterno: '', observaciones: '' });
                loadExamenes();
              } catch {
                toast.error('Error al registrar el paraclínico. Verifica los datos.');
              } finally {
                setSaving(false);
              }
            }}
            variant="contained"
            disabled={saving}
            startIcon={saving ? <CircularProgress size={16} /> : undefined}
          >
            {saving ? 'Guardando...' : 'Registrar Examen'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ParaclinicosPage;
