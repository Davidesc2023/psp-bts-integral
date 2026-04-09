import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  CircularProgress,
  Card,
  CardContent,
  Stack,
} from '@mui/material';
import {
  Search,
  People,
  Block,
  Description,
  History,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  auditoriaService,
  AuditoriaLog,
  AuditoriaResumen,
  PageResponse,
} from '@/services/auditoriaService';

const TABLA_OPTIONS = ['patients', 'barriers', 'consentimientos'] as const;

const OPERACION_OPTIONS = ['INSERT', 'UPDATE', 'DELETE'] as const;

const TABLA_CHIP_COLORS: Record<string, { bg: string; text: string }> = {
  patients: { bg: '#CCFBF1', text: '#0E7490' },
  barriers: { bg: '#FFEDD5', text: '#9A3412' },
  consentimientos: { bg: '#EDE9FE', text: '#6D28D9' },
};

const OPERACION_CHIP_COLORS: Record<string, { bg: string; text: string }> = {
  INSERT: { bg: '#D1FAE5', text: '#065F46' },
  UPDATE: { bg: '#DBEAFE', text: '#1E40AF' },
  DELETE: { bg: '#FEE2E2', text: '#991B1B' },
};

const TABLA_LABELS: Record<string, string> = {
  patients: 'Pacientes',
  barriers: 'Barreras',
  consentimientos: 'Consentimientos',
};

const TABLA_ICONS: Record<string, React.ReactNode> = {
  patients: <People sx={{ color: '#0E7490' }} />,
  barriers: <Block sx={{ color: '#9A3412' }} />,
  consentimientos: <Description sx={{ color: '#6D28D9' }} />,
};

function formatFecha(iso: string): string {
  try {
    const d = new Date(iso);
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return iso;
  }
}

function truncate(text: string | null, max: number): string {
  if (!text) return '-';
  return text.length > max ? text.substring(0, max) + '…' : text;
}

const AuditoriaPage: React.FC = () => {
  const [tablaFilter, setTablaFilter] = useState<string>('');
  const [operacionFilter, setOperacionFilter] = useState<string>('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);

  const {
    data: logsData,
    isLoading: logsLoading,
  } = useQuery<PageResponse<AuditoriaLog>>({
    queryKey: ['auditoria', tablaFilter, operacionFilter, page, pageSize],
    queryFn: () =>
      auditoriaService.getLogs({
        tabla: tablaFilter || undefined,
        operacion: operacionFilter || undefined,
        page,
        size: pageSize,
      }),
  });

  const { data: resumen } = useQuery<AuditoriaResumen>({
    queryKey: ['auditoria-resumen'],
    queryFn: () => auditoriaService.getResumen(),
  });

  const filteredLogs = useMemo(() => {
    if (!logsData?.content) return [];
    if (!search.trim()) return logsData.content;
    const term = search.toLowerCase();
    return logsData.content.filter(
      (log) =>
        log.registroId?.toLowerCase().includes(term) ||
        log.tabla.toLowerCase().includes(term)
    );
  }, [logsData, search]);

  const totalElements = logsData?.totalElements ?? 0;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <History sx={{ color: '#0E7490', fontSize: 28 }} />
          <Typography variant="h5" fontWeight={700} color="#111827">
            Auditoría del Sistema
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Registro de todas las operaciones críticas del sistema
        </Typography>
      </Box>

      {/* Summary Cards */}
      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
        {TABLA_OPTIONS.map((tabla) => {
          const count = resumen?.[tabla] ?? 0;
          const colors = TABLA_CHIP_COLORS[tabla];
          return (
            <Card
              key={tabla}
              sx={{
                minWidth: 180,
                flex: '1 1 180px',
                bgcolor: 'white',
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              }}
            >
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2, '&:last-child': { pb: 2 } }}>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    borderRadius: '8px',
                    bgcolor: colors.bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {TABLA_ICONS[tabla]}
                </Box>
                <Box>
                  <Typography variant="h6" fontWeight={700} color="#111827">
                    {count.toLocaleString('es-CO')}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {TABLA_LABELS[tabla]}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Tabla</InputLabel>
          <Select
            value={tablaFilter}
            label="Tabla"
            onChange={(e) => {
              setTablaFilter(e.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="">Todas</MenuItem>
            {TABLA_OPTIONS.map((t) => (
              <MenuItem key={t} value={t}>
                {TABLA_LABELS[t]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Operación</InputLabel>
          <Select
            value={operacionFilter}
            label="Operación"
            onChange={(e) => {
              setOperacionFilter(e.target.value);
              setPage(0);
            }}
          >
            <MenuItem value="">Todas</MenuItem>
            {OPERACION_OPTIONS.map((op) => (
              <MenuItem key={op} value={op}>
                {op}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <TextField
          size="small"
          placeholder="Buscar por Registro ID o tabla…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 260 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search sx={{ color: '#9CA3AF' }} />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      {/* Table */}
      <TableContainer component={Paper} sx={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#F9FAFB' }}>
              <TableCell sx={{ fontWeight: 600, width: 150, color: '#374151' }}>Fecha</TableCell>
              <TableCell sx={{ fontWeight: 600, width: 120, color: '#374151' }}>Tabla</TableCell>
              <TableCell sx={{ fontWeight: 600, width: 100, color: '#374151' }}>Operación</TableCell>
              <TableCell sx={{ fontWeight: 600, width: 200, color: '#374151' }}>Registro ID</TableCell>
              <TableCell sx={{ fontWeight: 600, width: 200, color: '#374151' }}>Datos Anteriores</TableCell>
              <TableCell sx={{ fontWeight: 600, width: 200, color: '#374151' }}>Datos Nuevos</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {logsLoading ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={32} sx={{ color: '#0E7490' }} />
                </TableCell>
              </TableRow>
            ) : filteredLogs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                  <Typography color="text.secondary">No se encontraron registros de auditoría</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filteredLogs.map((log) => {
                const tablaColors = TABLA_CHIP_COLORS[log.tabla] ?? { bg: '#F3F4F6', text: '#374151' };
                const opColors = OPERACION_CHIP_COLORS[log.operacion] ?? { bg: '#F3F4F6', text: '#374151' };

                return (
                  <TableRow key={log.id} hover>
                    <TableCell sx={{ fontSize: 13 }}>
                      {formatFecha(log.fechaOperacion)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={TABLA_LABELS[log.tabla] ?? log.tabla}
                        size="small"
                        sx={{ bgcolor: tablaColors.bg, color: tablaColors.text, fontWeight: 500 }}
                      />
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={log.operacion}
                        size="small"
                        sx={{ bgcolor: opColors.bg, color: opColors.text, fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell>
                      {log.registroId ? (
                        <Tooltip title={log.registroId} arrow>
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: 'monospace',
                              fontSize: 12,
                              maxWidth: 180,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {log.registroId}
                          </Typography>
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" color="text.disabled">-</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.datosAnteriores ? (
                        <Tooltip title={log.datosAnteriores} arrow>
                          <Chip
                            label={truncate(log.datosAnteriores, 50)}
                            size="small"
                            variant="outlined"
                            sx={{ maxWidth: 190, fontFamily: 'monospace', fontSize: 11 }}
                          />
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" color="text.disabled">-</Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {log.datosNuevos ? (
                        <Tooltip title={log.datosNuevos} arrow>
                          <Chip
                            label={truncate(log.datosNuevos, 50)}
                            size="small"
                            variant="outlined"
                            sx={{ maxWidth: 190, fontFamily: 'monospace', fontSize: 11 }}
                          />
                        </Tooltip>
                      ) : (
                        <Typography variant="body2" color="text.disabled">-</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>

        <TablePagination
          component="div"
          count={totalElements}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={pageSize}
          onRowsPerPageChange={(e) => {
            setPageSize(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 20, 50]}
          labelRowsPerPage="Filas por página"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}–${to} de ${count !== -1 ? count : `más de ${to}`}`
          }
        />
      </TableContainer>
    </Box>
  );
};

export default AuditoriaPage;
