-- Migración: Agregar columnas sociodemográficas a la tabla patients
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Fecha: 2026-04-06

ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS marital_status   TEXT,
  ADD COLUMN IF NOT EXISTS education_level  TEXT,
  ADD COLUMN IF NOT EXISTS occupation       TEXT,
  ADD COLUMN IF NOT EXISTS residence_zone   TEXT;

-- Verificar que se crearon correctamente
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'patients'
  AND column_name IN ('marital_status', 'education_level', 'occupation', 'residence_zone')
ORDER BY column_name;
