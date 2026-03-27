import { useState, useEffect } from 'react';
import {
  Box,
  Tabs,
  Tab,
  Paper,
  Typography,
  Stack,
  Grid,
  Button,
  Divider,
  Chip,
  useTheme,
  alpha,
  Alert,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import { Edit, Check, Close } from '@mui/icons-material';
import {
  Schedule,
  LocalShipping,
  Vaccines,
  Block,
  Description,
  GppGood,
  Receipt,
  Inventory2,
  DirectionsBus,
  Biotech,
  MedicalServices,
} from '@mui/icons-material';
import { supabase } from '@services/supabaseClient';
import { Patient } from '@/types';

const formatDate = (dateStr: string) => {
  try {
    return new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(dateStr));
  } catch { return 'N/A'; }
};

interface PacienteTabsProps {
  patient: Patient;
  onEdit?: () => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel = ({ children, value, index }: TabPanelProps) => {
  return (
    <div role="tabpanel" hidden={value !== index}>
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
};

export const PacienteTabs = ({ patient, onEdit }: PacienteTabsProps) => {
  const [tab, setTab] = useState(0);
  const [seguimientos, setSeguimientos] = useState<any[]>([]);
  const [prescripciones, setPrescripciones] = useState<any[]>([]);
  const [entregas, setEntregas] = useState<any[]>([]);
  const [aplicaciones, setAplicaciones] = useState<any[]>([]);
  const [barreras, setBarreras] = useState<any[]>([]);
  const [consentimientos, setConsentimientos] = useState<any[]>([]);
  const [facturacion, setFacturacion] = useState<any[]>([]);
  const [inventario, setInventario] = useState<any[]>([]);
  const [transportes, setTransportes] = useState<any[]>([]);
  const [paraclinicos, setParaclinicos] = useState<any[]>([]);
  const [serviciosEspeciales, setServiciosEspeciales] = useState<any[]>([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const theme = useTheme();

  useEffect(() => {
    const loadModuleData = async () => {
      if (!patient?.id) return;
      setLoadingModules(true);
      try {
        const results = await Promise.allSettled([
          supabase.from('seguimientos').select('*').eq('patient_id', patient.id).then(r => r.data ?? []),
          supabase.from('prescripciones').select('*').eq('paciente_id', patient.id).then(r => r.data ?? []),
          supabase.from('entregas').select('*').eq('paciente_id', patient.id).then(r => r.data ?? []),
          supabase.from('aplicaciones').select('*').eq('paciente_id', patient.id).then(r => r.data ?? []),
          supabase.from('barreras').select('*').eq('paciente_id', patient.id).then(r => r.data ?? []),
          supabase.from('consentimientos').select('*').eq('paciente_id', patient.id).then(r => r.data ?? []),
          supabase.from('facturacion').select('*').eq('paciente_id', patient.id).then(r => r.data ?? []),
          supabase.from('inventario_paciente').select('*').eq('paciente_id', patient.id).then(r => r.data ?? []),
          supabase.from('transportes').select('*').eq('paciente_id', patient.id).then(r => r.data ?? []),
          supabase.from('paraclinicos').select('*').eq('paciente_id', patient.id).then(r => r.data ?? []),
          supabase.from('servicios_complementarios').select('*').eq('paciente_id', patient.id).then(r => r.data ?? []),
        ]);
        if (results[0].status === 'fulfilled') setSeguimientos(results[0].value);
        if (results[1].status === 'fulfilled') setPrescripciones(results[1].value);
        if (results[2].status === 'fulfilled') setEntregas(results[2].value);
        if (results[3].status === 'fulfilled') setAplicaciones(results[3].value);
        if (results[4].status === 'fulfilled') setBarreras(results[4].value);
        if (results[5].status === 'fulfilled') setConsentimientos(results[5].value);
        if (results[6].status === 'fulfilled') setFacturacion(results[6].value);
        if (results[7].status === 'fulfilled') setInventario(results[7].value);
        if (results[8].status === 'fulfilled') setTransportes(results[8].value);
        if (results[9].status === 'fulfilled') setParaclinicos(results[9].value);
        if (results[10].status === 'fulfilled') setServiciosEspeciales(results[10].value);
      } catch {
        // silent — individual modules might fail
      } finally {
        setLoadingModules(false);
      }
    };
    loadModuleData();
  }, [patient?.id]);

  const handleChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTab(newValue);
  };

  return (
    <Box>
      {/* Tabs Navigation */}
      <Tabs 
        value={tab} 
        onChange={handleChange}
        sx={{
          borderBottom: '1px solid #e5e7eb',
          '& .MuiTab-root': {
            textTransform: 'none',
            fontWeight: 500,
            fontSize: '1rem',
            color: '#6b7280',
            '&.Mui-selected': {
              color: theme.palette.primary.main,
            },
          },
          '& .MuiTabs-indicator': {
            backgroundColor: theme.palette.primary.main,
          },
        }}
      >
        <Tab label="Información General" />
        <Tab label={`Seguimientos (${seguimientos.length})`} icon={<Schedule sx={{ fontSize: 18 }} />} iconPosition="start" />
        <Tab label={`Prescripciones (${prescripciones.length})`} icon={<Description sx={{ fontSize: 18 }} />} iconPosition="start" />
        <Tab label={`Entregas (${entregas.length})`} icon={<LocalShipping sx={{ fontSize: 18 }} />} iconPosition="start" />
        <Tab label={`Aplicaciones (${aplicaciones.length})`} icon={<Vaccines sx={{ fontSize: 18 }} />} iconPosition="start" />
        <Tab label={`Barreras (${barreras.length})`} icon={<Block sx={{ fontSize: 18 }} />} iconPosition="start" />
        <Tab label={`Consentimientos (${consentimientos.length})`} icon={<GppGood sx={{ fontSize: 18 }} />} iconPosition="start" />
        <Tab label={`Facturación (${facturacion.length})`} icon={<Receipt sx={{ fontSize: 18 }} />} iconPosition="start" />
        <Tab label={`Inventario (${inventario.length})`} icon={<Inventory2 sx={{ fontSize: 18 }} />} iconPosition="start" />
        <Tab label={`Transportes (${transportes.length})`} icon={<DirectionsBus sx={{ fontSize: 18 }} />} iconPosition="start" />
        <Tab label={`Paraclínicos (${paraclinicos.length})`} icon={<Biotech sx={{ fontSize: 18 }} />} iconPosition="start" />
        <Tab label={`Servicios (${serviciosEspeciales.length})`} icon={<MedicalServices sx={{ fontSize: 18 }} />} iconPosition="start" />
      </Tabs>

      {/* Tab 1: Información General */}
      <TabPanel value={tab} index={0}>
        <Grid container spacing={3}>
          {/* Datos Personales */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ bgcolor: '#ffffff', p: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" color="#111827" sx={{ fontWeight: 600 }}>
                  Datos Personales
                </Typography>
                {onEdit && (
                  <Button
                    size="small"
                    startIcon={<Edit />}
                    onClick={onEdit}
                    sx={{ color: theme.palette.primary.main }}
                  >
                    Editar
                  </Button>
                )}
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">Código de Tipificación</Typography>
                  <Typography variant="body1" color="text.primary" sx={{ fontWeight: 600, color: '#0E7490' }}>
                    {patient.codigoTipificacion || 'Pendiente'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Documento</Typography>
                  <Typography variant="body1" color="text.primary" sx={{ fontWeight: 500 }}>
                    {patient.documentoIdentidad}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Fecha de Nacimiento</Typography>
                  <Typography variant="body1" color="text.primary" sx={{ fontWeight: 500 }}>
                    {patient.fechaNacimiento ? formatDate(patient.fechaNacimiento) : 'N/A'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Edad</Typography>
                  <Typography variant="body1" color="text.primary" sx={{ fontWeight: 500 }}>
                    {patient.edad} años
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Género</Typography>
                  <Typography variant="body1" color="text.primary" sx={{ fontWeight: 500 }}>
                    {patient.genero}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Teléfono</Typography>
                  <Typography variant="body1" color="text.primary" sx={{ fontWeight: 500 }}>
                    {patient.telefono || 'N/A'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Email</Typography>
                  <Typography variant="body1" color="text.primary" sx={{ fontWeight: 500 }}>
                    {patient.email || 'N/A'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Dirección</Typography>
                  <Typography variant="body1" color="text.primary" sx={{ fontWeight: 500 }}>
                    {patient.direccion || 'N/A'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Ubicación</Typography>
                  <Typography variant="body1" color="text.primary" sx={{ fontWeight: 500 }}>
                    {patient.ciudad && patient.departamento 
                      ? `${patient.ciudad}, ${patient.departamento}`
                      : patient.ciudad || patient.departamento || 'N/A'
                    }
                  </Typography>
                </Box>
              </Stack>
            </Paper>
          </Grid>

          {/* Información Clínica */}
          <Grid item xs={12} md={6}>
            <Paper sx={{ bgcolor: '#ffffff', p: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', mb: 3 }}>
              <Typography variant="h6" color="#111827" sx={{ fontWeight: 600, mb: 2 }}>
                Información Clínica
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={2}>
                <Box>
                  <Typography variant="caption" color="text.secondary">EPS</Typography>
                  <Typography variant="body1" color="text.primary" sx={{ fontWeight: 500 }}>
                    {(patient as any).eps?.nombre || 'N/A'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">IPS</Typography>
                  <Typography variant="body1" color="text.primary" sx={{ fontWeight: 500 }}>
                    {(patient as any).ips?.nombre || 'N/A'}
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Estado</Typography>
                  <Box sx={{ mt: 0.5 }}>
                    <Chip
                      label={(patient as any).estado || 'ACTIVO'}
                      size="small"
                      sx={{
                        bgcolor: alpha(theme.palette.primary.main, 0.1),
                        color: theme.palette.primary.dark,
                        fontWeight: 600,
                      }}
                    />
                  </Box>
                </Box>
                <Box>
                  <Typography variant="caption" color="text.secondary">Consentimiento Informado</Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    {patient.consentimientoFirmado ? (
                      <>
                        <Check sx={{ color: theme.palette.primary.main, fontSize: 20 }} />
                        <Typography variant="body1" color={theme.palette.primary.main} sx={{ fontWeight: 500 }}>
                          Firmado
                        </Typography>
                      </>
                    ) : (
                      <>
                        <Close sx={{ color: '#ef4444', fontSize: 20 }} />
                        <Typography variant="body1" color="#ef4444" sx={{ fontWeight: 500 }}>
                          Pendiente
                        </Typography>
                      </>
                    )}
                  </Box>
                </Box>
              </Stack>
            </Paper>

            {/* Contacto de Emergencia */}
            {patient.contactoEmergencia && (
              <Paper sx={{ bgcolor: '#ffffff', p: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <Typography variant="h6" color="#111827" sx={{ fontWeight: 600, mb: 2 }}>
                  Contacto de Emergencia
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Nombre</Typography>
                    <Typography variant="body1" color="text.primary" sx={{ fontWeight: 500 }}>
                      {patient.contactoEmergencia.nombre}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Parentesco</Typography>
                    <Typography variant="body1" color="text.primary" sx={{ fontWeight: 500 }}>
                      {patient.contactoEmergencia.parentesco}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">Teléfono</Typography>
                    <Typography variant="body1" color="text.primary" sx={{ fontWeight: 500 }}>
                      {patient.contactoEmergencia.telefono}
                    </Typography>
                  </Box>
                </Stack>
              </Paper>
            )}
          </Grid>
        </Grid>
      </TabPanel>

      {/* Tab 2: Seguimientos */}
      <TabPanel value={tab} index={1}>
        {loadingModules ? <LinearProgress /> : seguimientos.length === 0 ? (
          <Alert severity="info">No hay seguimientos registrados para este paciente</Alert>
        ) : (
          <Grid container spacing={2}>
            {seguimientos.map((seg: any, i: number) => (
              <Grid item xs={12} md={6} key={seg.id || i}>
                <Paper sx={{ p: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle2" fontWeight={700}>{seg.titulo || seg.tipoSeguimiento || 'Seguimiento'}</Typography>
                    <Chip label={seg.estado || 'PROGRAMADO'} size="small" color={seg.estado === 'EFECTIVO' ? 'success' : seg.estado === 'NO_EFECTIVO' ? 'warning' : 'info'} />
                  </Stack>
                  {seg.motivoSeguimiento && <Typography variant="body2" color="text.secondary" mb={0.5}>{seg.motivoSeguimiento}</Typography>}
                  <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {seg.prioridad && <Chip label={seg.prioridad} size="small" variant="outlined" />}
                    {seg.tipoContacto && <Chip label={seg.tipoContacto} size="small" variant="outlined" />}
                  </Stack>
                  {seg.fechaProgramada && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      \uD83D\uDCC5 {new Date(seg.fechaProgramada).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                    </Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* Tab 3: Prescripciones */}
      <TabPanel value={tab} index={2}>
        {loadingModules ? <LinearProgress /> : prescripciones.length === 0 ? (
          <Alert severity="info">No hay prescripciones registradas para este paciente</Alert>
        ) : (
          <Grid container spacing={2}>
            {prescripciones.map((presc: any, i: number) => (
              <Grid item xs={12} md={6} key={presc.id || i}>
                <Paper sx={{ p: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <Typography variant="subtitle2" fontWeight={700}>{presc.medicamento || presc.descripcion || 'Prescripción'}</Typography>
                  <Typography variant="body2" color="text.secondary">{presc.dosis || ''} {presc.frecuencia || ''}</Typography>
                  {presc.estado && <Chip label={presc.estado} size="small" sx={{ mt: 1 }} color={presc.estado === 'ACTIVA' ? 'success' : 'default'} />}
                  {presc.fechaPrescripcion && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      Prescrita: {new Date(presc.fechaPrescripcion).toLocaleDateString('es-CO')}
                    </Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* Tab 4: Entregas */}
      <TabPanel value={tab} index={3}>
        {loadingModules ? <LinearProgress /> : entregas.length === 0 ? (
          <Alert severity="info">No hay entregas registradas para este paciente</Alert>
        ) : (
          <Grid container spacing={2}>
            {entregas.map((ent: any, i: number) => (
              <Grid item xs={12} md={6} key={ent.id || i}>
                <Paper sx={{ p: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle2" fontWeight={700}>{ent.tipo || 'Entrega'}</Typography>
                    <Chip label={ent.estado || 'PROGRAMADA'} size="small" color={ent.estado === 'ENTREGADA' ? 'success' : ent.estado === 'EN_TRANSITO' ? 'warning' : 'info'} />
                  </Stack>
                  {ent.cantidadEntregada && <Typography variant="body2">Cantidad: {ent.cantidadEntregada}</Typography>}
                  {ent.nombreReceptor && <Typography variant="body2" color="text.secondary">Receptor: {ent.nombreReceptor}</Typography>}
                  {ent.fechaProgramada && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      \uD83D\uDCC5 {new Date(ent.fechaProgramada).toLocaleDateString('es-CO')}
                    </Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* Tab 5: Aplicaciones */}
      <TabPanel value={tab} index={4}>
        {loadingModules ? <LinearProgress /> : aplicaciones.length === 0 ? (
          <Alert severity="info">No hay aplicaciones registradas para este paciente</Alert>
        ) : (
          <Grid container spacing={2}>
            {aplicaciones.map((app: any, i: number) => (
              <Grid item xs={12} md={6} key={app.id || i}>
                <Paper sx={{ p: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle2" fontWeight={700}>{app.tipo || 'Aplicación'}</Typography>
                    <Chip label={app.estado || 'PROGRAMADA'} size="small" color={app.estado === 'APLICADA' ? 'success' : app.estado === 'NO_APLICADA' ? 'error' : 'info'} />
                  </Stack>
                  {app.dosisAplicada && <Typography variant="body2">Dosis: {app.dosisAplicada}</Typography>}
                  {app.fechaProgramada && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      \uD83D\uDCC5 {new Date(app.fechaProgramada).toLocaleDateString('es-CO')}
                    </Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* Tab 6: Barreras */}
      <TabPanel value={tab} index={5}>
        {loadingModules ? <LinearProgress /> : barreras.length === 0 ? (
          <Alert severity="info">No hay barreras registradas para este paciente</Alert>
        ) : (
          <Grid container spacing={2}>
            {barreras.map((bar: any, i: number) => (
              <Grid item xs={12} md={6} key={bar.id || i}>
                <Paper sx={{ p: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle2" fontWeight={700}>{bar.tipoBarrera || bar.tipo || 'Barrera'}</Typography>
                    <Chip label={bar.estado || 'ACTIVA'} size="small" color={bar.estado === 'RESUELTA' ? 'success' : 'error'} />
                  </Stack>
                  {bar.subBarrera && <Typography variant="body2">{bar.subBarrera}</Typography>}
                  {bar.descripcion && <Typography variant="body2" color="text.secondary">{bar.descripcion}</Typography>}
                  {bar.fechaIdentificacion && (
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                      Identificada: {new Date(bar.fechaIdentificacion).toLocaleDateString('es-CO')}
                    </Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* Tab 7: Consentimientos */}
      <TabPanel value={tab} index={6}>
        {loadingModules ? <LinearProgress /> : consentimientos.length === 0 ? (
          <Alert severity="info">No hay consentimientos registrados para este paciente</Alert>
        ) : (
          <Grid container spacing={2}>
            {consentimientos.map((con: any, i: number) => (
              <Grid item xs={12} md={6} key={con.id || i}>
                <Paper sx={{ p: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography variant="subtitle2" fontWeight={700}>Consentimiento</Typography>
                      <Stack direction="row" spacing={0.5}>
                        <Chip label={con.consentimientoPsp ? 'PSP ✓' : 'PSP ✗'} size="small" color={con.consentimientoPsp ? 'success' : 'default'} />
                        <Chip label={con.consentimientoTratamiento ? 'Trat. ✓' : 'Trat. ✗'} size="small" color={con.consentimientoTratamiento ? 'success' : 'default'} />
                      </Stack>
                    </Stack>
                    {con.archivoDocumento && <Typography variant="body2" color="primary">📎 Documento adjunto</Typography>}
                    {con.fechaCarga && (
                      <Typography variant="caption" color="text.secondary">
                        Cargado: {new Date(con.fechaCarga).toLocaleDateString('es-CO')}
                      </Typography>
                    )}
                  </Stack>
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* Tab 8: Facturación */}
      <TabPanel value={tab} index={7}>
        {loadingModules ? <LinearProgress /> : facturacion.length === 0 ? (
          <Alert severity="info">No hay registros de facturación para este paciente</Alert>
        ) : (
          <Grid container spacing={2}>
            {facturacion.map((fac: any, i: number) => (
              <Grid item xs={12} md={6} key={fac.id || i}>
                <Paper sx={{ p: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle2" fontWeight={700}>{fac.tipoConcepto || 'Factura'}</Typography>
                    <Chip label={fac.estadoFactura || fac.estado || 'PENDIENTE'} size="small" color={fac.estadoFactura === 'PAGADA' ? 'success' : fac.estadoFactura === 'FACTURADA' ? 'info' : 'warning'} />
                  </Stack>
                  {fac.valor && <Typography variant="body2" fontWeight={600}>$ {Number(fac.valor).toLocaleString('es-CO')}</Typography>}
                  {fac.fechaServicio && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Servicio: {new Date(fac.fechaServicio).toLocaleDateString('es-CO')}
                    </Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* Tab 9: Inventario */}
      <TabPanel value={tab} index={8}>
        {loadingModules ? <LinearProgress /> : inventario.length === 0 ? (
          <Alert severity="info">No hay registros de inventario para este paciente</Alert>
        ) : (
          <Grid container spacing={2}>
            {inventario.map((inv: any, i: number) => (
              <Grid item xs={12} md={6} key={inv.id || i}>
                <Paper sx={{ p: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle2" fontWeight={700}>{inv.nombreMedicamento || inv.medicamento || 'Medicamento'}</Typography>
                    <Chip label={inv.estado || 'DISPONIBLE'} size="small" color={inv.estado === 'CRITICO' ? 'error' : inv.estado === 'AGOTADO' ? 'error' : 'success'} />
                  </Stack>
                  <Typography variant="body2">Disponible: {inv.cantidadDisponible ?? 0} | Entregado: {inv.cantidadEntregada ?? 0}</Typography>
                  {inv.lote && <Typography variant="caption" color="text.secondary">Lote: {inv.lote}</Typography>}
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* Tab 10: Transportes */}
      <TabPanel value={tab} index={9}>
        {loadingModules ? <LinearProgress /> : transportes.length === 0 ? (
          <Alert severity="info">No hay solicitudes de transporte para este paciente</Alert>
        ) : (
          <Grid container spacing={2}>
            {transportes.map((tr: any, i: number) => (
              <Grid item xs={12} md={6} key={tr.id || i}>
                <Paper sx={{ p: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle2" fontWeight={700}>{tr.tipoTrayecto || 'Transporte'}</Typography>
                    <Chip label={tr.estado || 'PENDIENTE'} size="small" color={tr.estado === 'EFECTIVO' ? 'success' : tr.estado === 'CANCELADO' ? 'error' : 'warning'} />
                  </Stack>
                  {tr.origen && <Typography variant="body2">📍 {tr.origen} → {tr.destino}</Typography>}
                  {tr.fechaSolicitud && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Solicitado: {new Date(tr.fechaSolicitud).toLocaleDateString('es-CO')}
                    </Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* Tab 11: Paraclínicos */}
      <TabPanel value={tab} index={10}>
        {loadingModules ? <LinearProgress /> : paraclinicos.length === 0 ? (
          <Alert severity="info">No hay paraclínicos registrados para este paciente</Alert>
        ) : (
          <Grid container spacing={2}>
            {paraclinicos.map((par: any, i: number) => (
              <Grid item xs={12} md={6} key={par.id || i}>
                <Paper sx={{ p: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle2" fontWeight={700}>{par.tipoExamen || par.tipo || 'Paraclínico'}</Typography>
                    <Chip label={par.estadoResultado || par.estado || 'PENDIENTE'} size="small" color={par.estadoResultado === 'NORMAL' ? 'success' : par.estadoResultado === 'ANORMAL' ? 'error' : 'info'} />
                  </Stack>
                  {par.resultado && <Typography variant="body2">Resultado: {par.resultado}</Typography>}
                  {par.fechaExamen && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Examen: {new Date(par.fechaExamen).toLocaleDateString('es-CO')}
                    </Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>

      {/* Tab 12: Servicios Especiales */}
      <TabPanel value={tab} index={11}>
        {loadingModules ? <LinearProgress /> : serviciosEspeciales.length === 0 ? (
          <Alert severity="info">No hay servicios complementarios para este paciente</Alert>
        ) : (
          <Grid container spacing={2}>
            {serviciosEspeciales.map((svc: any, i: number) => (
              <Grid item xs={12} md={6} key={svc.id || i}>
                <Paper sx={{ p: 2, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle2" fontWeight={700}>{svc.tipoServicio || svc.servicio || 'Servicio'}</Typography>
                    <Chip label={svc.estadoServicio || svc.estado || 'SOLICITADO'} size="small" color={svc.estadoServicio === 'COMPLETADO' ? 'success' : svc.estadoServicio === 'CANCELADO' ? 'error' : 'warning'} />
                  </Stack>
                  {svc.profesional && <Typography variant="body2">Profesional: {svc.profesional}</Typography>}
                  {svc.fechaSolicitud && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      Solicitado: {new Date(svc.fechaSolicitud).toLocaleDateString('es-CO')}
                    </Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>
        )}
      </TabPanel>
    </Box>
  );
};

