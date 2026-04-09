"""Submódulo de autenticación — verificación de JWT emitidos por Supabase Auth."""

from entrevista_shared.auth.supabase_jwt_verifier import verify_supabase_token

__all__ = ["verify_supabase_token"]
