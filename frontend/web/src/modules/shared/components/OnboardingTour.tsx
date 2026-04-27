import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Typography,
  MobileStepper,
  useTheme,
} from '@mui/material';
import {
  People,
  EventNote,
  LocalShipping,
  Assessment,
  Notifications,
  CheckCircle,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';

const STEPS = [
  {
    icon: <People sx={{ fontSize: 56, color: '#0E7490' }} />,
    title: 'Bienvenido al PSP',
    description:
      'El Programa de Soporte a Pacientes te permite gestionar de forma integral el seguimiento, entregas y aplicaciones de medicamentos de los pacientes a tu cargo.',
  },
  {
    icon: <EventNote sx={{ fontSize: 56, color: '#7C3AED' }} />,
    title: 'Seguimientos',
    description:
      'Registra y programa contactos con los pacientes. Los seguimientos vencidos aparecen primero y se destacan en rojo para que no se te pase ninguno.',
  },
  {
    icon: <LocalShipping sx={{ fontSize: 56, color: '#166534' }} />,
    title: 'Entregas y Aplicaciones',
    description:
      'Controla cada entrega e inyección de medicamento. Al marcar una aplicación como realizada, el inventario del paciente se descuenta automáticamente.',
  },
  {
    icon: <Assessment sx={{ fontSize: 56, color: '#D97706' }} />,
    title: 'Reportes',
    description:
      'Genera reportes de adherencia, barreras por categoría y evolución de estados. Exporta los datos en Excel o CSV con un solo clic.',
  },
  {
    icon: <Notifications sx={{ fontSize: 56, color: '#DC2626' }} />,
    title: 'Notificaciones',
    description:
      'Las alertas automáticas te avisan sobre seguimientos próximos a vencer, inventario bajo y entregas pendientes.',
  },
  {
    icon: <CheckCircle sx={{ fontSize: 56, color: '#0E7490' }} />,
    title: '¡Todo listo!',
    description:
      'Ya conoces las funciones principales. Puedes volver a ver este tutorial en cualquier momento desde la sección Configuración.',
  },
];

const STORAGE_KEY = 'psp_onboarding_done';

export const OnboardingTour: React.FC = () => {
  const theme = useTheme();
  const [open, setOpen] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) !== '1';
    } catch {
      return false;
    }
  });
  const [step, setStep] = useState(0);

  const handleClose = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch { /* ignore */ }
    setOpen(false);
  };

  const handleNext = () => {
    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      handleClose();
    }
  };

  const handleBack = () => setStep((s) => s - 1);

  if (!open) return null;

  const current = STEPS[step];

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: '16px',
          overflow: 'hidden',
        },
      }}
    >
      <DialogContent sx={{ p: 0, textAlign: 'center' }}>
        <Box
          sx={{
            background: 'linear-gradient(135deg, #EFF6FF 0%, #F0FDF4 100%)',
            pt: 5,
            pb: 3,
            px: 4,
          }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.25 }}
            >
              <Box sx={{ mb: 2 }}>{current.icon}</Box>
              <Typography variant="h6" fontWeight={700} color="text.primary" gutterBottom>
                {current.title}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6, minHeight: 70 }}>
                {current.description}
              </Typography>
            </motion.div>
          </AnimatePresence>
        </Box>

        <MobileStepper
          variant="dots"
          steps={STEPS.length}
          position="static"
          activeStep={step}
          sx={{
            justifyContent: 'center',
            bgcolor: 'transparent',
            py: 2,
          }}
          backButton={null}
          nextButton={null}
        />
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, justifyContent: 'space-between' }}>
        <Button
          size="small"
          sx={{ color: '#6B7280', textTransform: 'none' }}
          onClick={handleClose}
        >
          Saltar tutorial
        </Button>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {step > 0 && (
            <Button
              variant="outlined"
              size="small"
              sx={{ borderRadius: '8px', textTransform: 'none', borderColor: '#0E7490', color: '#0E7490' }}
              onClick={handleBack}
            >
              Anterior
            </Button>
          )}
          <Button
            variant="contained"
            size="small"
            sx={{
              borderRadius: '8px',
              textTransform: 'none',
              backgroundColor: '#0E7490',
              '&:hover': { backgroundColor: '#0c6680' },
              fontWeight: 600,
            }}
            onClick={handleNext}
          >
            {step === STEPS.length - 1 ? 'Comenzar' : 'Siguiente'}
          </Button>
        </Box>
      </DialogActions>
    </Dialog>
  );
};

export default OnboardingTour;
