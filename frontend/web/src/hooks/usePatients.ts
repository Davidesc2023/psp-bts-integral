import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { patientService, PatientFilters } from '@services/patient.service';
import { PatientFormData } from '@/types';
import toast from 'react-hot-toast';

/**
 * Query keys para React Query
 */
export const patientKeys = {
  all: ['patients'] as const,
  lists: () => [...patientKeys.all, 'list'] as const,
  list: (filters: PatientFilters) => [...patientKeys.lists(), filters] as const,
  details: () => [...patientKeys.all, 'detail'] as const,
  detail: (id: number) => [...patientKeys.details(), id] as const,
  prescriptions: (id: number) => [...patientKeys.detail(id), 'prescriptions'] as const,
};

/**
 * Hook para obtener lista de pacientes
 */
export const usePatients = (filters: PatientFilters = {}) => {
  return useQuery({
    queryKey: patientKeys.list(filters),
    queryFn: () => patientService.getPatients(filters),
    staleTime: 5 * 60 * 1000, // 5 minutos
  });
};

/**
 * Hook para obtener un paciente por ID
 */
export const usePatient = (id: number) => {
  return useQuery({
    queryKey: patientKeys.detail(id),
    queryFn: () => patientService.getPatientById(id),
    enabled: !!id,
  });
};

/**
 * Hook para crear un paciente
 */
export const useCreatePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: PatientFormData) => patientService.createPatient(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
      toast.success('Paciente creado exitosamente');
    },
    onError: () => {
      toast.error('Error al crear el paciente');
    },
  });
};

/**
 * Hook para actualizar un paciente
 */
export const useUpdatePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: PatientFormData }) => 
      patientService.updatePatient(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
      queryClient.invalidateQueries({ queryKey: patientKeys.detail(variables.id) });
      toast.success('Paciente actualizado exitosamente');
    },
    onError: () => {
      toast.error('Error al actualizar el paciente');
    },
  });
};

/**
 * Hook para eliminar un paciente
 */
export const useDeletePatient = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => patientService.deletePatient(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: patientKeys.lists() });
      toast.success('Paciente eliminado exitosamente');
    },
    onError: () => {
      toast.error('Error al eliminar el paciente');
    },
  });
};

/**
 * Hook para obtener prescripciones de un paciente
 */
export const usePatientPrescriptions = (patientId: number) => {
  return useQuery({
    queryKey: patientKeys.prescriptions(patientId),
    queryFn: () => patientService.getPatientPrescriptions(patientId),
    enabled: !!patientId,
  });
};
