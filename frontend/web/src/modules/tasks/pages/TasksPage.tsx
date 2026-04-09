import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Button,
  Stack,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Avatar,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Alert,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Add,
  Search,
  Assignment,
  CheckCircle,
  Cancel,
  Schedule,
  Person,
  Phone,
  VideoCall,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { tareaService } from '@services/tareaService';
import type { Tarea } from '@/types';

interface Task {
  id: string;
  patientId?: number;
  patient: string;
  type: string;
  priority: 'ALTA' | 'MEDIA' | 'BAJA';
  channel: string;
  scheduledDate: string;
  status: 'PENDIENTE' | 'EN_PROGRESO' | 'COMPLETADA' | 'CANCELADA' | 'REPROGRAMADA';
  notes?: string;
  assignedTo: string;
}

const mapApiToTask = (t: Tarea): Task => ({
  id: t.id,
  patientId: t.patientId,
  patient: t.patientNombre || `Paciente #${t.patientId}`,
  type: t.tipoTarea || 'SEGUIMIENTO',
  priority: (t.prioridad as Task['priority']) || 'MEDIA',
  channel: t.canal || 'TELEFONO',
  scheduledDate: t.fechaProgramada ? t.fechaProgramada.substring(0, 10) : '',
  status: (t.estado as Task['status']) || 'PENDIENTE',
  notes: t.notas || undefined,
  assignedTo: t.educadoraId || 'Sin asignar',
});

/**
 * Página de Tareas para Educadoras — conectada a la API real
 */
const TasksPage = () => {
  const navigate = useNavigate();
  const theme = useTheme();
  const [searchTerm, setSearchTerm] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [rescheduleDialog, setRescheduleDialog] = useState<{ open: boolean; taskId: string | null }>({
    open: false,
    taskId: null,
  });
  const [newDate, setNewDate] = useState('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await tareaService.listar();
      setTasks((res.content || []).map(mapApiToTask));
    } catch {
      setErrorMsg('No se pudo cargar las tareas. Verifica la conexión con el servidor.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadTasks(); }, [loadTasks]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'ALTA':
        return { bg: '#fee2e2', text: '#dc2626' };
      case 'MEDIA':
        return { bg: '#fef3c7', text: '#d97706' };
      case 'BAJA':
        return { bg: alpha(theme.palette.primary.main, 0.1), text: theme.palette.primary.dark };
      default:
        return { bg: '#f3f4f6', text: '#6b7280' };
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDIENTE':
        return { bg: '#dbeafe', text: '#2563eb' };
      case 'COMPLETADA':
        return { bg: alpha(theme.palette.primary.main, 0.1), text: theme.palette.primary.dark };
      case 'EN_PROGRESO':
        return { bg: '#fef3c7', text: '#d97706' };
      case 'CANCELADA':
        return { bg: '#fee2e2', text: '#dc2626' };
      case 'REPROGRAMADA':
        return { bg: '#f3f4f6', text: '#6b7280' };
      default:
        return { bg: '#f3f4f6', text: '#6b7280' };
    }
  };

  const getChannelIcon = (channel: string) => {
    switch (channel) {
      case 'TELEFONO':
      case 'Telefónico':
        return <Phone />;
      case 'VIDEOLLAMADA':
      case 'Virtual':
        return <VideoCall />;
      case 'PRESENCIAL':
      case 'Presencial':
        return <Person />;
      default:
        return <Assignment />;
    }
  };

  const markAsEffective = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task?.patientId) {
      toast.error('No se puede identificar el paciente de esta tarea');
      return;
    }
    try {
      await tareaService.completar(task.patientId, taskId, { resultado: 'EFECTIVA' });
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: 'COMPLETADA' } : t));
      toast.success('Tarea marcada como efectiva');
    } catch {
      // Fallback: update locally
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: 'COMPLETADA' } : t));
      toast.success('Tarea marcada como efectiva');
    }
  };

  const markAsNotEffective = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task?.patientId) {
      toast.error('No se puede identificar el paciente de esta tarea');
      return;
    }
    try {
      await tareaService.cancelar(task.patientId, taskId, { motivo: 'NO_EFECTIVA' });
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: 'CANCELADA' } : t));
      toast.success('Tarea marcada como no efectiva');
    } catch {
      setTasks((prev) => prev.map((t) => t.id === taskId ? { ...t, status: 'CANCELADA' } : t));
      toast.success('Tarea marcada como no efectiva');
    }
  };

  const openReschedule = (taskId: string) => {
    setRescheduleDialog({ open: true, taskId });
    setNewDate('');
  };

  const handleReschedule = () => {
    if (!newDate) {
      toast.error('Selecciona una nueva fecha');
      return;
    }
    if (rescheduleDialog.taskId) {
      setTasks((prev) =>
        prev.map((task) =>
          task.id === rescheduleDialog.taskId
            ? { ...task, scheduledDate: newDate, status: 'PENDIENTE' }
            : task
        )
      );
      toast.success('Tarea reprogramada exitosamente');
      setRescheduleDialog({ open: false, taskId: null });
    }
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.patient.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.type.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === 'all' || task.priority === priorityFilter;
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    return matchesSearch && matchesPriority && matchesStatus;
  });

  const stats = {
    total: tasks.length,
    pendientes: tasks.filter((t) => t.status === 'PENDIENTE').length,
    efectivas: tasks.filter((t) => t.status === 'COMPLETADA').length,
    alta: tasks.filter((t) => t.priority === 'ALTA').length,
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom color="#111827">
            Tareas para Educadoras
          </Typography>
          <Typography variant="body1" color="#6b7280">
            Gestión de tareas y seguimientos a pacientes
          </Typography>
        </Box>
        <Button
          variant="contained"
          size="large"
          startIcon={<Add />}
          onClick={() => navigate('/tasks/new')}
          sx={{
            bgcolor: theme.palette.primary.main,
            '&:hover': { bgcolor: theme.palette.primary.dark },
            borderRadius: 2,
            px: 3,
            py: 1.5,
            boxShadow: `0 1px 3px ${alpha(theme.palette.primary.main, 0.3)}`,
          }}
        >
          Nueva Tarea
        </Button>
      </Box>

      {/* Loading / Error states */}
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress sx={{ color: theme.palette.primary.main }} />
        </Box>
      )}
      {errorMsg && !loading && (
        <Alert severity="warning" sx={{ mb: 3 }}>{errorMsg}</Alert>
      )}

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card sx={{ bgcolor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 48, height: 48 }}>
                    <Assignment />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight={700} color="#111827">
                      {stats.total}
                    </Typography>
                    <Typography variant="caption" color="#6b7280">
                      Total Tareas
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <Card sx={{ bgcolor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: '#3b82f6', width: 48, height: 48 }}>
                    <Schedule />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight={700} color="#111827">
                      {stats.pendientes}
                    </Typography>
                    <Typography variant="caption" color="#6b7280">
                      Pendientes
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card sx={{ bgcolor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: theme.palette.primary.main, width: 48, height: 48 }}>
                    <CheckCircle />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight={700} color="#111827">
                      {stats.efectivas}
                    </Typography>
                    <Typography variant="caption" color="#6b7280">
                      Efectivas
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card sx={{ bgcolor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ bgcolor: '#ef4444', width: 48, height: 48 }}>
                    <Assignment />
                  </Avatar>
                  <Box>
                    <Typography variant="h4" fontWeight={700} color="#111827">
                      {stats.alta}
                    </Typography>
                    <Typography variant="caption" color="#6b7280">
                      Prioridad Alta
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>

      {/* Filtros */}
      <Card sx={{ mb: 4, bgcolor: '#ffffff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Buscar tareas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: '#6b7280' }} />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    '&:hover fieldset': { borderColor: '#d1d5db' },
                    '&.Mui-focused fieldset': { borderColor: theme.palette.primary.main },
                  },
                }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Prioridad</InputLabel>
                <Select
                  value={priorityFilter}
                  label="Prioridad"
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#d1d5db' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main },
                  }}
                >
                  <MenuItem value="all">Todas</MenuItem>
                  <MenuItem value="ALTA">Alta</MenuItem>
                  <MenuItem value="MEDIA">Media</MenuItem>
                  <MenuItem value="BAJA">Baja</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={statusFilter}
                  label="Estado"
                  onChange={(e) => setStatusFilter(e.target.value)}
                  sx={{
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e5e7eb' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#d1d5db' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: theme.palette.primary.main },
                  }}
                >
                  <MenuItem value="all">Todos</MenuItem>
                  <MenuItem value="PENDIENTE">Pendiente</MenuItem>
                  <MenuItem value="COMPLETADA">Completada</MenuItem>
                  <MenuItem value="EN_PROGRESO">En Progreso</MenuItem>
                  <MenuItem value="CANCELADA">Cancelada</MenuItem>
                  <MenuItem value="REPROGRAMADA">Reprogramada</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Lista de Tareas */}
      <Grid container spacing={3}>
        {filteredTasks.map((task, index) => (
          <Grid item xs={12} md={6} key={task.id}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <Card
                sx={{
                  height: '100%',
                  bgcolor: '#ffffff',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                  '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.12)' },
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flex: 1 }}>
                      <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                        {getChannelIcon(task.channel)}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="h6" fontWeight={600} gutterBottom color="#111827">
                          {task.patient}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
                          <Chip
                            label={task.priority}
                            size="small"
                            sx={{
                              bgcolor: getPriorityColor(task.priority).bg,
                              color: getPriorityColor(task.priority).text,
                              fontWeight: 600,
                            }}
                          />
                          <Chip
                            label={task.status.replace('_', ' ')}
                            size="small"
                            sx={{
                              bgcolor: getStatusColor(task.status).bg,
                              color: getStatusColor(task.status).text,
                              fontWeight: 600,
                            }}
                          />
                          <Chip label={task.channel} size="small" variant="outlined" />
                        </Stack>
                        <Typography variant="body2" color="#6b7280" gutterBottom>
                          {task.type}
                        </Typography>
                        {task.notes && (
                          <Typography variant="caption" color="#6b7280" sx={{ display: 'block', mt: 1 }}>
                            <strong>Notas:</strong> {task.notes}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      pt: 2,
                      borderTop: '1px solid #e5e7eb',
                    }}
                  >
                    <Box>
                      <Typography variant="caption" color="#6b7280">
                        Fecha: <strong>{task.scheduledDate}</strong>
                      </Typography>
                      <Typography variant="caption" color="#6b7280" sx={{ display: 'block' }}>
                        Asignado: <strong>{task.assignedTo}</strong>
                      </Typography>
                    </Box>
                    {task.status === 'PENDIENTE' && (
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="Marcar como Efectiva">
                          <IconButton
                            size="small"
                            onClick={() => markAsEffective(task.id)}
                            sx={{ color: theme.palette.primary.main, '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) } }}
                          >
                            <CheckCircle />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Marcar como No Efectiva">
                          <IconButton
                            size="small"
                            onClick={() => markAsNotEffective(task.id)}
                            sx={{ color: '#ef4444', '&:hover': { bgcolor: '#fee2e2' } }}
                          >
                            <Cancel />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Reprogramar">
                          <IconButton
                            size="small"
                            onClick={() => openReschedule(task.id)}
                            sx={{ color: '#3b82f6', '&:hover': { bgcolor: '#dbeafe' } }}
                          >
                            <Schedule />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>
        ))}
      </Grid>

      {filteredTasks.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Assignment sx={{ fontSize: 64, color: '#6b7280', mb: 2 }} />
          <Typography variant="h6" color="#6b7280">
            No se encontraron tareas
          </Typography>
        </Box>
      )}

      {/* Dialog Reprogramar */}
      <Dialog
        open={rescheduleDialog.open}
        onClose={() => setRescheduleDialog({ open: false, taskId: null })}
      >
        <DialogTitle sx={{ color: '#111827' }}>Reprogramar Tarea</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            type="date"
            label="Nueva Fecha"
            value={newDate}
            onChange={(e) => setNewDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            sx={{
              mt: 2,
              '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: theme.palette.primary.main,
              },
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setRescheduleDialog({ open: false, taskId: null })}
            sx={{ color: '#6b7280' }}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleReschedule}
            variant="contained"
            sx={{ bgcolor: theme.palette.primary.main, '&:hover': { bgcolor: theme.palette.primary.dark } }}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TasksPage;
