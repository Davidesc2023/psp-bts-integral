/**
 * Configuración de la aplicación PSP
 */

export const config = {
  // API Configuration
  // baseUrl vacío = usa el proxy de Vite en dev; en producción, VITE_API_BASE_URL debe apuntar al API Gateway
  api: {
    baseUrl: import.meta.env.VITE_API_BASE_URL || '',
    timeout: 30000,
  },

  // Auth Configuration
  auth: {
    tokenKey: 'psp_access_token',
    refreshTokenKey: 'psp_refresh_token',
    tokenExpiryKey: 'psp_token_expiry',
  },

  // App Configuration
  app: {
    name: 'PSP - Seguimiento a Pacientes',
    version: '1.0.0',
    environment: import.meta.env.MODE,
  },

  // Pagination
  pagination: {
    defaultPageSize: 20,
    pageSizeOptions: [10, 20, 50, 100],
  },

  // Feature Flags
  features: {
    enableNotifications: true,
    enableDarkMode: true,
    enableOfflineMode: false,
  },
} as const;
