-- ============================================================
-- MIGRACIÓN: Alinear roles user_profiles con el PRD PSP
-- Añade: EDUCADORA, FARMACEUTICA, AUDITOR, MSL
-- ============================================================

-- 1. Eliminar el constraint CHECK existente
ALTER TABLE user_profiles
  DROP CONSTRAINT IF EXISTS user_profiles_role_check;

-- 2. Crear nuevo constraint con todos los roles del sistema
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN (
    'SUPER_ADMIN',
    'ADMIN_INSTITUCION',
    'MEDICO',
    'ENFERMERIA',
    'COORDINADOR',
    'EDUCADORA',
    'FARMACEUTICA',
    'AUDITOR',
    'MSL',
    'PACIENTE',
    'CUIDADOR'
  ));
