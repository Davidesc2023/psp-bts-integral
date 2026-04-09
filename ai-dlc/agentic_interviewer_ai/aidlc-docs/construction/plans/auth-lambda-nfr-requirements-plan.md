# Plan de NFR Requirements — auth-lambda (Unidad 6)

**Unidad**: Unidad 6 — auth-lambda (`entrevista-auth`)
**Etapa**: CONSTRUCTION — NFR Requirements
**Creado**: 2026-04-06
**Estado**: COMPLETO — Artefactos generados 2026-04-06

---

## Resumen del plan

Definir los requisitos no funcionales para `auth-lambda`, el servicio de autenticación de operadores. Este servicio es **fundacional**: emite y valida los JWT utilizados por todos los demás lambdas y el dashboard. Sus requisitos de disponibilidad, seguridad y rendimiento afectan a toda la plataforma.

**Contexto del Diseño Funcional**:
- 10 flujos de negocio (login, refresh, logout, CRUD de operadores, reset de contraseña)
- 5 colecciones MongoDB (operators, refresh_tokens, login_attempts, password_reset_tokens, revoked_jwts)
- Dependencias externas: MongoDB Atlas, AWS Secrets Manager, AWS SES, compliance-lambda
- Algoritmos: Argon2id (hashing), RS256 (JWT), SHA-256 (tokens de refresh/reset)
- Protección progresiva contra fuerza bruta (3 tiers)

---

## Pasos de ejecución

- [x] Paso 1: Analizar el Diseño Funcional y contexto NFR
- [x] Paso 2: Clarificar requisitos de escalabilidad y carga esperada
- [x] Paso 3: Clarificar requisitos de rendimiento (latencia, throughput)
- [x] Paso 4: Clarificar requisitos de disponibilidad y recuperación ante fallos
- [x] Paso 5: Clarificar requisitos de seguridad y cumplimiento
- [x] Paso 6: Clarificar selección de stack tecnológico
- [x] Paso 7: Clarificar requisitos de observabilidad y alertas
- [x] Paso 8: Clarificar requisitos de calidad y pruebas
- [x] Paso 9: Generar `nfr-requirements.md`
- [x] Paso 10: Generar `tech-stack-decisions.md`

---

## Preguntas — Por favor llena todos los campos [Answer]:

---

### Sección 1 — Escalabilidad y Carga

## Pregunta 1
¿Cuántos **operadores (recruiters + admins) activos** se espera que tenga la plataforma en el MVP y en el horizonte a 12 meses?

A) MVP: < 10 operadores / 12 meses: < 50 operadores (empresa individual o piloto con 1–3 clientes)
B) MVP: < 50 operadores / 12 meses: < 200 operadores (varios clientes LATAM)
C) MVP: < 200 operadores / 12 meses: < 1.000 operadores (crecimiento acelerado, múltiples tenants)
D) Otro (describe después del tag [Answer]: abajo)

[B]: 

---

## Pregunta 2
¿Cuántos **logins simultáneos** se espera en el pico más alto? (El dashboard es usado principalmente en horario laboral)

A) < 10 logins/minuto en pico (equipo pequeño, uso interno)
B) 10–100 logins/minuto en pico (varios clientes usando el dashboard al mismo tiempo)
C) 100–500 logins/minuto en pico (gran escala, múltiples tenants activos simultáneamente)
D) Otro (describe después del tag [Answer]: abajo)

[B]: 

---

## Pregunta 3
¿Cuál es la estrategia de **multi-tenancy a nivel de infraestructura** para el MVP? (Un solo Lambda compartido para todos los tenants vs. instancias separadas por tenant)

A) Lambda compartido — todos los tenants usan el mismo deployment de auth-lambda (isolación solo por tenant_id en datos)
B) Lambda por tenant — cada cliente tiene su propio deployment aislado de auth-lambda
C) Lambda compartido con aislamiento de red por VPC por tenant
D) Otro (describe después del tag [Answer]: abajo)

[A]: 

---

### Sección 2 — Rendimiento

## Pregunta 4
¿Cuál es la **latencia máxima aceptable** para el endpoint `POST /api/v1/auth/login` (considerando que Argon2id es intencionalmente lento)?

A) < 2 segundos p99 (el usuario espera hasta 2s — Argon2id estándar)
B) < 1 segundo p99 (UX más estricta — puede requerir ajustar parámetros de Argon2id)
C) < 500ms p99 (muy estricta — requeriría reducir memory_cost de Argon2id, afectando seguridad)
D) Otro (describe después del tag [Answer]: abajo)

[A]: 

---

## Pregunta 5
¿Cuál es la **latencia máxima aceptable** para `GET /.well-known/jwks.json` (llamado por otros lambdas en cold start)?

A) < 200ms p99 (respuesta desde caché en memoria — calcula desde Secrets Manager en cold start)
B) < 500ms p99 (aceptable — otros lambdas cachean la clave, no es hot path)
C) Sin restricción específica — otros lambdas cachean el resultado; latencia de cold start es aceptable
D) Otro (describe después del tag [Answer]: abajo)

[B]: 

---

### Sección 3 — Disponibilidad y Recuperación

## Pregunta 6
¿Cuál es el **SLA de disponibilidad** requerido para auth-lambda?

A) 99.5% (≈ 3.6 horas downtime/mes) — aceptable para MVP con clientes piloto
B) 99.9% (≈ 43 minutos downtime/mes) — estándar para servicio de negocio
C) 99.95% (≈ 22 minutos downtime/mes) — alta disponibilidad desde el MVP
D) Otro (describe después del tag [Answer]: abajo)

[A]: 

---

## Pregunta 7
En caso de que **MongoDB Atlas** no esté disponible temporalmente, ¿cuál es el comportamiento esperado de auth-lambda?

A) Falla rápido — retorna 503 inmediatamente, sin reintentos (el cliente debe reintentar)
B) Reintenta con backoff exponencial (2 reintentos, 100ms / 300ms) antes de retornar 503
C) Reintenta agresivamente durante 5 segundos antes de retornar 503
D) Otro (describe después del tag [Answer]: abajo)

[B]: 

---

## Pregunta 8
¿Se requiere una **estrategia de Disaster Recovery** para auth-lambda en el MVP, o es suficiente con el comportamiento nativo de AWS Lambda (multi-AZ automático)?

A) Multi-AZ automático de Lambda es suficiente para MVP (sin DR adicional)
B) Multi-región activa-pasiva — Lambda en 2 regiones AWS con failover vía Route 53
C) Multi-región activa-activa — tráfico distribuido entre 2 regiones
D) Otro (describe después del tag [Answer]: abajo)

[A]: 

---

### Sección 4 — Seguridad y Cumplimiento

## Pregunta 9
¿Los datos de operadores están sujetos a alguna **regulación de privacidad específica** que requiera tratamiento especial (más allá del Security Baseline SECURITY-01 a SECURITY-15 ya habilitado)?

A) Sin regulaciones adicionales más allá del Security Baseline
B) GDPR (operadores europeos) — requiere derecho al olvido, portabilidad de datos, DPA
C) Ley 1581/2012 (Colombia) — requiere consentimiento explícito y registro del tratamiento
D) Ambas B y C (operadores en Europa Y Colombia)
E) Otro (describe después del tag [Answer]: abajo)

[C]: 

---

## Pregunta 10
¿Se requiere **auditoría de acceso a nivel de base de datos** (quién leyó/escribió qué en MongoDB) adicionalmente al audit logging de aplicación ya diseñado?

A) No — el audit log de aplicación (BR-13) con compliance-lambda es suficiente
B) Sí — habilitar MongoDB Atlas Audit Log (captura operaciones a nivel de driver)
C) Sí — adicionalmente configurar AWS CloudTrail para todas las operaciones de Secrets Manager
D) Otro (describe después del tag [Answer]: abajo)

[A]: 

---

### Sección 5 — Stack Tecnológico

## Pregunta 11
¿Qué **versión de Python** y **gestor de paquetes** se usarán en auth-lambda?

A) Python 3.12 + `uv` (gestor moderno, ya definido en unit-of-work.md para todos los lambdas Python)
B) Python 3.12 + `pip` + `requirements.txt` (más familiar, sin `uv`)
C) Python 3.11 + `uv` (versión más estable, menor riesgo de incompatibilidades)
D) Otro (describe después del tag [Answer]: abajo)

[A]: 

---

## Pregunta 12
¿Qué **framework de testing** se usará para las pruebas unitarias e de integración en Python?

A) `pytest` + `pytest-asyncio` + `mongomock` (estándar de facto para FastAPI)
B) `pytest` + `pytest-asyncio` + `testcontainers` (MongoDB real en Docker para tests de integración)
C) `unittest` estándar de Python
D) Otro (describe después del tag [Answer]: abajo)

[B]: 

---

## Pregunta 13
¿Qué **librería de Argon2** se usará para el hashing de contraseñas?

A) `argon2-cffi` (bindings Python de la implementación de referencia en C — más rápida)
B) `passlib[argon2]` (abstracción sobre múltiples algoritmos — más portable)
C) Otro (describe después del tag [Answer]: abajo)

[A]: 

---

## Pregunta 14
¿Qué **librería JWT** se usará para firmar y verificar tokens RS256 en Python?

A) `python-jose[cryptography]` (soporte RS256, JWKS, ampliamente usada con FastAPI)
B) `PyJWT` + `cryptography` (más liviana, mantenimiento activo, soporte RS256)
C) `authlib` (soporta JWKS, OAuth2, más completa pero más pesada para Lambda)
D) Otro (describe después del tag [Answer]: abajo)

[B]: 

---

### Sección 6 — Observabilidad y Alertas

## Pregunta 15
¿Qué nivel de **structured logging** se requiere en auth-lambda?

A) JSON estructurado en stdout (capturado por CloudWatch Logs automáticamente) — sin agente adicional
B) JSON estructurado + AWS X-Ray tracing para trazabilidad distribuida entre lambdas
C) JSON estructurado + X-Ray + Datadog/Grafana para dashboards de observabilidad centralizados
D) Otro (describe después del tag [Answer]: abajo)

[B]: 

---

## Pregunta 16
¿Qué **alertas de CloudWatch** son obligatorias paraauth-lambda en MVP?

A) Mínimas: alerta cuando tasa de errores 5xx > 5% en 5 minutos
B) Estándar: alerta 5xx > 5% + alerta duración p99 > 2s + alerta cuentas bloqueadas > 10 en 1 minuto
C) Completo: todo lo de B + alerta intentos fallidos > 50 en 1 minuto (posible ataque) + alerta cold starts > 20% de invocaciones
D) Otro (describe después del tag [Answer]: abajo)

[C]: 

---

### Sección 7 — Calidad y Pruebas

## Pregunta 17
¿Cuál es el **porcentaje mínimo de cobertura de código** requerido para auth-lambda?

A) 70% — suficiente para MVP, enfocado en caminos críticos
B) 80% — estándar de calidad de negocio
C) 90% — alta confianza, especialmente en flujos de seguridad
D) Otro (describe después del tag [Answer]: abajo)

[B]: 

---

## Pregunta 18
¿Se requieren **pruebas de carga/rendimiento** antes del go-live del MVP?

A) No — las pruebas funcionales son suficientes para MVP dado el bajo volumen esperado
B) Sí — prueba de carga básica: simular 50 logins/minuto sostenidos durante 5 minutos
C) Sí — prueba de carga completa: simular carga pico + prueba de resistencia con Locust/k6
D) Otro (describe después del tag [Answer]: abajo)

[B]: 

---

*Por favor llena todos los campos [Answer]: y responde **"Terminé"** cuando hayas completado todas las respuestas.*
