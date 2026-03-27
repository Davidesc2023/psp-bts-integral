/**
 * Utilidades de validación
 */

/**
 * Valida si un email tiene formato válido
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Valida si un teléfono colombiano es válido
 */
export const isValidPhone = (phone: string): boolean => {
  // Acepta formatos: +57 300 123 4567, 3001234567, +573001234567
  const phoneRegex = /^(\+?57)?[ -]?3\d{9}$/;
  return phoneRegex.test(phone.replace(/\s/g, ''));
};

/**
 * Calcula la edad a partir de una fecha de nacimiento
 */
export const calculateAge = (birthDate: string | Date): number => {
  const today = new Date();
  const birth = new Date(birthDate);
  
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Valida si un documento es válido (mínimo 7 dígitos)
 */
export const isValidDocument = (document: string): boolean => {
  return document.length >= 7 && /^\d+$/.test(document);
};

/**
 * Valida si un nombre es válido (al menos 2 caracteres)
 */
export const isValidName = (name: string): boolean => {
  return name.trim().length >= 2;
};
