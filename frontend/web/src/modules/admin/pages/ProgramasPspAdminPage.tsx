import React, { useState, useCallback } from 'react';
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
  DialogContentText,
  FormControlLabel,
  Checkbox,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { Add, Search } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CatalogTable, ColumnDef } from '../components/CatalogTable';
import { BulkUploadButton } from '../components/BulkUploadButton';
import { programasPspService, ProgramaPspRecord } from '../services/adminCatalog.service';

interface ProgramaForm {
  nombre: string;
  descripcion: string;
  patologiaObjetivo: string;
  activo: boolean;
}

const emptyForm = (): ProgramaForm => ({
  nombre: '',
  descripcion: '',
  patologiaObjetivo: '',
  activo: true,
});

const columns: ColumnDef<ProgramaPspRecord>[] = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'descripcion', label: 'Descripción' },
  { key: 'activo', label: 'Estado', width: 110 },
];

const ProgramasPspAdminPage: React.FC = () => {
  const queryClient = useQueryClient();

  // ── filters ──
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // ── modal state ──
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<ProgramaForm>(emptyForm());

  // ── confirm toggle ──
  const [confirmRow, setConfirmRow] = useState<ProgramaPspRecord | null>(null);

  const queryKey = ['admin-programas-psp', search, activeFilter, page, pageSize];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      programasPspService.getProgramas({
        search: search || undefined,
        active: activeFilter === 'all' ? undefined : activeFilter === 'true',
        page,
        size: pageSize,
      }),
  });

  const createMutation = useMutation({
    mutationFn: (formData: ProgramaForm) =>
      programasPspService.createPrograma(formData as any),
    onSuccess: () => {
      toast.success('Programa creado correctamente');
      queryClient.invalidateQueries({ queryKey: ['admin-programas-psp'] });
      setModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProgramaForm }) =>
      programasPspService.updatePrograma(id, data as any),
    onSuccess: () => {
      toast.success('Programa actualizado correctamente');
      queryClient.invalidateQueries({ queryKey: ['admin-programas-psp'] });
      setModalOpen(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => programasPspService.toggleProgramaStatus(id),
    onSuccess: () => {
      toast.success('Estado actualizado');
      queryClient.invalidateQueries({ queryKey: ['admin-programas-psp'] });
      setConfirmRow(null);
    },
  });

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((row: ProgramaPspRecord) => {
    setEditingId(row.id);
    setForm({
      nombre: row.nombre,
      descripcion: row.descripcion,
      patologiaObjetivo: '',
      activo: row.activo,
    });
    setModalOpen(true);
  }, []);

  const handleSave = () => {
    if (!form.nombre.trim() || !form.patologiaObjetivo.trim()) {
      toast.error('Nombre y Patología Objetivo son requeridos');
      return;
    }
    if (editingId !== null) {
      updateMutation.mutate({ id: editingId, data: form });
    } else {
      createMutation.mutate(form);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="#111827">
            Programas PSP
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestión de programas de soporte a pacientes
          </Typography>
        </Box>
        <Stack direction="row" gap={1}>
          <BulkUploadButton
            catalog="programas-psp"
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin-programas-psp'] })}
          />
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={openCreate}
            sx={{ textTransform: 'none', backgroundColor: '#0E7490' }}
          >
            Nuevo Programa
          </Button>
        </Stack>
      </Stack>

      {/* Filters */}
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} mb={3}>
        <TextField
          size="small"
          placeholder="Buscar por nombre..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 280 }}
        />
        <ToggleButtonGroup
          size="small"
          value={activeFilter}
          exclusive
          onChange={(_, v) => { if (v) { setActiveFilter(v); setPage(0); } }}
        >
          <ToggleButton value="all">Todos</ToggleButton>
          <ToggleButton value="true">Activos</ToggleButton>
          <ToggleButton value="false">Inactivos</ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {/* Table */}
      <CatalogTable
        columns={columns}
        rows={data?.content ?? []}
        loading={isLoading}
        totalElements={data?.totalElements ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
        onEdit={openEdit}
        onToggleStatus={(row) => setConfirmRow(row)}
      />

      {/* Create / Edit Modal */}
      <Dialog open={modalOpen} onClose={() => setModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId !== null ? 'Editar Programa' : 'Nuevo Programa'}</DialogTitle>
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
            <TextField
              label="Patología Objetivo"
              value={form.patologiaObjetivo}
              onChange={(e) => setForm((f) => ({ ...f, patologiaObjetivo: e.target.value }))}
              size="small"
              required
              fullWidth
            />
            <TextField
              label="Descripción"
              value={form.descripcion}
              onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              size="small"
              fullWidth
              multiline
              rows={3}
            />
            {editingId !== null && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.activo}
                    onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
                  />
                }
                label="Activo"
              />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalOpen(false)} disabled={isSaving}>
            Cancelar
          </Button>
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

      {/* Confirm Toggle Status */}
      <Dialog open={!!confirmRow} onClose={() => setConfirmRow(null)} maxWidth="xs">
        <DialogTitle>Confirmar cambio de estado</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Deseas {confirmRow?.activo ? 'desactivar' : 'activar'} el programa{' '}
            <strong>{confirmRow?.nombre}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmRow(null)}>Cancelar</Button>
          <Button
            variant="contained"
            color={confirmRow?.activo ? 'error' : 'success'}
            onClick={() => confirmRow && toggleMutation.mutate(confirmRow.id)}
            disabled={toggleMutation.isPending}
          >
            {confirmRow?.activo ? 'Desactivar' : 'Activar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ProgramasPspAdminPage;
