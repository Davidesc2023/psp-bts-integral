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
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Checkbox,
  FormControlLabel,
  Stack,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  GppGood,
  CheckCircle,
  Cancel,
  Person,
  Description,
  VerifiedUser,
  PendingActions,
  CloudUpload,
  AttachFile,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { PatientSelector } from '@modules/shared/components/PatientSelector';
import {
  consentimientoService,
  type Consentimiento,
  type CreateConsentimientoRequest,
} from '@/services/consentimientoService';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ConsentimientosPage = () => {
  const [consentimientos, setConsentimientos] = useState<Consentimiento[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<Consentimiento | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [form, setForm] = useState<{
    patientId: number | undefined;
    consentimientoPsp: boolean;
    consentimientoTratamiento: boolean;
    archivoDocumento: string;
    fechaCarga: string;
  }>({
    patientId: undefined,
    consentimientoPsp: false,
    consentimientoTratamiento: false,
    archivoDocumento: '',
    fechaCarga: '',
  });

  const resetForm = () => {
    setForm({
      patientId: undefined,
      consentimientoPsp: false,
      consentimientoTratamiento: false,
      archivoDocumento: '',
      fechaCarga: '',
    });
    setSelectedItem(null);
    setSelectedFile(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    if (file && file.size > MAX_FILE_SIZE) {
      toast.error(`El archivo supera el límite de 10 MB (${(file.size / (1024*1024)).toFixed(1)} MB)`);
      e.target.value = '';
      setSelectedFile(null);
      return;
    }
    setSelectedFile(file);
  };

  const kpis = [
    {
      label: 'Total Consentimientos',
      value: consentimientos.length,
      color: '#4F46E5',
      bg: '#EEF2FF',
      icon: <Description sx={{ color: '#4F46E5', fontSize: 24 }} />,
    },
    {
      label: 'Con PSP Firmado',
      value: consentimientos.filter((c) => c.consentimientoPsp).length,
      color: '#10B981',
      bg: '#D1FAE5',
      icon: <VerifiedUser sx={{ color: '#10B981', fontSize: 24 }} />,
    },
    {
      label: 'Con Tratamiento Firmado',
      value: consentimientos.filter((c) => c.consentimientoTratamiento).length,
      color: '#0E7490',
      bg: '#E0F2FE',
      icon: <CheckCircle sx={{ color: '#0E7490', fontSize: 24 }} />,
    },
    {
      label: 'Pendientes',
      value: consentimientos.filter(
        (c) => !c.consentimientoPsp || !c.consentimientoTratamiento
      ).length,
      color: '#F59E0B',
      bg: '#FEF3C7',
      icon: <PendingActions sx={{ color: '#F59E0B', fontSize: 24 }} />,
    },
  ];

  const loadConsentimientos = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await consentimientoService.listar();
      setConsentimientos(data);
    } catch {
      setErrorMsg('No se pudo cargar los consentimientos desde el servidor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConsentimientos();
  }, [loadConsentimientos]);

  const handleOpenCreate = () => {
    resetForm();
    setOpenDialog(true);
  };

  const handleOpenEdit = (item: Consentimiento) => {
    setSelectedItem(item);
    setForm({
      patientId: item.patientId,
      consentimientoPsp: item.consentimientoPsp,
      consentimientoTratamiento: item.consentimientoTratamiento,
      archivoDocumento: item.archivoDocumento || '',
      fechaCarga: item.fechaCarga || '',
    });
    setOpenDialog(true);
  };

  const handleOpenDelete = (item: Consentimiento) => {
    setSelectedItem(item);
    setOpenDeleteDialog(true);
  };

  const handleSave = async () => {
    if (!form.patientId) {
      toast.error('Seleccione un paciente');
      return;
    }

    try {
      let archivoUrl = form.archivoDocumento;

      if (selectedFile) {
        setUploadingFile(true);
        try {
          archivoUrl = await consentimientoService.subirArchivo(form.patientId, selectedFile);
        } catch (uploadErr) {
          const msg = uploadErr instanceof Error ? uploadErr.message : 'Error al subir el archivo';
          toast.error(msg);
          return;
        } finally {
          setUploadingFile(false);
        }
      }

      const payload: CreateConsentimientoRequest = {
        patientId: form.patientId,
        consentimientoPsp: form.consentimientoPsp,
        consentimientoTratamiento: form.consentimientoTratamiento,
        archivoDocumento: archivoUrl || undefined,
        fechaCarga: form.fechaCarga || undefined,
      };

      if (selectedItem) {
        await consentimientoService.actualizar(selectedItem.id, payload);
        toast.success('Consentimiento actualizado correctamente');
      } else {
        await consentimientoService.crear(payload);
        toast.success('Consentimiento registrado correctamente');
      }
      setOpenDialog(false);
      resetForm();
      loadConsentimientos();
    } catch {
      toast.error('Error al guardar el consentimiento');
    }
  };

  const handleDelete = async () => {
    if (!selectedItem) return;
    try {
      await consentimientoService.eliminar(selectedItem.id);
      toast.success('Consentimiento eliminado');
      setOpenDeleteDialog(false);
      setSelectedItem(null);
      loadConsentimientos();
    } catch {
      toast.error('Error al eliminar el consentimiento');
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
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <GppGood sx={{ color: '#4F46E5', fontSize: 32 }} />
              <Typography variant="h5" fontWeight={700} color="text.primary">
                Consentimientos Informados
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, ml: 5.5 }}>
              Gestión de consentimientos de pacientes del programa
            </Typography>
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
            Agregar
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
                    'PSP',
                    'Tratamiento',
                    'Documento',
                    'Fecha Carga',
                    'Fecha Registro',
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
                {consentimientos.length === 0 && !errorMsg && (
                  <TableRow>
                    <TableCell colSpan={7} sx={{ textAlign: 'center', py: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        No hay consentimientos registrados
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {consentimientos.map((item) => (
                  <TableRow
                    key={item.id}
                    sx={{
                      '&:hover': { backgroundColor: '#F9FAFB' },
                      transition: 'background 0.15s',
                    }}
                  >
                    {/* Paciente */}
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Avatar
                          sx={{
                            width: 30,
                            height: 30,
                            backgroundColor: '#EEF2FF',
                            color: '#4F46E5',
                          }}
                        >
                          <Person sx={{ fontSize: 18 }} />
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

                    {/* PSP */}
                    <TableCell align="center">
                      {item.consentimientoPsp ? (
                        <CheckCircle sx={{ color: '#10B981', fontSize: 22 }} />
                      ) : (
                        <Cancel sx={{ color: '#EF4444', fontSize: 22 }} />
                      )}
                    </TableCell>

                    {/* Tratamiento */}
                    <TableCell align="center">
                      {item.consentimientoTratamiento ? (
                        <CheckCircle sx={{ color: '#10B981', fontSize: 22 }} />
                      ) : (
                        <Cancel sx={{ color: '#EF4444', fontSize: 22 }} />
                      )}
                    </TableCell>

                    {/* Documento */}
                    <TableCell>
                      {item.archivoDocumento ? (
                        <Chip
                          label="Ver documento"
                          size="small"
                          component="a"
                          href={item.archivoDocumento}
                          target="_blank"
                          rel="noopener noreferrer"
                          clickable
                          sx={{
                            backgroundColor: '#EEF2FF',
                            color: '#4F46E5',
                            fontWeight: 600,
                            fontSize: '0.72rem',
                          }}
                        />
                      ) : (
                        <Chip
                          label="Sin documento"
                          size="small"
                          sx={{
                            backgroundColor: '#F3F4F6',
                            color: '#9CA3AF',
                            fontSize: '0.72rem',
                          }}
                        />
                      )}
                    </TableCell>

                    {/* Fecha Carga */}
                    <TableCell sx={{ color: '#6B7280', fontSize: '0.82rem' }}>
                      {item.fechaCarga || '—'}
                    </TableCell>

                    {/* Fecha Registro */}
                    <TableCell sx={{ color: '#6B7280', fontSize: '0.82rem' }}>
                      {item.fechaCreacion
                        ? new Date(item.fechaCreacion).toLocaleDateString('es-CO')
                        : '—'}
                    </TableCell>

                    {/* Acciones */}
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
                            onClick={() => handleOpenDelete(item)}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </motion.div>
      )}

      {/* Dialog: Crear / Editar */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {selectedItem ? 'Editar Consentimiento' : 'Registrar Consentimiento'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <PatientSelector
              value={form.patientId ?? null}
              onChange={(id) =>
                setForm({ ...form, patientId: id ?? undefined })
              }
              label="Paciente"
              required
              disabled={!!selectedItem}
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.consentimientoPsp}
                  onChange={(e) =>
                    setForm({ ...form, consentimientoPsp: e.target.checked })
                  }
                  sx={{ color: '#4F46E5', '&.Mui-checked': { color: '#4F46E5' } }}
                />
              }
              label="Consentimiento PSP firmado"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.consentimientoTratamiento}
                  onChange={(e) =>
                    setForm({ ...form, consentimientoTratamiento: e.target.checked })
                  }
                  sx={{ color: '#4F46E5', '&.Mui-checked': { color: '#4F46E5' } }}
                />
              }
              label="Consentimiento Tratamiento firmado"
            />
            {/* File Upload */}
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: 'block' }}>
                Documento del Consentimiento (máx. 200 KB · PDF, JPG, PNG)
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  component="label"
                  variant="outlined"
                  size="small"
                  startIcon={<CloudUpload />}
                  sx={{ textTransform: 'none', borderColor: '#4F46E5', color: '#4F46E5' }}
                >
                  Seleccionar archivo
                  <input
                    type="file"
                    hidden
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                  />
                </Button>
                {selectedFile ? (
                  <Chip
                    icon={<AttachFile fontSize="small" />}
                    label={`${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`}
                    size="small"
                    onDelete={() => setSelectedFile(null)}
                    sx={{ maxWidth: 280 }}
                  />
                ) : form.archivoDocumento ? (
                  <Chip
                    icon={<AttachFile fontSize="small" />}
                    label="Documento existente"
                    size="small"
                    component="a"
                    href={form.archivoDocumento}
                    target="_blank"
                    rel="noopener noreferrer"
                    clickable
                    color="primary"
                    sx={{ maxWidth: 200 }}
                  />
                ) : (
                  <Typography variant="caption" color="text.disabled">
                    Sin documento adjunto
                  </Typography>
                )}
              </Box>
            </Box>
            <TextField
              label="Fecha de Carga"
              type="date"
              value={form.fechaCarga}
              onChange={(e) => setForm({ ...form, fechaCarga: e.target.value })}
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={uploadingFile}
            startIcon={uploadingFile ? <CircularProgress size={16} color="inherit" /> : undefined}
            sx={{
              backgroundColor: '#4F46E5',
              '&:hover': { backgroundColor: '#4338CA' },
            }}
          >
            {uploadingFile ? 'Subiendo...' : selectedItem ? 'Actualizar' : 'Registrar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Confirmar Eliminación */}
      <Dialog
        open={openDeleteDialog}
        onClose={() => setOpenDeleteDialog(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            ¿Está seguro que desea eliminar el consentimiento de{' '}
            <strong>{selectedItem?.patientName}</strong>? Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleDelete}
            sx={{
              backgroundColor: '#EF4444',
              '&:hover': { backgroundColor: '#DC2626' },
            }}
          >
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ConsentimientosPage;
