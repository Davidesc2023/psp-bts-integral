-- ============================================================
-- MIGRACIÓN v5: Security Hardening — Multi-tenant RLS real
-- ============================================================
-- Resuelve:
--   A. Columna anonymized_at faltante en patients
--   B. Trigger de anonimización sin anonymized_at
--   C. Políticas RLS USING(true) — sin filtro de tenant
--   D. get_patient_360 accesible entre tenants (SECURITY DEFINER)
--   E. get_dashboard_stats sin validación de tenant null
-- ============================================================
-- Ejecutar en Supabase SQL Editor (prod) o supabase db push (local)
-- ============================================================

-- ============================================================
-- A. Agregar columna anonymized_at a patients
-- ============================================================
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMPTZ;

-- Retroactivamente marcar filas ya anonimizadas sin fecha
UPDATE patients
   SET anonymized_at = updated_at
 WHERE anonymized = true AND anonymized_at IS NULL;


-- ============================================================
-- B. Actualizar trigger de anonimización para setear anonymized_at
-- ============================================================
CREATE OR REPLACE FUNCTION anonymize_patient_pii()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Solo actuar en transición hacia status terminal
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

-- Recrear trigger (ya existe, reemplaza)
DROP TRIGGER IF EXISTS trg_anonymize_patient ON patients;
CREATE TRIGGER trg_anonymize_patient
  BEFORE UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION anonymize_patient_pii();


-- ============================================================
-- C. RLS con filtro real de tenant_id
-- ============================================================
-- Helper: devuelve el tenant_id del usuario en sesión
-- SECURITY DEFINER para evitar recursión en user_profiles RLS
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

-- ----------------------------------------------------------------
-- patients
-- ----------------------------------------------------------------
DROP POLICY IF EXISTS "Authenticated users can read all" ON patients;
DROP POLICY IF EXISTS "Authenticated users can insert"   ON patients;
DROP POLICY IF EXISTS "Authenticated users can update"   ON patients;
DROP POLICY IF EXISTS "Authenticated users can delete"   ON patients;
DROP POLICY IF EXISTS "patients_select" ON patients;
DROP POLICY IF EXISTS "patients_insert" ON patients;
DROP POLICY IF EXISTS "patients_update" ON patients;
DROP POLICY IF EXISTS "patients_delete" ON patients;

CREATE POLICY "patients_tenant_select" ON patients
  FOR SELECT TO authenticated
  USING (tenant_id = auth_tenant_id());

CREATE POLICY "patients_tenant_insert" ON patients
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY "patients_tenant_update" ON patients
  FOR UPDATE TO authenticated
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY "patients_tenant_delete" ON patients
  FOR DELETE TO authenticated
  USING (tenant_id = auth_tenant_id());

-- ----------------------------------------------------------------
-- BUG-V5-1 FIX: Eliminar políticas legacy con nombres NO estándar
-- (los nombres no siguen el patrón auth_*_tablename del DO loop)
-- ----------------------------------------------------------------
-- v3: nombres sin prefijo estándar
DROP POLICY IF EXISTS crisis_paciente_auth  ON crisis_paciente;
DROP POLICY IF EXISTS heridas_paciente_auth ON heridas_paciente;
DROP POLICY IF EXISTS system_config_auth    ON system_config;
-- v4: nombres abreviados sin nombre de tabla completo
DROP POLICY IF EXISTS "allow_auth_consultas"   ON consultas_medicas;
DROP POLICY IF EXISTS "allow_auth_status_config" ON patient_status_config;
DROP POLICY IF EXISTS "allow_auth_assignments"  ON user_program_assignments;

-- ----------------------------------------------------------------
-- BUG-V5-2 FIX: Habilitar RLS en tablas sin ENABLE ROW LEVEL SECURITY previo
-- (adherencia_* no estaban en el bloque ENABLE de schema.sql)
-- ----------------------------------------------------------------
ALTER TABLE adherencia_proyecciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE adherencia_registros    ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------
-- Todas las tablas operativas con tenant_id
-- ----------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
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
    -- BUG-V5-3 FIX: Asegurar RLS activo antes de crear políticas
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

    -- Eliminar políticas permisivas anteriores (nombres estándar que SÍ sigue este patrón)
    EXECUTE format('DROP POLICY IF EXISTS "auth_read_%s"   ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_insert_%s" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_update_%s" ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_delete_%s" ON %I', t, t);
    -- Nombres con allow_auth_ + nombre_tabla_completo (estándar del DO loop)
    EXECUTE format('DROP POLICY IF EXISTS "allow_auth_%s"  ON %I', t, t);

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
  END LOOP;
END $$;

-- auditoria_logs: no tiene tenant_id; solo lectura para admins
DROP POLICY IF EXISTS "auth_read_auditoria_logs"   ON auditoria_logs;
DROP POLICY IF EXISTS "auth_insert_auditoria_logs" ON auditoria_logs;
DROP POLICY IF EXISTS "auth_update_auditoria_logs" ON auditoria_logs;
DROP POLICY IF EXISTS "auth_delete_auditoria_logs" ON auditoria_logs;

CREATE POLICY "audit_select" ON auditoria_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
       WHERE id = auth.uid()
         AND role IN ('SUPER_ADMIN', 'ADMIN_INSTITUCION', 'AUDITOR')
    )
  );

CREATE POLICY "audit_insert" ON auditoria_logs
  FOR INSERT TO authenticated WITH CHECK (true);


-- ============================================================
-- D. get_patient_360 — agregar verificación de tenant
-- ============================================================
CREATE OR REPLACE FUNCTION get_patient_360(p_patient_id BIGINT)
RETURNS JSON AS $$
DECLARE
  result JSON;
  v_tenant_id UUID;
BEGIN
  -- Verificar que el paciente pertenece al tenant del usuario en sesión
  SELECT tenant_id INTO v_tenant_id
    FROM patients
   WHERE id = p_patient_id
   LIMIT 1;

  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Paciente no encontrado';
  END IF;

  IF v_tenant_id != auth_tenant_id() THEN
    RAISE EXCEPTION 'Acceso denegado: paciente no pertenece a su organización';
  END IF;

  SELECT json_build_object(
    'prescripcionVigente', (
      SELECT row_to_json(p) FROM (
        SELECT id, estado, fecha_inicio, fecha_fin, nombre_medicamento,
               dias_tratamiento, fecha_vencimiento_prescripcion
          FROM prescripciones
         WHERE paciente_id = p_patient_id AND estado = 'VIGENTE'
         ORDER BY created_at DESC LIMIT 1
      ) p
    ),
    'barrerasAbiertas', (
      SELECT COUNT(*) FROM barriers
       WHERE patient_id = p_patient_id AND status IN ('ABIERTA','EN_PROCESO')
    ),
    'diasEnBarrera', (
      SELECT COALESCE(
        SUM(EXTRACT(DAY FROM (COALESCE(closed_at, NOW()) - opened_at))), 0
      )
        FROM barriers
       WHERE patient_id = p_patient_id AND status IN ('ABIERTA','EN_PROCESO')
    ),
    'aplicacionesPendientes', (
      SELECT COUNT(*) FROM aplicaciones
       WHERE paciente_id = p_patient_id AND estado = 'PROGRAMADA'
    ),
    'proximaEntrega', (
      SELECT fecha_proxima_entrega FROM entregas
       WHERE paciente_id = p_patient_id AND estado IN ('PROGRAMADA','EN_TRANSITO')
       ORDER BY fecha_proxima_entrega ASC LIMIT 1
    ),
    'diasMedicamento', (
      SELECT GREATEST(0,
        EXTRACT(DAY FROM (fecha_fin_medicamento - NOW()))::INTEGER
      )
        FROM entregas
       WHERE paciente_id = p_patient_id AND fecha_fin_medicamento IS NOT NULL
       ORDER BY fecha_fin_medicamento DESC LIMIT 1
    ),
    'tareasPendientesAlta', (
      SELECT COUNT(*) FROM tareas
       WHERE patient_id = p_patient_id AND estado = 'PENDIENTE' AND prioridad = 'ALTA'
    ),
    'proximaConsulta', (
      SELECT fecha_confirmada_proxima_consulta FROM consultas_medicas
       WHERE paciente_id = p_patient_id
         AND fecha_confirmada_proxima_consulta >= NOW()::DATE
       ORDER BY fecha_confirmada_proxima_consulta ASC LIMIT 1
    ),
    'stockDisponible', (
      SELECT COALESCE(SUM(cantidad_disponible), 0) FROM inventario_paciente
       WHERE paciente_id = p_patient_id
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- E. get_dashboard_stats — rechazar tenant_id nulo
-- ============================================================
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_tenant_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  result JSON;
  v_tenant UUID;
BEGIN
  -- Siempre usar el tenant del usuario en sesión.
  -- p_tenant_id se acepta solo si coincide con el del usuario
  -- (permite que SUPER_ADMIN pase un tenant explícito).
  v_tenant := COALESCE(p_tenant_id, auth_tenant_id());

  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'tenant_id requerido: usuario sin tenant asignado';
  END IF;

  -- SUPER_ADMIN puede pasar cualquier tenant; otros solo el suyo
  IF p_tenant_id IS NOT NULL AND p_tenant_id != auth_tenant_id() THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_profiles
       WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    ) THEN
      RAISE EXCEPTION 'Acceso denegado: no puede consultar otro tenant';
    END IF;
  END IF;

  SELECT json_build_object(
    'totalPacientes', (
      SELECT COUNT(*) FROM patients
       WHERE tenant_id = v_tenant AND deleted = false
    ),
    'pacientesActivos', (
      SELECT COUNT(*) FROM patients
       WHERE status = 'ACTIVO' AND tenant_id = v_tenant AND deleted = false
    ),
    'pacientesEnProceso', (
      SELECT COUNT(*) FROM patients
       WHERE status = 'EN_PROCESO' AND tenant_id = v_tenant AND deleted = false
    ),
    'pacientesSuspendidos', (
      SELECT COUNT(*) FROM patients
       WHERE status = 'SUSPENDIDO' AND tenant_id = v_tenant AND deleted = false
    ),
    'pacientesPorEstado', (
      SELECT COALESCE(json_agg(json_build_object('category', status, 'count', cnt)), '[]'::json)
        FROM (
          SELECT status, COUNT(*) as cnt
            FROM patients
           WHERE tenant_id = v_tenant AND deleted = false
           GROUP BY status
        ) sub
    ),
    'totalSeguimientos', (
      SELECT COUNT(*) FROM seguimientos WHERE tenant_id = v_tenant
    ),
    'totalTareas', (
      SELECT COUNT(*) FROM tareas WHERE tenant_id = v_tenant
    ),
    'barrerasActivas', (
      SELECT COUNT(*) FROM barriers WHERE status != 'CERRADA' AND tenant_id = v_tenant
    ),
    'totalBarreras', (
      SELECT COUNT(*) FROM barriers WHERE tenant_id = v_tenant
    ),
    'barrerasPorCategoria', (
      SELECT COALESCE(json_agg(json_build_object('category', category, 'count', cnt)), '[]'::json)
        FROM (
          SELECT category, COUNT(*) as cnt
            FROM barriers
           WHERE tenant_id = v_tenant
           GROUP BY category
        ) sub
    ),
    'totalTransportes', (
      SELECT COUNT(*) FROM transportes WHERE tenant_id = v_tenant
    ),
    'transportesPendientes', (
      SELECT COUNT(*) FROM transportes WHERE estado = 'PENDIENTE' AND tenant_id = v_tenant
    ),
    'transportesEfectivos', (
      SELECT COUNT(*) FROM transportes WHERE estado = 'EFECTIVO' AND tenant_id = v_tenant
    ),
    'totalInventario', (
      SELECT COALESCE(SUM(cantidad_disponible), 0)
        FROM inventario_paciente
       WHERE tenant_id = v_tenant
    ),
    'inventarioCritico', (
      SELECT COUNT(*) FROM inventario_paciente
       WHERE cantidad_disponible > 0 AND cantidad_disponible <= 5 AND tenant_id = v_tenant
    ),
    'inventarioAgotado', (
      SELECT COUNT(*) FROM inventario_paciente
       WHERE cantidad_disponible = 0 AND tenant_id = v_tenant
    ),
    'totalParaclinicos', (
      SELECT COUNT(*) FROM paraclinicos WHERE tenant_id = v_tenant
    ),
    'paraclinicosNormales', (
      SELECT COUNT(*) FROM paraclinicos
       WHERE interpretacion = 'NORMAL' AND tenant_id = v_tenant
    ),
    'paraclinicosAnormales', (
      SELECT COUNT(*) FROM paraclinicos
       WHERE interpretacion IN ('ANORMAL','CRITICO') AND tenant_id = v_tenant
    ),
    'paraclinicosPendientes', (
      SELECT COUNT(*) FROM paraclinicos
       WHERE estado_resultado = 'PENDIENTE' AND tenant_id = v_tenant
    ),
    'totalServiciosComplementarios', (
      SELECT COUNT(*) FROM servicios_complementarios WHERE tenant_id = v_tenant
    ),
    'serviciosPendientes', (
      SELECT COUNT(*) FROM servicios_complementarios
       WHERE estado = 'PENDIENTE' AND tenant_id = v_tenant
    ),
    'serviciosCompletados', (
      SELECT COUNT(*) FROM servicios_complementarios
       WHERE estado = 'COMPLETADO' AND tenant_id = v_tenant
    ),
    'adherenciaTratamiento', 85.5,
    'adherenciaEntrega', 90.0,
    'barrerasResueltas', (
      SELECT COUNT(*) FROM barriers WHERE status = 'CERRADA' AND tenant_id = v_tenant
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- Verificación post-migración (ejecutar manualmente para validar)
-- ============================================================
-- SELECT auth_tenant_id();                        -- debe retornar UUID del tenant
-- SELECT get_dashboard_stats();                   -- usa tenant en sesión
-- SELECT get_patient_360(1);                      -- error si paciente no es del tenant
-- SELECT COUNT(*) FROM patients;                  -- solo pacientes del tenant
