-- ============================================================
-- Migration v9 — Dashboard con filtros por programa y laboratorio
-- TASK-016: Extiende get_dashboard_stats con parámetros opcionales
-- Aplicar en Supabase Cloud SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION get_dashboard_stats(
  p_tenant_id       UUID    DEFAULT NULL,
  p_programa_id     UUID    DEFAULT NULL,
  p_laboratorio_id  INTEGER DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  result   JSON;
  v_tenant UUID;
BEGIN
  -- Resolver tenant: prioridad al del usuario en sesión
  v_tenant := COALESCE(p_tenant_id, auth_tenant_id());

  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'tenant_id requerido: usuario sin tenant asignado';
  END IF;

  -- Solo SUPER_ADMIN puede consultar un tenant distinto al suyo
  IF p_tenant_id IS NOT NULL AND p_tenant_id != auth_tenant_id() THEN
    IF NOT EXISTS (
      SELECT 1 FROM user_profiles
       WHERE id = auth.uid() AND role = 'SUPER_ADMIN'
    ) THEN
      RAISE EXCEPTION 'Acceso denegado: no puede consultar otro tenant';
    END IF;
  END IF;

  SELECT json_build_object(

    -- ── Pacientes ───────────────────────────────────────────
    'totalPacientes', (
      SELECT COUNT(*) FROM patients
       WHERE tenant_id = v_tenant AND deleted = false
         AND (p_programa_id    IS NULL OR programa_psp_id = p_programa_id)
         AND (p_laboratorio_id IS NULL OR laboratorio_id  = p_laboratorio_id)
    ),
    'pacientesActivos', (
      SELECT COUNT(*) FROM patients
       WHERE status = 'ACTIVO' AND tenant_id = v_tenant AND deleted = false
         AND (p_programa_id    IS NULL OR programa_psp_id = p_programa_id)
         AND (p_laboratorio_id IS NULL OR laboratorio_id  = p_laboratorio_id)
    ),
    'pacientesEnProceso', (
      SELECT COUNT(*) FROM patients
       WHERE status = 'EN_PROCESO' AND tenant_id = v_tenant AND deleted = false
         AND (p_programa_id    IS NULL OR programa_psp_id = p_programa_id)
         AND (p_laboratorio_id IS NULL OR laboratorio_id  = p_laboratorio_id)
    ),
    'pacientesSuspendidos', (
      SELECT COUNT(*) FROM patients
       WHERE status = 'SUSPENDIDO' AND tenant_id = v_tenant AND deleted = false
         AND (p_programa_id    IS NULL OR programa_psp_id = p_programa_id)
         AND (p_laboratorio_id IS NULL OR laboratorio_id  = p_laboratorio_id)
    ),
    'pacientesPorEstado', (
      SELECT COALESCE(json_agg(json_build_object('category', status, 'count', cnt)), '[]'::json)
        FROM (
          SELECT status, COUNT(*) as cnt
            FROM patients
           WHERE tenant_id = v_tenant AND deleted = false
             AND (p_programa_id    IS NULL OR programa_psp_id = p_programa_id)
             AND (p_laboratorio_id IS NULL OR laboratorio_id  = p_laboratorio_id)
           GROUP BY status
        ) sub
    ),

    -- ── Seguimientos & Tareas ────────────────────────────────
    'totalSeguimientos', (
      SELECT COUNT(*) FROM seguimientos
       WHERE tenant_id = v_tenant
         AND (
           (p_programa_id IS NULL AND p_laboratorio_id IS NULL)
           OR paciente_id IN (
             SELECT id FROM patients
              WHERE tenant_id = v_tenant AND deleted = false
                AND (p_programa_id    IS NULL OR programa_psp_id = p_programa_id)
                AND (p_laboratorio_id IS NULL OR laboratorio_id  = p_laboratorio_id)
           )
         )
    ),
    'totalTareas', (
      SELECT COUNT(*) FROM tareas
       WHERE tenant_id = v_tenant
         AND (
           (p_programa_id IS NULL AND p_laboratorio_id IS NULL)
           OR paciente_id IN (
             SELECT id FROM patients
              WHERE tenant_id = v_tenant AND deleted = false
                AND (p_programa_id    IS NULL OR programa_psp_id = p_programa_id)
                AND (p_laboratorio_id IS NULL OR laboratorio_id  = p_laboratorio_id)
           )
         )
    ),

    -- ── Barreras ─────────────────────────────────────────────
    'barrerasActivas', (
      SELECT COUNT(*) FROM barriers
       WHERE status != 'CERRADA' AND tenant_id = v_tenant
         AND (
           (p_programa_id IS NULL AND p_laboratorio_id IS NULL)
           OR paciente_id IN (
             SELECT id FROM patients
              WHERE tenant_id = v_tenant AND deleted = false
                AND (p_programa_id    IS NULL OR programa_psp_id = p_programa_id)
                AND (p_laboratorio_id IS NULL OR laboratorio_id  = p_laboratorio_id)
           )
         )
    ),
    'totalBarreras', (
      SELECT COUNT(*) FROM barriers
       WHERE tenant_id = v_tenant
         AND (
           (p_programa_id IS NULL AND p_laboratorio_id IS NULL)
           OR paciente_id IN (
             SELECT id FROM patients
              WHERE tenant_id = v_tenant AND deleted = false
                AND (p_programa_id    IS NULL OR programa_psp_id = p_programa_id)
                AND (p_laboratorio_id IS NULL OR laboratorio_id  = p_laboratorio_id)
           )
         )
    ),
    'barrerasPorCategoria', (
      SELECT COALESCE(json_agg(json_build_object('category', category, 'count', cnt)), '[]'::json)
        FROM (
          SELECT category, COUNT(*) as cnt
            FROM barriers
           WHERE tenant_id = v_tenant
             AND (
               (p_programa_id IS NULL AND p_laboratorio_id IS NULL)
               OR paciente_id IN (
                 SELECT id FROM patients
                  WHERE tenant_id = v_tenant AND deleted = false
                    AND (p_programa_id    IS NULL OR programa_psp_id = p_programa_id)
                    AND (p_laboratorio_id IS NULL OR laboratorio_id  = p_laboratorio_id)
               )
             )
           GROUP BY category
        ) sub
    ),

    -- ── Transportes ──────────────────────────────────────────
    'totalTransportes', (
      SELECT COUNT(*) FROM transportes
       WHERE tenant_id = v_tenant
         AND (
           (p_programa_id IS NULL AND p_laboratorio_id IS NULL)
           OR paciente_id IN (
             SELECT id FROM patients
              WHERE tenant_id = v_tenant AND deleted = false
                AND (p_programa_id    IS NULL OR programa_psp_id = p_programa_id)
                AND (p_laboratorio_id IS NULL OR laboratorio_id  = p_laboratorio_id)
           )
         )
    ),
    'transportesPendientes', (
      SELECT COUNT(*) FROM transportes
       WHERE estado = 'PENDIENTE' AND tenant_id = v_tenant
         AND (
           (p_programa_id IS NULL AND p_laboratorio_id IS NULL)
           OR paciente_id IN (
             SELECT id FROM patients
              WHERE tenant_id = v_tenant AND deleted = false
                AND (p_programa_id    IS NULL OR programa_psp_id = p_programa_id)
                AND (p_laboratorio_id IS NULL OR laboratorio_id  = p_laboratorio_id)
           )
         )
    ),
    'transportesEfectivos', (
      SELECT COUNT(*) FROM transportes
       WHERE estado = 'EFECTIVO' AND tenant_id = v_tenant
         AND (
           (p_programa_id IS NULL AND p_laboratorio_id IS NULL)
           OR paciente_id IN (
             SELECT id FROM patients
              WHERE tenant_id = v_tenant AND deleted = false
                AND (p_programa_id    IS NULL OR programa_psp_id = p_programa_id)
                AND (p_laboratorio_id IS NULL OR laboratorio_id  = p_laboratorio_id)
           )
         )
    ),

    -- ── Inventario ───────────────────────────────────────────
    'totalInventario', (
      SELECT COALESCE(SUM(cantidad_disponible), 0)
        FROM inventario_paciente
       WHERE tenant_id = v_tenant
         AND (
           (p_programa_id IS NULL AND p_laboratorio_id IS NULL)
           OR paciente_id IN (
             SELECT id FROM patients
              WHERE tenant_id = v_tenant AND deleted = false
                AND (p_programa_id    IS NULL OR programa_psp_id = p_programa_id)
                AND (p_laboratorio_id IS NULL OR laboratorio_id  = p_laboratorio_id)
           )
         )
    ),
    'inventarioCritico', (
      SELECT COUNT(*) FROM inventario_paciente
       WHERE cantidad_disponible > 0 AND cantidad_disponible <= 5 AND tenant_id = v_tenant
         AND (
           (p_programa_id IS NULL AND p_laboratorio_id IS NULL)
           OR paciente_id IN (
             SELECT id FROM patients
              WHERE tenant_id = v_tenant AND deleted = false
                AND (p_programa_id    IS NULL OR programa_psp_id = p_programa_id)
                AND (p_laboratorio_id IS NULL OR laboratorio_id  = p_laboratorio_id)
           )
         )
    ),
    'inventarioAgotado', (
      SELECT COUNT(*) FROM inventario_paciente
       WHERE cantidad_disponible = 0 AND tenant_id = v_tenant
         AND (
           (p_programa_id IS NULL AND p_laboratorio_id IS NULL)
           OR paciente_id IN (
             SELECT id FROM patients
              WHERE tenant_id = v_tenant AND deleted = false
                AND (p_programa_id    IS NULL OR programa_psp_id = p_programa_id)
                AND (p_laboratorio_id IS NULL OR laboratorio_id  = p_laboratorio_id)
           )
         )
    ),

    -- ── Paraclínicos ─────────────────────────────────────────
    'totalParaclinicos', (
      SELECT COUNT(*) FROM paraclinicos
       WHERE tenant_id = v_tenant
         AND (
           (p_programa_id IS NULL AND p_laboratorio_id IS NULL)
           OR paciente_id IN (
             SELECT id FROM patients
              WHERE tenant_id = v_tenant AND deleted = false
                AND (p_programa_id    IS NULL OR programa_psp_id = p_programa_id)
                AND (p_laboratorio_id IS NULL OR laboratorio_id  = p_laboratorio_id)
           )
         )
    ),
    'paraclinicosNormales', (
      SELECT COUNT(*) FROM paraclinicos
       WHERE interpretacion = 'NORMAL' AND tenant_id = v_tenant
         AND (
           (p_programa_id IS NULL AND p_laboratorio_id IS NULL)
           OR paciente_id IN (
             SELECT id FROM patients
              WHERE tenant_id = v_tenant AND deleted = false
                AND (p_programa_id    IS NULL OR programa_psp_id = p_programa_id)
                AND (p_laboratorio_id IS NULL OR laboratorio_id  = p_laboratorio_id)
           )
         )
    ),
    'paraclinicosAnormales', (
      SELECT COUNT(*) FROM paraclinicos
       WHERE interpretacion IN ('ANORMAL','CRITICO') AND tenant_id = v_tenant
         AND (
           (p_programa_id IS NULL AND p_laboratorio_id IS NULL)
           OR paciente_id IN (
             SELECT id FROM patients
              WHERE tenant_id = v_tenant AND deleted = false
                AND (p_programa_id    IS NULL OR programa_psp_id = p_programa_id)
                AND (p_laboratorio_id IS NULL OR laboratorio_id  = p_laboratorio_id)
           )
         )
    ),
    'paraclinicosPendientes', (
      SELECT COUNT(*) FROM paraclinicos
       WHERE estado_resultado = 'PENDIENTE' AND tenant_id = v_tenant
         AND (
           (p_programa_id IS NULL AND p_laboratorio_id IS NULL)
           OR paciente_id IN (
             SELECT id FROM patients
              WHERE tenant_id = v_tenant AND deleted = false
                AND (p_programa_id    IS NULL OR programa_psp_id = p_programa_id)
                AND (p_laboratorio_id IS NULL OR laboratorio_id  = p_laboratorio_id)
           )
         )
    ),

    -- ── Servicios Complementarios ────────────────────────────
    'totalServiciosComplementarios', (
      SELECT COUNT(*) FROM servicios_complementarios
       WHERE tenant_id = v_tenant
         AND (
           (p_programa_id IS NULL AND p_laboratorio_id IS NULL)
           OR paciente_id IN (
             SELECT id FROM patients
              WHERE tenant_id = v_tenant AND deleted = false
                AND (p_programa_id    IS NULL OR programa_psp_id = p_programa_id)
                AND (p_laboratorio_id IS NULL OR laboratorio_id  = p_laboratorio_id)
           )
         )
    ),
    'serviciosPendientes', (
      SELECT COUNT(*) FROM servicios_complementarios
       WHERE estado = 'PENDIENTE' AND tenant_id = v_tenant
         AND (
           (p_programa_id IS NULL AND p_laboratorio_id IS NULL)
           OR paciente_id IN (
             SELECT id FROM patients
              WHERE tenant_id = v_tenant AND deleted = false
                AND (p_programa_id    IS NULL OR programa_psp_id = p_programa_id)
                AND (p_laboratorio_id IS NULL OR laboratorio_id  = p_laboratorio_id)
           )
         )
    ),
    'serviciosCompletados', (
      SELECT COUNT(*) FROM servicios_complementarios
       WHERE estado = 'COMPLETADO' AND tenant_id = v_tenant
         AND (
           (p_programa_id IS NULL AND p_laboratorio_id IS NULL)
           OR paciente_id IN (
             SELECT id FROM patients
              WHERE tenant_id = v_tenant AND deleted = false
                AND (p_programa_id    IS NULL OR programa_psp_id = p_programa_id)
                AND (p_laboratorio_id IS NULL OR laboratorio_id  = p_laboratorio_id)
           )
         )
    ),

    -- ── Adherencia (fija por ahora) & Barreras Resueltas ─────
    'adherenciaTratamiento', 85.5,
    'adherenciaEntrega',     90.0,
    'barrerasResueltas', (
      SELECT COUNT(*) FROM barriers
       WHERE status = 'CERRADA' AND tenant_id = v_tenant
         AND (
           (p_programa_id IS NULL AND p_laboratorio_id IS NULL)
           OR paciente_id IN (
             SELECT id FROM patients
              WHERE tenant_id = v_tenant AND deleted = false
                AND (p_programa_id    IS NULL OR programa_psp_id = p_programa_id)
                AND (p_laboratorio_id IS NULL OR laboratorio_id  = p_laboratorio_id)
           )
         )
    )

  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Verificación (ejecutar manualmente en Supabase SQL Editor)
-- ============================================================
-- SELECT get_dashboard_stats();                                          -- sin filtros
-- SELECT get_dashboard_stats(p_programa_id := '<UUID_programa>');        -- filtrado
-- SELECT get_dashboard_stats(p_laboratorio_id := 1);                     -- por lab
