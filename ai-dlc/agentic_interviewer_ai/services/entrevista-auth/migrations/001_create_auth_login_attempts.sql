-- Migration 001: Tabla de seguimiento de intentos de login para brute force protection (GAP-01)
-- Ejecutar con: supabase db push --project-ref {ref}
-- Requisito: BR-02 — Lockout progresivo (15/30/60 min)

-- ============================================================
-- TABLA: public.auth_login_attempts
-- ============================================================
CREATE TABLE IF NOT EXISTS public.auth_login_attempts (
    user_id       UUID         NOT NULL,
    ip_address    INET,
    attempt_count INTEGER      NOT NULL DEFAULT 0,
    last_attempt  TIMESTAMPTZ  NOT NULL DEFAULT now(),
    locked_until  TIMESTAMPTZ,

    CONSTRAINT pk_auth_login_attempts PRIMARY KEY (user_id)
);

COMMENT ON TABLE  public.auth_login_attempts                IS 'Seguimiento de intentos fallidos de login para protección contra fuerza bruta (BR-02).';
COMMENT ON COLUMN public.auth_login_attempts.user_id        IS 'Referencia a auth.users.id';
COMMENT ON COLUMN public.auth_login_attempts.ip_address     IS 'IP del último intento fallido (para detección de ataques en red)';
COMMENT ON COLUMN public.auth_login_attempts.attempt_count  IS 'Contador de intentos fallidos consecutivos. Se resetea a 0 tras login exitoso.';
COMMENT ON COLUMN public.auth_login_attempts.last_attempt   IS 'Timestamp del último intento fallido.';
COMMENT ON COLUMN public.auth_login_attempts.locked_until   IS 'NULL si no bloqueado. Si > now(), el operador está bloqueado.';

-- ============================================================
-- ÍNDICES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_ip
    ON public.auth_login_attempts (ip_address);

CREATE INDEX IF NOT EXISTS idx_auth_login_attempts_locked
    ON public.auth_login_attempts (locked_until)
    WHERE locked_until IS NOT NULL;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.auth_login_attempts ENABLE ROW LEVEL SECURITY;

-- Solo el rol service_role puede leer/escribir esta tabla
-- Los hooks PL/pgSQL usan SECURITY DEFINER y bypass RLS automáticamente
CREATE POLICY "service_role_full_access" ON public.auth_login_attempts
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Denegar acceso al rol authenticated por defecto
-- (No hay motivo para que un operador vea sus propios registros de lockout)
