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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tooltip,
  IconButton,
} from '@mui/material';
import { Add, Search, ManageAccounts } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  userManagementService,
  AdminUser,
  AdminUserRole,
  CreateUserData,
  UpdateUserData,
} from '../services/userManagement.service';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  CircularProgress,
} from '@mui/material';
import { Edit, ToggleOn, ToggleOff } from '@mui/icons-material';

const ALL_ROLES: AdminUserRole[] = [
  'SUPER_ADMIN',
  'ADMIN_INSTITUCION',
  'MEDICO',
  'ENFERMERIA',
  'COORDINADOR',
  'EDUCADORA',
  'FARMACEUTICA',
  'AUDITOR',
  'MSL',
];

const ROLE_LABELS: Record<AdminUserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN_INSTITUCION: 'Admin',
  MEDICO: 'Médico',
  ENFERMERIA: 'Enfermería',
  COORDINADOR: 'Coordinador',
  EDUCADORA: 'Educadora',
  FARMACEUTICA: 'Farmacéutica',
  AUDITOR: 'Auditor',
  PACIENTE: 'Paciente',
  CUIDADOR: 'Cuidador',
};

const ROLE_COLORS: Record<string, 'default' | 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success'> = {
  SUPER_ADMIN: 'error',
  ADMIN_INSTITUCION: 'warning',
  MEDICO: 'primary',
  ENFERMERIA: 'info',
  COORDINADOR: 'secondary',
  EDUCADORA: 'success',
  FARMACEUTICA: 'default',
  AUDITOR: 'default',
};

const emptyCreate = (): CreateUserData => ({
  email: '',
  nombre: '',
  apellido: '',
  role: 'MEDICO',
  institucionId: '',
  institucionNombre: '',
  password: '',
});

const UsersAdminPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<AdminUserRole | 'ALL'>('ALL');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState<CreateUserData>(emptyCreate());
  const [editForm, setEditForm] = useState<UpdateUserData>({
    email: '',
    nombre: '',
    apellido: '',
    role: 'MEDICO',
    institucionId: '',
    institucionNombre: '',
  });

  const [confirmToggle, setConfirmToggle] = useState<AdminUser | null>(null);

  // Change role dialog
  const [changeRoleUser, setChangeRoleUser] = useState<AdminUser | null>(null);
  const [newRole, setNewRole] = useState<AdminUserRole>('MEDICO');

  const queryKey = ['admin-users', search, roleFilter, page, pageSize];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () =>
      userManagementService.getUsers({
        search: search || undefined,
        role: roleFilter !== 'ALL' ? roleFilter : undefined,
        page,
        size: pageSize,
      }),
  });

  const createMutation = useMutation({
    mutationFn: userManagementService.createUser,
    onSuccess: () => {
      toast.success('Usuario creado correctamente');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setModalOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateUserData }) =>
      userManagementService.updateUser(id, data),
    onSuccess: () => {
      toast.success('Usuario actualizado correctamente');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setModalOpen(false);
    },
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => userManagementService.toggleUserStatus(id),
    onSuccess: () => {
      toast.success('Estado de usuario actualizado');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setConfirmToggle(null);
    },
  });

  const changeRoleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: AdminUserRole }) =>
      userManagementService.changeUserRole(id, role),
    onSuccess: () => {
      toast.success('Rol actualizado correctamente');
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      setChangeRoleUser(null);
    },
  });

  const openCreate = useCallback(() => {
    setEditingId(null);
    setCreateForm(emptyCreate());
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((user: AdminUser) => {
    setEditingId(user.id);
    setEditForm({
      email: user.email,
      nombre: user.nombre,
      apellido: user.apellido,
      role: user.role,
      institucionId: user.institucionId,
      institucionNombre: user.institucionNombre,
    });
    setModalOpen(true);
  }, []);

  const handleSave = () => {
    if (editingId !== null) {
      if (!editForm.email.trim() || !editForm.nombre.trim()) {
        toast.error('Email y nombre son requeridos');
        return;
      }
      updateMutation.mutate({ id: editingId, data: editForm });
    } else {
      if (!createForm.email.trim() || !createForm.nombre.trim() || !createForm.password) {
        toast.error('Email, nombre y contraseña son requeridos');
        return;
      }
      createMutation.mutate(createForm);
    }
  };

  const isCreating = editingId === null;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={700} color="#111827">
            Gestión de Usuarios
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Administra las cuentas y roles de acceso al sistema
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={openCreate}
          sx={{ textTransform: 'none', backgroundColor: '#0E7490' }}
        >
          Nuevo usuario
        </Button>
      </Stack>

      {/* Filters */}
      <Stack direction={{ xs: 'column', sm: 'row' }} gap={2} mb={3} flexWrap="wrap" alignItems="center">
        <TextField
          size="small"
          placeholder="Buscar por nombre o email..."
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
        <Stack direction="row" gap={1} flexWrap="wrap">
          {(['ALL', ...ALL_ROLES] as const).map((r) => (
            <Chip
              key={r}
              label={r === 'ALL' ? 'TODOS' : ROLE_LABELS[r as AdminUserRole]}
              size="small"
              color={roleFilter === r ? 'primary' : 'default'}
              onClick={() => { setRoleFilter(r); setPage(0); }}
              sx={{ cursor: 'pointer', fontWeight: roleFilter === r ? 700 : 400 }}
            />
          ))}
        </Stack>
      </Stack>

      {/* Table */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#F9FAFB' }}>
                <TableCell sx={{ fontWeight: 700, fontSize: '13px' }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '13px' }}>Nombre</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '13px' }}>Rol</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '13px' }}>Institución</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '13px' }}>Estado</TableCell>
                <TableCell sx={{ fontWeight: 700, fontSize: '13px', width: 120 }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : (data?.content ?? []).length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                    <Typography variant="body2" color="text.secondary">Sin usuarios</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                (data?.content ?? []).map((user) => (
                  <TableRow key={user.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                    <TableCell sx={{ fontSize: '13px' }}>{user.email}</TableCell>
                    <TableCell sx={{ fontSize: '13px' }}>{user.nombre} {user.apellido}</TableCell>
                    <TableCell>
                      <Chip
                        label={ROLE_LABELS[user.role] ?? user.role}
                        size="small"
                        color={ROLE_COLORS[user.role] ?? 'default'}
                        sx={{ fontSize: '11px', fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell sx={{ fontSize: '13px' }}>{user.institucionNombre}</TableCell>
                    <TableCell>
                      <Chip
                        label={user.enabled ? 'Activo' : 'Inactivo'}
                        size="small"
                        sx={{
                          backgroundColor: user.enabled ? '#D1FAE5' : '#FEE2E2',
                          color: user.enabled ? '#065F46' : '#991B1B',
                          fontWeight: 600,
                          fontSize: '11px',
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" gap={0.5}>
                        <Tooltip title="Editar">
                          <IconButton size="small" onClick={() => openEdit(user)} color="primary">
                            <Edit fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title={user.enabled ? 'Desactivar' : 'Activar'}>
                          <IconButton
                            size="small"
                            onClick={() => setConfirmToggle(user)}
                            sx={{ color: user.enabled ? '#10B981' : '#EF4444' }}
                          >
                            {user.enabled ? <ToggleOn fontSize="small" /> : <ToggleOff fontSize="small" />}
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Cambiar rol">
                          <IconButton
                            size="small"
                            onClick={() => { setChangeRoleUser(user); setNewRole(user.role); }}
                            sx={{ color: '#6B7280' }}
                          >
                            <ManageAccounts fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={data?.totalElements ?? 0}
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
        <DialogTitle>{isCreating ? 'Nuevo usuario' : 'Editar usuario'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Stack gap={2} mt={1}>
            <TextField
              label="Email"
              type="email"
              value={isCreating ? createForm.email : editForm.email}
              onChange={(e) =>
                isCreating
                  ? setCreateForm((f) => ({ ...f, email: e.target.value }))
                  : setEditForm((f) => ({ ...f, email: e.target.value }))
              }
              size="small"
              required
              fullWidth
            />
            <Stack direction="row" gap={2}>
              <TextField
                label="Nombre"
                value={isCreating ? createForm.nombre : editForm.nombre}
                onChange={(e) =>
                  isCreating
                    ? setCreateForm((f) => ({ ...f, nombre: e.target.value }))
                    : setEditForm((f) => ({ ...f, nombre: e.target.value }))
                }
                size="small"
                required
                fullWidth
              />
              <TextField
                label="Apellido"
                value={isCreating ? createForm.apellido : editForm.apellido}
                onChange={(e) =>
                  isCreating
                    ? setCreateForm((f) => ({ ...f, apellido: e.target.value }))
                    : setEditForm((f) => ({ ...f, apellido: e.target.value }))
                }
                size="small"
                fullWidth
              />
            </Stack>
            <FormControl size="small" fullWidth>
              <InputLabel>Rol</InputLabel>
              <Select
                label="Rol"
                value={isCreating ? createForm.role : editForm.role}
                onChange={(e) => {
                  const v = e.target.value as AdminUserRole;
                  isCreating
                    ? setCreateForm((f) => ({ ...f, role: v }))
                    : setEditForm((f) => ({ ...f, role: v }));
                }}
              >
                {ALL_ROLES.map((r) => (
                  <MenuItem key={r} value={r}>{ROLE_LABELS[r]}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="ID de Institución"
              value={isCreating ? createForm.institucionId : editForm.institucionId}
              onChange={(e) =>
                isCreating
                  ? setCreateForm((f) => ({ ...f, institucionId: e.target.value }))
                  : setEditForm((f) => ({ ...f, institucionId: e.target.value }))
              }
              size="small"
              fullWidth
            />
            <TextField
              label="Nombre de Institución"
              value={isCreating ? createForm.institucionNombre : editForm.institucionNombre}
              onChange={(e) =>
                isCreating
                  ? setCreateForm((f) => ({ ...f, institucionNombre: e.target.value }))
                  : setEditForm((f) => ({ ...f, institucionNombre: e.target.value }))
              }
              size="small"
              fullWidth
            />
            {isCreating && (
              <TextField
                label="Contraseña"
                type="password"
                value={createForm.password}
                onChange={(e) => setCreateForm((f) => ({ ...f, password: e.target.value }))}
                size="small"
                required
                fullWidth
              />
            )}
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

      {/* Confirm Toggle Status */}
      <Dialog open={!!confirmToggle} onClose={() => setConfirmToggle(null)} maxWidth="xs">
        <DialogTitle>Confirmar cambio de estado</DialogTitle>
        <DialogContent>
          <DialogContentText>
            ¿Deseas {confirmToggle?.enabled ? 'desactivar' : 'activar'} al usuario{' '}
            <strong>{confirmToggle?.email}</strong>?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmToggle(null)}>Cancelar</Button>
          <Button
            variant="contained"
            color={confirmToggle?.enabled ? 'error' : 'success'}
            onClick={() => confirmToggle && toggleMutation.mutate(confirmToggle.id)}
            disabled={toggleMutation.isPending}
          >
            {confirmToggle?.enabled ? 'Desactivar' : 'Activar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Change Role Dialog */}
      <Dialog open={!!changeRoleUser} onClose={() => setChangeRoleUser(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Cambiar rol de usuario</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="text.secondary" mb={2}>
            Usuario: <strong>{changeRoleUser?.email}</strong>
          </Typography>
          <FormControl size="small" fullWidth>
            <InputLabel>Nuevo rol</InputLabel>
            <Select
              label="Nuevo rol"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as AdminUserRole)}
            >
              {ALL_ROLES.map((r) => (
                <MenuItem key={r} value={r}>{ROLE_LABELS[r]}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangeRoleUser(null)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={() =>
              changeRoleUser && changeRoleMutation.mutate({ id: changeRoleUser.id, role: newRole })
            }
            disabled={changeRoleMutation.isPending}
            sx={{ backgroundColor: '#0E7490', textTransform: 'none' }}
          >
            {changeRoleMutation.isPending ? 'Guardando...' : 'Cambiar rol'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UsersAdminPage;
