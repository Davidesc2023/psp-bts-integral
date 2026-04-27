-- ============================================================
-- PSP · migration_v6_notifications_generator.pgsql
-- Función generadora de notificaciones + pg_cron scheduling
-- Ejecutar en: Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. Función principal: fn_generate_notifications
-- ============================================================

CREATE OR REPLACE FUNCTION fn_generate_notifications(p_tenant_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_dias_entrega        INTEGER;
  v_dias_prescripcion   INTEGER;
  v_dias_aplicacion     INTEGER;
  v_hoy                 DATE := CURRENT_DATE;
BEGIN
  -- Leer configuración desde system_config
  SELECT COALESCE(CAST(value AS INTEGER), 7)
    INTO v_dias_entrega
    FROM system_config
   WHERE tenant_id = p_tenant_id AND key = 'notif_entregas_dias';

  SELECT COALESCE(CAST(value AS INTEGER), 15)
    INTO v_dias_prescripcion
    FROM system_config
   WHERE tenant_id = p_tenant_id AND key = 'notif_vencimiento_prescripcion';

  SELECT COALESCE(CAST(value AS INTEGER), 2)
    INTO v_dias_aplicacion
    FROM system_config
   WHERE tenant_id = p_tenant_id AND key = 'notif_aplicacion_pendiente';

  -- Default values si no hay configuración
  v_dias_entrega      := COALESCE(v_dias_entrega, 7);
  v_dias_prescripcion := COALESCE(v_dias_prescripcion, 15);
  v_dias_aplicacion   := COALESCE(v_dias_aplicacion, 2);

  -- --------------------------------------------------------
  -- TIPO 1: SEGUIMIENTO_PROXIMO
  -- Seguimientos con fecha_programada en los próximos 2 días
  -- --------------------------------------------------------
  INSERT INTO notifications (tenant_id, user_id, tipo, titulo, mensaje, patient_id, modulo, referencia_id, nav_url)
  SELECT
    p_tenant_id,
    s.responsable_id,
    'SEGUIMIENTO_PROXIMO',
    'Seguimiento programado próximamente',
    'Paciente ' || p.nombre || ' ' || p.apellido || ' tiene seguimiento el ' || TO_CHAR(s.fecha_programada, 'DD/MM/YYYY'),
    p.id,
    'SEGUIMIENTO',
    CAST(s.id AS VARCHAR),
    '/followups'
  FROM seguimientos s
  JOIN patients p ON p.id = s.patient_id
  WHERE s.tenant_id = p_tenant_id
    AND p.deleted IS NOT TRUE
    AND p.status IN ('ACTIVO','EN_PROCESO')
    AND s.fecha_programada BETWEEN v_hoy AND v_hoy + INTERVAL '2 days'
    AND s.estado NOT IN ('COMPLETADO','CANCELADO')
    AND NOT EXISTS (
      SELECT 1 FROM notifications n2
       WHERE n2.tenant_id = p_tenant_id
         AND n2.tipo = 'SEGUIMIENTO_PROXIMO'
         AND n2.referencia_id = CAST(s.id AS VARCHAR)
         AND n2.leida = FALSE
    );

  -- --------------------------------------------------------
  -- TIPO 2: PRESCRIPCION_POR_VENCER
  -- Prescripciones que vencen dentro de v_dias_prescripcion días
  -- --------------------------------------------------------
  INSERT INTO notifications (tenant_id, user_id, tipo, titulo, mensaje, patient_id, modulo, referencia_id, nav_url)
  SELECT
    p_tenant_id,
    NULL,  -- broadcast
    'PRESCRIPCION_POR_VENCER',
    'Prescripción por vencer',
    'Prescripción del paciente ' || p.nombre || ' ' || p.apellido || ' vence el ' || TO_CHAR(pr.fecha_vencimiento_prescripcion, 'DD/MM/YYYY'),
    p.id,
    'PRESCRIPCION',
    CAST(pr.id AS VARCHAR),
    '/prescriptions'
  FROM prescripciones pr
  JOIN patients p ON p.id = pr.patient_id
  WHERE pr.tenant_id = p_tenant_id
    AND p.deleted IS NOT TRUE
    AND p.status IN ('ACTIVO','EN_PROCESO')
    AND pr.estado = 'ACTIVO'
    AND pr.fecha_vencimiento_prescripcion IS NOT NULL
    AND pr.fecha_vencimiento_prescripcion BETWEEN v_hoy AND v_hoy + (v_dias_prescripcion * INTERVAL '1 day')
    AND NOT EXISTS (
      SELECT 1 FROM notifications n2
       WHERE n2.tenant_id = p_tenant_id
         AND n2.tipo = 'PRESCRIPCION_POR_VENCER'
         AND n2.referencia_id = CAST(pr.id AS VARCHAR)
         AND n2.leida = FALSE
    );

  -- --------------------------------------------------------
  -- TIPO 3: BARRERA_SIN_RESOLVER
  -- Barreras activas sin resolución con más de 7 días
  -- --------------------------------------------------------
  INSERT INTO notifications (tenant_id, user_id, tipo, titulo, mensaje, patient_id, modulo, referencia_id, nav_url)
  SELECT
    p_tenant_id,
    NULL,  -- broadcast (created_by es VARCHAR, no UUID)
    'BARRERA_SIN_RESOLVER',
    'Barrera sin resolver',
    'El paciente ' || p.nombre || ' ' || p.apellido || ' tiene una barrera sin resolver: ' || b.tipo,
    p.id,
    'BARRERA',
    CAST(b.id AS VARCHAR),
    '/barriers'
  FROM barriers b
  JOIN patients p ON p.id = b.patient_id
  WHERE b.tenant_id = p_tenant_id
    AND p.deleted IS NOT TRUE
    AND p.status IN ('ACTIVO','EN_PROCESO')
    AND b.resolucion IS NULL
    AND b.fecha_identificacion <= v_hoy - INTERVAL '7 days'
    AND NOT EXISTS (
      SELECT 1 FROM notifications n2
       WHERE n2.tenant_id = p_tenant_id
         AND n2.tipo = 'BARRERA_SIN_RESOLVER'
         AND n2.referencia_id = CAST(b.id AS VARCHAR)
         AND n2.leida = FALSE
    );

  -- --------------------------------------------------------
  -- TIPO 4: APLICACION_NO_EFECTIVA
  -- Aplicaciones marcadas como NO_EFECTIVA en los últimos 3 días
  -- --------------------------------------------------------
  INSERT INTO notifications (tenant_id, user_id, tipo, titulo, mensaje, patient_id, modulo, referencia_id, nav_url)
  SELECT
    p_tenant_id,
    ap.profesional_id,
    'APLICACION_NO_EFECTIVA',
    'Aplicación no efectiva registrada',
    'Paciente ' || p.nombre || ' ' || p.apellido || ' — aplicación no efectiva el ' || TO_CHAR(ap.fecha_aplicacion, 'DD/MM/YYYY'),
    p.id,
    'APLICACION',
    CAST(ap.id AS VARCHAR),
    '/applications'
  FROM aplicaciones ap
  JOIN patients p ON p.id = ap.patient_id
  WHERE ap.tenant_id = p_tenant_id
    AND p.deleted IS NOT TRUE
    AND ap.resultado = 'NO_EFECTIVA'
    AND ap.fecha_aplicacion >= v_hoy - INTERVAL '3 days'
    AND NOT EXISTS (
      SELECT 1 FROM notifications n2
       WHERE n2.tenant_id = p_tenant_id
         AND n2.tipo = 'APLICACION_NO_EFECTIVA'
         AND n2.referencia_id = CAST(ap.id AS VARCHAR)
         AND n2.leida = FALSE
    );

  -- --------------------------------------------------------
  -- TIPO 5: PARACLÍNICO_PROXIMO
  -- Paraclínicos PENDIENTE o EN_PROCESO con fecha_realizacion próxima
  -- --------------------------------------------------------
  INSERT INTO notifications (tenant_id, user_id, tipo, titulo, mensaje, patient_id, modulo, referencia_id, nav_url)
  SELECT
    p_tenant_id,
    NULL,  -- broadcast
    'PARACLÍNICO_PROXIMO',
    'Paraclínico próximo',
    'Paciente ' || p.nombre || ' ' || p.apellido || ' tiene paraclínico el ' || TO_CHAR(pc.fecha_realizacion, 'DD/MM/YYYY'),
    p.id,
    'PARACLÍNICO',
    CAST(pc.id AS VARCHAR),
    '/diagnostics'
  FROM paraclinicos pc
  JOIN patients p ON p.id = pc.patient_id
  WHERE pc.tenant_id = p_tenant_id
    AND p.deleted IS NOT TRUE
    AND p.status IN ('ACTIVO','EN_PROCESO')
    AND pc.estado_resultado IN ('PENDIENTE','EN_PROCESO')
    AND pc.fecha_realizacion BETWEEN v_hoy AND v_hoy + INTERVAL '3 days'
    AND NOT EXISTS (
      SELECT 1 FROM notifications n2
       WHERE n2.tenant_id = p_tenant_id
         AND n2.tipo = 'PARACLÍNICO_PROXIMO'
         AND n2.referencia_id = CAST(pc.id AS VARCHAR)
         AND n2.leida = FALSE
    );

  -- --------------------------------------------------------
  -- TIPO 6: PACIENTE_SIN_SEGUIMIENTO
  -- Pacientes activos sin seguimiento en los últimos 30 días
  -- --------------------------------------------------------
  INSERT INTO notifications (tenant_id, user_id, tipo, titulo, mensaje, patient_id, modulo, referencia_id, nav_url)
  SELECT
    p_tenant_id,
    NULL,  -- broadcast
    'PACIENTE_SIN_SEGUIMIENTO',
    'Paciente sin seguimiento reciente',
    'El paciente ' || p.nombre || ' ' || p.apellido || ' no ha tenido seguimiento en más de 30 días',
    p.id,
    'SEGUIMIENTO',
    CAST(p.id AS VARCHAR),
    '/patients/' || p.id
  FROM patients p
  WHERE p.tenant_id = p_tenant_id
    AND p.deleted IS NOT TRUE
    AND p.status IN ('ACTIVO','EN_PROCESO')
    AND NOT EXISTS (
      SELECT 1 FROM seguimientos s2
       WHERE s2.patient_id = p.id
         AND s2.tenant_id = p_tenant_id
         AND s2.fecha_programada >= v_hoy - INTERVAL '30 days'
    )
    AND NOT EXISTS (
      SELECT 1 FROM notifications n2
       WHERE n2.tenant_id = p_tenant_id
         AND n2.tipo = 'PACIENTE_SIN_SEGUIMIENTO'
         AND n2.referencia_id = CAST(p.id AS VARCHAR)
         AND n2.leida = FALSE
    );

  -- --------------------------------------------------------
  -- TIPO 7: ENTREGA_PROXIMA
  -- Entregas con fecha_proxima_entrega dentro de v_dias_entrega días
  -- --------------------------------------------------------
  INSERT INTO notifications (tenant_id, user_id, tipo, titulo, mensaje, patient_id, modulo, referencia_id, nav_url)
  SELECT
    p_tenant_id,
    NULL,  -- broadcast
    'ENTREGA_PROXIMA',
    'Entrega de medicamento próxima',
    'Paciente ' || p.nombre || ' ' || p.apellido || ' tiene entrega programada el ' || TO_CHAR(e.fecha_proxima_entrega, 'DD/MM/YYYY'),
    p.id,
    'ENTREGA',
    CAST(e.id AS VARCHAR),
    '/deliveries'
  FROM entregas e
  JOIN patients p ON p.id = e.patient_id
  WHERE e.tenant_id = p_tenant_id
    AND p.deleted IS NOT TRUE
    AND p.status IN ('ACTIVO','EN_PROCESO')
    AND e.estado NOT IN ('ENTREGADO','CANCELADO')
    AND e.fecha_proxima_entrega BETWEEN v_hoy AND v_hoy + (v_dias_entrega * INTERVAL '1 day')
    AND NOT EXISTS (
      SELECT 1 FROM notifications n2
       WHERE n2.tenant_id = p_tenant_id
         AND n2.tipo = 'ENTREGA_PROXIMA'
         AND n2.referencia_id = CAST(e.id AS VARCHAR)
         AND n2.leida = FALSE
    );

  -- --------------------------------------------------------
  -- TIPO 8: TAREA_VENCIDA_ALTA
  -- Tareas vencidas (pasada fecha_vencimiento) y alta prioridad
  -- --------------------------------------------------------
  INSERT INTO notifications (tenant_id, user_id, tipo, titulo, mensaje, patient_id, modulo, referencia_id, nav_url)
  SELECT
    p_tenant_id,
    t.educadora_id,
    'TAREA_VENCIDA_ALTA',
    'Tarea de alta prioridad vencida',
    'Tarea "' || t.titulo || '" venció el ' || TO_CHAR(t.fecha_vencimiento, 'DD/MM/YYYY'),
    t.patient_id,
    'TAREA',
    CAST(t.id AS VARCHAR),
    '/followups'
  FROM tareas t
  WHERE t.tenant_id = p_tenant_id
    AND t.estado NOT IN ('COMPLETADA','CANCELADA')
    AND t.prioridad = 'ALTA'
    AND t.fecha_vencimiento < v_hoy
    AND NOT EXISTS (
      SELECT 1 FROM notifications n2
       WHERE n2.tenant_id = p_tenant_id
         AND n2.tipo = 'TAREA_VENCIDA_ALTA'
         AND n2.referencia_id = CAST(t.id AS VARCHAR)
         AND n2.leida = FALSE
    );

END;
$$;

-- ============================================================
-- 2. Comentarios de pg_cron scheduling (Supabase Cloud)
-- Ejecutar en SQL Editor después del CREATE FUNCTION
-- Requiere tener pg_cron habilitado (Project Settings → Extensions)
-- ============================================================

-- Para ejecutar diariamente a las 6:00 AM UTC para TODOS los tenants:
/*
SELECT cron.schedule(
  'psp-notifications-daily',
  '0 6 * * *',
  $$
    SELECT fn_generate_notifications(id)
    FROM tenants
    WHERE active = TRUE;
  $$
);
*/

-- Verificar job registrado:
-- SELECT * FROM cron.job WHERE jobname = 'psp-notifications-daily';

-- Desactivar job (si necesario):
-- SELECT cron.unschedule('psp-notifications-daily');

-- ============================================================
-- 3. Ejecución manual para testing (un tenant específico)
-- ============================================================
-- SELECT fn_generate_notifications('<tu-tenant-id-uuid>');
