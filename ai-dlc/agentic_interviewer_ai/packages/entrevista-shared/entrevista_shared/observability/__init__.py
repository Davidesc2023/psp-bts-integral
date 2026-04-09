"""Submódulo de observabilidad — AWS X-Ray context manager async."""

from entrevista_shared.observability.xray_utils import xray_subsegment

__all__ = ["xray_subsegment"]
