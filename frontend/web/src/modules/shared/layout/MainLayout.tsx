import { Outlet } from 'react-router-dom';
import { Box } from '@mui/material';
import { Sidebar } from './Sidebar';

/**
 * Layout principal de la aplicación
 * Sidebar vertical (BTS Integral) + contenido
 */
export const MainLayout = () => {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar vertical */}
      <Sidebar />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: '#F7F8FA',
          overflow: 'auto',
          width: '100%',
          p: 3,
        }}
      >
        <Outlet />
      </Box>
    </Box>
  );
};
