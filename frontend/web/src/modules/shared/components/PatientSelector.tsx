import { useState, useEffect, useCallback } from 'react';
import {
  Autocomplete,
  TextField,
  CircularProgress,
  Typography,
  Box,
} from '@mui/material';
import { Person } from '@mui/icons-material';
import { patientService } from '@services/patient.service';
import type { Patient } from '@/types';

interface PatientSelectorProps {
  value: number | null;
  onChange: (patientId: number | null, patient: Patient | null) => void;
  label?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
  size?: 'small' | 'medium';
}

export const PatientSelector = ({
  value,
  onChange,
  label = 'Paciente',
  required = false,
  error,
  disabled = false,
  size = 'small',
}: PatientSelectorProps) => {
  const [options, setOptions] = useState<Patient[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const searchPatients = useCallback(async (search: string) => {
    setLoading(true);
    try {
      const result = await patientService.getPatients({ search, size: 20 });
      setOptions(result.content || []);
    } catch {
      setOptions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load initial options and resolve value
  useEffect(() => {
    searchPatients('');
  }, [searchPatients]);

  // Resolve current value to patient object
  useEffect(() => {
    if (value && !selectedPatient) {
      const found = options.find((p) => p.id === value);
      if (found) setSelectedPatient(found);
    }
    if (!value) setSelectedPatient(null);
  }, [value, options, selectedPatient]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue.length >= 2 || inputValue === '') {
        searchPatients(inputValue);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue, searchPatients]);

  return (
    <Autocomplete
      options={options}
      loading={loading}
      disabled={disabled}
      value={selectedPatient}
      inputValue={inputValue}
      onInputChange={(_, newValue) => setInputValue(newValue)}
      onChange={(_, newPatient) => {
        setSelectedPatient(newPatient);
        onChange(newPatient?.id ?? null, newPatient);
      }}
      getOptionLabel={(option) =>
        `${option.nombreCompleto || `${option.nombre} ${option.apellido}`} — ${option.documentoIdentidad}`
      }
      isOptionEqualToValue={(option, val) => option.id === val.id}
      renderOption={(props, option) => (
        <Box component="li" {...props} key={option.id}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Person sx={{ fontSize: 18, color: '#6B7280' }} />
            <Box>
              <Typography variant="body2" fontWeight={600}>
                {option.nombreCompleto || `${option.nombre} ${option.apellido}`}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {option.documentoIdentidad} · {option.ciudad || ''}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          required={required}
          error={!!error}
          helperText={error}
          size={size}
          placeholder="Buscar por nombre o documento..."
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={16} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      noOptionsText="No se encontraron pacientes"
      loadingText="Buscando..."
    />
  );
};

export default PatientSelector;
