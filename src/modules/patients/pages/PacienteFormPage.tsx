import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Breadcrumbs,
  Link,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Button,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { NavigateNext, ArrowBack, ArrowForward, Save } from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { patientService } from '@services/patient.service';
import Step1BasicData from '../components/forms/Step1BasicData';
import Step2Sociodemographic from '../components/forms/Step2Sociodemographic';
import Step3Clinical from '../components/forms/Step3Clinical';
import Step4GuardianConsent from '../components/forms/Step4GuardianConsent';
import { PatientFormData } from '../components/forms/types';

const STEPS = ['Datos Básicos', 'Sociodemográfico', 'Datos Clínicos', 'Acudiente y Consentimiento'];

/**
 * Página de creación de paciente con wizard simplificado (4 pasos)
 * Incluye validación por paso, upload de PDF y navegación intuitiva
 */
const PacienteFormPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<PatientFormData>({
    documentType: 'CC',
    documentNumber: '',
    firstName: '',
    secondName: '',
    firstLastName: '',
    secondLastName: '',
    birthDate: '',
    gender: '',
    phone: '',
    alternativePhone: '',
    email: '',
    address: '',
    countryId: 1, // Colombia por defecto
    departmentId: undefined,
    cityId: undefined,
    residenceZone: '',
    stratum: undefined,
    maritalStatus: '',
    educationLevel: '',
    occupation: '',
    epsId: undefined,
    ipsId: undefined,
    status: 'ACTIVO',
    startDate: new Date().toISOString().split('T')[0],
    populationTypeId: undefined,
    guardianName: '',
    guardianRelationship: '',
    guardianPhone: '',
    guardianEmail: '',
    guardianAddress: '',
    consentSigned: false,
    consentDocument: null,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const updateFormData = (data: Partial<PatientFormData>) => {
    setFormData((prev) => ({ ...prev, ...data }));
    // Limpiar errores de los campos actualizados
    const updatedFields = Object.keys(data);
    setErrors((prev) => {
      const newErrors = { ...prev };
      updatedFields.forEach((field) => delete newErrors[field]);
      return newErrors;
    });
  };

  // Validación por paso
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 0: // Paso 1: Datos Básicos
        if (!formData.documentNumber.trim())
          newErrors.documentNumber = 'Número de documento requerido';
        if (!formData.firstName.trim())
          newErrors.firstName = 'Primer nombre requerido';
        if (!formData.firstLastName.trim())
          newErrors.firstLastName = 'Primer apellido requerido';
        if (!formData.birthDate) newErrors.birthDate = 'Fecha de nacimiento requerida';
        if (!formData.gender) newErrors.gender = 'Género requerido';
        if (!formData.phone.trim()) newErrors.phone = 'Teléfono requerido';
        if (!formData.email.trim()) {
          newErrors.email = 'Email requerido';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
          newErrors.email = 'Email inválido';
        }
        if (!formData.address.trim()) newErrors.address = 'Dirección requerida';
        break;

      case 1: // Paso 2: Sociodemográfico
        if (!formData.departmentId)
          newErrors.departmentId = 'Departamento requerido';
        if (!formData.cityId) newErrors.cityId = 'Ciudad requerida';
        if (!formData.residenceZone)
          newErrors.residenceZone = 'Zona de residencia requerida';
        if (!formData.stratum) newErrors.stratum = 'Estrato requerido';
        if (!formData.maritalStatus)
          newErrors.maritalStatus = 'Estado civil requerido';
        break;

      case 2: // Paso 3: Datos Clínicos
        if (!formData.epsId) newErrors.epsId = 'EPS requerida';
        if (!formData.ipsId) newErrors.ipsId = 'IPS requerida';
        if (!formData.status) newErrors.status = 'Estado del paciente requerido';
        if (!formData.startDate) newErrors.startDate = 'Fecha de ingreso requerida';
        if (formData.status === 'SUSPENDIDO' && !formData.suspensionDate) {
          newErrors.suspensionDate = 'Fecha de suspensión requerida';
        }
        if (formData.status === 'RETIRADO' && !formData.retirementDate) {
          newErrors.retirementDate = 'Fecha de retiro requerida';
        }
        break;

      case 3: // Paso 4: Acudiente y Consentimiento
        if (!formData.consentSigned) {
          newErrors.consentSigned = 'Debe marcar el consentimiento informado';
        }
        if (formData.consentSigned && !formData.consentDocument) {
          newErrors.consentDocument = 'Debe adjuntar el documento PDF del consentimiento';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Mutación para crear paciente
  const createMutation = useMutation({
    mutationFn: async (data: PatientFormData) => {
      // Crear FormData para enviar archivo
      const formDataToSend = new FormData();

      // Agregar datos del paciente (campos en inglés según API backend)
      const patientPayload = {
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        firstName: data.firstName,
        secondName: data.secondName || null,
        lastName: `${data.firstLastName}${data.secondLastName ? ' ' + data.secondLastName : ''}`,
        birthDate: data.birthDate,
        gender: data.gender,
        email: data.email || null,
        phone: data.phone || null,
        mobile: data.alternativePhone || null,
        address: data.address || null,
        departmentId: data.departmentId || null,
        cityId: data.cityId || null,
        epsId: data.epsId || null,
        ipsId: data.ipsId || null,
        status: data.status || 'EN_PROCESO',
        educationLevel: data.educationLevel || null,
        maritalStatus: data.maritalStatus || null,
        stratum: data.stratum || null,
        residenceZone: data.residenceZone || null,
      };

      formDataToSend.append('patient', JSON.stringify(patientPayload));

      // Agregar archivo PDF si existe
      if (data.consentDocument) {
        formDataToSend.append('consentDocument', data.consentDocument);
      }

      // Por ahora usar el servicio sin FormData (ajustar según API)
      return patientService.createPatient(patientPayload as any);
    },
    onSuccess: () => {
      toast.success('✅ Paciente registrado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      navigate('/patients');
    },
    onError: (error: any) => {
      console.error('Error al crear paciente:', error);
      toast.error(
        '❌ Error al registrar paciente: ' +
          (error.response?.data?.message || 'Verifique los datos')
      );
    },
  });

  const handleNext = () => {
    if (validateStep(activeStep)) {
      setActiveStep((prev) => prev + 1);
    } else {
      toast.error('Por favor corrija los errores antes de continuar');
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSubmit = () => {
    if (validateStep(activeStep)) {
      createMutation.mutate(formData);
    } else {
      toast.error('Por favor complete todos los campos requeridos');
    }
  };

  const renderStep = () => {
    const stepProps = { formData, updateFormData, errors };

    switch (activeStep) {
      case 0:
        return <Step1BasicData {...stepProps} />;
      case 1:
        return <Step2Sociodemographic {...stepProps} />;
      case 2:
        return <Step3Clinical {...stepProps} />;
      case 3:
        return <Step4GuardianConsent {...stepProps} />;
      default:
        return null;
    }
  };

  return (
    <Box sx={{ px: { xs: 2, sm: 3, md: 4 }, py: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Breadcrumbs */}
      <Breadcrumbs separator={<NavigateNext fontSize="small" />} sx={{ mb: 2 }}>
        <Link
          color="inherit"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate('/dashboard');
          }}
          sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
        >
          Dashboard
        </Link>
        <Link
          color="inherit"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate('/patients');
          }}
          sx={{ textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
        >
          Pacientes
        </Link>
        <Typography color="text.primary">Nuevo Paciente</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold" color="#111827">
          Nuevo Paciente
        </Typography>
        <Typography variant="body1" color="#6b7280">
          Complete el formulario en 4 pasos para registrar un nuevo paciente
        </Typography>
      </Box>

      {/* Wizard Paper */}
      <Paper elevation={2} sx={{ p: { xs: 2, sm: 4 }, borderRadius: 2 }}>
        {/* Stepper */}
        <Stepper
          activeStep={activeStep}
          alternativeLabel={isMobile}
          sx={{ mb: 4 }}
        >
          {STEPS.map((label, index) => (
            <Step key={label}>
              <StepLabel>
                {isMobile ? `${index + 1}/4` : label}
              </StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Progress */}
        <Box sx={{ mb: 3, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Paso {activeStep + 1} de {STEPS.length}
          </Typography>
        </Box>

        {/* Step Content */}
        <Box sx={{ minHeight: 400, mb: 4 }}>{renderStep()}</Box>

        {/* Navigation Buttons */}
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            pt: 3,
            borderTop: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Button
            variant="outlined"
            onClick={() => navigate('/patients')}
            disabled={createMutation.isPending}
          >
            Cancelar
          </Button>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              onClick={handleBack}
              disabled={activeStep === 0 || createMutation.isPending}
              startIcon={<ArrowBack />}
            >
              Anterior
            </Button>

            {activeStep === STEPS.length - 1 ? (
              <Button
                variant="contained"
                color="primary"
                onClick={handleSubmit}
                disabled={createMutation.isPending}
                startIcon={<Save />}
              >
                {createMutation.isPending ? 'Guardando...' : 'Guardar Paciente'}
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                onClick={handleNext}
                endIcon={<ArrowForward />}
              >
                Siguiente
              </Button>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default PacienteFormPage;


