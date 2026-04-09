-- Migration 002: Hook Before Sign In — Verificar bloqueo antes de permitir login
-- Ejecutar con: supabase db push --project-ref {ref}
-- Registrar en Supabase Dashboard > Authentication > Hooks > Before Sign In
-- Schema: public / Function: hook_before_sign_in

CREATE OR REPLACE FUNCTION public.hook_before_sign_in(event JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_user_id    UUID;
    v_ip         TEXT;
    v_rec        public.auth_login_attempts%ROWTYPE;
BEGIN
    -- Extraer user_id del evento de Supabase Auth
    v_user_id := (event ->> 'user_id')::UUID;

    -- Extraer IP del cliente (header x-forwarded-for o remote_addr)
    v_ip := COALESCE(
        event -> 'request' -> 'headers' ->> 'x-forwarded-for',
        event -> 'request' ->> 'remote_addr'
    );

    -- Obtener registro de intentos del operador
    SELECT * INTO v_rec
    FROM public.auth_login_attempts
    WHERE user_id = v_user_id;

    -- Si no existe registro: primer acceso del operador, continuar normalmente
    IF NOT FOUND THEN
        INSERT INTO public.auth_login_attempts (user_id, ip_address, attempt_count)
        VALUES (v_user_id, v_ip::INET, 0)
        ON CONFLICT (user_id) DO NOTHING;
        RETURN event;
    END IF;

    -- Verificar si hay bloqueo activo
    IF v_rec.locked_until IS NOT NULL AND v_rec.locked_until > now() THEN
        RETURN jsonb_build_object(
            'error', jsonb_build_object(
                'http_code', 429,
                'message',   'Cuenta temporalmente bloqueada por múltiples intentos fallidos. Intente más tarde.'
            )
        );
    END IF;

    -- Si el bloqueo ya expiró: limpiar el estado
    IF v_rec.locked_until IS NOT NULL AND v_rec.locked_until <= now() THEN
        UPDATE public.auth_login_attempts
        SET attempt_count = 0,
            locked_until  = NULL,
            last_attempt  = now(),
            ip_address    = v_ip::INET
        WHERE user_id = v_user_id;
    END IF;

    RETURN event;
END;
$$;

COMMENT ON FUNCTION public.hook_before_sign_in(JSONB) IS
    'Hook ejecutado antes de cada intento de login. Bloquea si el operador está en estado locked (BR-02).';

-- Otorgar ejecución al rol supabase_auth_admin (requerido por hooks de Supabase)
GRANT EXECUTE ON FUNCTION public.hook_before_sign_in(JSONB)
    TO supabase_auth_admin;

REVOKE EXECUTE ON FUNCTION public.hook_before_sign_in(JSONB)
    FROM PUBLIC, authenticated, anon;
