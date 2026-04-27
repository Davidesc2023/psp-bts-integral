import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  useTheme,
} from '@mui/material';
import {
  Download,
  TableChart,
  FilterList,
  Assessment,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { patientService } from '@services/patient.service';
import { seguimientoService } from '@services/seguimientoService';
import { entregaService } from '@services/entregaService';
import { aplicacionService } from '@services/aplicacionService';
import { barrierService } from '@services/barrierService';
import { paraclinicoService } from '@services/paraclinicoService';
import { prescripcionService } from '@services/prescripcionService';
import { transporteService } from '@services/transporteService';
import { inventarioService } from '@modules/inventario/services/inventario.service';
import { servicioComplementarioService } from '@services/servicioComplementarioService';
import * as XLSX from 'xlsx';

// ─── Download utilities ───────────────────────────────────────────────────────

const downloadCSV = (data: Record<string, unknown>[], filename: string) => {
  if (!data.length) return;
  const headers = Object.keys(data[0]).join(',');
  const rows = data
    .map((row) =>
      Object.values(row)
        .map((v) => `"${v}"`)
        .join(',')
    )
    .join('\n');
  const csv = `${headers}\n${rows}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

const downloadExcel = (data: Record<string, unknown>[], filename: string) => {
  if (!data.length) return;
  const ws = XLSX.utils.json_to_sheet(data);
  // Auto-width columns
  const keys = Object.keys(data[0]);
  ws['!cols'] = keys.map((key) => ({
    wch: Math.max(key.length, ...data.map((row) => String(row[key] ?? '').length)) + 2,
  }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, filename.slice(0, 31));
  XLSX.writeFile(wb, `${filename}.xlsx`);
};

// ─── Data fetcher per report type ───────────────────────────────────────────

const fetchReportData = async (tipo: string): Promise<Record<string, unknown>[]> => {
  switch (tipo) {
    case 'Pacientes': {
      const res = await patientService.getPatients();
      const patients = Array.isArray(res) ? res : ((res as any).content ?? []);
      return (patients as any[]).map((p) => ({
        ID: p.id,
        Nombre: `${p.firstName ?? ''} ${p.lastName ?? ''}`.trim(),
        Documento: `${p.documentType ?? ''} ${p.documentNumber ?? ''}`.trim(),
        Estado: p.status ?? '',
        EPS: p.epsNombre ?? '',
        Diagnóstico: p.diagnosticoPrincipal ?? '',
        Programa: p.programa ?? '',
        Ingreso: p.fechaIngreso ?? '',
      }));
    }
    case 'Seguimientos': {
      const res = await seguimientoService.listar({ page: 0, size: 100 });
      const items = Array.isArray(res) ? res : ((res as any).content ?? []);
      return (items as any[]).map((s) => ({
        ID: s.id,
        Paciente: s.patientName ?? '',
        Fecha: s.fechaProgramada ?? '',
        Tipo: s.tipoContacto ?? '',
        Resultado: s.estado ?? '',
        Educadora: s.educadora ?? '',
        Descripción: s.descripcion ?? '',
      }));
    }
    case 'Entregas': {
      const res = await entregaService.getAll(0, 100);
      const items = Array.isArray(res) ? res : ((res as any).content ?? []);
      return (items as any[]).map((e) => ({
        ID: e.id,
        Paciente: e.patientName ?? '',
        Medicamento: e.medicamento ?? '',
        Cantidad: e.cantidad ?? '',
        FechaEntrega: e.fechaEntrega ?? e.fechaProgramada ?? '',
        Estado: e.estado ?? '',
        Operador: e.operadorLogistico ?? '',
      }));
    }
    case 'Aplicaciones': {
      const res = await aplicacionService.getAll(0, 100);
      const items = Array.isArray(res) ? res : ((res as any).content ?? []);
      return (items as any[]).map((a) => ({
        ID: a.id,
        Paciente: a.patientName ?? '',
        Medicamento: a.medicamento ?? '',
        Dosis: a.dosis ?? '',
        Fecha: a.fechaAplicacion ?? a.fechaProgramada ?? '',
        Vía: a.viaAdministracion ?? '',
        Enfermera: a.enfermera ?? '',
        Resultado: a.resultado ?? '',
      }));
    }
    case 'Barreras': {
      const res = await barrierService.listar();
      const items = Array.isArray(res) ? res : ((res as any).content ?? []);
      return (items as any[]).map((b) => ({
        ID: b.id,
        Paciente: b.patientName ?? '',
        Tipo: b.category ?? '',
        Descripción: b.description ?? '',
        Estado: b.status ?? '',
        Prioridad: b.prioridad ?? '',
        Fecha: b.openedAt ?? '',
      }));
    }
    case 'Paraclínicos': {
      const res = await paraclinicoService.listar();
      const items = Array.isArray(res) ? res : ((res as any).content ?? []);
      return (items as any[]).map((p) => ({
        ID: p.id,
        Paciente: p.patientName ?? '',
        Examen: p.tipoParaclinicoNombre ?? '',
        Resultado: p.valorResultado ?? p.valorTexto ?? '',
        Estado: p.estado ?? '',
        Fecha: p.fechaRealizacion ?? p.fechaSolicitud ?? '',
        Interpretación: p.interpretacion ?? '',
      }));
    }
    case 'Prescripciones': {
      const res = await prescripcionService.getAll(0, 100);
      const items = Array.isArray(res) ? res : ((res as any).content ?? []);
      return (items as any[]).map((p) => ({
        ID: p.id,
        Paciente: p.pacienteNombre ?? '',
        Medicamento: p.medicamento ?? '',
        Dosis: p.dosis ?? '',
        Frecuencia: p.frecuencia ?? '',
        FechaInicio: p.fechaInicio ?? '',
        FechaFin: p.fechaFin ?? '',
        Estado: p.estado ?? '',
        Médico: p.medico ?? '',
      }));
    }
    case 'Transportes': {
      const res = await transporteService.getAll(0, 100);
      const items = Array.isArray(res) ? res : ((res as any).content ?? []);
      return (items as any[]).map((t) => ({
        ID: t.id,
        Paciente: t.pacienteNombre ?? '',
        Origen: t.direccionOrigen ?? '',
        Destino: t.nombreIpsDestino ?? '',
        FechaCita: t.fechaServicio ?? '',
        TipoServicio: t.tipoServicio ?? '',
        Estado: t.estado ?? '',
        Gestora: t.gestoraSolicitante ?? '',
      }));
    }
    case 'Inventarios': {
      const res = await inventarioService.getInventario();
      const items = Array.isArray(res) ? res : ((res as any).content ?? []);
      return (items as any[]).map((i) => ({
        Código: i.codigo ?? '',
        Medicamento: i.nombre ?? '',
        Categoría: i.categoria ?? '',
        StockActual: i.stockActual ?? 0,
        StockMínimo: i.stockMinimo ?? 0,
        Unidad: i.unidad ?? '',
        Vencimiento: i.vencimiento ?? '',
        Estado: i.estado ?? '',
      }));
    }
    case 'Servicios Especiales': {
      const res = await servicioComplementarioService.listar();
      const items = Array.isArray(res) ? res : ((res as any).content ?? []);
      return (items as any[]).map((s) => ({
        ID: s.id,
        Paciente: s.patientName ?? '',
        Tipo: s.tipoServicio ?? '',
        Profesional: s.profesionalAtiende ?? '',
        FechaProgramada: s.fechaServicio ?? s.fechaSolicitud ?? '',
        Estado: s.estadoServicio ?? '',
      }));
    }
    default:
      return [];
  }
};

const tipoReportes = ['Pacientes', 'Seguimientos', 'Entregas', 'Aplicaciones', 'Barreras', 'Paraclínicos', 'Prescripciones', 'Transportes', 'Inventarios', 'Servicios Especiales'];
const estadoOptions = ['Todos', 'Activo', 'Inactivo', 'Pendiente', 'Completado'];

const MES_LABELS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

const ReportesPage = () => {
  const theme = useTheme();
  const [tipoReporte, setTipoReporte] = useState('Pacientes');
  const [estadoFiltro, setEstadoFiltro] = useState('Todos');
  const [fechaDesde, setFechaDesde] = useState('2026-01-01');
  const [fechaHasta, setFechaHasta] = useState('2026-03-31');
  const [datosReporte, setDatosReporte] = useState<Record<string, unknown>[]>([]);
  const [loadingReporte, setLoadingReporte] = useState(false);

  const loadData = useCallback(async (tipo: string) => {
    setLoadingReporte(true);
    try {
      const data = await fetchReportData(tipo);
      setDatosReporte(data);
    } catch (err) {
      console.error('Error fetching report data:', err);
      toast.error('Error al cargar datos del reporte');
      setDatosReporte([]);
    } finally {
      setLoadingReporte(false);
    }
  }, []);

  useEffect(() => {
    loadData(tipoReporte);
  }, [tipoReporte, loadData]);

  const columnas = datosReporte.length > 0 ? Object.keys(datosReporte[0]) : [];

  // Build chart data from real records (group by month using Fecha/FechaEntrega/Ingreso column)
  const chartData = React.useMemo(() => {
    const dateFieldCandidates = ['Fecha', 'FechaEntrega', 'Ingreso', 'FechaCita', 'FechaInicio'];
    const dateField = columnas.find((c) => dateFieldCandidates.includes(c));
    if (!dateField || datosReporte.length === 0) return [];
    const grouped: Record<string, number> = {};
    datosReporte.forEach((row) => {
      const raw = String(row[dateField] ?? '');
      if (!raw || raw === 'undefined') return;
      const d = new Date(raw);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      grouped[key] = (grouped[key] ?? 0) + 1;
    });
    return Object.entries(grouped)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([key, count]) => ({
        mes: MES_LABELS[parseInt(key.split('-')[1], 10) - 1],
        registros: count,
      }));
  }, [datosReporte, columnas]);

  const kpis = [
    {label: 'Total Registros', value: datosReporte.length, color: '#0E7490', bg: '#E0F2FE'},
    {
      label: '% Adherencia',
      value: (() => {
        if (tipoReporte === 'Seguimientos' && datosReporte.length > 0) {
          const efectivos = datosReporte.filter((r) => String(r.Resultado).includes('EFECTIV')).length;
          return `${Math.round((efectivos / datosReporte.length) * 100)}%`;
        }
        if (datosReporte.length === 0) return '—';
        return 'N/A';
      })(),
      color: '#166534', bg: '#DCFCE7',
    },
    {
      label: 'Pacientes Activos',
      value: tipoReporte === 'Pacientes'
        ? datosReporte.filter((r) => String(r.Estado).toUpperCase() === 'ACTIVO').length
        : datosReporte.length,
      color: '#7C3AED', bg: '#EDE9FE',
    },
    {
      label: 'Período',
      value: `${fechaDesde} → ${fechaHasta}`,
      color: '#D97706',
      bg: '#FEF3C7',
      isText: true,
    },
  ];

  return (
    <Box sx={{ p: 3, backgroundColor: '#F7F8FA', minHeight: '100vh' }}>
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
          <Assessment sx={{ color: '#0E7490', fontSize: 32 }} />
          <Typography variant="h5" fontWeight={700} color="text.primary">
            Reportes
          </Typography>
        </Box>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        <Card
          sx={{
            backgroundColor: '#FFFFFF',
            border: '1px solid #E5E7EB',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            mb: 3,
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <Box
              sx={{
                display: 'flex',
                gap: 2,
                flexWrap: 'wrap',
                alignItems: 'flex-end',
              }}
            >
              {/* Fecha Desde */}
              <TextField
                label="Desde"
                type="date"
                size="small"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 150, backgroundColor: '#FFFFFF' }}
              />

              {/* Fecha Hasta */}
              <TextField
                label="Hasta"
                type="date"
                size="small"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                InputLabelProps={{ shrink: true }}
                sx={{ minWidth: 150, backgroundColor: '#FFFFFF' }}
              />

              {/* Tipo de reporte */}
              <FormControl size="small" sx={{ minWidth: 180 }}>
                <InputLabel>Tipo de Reporte</InputLabel>
                <Select
                  value={tipoReporte}
                  label="Tipo de Reporte"
                  onChange={(e) => setTipoReporte(e.target.value)}
                >
                  {tipoReportes.map((t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Estado */}
              <FormControl size="small" sx={{ minWidth: 140 }}>
                <InputLabel>Estado</InputLabel>
                <Select
                  value={estadoFiltro}
                  label="Estado"
                  onChange={(e) => setEstadoFiltro(e.target.value)}
                >
                  {estadoOptions.map((o) => (
                    <MenuItem key={o} value={o}>
                      {o}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Botón Filtrar */}
              <Button
                variant="outlined"
                startIcon={<FilterList />}
                sx={{
                  borderRadius: '8px',
                  textTransform: 'none',
                  borderColor: '#0E7490',
                  color: '#0E7490',
                }}
                onClick={() => loadData(tipoReporte)}
              >
                Aplicar Filtros
              </Button>

              <Box sx={{ flex: 1 }} />

              {/* Descargar CSV */}
              <Button
                variant="contained"
                startIcon={<Download />}
                sx={{
                  backgroundColor: '#0E7490',
                  '&:hover': { backgroundColor: '#0c6680' },
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 600,
                }}
                onClick={() => {
                  downloadCSV(datosReporte, `reporte_${tipoReporte.toLowerCase()}.csv`);
                  toast.success('CSV descargado');
                }}
              >
                Descargar CSV
              </Button>

              {/* Descargar Excel */}
              <Button
                variant="contained"
                startIcon={<TableChart />}
                sx={{
                  backgroundColor: '#166534',
                  '&:hover': { backgroundColor: '#14532D' },
                  borderRadius: '8px',
                  textTransform: 'none',
                  fontWeight: 600,
                }}
                onClick={() => {
                  downloadExcel(datosReporte, `reporte_${tipoReporte.toLowerCase()}`);
                  toast.success('Excel descargado');
                }}
              >
                Descargar Excel
              </Button>
            </Box>
          </CardContent>
        </Card>
      </motion.div>

      {/* KPI Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
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
              >
                <CardContent sx={{ p: 2 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={500}>
                    {kpi.label}
                  </Typography>
                  <Typography
                    variant={kpi.isText ? 'body2' : 'h5'}
                    fontWeight={700}
                    sx={{ color: kpi.color, mt: 0.5 }}
                  >
                    {kpi.value}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </motion.div>

      {/* Chart + Table row */}
      <Grid container spacing={3}>
        {/* Mini BarChart */}
        <Grid item xs={12} md={5}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <Card
              sx={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} mb={2}>
                  Tendencia del Período
                </Typography>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={chartData.length > 0 ? chartData : [{ mes: '—', registros: 0 }]}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                    <XAxis
                      dataKey="mes"
                      tick={{ fontSize: 12, fill: '#6B7280' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: '#6B7280' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <RechartsTooltip
                      contentStyle={{
                        borderRadius: '8px',
                        border: '1px solid #E5E7EB',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '12px' }}
                    />
                    <Bar
                      dataKey="registros"
                      name="Registros"
                      fill="#0E7490"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="adherencia"
                      name="% Adherencia"
                      fill="#A7F3D0"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        {/* Table */}
        <Grid item xs={12} md={7}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
          >
            <Card
              sx={{
                backgroundColor: '#FFFFFF',
                border: '1px solid #E5E7EB',
                borderRadius: '12px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
              }}
            >
              <CardContent sx={{ p: 2 }}>
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 2,
                  }}
                >
                  <Typography variant="subtitle1" fontWeight={700}>
                    Resultados — {tipoReporte}
                  </Typography>
                  <Chip
                    label={`${datosReporte.length} registros`}
                    size="small"
                    sx={{
                      backgroundColor: '#E0F2FE',
                      color: '#0E7490',
                      fontWeight: 700,
                    }}
                  />
                </Box>
                {loadingReporte ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 200 }}>
                    <CircularProgress sx={{ color: '#0E7490' }} />
                  </Box>
                ) : (
                <TableContainer sx={{ maxHeight: 280 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        {columnas.map((col) => (
                          <TableCell
                            key={col}
                            sx={{
                              fontWeight: 700,
                              fontSize: '0.72rem',
                              color: '#6B7280',
                              textTransform: 'uppercase',
                              letterSpacing: '0.04em',
                              backgroundColor: '#F9FAFB',
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {col}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {datosReporte.map((row, ri) => (
                        <TableRow
                          key={ri}
                          sx={{ '&:hover': { backgroundColor: '#F9FAFB' } }}
                        >
                          {columnas.map((col) => (
                            <TableCell
                              key={col}
                              sx={{
                                fontSize: '0.8rem',
                                whiteSpace: 'nowrap',
                                color:
                                  String(row[col]).toLowerCase().includes('crític') ||
                                  String(row[col]).toLowerCase().includes('devuelto')
                                    ? '#DC2626'
                                    : undefined,
                              }}
                            >
                              {String(row[col])}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ReportesPage;
