import React, { useRef, useState } from 'react';
import { Button, CircularProgress } from '@mui/material';
import { CloudUpload } from '@mui/icons-material';
import toast from 'react-hot-toast';
import { bulkUpload, CatalogName } from '../services/adminCatalog.service';

interface BulkUploadButtonProps {
  catalog: CatalogName;
  onSuccess?: () => void;
}

export const BulkUploadButton: React.FC<BulkUploadButtonProps> = ({ catalog, onSuccess }) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    inputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset input so same file can be selected again
    e.target.value = '';

    setLoading(true);
    try {
      const result = await bulkUpload(catalog, file);
      toast.success(
        `Carga masiva exitosa: ${result.creados} creados, ${result.actualizados} actualizados, ${result.errores} errores`
      );
      onSuccess?.();
    } catch {
      // Error toast is handled by the global apiClient interceptor
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".csv,.xlsx"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />
      <Button
        variant="outlined"
        startIcon={loading ? <CircularProgress size={16} /> : <CloudUpload />}
        onClick={handleClick}
        disabled={loading}
        sx={{ textTransform: 'none' }}
      >
        Carga Masiva
      </Button>
    </>
  );
};
