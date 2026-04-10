-- ============================================================
-- PSP · SINCRONIZACIÓN COMPLETA DE ESQUEMA
-- migration_sync_completo.sql
-- Generado: 2026-04-10
-- ============================================================
-- Aplica TODOS los cambios acumulados de migrations anteriores
-- que pueden no haber sido ejecutados en Supabase.
-- Es 100 % IDEMPOTENTE: seguro de re-ejecutar.
-- NO elimina datos ni rompe RLS existente.
-- ============================================================
-- CÓMO EJECUTAR:
--   Supabase Dashboard → SQL Editor → pegar y ejecutar
--   (requiere rol superuser o service_role)
-- ============================================================


-- ============================================================
-- BLOQUE 1: patients — columnas base faltantes (migration_pacientes_v2)
-- ============================================================
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS fecha_ingreso               DATE,           -- fecha de ingreso al programa (alias legacy)
  ADD COLUMN IF NOT EXISTS fecha_inicio_tratamiento    DATE;           -- fecha de inicio de tratamiento


-- ============================================================
-- BLOQUE 2: patients — columnas sociodemográficas
--           (migration_patients_sociodemographic_columns)
-- ============================================================
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS marital_status   TEXT,    -- estado civil (texto libre / catálogo)
  ADD COLUMN IF NOT EXISTS education_level  TEXT,    -- nivel educativo
  ADD COLUMN IF NOT EXISTS occupation       TEXT,    -- ocupación
  ADD COLUMN IF NOT EXISTS residence_zone   TEXT;    -- zona de residencia (urbana/rural)


-- ============================================================
-- BLOQUE 3: patients — columnas v4 (el bloque más grande)
--           (migration_v4_campos_nuevos)
-- ============================================================
ALTER TABLE patients
  -- Identificación adicional
  ADD COLUMN IF NOT EXISTS iniciales           VARCHAR(20),
  ADD COLUMN IF NOT EXISTS codigo_paciente     VARCHAR(50),   -- sin UNIQUE aquí para idempotencia

  -- Teléfonos adicionales
  ADD COLUMN IF NOT EXISTS phone3              VARCHAR(20),

  -- Geografía adicional
  ADD COLUMN IF NOT EXISTS comunidad           VARCHAR(200),
  ADD COLUMN IF NOT EXISTS barrio              VARCHAR(200),

  -- Acudiente ampliado
  ADD COLUMN IF NOT EXISTS guardian_document_type_id  INTEGER REFERENCES document_types(id),
  ADD COLUMN IF NOT EXISTS guardian_document_number   VARCHAR(30),
  ADD COLUMN IF NOT EXISTS guardian_email             VARCHAR(150),
  ADD COLUMN IF NOT EXISTS guardian_address           TEXT,

  -- Clínico / Programa
  ADD COLUMN IF NOT EXISTS ips_tratante_principal_id  INTEGER REFERENCES ips(id),
  ADD COLUMN IF NOT EXISTS enfermedad                 TEXT,
  ADD COLUMN IF NOT EXISTS otros_diagnosticos         TEXT,
  ADD COLUMN IF NOT EXISTS otros_medicamentos         TEXT,
  ADD COLUMN IF NOT EXISTS tratamiento_id             INTEGER REFERENCES medications(id),
  ADD COLUMN IF NOT EXISTS laboratorio_id             INTEGER REFERENCES laboratories(id),
  ADD COLUMN IF NOT EXISTS medico_id                  INTEGER REFERENCES doctors(id),

  -- Fechas clave del programa
  ADD COLUMN IF NOT EXISTS fecha_ingreso_psp               DATE,
  ADD COLUMN IF NOT EXISTS fecha_activacion                DATE,
  -- fecha_inicio_tratamiento ya agregada en BLOQUE 1
  ADD COLUMN IF NOT EXISTS fecha_retiro                    DATE,
  ADD COLUMN IF NOT EXISTS motivo_retiro                   TEXT,
  ADD COLUMN IF NOT EXISTS cambio_tratamiento_destino      TEXT,

  -- Subestado y campos operativos
  ADD COLUMN IF NOT EXISTS subestado           VARCHAR(100),
  ADD COLUMN IF NOT EXISTS msl                 VARCHAR(200),
  ADD COLUMN IF NOT EXISTS ram                 TEXT,
  ADD COLUMN IF NOT EXISTS educador_id         UUID REFERENCES user_profiles(id),
  ADD COLUMN IF NOT EXISTS coordinador_id      UUID REFERENCES user_profiles(id),
  ADD COLUMN IF NOT EXISTS fundacion           VARCHAR(200),
  ADD COLUMN IF NOT EXISTS observaciones       TEXT,

  -- Tutela (amparo judicial)
  ADD COLUMN IF NOT EXISTS tutela_si_no        BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS fallo_tutela        TEXT,

  -- Vacunas (JSON array)
  ADD COLUMN IF NOT EXISTS vacunas             JSONB DEFAULT '[]'::jsonb,

  -- Documentos y consentimientos (checklist)
  ADD COLUMN IF NOT EXISTS tiene_consentimiento_tratamiento  BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tiene_consentimiento_psp          BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tiene_carta_red_apoyo             BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tiene_identificacion              BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tiene_identificacion_acudiente    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tiene_cert_vacunacion             BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tiene_carta_necesidad_medica      BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tiene_reporte_sivigila            BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tiene_reporte_farmacovigilancia   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS tiene_evidencia_tutela            BOOLEAN DEFAULT false;

-- Índice único en codigo_paciente (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
     WHERE tablename = 'patients' AND indexname = 'patients_codigo_paciente_key'
  ) THEN
    ALTER TABLE patients ADD UNIQUE (codigo_paciente);
  END IF;
END $$;

-- Índices operativos adicionales (todos IF NOT EXISTS)
CREATE INDEX IF NOT EXISTS idx_patients_codigo       ON patients(codigo_paciente);
CREATE INDEX IF NOT EXISTS idx_patients_educador     ON patients(educador_id);
CREATE INDEX IF NOT EXISTS idx_patients_coordinador  ON patients(coordinador_id);
CREATE INDEX IF NOT EXISTS idx_patients_laboratorio  ON patients(laboratorio_id);
CREATE INDEX IF NOT EXISTS idx_patients_tratamiento  ON patients(tratamiento_id);


-- ============================================================
-- BLOQUE 4: patients — columna de anonimización v5
--           (migration_v5_security_hardening / backend/005)
-- ============================================================
ALTER TABLE patients
  ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMPTZ;

-- Retroactivamente completar filas ya anonimizadas
UPDATE patients
   SET anonymized_at = updated_at
 WHERE anonymized = true
   AND anonymized_at IS NULL;


-- ============================================================
-- BLOQUE 5: patients — constraint CHECK de status
-- Incluye todos los valores válidos (schema + v2 + v4)
-- ============================================================
ALTER TABLE patients DROP CONSTRAINT IF EXISTS patients_status_check;
ALTER TABLE patients
  ADD CONSTRAINT patients_status_check
  CHECK (status IN (
    'EN_PROCESO',
    'ACTIVO',
    'PRESCRITO_SIN_INICIO',
    'SUSPENDIDO',
    'INTERRUMPIDO',
    'DROP_OUT',
    'INACTIVO',
    'FALLECIDO',
    'RETIRADO'
  ));


-- ============================================================
-- BLOQUE 6: medications — columnas v4
-- ============================================================
ALTER TABLE medications
  ADD COLUMN IF NOT EXISTS via_administracion  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS tipo_administracion VARCHAR(50),
  ADD COLUMN IF NOT EXISTS unidades_ml         DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS forma_farmaceutica  VARCHAR(100),
  ADD COLUMN IF NOT EXISTS programa_id         UUID REFERENCES programas_psp(id),
  ADD COLUMN IF NOT EXISTS laboratorio_id      INTEGER REFERENCES laboratories(id);


-- ============================================================
-- BLOQUE 7: laboratories — columnas v4
-- ============================================================
ALTER TABLE laboratories
  ADD COLUMN IF NOT EXISTS nit             VARCHAR(30),
  ADD COLUMN IF NOT EXISTS email           VARCHAR(150),
  ADD COLUMN IF NOT EXISTS representante   VARCHAR(200),
  ADD COLUMN IF NOT EXISTS descripcion     TEXT;


-- ============================================================
-- BLOQUE 8: seguimientos — columnas v3
-- ============================================================
ALTER TABLE seguimientos
  ADD COLUMN IF NOT EXISTS titulo           TEXT,
  ADD COLUMN IF NOT EXISTS tipo_seguimiento VARCHAR(50),
  ADD COLUMN IF NOT EXISTS modalidad        VARCHAR(30);

-- Ampliar CHECK tipo_contacto para incluir valores v3
ALTER TABLE seguimientos DROP CONSTRAINT IF EXISTS seguimientos_tipo_contacto_check;
ALTER TABLE seguimientos
  ADD CONSTRAINT seguimientos_tipo_contacto_check
  CHECK (tipo_contacto IN (
    'VIRTUAL', 'PRESENCIAL', 'TELEFONICO',
    'TELEORIENTACION', 'WHATSAPP', 'EMAIL'
  ));

-- Ampliar CHECK estado_tarea para incluir NO_EFECTIVA
ALTER TABLE seguimientos DROP CONSTRAINT IF EXISTS seguimientos_estado_tarea_check;
ALTER TABLE seguimientos
  ADD CONSTRAINT seguimientos_estado_tarea_check
  CHECK (estado_tarea IN (
    'PENDIENTE', 'EFECTIVA', 'CANCELADA', 'NO_EFECTIVA'
  ));


-- ============================================================
-- BLOQUE 9: paraclinicos — columna url_resultado (v3)
-- ============================================================
ALTER TABLE paraclinicos
  ADD COLUMN IF NOT EXISTS url_resultado TEXT;


-- ============================================================
-- BLOQUE 10: transportes — columnas v2
-- ============================================================
ALTER TABLE transportes
  ADD COLUMN IF NOT EXISTS paciente_nombre        VARCHAR(300),
  ADD COLUMN IF NOT EXISTS direccion_origen        TEXT,
  ADD COLUMN IF NOT EXISTS barrio_origen           VARCHAR(200),
  ADD COLUMN IF NOT EXISTS municipio_origen        VARCHAR(200),
  ADD COLUMN IF NOT EXISTS departamento_origen     VARCHAR(200),
  ADD COLUMN IF NOT EXISTS telefono_contacto       VARCHAR(30),
  ADD COLUMN IF NOT EXISTS tratamiento             VARCHAR(200),
  ADD COLUMN IF NOT EXISTS direccion_destino       TEXT,
  ADD COLUMN IF NOT EXISTS barrio_destino          VARCHAR(200),
  ADD COLUMN IF NOT EXISTS municipio_destino       VARCHAR(200),
  ADD COLUMN IF NOT EXISTS departamento_destino    VARCHAR(200),
  ADD COLUMN IF NOT EXISTS nombre_ips_destino      VARCHAR(300),
  ADD COLUMN IF NOT EXISTS hora_servicio           TIME,
  ADD COLUMN IF NOT EXISTS fecha_regreso           DATE,
  ADD COLUMN IF NOT EXISTS hora_regreso            TIME,
  ADD COLUMN IF NOT EXISTS requiere_acompanante    BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS nombre_acompanante      VARCHAR(200),
  ADD COLUMN IF NOT EXISTS gestora_solicitante     VARCHAR(200),
  ADD COLUMN IF NOT EXISTS requerimiento_transporte TEXT,
  ADD COLUMN IF NOT EXISTS condiciones_especiales  TEXT,
  ADD COLUMN IF NOT EXISTS comentarios             TEXT,
  ADD COLUMN IF NOT EXISTS fecha_cierre            TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS observaciones_cierre    TEXT,
  ADD COLUMN IF NOT EXISTS quien_cierra            VARCHAR(200);


-- ============================================================
-- BLOQUE 11: servicios_complementarios — columna resultado (v2)
-- ============================================================
ALTER TABLE servicios_complementarios
  ADD COLUMN IF NOT EXISTS resultado TEXT;


-- ============================================================
-- BLOQUE 12: user_profiles — ampliar roles válidos
--            (migration_roles_alignment)
-- ============================================================
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS user_profiles_role_check;
ALTER TABLE user_profiles
  ADD CONSTRAINT user_profiles_role_check
  CHECK (role IN (
    'SUPER_ADMIN',
    'ADMIN_INSTITUCION',
    'MEDICO',
    'ENFERMERIA',
    'COORDINADOR',
    'EDUCADORA',
    'FARMACEUTICA',
    'AUDITOR',
    'MSL',
    'PACIENTE',
    'CUIDADOR'
  ));


-- ============================================================
-- BLOQUE 13: Crear tablas nuevas si no existen (v3 / v4)
-- ============================================================

-- crisis_paciente (v3)
CREATE TABLE IF NOT EXISTS crisis_paciente (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  patient_id    BIGINT NOT NULL REFERENCES patients(id),
  fecha_crisis  DATE NOT NULL DEFAULT CURRENT_DATE,
  numero_crisis INT NOT NULL DEFAULT 1,
  crisis_tratadas INT NOT NULL DEFAULT 0,
  medicamento_usado TEXT,
  estado        VARCHAR(20) NOT NULL DEFAULT 'EFECTIVA'
                CHECK (estado IN ('EFECTIVA','NO_EFECTIVA')),
  observaciones TEXT,
  created_by    UUID,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_crisis_patient ON crisis_paciente(patient_id);
CREATE INDEX IF NOT EXISTS idx_crisis_tenant  ON crisis_paciente(tenant_id);

-- heridas_paciente (v3)
CREATE TABLE IF NOT EXISTS heridas_paciente (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       UUID NOT NULL REFERENCES tenants(id),
  patient_id      BIGINT NOT NULL REFERENCES patients(id),
  fecha_herida    DATE NOT NULL DEFAULT CURRENT_DATE,
  numero_heridas  INT NOT NULL DEFAULT 1,
  heridas_tratadas INT NOT NULL DEFAULT 0,
  estado          VARCHAR(20) NOT NULL DEFAULT 'EFECTIVA'
                  CHECK (estado IN ('EFECTIVA','NO_EFECTIVA')),
  observaciones   TEXT,
  created_by      UUID,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_heridas_patient ON heridas_paciente(patient_id);
CREATE INDEX IF NOT EXISTS idx_heridas_tenant  ON heridas_paciente(tenant_id);

-- system_config (v3)
CREATE TABLE IF NOT EXISTS system_config (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   UUID NOT NULL REFERENCES tenants(id),
  config_key  VARCHAR(100) NOT NULL,
  config_value TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, config_key)
);
CREATE INDEX IF NOT EXISTS idx_system_config_tenant ON system_config(tenant_id);

-- patient_status_config (v4)
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
CREATE INDEX IF NOT EXISTS idx_psc_tenant  ON patient_status_config(tenant_id);
CREATE INDEX IF NOT EXISTS idx_psc_codigo  ON patient_status_config(codigo);

-- consultas_medicas (v4)
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
CREATE INDEX IF NOT EXISTS idx_consultas_tenant   ON consultas_medicas(tenant_id);
CREATE INDEX IF NOT EXISTS idx_consultas_fecha    ON consultas_medicas(fecha_consulta);


-- ============================================================
-- BLOQUE 14: Función helper auth_tenant_id() — RLS multi-tenant
--            (idempotente con CREATE OR REPLACE)
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
-- BLOQUE 15: RLS en patients — políticas tenant reales
-- (elimina permisivas del schema original y re-aplica v5)
-- ============================================================
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

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
-- BLOQUE 16: RLS en tablas operativas — seguro e idempotente
--            Solo actúa sobre tablas que existen Y tienen tenant_id
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
    'crisis_paciente', 'heridas_paciente', 'system_config'
  ];
BEGIN
  FOREACH t IN ARRAY names LOOP

    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
       WHERE table_schema = 'public' AND table_name = t
    ) INTO has_table;

    IF NOT has_table THEN
      RAISE NOTICE 'sync: Tabla "%" no existe → saltando', t;
      CONTINUE;
    END IF;

    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
       WHERE table_schema = 'public'
         AND table_name   = t
         AND column_name  = 'tenant_id'
    ) INTO has_col;

    IF NOT has_col THEN
      RAISE NOTICE 'sync: Tabla "%" sin tenant_id → saltando', t;
      CONTINUE;
    END IF;

    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);

    -- Eliminar políticas de todos los patrones conocidos
    EXECUTE format('DROP POLICY IF EXISTS "auth_read_%s"      ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_insert_%s"    ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_update_%s"    ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "auth_delete_%s"    ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "allow_auth_%s"     ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_select_%s"  ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_insert_%s"  ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_update_%s"  ON %I', t, t);
    EXECUTE format('DROP POLICY IF EXISTS "tenant_delete_%s"  ON %I', t, t);

    -- Políticas por tenant
    EXECUTE format(
      'CREATE POLICY "tenant_select_%s" ON %I FOR SELECT TO authenticated USING (tenant_id = auth_tenant_id())',
      t, t);
    EXECUTE format(
      'CREATE POLICY "tenant_insert_%s" ON %I FOR INSERT TO authenticated WITH CHECK (tenant_id = auth_tenant_id())',
      t, t);
    EXECUTE format(
      'CREATE POLICY "tenant_update_%s" ON %I FOR UPDATE TO authenticated USING (tenant_id = auth_tenant_id()) WITH CHECK (tenant_id = auth_tenant_id())',
      t, t);
    EXECUTE format(
      'CREATE POLICY "tenant_delete_%s" ON %I FOR DELETE TO authenticated USING (tenant_id = auth_tenant_id())',
      t, t);

  END LOOP;
END $$;


-- ============================================================
-- BLOQUE 17: Trigger de anonimización definitivo (v5)
--            Incluye phone3, comunidad, barrio, anonymized_at
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
-- BLOQUE 18: VERIFICACIÓN FINAL
-- Ejecutar después de aplicar el script para confirmar éxito.
-- ============================================================

-- Columnas críticas de patients
SELECT column_name, data_type, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name   = 'patients'
 ORDER BY ordinal_position;

-- Políticas RLS activas en patients
SELECT policyname, cmd, qual, with_check
  FROM pg_policies
 WHERE tablename = 'patients'
 ORDER BY policyname;

-- Verificar auth_tenant_id() existe
SELECT proname FROM pg_proc WHERE proname = 'auth_tenant_id';

-- Verificar tablas nuevas
SELECT table_name
  FROM information_schema.tables
 WHERE table_schema = 'public'
   AND table_name IN (
     'crisis_paciente', 'heridas_paciente', 'system_config',
     'patient_status_config', 'consultas_medicas'
   )
 ORDER BY table_name;
