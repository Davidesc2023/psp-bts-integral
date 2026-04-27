import { useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Switch,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControlLabel,
  CircularProgress,
  Tooltip,
  alpha,
} from '@mui/material';
import { Add, Edit, DragIndicator } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@services/supabaseClient';
import { getCurrentTenantId } from '@/utils/getCurrentTenant';
import toast from 'react-hot-toast';

interface EstadoPaciente {
  id: string;
  tenant_id: string;
  programa_id: string | null;
  codigo: string;
  nombre: string;
  descripcion: string | null;
  requiere_fecha_ingreso: boolean;
  requiere_fecha_activacion: boolean;
  requiere_fecha_inicio_tratamiento: boolean;
  requiere_fecha_retiro: boolean;
  requiere_motivo_retiro: boolean;
  activo: boolean;
  orden: number;
}

type EstadoFormData = Omit<EstadoPaciente, 'id' | 'tenant_id' | 'programa_id'>;

const EMPTY_FORM: EstadoFormData = {
  codigo: '',
  nombre: '',
  descripcion: '',
  requiere_fecha_ingreso: false,
  requiere_fecha_activacion: false,
  requiere_fecha_inicio_tratamiento: false,
  requiere_fecha_retiro: false,
  requiere_motivo_retiro: false,
  activo: true,
  orden: 99,
};

const BADGE_COLORS: Record<string, { bg: string; text: string }> = {
  EN_PROCESO:           { bg: '#dbeafe', text: '#2563eb' },
  ACTIVO:               { bg: '#dcfce7', text: '#16a34a' },
  INTERRUMPIDO:         { bg: '#fde68a', text: '#92400e' },
  DROP_OUT:             { bg: '#fee2e2', text: '#dc2626' },
  PRESCRITO_SIN_INICIO: { bg: '#ede9fe', text: '#6d28d9' },
  RETIRADO:             { bg: '#f3f4f6', text: '#374151' },
  FALLECIDO:            { bg: '#1f2937', text: '#f9fafb' },
  SUSPENDIDO:           { bg: '#fef3c7', text: '#d97706' },
};

const REQUERIMIENTO_LABELS: Record<keyof Pick<EstadoPaciente,
  'requiere_fecha_ingreso' | 'requiere_fecha_activacion' |
  'requiere_fecha_inicio_tratamiento' | 'requiere_fecha_retiro' |
  'requiere_motivo_retiro'>, string> = {
  requiere_fecha_ingreso: 'Fecha ingreso',
  requiere_fecha_activacion: 'Fecha activación',
  requiere_fecha_inicio_tratamiento: 'Fecha inicio tto.',
  requiere_fecha_retiro: 'Fecha retiro',
  requiere_motivo_retiro: 'Motivo retiro',
};

export default function EstadosConfigPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<EstadoPaciente | null>(null);
  const [form, setForm] = useState<EstadoFormData>(EMPTY_FORM);

  const { data: estados = [], isLoading } = useQuery<EstadoPaciente[]>({
    queryKey: ['patient-status-config'],
    queryFn: async () => {
      const tenantId = await getCurrentTenantId();
      const { data, error } = await supabase
        .from('patient_status_config')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('orden', { ascending: true });
      if (error) throw error;
      return data as EstadoPaciente[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: EstadoFormData) => {
      const tenantId = await getCurrentTenantId();
      if (editing) {
        const { error } = await supabase
          .from('patient_status_config')
          .update({ ...payload })
          .eq('id', editing.id)
          .eq('tenant_id', tenantId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('patient_status_config')
          .insert({ ...payload, tenant_id: tenantId });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patient-status-config'] });
      toast.success(editing ? 'Estado actualizado' : 'Estado creado');
      handleClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const toggleActivoMutation = useMutation({
    mutationFn: async ({ id, activo }: { id: string; activo: boolean }) => {
      const tenantId = await getCurrentTenantId();
      const { error } = await supabase
        .from('patient_status_config')
        .update({ activo })
        .eq('id', id)
        .eq('tenant_id', tenantId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['patient-status-config'] }),
    onError: (err: Error) => toast.error(err.message),
  });

  const handleOpen = (estado?: EstadoPaciente) => {
    if (estado) {
      setEditing(estado);
      const { id: _id, tenant_id: _tid, programa_id: _pid, ...rest } = estado;
      setForm(rest);
    } else {
      setEditing(null);
      setForm({ ...EMPTY_FORM, orden: estados.length + 1 });
    }
    setDialogOpen(true);
  };

  const handleClose = () => {
    setDialogOpen(false);
    setEditing(null);
    setForm(EMPTY_FORM);
  };

  const handleBooleanField = (field: keyof EstadoFormData, value: boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" color="#111827">
            Configuración de Estados
          </Typography>
          <Typography variant="body1" color="#6b7280" mt={0.5}>
            Define qué estados de paciente están disponibles y qué campos requieren
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => handleOpen()}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          Nuevo Estado
        </Button>
      </Box>

      {/* Lista de estados */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {estados.map((estado) => {
          const badge = BADGE_COLORS[estado.codigo] ?? { bg: '#f3f4f6', text: '#374151' };
          const reqs = (Object.keys(REQUERIMIENTO_LABELS) as Array<keyof typeof REQUERIMIENTO_LABELS>)
            .filter((k) => estado[k]);
          return (
            <Card
              key={estado.id}
              sx={{
                opacity: estado.activo ? 1 : 0.5,
                border: '1px solid',
                borderColor: estado.activo ? 'divider' : alpha('#000', 0.08),
                transition: 'opacity 0.2s',
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, flexWrap: 'wrap' }}>
                  <DragIndicator sx={{ color: 'text.disabled', mt: 0.5, cursor: 'grab', flexShrink: 0 }} />

                  <Chip
                    label={estado.nombre}
                    size="small"
                    sx={{
                      bgcolor: badge.bg,
                      color: badge.text,
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      minWidth: 130,
                    }}
                  />

                  <Box sx={{ flex: 1, minWidth: 200 }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Código: <strong>{estado.codigo}</strong>
                    </Typography>
                    {estado.descripcion && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        {estado.descripcion}
                      </Typography>
                    )}
                    {reqs.length > 0 && (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                        {reqs.map((r) => (
                          <Chip
                            key={r}
                            label={REQUERIMIENTO_LABELS[r]}
                            size="small"
                            variant="outlined"
                            sx={{ fontSize: '0.7rem', height: 20 }}
                          />
                        ))}
                      </Box>
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
                    <Tooltip title={estado.activo ? 'Desactivar' : 'Activar'}>
                      <Switch
                        checked={estado.activo}
                        size="small"
                        onChange={(e) => toggleActivoMutation.mutate({ id: estado.id, activo: e.target.checked })}
                      />
                    </Tooltip>
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => handleOpen(estado)}>
                        <Edit fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          );
        })}

        {estados.length === 0 && (
          <Card sx={{ p: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              No hay estados configurados. Haz clic en "Nuevo Estado" para agregar.
            </Typography>
          </Card>
        )}
      </Box>

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? 'Editar Estado' : 'Nuevo Estado de Paciente'}</DialogTitle>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <TextField
              label="Código"
              value={form.codigo}
              onChange={(e) => setForm((p) => ({ ...p, codigo: e.target.value.toUpperCase() }))}
              required
              helperText="Ej: ACTIVO, DROP_OUT, RETIRADO"
              inputProps={{ style: { fontFamily: 'monospace' } }}
            />
            <TextField
              label="Nombre"
              value={form.nombre}
              onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
              required
            />
            <TextField
              label="Descripción"
              value={form.descripcion ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
              multiline
              rows={2}
            />
            <TextField
              label="Orden"
              type="number"
              value={form.orden}
              onChange={(e) => setForm((p) => ({ ...p, orden: Number(e.target.value) }))}
              inputProps={{ min: 0, max: 999 }}
            />
            <Box>
              <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                Campos requeridos al asignar este estado
              </Typography>
              {(Object.keys(REQUERIMIENTO_LABELS) as Array<keyof typeof REQUERIMIENTO_LABELS>).map((field) => (
                <FormControlLabel
                  key={field}
                  control={
                    <Switch
                      checked={!!form[field]}
                      size="small"
                      onChange={(e) => handleBooleanField(field, e.target.checked)}
                    />
                  }
                  label={<Typography variant="body2">{REQUERIMIENTO_LABELS[field]}</Typography>}
                />
              ))}
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={form.activo}
                  onChange={(e) => handleBooleanField('activo', e.target.checked)}
                />
              }
              label="Activo"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} color="inherit">Cancelar</Button>
          <Button
            variant="contained"
            disabled={!form.codigo || !form.nombre || saveMutation.isPending}
            onClick={() => saveMutation.mutate(form)}
          >
            {saveMutation.isPending ? <CircularProgress size={20} /> : (editing ? 'Guardar cambios' : 'Crear')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
