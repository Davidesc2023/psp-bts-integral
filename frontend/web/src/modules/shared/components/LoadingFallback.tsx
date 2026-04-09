import { Box, CircularProgress } from '@mui/material';

/**
 * Componente de carga para lazy loading
 */
export const LoadingFallback = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '400px',
      }}
    >
      <CircularProgress />
    </Box>
  );
};
