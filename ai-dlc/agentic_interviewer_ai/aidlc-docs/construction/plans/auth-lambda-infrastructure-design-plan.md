# Plan de Infrastructure Design — auth-lambda (Unidad 6)

**Unidad**: Unidad 6 — auth-lambda (`entrevista-auth`)
**Etapa**: CONSTRUCTION — Infrastructure Design
**Creado**: 2026-04-07
**Estado**: COMPLETO — respuestas procesadas

---

## Resumen del plan

Mapear los 9 componentes lógicos de NFR Design a servicios de infraestructura concretos. Dado que la arquitectura de producción es **Supabase + Vercel**, la mayoría de decisiones ya están determinadas. Solo hay una decisión con ambigüedad real.

---

## Pasos de ejecución

- [x] Paso 1: Clarificar dónde residen los módulos Python compartidos en el monorepo
- [ ] Paso 2: Generar `infrastructure-design.md`
- [ ] Paso 3: Generar `deployment-architecture.md`

---

## Preguntas — Por favor llena el campo [Answer]:

---

### Sección 1 — Ubicación de los módulos Python compartidos

## Pregunta 1

Los componentes COMP-06 (`supabase_jwt_verifier`), COMP-07 (`mongodb_client`), COMP-08 (`with_db_retry`) y COMP-09 (`xray_utils`) son módulos Python que serán usados por **múltiples lambdas** (compliance-lambda, evaluation-lambda, etc.). ¿Dónde deben residir en el polyrepo?

A) **Paquete interno por lambda** — Cada lambda tiene su propia copia de estos módulos en su carpeta (`src/shared/`). Duplicación mínima ya que son archivos pequeños. MVP-friendly.
B) **Paquete Python privado en el mismo repo** — Un directorio `packages/entrevista-shared/` publicado como paquete local con `pip install -e packages/entrevista-shared`. Reutilización real, un cambio actualiza todos los lambdas.
C) **Paquete Python privado en repositorio separado** — Repo dedicado `entrevista-shared-python`. Mayor aislamiento. Requiere versionar y publishar a PyPI privado o usar git dependencies.
D) Otro (describe después del tag [Answer]: abajo)

[B]: Paquete Python privado en el mismo repo — `packages/entrevista-shared/` con `pip install -e`.

---

*Por favor llena el campo [Answer]: y responde **"Terminé"** cuando hayas completado.*
