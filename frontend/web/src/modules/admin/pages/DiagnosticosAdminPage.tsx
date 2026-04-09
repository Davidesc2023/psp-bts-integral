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
} from '@mui/material';
import { Add, Search } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { CatalogTable, ColumnDef } from '../components/CatalogTable';
import { BulkUploadButton } from '../components/BulkUploadButton';
import { diagnosticosCie10Service, DiagnosticoCie10Record } from '../services/adminCatalog.service';

const emptyForm = (): Omit<DiagnosticoCie10Record, 'id'> => ({
  codigo: '',
  descripcion: '',
  categoria: '',
  activo: true,
});

const columns: ColumnDef<DiagnosticoCie10Record>[] = [
  { key: 'codigo', label: 'Código', width: 120 },
  { key: 'descripcion', label: 'Descripción' },
  { key: 'categoria', label: 'Categoría', width: 180 },
  { key: 'activo', label: 'Estado', width: 110 },
];

const DiagnosticosAdminPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [confirmRow, setConfirmRow] = useState<DiagnosticoCie10Record | null>(null);

  const queryKey = ['admin-diagnosticos', search, page, pageSize];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      diagnosticosCie10Service.getDiagnosticos({
        search: search || undefined,
        page,
        size: pageSize,
      }),
  });

  const createMutation = useMutation({
    mutationFn: diagnosticosCie10Service.createDiagnostico,
    onSuccess: () => {
      toast.success('Diagnóstico creado correctamente');
      queryClient.invalidateQueries({ queryKey: ['admin-diagnosticos'] });
      setModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Omit<DiagnosticoCie10Record, 'id'> }) =>
      diagnosticosCie10Service.updateDiagnostico(id, data),
    onSuccess: () => {
      toast.success('Diagnóstico actualizado correctamente');
      queryClient.invalidateQueries({ queryKey: ['admin-diagnosticos'] });
      setModalOpen(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => diagnosticosCie10Service.toggleDiagnosticoStatus(id),
    onSuccess: () => {
      toast.success('Estado actualizado');
      queryClient.invalidateQueries({ queryKey: ['admin-diagnosticos'] });
      setConfirmRow(null);
    },
  });

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((row: DiagnosticoCie10Record) => {
    setEditingId(row.id);
    setForm({ codigo: row.codigo, descripcion: row.descripcion, categoria: row.categoria, activo: row.activo });
    setModalOpen(true);
  }, []);

  const handleSave = () => {
    if (!form.codigo.trim() || !form.descripcion.trim()) {
      toast.error('Código y descripción son requeridos');
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
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="#111827">
            Diagnósticos CIE-10
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Catálogo de clasificación internacional de enfermedades
          </Typography>
        </Box>
        <Stack direction="row" gap={1}>
          <BulkUploadButton
            catalog="diagnosticos-cie10"
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin-diagnosticos'] })}
          />
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={openCreate}
            sx={{ textTransform: 'none', backgroundColor: '#0E7490' }}
          >
            Nuevo diagnóstico
          </Button>
        </Stack>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} mb={3}>
        <TextField
          size="small"
          placeholder="Buscar por código o descripción..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 300 }}
        />
      </Stack>

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
        <DialogTitle>
          {editingId !== null ? 'Editar diagnóstico' : 'Nuevo diagnóstico'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack gap={2} mt={1}>
            <TextField
              label="Código"
              value={form.codigo}
              onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
              size="small"
              required
              fullWidth
            />
            <TextField
              label="Descripción"
              value={form.descripcion}
              onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              size="small"
              required
              fullWidth
              multiline
              rows={2}
            />
            <TextField
              label="Categoría"
              value={form.categoria}
              onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}
              size="small"
              fullWidth
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.activo}
                  onChange={(e) => setForm((f) => ({ ...f, activo: e.target.checked }))}
                />
              }
              label="Activo"
            />
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

      {/* Confirm Toggle */}
      <Dialog open={!!confirmRow} onClose={() => setConfirmRow(null)} maxWidth="xs">
        <DialogTitle>Confirmar cambio de estado</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Deseas {confirmRow?.activo ? 'desactivar' : 'activar'} el diagnóstico{' '}
            <strong>{confirmRow?.codigo} - {confirmRow?.descripcion}</strong>?
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

export default DiagnosticosAdminPage;
