# 📖 HISTORIAS DE USUARIO — SISTEMA PSP
## Programa de Seguimiento a Pacientes

**Versión:** 2.0  
**Fecha:** Marzo 24, 2026  
**Clasificación:** Documento Maestro de Requisitos Funcionales  
**Estado:** Base line aprobada para desarrollo

---

## 📋 CONVENCIONES

```
HU-XXX: ID único de historia
Como [ROL] quiero [ACCIÓN] para [BENEFICIO]
Criterios de Aceptación (AC):
  AC1: ...
  AC2: ...
Reglas de Negocio (RN):
  RN1: ...
Prioridad: ALTA | MEDIA | BAJA
Estado: ✅ Implementada | ⚠️ Parcial | 🔴 Pendiente
```

**Roles del sistema:**
- `SUPER_ADMIN` — Acceso total, gestión multi-institución
- `ADMIN` — Administrador de institución, gestión de catálogos
- `MEDICO` — Prescripciones, seguimientos clínicos
- `ENFERMERA` — Aplicaciones, seguimientos de enfermería
- `EDUCADORA` — Tareas educativas, seguimientos telefónicos
- `FARMACEUTICA` — Entregas, inventarios
- `AUDITOR` — Solo lectura, reportes

---

## 🔐 MÓDULO 1: AUTENTICACIÓN Y SEGURIDAD

### HU-001 — Inicio de Sesión
**Como** usuario del sistema  
**Quiero** autenticarme con mi correo y contraseña  
**Para** acceder a las funcionalidades según mi rol

**AC:**
- AC1: El formulario requiere correo y contraseña
- AC2: Si las credenciales son incorrectas, mostrar mensaje descriptivo sin revelar si el usuario existe  
- AC3: Al autenticarse correctamente, redirigir al Dashboard
- AC4: El token JWT expira en 8 horas
- AC5: Existe opción "Recordar sesión" que extend token a 30 días
- AC6: Al cerrar sesión, invalidar el token y redirigir a /login

**RN:**
- RN1: Máximo 5 intentos fallidos consecutivos bloquea la cuenta por 15 minutos
- RN2: Las contraseñas deben tener mínimo 8 caracteres, una mayúscula y un número

**Prioridad:** ALTA | **Estado:** ✅ Implementada

---

### HU-002 — Control de Acceso por Rol
**Como** administrador del sistema  
**Quiero** que cada usuario solo vea y acceda a las funcionalidades de su rol  
**Para** garantizar la seguridad y privacidad de los datos

**AC:**
- AC1: El sidebar muestra solo los módulos permitidos para el rol activo
- AC2: Un usuario EDUCADORA no puede acceder a /prescriptions ni /deliveries
- AC3: Un usuario AUDITOR puede ver todo pero no puede crear/editar/eliminar
- AC4: Rutas protegidas devuelven 403 si el rol no tiene permiso
- AC5: El frontend no renderiza botones de acción no permitidos por el rol

**RN:**
- RN1: Los permisos se definen a nivel de endpoint (backend) y de componente (frontend)
- RN2: El token JWT lleva el rol; el backend lo valida en cada request

**Prioridad:** ALTA | **Estado:** ⚠️ Parcial (roles en backend, guards frontend pendientes)

---

### HU-003 — Gestión de Usuarios (ADMIN)
**Como** ADMIN de institución  
**Quiero** crear, editar, activar y desactivar usuarios de mi institución  
**Para** controlar quién accede al sistema

**AC:**
- AC1: Formulario de creación con campos: nombre, apellido, email, contraseña temporal, rol, institución
- AC2: Al crear, enviar email con contraseña temporal y enlace de cambio obligatorio
- AC3: Puede cambiar el rol de un usuario dentro de su institución
- AC4: Puede activar/desactivar un usuario sin eliminarlo
- AC5: Listado muestra estado (activo/inactivo), último acceso, rol
- AC6: Filtro por rol, estado, nombre/email
- AC7: No puede crear SUPER_ADMIN ni usuarios de otras instituciones

**RN:**
- RN1: Un usuario desactivado no puede iniciar sesión
- RN2: El email debe ser único en el sistema globalmente

**Prioridad:** ALTA | **Estado:** 🔴 Pendiente (falta UI admin + endpoints CRUD usuario)

---

### HU-004 — Cambio y Recuperación de Contraseña
**Como** usuario del sistema  
**Quiero** cambiar mi contraseña o recuperarla si la olvidé  
**Para** mantener la seguridad de mi cuenta

**AC:**
- AC1: Opción "Olvidé mi contraseña" en la pantalla de login
- AC2: Ingresar email → recibir enlace de recuperación (válido 1 hora)
- AC3: Cambio de contraseña desde el perfil si ya está autenticado
- AC4: La nueva contraseña no puede ser igual a las 3 anteriores

**Prioridad:** MEDIA | **Estado:** 🔴 Pendiente

---

## 👤 MÓDULO 2: PACIENTES

### HU-005 — Listado de Pacientes
**Como** usuario del sistema (cualquier rol)  
**Quiero** ver el listado de pacientes paginado con filtros  
**Para** encontrar rápidamente el paciente que necesito gestionar

**AC:**
- AC1: Tabla/listado con columnas: nombre completo, documento, estado, EPS, IPS, fecha ingreso
- AC2: Búsqueda por nombre, apellido o número de documento (mínimo 3 caracteres)
- AC3: Filtro por estado (EN_PROCESO, ACTIVO, SUSPENDIDO, DROP_OUT, INACTIVO, FALLECIDO)
- AC4: Filtro por EPS, IPS, educadora asignada
- AC5: Paginación de 20 registros por página con indicador total
- AC6: Click en paciente → ir al detalle del paciente
- AC7: Botón "Nuevo Paciente" visible para ADMIN, MEDICO, ENFERMERA
- AC8: Ordenar por nombre, estado, fecha registro

**Prioridad:** ALTA | **Estado:** ✅ Implementada

---

### HU-006 — Registro de Nuevo Paciente (Wizard 4 Pasos)
**Como** ADMIN, MEDICO o ENFERMERA  
**Quiero** registrar un nuevo paciente en el sistema mediante un formulario guiado  
**Para** ingresar al PSP con todos sus datos completos

**Pasos del Wizard:**
- **Paso 1 - Datos Básicos:** Nombres, apellidos, tipo documento, número documento, fecha nacimiento, edad calculada, sexo, género
- **Paso 2 - Sociodemográfico:** Estado civil, nivel educativo, etnia, tipo población, estrato, zona residencia, ocupación
- **Paso 3 - Datos Clínicos:** Diagnóstico principal (CIE-10), comorbilidades, EPS, IPS, régimen salud, médico prescriptor, programa PSP
- **Paso 4 - Acudiente/Consentimiento:** Datos del acudiente, datos de contacto de emergencia, upload consentimiento informado PDF

**AC:**
- AC1: Validación en tiempo real en cada campo
- AC2: Permite guardar borrador y continuar después (draft)
- AC3: El número de documento debe ser único en el sistema
- AC4: Si el documento ya existe, mostrar mensaje de duplicado con link al paciente existente
- AC5: Al finalizar, el paciente queda en estado EN_PROCESO
- AC6: Los catálogos (EPS, IPS, ciudades, etc.) se cargan dinámicamente desde el backend
- AC7: Ciudad se filtra según departamento seleccionado
- AC8: El formulario muestra progreso visual de los 4 pasos

**RN:**
- RN1: Documento: mínimo 7 dígitos, sin letras
- RN2: Edad calculada automáticamente desde fecha de nacimiento
- RN3: El diagnóstico principal debe ser un código CIE-10 válido
- RN4: Un paciente debe tener EPS asignada para poder pasar a estado ACTIVO

**Prioridad:** ALTA | **Estado:** ✅ Implementada (Step1-4 en forms/)

---

### HU-007 — Detalle del Paciente
**Como** usuario del sistema  
**Quiero** ver el perfil completo de un paciente con tabs por módulo  
**Para** tener una vista 360° de su situación en el PSP

**AC:**
- AC1: Header con foto de perfil (iniciales si no hay foto), nombre, documento, estado actual con badge de color
- AC2: Tabs navegables: Información General | Prescripciones | Aplicaciones | Entregas | Seguimientos | Barreras | Paraclínicos | Adherencia
- AC3: Cada tab carga datos del paciente en esa área
- AC4: Breadcrumb de navegación de regreso al listado
- AC5: Botón "Editar" visible para roles con permiso

**Prioridad:** ALTA | **Estado:** ✅ Implementada

---

### HU-008 — Cambio de Estado del Paciente
**Como** MEDICO o ADMIN  
**Quiero** cambiar el estado del paciente con motivo documentado  
**Para** reflejar su situación actual en el programa

**Flujo de estados permitidos:**
```
EN_PROCESO → ACTIVO
ACTIVO → SUSPENDIDO | DROP_OUT | FALLECIDO
SUSPENDIDO → ACTIVO | DROP_OUT
DROP_OUT → (estado final)
INACTIVO → ACTIVO (reactivación)
FALLECIDO → (estado final)
```

**AC:**
- AC1: Selector de estado con transiciones válidas según estado actual
- AC2: Campo obligatorio de motivo al cambiar estado
- AC3: Historial de cambios de estado visible en el detalle del paciente
- AC4: Al pasar a FALLECIDO, solicitar confirmación con fecha de fallecimiento
- AC5: El historial muestra: estado anterior → nuevo estado, motivo, usuario, fecha/hora

**RN:**
- RN1: No se pueden hacer transiciones no definidas en el flujo
- RN2: DROP_OUT y FALLECIDO son estados terminales no revertibles

**Prioridad:** ALTA | **Estado:** ⚠️ Parcial (backend OK, UI historial pendiente)

---

### HU-009 — Edición de Datos del Paciente
**Como** ADMIN, MEDICO o ENFERMERA  
**Quiero** editar los datos de un paciente registrado  
**Para** mantener la información actualizada

**AC:**
- AC1: Mismo wizard de creación pero pre-poblado con datos actuales
- AC2: Muestra fecha de última modificación y usuario que la realizó
- AC3: El documento no puede cambiarse una vez registrado
- AC4: Auditoría automática de cada campo modificado

**Prioridad:** ALTA | **Estado:** ✅ Implementada

---

### HU-010 — Búsqueda Avanzada de Pacientes
**Como** usuario del sistema  
**Quiero** buscar pacientes con filtros combinados avanzados  
**Para** generar vistas específicas de población

**AC:**
- AC1: Filtro por: rango de fechas de ingreso, estado, EPS, IPS, educadora, diagnóstico, programa PSP
- AC2: Resultados exportables a Excel/CSV
- AC3: Los filtros se mantienen al paginar

**Prioridad:** MEDIA | **Estado:** ⚠️ Parcial (filtros básicos OK, export pendiente)

---

## 💊 MÓDULO 3: PRESCRIPCIONES MÉDICAS

### HU-011 — Listado de Prescripciones
**Como** MEDICO, FARMACEUTICA o ADMIN  
**Quiero** ver el listado de prescripciones del sistema  
**Para** controlar las órdenes médicas activas y vencidas

**AC:**
- AC1: Tabla con: paciente, diagnóstico, medicamento, dosis, estado (VIGENTE/VENCIDA), médico, fecha
- AC2: Filtro por paciente, estado, medicamento, médico, rango de fechas
- AC3: Badge visual: VIGENTE (verde), VENCIDA (rojo)
- AC4: Vista "Mis Pacientes" para MEDICO filtra solo sus pacientes

**Prioridad:** ALTA | **Estado:** ✅ Implementada

---

### HU-012 — Crear Prescripción Médica
**Como** MEDICO  
**Quiero** crear una orden de prescripción médica para un paciente  
**Para** formalizar el tratamiento farmacológico

**AC:**
- AC1: Seleccionar paciente del catálogo (búsqueda por nombre/documento)
- AC2: Seleccionar medicamento del catálogo con autocompletado
- AC3: Indicar dosis, frecuencia, vía de administración, duración
- AC4: Indicar diagnóstico asociado (CIE-10)
- AC5: Indicar médico prescriptor (puede ser diferente al usuario logueado)
- AC6: Fecha inicio y fecha fin calculada según duración
- AC7: Observaciones adicionales

**RN:**
- RN1: Un paciente puede tener múltiples prescripciones activas
- RN2: No se puede prescribir a un paciente en estado DROP_OUT o FALLECIDO

**Prioridad:** ALTA | **Estado:** ✅ Implementada

---

### HU-013 — Gestión de Médicos Prescriptores
**Como** ADMIN  
**Quiero** gestionar el catálogo de médicos prescriptores  
**Para** que estén disponibles al crear prescripciones

**AC:**
- AC1: CRUD completo: crear, editar, activar/desactivar médico
- AC2: Campos: nombre, apellido, especialidad, número de registro médico, teléfono, email
- AC3: Búsqueda por nombre o número de registro

**Prioridad:** ALTA | **Estado:** ✅ Implementada

---

### HU-014 — Gestión de Medicamentos
**Como** ADMIN o FARMACEUTICA  
**Quiero** gestionar el catálogo de medicamentos del sistema  
**Para** que estén disponibles en prescripciones y entregas

**AC:**
- AC1: CRUD: nombre comercial, principio activo, presentación, unidad de medida, código INVIMA
- AC2: Activar/desactivar medicamento
- AC3: Carga masiva desde Excel/CSV con plantilla descargable
- AC4: Búsqueda por nombre comercial o principio activo
- AC5: Medicamentos inactivos no aparecen en dropdowns de prescripción

**Prioridad:** ALTA | **Estado:** 🔴 Pendiente (falta UI admin + bulk upload)

---

## 🩺 MÓDULO 4: APLICACIONES DE MEDICAMENTO

### HU-015 — Listado de Aplicaciones
**Como** ENFERMERA o MEDICO  
**Quiero** ver las aplicaciones programadas y realizadas  
**Para** controlar la administración de medicamentos

**AC:**
- AC1: Vista de lista o calendario con aplicaciones
- AC2: Filtro por paciente, estado (PROGRAMADA, APLICADA, NO_APLICADA), tipo, rango de fechas
- AC3: Indicador visual por estado: PROGRAMADA (azul), APLICADA (verde), NO_APLICADA (rojo)

**Prioridad:** ALTA | **Estado:** ✅ Implementada

---

### HU-016 — Registrar Aplicación de Medicamento
**Como** ENFERMERA  
**Quiero** registrar la aplicación de un medicamento  
**Para** documentar la administración real del tratamiento

**AC:**
- AC1: Seleccionar paciente y prescripción activa asociada
- AC2: Tipo de aplicación: INYECCION, INFUSION, CREMA, CURACION, ORAL, CRISIS
- AC3: Fecha y hora real de aplicación, lugar, responsable
- AC4: Observaciones y reacciones adversas si las hay
- AC5: Marcar como APLICADA, NO_APLICADA (con motivo), o CRISIS

**RN:**
- RN1: No se puede registrar aplicación a paciente FALLECIDO o DROP_OUT
- RN2: Una CRISIS siempre requiere observación obligatoria

**Prioridad:** ALTA | **Estado:** ✅ Implementada

---

### HU-017 — Generación Masiva de Aplicaciones
**Como** ENFERMERA o ADMIN  
**Quiero** generar automáticamente el calendario de aplicaciones para un período  
**Para** ahorrar tiempo de carga manual

**AC:**
- AC1: Seleccionar paciente, prescripción, rango de fechas y frecuencia
- AC2: Vista previa del calendario generado antes de confirmar
- AC3: Posibilidad de excluir fechas específicas (fines de semana, festivos)
- AC4: Genera aplicaciones en estado PROGRAMADA

**Prioridad:** MEDIA | **Estado:** ✅ Implementada (bulk generation endpoint)

---

## 🚚 MÓDULO 5: ENTREGAS DE MEDICAMENTOS

### HU-018 — Listado de Entregas
**Como** FARMACEUTICA o ADMIN  
**Quiero** ver todas las entregas programadas y su estado  
**Para** controlar la logística de medicamentos

**AC:**
- AC1: Tabla con: paciente, medicamento, tipo entrega, operador logístico, estado, fecha programada
- AC2: Filtro por estado, operador logístico, tipo entrega, rango de fechas, paciente
- AC3: Alerta visual para entregas próximas a vencer (<7 días)

**Prioridad:** ALTA | **Estado:** ✅ Implementada

---

### HU-019 — Crear Entrega de Medicamentos
**Como** FARMACEUTICA  
**Quiero** programar una entrega de medicamentos para un paciente  
**Para** garantizar la continuidad del tratamiento

**AC:**
- AC1: Campos: paciente, prescripción, medicamento, cantidad, fecha programada, tipo entrega
- AC2: Tipos: PUNTO (paciente recoge), DOMICILIO, IPS, FARMACIA
- AC3: Si es DOMICILIO: dirección de entrega, operador logístico
- AC4: Observaciones especiales para el operador

**Prioridad:** ALTA | **Estado:** ✅ Implementada

---

### HU-020 — Avance de Estado de Entrega
**Como** FARMACEUTICA  
**Quiero** actualizar el estado de una entrega en tiempo real  
**Para** hacer seguimiento de la logística

**Estados y transiciones:**
```
PROGRAMADA → EN_TRANSITO → ENTREGADA
PROGRAMADA → CANCELADA
EN_TRANSITO → DEVUELTA
```

**AC:**
- AC1: Botón de avance de estado con confirmación
- AC2: Al marcar EN_TRANSITO: registrar a quién se entregó al operador y fecha
- AC3: Al marcar ENTREGADA: registrar quien recibió, fecha y hora reales
- AC4: Al marcar DEVUELTA: motivo obligatorio
- AC5: Historial de cambios de estado visible

**Prioridad:** ALTA | **Estado:** ✅ Implementada

---

## 🩻 MÓDULO 6: PARACLÍNICOS (LABORATORIOS)

### HU-021 — Listado de Exámenes Paraclínicos
**Como** MEDICO o ENFERMERA  
**Quiero** ver los exámenes de laboratorio solicitados y sus resultados  
**Para** hacer seguimiento del estado clínico del paciente

**AC:**
- AC1: Tabla con: paciente, tipo examen, laboratorio, fecha solicitud, fecha resultado, estado
- AC2: Filtro por paciente, tipo examen, laboratorio, estado, rango fechas
- AC3: Si hay resultado, mostrar valores con indicador de normalidad (NORMAL/ALTO/BAJO)
- AC4: Estado: SOLICITADO, EN_PROCESO, RESULTADO_DISPONIBLE

**Prioridad:** ALTA | **Estado:** ⚠️ Parcial (backend OK, frontend usa mock)

---

### HU-022 — Solicitar Examen Paraclínico
**Como** MEDICO  
**Quiero** registrar la solicitud de un examen de laboratorio  
**Para** documentar el seguimiento paraclínico del paciente

**AC:**
- AC1: Seleccionar paciente, tipo de examen del catálogo, laboratorio del catálogo
- AC2: Fecha de solicitud (por defecto hoy), fecha estimada de resultado
- AC3: Indicaciones especiales para el paciente (ayuno, etc.)
- AC4: Vista previa del examen antes de confirmar

**Prioridad:** ALTA | **Estado:** ⚠️ Parcial (POST endpoint funciona, GET listado usa mock)

---

### HU-023 — Registrar Resultado de Examen
**Como** MEDICO o ENFERMERA  
**Quiero** ingresar los resultados de un examen paraclínico  
**Para** documentar la evolución clínica del paciente

**AC:**
- AC1: Ingresar valores por parámetro del examen
- AC2: Sistema indica automáticamente si el valor está ALTO, BAJO o NORMAL según rangos de referencia
- AC3: Opción de adjuntar PDF con reporte del laboratorio
- AC4: Al guardar resultado, cambiar estado a RESULTADO_DISPONIBLE
- AC5: Observaciones del médico sobre los resultados

**RN:**
- RN1: Los rangos de referencia se definen por tipo de examen y varían por sexo/edad

**Prioridad:** ALTA | **Estado:** 🔴 Pendiente

---

### HU-024 — Gestión de Tipos de Examen (Admin)
**Como** ADMIN  
**Quiero** gestionar el catálogo de tipos de examen y laboratorios  
**Para** que estén disponibles en el módulo paraclínico

**AC:**
- AC1: CRUD de tipos de examen: nombre, código, parámetros con rangos de referencia
- AC2: CRUD de laboratorios: nombre, dirección, teléfono, ciudad
- AC3: Activar/desactivar tipos de examen y laboratorios
- AC4: Carga masiva desde Excel

**Prioridad:** ALTA | **Estado:** ✅ Backend (TipoParaclinico entity) | 🔴 Frontend pendiente

---

## 🧱 MÓDULO 7: BARRERAS

### HU-025 — Listado de Barreras por Paciente
**Como** EDUCADORA, MEDICO o ENFERMERA  
**Quiero** ver las barreras identificadas para un paciente  
**Para** enfocar las estrategias de intervención

**AC:**
- AC1: Vista global de barreras del sistema o filtrada por paciente
- AC2: Tabla con: paciente, categoría barrera, subcategoría, estado (ACTIVA/CERRADA), fecha apertura, quien la identificó
- AC3: Badge por categoría: ECONÓMICA (naranja), ADHERENCIA (rojo), ACCESO (azul), PSICOLÓGICA (morado), CLÍNICA (verde)
- AC4: Filtro por paciente, categoría, estado, fecha
- AC5: Indicador visual de pacientes con barrera activa

**Prioridad:** ALTA | **Estado:** ⚠️ Parcial (frontend con apiClient, backend OK)

---

### HU-026 — Registrar Barrera
**Como** EDUCADORA o MEDICO  
**Quiero** registrar una barrera identificada en un paciente  
**Para** documentar los obstáculos para la adherencia al tratamiento

**AC:**
- AC1: Seleccionar paciente, categoría de barrera, subcategoría
- AC2: Descripción detallada de la barrera identificada
- AC3: Estrategia de intervención propuesta
- AC4: Fecha de identificación y profesional que la identifica
- AC5: Sistema verifica regla: si el paciente ya tiene una barrera ACTIVA, solicitar confirmación o cerrar la anterior

**RN:**
- **RN1 (CRÍTICA):** Un paciente solo puede tener **1 barrera activa** simultáneamente
- RN2: Una barrera cerrada no puede reabrirse, se crea una nueva

**Prioridad:** ALTA | **Estado:** ⚠️ Parcial (backend tiene constraint, frontend no valida antes)

---

### HU-027 — Cerrar Barrera
**Como** EDUCADORA o MEDICO  
**Quiero** cerrar una barrera cuando ha sido superada  
**Para** registrar la resolución del obstáculo

**AC:**
- AC1: Campo obligatorio: fecha de cierre, resultado de la intervención
- AC2: Estado de resolución: SUPERADA, NO_SUPERADA, DERIVADA
- AC3: Si DERIVADA: indicar a quién se derivó

**Prioridad:** ALTA | **Estado:** ✅ Backend OK | ⚠️ Frontend parcial

---

### HU-028 — Gestión de Categorías de Barrera (Admin)
**Como** ADMIN  
**Quiero** gestionar las categorías y subcategorías de barrera  
**Para** mantener actualizada la taxonomía de barreras

**AC:**
- AC1: CRUD de categorías de barrera con nombre y descripción
- AC2: CRUD de subcategorías asociadas a categorías
- AC3: Activar/desactivar categorías y subcategorías

**RN:**
- RN1: No se puede eliminar una categoría con barreras asociadas, solo desactivar

**Prioridad:** MEDIA | **Estado:** 🔴 Pendiente (están como enums, necesitan tabla BD)

---

## 📋 MÓDULO 8: SEGUIMIENTOS

### HU-029 — Listado de Seguimientos
**Como** EDUCADORA, MEDICO o ENFERMERA  
**Quiero** ver el historial de seguimientos de los pacientes  
**Para** controlar la evolución y frecuencia de contacto

**AC:**
- AC1: Tabs: TODOS | PROGRAMADOS | COMPLETADOS
- AC2: Columnas: paciente, tipo contacto, fecha, responsable, estado
- AC3: Tipos de contacto: CONSULTA_MEDICA, LLAMADA, VIDEO, DOMICILIARIA
- AC4: Estado: PROGRAMADO, COMPLETADO, NO_CONTACTADO, CANCELADO
- AC5: Indicador de días sin seguimiento (alerta si >30 días activo)

**Prioridad:** ALTA | **Estado:** ⚠️ Parcial (frontend usa mock, backend tiene endpoints)

---

### HU-030 — Registrar Seguimiento
**Como** EDUCADORA o MEDICO  
**Quiero** registrar un contacto/seguimiento con el paciente  
**Para** documentar la evolución y las acciones tomadas

**AC:**
- AC1: Tipo de contacto, paciente, fecha/hora, duración en minutos
- AC2: Canal: VIRTUAL, PRESENCIAL, TELEFÓNICO
- AC3: Estado del paciente en el contacto: evaluación global
- AC4: Notas de evolución (campo texto enriquecido)
- AC5: Acciones acordadas con el paciente
- AC6: Próximo seguimiento recomendado (fecha y tipo)
- AC7: Si NO_CONTACTADO: motivo y cantidad de intentos

**Prioridad:** ALTA | **Estado:** ⚠️ Parcial (backend OK, frontend desconectado)

---

## ✅ MÓDULO 9: TAREAS PARA EDUCADORAS

### HU-031 — Listado de Tareas
**Como** EDUCADORA o ADMIN  
**Quiero** ver el tablero de tareas pendientes y completadas  
**Para** gestionar mis actividades de seguimiento

**AC:**
- AC1: Vista de tablero (Kanban) o lista con: PENDIENTES | EN_PROCESO | COMPLETADAS
- AC2: KPIs en la cabecera: total tareas, tareas vencidas, completadas hoy
- AC3: Prioridad visual: ALTA (rojo), MEDIA (amarillo), BAJA (verde)
- AC4: Filtro por prioridad, paciente, tipo tarea, canal, fecha

**Prioridad:** ALTA | **Estado:** ⚠️ Parcial (frontend con mock, backend TareaController OK)

---

### HU-032 — Crear Tarea
**Como** EDUCADORA o MEDICO  
**Quiero** crear una tarea para hacer seguimiento a un paciente  
**Para** no perder compromisos de contacto

**AC:**
- AC1: Campos: título, descripción, paciente, tipo tarea, canal (VIRTUAL/PRESENCIAL/TELEFÓNICO)
- AC2: Prioridad: ALTA, MEDIA, BAJA (requerido)
- AC3: Fecha/hora límite, duración estimada
- AC4: Asignar a otra educadora (si ADMIN)
- AC5: Tarea vinculada a un seguimiento existente (opcional)

**RN:**
- RN1: Prioridad es campo obligatorio

**Prioridad:** ALTA | **Estado:** ⚠️ Parcial (backend OK, frontend desconectado)

---

### HU-033 — Gestionar Estado de Tarea
**Como** EDUCADORA  
**Quiero** marcar el resultado de una tarea  
**Para** documentar el contacto realizado

**AC:**
- AC1: Estados: PENDIENTE → EN_PROCESO → EFECTIVA | NO_EFECTIVA | REPROGRAMADA
- AC2: Al marcar EFECTIVA: registrar resultado del contacto, duración real
- AC3: Al marcar NO_EFECTIVA: motivo (NO_RESPONDE, NUMERO_ERRADO, RECHAZO_CONTACTO)
- AC4: Al marcar REPROGRAMADA: nueva fecha/hora obligatoria
- AC5: Al completar, opción de crear seguimiento vinculado automáticamente

**Prioridad:** ALTA | **Estado:** ⚠️ Parcial (backend OK, frontend desconectado)

---

## 🚗 MÓDULO 10: TRANSPORTES

### HU-034 — Gestión de Transportes
**Como** ADMIN o EDUCADORA  
**Quiero** gestionar las solicitudes de transporte para pacientes  
**Para** facilitar el acceso a los servicios de salud

**AC:**
- AC1: CRUD de solicitudes de transporte
- AC2: Tipos: SENCILLO (ida), MULTIPLE (ida y vuelta), CIRCULAR
- AC3: Datos: paciente, fecha, origen, destino, motivo (cita médica, examen, etc.)
- AC4: Estado: SOLICITADO, APROBADO, EN_CURSO, COMPLETADO, CANCELADO
- AC5: Asignar conductor/vehículo (opcional)
- AC6: Filtro por estado, fecha, paciente

**Prioridad:** MEDIA | **Estado:** ✅ Backend (TransporteController en pacientes) | ⚠️ Frontend básico

---

## 📦 MÓDULO 11: INVENTARIO DE PACIENTE

### HU-035 — Ver Inventario por Paciente
**Como** FARMACEUTICA o MEDICO  
**Quiero** ver el stock actual de medicamentos de un paciente  
**Para** planificar entregas futuras

**AC:**
- AC1: Vista del inventario: medicamento, stock actual, stock mínimo, días de tratamiento restantes
- AC2: Alerta visual cuando stock < 30 días de tratamiento
- AC3: Historial de movimientos (entradas por entregas, salidas por aplicaciones)
- AC4: Proyección de agotamiento según dosis prescrita

**Prioridad:** ALTA | **Estado:** ⚠️ Parcial (backend OK en entregas-service, frontend usa mock)

---

### HU-036 — Ajuste Manual de Inventario
**Como** FARMACEUTICA  
**Quiero** registrar ajustes manuales de inventario  
**Para** corregir diferencias o registrar devoluciones

**AC:**
- AC1: Tipo de movimiento: AJUSTE_ENTRADA, AJUSTE_SALIDA, DEVOLUCION
- AC2: Cantidad, motivo obligatorio, fecha
- AC3: El ajuste queda en el historial con auditoría

**Prioridad:** MEDIA | **Estado:** 🔴 Pendiente

---

## 🏥 MÓDULO 12: SERVICIOS COMPLEMENTARIOS

### HU-037 — Gestión de Servicios Complementarios
**Como** ADMIN, MEDICO o trabajadora social  
**Quiero** registrar y gestionar servicios complementarios del paciente  
**Para** brindar atención integral

**Tipos de servicio:**
- **ENFERMERÍA:** Visitas y cuidados de enfermería en el domicilio
- **NUTRICIÓN:** Consultas y seguimiento nutricional
- **PSICOLOGÍA:** Consultas y seguimiento psicológico
- **TRABAJO_SOCIAL:** Gestión social, beneficios, apoyo comunitario

**AC:**
- AC1: Registrar servicio con: paciente, tipo, profesional asignado, fecha, estado
- AC2: Estado: SOLICITADO, PROGRAMADO, REALIZADO, CANCELADO
- AC3: Notas del profesional al completar el servicio
- AC4: Listado por tipo con filtros y búsqueda

**Prioridad:** MEDIA | **Estado:** ⚠️ Parcial (backend ServicioComplementarioController OK, frontend usa mock)

---

## 📊 MÓDULO 13: DASHBOARD Y KPIs

### HU-038 — Dashboard Principal
**Como** cualquier usuario del sistema  
**Quiero** ver un dashboard con KPIs relevantes a mi rol  
**Para** tener visibilidad del estado general del programa

**KPIs por rol:**
- **ADMIN/MEDICO:** Total pacientes, pacientes activos, pacientes vencidos en entregas, tareas vencidas
- **FARMACEUTICA:** Entregas pendientes, stock bajo, medicamentos próximos a vencer
- **EDUCADORA:** Tareas pendientes, pacientes sin contacto >30 días, barreras activas

**AC:**
- AC1: Cards de KPI con número y variación vs. mes anterior
- AC2: Gráfico de distribución por estado de paciente
- AC3: Gráfico de adherencia mensual
- AC4: Tabla de los 10 pacientes que requieren atención inmediata
- AC5: Los datos son reales del backend (no mock)
- AC6: Actualización automática cada 5 minutos

**Prioridad:** ALTA | **Estado:** ⚠️ Parcial (UI OK, datos son estáticos/mock)

---

### HU-039 — Dashboard de Adherencia
**Como** MEDICO o ADMIN  
**Quiero** ver métricas de adherencia al tratamiento  
**Para** identificar pacientes en riesgo

**AC:**
- AC1: Tasa de adherencia global (aplicaciones realizadas / programadas) por período
- AC2: Listado de pacientes con adherencia < 80%
- AC3: Trending de adherencia mensual (gráfico de línea)
- AC4: Desglose por tipo de medicamento y por educadora

**Prioridad:** MEDIA | **Estado:** 🔴 Pendiente (AdherenciaController existe en backend)

---

## 📈 MÓDULO 14: REPORTES

### HU-040 — Generación de Reportes
**Como** ADMIN, MEDICO o AUDITOR  
**Quiero** generar reportes del sistema en diferentes formatos  
**Para** análisis y presentación de indicadores

**Tipos de reporte:**
- Listado de pacientes (con filtros aplicados)
- Seguimientos por período
- Adherencia por paciente/medicamento
- Entregas por operador logístico
- Barreras identificadas y resueltas
- Indicadores de programa por período

**AC:**
- AC1: Seleccionar tipo de reporte, rango de fechas, y filtros adicionales
- AC2: Vista previa en pantalla antes de exportar
- AC3: Exportar a Excel (.xlsx) y PDF
- AC4: El reporte incluye logo de la institución y fecha de generación
- AC5: Los reportes exportados tienen formato profesional con columnas apropiadas

**Prioridad:** MEDIA | **Estado:** ⚠️ Parcial (UI OK con mock, backend pendiente)

---

## ⚙️ MÓDULO 15: PANEL DE ADMINISTRACIÓN DE CATÁLOGOS

### HU-041 — Dashboard de Administración
**Como** ADMIN  
**Quiero** acceder a un panel centralizado de administración  
**Para** gestionar todos los catálogos del sistema desde un solo lugar

**AC:**
- AC1: Ruta `/admin` accesible solo para ADMIN y SUPER_ADMIN
- AC2: Menú lateral con todas las secciones de catálogos
- AC3: Indicador de registros activos por catálogo
- AC4: Acceso rápido a los catálogos más usados

**Prioridad:** ALTA | **Estado:** 🔴 Pendiente

---

### HU-042 — Gestión de EPS
**Como** ADMIN  
**Quiero** gestionar el catálogo de EPS  
**Para** mantener actualizada la lista de aseguradoras disponibles

**AC:**
- AC1: Listado con paginación, búsqueda por nombre/NIT, filtro por régimen y estado
- AC2: Crear EPS: nombre, NIT, régimen (CONTRIBUTIVO, SUBSIDIADO, ESPECIAL), teléfono, dirección
- AC3: Editar todos los campos excepto NIT
- AC4: Activar/desactivar con confirmación (no eliminar físicamente)
- AC5: EPS inactiva no aparece en dropdowns de registro de pacientes
- AC6: Carga masiva desde Excel con plantilla descargable
- AC7: La plantilla Excel incluye validaciones y ejemplos

**Prioridad:** ALTA | **Estado:** 🔴 Pendiente (GET existe, CRUD no)

---

### HU-043 — Gestión de IPS
**Como** ADMIN  
**Quiero** gestionar el catálogo de IPS  
**Para** tener actualizadas las instituciones prestadoras de salud

**AC:**
- AC1: CRUD completo con: nombre, NIT/código, ciudad, teléfono, dirección, tipo IPS
- AC2: Filtro por ciudad, tipo, estado
- AC3: Activar/desactivar
- AC4: Carga masiva desde Excel
- AC5: IPS inactiva no aparece en dropdowns

**Prioridad:** ALTA | **Estado:** 🔴 Pendiente

---

### HU-044 — Gestión de Operadores Logísticos
**Como** ADMIN  
**Quiero** gestionar los operadores logísticos de distribución  
**Para** que estén disponibles en la programación de entregas

**AC:**
- AC1: CRUD: nombre, NIT, teléfono, email, cobertura geográfica
- AC2: Activar/desactivar
- AC3: Operador inactivo no aparece en dropdowns de entregas

**Prioridad:** ALTA | **Estado:** 🔴 Pendiente

---

### HU-045 — Gestión de Departamentos y Ciudades
**Como** ADMIN  
**Quiero** gestionar el catálogo geográfico de Colombia  
**Para** que los dropdowns de ubicación estén completos y precisos

**AC:**
- AC1: Listado de 32 departamentos con sus ciudades
- AC2: Activar/desactivar departamentos y ciudades
- AC3: Agregar nuevas ciudades a un departamento
- AC4: Departamento inactivo oculta sus ciudades del dropdown

**RN:**
- RN1: No se pueden eliminar departamentos o ciudades con pacientes asociados

**Prioridad:** ALTA | **Estado:** 🔴 Pendiente (GET existe, CRUD no)

---

### HU-046 — Gestión de Laboratorios y Tipos de Examen
**Como** ADMIN  
**Quiero** gestionar laboratorios y tipos de examen paraclínico  
**Para** que estén disponibles al solicitar exámenes

**AC:**
- AC1: CRUD laboratorios: nombre, ciudad, teléfono, dirección, contacto
- AC2: CRUD tipos de examen: nombre, código, descripción, parámetros de resultado
- AC3: Activar/desactivar
- AC4: Carga masiva de tipos de examen desde Excel

**Prioridad:** ALTA | **Estado:** ✅ Backend TipoParaclinico | 🔴 Frontend admin pendiente

---

### HU-047 — Gestión de Diagnósticos CIE-10
**Como** ADMIN  
**Quiero** gestionar el catálogo de diagnósticos CIE-10  
**Para** que el registro de pacientes y prescripciones use códigos estándar

**AC:**
- AC1: Catálogo preloadado con CIE-10 de Colombia (~15,000 códigos)
- AC2: Búsqueda por código o descripción
- AC3: Activar/desactivar diagnósticos específicos para el programa
- AC4: Carga masiva del catálogo CIE-10 completo desde CSV
- AC5: Los diagnósticos activos aparecen en autocompletado de pacientes y prescripciones

**Prioridad:** ALTA | **Estado:** 🔴 Pendiente (entidad no existe)

---

### HU-048 — Gestión de Programas PSP
**Como** ADMIN  
**Quiero** gestionar los programas PSP disponibles  
**Para** categorizar a los pacientes por programa de seguimiento

**AC:**
- AC1: CRUD: nombre del programa, descripción, patología objetivo, estado
- AC2: Activar/desactivar programas
- AC3: Un paciente solo puede pertenecer a un programa PSP a la vez

**Prioridad:** ALTA | **Estado:** 🔴 Pendiente

---

### HU-049 — Gestión de Tipos de Documento
**Como** ADMIN  
**Quiero** gestionar los tipos de documento de identidad  
**Para** que el registro de pacientes tenga opciones actualizadas

**AC:**
- AC1: Listado: CC, TI, CE, PS, RC, NUIP, DIE
- AC2: Activar/desactivar tipos
- AC3: Agregar nuevos tipos si DIAN actualiza

**Prioridad:** MEDIA | **Estado:** 🔴 Pendiente (GET existe, CRUD no)

---

### HU-050 — Carga Masiva de Datos (Todos los Catálogos)
**Como** ADMIN  
**Quiero** cargar múltiples registros de un catálogo mediante un archivo Excel o CSV  
**Para** poblar el sistema rápidamente sin ingreso manual uno a uno

**AC:**
- AC1: Botón "Carga Masiva" disponible en todos los catálogos que lo soporten
- AC2: Descarga de plantilla Excel con headers y formato esperado
- AC3: Upload del archivo (máx. 5MB, formatos: .xlsx, .xls, .csv)
- AC4: Vista previa de los primeros 10 registros antes de confirmar
- AC5: Validación del archivo: campos requeridos, formatos, duplicados
- AC6: Reporte de resultados: X registros creados, Y errores con descripción
- AC7: Los errores no bloquean los registros válidos (procesa lo que puede)

**RN:**
- RN1: Si un registro ya existe (por código/nombre único), se actualiza, no se duplica
- RN2: El archivo no puede superar 10,000 filas por carga

**Prioridad:** ALTA | **Estado:** 🔴 Pendiente

---

## 🏗️ MÓDULO 16: INFRAESTRUCTURA Y TRANSVERSALES

### HU-051 — Auditoría de Acciones
**Como** AUDITOR o ADMIN  
**Quiero** ver un log de todas las acciones realizadas en el sistema  
**Para** tener trazabilidad y cumplir normatividad

**AC:**
- AC1: Log con: usuario, acción (CREATE/UPDATE/DELETE), entidad afectada, datos antes/después, timestamp, IP
- AC2: Filtro por usuario, tipo acción, entidad, rango de fechas
- AC3: No se pueden modificar ni eliminar registros del log
- AC4: Exportable a Excel

**RN:**
- RN1: Todas las operaciones CUD (Create/Update/Delete) quedan en auditoría automáticamente

**Prioridad:** MEDIA | **Estado:** ⚠️ Parcial (V21 trigger auditoría en BD, falta UI)

---

### HU-052 — Notificaciones del Sistema
**Como** usuario del sistema  
**Quiero** recibir notificaciones sobre eventos relevantes  
**Para** actuar oportunamente sin revisar el sistema manualmente

**AC:**
- AC1: Ícono de campana en la navbar con contador de no leídas
- AC2: Tipos de notificación: tarea vencida, entrega próxima, resultado de examen disponible, paciente sin contacto
- AC3: Marcar como leída individual o "Marcar todas como leídas"
- AC4: Click en notificación navega al recurso relacionado

**Prioridad:** MEDIA | **Estado:** ⚠️ Parcial (NotificationsDrawer existe, sin datos reales)

---

## 📊 RESUMEN DE ESTADO

| Módulo | HUs | Implementadas | Parciales | Pendientes |
|--------|-----|---------------|-----------|------------|
| Autenticación | 4 | 1 | 1 | 2 |
| Pacientes | 6 | 4 | 2 | 0 |
| Prescripciones | 4 | 3 | 0 | 1 |
| Aplicaciones | 3 | 3 | 0 | 0 |
| Entregas | 3 | 3 | 0 | 0 |
| Paraclínicos | 4 | 0 | 2 | 2 |
| Barreras | 4 | 1 | 2 | 1 |
| Seguimientos | 2 | 0 | 2 | 0 |
| Tareas | 3 | 0 | 3 | 0 |
| Transportes | 1 | 0 | 1 | 0 |
| Inventario | 2 | 0 | 1 | 1 |
| Serv. Complementarios | 1 | 0 | 1 | 0 |
| Dashboard | 2 | 0 | 1 | 1 |
| Reportes | 1 | 0 | 1 | 0 |
| **Admin Catálogos** | **10** | **0** | **0** | **10** |
| Infraestructura | 2 | 0 | 2 | 0 |
| **TOTAL** | **52** | **15 (29%)** | **19 (37%)** | **18 (34%)** |

---

## 🎯 CRITERIOS DE DONE (Definition of Done)

Para considerar una historia de usuario "completamente implementada":

- [ ] Backend: endpoint(s) con validación de entrada, manejo de errores, documentación Swagger
- [ ] Frontend: página/componente conectado al API real (sin mock data en producción)
- [ ] Tests: al menos 1 test de integración backend + 1 test unitario frontend
- [ ] Reglas de negocio validadas en backend (no solo en frontend)
- [ ] Datos de auditoría registrados automáticamente
- [ ] UI responsive (móvil + desktop)
- [ ] Sin errores en consola de browser
- [ ] Health check del módulo pasa

---

*Documento generado por PSP Tech Lead — Marzo 24, 2026*  
*Próxima revisión: Abril 7, 2026*
