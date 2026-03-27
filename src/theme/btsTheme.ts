import { createTheme } from '@mui/material/styles';

/**
 * BTS - INTEGRAL | Tema Sypher
 * Diseño limpio, moderno y profesional
 * Basado en sistema de diseño Sypher
 */
const btsTheme = createTheme({
  palette: {
    primary: {
      main: '#4F46E5',        // Indigo moderno (principal)
      light: '#818CF8',
      dark: '#4338CA',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#06B6D4',        // Cyan vibrante (acentos)
      light: '#67E8F9',
      dark: '#0891B2',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#EF4444',
      light: '#FCA5A5',
      dark: '#DC2626',
    },
    warning: {
      main: '#F59E0B',
      light: '#FCD34D',
      dark: '#D97706',
    },
    success: {
      main: '#10B981',        // Green moderno
      light: '#6EE7B7',
      dark: '#059669',
    },
    info: {
      main: '#3b82f6',
      light: '#93c5fd',
      dark: '#2563eb',
    },
    background: {
      default: '#f7f8fa',     // Fondo general Sypher
      paper: '#ffffff',       // Fondo de cards/paper
    },
    text: {
      primary: '#111827',     // Texto principal Sypher
      secondary: '#6b7280',   // Texto secundario Sypher
      disabled: '#9ca3af',
    },
    divider: '#e5e7eb',
    grey: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
  },
  
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700,
      lineHeight: 1.2,
      color: '#111827',
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 600,
      lineHeight: 1.3,
      color: '#111827',
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#111827',
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600,
      lineHeight: 1.4,
      color: '#111827',
      textAlign: 'center',
      marginBottom: '8px',
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600,
      lineHeight: 1.5,
      color: '#111827',
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.6,
      color: '#6B7280',
      textAlign: 'center',
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 500,
      lineHeight: 1.75,
      color: '#6B7280',
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 500,
      lineHeight: 1.57,
      color: '#6B7280',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
      color: '#111827',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.43,
      color: '#6B7280',
    },
    button: {
      fontSize: '0.875rem',
      fontWeight: 600,
      textTransform: 'none',
      letterSpacing: '0.5px',
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.66,
      color: '#9CA3AF',
    },
    overline: {
      fontSize: '0.75rem',
      fontWeight: 600,
      lineHeight: 2.66,
      textTransform: 'uppercase',
      letterSpacing: '1px',
    },
  },
  
  shape: {
    borderRadius: 12,
  },
  
  spacing: 8,
  
  shadows: [
    'none',
    '0 1px 2px rgba(0,0,0,0.05)',
    '0 1px 3px rgba(0,0,0,0.08)',
    '0 2px 4px rgba(0,0,0,0.08)',
    '0 4px 6px rgba(0,0,0,0.08)',
    '0 4px 8px rgba(0,0,0,0.10)',
    '0 6px 12px rgba(0,0,0,0.12)',
    '0 8px 16px rgba(0,0,0,0.14)',
    '0 10px 20px rgba(0,0,0,0.16)',
    '0 12px 24px rgba(0,0,0,0.18)',
    '0 16px 32px rgba(0,0,0,0.20)',
    '0 2px 8px rgba(0,0,0,0.08)',
    '0 4px 12px rgba(0,0,0,0.10)',
    '0 6px 16px rgba(0,0,0,0.12)',
    '0 8px 20px rgba(0,0,0,0.14)',
    '0 10px 24px rgba(0,0,0,0.16)',
    '0 12px 28px rgba(0,0,0,0.18)',
    '0 16px 32px rgba(0,0,0,0.20)',
    '0 20px 40px rgba(0,0,0,0.22)',
    '0 24px 48px rgba(0,0,0,0.24)',
    '0 2px 4px rgba(0,0,0,0.06)',
    '0 2px 8px rgba(0,0,0,0.08)',
    '0 4px 12px rgba(0,0,0,0.10)',
    '0 6px 16px rgba(0,0,0,0.12)',
    '0 8px 20px rgba(0,0,0,0.14)',
  ],
  
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#f7f8fa',
          scrollbarWidth: 'thin',
          scrollbarColor: '#d1d5db #f3f4f6',
        },
        '#root': {
          width: '100%',
          maxWidth: '1400px',
          margin: '0 auto',
        },
      },
    },
    
    MuiContainer: {
      styleOverrides: {
        root: {
          paddingLeft: '24px',
          paddingRight: '24px',
          '@media (max-width:1024px)': {
            paddingLeft: '16px',
            paddingRight: '16px',
          },
          '@media (max-width:768px)': {
            paddingLeft: '12px',
            paddingRight: '12px',
          },
        },
        maxWidthLg: {
          maxWidth: '1200px',
        },
      },
    },
    
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,90,156,0.08)',
          border: '1px solid #DCE3EC',
          borderRadius: '12px',
          transition: 'all 0.3s ease-in-out',
          '&:hover': {
            boxShadow: '0 8px 16px rgba(0,90,156,0.12)',
            transform: 'translateY(-2px)',
          },
        },
      },
    },
    
    MuiCardContent: {
      styleOverrides: {
        root: {
          padding: '24px',
          '&:last-child': {
            paddingBottom: '24px',
          },
          '@media (max-width:768px)': {
            padding: '16px',
            '&:last-child': {
              paddingBottom: '16px',
            },
          },
        },
      },
    },
    
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px',
          padding: '10px 20px',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,90,156,0.15)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0,90,156,0.20)',
          },
        },
        outlined: {
          borderWidth: '2px',
          '&:hover': {
            borderWidth: '2px',
          },
        },
      },
    },
    
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '8px',
            '& fieldset': {
              borderColor: '#E5E7EB',
            },
            '&:hover fieldset': {
              borderColor: '#4F46E5',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#4F46E5',
              borderWidth: '2px',
            },
          },
        },
      },
    },
    
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        },
        elevation1: {
          boxShadow: '0 2px 4px rgba(0,90,156,0.06)',
        },
        elevation2: {
          boxShadow: '0 2px 8px rgba(0,90,156,0.08)',
        },
        elevation3: {
          boxShadow: '0 4px 12px rgba(0,90,156,0.10)',
        },
      },
    },
    
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #DCE3EC',
          padding: '16px',
        },
        head: {
          backgroundColor: '#F7FAFC',
          fontWeight: 600,
          color: '#1E2A3A',
          textTransform: 'uppercase',
          fontSize: '0.75rem',
          letterSpacing: '0.5px',
        },
      },
    },
    
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:nth-of-type(odd)': {
            backgroundColor: '#F9FAFB',
          },
          '&:hover': {
            backgroundColor: '#F3F4F6',
          },
        },
      },
    },
    
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '6px',
          fontWeight: 600,
          fontSize: '0.75rem',
        },
      },
    },
    
    MuiDrawer: {
      styleOverrides: {
        paper: {
          backgroundColor: '#1A2B3C',
          color: '#FFFFFF',
          borderRight: 'none',
        },
      },
    },
    
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,90,156,0.08)',
          backgroundColor: '#FFFFFF',
          color: '#1E2A3A',
        },
      },
    },
  },
});

export default btsTheme;
