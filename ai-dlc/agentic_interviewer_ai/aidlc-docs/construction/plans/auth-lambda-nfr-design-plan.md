# Plan de NFR Design — auth-lambda (Unidad 6)

**Unidad**: Unidad 6 — auth-lambda (`entrevista-auth`)
**Etapa**: CONSTRUCTION — NFR Design
**Creado**: 2026-04-06
**Estado**: COMPLETO — respuestas procesadas

---

## Resumen del plan

Traducir los NFR Requirements en **patrones de diseño concretos** y **componentes lógicos** para auth-lambda (implementado sobre Supabase Auth). El foco está en los 4 gaps identificados y en los patrones de resiliencia, seguridad y observabilidad.

---

## Pasos de ejecución

- [x] Paso 1: Clarificar implementación del Auth Hook para brute force (GAP-01)
- [x] Paso 2: Clarificar librería de retry para lambdas Python (resiliencia MongoDB)
- [ ] Paso 3: Generar `nfr-design-patterns.md`
- [ ] Paso 4: Generar `logical-components.md`

---

## Preguntas — Por favor llena todos los campos [Answer]:

---

### Sección 1 — Implementación del Brute Force Auth Hook (GAP-01)

## Pregunta 1
Supabase soporta dos tipos de **Before Sign In Hook** para implementar la protección contra fuerza bruta. ¿Cuál prefieres?

A) **PostgreSQL Function Hook** — La lógica de brute force se implementa como una función PL/pgSQL en la misma base de datos de Supabase. Sin servicios externos. Latencia < 5ms. Limitación: no puede hacer llamadas HTTP externas.
B) **Edge Function Hook** — La lógica se implementa como una Supabase Edge Function (Deno/TypeScript). Puede integrar HIBP, alertas externas, lógica compleja. Latencia ~50–150ms (cold start).
C) Ninguno — implementar la protección contra fuerza bruta en el **cliente** (middleware en el dashboard de React que detecta errores 400 de Supabase y aplica UI-level throttling con localStorage)
D) Otro (describe después del tag [Answer]: abajo)

[Answer]: A) PostgreSQL Function Hook — lógica PL/pgSQL en Supabase, < 5ms, sin dependencias externas.

---

### Sección 2 — Patrón de Retry para Lambdas Python

## Pregunta 2
Para implementar el retry con backoff exponencial en las llamadas a MongoDB Atlas desde los lambdas Python (2 reintentos: 100ms / 300ms), ¿qué estrategia prefieres?

A) **`tenacity` library** — decorador `@retry(stop=stop_after_attempt(3), wait=wait_exponential(...))`. Declarativo, limpio, testeable.
B) **Implementación manual** — bucle `for attempt in range(3)` con `asyncio.sleep`. Sin dependencias adicionales.
C) **Motor de MongoDB built-in** — usar `serverSelectionTimeoutMS` y `connectTimeoutMS` en la URI de conexión (el driver gestiona reintentos internamente sin código adicional).
D) Otro (describe después del tag [Answer]: abajo)

[Answer]: C+B) Driver built-in (`retryWrites=true`, `retryReads=true`) + lógica manual ligera con `asyncio.sleep` para reintentos a nivel de aplicación. Sin `tenacity` para MVP.

---

*Por favor llena los dos campos [Answer]: y responde **"Terminé"** cuando hayas completado las respuestas.*
