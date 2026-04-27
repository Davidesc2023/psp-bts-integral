import React, { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Box,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Upload,
  Download,
  Close,
  CheckCircle,
  Error as ErrorIcon,
  Warning,
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import { supabase } from '@/services/supabaseClient';
import { getCurrentTenantId } from '@/utils/getCurrentTenant';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ImportColumn {
  /** Header as it appears in the xlsx template */
  key: string;
  /** Human-readable label */
  label: string;
  /** If true, row is invalid when this cell is empty */
  required?: boolean;
  /** Maps xlsx header key to supabase column name (default: same as key) */
  dbColumn?: string;
}

export interface ImportRowError {
  row: number;
  column?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface ImportExcelButtonProps {
  /** Human label for the entity (e.g. "Pacientes") */
  entityLabel: string;
  /** Supabase table name */
  tableName: string;
  /** Column schema for validation and template generation */
  schema: ImportColumn[];
  /** Called after a successful import with the number of rows inserted */
  onImportComplete?: (count: number) => void;
  /** Optional row transformer before insertion */
  transformRow?: (row: Record<string, unknown>) => Record<string, unknown>;
  /** Button variant */
  variant?: 'contained' | 'outlined' | 'text';
  /** Disable import (show only template download) */
  exportOnly?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function parseXlsxToRows(
  file: File
): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const wb = XLSX.read(data, { type: 'array' });
        const wsName = wb.SheetNames[0];
        const ws = wb.Sheets[wsName];
        const jsonRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
          defval: '',
        });
        const headers =
          jsonRows.length > 0 ? Object.keys(jsonRows[0]) : [];
        resolve({ headers, rows: jsonRows });
      } catch (err) {
        reject(new Error('No se pudo leer el archivo. Verifique que sea un xlsx válido.'));
      }
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo.'));
    reader.readAsArrayBuffer(file);
  });
}

function validateRows(
  rows: Record<string, unknown>[],
  schema: ImportColumn[]
): ImportRowError[] {
  const errors: ImportRowError[] = [];
  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // +2 because row 1 is header in xlsx
    schema.forEach((col) => {
      const val = row[col.key];
      if (col.required && (val === '' || val === null || val === undefined)) {
        errors.push({
          row: rowNum,
          column: col.label,
          message: `El campo "${col.label}" es requerido.`,
          severity: 'error',
        });
      }
    });
  });
  return errors;
}

function generateTemplate(schema: ImportColumn[], entityLabel: string) {
  const headers = schema.map((c) => c.key);
  const ws = XLSX.utils.aoa_to_sheet([headers]);
  // Column widths
  ws['!cols'] = headers.map((h) => ({ wch: Math.max(h.length, 18) }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, entityLabel.slice(0, 31));
  XLSX.writeFile(wb, `plantilla_${entityLabel.toLowerCase().replace(/\s+/g, '_')}.xlsx`);
}

// ─── Component ───────────────────────────────────────────────────────────────

export const ImportExcelButton: React.FC<ImportExcelButtonProps> = ({
  entityLabel,
  tableName,
  schema,
  onImportComplete,
  transformRow,
  variant = 'outlined',
  exportOnly = false,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [step, setStep] = useState<'idle' | 'validating' | 'preview' | 'importing' | 'done'>('idle');
  const [parsedRows, setParsedRows] = useState<Record<string, unknown>[]>([]);
  const [rowErrors, setRowErrors] = useState<ImportRowError[]>([]);
  const [progress, setProgress] = useState(0);
  const [importedCount, setImportedCount] = useState(0);
  const [fileName, setFileName] = useState('');

  const criticalErrors = rowErrors.filter((e) => e.severity === 'error');
  const warnings = rowErrors.filter((e) => e.severity === 'warning');

  const handleOpenFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Solo se aceptan archivos .xlsx o .xls');
      return;
    }
    setFileName(file.name);
    setStep('validating');
    setDialogOpen(true);
    // Reset input so same file can be re-selected
    e.target.value = '';

    try {
      const { rows } = await parseXlsxToRows(file);
      const errors = validateRows(rows, schema);
      setParsedRows(rows);
      setRowErrors(errors);
      setStep('preview');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error al procesar el archivo');
      setDialogOpen(false);
      setStep('idle');
    }
  };

  const handleImport = async () => {
    if (criticalErrors.length > 0) return;
    setStep('importing');
    setProgress(0);

    try {
      const tenantId = await getCurrentTenantId();

      // Create import_jobs record
      const { data: job } = await supabase
        .from('import_jobs')
        .insert({
          tenant_id: tenantId,
          tabla: tableName,
          estado: 'PROCESANDO',
          total_filas: parsedRows.length,
        })
        .select('id')
        .single();

      const jobId: string | undefined = job?.id;
      let okCount = 0;
      const jobErrors: { row: number; message: string }[] = [];

      // Insert in batches of 50
      const BATCH = 50;
      for (let i = 0; i < parsedRows.length; i += BATCH) {
        const batch = parsedRows.slice(i, i + BATCH).map((row) => {
          // Map xlsx keys → db columns
          const mapped: Record<string, unknown> = { tenant_id: tenantId };
          schema.forEach((col) => {
            const dbCol = col.dbColumn ?? col.key;
            const val = row[col.key];
            mapped[dbCol] = val === '' ? null : val;
          });
          return transformRow ? transformRow(mapped) : mapped;
        });

        const { error } = await supabase.from(tableName).insert(batch);
        if (error) {
          batch.forEach((_, bIdx) => {
            jobErrors.push({
              row: i + bIdx + 2,
              message: error.message,
            });
          });
        } else {
          okCount += batch.length;
        }
        setProgress(Math.round(((i + BATCH) / parsedRows.length) * 100));
      }

      // Update import_jobs record
      if (jobId) {
        await supabase
          .from('import_jobs')
          .update({
            estado: jobErrors.length === 0 ? 'COMPLETADO' : 'ERROR',
            filas_ok: okCount,
            filas_error: jobErrors.length,
            errores: jobErrors,
            completed_at: new Date().toISOString(),
          })
          .eq('id', jobId);
      }

      setImportedCount(okCount);
      setStep('done');
      onImportComplete?.(okCount);
      if (okCount > 0) {
        toast.success(`${okCount} registro(s) importados correctamente`);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error durante la importación');
      setStep('preview');
    }
  };

  const handleClose = () => {
    setDialogOpen(false);
    setStep('idle');
    setParsedRows([]);
    setRowErrors([]);
    setProgress(0);
    setImportedCount(0);
  };

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      {/* Buttons row */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Template download */}
        <Tooltip title={`Descargar plantilla vacía de ${entityLabel}`} arrow>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Download />}
            onClick={() => generateTemplate(schema, entityLabel)}
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              borderColor: '#6B7280',
              color: '#6B7280',
              '&:hover': { borderColor: '#374151', color: '#374151' },
            }}
          >
            Plantilla
          </Button>
        </Tooltip>

        {/* Import button */}
        {!exportOnly && (
          <Tooltip title={`Importar ${entityLabel} desde Excel`} arrow>
            <Button
              size="small"
              variant={variant}
              startIcon={<Upload />}
              onClick={handleOpenFilePicker}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                borderColor: '#0E7490',
                color: variant === 'contained' ? '#fff' : '#0E7490',
                backgroundColor: variant === 'contained' ? '#0E7490' : undefined,
                '&:hover': {
                  backgroundColor: variant === 'contained' ? '#0c6680' : '#E0F2FE',
                },
              }}
            >
              Importar Excel
            </Button>
          </Tooltip>
        )}
      </Box>

      {/* Import dialog */}
      <Dialog
        open={dialogOpen}
        onClose={step === 'importing' ? undefined : handleClose}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography fontWeight={700}>
            {step === 'done'
              ? `Importación completada — ${entityLabel}`
              : `Importar ${entityLabel}`}
          </Typography>
          {step !== 'importing' && (
            <IconButton onClick={handleClose} size="small">
              <Close />
            </IconButton>
          )}
        </DialogTitle>

        <DialogContent dividers>
          {/* Validating */}
          {step === 'validating' && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography mb={2} color="text.secondary">Analizando archivo...</Typography>
              <LinearProgress />
            </Box>
          )}

          {/* Preview / errors */}
          {step === 'preview' && (
            <Box>
              <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  Archivo: <strong>{fileName}</strong>
                </Typography>
                <Chip label={`${parsedRows.length} filas`} size="small" color="primary" />
                {criticalErrors.length > 0 && (
                  <Chip
                    icon={<ErrorIcon />}
                    label={`${criticalErrors.length} errores críticos`}
                    size="small"
                    color="error"
                  />
                )}
                {warnings.length > 0 && (
                  <Chip
                    icon={<Warning />}
                    label={`${warnings.length} advertencias`}
                    size="small"
                    color="warning"
                  />
                )}
                {rowErrors.length === 0 && (
                  <Chip
                    icon={<CheckCircle />}
                    label="Sin errores"
                    size="small"
                    color="success"
                  />
                )}
              </Box>

              {criticalErrors.length > 0 && (
                <Alert severity="error" sx={{ mb: 2 }}>
                  Se encontraron <strong>{criticalErrors.length} errores críticos</strong>. 
                  Corrija el archivo antes de importar.
                </Alert>
              )}

              {rowErrors.length > 0 && (
                <TableContainer
                  component={Paper}
                  variant="outlined"
                  sx={{ maxHeight: 280, mb: 2 }}
                >
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700, width: 70 }}>Fila</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: 130 }}>Campo</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Mensaje</TableCell>
                        <TableCell sx={{ fontWeight: 700, width: 100 }}>Tipo</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {rowErrors.map((err, i) => (
                        <TableRow key={i}>
                          <TableCell>{err.row}</TableCell>
                          <TableCell>{err.column ?? '—'}</TableCell>
                          <TableCell sx={{ fontSize: '0.8rem' }}>{err.message}</TableCell>
                          <TableCell>
                            <Chip
                              label={err.severity === 'error' ? 'Error' : 'Aviso'}
                              color={err.severity === 'error' ? 'error' : 'warning'}
                              size="small"
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}

              {/* Preview first 5 rows */}
              {parsedRows.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" mb={1} display="block">
                    Vista previa (primeras {Math.min(parsedRows.length, 5)} filas):
                  </Typography>
                  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 200 }}>
                    <Table size="small" stickyHeader>
                      <TableHead>
                        <TableRow>
                          {Object.keys(parsedRows[0]).map((col) => (
                            <TableCell
                              key={col}
                              sx={{
                                fontWeight: 700,
                                fontSize: '0.72rem',
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
                        {parsedRows.slice(0, 5).map((row, ri) => (
                          <TableRow key={ri}>
                            {Object.values(row).map((val, ci) => (
                              <TableCell key={ci} sx={{ fontSize: '0.78rem', whiteSpace: 'nowrap' }}>
                                {String(val ?? '')}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                </Box>
              )}
            </Box>
          )}

          {/* Importing progress */}
          {step === 'importing' && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography mb={2} fontWeight={600}>
                Importando {parsedRows.length} registros...
              </Typography>
              <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 4 }} />
              <Typography mt={1} variant="caption" color="text.secondary">
                {progress}%
              </Typography>
            </Box>
          )}

          {/* Done */}
          {step === 'done' && (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <CheckCircle sx={{ fontSize: 56, color: '#16A34A', mb: 1 }} />
              <Typography variant="h6" fontWeight={700} mb={1}>
                {importedCount} registro(s) importados
              </Typography>
              <Typography color="text.secondary">
                La importación de <strong>{entityLabel}</strong> se completó exitosamente.
              </Typography>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          {step === 'preview' && (
            <>
              <Button
                onClick={handleClose}
                variant="outlined"
                sx={{ borderRadius: '8px', textTransform: 'none' }}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleImport}
                variant="contained"
                disabled={criticalErrors.length > 0}
                sx={{
                  borderRadius: '8px',
                  textTransform: 'none',
                  backgroundColor: '#0E7490',
                  '&:hover': { backgroundColor: '#0c6680' },
                }}
              >
                {criticalErrors.length > 0
                  ? 'Corrija los errores para continuar'
                  : `Importar ${parsedRows.length} registros`}
              </Button>
            </>
          )}
          {step === 'done' && (
            <Button
              onClick={handleClose}
              variant="contained"
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                backgroundColor: '#0E7490',
                '&:hover': { backgroundColor: '#0c6680' },
              }}
            >
              Cerrar
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ImportExcelButton;
