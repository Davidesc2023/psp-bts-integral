import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  CircularProgress,
} from '@mui/material';
import { NavigateNext, ArrowBack, ArrowForward, Save } from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { patientService } from '@services/patient.service';
import Step1BasicData from '../components/forms/Step1BasicData';
import Step2Sociodemographic from '../components/forms/Step2Sociodemographic';
import Step3Clinical from '../components/forms/Step3Clinical';
import Step4GuardianConsent from '../components/forms/Step4GuardianConsent';
import Step5Guardian from '../components/forms/Step5Guardian';
import Step6Documents from '../components/forms/Step6Documents';
import { PatientFormData } from '../components/forms/types';

const STEPS = [
  'Identificación',
  'Datos Personales',
  'Ubicación',
  'Programa Clínico',
  'Acudiente',
  'Documentos',
];

/**
 * Página de creación de paciente con wizard simplificado (4 pasos)
 * Incluye validación por paso, upload de PDF y navegación intuitiva
 */
const PacienteFormPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [loadingPatient, setLoadingPatient] = useState(isEditMode);

  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<PatientFormData>({
    // Step 1: Identificación
    documentType: 'CC',
    documentNumber: '',
    firstName: '',
    secondName: '',
    firstLastName: '',
    secondLastName: '',
    iniciales: '',
    // Step 2: Datos Personales
    birthDate: '',
    gender: '',
    phone: '',
    alternativePhone: '',
    phone3: '',
    email: '',
    // Step 3: Ubicación
    countryId: 1,
    departmentId: undefined,
    cityId: undefined,
    address: '',
    comunidad: '',
    barrio: '',
    residenceZone: '',
    stratum: undefined,
    // Step 4: Programa Clínico
    maritalStatus: '',
    educationLevel: '',
    occupation: '',
    populationTypeId: undefined,
    epsId: undefined,
    ipsId: undefined,
    ipsTratanteId: undefined,
    regime: '',
    tratamientoId: undefined,
    programaId: undefined,
    laboratorioId: undefined,
    medicoId: undefined,
    enfermedad: '',
    status: 'EN_PROCESO',
    subestado: '',
    startDate: new Date().toISOString().split('T')[0],
    fechaActivacion: '',
    treatmentStartDate: '',
    fechaRetiro: '',
    motivoRetiro: '',
    cambioTratamientoDestino: '',
    msl: '',
    ram: '',
    educadorId: undefined,
    coordinadorId: undefined,
    fundacion: '',
    observaciones: '',
    tutela: false,
    fallaTutela: false,
    vacunas: '',
    // Step 5: Acudiente
    guardianName: '',
    guardianDocumentType: 'CC',
    guardianDocumentNumber: '',
    guardianRelationship: '',
    guardianPhone: '',
    guardianEmail: '',
    guardianAddress: '',
    // Step 6: Documentos
    consentSigned: false,
    consentDocument: null,
    tieneConsentimientoTratamiento: false,
    tieneConsentimientoDatos: false,
    tieneCarnet: false,
    tieneFormulaMedica: false,
    tieneAutorizacion: false,
    tieneCopiaDocumento: false,
    tieneEps: false,
    tieneHistoriaClinica: false,
    tieneRegistroFoto: false,
    tieneOtrosDocumentos: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cargar datos del paciente en modo edición
  useEffect(() => {
    if (!isEditMode || !id) return;
    setLoadingPatient(true);
    patientService.getPatientById(Number(id))
      .then((p) => {
        setFormData((prev) => ({
          ...prev,
          documentType: p.documentType ?? 'CC',
          documentNumber: p.documentNumber ?? '',
          firstName: p.firstName ?? '',
          secondName: p.secondName ?? '',
          firstLastName: p.lastName?.split(' ')[0] ?? '',
          secondLastName: p.lastName?.split(' ').slice(1).join(' ') ?? '',
          iniciales: p.iniciales ?? '',
          birthDate: p.birthDate ?? p.fechaNacimiento ?? '',
          gender: p.gender ?? p.genero ?? '',
          phone: p.phone ?? p.telefono ?? '',
          alternativePhone: p.mobile ?? '',
          phone3: p.phone3 ?? '',
          email: p.email ?? '',
          address: p.address ?? p.direccion ?? '',
          comunidad: p.comunidad ?? '',
          barrio: p.barrio ?? '',
          departmentId: p.departmentId ?? undefined,
          cityId: p.cityId ?? undefined,
          residenceZone: p.residenceZone ?? '',
          stratum: p.stratum ?? undefined,
          maritalStatus: p.maritalStatus ?? '',
          educationLevel: p.educationLevel ?? '',
          occupation: p.occupation ?? '',
          epsId: p.epsId ?? undefined,
          ipsId: p.ipsId ?? undefined,
          ipsTratanteId: p.ipsTratantePrincipalId ?? undefined,
          regime: p.regime ?? '',
          tratamientoId: p.tratamientoId ?? undefined,
          programaId: p.programaId ?? undefined,
          laboratorioId: p.laboratorioId ?? undefined,
          medicoId: p.medicoId ?? undefined,
          enfermedad: p.enfermedad ?? '',
          status: p.status ?? 'EN_PROCESO',
          subestado: p.subestado ?? '',
          startDate: p.startDate ?? p.fechaIngresoPsp ?? '',
          fechaActivacion: p.fechaActivacion ?? '',
          treatmentStartDate: p.treatmentStartDate ?? p.fechaInicioTratamiento ?? '',
          fechaRetiro: p.fechaRetiro ?? '',
          motivoRetiro: p.motivoRetiro ?? '',
          msl: p.msl ?? '',
          ram: p.ram ?? '',
          educadorId: p.educadorId ?? undefined,
          coordinadorId: p.coordinadorId ?? undefined,
          fundacion: p.fundacion ?? '',
          observaciones: p.observaciones ?? '',
          tutela: p.tutela ?? false,
          fallaTutela: p.fallaTutela ?? false,
          vacunas: Array.isArray(p.vacunas) ? JSON.stringify(p.vacunas) : (p.vacunas ?? ''),
          guardianName: p.contactoEmergencia?.nombre ?? p.guardianName ?? '',
          guardianDocumentType: p.guardianDocumentTypeId?.toString() ?? 'CC',
          guardianDocumentNumber: p.guardianDocumentNumber ?? '',
          guardianRelationship: p.contactoEmergencia?.parentesco ?? p.guardianRelationship ?? '',
          guardianPhone: p.contactoEmergencia?.telefono ?? p.guardianPhone ?? '',
          guardianEmail: p.guardianEmail ?? '',
          guardianAddress: p.guardianAddress ?? '',
          consentSigned: p.consentimientoFirmado ?? false,
          tieneConsentimientoTratamiento: p.tieneConsentimientoTratamiento ?? false,
          tieneConsentimientoDatos: p.tieneConsentimientoDatos ?? false,
          tieneCarnet: p.tieneCarnet ?? false,
          tieneFormulaMedica: p.tieneFormulaMedica ?? false,
          tieneAutorizacion: p.tieneAutorizacion ?? false,
          tieneCopiaDocumento: p.tieneCopiaDocumento ?? false,
          tieneEps: p.tieneEps ?? false,
          tieneHistoriaClinica: p.tieneHistoriaClinica ?? false,
          tieneRegistroFoto: p.tieneRegistroFoto ?? false,
          tieneOtrosDocumentos: p.tieneOtrosDocumentos ?? false,
        }));
      })
      .catch(() => toast.error('No se pudo cargar el paciente'))
      .finally(() => setLoadingPatient(false));
  }, [id, isEditMode]);

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
      case 0: // Paso 1: Identificación
        if (!formData.documentNumber.trim())
          newErrors.documentNumber = 'Número de documento requerido';
        if (!formData.firstName.trim())
          newErrors.firstName = 'Primer nombre requerido';
        if (!formData.firstLastName.trim())
          newErrors.firstLastName = 'Primer apellido requerido';
        break;

      case 1: // Paso 2: Datos Personales
        if (!formData.birthDate) {
          newErrors.birthDate = 'Fecha de nacimiento requerida';
        } else {
          const today = new Date();
          const dob = new Date(formData.birthDate);
          let age = today.getFullYear() - dob.getFullYear();
          const m = today.getMonth() - dob.getMonth();
          if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
          if (formData.documentType === 'CC' && age < 18)
            newErrors.birthDate = `La Cédula de Ciudadanía requiere ser mayor de 18 años (edad actual: ${age})`;
          if (formData.documentType === 'TI' && (age < 7 || age > 17))
            newErrors.birthDate = `La Tarjeta de Identidad es para personas de 7 a 17 años (edad actual: ${age})`;
          if (formData.documentType === 'RC' && age >= 7)
            newErrors.birthDate = `El Registro Civil es para menores de 7 años (edad actual: ${age})`;
        }
        if (!formData.gender) newErrors.gender = 'Género requerido';
        if (!formData.phone.trim()) newErrors.phone = 'Teléfono requerido';
        break;

      case 2: // Paso 3: Ubicación
        if (!formData.departmentId)
          newErrors.departmentId = 'Departamento requerido';
        if (!formData.cityId) newErrors.cityId = 'Ciudad requerida';
        break;

      case 3: // Paso 4: Programa Clínico
        if (!formData.epsId) newErrors.epsId = 'EPS requerida';
        if (!formData.status) newErrors.status = 'Estado del paciente requerido';
        if (!formData.startDate) newErrors.startDate = 'Fecha de ingreso al PSP requerida';
        if (formData.status === 'ACTIVO' && !formData.fechaActivacion) {
          newErrors.fechaActivacion = 'Fecha de activación requerida cuando el estado es Activo';
        }
        if (formData.status === 'ACTIVO' && !formData.treatmentStartDate) {
          newErrors.treatmentStartDate = 'Fecha de inicio de tratamiento requerida cuando el estado es Activo';
        }
        if ((formData.status === 'DROP_OUT' || formData.status === 'RETIRADO') && !formData.motivoRetiro) {
          newErrors.motivoRetiro = 'Motivo de retiro requerido';
        }
        if ((formData.status === 'DROP_OUT' || formData.status === 'RETIRADO') && !formData.fechaRetiro) {
          newErrors.fechaRetiro = 'Fecha de retiro requerida';
        }
        break;

      case 4: // Paso 5: Acudiente (opcional)
        break;

      case 5: // Paso 6: Documentos y Consentimiento
        if (!formData.consentSigned) {
          newErrors.consentSigned = 'Debe marcar el consentimiento informado';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Mutación para actualizar paciente
  const updateMutation = useMutation({
    mutationFn: async (data: PatientFormData) => {
      const patient = await patientService.updatePatient(Number(id), data as any);
      if (data.consentDocument) {
        try {
          const docUrl = await patientService.uploadConsentDocument(patient.id, data.consentDocument);
          await patientService.saveConsentRecord(patient.id, docUrl);
        } catch {
          toast('⚠️ Paciente actualizado. El documento de consentimiento no se pudo subir.', { icon: '⚠️' });
        }
      }
      return patient;
    },
    onSuccess: () => {
      toast.success('✅ Paciente actualizado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      navigate('/patients');
    },
    onError: (error: any) => {
      const msg = error?.message || error?.details || JSON.stringify(error);
      toast.error('❌ Error al actualizar paciente: ' + (msg || 'Intente de nuevo'));
    },
  });

  // Mutación para crear paciente
  const createMutation = useMutation({
    mutationFn: async (data: PatientFormData) => {
      const patient = await patientService.createPatient(data as any);
      if (data.consentDocument) {
        try {
          const docUrl = await patientService.uploadConsentDocument(patient.id, data.consentDocument);
          await patientService.saveConsentRecord(patient.id, docUrl);
        } catch (uploadError) {
          console.warn('Paciente creado, pero no se pudo subir el documento:', uploadError);
          toast('⚠️ Paciente registrado. El documento de consentimiento no se pudo subir, inténtelo desde el detalle del paciente.', { icon: '⚠️' });
        }
      }
      return patient;
    },
    onSuccess: () => {
      toast.success('✅ Paciente registrado exitosamente');
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      navigate('/patients');
    },
    onError: (error: any) => {
      console.error('Error al crear paciente:', error);
      const msg = error?.message || error?.details || error?.hint || JSON.stringify(error);
      toast.error('\u274c Error al registrar paciente: ' + (msg || 'Verifique los datos e intente de nuevo'));
    },
  });

  const sanitizeDates = (data: PatientFormData): PatientFormData => ({
    ...data,
    startDate: data.startDate || (null as any),
    fechaActivacion: data.fechaActivacion || (null as any),
    treatmentStartDate: data.treatmentStartDate || (null as any),
    fechaRetiro: data.fechaRetiro || (null as any),
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
      const sanitized = sanitizeDates(formData);
      if (isEditMode) {
        updateMutation.mutate(sanitized);
      } else {
        createMutation.mutate(sanitized);
      }
    } else {
      toast.error('Por favor complete todos los campos requeridos');
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

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
      case 4:
        return <Step5Guardian {...stepProps} />;
      case 5:
        return <Step6Documents {...stepProps} />;
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
        <Typography color="text.primary">{isEditMode ? 'Editar Paciente' : 'Nuevo Paciente'}</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom fontWeight="bold" color="#111827">
          {isEditMode ? 'Editar Paciente' : 'Nuevo Paciente'}
        </Typography>
        <Typography variant="body1" color="#6b7280">
          {isEditMode
            ? 'Modifique los datos del paciente y guarde los cambios'
            : 'Complete el formulario en 6 pasos para registrar un nuevo paciente'}
        </Typography>
      </Box>

      {loadingPatient ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        /* Wizard Paper */
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
                  {isMobile ? `${index + 1}/6` : label}
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
              disabled={isSaving}
            >
              Cancelar
            </Button>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                onClick={handleBack}
                disabled={activeStep === 0 || isSaving}
                startIcon={<ArrowBack />}
              >
                Anterior
              </Button>

              {activeStep === STEPS.length - 1 ? (
                <Button
                  variant="contained"
                  color="primary"
                  onClick={handleSubmit}
                  disabled={isSaving}
                  startIcon={<Save />}
                >
                  {isSaving ? 'Guardando...' : isEditMode ? 'Actualizar Paciente' : 'Guardar Paciente'}
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
      )}
    </Box>
  );
};

export default PacienteFormPage;


