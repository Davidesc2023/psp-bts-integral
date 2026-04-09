"""
Tests unitarios para supabase_jwt_verifier.

Cobertura:
  - Token válido → retorna payload
  - Token expirado → InvalidTokenError
  - Algoritmo incorrecto (RS256) → InvalidTokenError
  - Role no permitido → InvalidTokenError
  - SUPABASE_JWT_SECRET no configurada → RuntimeError
  - Cache hit → env var solo se lee una vez por TTL
"""

from __future__ import annotations

import time
from unittest.mock import patch

import jwt
import pytest

import entrevista_shared.auth.supabase_jwt_verifier as verifier_module
from entrevista_shared.auth.supabase_jwt_verifier import verify_supabase_token

_SECRET = "test-super-secret-jwt-key-at-least-32-chars-long"


def _make_token(
    payload: dict,
    secret: str = _SECRET,
    algorithm: str = "HS256",
) -> str:
    return jwt.encode(payload, secret, algorithm=algorithm)


def _base_payload(role: str = "authenticated", exp_offset: int = 900) -> dict:
    return {
        "sub": "user-abc-123",
        "role": role,
        "exp": int(time.time()) + exp_offset,
    }


# ---------------------------------------------------------------------------
# Fixture: limpiar cache antes de cada test
# ---------------------------------------------------------------------------
@pytest.fixture(autouse=True)
def reset_secret_cache():
    """Resetea el cache del secret antes de cada test para aislar efectos."""
    original_secret = verifier_module._SUPABASE_JWT_SECRET
    original_loaded_at = verifier_module._SECRET_LOADED_AT
    verifier_module._SUPABASE_JWT_SECRET = None
    verifier_module._SECRET_LOADED_AT = 0.0
    yield
    verifier_module._SUPABASE_JWT_SECRET = original_secret
    verifier_module._SECRET_LOADED_AT = original_loaded_at


# ---------------------------------------------------------------------------
# Casos de éxito
# ---------------------------------------------------------------------------
class TestVerifySupabaseTokenSuccess:
    def test_valid_authenticated_token_returns_payload(self):
        token = _make_token(_base_payload(role="authenticated"))

        with patch.dict("os.environ", {"SUPABASE_JWT_SECRET": _SECRET}):
            payload = verify_supabase_token(token)

        assert payload["sub"] == "user-abc-123"
        assert payload["role"] == "authenticated"

    def test_valid_service_role_token_returns_payload(self):
        token = _make_token(_base_payload(role="service_role"))

        with patch.dict("os.environ", {"SUPABASE_JWT_SECRET": _SECRET}):
            payload = verify_supabase_token(token)

        assert payload["role"] == "service_role"


# ---------------------------------------------------------------------------
# Casos de error: token inválido
# ---------------------------------------------------------------------------
class TestVerifySupabaseTokenInvalidToken:
    def test_expired_token_raises_invalid_token_error(self):
        token = _make_token(_base_payload(exp_offset=-10))  # ya expiró

        with patch.dict("os.environ", {"SUPABASE_JWT_SECRET": _SECRET}):
            with pytest.raises(jwt.InvalidTokenError, match="expirado"):
                verify_supabase_token(token)

    def test_wrong_algorithm_rs256_raises_invalid_token_error(self):
        from cryptography.hazmat.primitives.asymmetric import rsa
        from cryptography.hazmat.backends import default_backend

        private_key = rsa.generate_private_key(
            public_exponent=65537, key_size=2048, backend=default_backend()
        )
        token = _make_token(_base_payload(), secret=private_key, algorithm="RS256")

        with patch.dict("os.environ", {"SUPABASE_JWT_SECRET": _SECRET}):
            with pytest.raises(jwt.InvalidTokenError):
                verify_supabase_token(token)

    def test_disallowed_role_raises_invalid_token_error(self):
        token = _make_token(_base_payload(role="anon"))

        with patch.dict("os.environ", {"SUPABASE_JWT_SECRET": _SECRET}):
            with pytest.raises(jwt.InvalidTokenError, match="Role 'anon' no está autorizado"):
                verify_supabase_token(token)

    def test_tampered_token_raises_invalid_token_error(self):
        token = _make_token(_base_payload()) + "tampered"

        with patch.dict("os.environ", {"SUPABASE_JWT_SECRET": _SECRET}):
            with pytest.raises(jwt.InvalidTokenError):
                verify_supabase_token(token)


# ---------------------------------------------------------------------------
# Casos de error: configuración
# ---------------------------------------------------------------------------
class TestVerifySupabaseTokenConfig:
    def test_missing_env_var_raises_runtime_error(self):
        with patch.dict("os.environ", {}, clear=True):
            # Asegurar que la var no esté presente
            import os
            os.environ.pop("SUPABASE_JWT_SECRET", None)

            with pytest.raises(RuntimeError, match="SUPABASE_JWT_SECRET"):
                verify_supabase_token("any.token.here")


# ---------------------------------------------------------------------------
# Cache hit: la env var solo se lee una vez dentro del TTL
# ---------------------------------------------------------------------------
class TestSecretCache:
    def test_cache_hit_reads_env_var_only_once(self):
        token = _make_token(_base_payload())

        with patch.dict("os.environ", {"SUPABASE_JWT_SECRET": _SECRET}):
            with patch("os.environ.get", wraps=lambda k, *a: _SECRET if k == "SUPABASE_JWT_SECRET" else None) as mock_get:
                verify_supabase_token(token)
                verify_supabase_token(token)

                calls = [c for c in mock_get.call_args_list if c.args[0] == "SUPABASE_JWT_SECRET"]
                # El cache debe evitar que se llame más de una vez
                assert len(calls) <= 1, "SUPABASE_JWT_SECRET se leyó más de una vez dentro del TTL"
