/**
 * Tipos TypeScript para el Wizard Simplificado de Pacientes (4 pasos)
 */

export interface PatientFormData {
  // Paso 1: Datos Básicos
  documentType: string;
  documentNumber: string;
  firstName: string;
  secondName?: string;
  firstLastName: string;
  secondLastName?: string;
  birthDate: string;
  gender: string;
  phone: string;
  alternativePhone?: string;
  email: string;
  address: string;

  // Paso 2: Sociodemográfico
  countryId: number;
  departmentId?: number;
  cityId?: number;
  residenceZone?: string;
  stratum?: number;
  maritalStatus?: string;
  educationLevel?: string;
  occupation?: string;

  // Paso 3: Clínico
  epsId?: number;
  ipsId?: number;
  regime?: string;
  status: string;
  startDate: string;
  treatmentStartDate?: string;
  suspensionDate?: string;
  retirementDate?: string;
  statusReason?: string;
  populationTypeId?: number;

  // Paso 4: Acudiente y Consentimiento
  guardianName?: string;
  guardianRelationship?: string;
  guardianPhone?: string;
  guardianEmail?: string;
  guardianAddress?: string;
  consentSigned: boolean;
  consentDocument?: File | null;
}

export interface StepProps {
  formData: PatientFormData;
  updateFormData: (data: Partial<PatientFormData>) => void;
  errors: Record<string, string>;
}
