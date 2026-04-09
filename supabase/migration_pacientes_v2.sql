-- ============================================================
-- MIGRACIÓN: patients v2 — ejecutar en Supabase SQL Editor
-- ============================================================

-- 1. Agregar columnas de fechas del programa (si no existen)
ALTER TABLE patients ADD COLUMN IF NOT EXISTS fecha_ingreso DATE;
ALTER TABLE patients ADD COLUMN IF NOT EXISTS fecha_inicio_tratamiento DATE;

-- 2. Agregar estado PRESCRITO_SIN_INICIO al CHECK constraint
--    (primero eliminar el existente y volver a crearlo)
ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_status_check;
ALTER TABLE patients
  ADD CONSTRAINT patients_status_check
  CHECK (status IN (
    'EN_PROCESO',
    'ACTIVO',
    'PRESCRITO_SIN_INICIO',
    'SUSPENDIDO',
    'DROP_OUT',
    'INACTIVO',
    'FALLECIDO',
    'RETIRADO'
  ));

-- 3. Verificar resultado
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'patients'
  AND column_name IN ('fecha_ingreso', 'fecha_inicio_tratamiento', 'status', 'regime', 'second_last_name')
ORDER BY column_name;
