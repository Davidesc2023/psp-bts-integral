import React from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  Box,
  CircularProgress,
  Typography,
} from '@mui/material';
import { Edit, ToggleOn, ToggleOff } from '@mui/icons-material';

export interface ColumnDef<T> {
  key: keyof T | string;
  label: string;
  render?: (row: T) => React.ReactNode;
  width?: string | number;
}

interface CatalogTableProps<T extends { id: number | string; activo?: boolean; enabled?: boolean }> {
  columns: ColumnDef<T>[];
  rows: T[];
  loading?: boolean;
  totalElements?: number;
  page?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  onEdit?: (row: T) => void;
  onToggleStatus?: (row: T) => void;
}

export function CatalogTable<T extends { id: number | string; activo?: boolean; enabled?: boolean }>({
  columns,
  rows,
  loading = false,
  totalElements = 0,
  page = 0,
  pageSize = 20,
  onPageChange,
  onPageSizeChange,
  onEdit,
  onToggleStatus,
}: CatalogTableProps<T>) {
  const isActive = (row: T) =>
    row.activo !== undefined ? row.activo : (row.enabled ?? true);

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#F9FAFB' }}>
              {columns.map((col) => (
                <TableCell
                  key={String(col.key)}
                  sx={{ fontWeight: 700, color: '#374151', fontSize: '13px', width: col.width }}
                >
                  {col.label}
                </TableCell>
              ))}
              {(onEdit || onToggleStatus) && (
                <TableCell sx={{ fontWeight: 700, color: '#374151', fontSize: '13px', width: 100 }}>
                  Acciones
                </TableCell>
              )}
            </TableRow>
          </TableHead>

          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 6 }}>
                  <CircularProgress size={32} />
                </TableCell>
              </TableRow>
            ) : rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length + 1} align="center" sx={{ py: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    Sin registros
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow
                  key={String(row.id)}
                  hover
                  sx={{ '&:last-child td': { borderBottom: 0 } }}
                >
                  {columns.map((col) => (
                    <TableCell key={String(col.key)} sx={{ fontSize: '13px' }}>
                      {col.key === 'activo' || col.key === 'enabled' ? (
                        <Chip
                          label={isActive(row) ? 'Activo' : 'Inactivo'}
                          size="small"
                          sx={{
                            backgroundColor: isActive(row) ? '#D1FAE5' : '#FEE2E2',
                            color: isActive(row) ? '#065F46' : '#991B1B',
                            fontWeight: 600,
                            fontSize: '11px',
                          }}
                        />
                      ) : col.render ? (
                        col.render(row)
                      ) : (
                        String((row as any)[col.key] ?? '')
                      )}
                    </TableCell>
                  ))}

                  {(onEdit || onToggleStatus) && (
                    <TableCell>
                      <Box sx={{ display: 'flex', gap: 0.5 }}>
                        {onEdit && (
                          <Tooltip title="Editar">
                            <IconButton size="small" onClick={() => onEdit(row)} color="primary">
                              <Edit fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        )}
                        {onToggleStatus && (
                          <Tooltip title={isActive(row) ? 'Desactivar' : 'Activar'}>
                            <IconButton
                              size="small"
                              onClick={() => onToggleStatus(row)}
                              sx={{ color: isActive(row) ? '#10B981' : '#EF4444' }}
                            >
                              {isActive(row) ? (
                                <ToggleOn fontSize="small" />
                              ) : (
                                <ToggleOff fontSize="small" />
                              )}
                            </IconButton>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {onPageChange && (
        <TablePagination
          component="div"
          count={totalElements}
          page={page}
          rowsPerPage={pageSize}
          rowsPerPageOptions={[10, 20, 50]}
          onPageChange={(_, p) => onPageChange(p)}
          onRowsPerPageChange={(e) => onPageSizeChange?.(parseInt(e.target.value, 10))}
          labelRowsPerPage="Filas:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      )}
    </Paper>
  );
}
