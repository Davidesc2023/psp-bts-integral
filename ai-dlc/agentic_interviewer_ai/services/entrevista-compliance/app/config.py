"""
Settings para entrevista-compliance via pydantic-settings.
Los valores sensibles se cargan desde AWS Secrets Manager en Lambda;
pydantic-settings también soporta variables de entorno para desarrollo local.
"""
from __future__ import annotations

import json
import logging
import os
from functools import lru_cache

import boto3
from botocore.exceptions import ClientError
from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


def _load_mongodb_uri_from_secrets(secret_arn: str) -> str:
    """
    Obtiene la URI de MongoDB desde AWS Secrets Manager.
    Espera un JSON con la clave 'mongodb_uri'.
    """
    client = boto3.client("secretsmanager")
    try:
        response = client.get_secret_value(SecretId=secret_arn)
    except ClientError as exc:
        logger.error("Error obteniendo secreto %s: %s", secret_arn, exc)
        raise

    secret_str = response.get("SecretString", "{}")
    secret_data = json.loads(secret_str)
    uri = secret_data.get("mongodb_uri")
    if not uri:
        raise ValueError(f"El secreto {secret_arn} no contiene 'mongodb_uri'")
    return uri


class Settings(BaseSettings):
    """
    Configuración centralizada. 
    Precedencia: Secrets Manager > variables de entorno > defaults.
    """

    model_config = SettingsConfigDict(env_prefix="", case_sensitive=False)

    # MongoDB
    mongodb_secret_arn: str = ""
    # En desarrollo local, usar MONGODB_URI directamente
    mongodb_uri: str = "mongodb://localhost:27017"
    mongodb_database: str = "entrevista_compliance"

    # AWS
    kms_key_id: str = ""
    sns_topic_arn: str = ""
    dlq_url: str = ""

    # JWT (validación via entrevista-shared)
    jwt_secret: str = "dev-secret-change-in-prod"
    jwt_algorithm: str = "HS256"

    # App
    environment: str = "dev"
    log_level: str = "INFO"

    def resolve_mongodb_uri(self) -> str:
        """
        Si hay un ARN de Secrets Manager configurado, obtiene la URI desde allí.
        De lo contrario, usa la variable de entorno MONGODB_URI (para tests/dev).
        """
        if self.mongodb_secret_arn and not self.mongodb_secret_arn.startswith("arn:aws:") is False:
            return self.mongodb_uri
        if self.mongodb_secret_arn and self.mongodb_secret_arn.startswith("arn:aws:"):
            return _load_mongodb_uri_from_secrets(self.mongodb_secret_arn)
        return self.mongodb_uri


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    """
    Retorna la instancia singleton de Settings.
    lru_cache garantiza que Secrets Manager se consulta una sola vez por contenedor Lambda.
    """
    settings = Settings()
    # Resolver y reemplazar URI si viene de Secrets Manager
    resolved_uri = settings.resolve_mongodb_uri()
    if resolved_uri != settings.mongodb_uri:
        settings = settings.model_copy(update={"mongodb_uri": resolved_uri})
    return settings
