/**
 * Form lookup constants for the patient registration flow.
 * Moved here from the removed wizard/PacienteFormTypes.ts
 */

export const DOCUMENT_TYPES = [
  { value: 'CC',  label: 'Cédula de Ciudadanía' },
  { value: 'TI',  label: 'Tarjeta de Identidad' },
  { value: 'RC',  label: 'Registro Civil' },
  { value: 'CE',  label: 'Cédula de Extranjería' },
  { value: 'PA',  label: 'Pasaporte' },
  { value: 'NIT', label: 'NIT' },
  { value: 'MS',  label: 'Menor sin identificación' },
  { value: 'PE',  label: 'Permiso Especial de Permanencia' },
];

export const GENDERS = [
  { value: 'MASCULINO',    label: 'Masculino' },
  { value: 'FEMENINO',     label: 'Femenino' },
  { value: 'NO_BINARIO',   label: 'No Binario' },
  { value: 'OTRO',         label: 'Otro' },
  { value: 'NO_INFORMA',   label: 'Prefiere no informar' },
];

export const EDUCATION_LEVELS = [
  { value: 'NINGUNO',              label: 'Ninguno' },
  { value: 'PRIMARIA_INCOMPLETA',  label: 'Primaria incompleta' },
  { value: 'PRIMARIA_COMPLETA',    label: 'Primaria completa' },
  { value: 'SECUNDARIA_INCOMPLETA',label: 'Secundaria incompleta' },
  { value: 'SECUNDARIA_COMPLETA',  label: 'Secundaria completa' },
  { value: 'TECNICO',              label: 'Técnico / Tecnólogo' },
  { value: 'UNIVERSITARIO',        label: 'Universitario' },
  { value: 'POSGRADO',             label: 'Posgrado' },
];

export const MARITAL_STATUS = [
  { value: 'SOLTERO',  label: 'Soltero(a)' },
  { value: 'CASADO',   label: 'Casado(a)' },
  { value: 'UNION_LIBRE', label: 'Unión libre' },
  { value: 'DIVORCIADO', label: 'Divorciado(a)' },
  { value: 'VIUDO',    label: 'Viudo(a)' },
  { value: 'SEPARADO', label: 'Separado(a)' },
];
