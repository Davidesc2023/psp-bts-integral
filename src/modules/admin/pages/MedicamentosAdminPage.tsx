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
import { medicamentoService } from '@/services/prescripcionService';
import type { Medicamento, CreateMedicamentoRequest } from '@/types/prescripcion.types';

const emptyForm = (): CreateMedicamentoRequest => ({
  nombre: '',
  concentracion: '',
  unidad: '',
  laboratorio: '',
  codigoAtc: '',
  descripcion: '',
});

const MedicamentosAdminPage: React.FC = () => {
  const queryClient = useQueryClient();

  // ── filters ──
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // ── modal state ──
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Medicamento | null>(null);
  const [form, setForm] = useState<CreateMedicamentoRequest>(emptyForm());

  const queryKey = ['admin-medicamentos', search, activeFilter, page, pageSize];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => medicamentoService.getAll(0, 1000),
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
          m.laboratorio.toLowerCase().includes(q) ||
          m.codigoAtc.toLowerCase().includes(q)
      );
    }
    return items;
  }, [data, search, activeFilter]);

  const paginatedRows = useMemo(
    () => filtered.slice(page * pageSize, page * pageSize + pageSize),
    [filtered, page, pageSize]
  );

  const createMutation = useMutation({
    mutationFn: (payload: CreateMedicamentoRequest) => medicamentoService.create(payload),
    onSuccess: () => {
      toast.success('Medicamento creado correctamente');
      queryClient.invalidateQueries({ queryKey: ['admin-medicamentos'] });
      setModalOpen(false);
    },
    onError: () => {
      toast.error('Error al guardar el medicamento');
    },
  });

  const openCreate = useCallback(() => {
    setEditingItem(null);
    setForm(emptyForm());
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((item: Medicamento) => {
    setEditingItem(item);
    setForm({
      nombre: item.nombre,
      concentracion: item.concentracion,
      unidad: item.unidad,
      laboratorio: item.laboratorio,
      codigoAtc: item.codigoAtc,
      descripcion: item.descripcion ?? '',
    });
    setModalOpen(true);
  }, []);

  const handleSave = () => {
    if (!form.nombre.trim()) {
      toast.error('El nombre es requerido');
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
            Gestión de Medicamentos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Administra el catálogo de medicamentos del sistema
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={openCreate}
          sx={{ textTransform: 'none', backgroundColor: '#0E7490' }}
        >
          Nuevo Medicamento
        </Button>
      </Stack>

      {/* Filters */}
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} mb={3} alignItems="center">
        <TextField
          size="small"
          placeholder="Buscar por nombre, laboratorio o código ATC..."
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
                <TableCell sx={{ fontWeight: 700, fontSize: '13px', width: 200 }}>Nombre</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '13px', width: 120 }}>Concentración</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '13px', width: 100 }}>Unidad</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '13px', width: 150 }}>Laboratorio</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '13px', width: 120 }}>Código ATC</TableCell>
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
                    <Typography variant="body2" color="text.secondary">Sin medicamentos</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedRows.map((med) => (
                  <TableRow key={med.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                    <TableCell sx={{ fontSize: '13px' }}>{med.nombre}</TableCell>
                    <TableCell sx={{ fontSize: '13px' }}>{med.concentracion}</TableCell>
                    <TableCell sx={{ fontSize: '13px' }}>{med.unidad}</TableCell>
                    <TableCell sx={{ fontSize: '13px' }}>{med.laboratorio}</TableCell>
                    <TableCell sx={{ fontSize: '13px' }}>{med.codigoAtc}</TableCell>
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
        <DialogTitle>{editingItem ? 'Editar Medicamento' : 'Nuevo Medicamento'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack gap={2} mt={1}>
            <TextField
              label="Nombre"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              size="small"
              required
              fullWidth
            />
            <Stack direction="row" gap={2}>
              <TextField
                label="Concentración"
                value={form.concentracion}
                onChange={(e) => setForm((f) => ({ ...f, concentracion: e.target.value }))}
                size="small"
                fullWidth
              />
              <TextField
                label="Unidad"
                value={form.unidad}
                onChange={(e) => setForm((f) => ({ ...f, unidad: e.target.value }))}
                size="small"
                fullWidth
              />
            </Stack>
            <Stack direction="row" gap={2}>
              <TextField
                label="Laboratorio"
                value={form.laboratorio}
                onChange={(e) => setForm((f) => ({ ...f, laboratorio: e.target.value }))}
                size="small"
                fullWidth
              />
              <TextField
                label="Código ATC"
                value={form.codigoAtc}
                onChange={(e) => setForm((f) => ({ ...f, codigoAtc: e.target.value }))}
                size="small"
                fullWidth
              />
            </Stack>
            <TextField
              label="Descripción"
              value={form.descripcion}
              onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              size="small"
              fullWidth
              multiline
              rows={3}
            />
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

export default MedicamentosAdminPage;
