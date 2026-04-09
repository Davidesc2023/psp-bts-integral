import { useState, useEffect } from 'react';
import {
  Paper,
  Grid,
  TextField,
  Select,
  MenuItem,
  Button,
  FormControl,
  InputLabel,
  Box,
  Collapse,
  IconButton,
  Typography,
  useTheme,
} from '@mui/material';
import {
  FilterList,
  ExpandMore,
  ExpandLess,
  Clear as ClearIcon,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { catalogService } from '@services/catalog.service';

interface FilterValues {
  search: string;
  departamento_id?: number;
  ciudad_id?: number;
  eps_id?: number;
  estado?: string;
}

interface PacienteFiltersProps {
  onFilterChange: (filters: FilterValues) => void;
  initialValues?: FilterValues;
}

export const PacienteFilters = ({ onFilterChange, initialValues }: PacienteFiltersProps) => {
  const [expanded, setExpanded] = useState(false);
  const theme = useTheme();
  const [filters, setFilters] = useState<FilterValues>(initialValues || {
    search: '',
    departamento_id: undefined,
    ciudad_id: undefined,
    eps_id: undefined,
    estado: undefined,
  });

  // Cargar catálogos
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: catalogService.getDepartments,
  });

  const { data: cities = [] } = useQuery({
    queryKey: ['cities', filters.departamento_id],
    queryFn: () => 
      filters.departamento_id 
        ? catalogService.getCitiesByDepartment(filters.departamento_id)
        : catalogService.getAllCities(),
    enabled: !!filters.departamento_id,
  });

  const { data: epsList = [] } = useQuery({
    queryKey: ['eps'],
    queryFn: catalogService.getEPSList,
  });

  // Reset ciudad cuando cambia departamento
  useEffect(() => {
    if (filters.departamento_id) {
      setFilters(prev => ({ ...prev, ciudad_id: undefined }));
    }
  }, [filters.departamento_id]);

  const handleFilterChange = (field: keyof FilterValues, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSearch = () => {
    onFilterChange(filters);
  };

  const handleClear = () => {
    const clearedFilters: FilterValues = {
      search: '',
      departamento_id: undefined,
      ciudad_id: undefined,
      eps_id: undefined,
      estado: undefined,
    };
    setFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  return (
    <Paper 
      sx={{ 
        p: 2, 
        mb: 3, 
        bgcolor: '#ffffff', 
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)' 
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: expanded ? 2 : 0 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FilterList sx={{ color: 'text.secondary' }} />
          <Typography variant="h6" color="text.primary">
            Filtros
          </Typography>
        </Box>
        <IconButton onClick={() => setExpanded(!expanded)} size="small">
          {expanded ? <ExpandLess /> : <ExpandMore />}
        </IconButton>
      </Box>

      {/* Búsqueda rápida (siempre visible) */}
      <TextField
        fullWidth
        placeholder="Buscar por nombre o documento..."
        value={filters.search}
        onChange={(e) => handleFilterChange('search', e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
        sx={{
          mb: expanded ? 2 : 0,
          '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: theme.palette.primary.main,
          },
        }}
      />

      {/* Filtros avanzados (colapsables) */}
      <Collapse in={expanded}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Departamento</InputLabel>
              <Select
                value={filters.departamento_id || ''}
                onChange={(e) => handleFilterChange('departamento_id', e.target.value || undefined)}
                label="Departamento"
              >
                <MenuItem value="">Todos</MenuItem>
                {departments.map((dep) => (
                  <MenuItem key={dep.id} value={dep.id}>
                    {dep.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small" disabled={!filters.departamento_id}>
              <InputLabel>Ciudad</InputLabel>
              <Select
                value={filters.ciudad_id || ''}
                onChange={(e) => handleFilterChange('ciudad_id', e.target.value || undefined)}
                label="Ciudad"
              >
                <MenuItem value="">Todas</MenuItem>
                {cities.map((city) => (
                  <MenuItem key={city.id} value={city.id}>
                    {city.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>EPS</InputLabel>
              <Select
                value={filters.eps_id || ''}
                onChange={(e) => handleFilterChange('eps_id', e.target.value || undefined)}
                label="EPS"
              >
                <MenuItem value="">Todas</MenuItem>
                {epsList.map((eps) => (
                  <MenuItem key={eps.id} value={eps.id}>
                    {eps.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Estado</InputLabel>
              <Select
                value={filters.estado || ''}
                onChange={(e) => handleFilterChange('estado', e.target.value || undefined)}
                label="Estado"
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="EN_PROCESO">En Proceso</MenuItem>
                <MenuItem value="ACTIVO">Activo</MenuItem>
                <MenuItem value="SUSPENDIDO">Suspendido</MenuItem>
                <MenuItem value="DROP_OUT">Drop Out</MenuItem>
                <MenuItem value="RETIRADO">Retirado</MenuItem>
              </Select>
            </FormControl>
          </Grid>
        </Grid>

        {/* Botones de acción */}
        <Box sx={{ display: 'flex', gap: 2, mt: 2, justifyContent: 'flex-end' }}>
          <Button
            variant="outlined"
            startIcon={<ClearIcon />}
            onClick={handleClear}
            sx={{ color: 'text.secondary', borderColor: 'divider' }}
          >
            Limpiar
          </Button>
          <Button
            variant="contained"
            onClick={handleSearch}
            sx={{
              bgcolor: theme.palette.primary.main,
              '&:hover': { bgcolor: theme.palette.primary.dark },
            }}
          >
            Buscar
          </Button>
        </Box>
      </Collapse>
    </Paper>
  );
};

