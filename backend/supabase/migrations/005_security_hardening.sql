-- ============================================================
-- MIGRACIÓN 005: Security Hardening — Multi-tenant RLS real
-- PSP · Programa de Seguimiento a Pacientes
-- ============================================================
-- Reemplaza el bloque USING(true) del schema original y de v3/v4.
-- Es IDEMPOTENTE: puede ejecutarse más de una vez sin error.
-- Operaciones:
--   A. Columna anonymized_at en patients (si no existe)
--   B. Trigger de anonimización con anonymized_at
--   C. Función helper auth_tenant_id() SECURITY DEFINER
--   D. RLS real por tenant en patients
--   E. RLS real por tenant en todas las tablas operativas
--      (con verificación de existencia de tabla y columna)
--   F. RLS de auditoría solo para roles admin
--   G. get_patient_360() con verificación de tenant
--   H. get_dashboard_stats() con enforcement de tenant
-- ============================================================
-- EJECUTAR: Supabase SQL Editor › como superusuario / service_role
-- ============================================================


-- ============================================================
-- A. Columna anonymized_at en patients
-- ============================================================
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMPTZ;

-- Retroactivamente marcar filas ya anonimizadas sin fecha
UPDATE patients
   SET anonymized_at = updated_at
 WHERE anonymized = true
   AND anonymized_at IS NULL;


-- ============================================================
-- B. Trigger de anonimización — incluye anonymized_at
-- ============================================================
CREATE OR REPLACE FUNCTION anonymize_patient_pii()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.status IN ('DROP_OUT', 'FALLECIDO', 'RETIRADO')
     AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.anonymized = false)
  THEN
    NEW.first_name                     := 'ANONIMIZADO';
    NEW.second_name                    := NULL;
    NEW.last_name                      := 'ANONIMIZADO';
    NEW.second_last_name               := NULL;
    NEW.iniciales                      := '##';
    NEW.document_number                := '***' || RIGHT(COALESCE(NEW.document_number, ''), 4);
    NEW.email                          := NULL;
    NEW.phone                          := NULL;
    NEW.phone2                         := NULL;
    NEW.phone3                         := NULL;
    NEW.address                        := NULL;
    NEW.comunidad                      := NULL;
    NEW.barrio                         := NULL;
    NEW.neighborhood                   := NULL;
    NEW.emergency_contact_name         := NULL;
    NEW.emergency_contact_phone        := NULL;
    NEW.emergency_contact_relationship := NULL;
    NEW.guardian_document_number       := NULL;
    NEW.guardian_email                 := NULL;
    NEW.guardian_address               := NULL;
    NEW.marital_status                 := NULL;
    NEW.occupation                     := NULL;
    NEW.anonymized                     := TRUE;
    NEW.anonymized_at                  := NOW();
    NEW.updated_at                     := NOW();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_anonymize_patient ON patients;
CREATE TRIGGER trg_anonymize_patient
  BEFORE UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION anonymize_patient_pii();


-- ============================================================
-- C. Helper: tenant_id del usuario en sesión
-- SECURITY DEFINER evita recursión en user_profiles RLS
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
-- D. RLS en patients — eliminar políticas permisivas
--    y crear políticas reales por tenant
-- ============================================================
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Eliminar todas las políticas anteriores conocidas
DROP POLICY IF EXISTS "Authenticated users can read all" ON patients;
DROP POLICY IF EXISTS "Authenticated users can insert"   ON patients;
DROP POLICY IF EXISTS "Authenticated users can update"   ON patients;
DROP POLICY IF EXISTS "Authenticated users can delete"   ON patients;
DROP POLICY IF EXISTS "patients_select"        ON patients;
DROP POLICY IF EXISTS "patients_insert"        ON patients;
DROP POLICY IF EXISTS "patients_update"        ON patients;
DROP POLICY IF EXISTS "patients_delete"        ON patients;
DROP POLICY IF EXISTS "patients_tenant_select" ON patients;
DROP POLICY IF EXISTS "patients_tenant_insert" ON patients;
DROP POLICY IF EXISTS "patients_tenant_update" ON patients;
DROP POLICY IF EXISTS "patients_tenant_delete" ON patients;

CREATE POLICY "patients_tenant_select" ON patients
  FOR SELECT TO authenticated
  USING (tenant_id = auth_tenant_id());

CREATE POLICY "patients_tenant_insert" ON patients
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY "patients_tenant_update" ON patients
  FOR UPDATE TO authenticated
  USING  (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY "patients_tenant_delete" ON patients
  FOR DELETE TO authenticated
  USING (tenant_id = auth_tenant_id());


-- ============================================================
-- E. RLS tenant en todas las tablas operativas
--    Verifica que la tabla existe Y tiene columna tenant_id
--    antes de actuar — evita error si tabla aún no existe.
-- ============================================================
DO $$
DECLARE
  t         TEXT;
  has_table BOOLEAN;
  has_col   BOOLEAN;
  names     TEXT[] := ARRAY[
    'barriers', 'seguimientos', 'tareas', 'prescripciones', 'aplicaciones',
    'entregas', 'inventario_paciente', 'movimientos_inventario', 'paraclinicos',
    'transportes', 'consentimientos', 'facturacion', 'servicios_complementarios',
    'adherencia_proyecciones', 'adherencia_registros',
    'consultas_medicas', 'patient_status_config',
    'user_program_assignments', 'import_jobs', 'notifications',
    'crisis_paciente', 'heridas_paciente', 'system_config'
  ];
BEGIN
  FOREACH t IN ARRAY names LOOP

    -- Verificar que la tabla existe en public
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = t
    ) INTO has_table;

    IF NOT has_table THEN
      RAISE NOTICE '005: Tabla "%" no existe → saltando', t;
      CONTINUE;
    END IF;

    -- Verificar que tiene columna tenant_id
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name   = t
         AND column_name  = 'tenant_id'
    ) INTO has_col;

    IF NOT has_col THEN
      RAISE NOTICE '005: Tabla "%" no tiene tenant_id → saltando', t;
      CONTINUE;
    END IF;

    -- Activar RLS
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

    -- Eliminar políticas permisivas (todos los patrones conocidos)
    EXECUTE format('DROP POLICY IF EXISTS "auth_read_%s"      ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_insert_%s"    ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_update_%s"    ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_delete_%s"    ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "allow_auth_%s"     ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_select_%s"  ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_insert_%s"  ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_update_%s"  ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_delete_%s"  ON %I', t, t);

    -- Crear políticas reales por tenant
    EXECUTE format(
      'CREATE POLICY "tenant_select_%s" ON %I
         FOR SELECT TO authenticated
         USING (tenant_id = auth_tenant_id())',
      t, t
    );
    EXECUTE format(
      'CREATE POLICY "tenant_insert_%s" ON %I
         FOR INSERT TO authenticated
         WITH CHECK (tenant_id = auth_tenant_id())',
      t, t
    );
    EXECUTE format(
      'CREATE POLICY "tenant_update_%s" ON %I
         FOR UPDATE TO authenticated
         USING  (tenant_id = auth_tenant_id())
         WITH CHECK (tenant_id = auth_tenant_id())',
      t, t
    );
    EXECUTE format(
      'CREATE POLICY "tenant_delete_%s" ON %I
         FOR DELETE TO authenticated
         USING (tenant_id = auth_tenant_id())',
      t, t
    );

    RAISE NOTICE '005: Tabla "%" → RLS tenant aplicado ✓', t;
  END LOOP;
END $$;


-- ============================================================
-- F. auditoria_logs — sin tenant_id, solo admins pueden leer
-- ============================================================
ALTER TABLE auditoria_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "auth_read_auditoria_logs"   ON auditoria_logs;
DROP POLICY IF EXISTS "auth_insert_auditoria_logs" ON auditoria_logs;
DROP POLICY IF EXISTS "auth_update_auditoria_logs" ON auditoria_logs;
DROP POLICY IF EXISTS "auth_delete_auditoria_logs" ON auditoria_logs;
DROP POLICY IF EXISTS "audit_select"               ON auditoria_logs;
DROP POLICY IF EXISTS "audit_insert"               ON auditoria_logs;

CREATE POLICY "audit_select" ON auditoria_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
       WHERE id = auth.uid()
         AND role IN ('SUPER_ADMIN', 'ADMIN_INSTITUCION', 'AUDITOR')
    )
  );

-- Cualquier usuario autenticado puede insertar logs de auditoría
CREATE POLICY "audit_insert" ON auditoria_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);


-- ============================================================
-- G. get_patient_360() — verificación de tenant
-- ============================================================
CREATE OR REPLACE FUNCTION get_patient_360(p_patient_id BIGINT)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result     JSON;
  v_tenant   UUID;
BEGIN
  -- Verificar que el paciente pertenece al tenant del usuario en sesión
  SELECT tenant_id INTO v_tenant
    FROM patients
   WHERE id = p_patient_id
   LIMIT 1;

  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'Paciente no encontrado';
  END IF;

  IF v_tenant != auth_tenant_id() THEN
    RAISE EXCEPTION 'Acceso denegado: paciente no pertenece a su organización';
  END IF;

  SELECT json_build_object(
    'prescripcionVigente', (
      SELECT row_to_json(p)
        FROM (
          SELECT id, estado, fecha_inicio, fecha_fin, nombre_medicamento,
                 dias_tratamiento, fecha_vencimiento_prescripcion
            FROM prescripciones
           WHERE paciente_id = p_patient_id AND estado = 'VIGENTE'
           ORDER BY created_at DESC
           LIMIT 1
        ) p
    ),
    'barrerasAbiertas', (
      SELECT COUNT(*)
        FROM barriers
       WHERE patient_id = p_patient_id
         AND status IN ('ABIERTA', 'EN_PROCESO')
    ),
    'diasEnBarrera', (
      SELECT COALESCE(
        SUM(EXTRACT(DAY FROM (COALESCE(closed_at, NOW()) - opened_at))), 0
      )
        FROM barriers
       WHERE patient_id = p_patient_id
         AND status IN ('ABIERTA', 'EN_PROCESO')
    ),
    'aplicacionesPendientes', (
      SELECT COUNT(*)
        FROM aplicaciones
       WHERE paciente_id = p_patient_id AND estado = 'PROGRAMADA'
    ),
    'proximaEntrega', (
      SELECT fecha_proxima_entrega
        FROM entregas
       WHERE paciente_id = p_patient_id
         AND estado IN ('PROGRAMADA', 'EN_TRANSITO')
       ORDER BY fecha_proxima_entrega ASC
       LIMIT 1
    ),
    'diasMedicamento', (
      SELECT GREATEST(0,
        EXTRACT(DAY FROM (fecha_fin_medicamento - NOW()))::INTEGER
      )
        FROM entregas
       WHERE paciente_id = p_patient_id
         AND fecha_fin_medicamento IS NOT NULL
       ORDER BY fecha_fin_medicamento DESC
       LIMIT 1
    ),
    'tareasPendientesAlta', (
      SELECT COUNT(*)
        FROM tareas
       WHERE patient_id = p_patient_id
         AND estado = 'PENDIENTE'
         AND prioridad = 'ALTA'
    ),
    'proximaConsulta', (
      SELECT fecha_confirmada_proxima_consulta
        FROM consultas_medicas
       WHERE paciente_id = p_patient_id
         AND fecha_confirmada_proxima_consulta >= NOW()::DATE
       ORDER BY fecha_confirmada_proxima_consulta ASC
       LIMIT 1
    ),
    'stockDisponible', (
      SELECT COALESCE(SUM(cantidad_disponible), 0)
        FROM inventario_paciente
       WHERE paciente_id = p_patient_id
    )
  ) INTO result;

  RETURN result;
END;
$$;


-- ============================================================
-- H. get_dashboard_stats() — enforcement de tenant
-- ============================================================
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_tenant_id UUID DEFAULT NULL)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result   JSON;
  v_tenant UUID;
BEGIN
  -- Siempre usar el tenant del usuario en sesión.
  -- SUPER_ADMIN puede pasar un tenant_id explícito.
  v_tenant := COALESCE(p_tenant_id, auth_tenant_id());

  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'tenant_id requerido: el usuario no tiene tenant asignado';
  END IF;

  -- No-SUPER_ADMIN: solo puede consultar su propio tenant
  IF p_tenant_id IS NOT NULL AND p_tenant_id != auth_tenant_id() THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_profiles
       WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    ) THEN
      RAISE EXCEPTION 'Acceso denegado: no puede consultar datos de otro tenant';
    END IF;
  END IF;

  SELECT json_build_object(
    'totalPacientes',    (SELECT COUNT(*) FROM patients WHERE tenant_id = v_tenant AND deleted = false),
    'pacientesActivos',  (SELECT COUNT(*) FROM patients WHERE tenant_id = v_tenant AND deleted = false AND status = 'ACTIVO'),
    'pacientesEnProceso',(SELECT COUNT(*) FROM patients WHERE tenant_id = v_tenant AND deleted = false AND status = 'EN_PROCESO'),
    'pacientesSuspendidos',(SELECT COUNT(*) FROM patients WHERE tenant_id = v_tenant AND deleted = false AND status = 'SUSPENDIDO'),
    'pacientesPorEstado', (
      SELECT COALESCE(json_agg(json_build_object('category', status, 'count', cnt)), '[]'::json)
        FROM (
          SELECT status, COUNT(*) AS cnt
            FROM patients
           WHERE tenant_id = v_tenant AND deleted = false
           GROUP BY status
        ) sub
    ),
    'totalSeguimientos',   (SELECT COUNT(*) FROM seguimientos            WHERE tenant_id = v_tenant),
    'totalTareas',         (SELECT COUNT(*) FROM tareas                  WHERE tenant_id = v_tenant),
    'barrerasActivas',     (SELECT COUNT(*) FROM barriers                WHERE tenant_id = v_tenant AND status != 'CERRADA'),
    'totalBarreras',       (SELECT COUNT(*) FROM barriers                WHERE tenant_id = v_tenant),
    'barrerasPorCategoria',(
      SELECT COALESCE(json_agg(json_build_object('category', category, 'count', cnt)), '[]'::json)
        FROM (SELECT category, COUNT(*) AS cnt FROM barriers WHERE tenant_id = v_tenant GROUP BY category) sub
    ),
    'totalTransportes',       (SELECT COUNT(*) FROM transportes          WHERE tenant_id = v_tenant),
    'transportesPendientes',  (SELECT COUNT(*) FROM transportes          WHERE tenant_id = v_tenant AND estado = 'PENDIENTE'),
    'transportesEfectivos',   (SELECT COUNT(*) FROM transportes          WHERE tenant_id = v_tenant AND estado = 'EFECTIVO'),
    'totalInventario',        (SELECT COALESCE(SUM(cantidad_disponible), 0) FROM inventario_paciente WHERE tenant_id = v_tenant),
    'inventarioCritico',      (SELECT COUNT(*) FROM inventario_paciente  WHERE tenant_id = v_tenant AND cantidad_disponible > 0 AND cantidad_disponible <= 5),
    'inventarioAgotado',      (SELECT COUNT(*) FROM inventario_paciente  WHERE tenant_id = v_tenant AND cantidad_disponible = 0),
    'totalParaclinicos',      (SELECT COUNT(*) FROM paraclinicos         WHERE tenant_id = v_tenant),
    'paraclinicosNormales',   (SELECT COUNT(*) FROM paraclinicos         WHERE tenant_id = v_tenant AND interpretacion = 'NORMAL'),
    'paraclinicosAnormales',  (SELECT COUNT(*) FROM paraclinicos         WHERE tenant_id = v_tenant AND interpretacion IN ('ANORMAL','CRITICO')),
    'paraclinicosPendientes', (SELECT COUNT(*) FROM paraclinicos         WHERE tenant_id = v_tenant AND estado_resultado = 'PENDIENTE'),
    'totalServiciosComplementarios',(SELECT COUNT(*) FROM servicios_complementarios WHERE tenant_id = v_tenant),
    'serviciosPendientes',    (SELECT COUNT(*) FROM servicios_complementarios WHERE tenant_id = v_tenant AND estado = 'PENDIENTE'),
    'serviciosCompletados',   (SELECT COUNT(*) FROM servicios_complementarios WHERE tenant_id = v_tenant AND estado = 'COMPLETADO'),
    'barrerasResueltas',      (SELECT COUNT(*) FROM barriers WHERE tenant_id = v_tenant AND status = 'CERRADA')
  ) INTO result;

  RETURN result;
END;
$$;


-- ============================================================
-- VERIFICACIÓN: Estado post-migración
-- Copiar y ejecutar por separado para confirmar el resultado
-- ============================================================
/*
-- 1. ¿Función existe?
SELECT proname FROM pg_proc WHERE proname = 'auth_tenant_id';

-- 2. ¿Políticas por tenant en cada tabla operativa?
SELECT tablename,
       COUNT(*) AS total_policies,
       SUM(CASE WHEN qual LIKE '%auth_tenant_id%' THEN 1 ELSE 0 END) AS tenant_policies,
       SUM(CASE WHEN qual = 'true' THEN 1 ELSE 0 END) AS open_policies
  FROM pg_policies
 WHERE tablename IN (
   'patients','barriers','seguimientos','tareas','prescripciones',
   'aplicaciones','entregas','paraclinicos','transportes',
   'consentimientos','servicios_complementarios','consultas_medicas'
 )
 GROUP BY tablename
 ORDER BY tablename;
-- Esperado: tenant_policies=4, open_policies=0 por tabla

-- 3. ¿Tiene tenant_id el usuario actual?
SELECT id, role, tenant_id FROM user_profiles WHERE id = auth.uid();

-- 4. Si tenant_id es NULL → asignar (reemplazar UUID):
-- UPDATE user_profiles SET tenant_id = '<UUID-del-tenant>' WHERE tenant_id IS NULL;
*/
