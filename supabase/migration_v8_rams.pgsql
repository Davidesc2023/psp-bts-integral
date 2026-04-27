-- TASK-015: Módulo RAM (Reacción Adversa a Medicamentos)
-- Crea tabla dedicada para registrar RAMs por paciente

CREATE TABLE IF NOT EXISTS rams (
  id            BIGSERIAL PRIMARY KEY,
  tenant_id     UUID NOT NULL REFERENCES tenants(id),
  paciente_id   BIGINT NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  medicamento_id BIGINT REFERENCES medications(id),
  fecha_ram     DATE NOT NULL DEFAULT CURRENT_DATE,
  descripcion   TEXT NOT NULL,
  gravedad      VARCHAR(20) NOT NULL DEFAULT 'LEVE'
                  CHECK (gravedad IN ('LEVE', 'MODERADA', 'GRAVE', 'MORTAL')),
  estado        VARCHAR(20) NOT NULL DEFAULT 'ACTIVA'
                  CHECK (estado IN ('ACTIVA', 'RESUELTA', 'EN_SEGUIMIENTO')),
  reportado_a_invima BOOLEAN NOT NULL DEFAULT false,
  observaciones TEXT,
  registrado_por TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_rams_tenant      ON rams(tenant_id);
CREATE INDEX IF NOT EXISTS idx_rams_paciente    ON rams(paciente_id);
CREATE INDEX IF NOT EXISTS idx_rams_fecha       ON rams(fecha_ram DESC);

-- RLS
ALTER TABLE rams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "rams_tenant_isolation" ON rams;
DROP POLICY IF EXISTS "rams_tenant_select" ON rams;
DROP POLICY IF EXISTS "rams_tenant_insert" ON rams;
DROP POLICY IF EXISTS "rams_tenant_update" ON rams;
DROP POLICY IF EXISTS "rams_tenant_delete" ON rams;

CREATE POLICY "rams_tenant_select" ON rams
  FOR SELECT TO authenticated
  USING (tenant_id = auth_tenant_id());

CREATE POLICY "rams_tenant_insert" ON rams
  FOR INSERT TO authenticated
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY "rams_tenant_update" ON rams
  FOR UPDATE TO authenticated
  USING (tenant_id = auth_tenant_id())
  WITH CHECK (tenant_id = auth_tenant_id());

CREATE POLICY "rams_tenant_delete" ON rams
  FOR DELETE TO authenticated
  USING (tenant_id = auth_tenant_id());

-- Trigger updated_at
CREATE OR REPLACE FUNCTION update_rams_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rams_updated_at ON rams;
CREATE TRIGGER trg_rams_updated_at
  BEFORE UPDATE ON rams
  FOR EACH ROW EXECUTE FUNCTION update_rams_updated_at();

-- Función para notificar RAM al coordinador
CREATE OR REPLACE FUNCTION notify_new_ram()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO notifications (tenant_id, tipo, titulo, mensaje, prioridad, data)
  VALUES (
    NEW.tenant_id,
    'RAM',
    'Nueva RAM registrada',
    format('Se registró una RAM de gravedad %s para el paciente id=%s', NEW.gravedad, NEW.paciente_id),
    CASE NEW.gravedad
      WHEN 'MORTAL' THEN 'CRITICA'
      WHEN 'GRAVE'  THEN 'ALTA'
      WHEN 'MODERADA' THEN 'MEDIA'
      ELSE 'BAJA'
    END,
    jsonb_build_object('paciente_id', NEW.paciente_id, 'ram_id', NEW.id, 'gravedad', NEW.gravedad)
  )
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_ram ON rams;
CREATE TRIGGER trg_notify_ram
  AFTER INSERT ON rams
  FOR EACH ROW EXECUTE FUNCTION notify_new_ram();
