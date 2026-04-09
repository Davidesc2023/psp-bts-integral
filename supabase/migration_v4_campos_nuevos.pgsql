-- =============================================
-- PSP v4 - Migración Integral de Campos Nuevos
-- Fecha: 2026-04-06
-- Descripción: Agrega todos los campos solicitados a tablas
--              existentes y crea nuevas tablas de soporte.
-- =============================================

-- =============================================
-- 1. ENRIQUECER TABLA medications (tratamientos)
-- =============================================
ALTER TABLE medications
  ADD COLUMN IF NOT EXISTS via_administracion VARCHAR(100),
  ADD COLUMN IF NOT EXISTS tipo_administracion VARCHAR(50),
  ADD COLUMN IF NOT EXISTS unidades_ml DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS forma_farmaceutica VARCHAR(100),
  ADD COLUMN IF NOT EXISTS programa_id UUID REFERENCES programas_psp(id),
  ADD COLUMN IF NOT EXISTS laboratorio_id INTEGER REFERENCES laboratories(id);

-- =============================================
-- 2. ENRIQUECER TABLA eps (eliminar regimen como campo requerido)
-- =============================================
ALTER TABLE eps
  ALTER COLUMN regime DROP NOT NULL;

COMMENT ON COLUMN eps.regime IS 'Obsoleto: no se usa en el catálogo activo';

-- =============================================
-- 3. ENRIQUECER TABLA laboratories
-- =============================================
ALTER TABLE laboratories
  ADD COLUMN IF NOT EXISTS nit VARCHAR(30),
  ADD COLUMN IF NOT EXISTS email VARCHAR(150),
  ADD COLUMN IF NOT EXISTS representante VARCHAR(200),
  ADD COLUMN IF NOT EXISTS descripcion TEXT;

-- =============================================
-- 4. TABLA: patient_status_config (estados parametrizables por programa)
-- =============================================
CREATE TABLE IF NOT EXISTS patient_status_config (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  programa_id UUID REFERENCES programas_psp(id),
  codigo VARCHAR(50) NOT NULL,
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  requiere_fecha_ingreso BOOLEAN DEFAULT false,
  requiere_fecha_activacion BOOLEAN DEFAULT false,
  requiere_fecha_inicio_tratamiento BOOLEAN DEFAULT false,
  requiere_fecha_retiro BOOLEAN DEFAULT false,
  requiere_motivo_retiro BOOLEAN DEFAULT false,
  activo BOOLEAN DEFAULT true,
  orden INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Seed de estados por defecto (se insertan al ejecutar este script)
INSERT INTO patient_status_config (tenant_id, codigo, nombre, descripcion,
  requiere_fecha_ingreso, requiere_fecha_activacion, requiere_fecha_inicio_tratamiento,
  requiere_fecha_retiro, requiere_motivo_retiro, orden)
SELECT
  '00000000-0000-0000-0000-000000000001'::UUID,
  codigo, nombre, descripcion,
  req_ingreso, req_activacion, req_inicio_tto, req_retiro, req_motivo_retiro, orden
FROM (VALUES
  ('EN_PROCESO',            'En Proceso',                  'Paciente ingresado sin inicio de tratamiento',           true,  false, false, false, false, 1),
  ('ACTIVO',                'Activo',                      'Paciente con tratamiento iniciado',                      true,  true,  true,  false, false, 2),
  ('INTERRUMPIDO',          'Interrumpido Temporalmente',  'Tratamiento pausado temporalmente',                      true,  false, false, false, false, 3),
  ('DROP_OUT',              'Drop Out',                    'Abandono del programa > 6 meses sin medicamento',        true,  false, false, true,  true,  4),
  ('PRESCRITO_SIN_INICIO',  'Prescrito sin Inicio',        'Más de 6 meses en proceso sin tomar medicamento',        true,  false, false, false, false, 5),
  ('RETIRADO',              'Retirado',                    'Paciente retirado del programa',                         true,  false, false, true,  true,  6),
  ('FALLECIDO',             'Fallecido',                   'Paciente fallecido',                                     true,  false, false, true,  false, 7)
) AS t(codigo, nombre, descripcion, req_ingreso, req_activacion, req_inicio_tto, req_retiro, req_motivo_retiro, orden)
ON CONFLICT DO NOTHING;

-- =============================================
-- 5. ENRIQUECER TABLA patients
-- =============================================
ALTER TABLE patients
  -- Identificación adicional
  ADD COLUMN IF NOT EXISTS iniciales VARCHAR(20),
  ADD COLUMN IF NOT EXISTS codigo_paciente VARCHAR(50) UNIQUE,

  -- Teléfonos adicionales
  ADD COLUMN IF NOT EXISTS phone3 VARCHAR(20),

  -- Geografía adicional
  ADD COLUMN IF NOT EXISTS comunidad VARCHAR(200),
  ADD COLUMN IF NOT EXISTS barrio VARCHAR(200),

  -- Acudiente ampliado
  ADD COLUMN IF NOT EXISTS guardian_document_type_id INTEGER REFERENCES document_types(id),
  ADD COLUMN IF NOT EXISTS guardian_document_number VARCHAR(30),
  ADD COLUMN IF NOT EXISTS guardian_email VARCHAR(150),
  ADD COLUMN IF NOT EXISTS guardian_address TEXT,

  -- Clínico / Programa
  ADD COLUMN IF NOT EXISTS ips_tratante_principal_id INTEGER REFERENCES ips(id),
  ADD COLUMN IF NOT EXISTS enfermedad TEXT,
  ADD COLUMN IF NOT EXISTS otros_diagnosticos TEXT,
  ADD COLUMN IF NOT EXISTS otros_medicamentos TEXT,
  ADD COLUMN IF NOT EXISTS tratamiento_id INTEGER REFERENCES medications(id),
  ADD COLUMN IF NOT EXISTS laboratorio_id INTEGER REFERENCES laboratories(id),
  ADD COLUMN IF NOT EXISTS medico_id INTEGER REFERENCES doctors(id),

  -- Fechas clave
  ADD COLUMN IF NOT EXISTS fecha_ingreso_psp DATE,
  ADD COLUMN IF NOT EXISTS fecha_activacion DATE,
  ADD COLUMN IF NOT EXISTS fecha_inicio_tratamiento DATE,
  ADD COLUMN IF NOT EXISTS fecha_retiro DATE,
  ADD COLUMN IF NOT EXISTS motivo_retiro TEXT,
  ADD COLUMN IF NOT EXISTS cambio_tratamiento_destino TEXT,

  -- Subestado y campos operativos
  ADD COLUMN IF NOT EXISTS subestado VARCHAR(100),
  ADD COLUMN IF NOT EXISTS msl VARCHAR(200),
  ADD COLUMN IF NOT EXISTS ram TEXT,
  ADD COLUMN IF NOT EXISTS educador_id UUID REFERENCES user_profiles(id),
  ADD COLUMN IF NOT EXISTS coordinador_id UUID REFERENCES user_profiles(id),
  ADD COLUMN IF NOT EXISTS fundacion VARCHAR(200),
  ADD COLUMN IF NOT EXISTS observaciones TEXT,

  -- Tutela (amparo judicial)
  ADD COLUMN IF NOT EXISTS tutela_si_no BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS fallo_tutela TEXT,

  -- Vacunas (JSON con lista de vacunas)
  ADD COLUMN IF NOT EXISTS vacunas JSONB DEFAULT '[]'::jsonb,

  -- Documentos y consentimientos (checklist)
  ADD COLUMN IF NOT EXISTS tiene_consentimiento_tratamiento BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tiene_consentimiento_psp BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tiene_carta_red_apoyo BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tiene_identificacion BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tiene_identificacion_acudiente BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tiene_cert_vacunacion BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tiene_carta_necesidad_medica BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tiene_reporte_sivigila BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tiene_reporte_farmacovigilancia BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tiene_evidencia_tutela BOOLEAN DEFAULT false;

-- Índices nuevos
CREATE INDEX IF NOT EXISTS idx_patients_codigo ON patients(codigo_paciente);
CREATE INDEX IF NOT EXISTS idx_patients_educador ON patients(educador_id);
CREATE INDEX IF NOT EXISTS idx_patients_coordinador ON patients(coordinador_id);
CREATE INDEX IF NOT EXISTS idx_patients_laboratorio ON patients(laboratorio_id);
CREATE INDEX IF NOT EXISTS idx_patients_tratamiento ON patients(tratamiento_id);

-- Función para generar código de paciente automáticamente
CREATE OR REPLACE FUNCTION generate_patient_code(p_treatment_id INTEGER, p_tenant_id UUID)
RETURNS TEXT AS $$
DECLARE
  v_med_code TEXT;
  v_seq INTEGER;
  v_code TEXT;
BEGIN
  -- Obtener iniciales del medicamento/tratamiento
  SELECT UPPER(SUBSTRING(REGEXP_REPLACE(nombre, '[^A-Za-z ]', '', 'g'), 1, 3))
  INTO v_med_code
  FROM medications
  WHERE id = p_treatment_id;

  IF v_med_code IS NULL THEN
    v_med_code := 'PSP';
  END IF;

  -- Secuencia por tenant + tratamiento
  SELECT COALESCE(COUNT(*), 0) + 1
  INTO v_seq
  FROM patients
  WHERE tenant_id = p_tenant_id
    AND tratamiento_id = p_treatment_id
    AND deleted = false;

  v_code := v_med_code || LPAD(v_seq::TEXT, 4, '0');
  RETURN v_code;
END;
$$ LANGUAGE plpgsql;

-- =============================================
-- 6. NUEVA TABLA: consultas_medicas
-- =============================================
CREATE TABLE IF NOT EXISTS consultas_medicas (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  paciente_id BIGINT NOT NULL REFERENCES patients(id),
  codigo_paciente VARCHAR(50),
  fecha_consulta DATE NOT NULL,
  medico_id INTEGER REFERENCES doctors(id),
  medico_nombre VARCHAR(300),
  ips_id INTEGER REFERENCES ips(id),
  ips_nombre VARCHAR(300),
  ips_nit VARCHAR(30),
  ips_dv VARCHAR(5),
  tiene_prescripcion BOOLEAN DEFAULT false,
  prescripcion_id BIGINT REFERENCES prescripciones(id),
  fecha_estimada_proxima_consulta DATE,
  fecha_confirmada_proxima_consulta DATE,
  tiene_historia_clinica BOOLEAN DEFAULT false,
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_consultas_paciente ON consultas_medicas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_consultas_tenant ON consultas_medicas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_consultas_fecha ON consultas_medicas(fecha_consulta);

-- =============================================
-- 7. ENRIQUECER TABLA prescripciones
-- =============================================
ALTER TABLE prescripciones
  ADD COLUMN IF NOT EXISTS consulta_medica_id BIGINT REFERENCES consultas_medicas(id),
  ADD COLUMN IF NOT EXISTS codigo_paciente VARCHAR(50),
  ADD COLUMN IF NOT EXISTS numero_mipres VARCHAR(50),
  ADD COLUMN IF NOT EXISTS ips_prescriptora_id INTEGER REFERENCES ips(id),
  ADD COLUMN IF NOT EXISTS prescriptor_id INTEGER REFERENCES doctors(id),
  ADD COLUMN IF NOT EXISTS nombre_medicamento VARCHAR(300),
  ADD COLUMN IF NOT EXISTS dosis_2 VARCHAR(100),
  ADD COLUMN IF NOT EXISTS unidad_dosis_2 VARCHAR(50),
  ADD COLUMN IF NOT EXISTS frecuencia_2 VARCHAR(200),
  ADD COLUMN IF NOT EXISTS unidades_totales_1 INTEGER,
  ADD COLUMN IF NOT EXISTS unidades_totales_2 INTEGER,
  ADD COLUMN IF NOT EXISTS unidades_comerciales INTEGER,
  ADD COLUMN IF NOT EXISTS unidades_primarias_1 INTEGER,
  ADD COLUMN IF NOT EXISTS unidades_primarias_2 INTEGER,
  ADD COLUMN IF NOT EXISTS peso_kg DECIMAL(6,2),
  ADD COLUMN IF NOT EXISTS talla_cm DECIMAL(6,2);

-- =============================================
-- 8. ENRIQUECER TABLA seguimientos
-- =============================================
-- Nota: titulo, tipo_seguimiento, modalidad ya fueron agregados en migration_v3
-- Ahora agregamos la lógica de prioridad automática

-- Función para calcular prioridad por días restantes
CREATE OR REPLACE FUNCTION calc_seguimiento_prioridad(p_fecha_programada TIMESTAMPTZ)
RETURNS TEXT AS $$
DECLARE
  v_dias INTEGER;
BEGIN
  v_dias := EXTRACT(DAY FROM (p_fecha_programada - NOW()));
  IF v_dias <= 1 THEN RETURN 'ALTA';
  ELSIF v_dias <= 3 THEN RETURN 'MEDIA';
  ELSE RETURN 'BAJA';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger para calcular prioridad automáticamente
CREATE OR REPLACE FUNCTION trg_seguimiento_prioridad()
RETURNS TRIGGER AS $$
BEGIN
  NEW.prioridad := calc_seguimiento_prioridad(NEW.fecha_programada);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_seguimiento_set_prioridad ON seguimientos;
CREATE TRIGGER trg_seguimiento_set_prioridad
  BEFORE INSERT OR UPDATE OF fecha_programada ON seguimientos
  FOR EACH ROW
  EXECUTE FUNCTION trg_seguimiento_prioridad();

-- =============================================
-- 9. ENRIQUECER TABLA paraclinicos
-- =============================================
ALTER TABLE paraclinicos
  ADD COLUMN IF NOT EXISTS ciclo VARCHAR(50),
  ADD COLUMN IF NOT EXISTS codigo_paciente VARCHAR(50),
  ADD COLUMN IF NOT EXISTS ips_id INTEGER REFERENCES ips(id),
  ADD COLUMN IF NOT EXISTS fecha_estimada_proximo DATE,
  ADD COLUMN IF NOT EXISTS fecha_confirmada_proximo DATE,
  ADD COLUMN IF NOT EXISTS tiene_archivo_resultado BOOLEAN DEFAULT false;

-- url_resultado ya fue agregado en v3
ALTER TABLE paraclinicos
  ADD COLUMN IF NOT EXISTS url_resultado TEXT;

-- =============================================
-- 10. ENRIQUECER TABLA entregas
-- =============================================
ALTER TABLE entregas
  ADD COLUMN IF NOT EXISTS factura_despacho VARCHAR(100),
  ADD COLUMN IF NOT EXISTS codigo_paciente VARCHAR(50),
  ADD COLUMN IF NOT EXISTS fecha_fin_medicamento DATE,
  ADD COLUMN IF NOT EXISTS numero_entrega INTEGER,
  ADD COLUMN IF NOT EXISTS comprobante_entrega TEXT;

-- =============================================
-- 11. ENRIQUECER TABLA aplicaciones
-- =============================================
ALTER TABLE aplicaciones
  ADD COLUMN IF NOT EXISTS codigo_paciente VARCHAR(50),
  ADD COLUMN IF NOT EXISTS fase VARCHAR(100),
  ADD COLUMN IF NOT EXISTS tipo_infusion VARCHAR(100),
  ADD COLUMN IF NOT EXISTS dosis_real DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS numero_aplicacion INTEGER,
  ADD COLUMN IF NOT EXISTS tiene_reporte_infusion BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sin_prescripcion BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS estado_efectividad VARCHAR(30) DEFAULT 'PENDIENTE'
    CHECK (estado_efectividad IN ('PENDIENTE','EFECTIVA','NO_EFECTIVA','PARCIAL')),
  ADD COLUMN IF NOT EXISTS fechas_adicionales JSONB DEFAULT '[]'::jsonb;

-- =============================================
-- 12. ENRIQUECER TABLA crisis_paciente (ubicación corporal)
-- =============================================
ALTER TABLE crisis_paciente
  ADD COLUMN IF NOT EXISTS ubicacion_corporal TEXT,
  ADD COLUMN IF NOT EXISTS medicamento_id INTEGER REFERENCES medications(id);

-- =============================================
-- 13. ENRIQUECER TABLA heridas_paciente (ubicación + apósitos + fotos)
-- =============================================
ALTER TABLE heridas_paciente
  ADD COLUMN IF NOT EXISTS ubicacion_corporal TEXT,
  ADD COLUMN IF NOT EXISTS tiene_apositivos BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS cantidad_apositivos INTEGER,
  ADD COLUMN IF NOT EXISTS fotos JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS medicamento_id INTEGER REFERENCES medications(id);

-- =============================================
-- 14. TABLA: user_program_assignments (asignación educadora ↔ laboratorio ↔ programa)
-- =============================================
CREATE TABLE IF NOT EXISTS user_program_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES user_profiles(id),
  laboratorio_id INTEGER REFERENCES laboratories(id),
  programa_id UUID REFERENCES programas_psp(id),
  tratamiento_id INTEGER REFERENCES medications(id),
  rol VARCHAR(30) DEFAULT 'EDUCADOR' CHECK (rol IN ('EDUCADOR','COORDINADOR','MSL','ADMIN')),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assignments_user ON user_program_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_prog ON user_program_assignments(programa_id);

-- =============================================
-- 15. TABLA: import_jobs (rastreo de importaciones masivas)
-- =============================================
CREATE TABLE IF NOT EXISTS import_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  tabla VARCHAR(50) NOT NULL,
  estado VARCHAR(20) DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','PROCESANDO','COMPLETADO','ERROR')),
  total_filas INTEGER DEFAULT 0,
  filas_ok INTEGER DEFAULT 0,
  filas_error INTEGER DEFAULT 0,
  errores JSONB DEFAULT '[]'::jsonb,
  archivo_url TEXT,
  iniciado_por UUID REFERENCES user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- =============================================
-- 16. SISTEMA DE NOTIFICACIONES MEJORADO
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID REFERENCES user_profiles(id),
  tipo VARCHAR(50) NOT NULL,
  titulo VARCHAR(300) NOT NULL,
  mensaje TEXT,
  -- Referencia al paciente y módulo origen  
  patient_id BIGINT REFERENCES patients(id),
  modulo VARCHAR(50),       -- 'SEGUIMIENTO','ENTREGA','APLICACION','BARRERA','PRESCRIPCION', etc.
  referencia_id VARCHAR(100),
  -- Ruta de navegación
  nav_url TEXT,
  -- Estado
  leida BOOLEAN DEFAULT false,
  fecha_lectura TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_patient ON notifications(patient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_leida ON notifications(leida);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id);

-- =============================================
-- 17. ACTUALIZAR system_config (ya existe de v3)
-- =============================================
INSERT INTO system_config (tenant_id, key, value, descripcion)
VALUES
  ('00000000-0000-0000-0000-000000000001', 'primary_color',     '#0e7490', 'Color primario de la aplicación'),
  ('00000000-0000-0000-0000-000000000001', 'notif_entregas_dias', '7',      'Días de anticipación alerta entregas'),
  ('00000000-0000-0000-0000-000000000001', 'notif_vencimiento_prescripcion', '15', 'Días de anticipación alerta prescripción'),
  ('00000000-0000-0000-0000-000000000001', 'notif_aplicacion_pendiente', '2',  'Días de anticipación alerta aplicación'),
  ('00000000-0000-0000-0000-000000000001', 'anonimizar_al_retiro', 'true',   'Ley colombiana: anonimizar datos sensibles al retiro/dropout')
ON CONFLICT (tenant_id, key) DO NOTHING;

-- =============================================
-- 18. RLS para nuevas tablas
-- =============================================
ALTER TABLE consultas_medicas ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE patient_status_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_program_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE import_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_auth_consultas" ON consultas_medicas
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "allow_auth_notifications" ON notifications
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "allow_auth_status_config" ON patient_status_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "allow_auth_assignments" ON user_program_assignments
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "allow_auth_import_jobs" ON import_jobs
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- =============================================
-- 19. FUNCIÓN: Anonimización de paciente (ley colombiana)
-- =============================================
CREATE OR REPLACE FUNCTION anonymize_patient(p_patient_id BIGINT, p_reason TEXT DEFAULT 'RETIRO')
RETURNS VOID AS $$
BEGIN
  UPDATE patients SET
    first_name              = '(ANONIMIZADO)',
    second_name             = NULL,
    last_name               = '(ANONIMIZADO)',
    second_last_name        = NULL,
    document_number         = NULL,
    document_type_id        = NULL,
    phone                   = NULL,
    phone2                  = NULL,
    phone3                  = NULL,
    email                   = NULL,
    address                 = NULL,
    birth_date              = NULL,
    guardian_document_number = NULL,
    guardian_document_type_id = NULL,
    emergency_contact_name  = NULL,
    emergency_contact_phone = NULL,
    guardian_email          = NULL,
    guardian_address        = NULL,
    anonymized              = true,
    updated_at              = NOW()
  WHERE id = p_patient_id;

  -- Registrar en historial de estados
  INSERT INTO patient_status_history(patient_id, new_status, reason, changed_at)
  SELECT id, status, 'ANONIMIZADO: ' || p_reason, NOW()
  FROM patients WHERE id = p_patient_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- 20. FUNCIÓN: 360 view del paciente (para educadoras)
-- =============================================
CREATE OR REPLACE FUNCTION get_patient_360(p_patient_id BIGINT)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
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
      SELECT COALESCE(SUM(EXTRACT(DAY FROM (COALESCE(closed_at, NOW()) - opened_at))), 0)
      FROM barriers WHERE patient_id = p_patient_id AND status IN ('ABIERTA','EN_PROCESO')
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
      SELECT GREATEST(0, EXTRACT(DAY FROM (fecha_fin_medicamento - NOW()))::INTEGER)
      FROM entregas WHERE paciente_id = p_patient_id AND fecha_fin_medicamento IS NOT NULL
      ORDER BY fecha_fin_medicamento DESC LIMIT 1
    ),
    'tareasPendientesAlta', (
      SELECT COUNT(*) FROM tareas
      WHERE patient_id = p_patient_id AND estado = 'PENDIENTE' AND prioridad = 'ALTA'
    ),
    'proximaConsulta', (
      SELECT fecha_confirmada_proxima_consulta FROM consultas_medicas
      WHERE paciente_id = p_patient_id AND fecha_confirmada_proxima_consulta >= NOW()::DATE
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

-- Fin de migración v4
