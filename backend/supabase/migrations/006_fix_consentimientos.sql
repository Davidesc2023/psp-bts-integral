-- ============================================================
-- MIGRACIÓN 006: Fix consentimientos — UNIQUE constraint
-- PSP · Programa de Seguimiento a Pacientes
-- ============================================================
-- Problema:
--   patient.service.ts hace .upsert(..., { onConflict: 'patient_id' })
--   en la tabla consentimientos.
--   Sin UNIQUE(patient_id), Supabase no puede resolver el conflicto y
--   lanza error o inserta filas duplicadas.
--
-- Fix:
--   Añadir UNIQUE(patient_id) si no existe.
--   Si existen duplicados previos, deduplica primero (más reciente gana).
-- ============================================================
-- EJECUTAR: después de 005_security_hardening.sql
-- ============================================================


-- ============================================================
-- PASO 1: Deduplicar si hay patient_id repetidos
-- (conserva el registro más reciente)
-- ============================================================
DELETE FROM consentimientos
 WHERE id NOT IN (
   SELECT DISTINCT ON (patient_id) id
     FROM consentimientos
    ORDER BY patient_id, created_at DESC
 );


-- ============================================================
-- PASO 2: Agregar UNIQUE constraint idempotente
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
      FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
       AND tc.table_schema    = ccu.table_schema
     WHERE tc.table_schema  = 'public'
       AND tc.table_name    = 'consentimientos'
       AND tc.constraint_type = 'UNIQUE'
       AND ccu.column_name  = 'patient_id'
  ) THEN
    ALTER TABLE consentimientos
      ADD CONSTRAINT consentimientos_patient_id_key UNIQUE (patient_id);

    RAISE NOTICE '006: UNIQUE(patient_id) añadido a consentimientos ✓';
  ELSE
    RAISE NOTICE '006: UNIQUE(patient_id) ya existe en consentimientos — sin cambios';
  END IF;
END $$;


-- ============================================================
-- VERIFICACIÓN
-- ============================================================
/*
SELECT constraint_name, constraint_type
  FROM information_schema.table_constraints
 WHERE table_name = 'consentimientos'
   AND constraint_type = 'UNIQUE';
-- Esperado: consentimientos_patient_id_key

-- Test de upsert (sustituir UUIDs reales):
INSERT INTO consentimientos (tenant_id, patient_id, consentimiento_psp, consentimiento_tratamiento)
VALUES ('<tenant-uuid>', 1, true, true)
ON CONFLICT (patient_id)
DO UPDATE SET
  consentimiento_psp          = EXCLUDED.consentimiento_psp,
  consentimiento_tratamiento  = EXCLUDED.consentimiento_tratamiento,
  updated_at                  = NOW();
-- Esperado: 0 errores
*/
