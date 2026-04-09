-- ============================================================
-- FIX: Políticas RLS para tabla patients y todas las tablas
-- Ejecutar en Supabase SQL Editor si aparece el error:
-- "new row violates row-level security policy for table patients"
-- ============================================================

-- 1. Eliminar políticas existentes en patients (si existen)
DROP POLICY IF EXISTS "Authenticated users can read all" ON patients;
DROP POLICY IF EXISTS "Authenticated users can insert" ON patients;
DROP POLICY IF EXISTS "Authenticated users can update" ON patients;
DROP POLICY IF EXISTS "Authenticated users can delete" ON patients;

-- 2. Recrear políticas en patients
CREATE POLICY "patients_select" ON patients
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "patients_insert" ON patients
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "patients_update" ON patients
  FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "patients_delete" ON patients
  FOR DELETE TO authenticated USING (true);

-- 3. Asegurar RLS habilitado en patients
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- 4. Recrear políticas para todas las tablas operativas
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'barriers','seguimientos','tareas','prescripciones','aplicaciones',
    'entregas','inventario_paciente','paraclinicos','transportes',
    'consentimientos','facturacion','servicios_complementarios','auditoria_logs'
  ]) LOOP
    -- Habilitar RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

    -- Eliminar políticas previas del bloque DO anterior (si existen)
    EXECUTE format('DROP POLICY IF EXISTS "auth_read_%s" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_insert_%s" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_update_%s" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_delete_%s" ON %I', t, t);

    -- Crear políticas limpias
    EXECUTE format('CREATE POLICY "auth_read_%s" ON %I FOR SELECT TO authenticated USING (true)', t, t);
    EXECUTE format('CREATE POLICY "auth_insert_%s" ON %I FOR INSERT TO authenticated WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY "auth_update_%s" ON %I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY "auth_delete_%s" ON %I FOR DELETE TO authenticated USING (true)', t, t);
  END LOOP;
END $$;
