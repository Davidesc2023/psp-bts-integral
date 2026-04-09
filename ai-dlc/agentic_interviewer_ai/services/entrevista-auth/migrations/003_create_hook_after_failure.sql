-- Migration 003: Hook After Sign In Failure — Incrementar contador y aplicar lockout progresivo
-- Ejecutar con: supabase db push --project-ref {ref}
--
-- NOTA: Supabase Auth actualmente (v2) no expone un hook "after_sign_in_failure" nativo.
-- Si no está disponible en el proyecto, usar el trigger alternativo sobre auth.audit_log_entries
-- comentado al final de este archivo.
--
-- Registrar en Supabase Dashboard > Authentication > Hooks > After Sign In Failure (si disponible)
-- Schema: public / Function: hook_after_sign_in_failure

CREATE OR REPLACE FUNCTION public.hook_after_sign_in_failure(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id UUID;
    v_ip      TEXT;
    v_count   INTEGER;
    v_until   TIMESTAMPTZ;
BEGIN
    v_user_id := (event ->> 'user_id')::UUID;
    v_ip      := COALESCE(
        event -> 'request' -> 'headers' ->> 'x-forwarded-for',
        event -> 'request' ->> 'remote_addr'
    );

    -- Insertar o actualizar registro de intentos
    INSERT INTO public.auth_login_attempts (user_id, ip_address, attempt_count, last_attempt)
    VALUES (v_user_id, v_ip::INET, 1, now())
    ON CONFLICT (user_id) DO UPDATE
        SET attempt_count = public.auth_login_attempts.attempt_count + 1,
            last_attempt  = now(),
            ip_address    = EXCLUDED.ip_address
    RETURNING attempt_count INTO v_count;

    -- Aplicar lockout progresivo según BR-02
    -- Tier 1: 3–4 intentos → 15 minutos
    -- Tier 2: 5–9 intentos → 30 minutos
    -- Tier 3: ≥10 intentos → 60 minutos
    IF v_count >= 10 THEN
        v_until := now() + INTERVAL '60 minutes';
    ELSIF v_count >= 5 THEN
        v_until := now() + INTERVAL '30 minutes';
    ELSIF v_count >= 3 THEN
        v_until := now() + INTERVAL '15 minutes';
    END IF;

    IF v_until IS NOT NULL THEN
        UPDATE public.auth_login_attempts
        SET locked_until = v_until
        WHERE user_id = v_user_id;
    END IF;

    RETURN event;
END;
$$;

COMMENT ON FUNCTION public.hook_after_sign_in_failure(JSONB) IS
    'Hook ejecutado tras cada login fallido. Incrementa el contador y aplica lockout progresivo (BR-02): 3-4→15min, 5-9→30min, ≥10→60min.';

GRANT EXECUTE ON FUNCTION public.hook_after_sign_in_failure(JSONB)
    TO supabase_auth_admin;

REVOKE EXECUTE ON FUNCTION public.hook_after_sign_in_failure(JSONB)
    FROM PUBLIC, authenticated, anon;


-- ============================================================
-- ALTERNATIVA: Trigger sobre auth.audit_log_entries
-- Usar si el hook "after_sign_in_failure" no está disponible
-- en la versión del proyecto de Supabase.
-- ============================================================
-- CREATE OR REPLACE FUNCTION public.trg_audit_login_failure()
-- RETURNS TRIGGER
-- LANGUAGE plpgsql
-- SECURITY DEFINER
-- SET search_path = public
-- AS $$
-- DECLARE
--     v_user_id UUID;
--     v_ip      TEXT;
-- BEGIN
--     -- Solo procesar eventos de login fallido
--     IF NEW.payload ->> 'action' != 'login_failed' THEN
--         RETURN NEW;
--     END IF;
--
--     v_user_id := (NEW.payload ->> 'actor_id')::UUID;
--     v_ip      := NEW.ip_address::TEXT;
--
--     -- Reutilizar la misma lógica de hook_after_sign_in_failure
--     PERFORM public.hook_after_sign_in_failure(
--         jsonb_build_object(
--             'user_id', v_user_id,
--             'request', jsonb_build_object(
--                 'remote_addr', v_ip
--             )
--         )
--     );
--
--     RETURN NEW;
-- END;
-- $$;
--
-- CREATE TRIGGER trg_after_login_failure
--     AFTER INSERT ON auth.audit_log_entries
--     FOR EACH ROW
--     EXECUTE FUNCTION public.trg_audit_login_failure();
