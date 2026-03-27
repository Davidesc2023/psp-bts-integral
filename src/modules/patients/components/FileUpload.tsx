import { useState, useRef } from 'react';
import {
  Box,
  Typography,
  Paper,
  IconButton,
  Alert,
} from '@mui/material';
import {
  CloudUpload,
  DeleteOutline,
  InsertDriveFile,
} from '@mui/icons-material';

interface FileUploadProps {
  value: File | null;
  onChange: (file: File | null) => void;
  error?: string;
  disabled?: boolean;
}

/**
 * Componente de carga de archivos PDF
 * Soporta drag & drop y click to upload
 * Máximo 120MB
 */
const FileUpload = ({ value, onChange, error, disabled }: FileUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const MAX_FILE_SIZE = 120 * 1024 * 1024; // 120MB

  const validateFile = (file: File): boolean => {
    setLocalError('');

    // Validar tipo PDF
    if (file.type !== 'application/pdf') {
      setLocalError('Solo se permiten archivos PDF');
      return false;
    }

    // Validar tamaño
    if (file.size > MAX_FILE_SIZE) {
      setLocalError('El archivo no debe superar los 120MB');
      return false;
    }

    return true;
  };

  const handleFileChange = (file: File | null) => {
    if (!file) {
      onChange(null);
      return;
    }

    if (validateFile(file)) {
      onChange(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileChange(files[0]);
    }
  };

  const handleClick = () => {
    if (!disabled) {
      fileInputRef.current?.click();
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileChange(files[0]);
    }
  };

  const handleRemove = () => {
    onChange(null);
    setLocalError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const displayError = error || localError;

  return (
    <Box>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf"
        onChange={handleInputChange}
        style={{ display: 'none' }}
        disabled={disabled}
      />

      {!value ? (
        <Paper
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          sx={{
            p: 4,
            textAlign: 'center',
            cursor: disabled ? 'not-allowed' : 'pointer',
            border: '2px dashed',
            borderColor: isDragging
              ? 'primary.main'
              : displayError
              ? 'error.main'
              : 'grey.300',
            bgcolor: isDragging
              ? 'action.hover'
              : disabled
              ? 'action.disabledBackground'
              : 'background.paper',
            transition: 'all 0.2s ease',
            '&:hover': disabled
              ? {}
              : {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover',
                },
          }}
        >
          <CloudUpload
            sx={{
              fontSize: 48,
              color: displayError ? 'error.main' : 'primary.main',
              mb: 2,
            }}
          />
          <Typography variant="h6" gutterBottom>
            {isDragging
              ? 'Suelta el archivo aquí'
              : 'Arrastra un archivo PDF o haz clic para seleccionar'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Máximo 120MB
          </Typography>
        </Paper>
      ) : (
        <Paper
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            border: '1px solid',
            borderColor: 'grey.300',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <InsertDriveFile color="error" sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="body1" fontWeight="medium">
                {value.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {(value.size / 1024).toFixed(2)} KB
              </Typography>
            </Box>
          </Box>
          <IconButton
            onClick={(e) => {
              e.stopPropagation();
              handleRemove();
            }}
            color="error"
            disabled={disabled}
          >
            <DeleteOutline />
          </IconButton>
        </Paper>
      )}

      {displayError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {displayError}
        </Alert>
      )}
    </Box>
  );
};

export default FileUpload;
