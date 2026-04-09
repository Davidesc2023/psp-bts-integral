-- ============================================================
-- MIGRACIÓN: Anonimización automática Ley 1581/2012 Colombia
-- Aplica cuando patients.status cambia a DROP_OUT, FALLECIDO
-- o RETIRADO. Segunda línea de defensa tras el service frontend.
-- ============================================================

-- Función que aplica el parche
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
    NEW.first_name                  := 'ANONIMIZADO';
    NEW.second_name                 := NULL;
    NEW.last_name                   := 'ANONIMIZADO';
    NEW.second_last_name            := NULL;
    NEW.iniciales                   := '##';
    -- Conserva últimos 4 dígitos del documento para trazabilidad legal
    NEW.document_number             := '***' || RIGHT(COALESCE(NEW.document_number, ''), 4);
    NEW.email                       := NULL;
    NEW.phone                       := NULL;
    NEW.phone2                      := NULL;
    NEW.address                     := NULL;
    NEW.neighborhood                := NULL;
    NEW.emergency_contact_name      := NULL;
    NEW.emergency_contact_phone     := NULL;
    NEW.emergency_contact_relationship := NULL;
    NEW.guardian_document_number    := NULL;
    NEW.guardian_email              := NULL;
    NEW.guardian_address            := NULL;
    NEW.marital_status              := NULL;
    NEW.occupation                  := NULL;
    NEW.anonymized                  := TRUE;
    NEW.updated_at                  := NOW();
  END IF;

  RETURN NEW;
END;
$$;

-- Trigger BEFORE UPDATE para interceptar antes de escribir
DROP TRIGGER IF EXISTS trg_anonymize_patient ON patients;

CREATE TRIGGER trg_anonymize_patient
  BEFORE UPDATE ON patients
  FOR EACH ROW
  EXECUTE FUNCTION anonymize_patient_pii();
