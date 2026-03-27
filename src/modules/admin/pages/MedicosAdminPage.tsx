import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Tooltip,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { Add, Search, Edit } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { medicoService } from '@/services/prescripcionService';
import type { MedicoPrescriptor, CreateMedicoRequest } from '@/types/prescripcion.types';

const emptyForm = (): CreateMedicoRequest => ({
  nombre: '',
  apellido: '',
  registroMedico: '',
  especialidad: '',
  telefono: '',
  email: '',
});

const MedicosAdminPage: React.FC = () => {
  const queryClient = useQueryClient();

  // ── filters ──
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // ── modal state ──
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MedicoPrescriptor | null>(null);
  const [form, setForm] = useState<CreateMedicoRequest>(emptyForm());

  const queryKey = ['admin-medicos', search, activeFilter, page, pageSize];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => medicoService.getAll(0, 1000),
  });

  // Client-side filtering
  const filtered = useMemo(() => {
    let items = data?.content ?? [];
    if (activeFilter === 'active') items = items.filter((m) => m.activo);
    if (activeFilter === 'inactive') items = items.filter((m) => !m.activo);
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter(
        (m) =>
          m.nombre.toLowerCase().includes(q) ||
          m.apellido.toLowerCase().includes(q) ||
          m.registroMedico.toLowerCase().includes(q) ||
          m.especialidad.toLowerCase().includes(q) ||
          (m.email ?? '').toLowerCase().includes(q)
      );
    }
    return items;
  }, [data, search, activeFilter]);

  const paginatedRows = useMemo(
    () => filtered.slice(page * pageSize, page * pageSize + pageSize),
    [filtered, page, pageSize]
  );

  const createMutation = useMutation({
    mutationFn: (payload: CreateMedicoRequest) => medicoService.create(payload),
    onSuccess: () => {
      toast.success('Médico creado correctamente');
      queryClient.invalidateQueries({ queryKey: ['admin-medicos'] });
      setModalOpen(false);
    },
    onError: () => {
      toast.error('Error al guardar el médico');
    },
  });

  const openCreate = useCallback(() => {
    setEditingItem(null);
    setForm(emptyForm());
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((item: MedicoPrescriptor) => {
    setEditingItem(item);
    setForm({
      nombre: item.nombre,
      apellido: item.apellido,
      registroMedico: item.registroMedico,
      especialidad: item.especialidad,
      telefono: item.telefono ?? '',
      email: item.email ?? '',
    });
    setModalOpen(true);
  }, []);

  const handleSave = () => {
    if (!form.nombre.trim() || !form.apellido.trim() || !form.registroMedico.trim() || !form.especialidad.trim()) {
      toast.error('Nombre, apellido, registro médico y especialidad son requeridos');
      return;
    }
    createMutation.mutate(form);
  };

  const isSaving = createMutation.isPending;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="#111827">
            Gestión de Médicos Prescriptores
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Administra los médicos autorizados para prescripciones
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={openCreate}
          sx={{ textTransform: 'none', backgroundColor: '#0E7490' }}
        >
          Nuevo Médico
        </Button>
      </Stack>

      {/* Filters */}
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} mb={3} alignItems="center">
        <TextField
          size="small"
          placeholder="Buscar por nombre, registro médico o especialidad..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 320 }}
        />
        <ToggleButtonGroup
          size="small"
          value={activeFilter}
          exclusive
          onChange={(_, v) => { if (v) { setActiveFilter(v); setPage(0); } }}
        >
          <ToggleButton value="all">Todos</ToggleButton>
          <ToggleButton value="active">Activos</ToggleButton>
          <ToggleButton value="inactive">Inactivos</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {/* Table */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#F9FAFB' }}>
                <TableCell sx={{ fontWeight: 700, fontSize: '13px', width: 150 }}>Nombre</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '13px', width: 150 }}>Apellido</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '13px', width: 130 }}>Registro Médico</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '13px', width: 150 }}>Especialidad</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '13px', width: 180 }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '13px', width: 100 }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '13px', width: 80 }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : paginatedRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.secondary">Sin médicos registrados</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((med) => (
                  <TableRow key={med.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                    <TableCell sx={{ fontSize: '13px' }}>{med.nombre}</TableCell>
                    <TableCell sx={{ fontSize: '13px' }}>{med.apellido}</TableCell>
                    <TableCell sx={{ fontSize: '13px' }}>{med.registroMedico}</TableCell>
                    <TableCell sx={{ fontSize: '13px' }}>{med.especialidad}</TableCell>
                    <TableCell sx={{ fontSize: '13px' }}>{med.email ?? '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={med.activo ? 'Activo' : 'Inactivo'}
                        size="small"
                        sx={{
                          backgroundColor: med.activo ? '#D1FAE5' : '#FEE2E2',
                          color: med.activo ? '#065F46' : '#991B1B',
                          fontWeight: 600,
                          fontSize: '11px',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => openEdit(med)} color="primary">
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          rowsPerPage={pageSize}
          rowsPerPageOptions={[10, 20, 50]}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setPageSize(parseInt(e.target.value, 10)); setPage(0); }}
          labelRowsPerPage="Filas:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      </Paper>

      {/* Create / Edit Modal */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingItem ? 'Editar Médico' : 'Nuevo Médico'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack gap={2} mt={1}>
            <Stack direction="row" gap={2}>
              <TextField
                label="Nombre"
                value={form.nombre}
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
                size="small"
                required
                fullWidth
              />
              <TextField
                label="Apellido"
                value={form.apellido}
                onChange={(e) => setForm((f) => ({ ...f, apellido: e.target.value }))}
                size="small"
                required
                fullWidth
              />
            </Stack>
            <Stack direction="row" gap={2}>
              <TextField
                label="Registro Médico"
                value={form.registroMedico}
                onChange={(e) => setForm((f) => ({ ...f, registroMedico: e.target.value }))}
                size="small"
                required
                fullWidth
              />
              <TextField
                label="Especialidad"
                value={form.especialidad}
                onChange={(e) => setForm((f) => ({ ...f, especialidad: e.target.value }))}
                size="small"
                required
                fullWidth
              />
            </Stack>
            <Stack direction="row" gap={2}>
              <TextField
                label="Teléfono"
                value={form.telefono}
                onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                size="small"
                fullWidth
              />
              <TextField
                label="Email"
                type="email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                size="small"
                fullWidth
              />
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)} disabled={isSaving}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={isSaving}
            sx={{ backgroundColor: '#0E7490', textTransform: 'none' }}
          >
            {isSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default MedicosAdminPage;
