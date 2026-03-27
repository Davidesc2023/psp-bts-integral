import React from 'react';
import {
  Box,
  TextField,
  MenuItem,
  Button,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
  Chip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  FilterList as FilterListIcon,
  Clear as ClearIcon,
} from '@mui/icons-material';

export interface FilterValues {
  fechaInicio: string;
  fechaFin: string;
  educadora: string;
  estadoPaciente: string;
  diagnostico: string;
  eps: string;
  departamento: string;
  tratamiento: string;
  tipoBarrera: string;
}

interface FilterPanelProps {
  filters: FilterValues;
  onChange: (field: keyof FilterValues, value: string) => void;
  onApply: () => void;
  onClear: () => void;
  activeFiltersCount: number;
}

const ESTADOS_PACIENTE = [
  { value: '', label: 'Todos' },
  { value: 'ACTIVO', label: 'Activo' },
  { value: 'EN_PROCESO', label: 'En Proceso' },
  { value: 'SUSPENDIDO', label: 'Suspendido' },
  { value: 'DROP_OUT', label: 'Drop Out' },
  { value: 'INACTIVO', label: 'Inactivo' },
  { value: 'FALLECIDO', label: 'Fallecido' },
];

const TIPOS_BARRERA = [
  { value: '', label: 'Todas' },
  { value: 'ECONOMICA', label: 'Económica' },
  { value: 'GEOGRAFICA', label: 'Geográfica' },
  { value: 'SOCIAL', label: 'Social' },
  { value: 'EDUCATIVA', label: 'Educativa' },
  { value: 'CLINICA', label: 'Clínica' },
  { value: 'DEL_SISTEMA', label: 'Del Sistema' },
  { value: 'MOTIVACIONAL', label: 'Motivacional' },
  { value: 'CULTURAL', label: 'Cultural' },
];

export const FilterPanel: React.FC<FilterPanelProps> = ({
  filters,
  onChange,
  onApply,
  onClear,
  activeFiltersCount,
}) => {
  const [expanded, setExpanded] = React.useState(false);

  return (
    <Accordion
      expanded={expanded}
      onChange={(_, isExpanded) => setExpanded(isExpanded)}
      sx={{
        mb: 3,
        borderRadius: '12px !important',
        boxShadow: '0 4px 20px rgba(79, 70, 229, 0.08)',
        '&:before': {
          display: 'none',
        },
        border: '1px solid rgba(79, 70, 229, 0.12)',
      }}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        sx={{
          borderRadius: '12px',
          '&:hover': {
            bgcolor: 'rgba(79, 70, 229, 0.04)',
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
          <FilterListIcon sx={{ color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Filtros Avanzados
          </Typography>
          {activeFiltersCount > 0 && (
            <Chip
              label={`${activeFiltersCount} activos`}
              size="small"
              color="primary"
              sx={{ ml: 'auto', mr: 2 }}
            />
          )}
        </Box>
      </AccordionSummary>

      <AccordionDetails sx={{ p: 3 }}>
        <Grid container spacing={2.5}>
          {/* Fila 1: Rango de Fechas */}
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Fecha Inicio"
              type="date"
              value={filters.fechaInicio}
              onChange={(e) => onChange('fechaInicio', e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              label="Fecha Fin"
              type="date"
              value={filters.fechaFin}
              onChange={(e) => onChange('fechaFin', e.target.value)}
              InputLabelProps={{ shrink: true }}
              size="small"
            />
          </Grid>

          {/* Fila 2: Educadora, Estado, Diagnostico */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              select
              label="Educadora"
              value={filters.educadora}
              onChange={(e) => onChange('educadora', e.target.value)}
              size="small"
            >
              <MenuItem value="">Todas</MenuItem>
              <MenuItem value="EDU001">Ana García</MenuItem>
              <MenuItem value="EDU002">María López</MenuItem>
              <MenuItem value="EDU003">Carmen Rodríguez</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              select
              label="Estado Paciente"
              value={filters.estadoPaciente}
              onChange={(e) => onChange('estadoPaciente', e.target.value)}
              size="small"
            >
              {ESTADOS_PACIENTE.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              select
              label="Diagnóstico (CIE-10)"
              value={filters.diagnostico}
              onChange={(e) => onChange('diagnostico', e.target.value)}
              size="small"
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="C50">C50 - Cáncer de mama</MenuItem>
              <MenuItem value="C61">C61 - Cáncer de próstata</MenuItem>
              <MenuItem value="E11">E11 - Diabetes tipo 2</MenuItem>
              <MenuItem value="I10">I10 - Hipertensión</MenuItem>
            </TextField>
          </Grid>

          {/* Fila 3: EPS, Departamento, Tratamiento */}
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              select
              label="EPS"
              value={filters.eps}
              onChange={(e) => onChange('eps', e.target.value)}
              size="small"
            >
              <MenuItem value="">Todas</MenuItem>
              <MenuItem value="1">Sura</MenuItem>
              <MenuItem value="2">Sanitas</MenuItem>
              <MenuItem value="3">Nueva EPS</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              select
              label="Departamento"
              value={filters.departamento}
              onChange={(e) => onChange('departamento', e.target.value)}
              size="small"
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="11">Bogotá D.C.</MenuItem>
              <MenuItem value="5">Antioquia</MenuItem>
              <MenuItem value="76">Valle del Cauca</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              select
              label="Tipo de Barrera"
              value={filters.tipoBarrera}
              onChange={(e) => onChange('tipoBarrera', e.target.value)}
              size="small"
            >
              {TIPOS_BARRERA.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          </Grid>

          {/* Botones de Acción */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
              <Button
                variant="outlined"
                onClick={onClear}
                startIcon={<ClearIcon />}
                disabled={activeFiltersCount === 0}
              >
                Limpiar Filtros
              </Button>
              <Button
                variant="contained"
                onClick={onApply}
                sx={{
                  background: 'linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)',
                  '&:hover': {
                    background: 'linear-gradient(135deg, #4338CA 0%, #0891B2 100%)',
                  },
                }}
              >
                Aplicar Filtros
              </Button>
            </Box>
          </Grid>
        </Grid>
      </AccordionDetails>
    </Accordion>
  );
};
