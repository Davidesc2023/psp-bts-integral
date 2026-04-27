-- ============================================================
-- MIGRATION v7: Auto-asignación de código de paciente
-- PSP-BTS — 2026-04-27
-- Aplica: Supabase SQL Editor
-- ============================================================

-- 1. Función que genera el código: PSP0001, PSP0002... por tenant
CREATE OR REPLACE FUNCTION fn_assign_patient_code()
RETURNS TRIGGER AS $$
DECLARE
  v_seq   INTEGER;
  v_prefix TEXT := 'PSP';
BEGIN
  -- No sobreescribir si ya viene asignado
  IF NEW.codigo_paciente IS NOT NULL AND NEW.codigo_paciente <> '' THEN
    RETURN NEW;
  END IF;

  -- Calcular siguiente secuencia dentro del tenant
  SELECT COALESCE(
    MAX(
      CAST(
        NULLIF(REGEXP_REPLACE(codigo_paciente, '^[A-Z]+', ''), '') AS INTEGER
      )
    ), 0
  ) + 1
  INTO v_seq
  FROM patients
  WHERE tenant_id = NEW.tenant_id
    AND deleted = false
    AND codigo_paciente IS NOT NULL
    AND codigo_paciente ~ '^PSP[0-9]+$';

  NEW.codigo_paciente := v_prefix || LPAD(v_seq::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Crear trigger BEFORE INSERT
DROP TRIGGER IF EXISTS trg_assign_patient_code ON patients;

CREATE TRIGGER trg_assign_patient_code
  BEFORE INSERT ON patients
  FOR EACH ROW
  EXECUTE FUNCTION fn_assign_patient_code();

-- 3. Back-fill: asignar códigos a pacientes que no tienen
DO $$
DECLARE
  rec RECORD;
  v_seq INTEGER;
BEGIN
  FOR rec IN
    SELECT id, tenant_id
    FROM patients
    WHERE (codigo_paciente IS NULL OR codigo_paciente = '')
      AND deleted = false
    ORDER BY tenant_id, created_at
  LOOP
    SELECT COALESCE(
      MAX(CAST(NULLIF(REGEXP_REPLACE(codigo_paciente, '^[A-Z]+', ''), '') AS INTEGER)), 0
    ) + 1
    INTO v_seq
    FROM patients
    WHERE tenant_id = rec.tenant_id
      AND deleted = false
      AND codigo_paciente IS NOT NULL
      AND codigo_paciente ~ '^PSP[0-9]+$';

    UPDATE patients
    SET codigo_paciente = 'PSP' || LPAD(v_seq::TEXT, 4, '0')
    WHERE id = rec.id;
  END LOOP;
END;
$$;

-- Verificar resultado
SELECT id, first_name, last_name, codigo_paciente
FROM patients
WHERE deleted = false
ORDER BY tenant_id, codigo_paciente
LIMIT 20;
