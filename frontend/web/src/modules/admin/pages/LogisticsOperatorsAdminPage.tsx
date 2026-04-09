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
import { logisticsOperatorsService, LogisticsOperatorRecord } from '../services/adminCatalog.service';

const emptyForm = (): Omit<LogisticsOperatorRecord, 'id'> => ({
  codigo: '',
  nombre: '',
  activo: true,
});

const columns: ColumnDef<LogisticsOperatorRecord>[] = [
  { key: 'codigo', label: 'Código', width: 120 },
  { key: 'nombre', label: 'Nombre' },
  { key: 'activo', label: 'Estado', width: 110 },
];

const LogisticsOperatorsAdminPage: React.FC = () => {
  const queryClient = useQueryClient();

  // ── filters ──
  const [search, setSearch] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'true' | 'false'>('all');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  // ── modal state ──
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm());

  // ── confirm toggle ──
  const [confirmRow, setConfirmRow] = useState<LogisticsOperatorRecord | null>(null);

  const queryKey = ['admin-logistics-operators', search, activeFilter, page, pageSize];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      logisticsOperatorsService.getLogisticsOperators({
        search: search || undefined,
        active: activeFilter === 'all' ? undefined : activeFilter === 'true',
        page,
        size: pageSize,
      }),
  });

  const createMutation = useMutation({
    mutationFn: logisticsOperatorsService.createLogisticsOperator,
    onSuccess: () => {
      toast.success('Operador creado correctamente');
      queryClient.invalidateQueries({ queryKey: ['admin-logistics-operators'] });
      setModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Omit<LogisticsOperatorRecord, 'id'> }) =>
      logisticsOperatorsService.updateLogisticsOperator(id, data),
    onSuccess: () => {
      toast.success('Operador actualizado correctamente');
      queryClient.invalidateQueries({ queryKey: ['admin-logistics-operators'] });
      setModalOpen(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: number) => logisticsOperatorsService.toggleLogisticsOperatorStatus(id),
    onSuccess: () => {
      toast.success('Estado actualizado');
      queryClient.invalidateQueries({ queryKey: ['admin-logistics-operators'] });
      setConfirmRow(null);
    },
  });

  const openCreate = useCallback(() => {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((row: LogisticsOperatorRecord) => {
    setEditingId(row.id);
    setForm({ codigo: row.codigo, nombre: row.nombre, activo: row.activo });
    setModalOpen(true);
  }, []);

  const handleSave = () => {
    if (!form.codigo.trim() || !form.nombre.trim()) {
      toast.error('Código y nombre son requeridos');
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
            Operadores Logísticos
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gestión de operadores logísticos del sistema
          </Typography>
        </Box>
        <Stack direction="row" gap={1}>
          <BulkUploadButton
            catalog="logistics-operators"
            onSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin-logistics-operators'] })}
          />
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={openCreate}
            sx={{ textTransform: 'none', backgroundColor: '#0E7490' }}
          >
            Nuevo Operador
          </Button>
        </Stack>
      </Stack>

      {/* Filters */}
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} mb={3}>
        <TextField
          size="small"
          placeholder="Buscar por nombre o código..."
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
        <DialogTitle>{editingId !== null ? 'Editar Operador' : 'Nuevo Operador'}</DialogTitle>
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
              label="Nombre"
              value={form.nombre}
              onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              size="small"
              required
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

      {/* Confirm Toggle Status */}
      <Dialog open={!!confirmRow} onClose={() => setConfirmRow(null)} maxWidth="xs">
        <DialogTitle>Confirmar cambio de estado</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Deseas {confirmRow?.activo ? 'desactivar' : 'activar'} el operador{' '}
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

export default LogisticsOperatorsAdminPage;
