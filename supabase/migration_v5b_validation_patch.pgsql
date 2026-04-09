-- ============================================================
-- MIGRACIÓN v5b: Parche de validación y corrección post-v5
-- ============================================================
-- Problema raíz: migration_v5 contiene DROP POLICY sobre tablas
-- que podrían no existir en el DB (crisis_paciente, heridas_paciente,
-- system_config, patient_status_config, user_program_assignments).
-- En Supabase SQL Editor, "DROP POLICY IF EXISTS X ON tabla_inexistente"
-- lanza error "relation does not exist", abortando el resto del script.
-- Resultado probable: solo patients tiene tenant-RLS real.
-- El resto de tablas sigue con USING(true) del schema.sql original.
--
-- Este parche:
--   1. Diagnostica el estado real de las políticas (paso diagnóstico)
--   2. Aplica tenant-RLS de forma segura solo a tablas que existen
--   3. Corrige el constraint faltante en consentimientos
--   4. Verifica que auth_tenant_id() devuelva valores correctos
-- ============================================================
-- EJECUTAR EN: Supabase SQL Editor (como superusuario o service_role)
-- ============================================================


-- ============================================================
-- DIAGNÓSTICO 1: ¿Existe auth_tenant_id() ?
-- ============================================================
SELECT proname, prosrc
  FROM pg_proc
 WHERE proname = 'auth_tenant_id';
-- Esperado: 1 fila con la función.
-- Si 0 filas → migration_v5 no se aplicó en absoluto.


-- ============================================================
-- DIAGNÓSTICO 2: ¿Qué políticas RLS existen en patients?
-- ============================================================
SELECT policyname, cmd, qual, with_check
  FROM pg_policies
 WHERE tablename = 'patients';
-- Esperado: patients_tenant_select, patients_tenant_insert,
--           patients_tenant_update, patients_tenant_delete
-- Si aparece "Authenticated users can read all" → v5 patients no se aplicó


-- ============================================================
-- DIAGNÓSTICO 3: ¿Las demás tablas operativas tienen tenant-policies?
-- ============================================================
SELECT tablename, policyname
  FROM pg_policies
 WHERE tablename IN (
   'barriers','seguimientos','tareas','prescripciones','aplicaciones',
   'entregas','inventario_paciente','paraclinicos','transportes',
   'consentimientos','facturacion','servicios_complementarios',
   'consultas_medicas','adherencia_proyecciones','adherencia_registros'
 )
ORDER BY tablename, policyname;
-- Si ves "auth_read_barriers", "auth_insert_barriers" etc. →
-- el DO loop del v5 NO se ejecutó (siguen siendo USING(true))


-- ============================================================
-- DIAGNÓSTICO 4: ¿Existe tenant_id en user_profiles del usuario actual?
-- ============================================================
SELECT id, role, tenant_id
  FROM user_profiles
 WHERE id = auth.uid();
-- Si tenant_id es NULL → auth_tenant_id() devuelve NULL
-- → patients_tenant_insert falla (tenant_id = NULL es FALSE)
-- → ESTE ES EL BLOQUEADOR REAL


-- ============================================================
-- DIAGNÓSTICO 5: ¿Qué tablas existen realmente?
-- ============================================================
SELECT table_name
  FROM information_schema.tables
 WHERE table_schema = 'public'
   AND table_name IN (
     'crisis_paciente','heridas_paciente','system_config',
     'patient_status_config','user_program_assignments',
     'import_jobs','notifications'
   )
ORDER BY table_name;
-- Tablas que NO aparecen aquí son las que rompieron el v5 DROP POLICY


-- ============================================================
-- FIX-1: Asegurar que auth_tenant_id() existe (idempotente)
-- ============================================================
CREATE OR REPLACE FUNCTION auth_tenant_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT tenant_id
    FROM user_profiles
   WHERE id = auth.uid()
   LIMIT 1;
$$;


-- ============================================================
-- FIX-2: Aplicar tenant-RLS a tablas operativas de forma SEGURA
-- Solo actúa sobre tablas que existen Y tienen columna tenant_id
-- ============================================================
DO $$
DECLARE
  t         TEXT;
  has_table BOOLEAN;
  has_col   BOOLEAN;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'barriers', 'seguimientos', 'tareas', 'prescripciones', 'aplicaciones',
    'entregas', 'inventario_paciente', 'paraclinicos', 'transportes',
    'consentimientos', 'facturacion', 'servicios_complementarios',
    'adherencia_proyecciones', 'adherencia_registros',
    'consultas_medicas', 'patient_status_config',
    'user_program_assignments', 'import_jobs', 'notifications',
    'crisis_paciente', 'heridas_paciente', 'system_config'
  ]) LOOP
    -- Verificar que la tabla existe
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = t
    ) INTO has_table;

    IF NOT has_table THEN
      RAISE NOTICE 'Tabla % no existe — saltando', t;
      CONTINUE;
    END IF;

    -- Verificar que tiene columna tenant_id
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = t AND column_name = 'tenant_id'
    ) INTO has_col;

    IF NOT has_col THEN
      RAISE NOTICE 'Tabla % no tiene tenant_id — saltando', t;
      CONTINUE;
    END IF;

    -- Activar RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

    -- Eliminar políticas permisivas anteriores (todos los patrones conocidos)
    EXECUTE format('DROP POLICY IF EXISTS "auth_read_%s"    ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_insert_%s"  ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_update_%s"  ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_delete_%s"  ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "allow_auth_%s"   ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_select_%s" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_insert_%s" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_update_%s" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_delete_%s" ON %I', t, t);

    -- Crear políticas filtradas por tenant
    EXECUTE format(
      'CREATE POLICY "tenant_select_%s" ON %I FOR SELECT TO authenticated USING (tenant_id = auth_tenant_id())',
      t, t
    );
    EXECUTE format(
      'CREATE POLICY "tenant_insert_%s" ON %I FOR INSERT TO authenticated WITH CHECK (tenant_id = auth_tenant_id())',
      t, t
    );
    EXECUTE format(
      'CREATE POLICY "tenant_update_%s" ON %I FOR UPDATE TO authenticated USING (tenant_id = auth_tenant_id()) WITH CHECK (tenant_id = auth_tenant_id())',
      t, t
    );
    EXECUTE format(
      'CREATE POLICY "tenant_delete_%s" ON %I FOR DELETE TO authenticated USING (tenant_id = auth_tenant_id())',
      t, t
    );

    RAISE NOTICE 'Tabla %: RLS tenant aplicado OK', t;
  END LOOP;
END $$;


-- ============================================================
-- FIX-3: UNIQUE constraint en consentimientos para upsert seguro
-- El frontend hace .upsert(..., { onConflict: 'patient_id' })
-- Sin UNIQUE en patient_id, Supabase falla silenciosamente o inserta duplicado
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
      JOIN information_schema.constraint_column_usage ccu
        ON tc.constraint_name = ccu.constraint_name
     WHERE tc.table_name = 'consentimientos'
       AND tc.constraint_type = 'UNIQUE'
       AND ccu.column_name = 'patient_id'
  ) THEN
    ALTER TABLE consentimientos ADD CONSTRAINT consentimientos_patient_id_key UNIQUE (patient_id);
    RAISE NOTICE 'UNIQUE constraint añadido a consentimientos(patient_id)';
  ELSE
    RAISE NOTICE 'UNIQUE constraint en consentimientos(patient_id) ya existe';
  END IF;
END $$;


-- ============================================================
-- VERIFICACIÓN FINAL: Estado de políticas post-parche
-- ============================================================
SELECT
  tablename,
  COUNT(*) AS total_policies,
  SUM(CASE WHEN qual LIKE '%auth_tenant_id%' THEN 1 ELSE 0 END) AS tenant_policies,
  SUM(CASE WHEN qual = 'true' THEN 1 ELSE 0 END) AS open_policies
FROM pg_policies
WHERE tablename IN (
  'patients','barriers','seguimientos','tareas','prescripciones',
  'aplicaciones','entregas','paraclinicos','transportes',
  'consentimientos','facturacion','servicios_complementarios',
  'consultas_medicas','adherencia_proyecciones','adherencia_registros'
)
GROUP BY tablename
ORDER BY tablename;
-- Esperado final: tenant_policies = 4, open_policies = 0 para cada tabla
