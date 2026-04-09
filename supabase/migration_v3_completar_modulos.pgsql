-- ============================================================
-- MIGRACIÓN v3: Completar módulos al 100%
-- Fecha: 2026-04-06
-- ============================================================

-- ─── 1. SEGUIMIENTOS — columnas faltantes ───────────────────
ALTER TABLE seguimientos
  ADD COLUMN IF NOT EXISTS titulo          TEXT,
  ADD COLUMN IF NOT EXISTS tipo_seguimiento VARCHAR(50),
  ADD COLUMN IF NOT EXISTS modalidad       VARCHAR(30);

-- Ampliar CHECK de tipo_contacto (DROP constraint, re-add con valores nuevos)
ALTER TABLE seguimientos DROP CONSTRAINT IF EXISTS seguimientos_tipo_contacto_check;
ALTER TABLE seguimientos ADD CONSTRAINT seguimientos_tipo_contacto_check
  CHECK (tipo_contacto IN (
    'VIRTUAL','PRESENCIAL','TELEFONICO',
    'TELEORIENTACION','WHATSAPP','EMAIL'
  ));

-- Ampliar CHECK de estado_tarea para incluir NO_EFECTIVA
ALTER TABLE seguimientos DROP CONSTRAINT IF EXISTS seguimientos_estado_tarea_check;
ALTER TABLE seguimientos ADD CONSTRAINT seguimientos_estado_tarea_check
  CHECK (estado_tarea IN (
    'PENDIENTE','EFECTIVA','CANCELADA','NO_EFECTIVA'
  ));

-- ─── 2. CRISIS DE PACIENTE ───────────────────────────────────
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

ALTER TABLE crisis_paciente ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS crisis_paciente_auth ON crisis_paciente
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── 3. HERIDAS DE PACIENTE ──────────────────────────────────
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

ALTER TABLE heridas_paciente ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS heridas_paciente_auth ON heridas_paciente
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ─── 4. PARACLINICOS — columna url_resultado ─────────────────
ALTER TABLE paraclinicos
  ADD COLUMN IF NOT EXISTS url_resultado TEXT;

-- ─── 5. CONFIGURACION — tabla de configuración de sistema ────
CREATE TABLE IF NOT EXISTS system_config (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  config_key    VARCHAR(100) NOT NULL,
  config_value  TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (tenant_id, config_key)
);

ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS system_config_auth ON system_config
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Seed inicial de configuración para el tenant por defecto
INSERT INTO system_config (tenant_id, config_key, config_value) VALUES
  ('00000000-0000-0000-0000-000000000001', 'notif_email',            'true'),
  ('00000000-0000-0000-0000-000000000001', 'notif_push',             'true'),
  ('00000000-0000-0000-0000-000000000001', 'notif_tareas_vencidas',  'true'),
  ('00000000-0000-0000-0000-000000000001', 'notif_recordatorios',    'true'),
  ('00000000-0000-0000-0000-000000000001', 'dias_max_sin_seguimiento','30'),
  ('00000000-0000-0000-0000-000000000001', 'dias_alerta_barrera',    '15'),
  ('00000000-0000-0000-0000-000000000001', 'max_intentos_contacto',  '5')
ON CONFLICT (tenant_id, config_key) DO NOTHING;
