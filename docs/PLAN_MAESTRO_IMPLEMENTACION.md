# 🎯 PLAN MAESTRO DE IMPLEMENTACIÓN PSP

**Proyecto**: Program Support Patient (PSP)  
**Fecha**: Marzo 12, 2026  
**Coordinador**: PSP Tech Lead  
**Stack**: React 18 + Spring Boot 3.2.3 + PostgreSQL 15 + Kubernetes

---

## 📋 TABLA DE CONTENIDOS

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Roles del Sistema (SOLO 3)](#roles-del-sistema)
3. [Plan Backend Developer](#plan-backend-developer)
4. [Plan Frontend Developer](#plan-frontend-developer)
5. [Plan Software Architect](#plan-software-architect)
6. [Plan de Actividades Constantes](#plan-de-actividades-constantes)
7. [Criterios de Aceptación](#criterios-de-aceptacion)

---

## 🎖️ RESUMEN EJECUTIVO

### **Cambios Críticos Implementados**

✅ **COMPLETADO** (Marzo 12, 2026 - 3 horas):
- Cambio completo de paleta de colores: **Indigo (#4F46E5) + Cyan (#06B6D4)**
- Eliminación total de color verde/teal (#1a5566)
- Dashboard general con **Panel de Filtros Avanzados**
- KPIs simples y generales (no complejos)
- Sidebar modernizado con nueva paleta
- Componente FilterPanel reutilizable

### **Visión del Sistema**

**TODO lo que hace un EDUCADOR debe quedar registrado**  
**El EDUCADOR debe ver TODO del PACIENTE**  

**SOLO 3 ROLES** (crítico):
- ✅ **Admin**: Control total del sistema
- ✅ **Coordinador**: Supervisa educadores, genera reportes
- ✅ **Educador**: Núcleo del sistema - Crea tareas, registra entregas/aplicaciones, seguimientos

⚠️ **ELIMINADOS**: Médico, Enfermero (no existen en este sistema)

---

## 👥 ROLES DEL SISTEMA (SOLO 3)

### **1. ADMIN**

**Permisos**:
- CRUD completo de usuarios
- Configuración de catálogos (EPS, IPS, departamentos, medicamentos, diagnósticos)
- Gestión de barreras maestras
- Reportes globales
- Auditoría del sistema

**Pantallas**:
- Dashboard administrativo
- Gestión de usuarios
- Configuración de catálogos
- Auditoría y logs

---

### **2. COORDINADOR**

**Permisos**:
- Ver todos los pacientes del programa
- Ver actividades de TODOS los educadores
- Generar reportes de adherencia
- Reasignar pacientes entre educadores
- Supervisar barreras no resueltas
- Crear y gestionar metas/indicadores

**Pantallas**:
- Dashboard de supervisión (vista agregada)
- Lista de pacientes (filtro por educadora)
- Reportes y analytics
- Gestión de educadoras
- Indicadores de desempeño

---

### **3. EDUCADOR** ⭐ **ROL PRINCIPAL**

**Permisos**:
- Ver SOLO sus pacientes asignados
- Registrar TODO lo que hace con el paciente:
  - ✅ Seguimientos (presencial, telefónico, virtual, domiciliaria)
  - ✅ Entregas de medicamentos
  - ✅ Aplicaciones de medicamentos
  - ✅ Identificación de barreras
  - ✅ Creación de tareas
  - ✅ Acompañamiento a citas
  - ✅ Solicitud de paraclínicos
  - ✅ Educación grupal/individual

**Pantallas** (CRÍTICAS):
- Dashboard educador (SOLO sus pacientes)
- **Vista 360° del Paciente** (TODO del paciente en un solo lugar)
  - Datos personales + foto
  - Diagnósticos activos
  - Prescripciones vigentes
  - Entregas programadas y realizadas
  - Aplicaciones programadas y realizadas
  - Seguimientos históricos
  - Barreras identificadas (activas/resueltas)
  - Tareas asignadas (pendientes/completadas)
  - Paraclínicos solicitados
  - Consultas programadas
  - Indicadores de adherencia
  - Timeline completo de actividades

- Mis Actividades Hoy
- Calendario de programación
- Formularios de registro rápidos

---

## 🔧 PLAN BACKEND DEVELOPER

### **Objetivo**: Construir APIs REST completas para 21 tablas del modelo ER

### **FASE 1: Servicios Core (4 semanas)**

#### **Semana 1-2: Servicio Pacientes (PRIORITARIO)**

**Entregables**:
```
services/pacientes/
├── src/main/java/com/psp/pacientes/
│   ├── controller/
│   │   └── PacienteController.java      ✅ Ya existe
│   ├── service/
│   │   ├── PacienteService.java         ✅ Ya existe
│   │   └── EducadorService.java         ⭐ NUEVO - Filtrar pacientes por educadora
│   ├── repository/
│   │   └── PacienteRepository.java      ✅ Ya existe
│   ├── dto/
│   │   ├── PacienteDTO.java             ✅ Ya existe
│   │   ├── Paciente360DTO.java          ⭐ NUEVO - Vista completa del paciente
│   │   └── PacienteListDTO.java         ✅ Ya existe
│   └── entity/
│       └── Paciente.java                ✅ Ya existe
```

**Nuevos Endpoints**:
```java
// Vista 360 del paciente
GET /api/v1/pacientes/{id}/vista-360
Response: {
  paciente: {...},
  prescripciones: [...],
  entregas: [...],
  aplicaciones: [...],
  seguimientos: [...],
  barreras: [...],
  tareas: [...],
  paraclinicos: [...],
  timeline: [...]  // Todas las actividades ordenadas
}

// Pacientes por educadora (para coordinador)
GET /api/v1/pacientes?educadoraId={id}

// Pacientes de MI educadora (educador autenticado)
GET /api/v1/pacientes/mis-pacientes
```

**Validaciones Críticas**:
- ✅ 1 paciente → 1 educadora responsable (obligatorio)
- ✅ Estados válidos: EN_PROCESO, ACTIVO, SUSPENDIDO, DROP_OUT, INACTIVO, FALLECIDO
- ✅ No permitir eliminar pacientes (soft delete)

---

#### **Semana 2-3: Servicio Seguimientos**

**Endpoints**:
```
POST   /api/v1/seguimientos
GET    /api/v1/seguimientos?pacienteId={id}
GET    /api/v1/seguimientos?educadoraId={id}
GET    /api/v1/seguimientos?fecha={YYYY-MM-DD}
PUT    /api/v1/seguimientos/{id}
GET    /api/v1/seguimientos/{id}
```

**Tipos de Seguimiento** (ENUM):
```java
public enum TipoSeguimiento {
  ACOMPAÑAMIENTO_CITA,
  TAREA_INDICACION,
  ENTREGA_MEDICAMENTO,
  APLICACION_MEDICAMENTO,
  CONSULTA_PARACLINICA,
  SEGUIMIENTO_BARRERA,
  EDUCACION_GRUPAL,
  MONITOREO_SINTOMAS,
  LLAMADA_SEGUIMIENTO,
  OTRO
}
```

**Modalidad** (ENUM):
```java
public enum ModalidadContacto {
  PRESENCIAL,
  VIRTUAL,
  TELEFONICA,
  DOMICILIARIA
}
```

---

#### **Semana 3-4: Servicio Barreras**

**Endpoints**:
```
// Catálogo de barreras (maestro)
GET    /api/v1/barreras/catalogo
POST   /api/v1/barreras/catalogo         // Admin only

// Registro de barreras por paciente
POST   /api/v1/barreras/registrar
GET    /api/v1/barreras?pacienteId={id}
GET    /api/v1/barreras?estado=ACTIVA
PUT    /api/v1/barreras/{id}/resolver
GET    /api/v1/barreras/estadisticas     // Coordinador
```

**Categorías de Barrera** (ENUM):
```java
public enum CategoriaBarrera {
  ECONOMICA,       // Sin dinero, transporte
  GEOGRAFICA,      // Vive lejos, difícil acceso
  SOCIAL,          // Presión laboral, cuida otros
  EDUCATIVA,       // No entiende, analfabeto
  CLINICA,         // Efectos secundarios, desconfianza
  DEL_SISTEMA,     // Citas lejanas, demoras
  MOTIVACIONAL,    // Olvido, falta importancia
  CULTURAL         // Creencias, remedios caseros
}
```

**Regla Crítica**:
- ✅ **1 paciente = máximo 1 barrera ACTIVA de la misma categoría a la vez**
- Cuando se crea barrera nueva, se debe pasar automáticamente la anterior a "EN_INTERVENCION" o "RESUELTA"

---

### **FASE 2: Servicios Clínicos (3 semanas)**

#### **Semana 5: Servicio Prescripciones**

**Estructura**:
```
services/prescripciones/
├── entity/
│   ├── Prescripcion.java
│   └── ItemPrescripcion.java
├── controller/
│   ├── PrescripcionController.java
│   └── ItemPrescripcionController.java
```

**Endpoints**:
```
POST   /api/v1/prescripciones
GET    /api/v1/prescripciones?pacienteId={id}
GET    /api/v1/prescripciones/{id}/items
POST   /api/v1/prescripciones/{id}/items
PUT    /api/v1/prescripciones/{id}/suspender
```

**Cálculo Automático**:
```java
// Adherencia del item
porcentajeAdherencia = (cantidadAplicada / cantidadTotalIndicada) * 100
```

---

#### **Semana 6: Servicio Entregas**

**Endpoints**:
```
POST   /api/v1/entregas
GET    /api/v1/entregas?pacienteId={id}
GET    /api/v1/entregas?educadoraId={id}&fecha={YYYY-MM-DD}
PUT    /api/v1/entregas/{id}/marcar-entregada
PUT    /api/v1/entregas/{id}/marcar-no-entregada
GET    /api/v1/entregas/programadas-hoy
```

**Validaciones**:
- ✅ Si estado = NO_ENTREGADA → `id_barrera_si_no_entregada` OBLIGATORIO
- ✅ Foto de firma digital (Base64 o URL)
- ✅ Validar fecha de vencimiento del producto

---

#### **Semana 7: Servicio Aplicaciones**

**Endpoints**:
```
POST   /api/v1/aplicaciones
GET    /api/v1/aplicaciones?pacienteId={id}
GET    /api/v1/aplicaciones?educadoraId={id}&fecha={YYYY-MM-DD}
PUT    /api/v1/aplicaciones/{id}/marcar-aplicada
PUT    /api/v1/aplicaciones/{id}/marcar-no-aplicada
GET    /api/v1/aplicaciones/programadas-hoy
```

**Campos Críticos**:
```java
public class AplicacionDTO {
  private LocalDateTime fechaHoraRealAplicacion;
  private BigDecimal dosisAplicadaCantidad;
  private String dosisAplicadaUnidad;  // mg, ml, unidades, etc.
  private String viasAdministracionUtilizada;
  private String observacionesAplicacion;
  private String efectosInmediatosObservados;
  private String efectosSecundariosReportados;
  private Boolean aplicacionCompleta;  // si, no, parcial
  private String razonSiNoCompleta;
  private Long idBarreraSiNoAplicada;
}
```

---

### **FASE 3: Servicios Complementarios (2 semanas)**

#### **Semana 8: Servicio Tareas**

**Endpoints**:
```
POST   /api/v1/tareas
GET    /api/v1/tareas?pacienteId={id}
GET    /api/v1/tareas?educadoraId={id}&estado=PENDIENTE
PUT    /api/v1/tareas/{id}/completar
PUT    /api/v1/tareas/{id}/cancelar
GET    /api/v1/tareas/vencidas
```

**Tipos de Tarea** (ENUM):
```java
public enum TipoTarea {
  TOMAR_MEDICAMENTO,
  EJERCICIO,
  DIETA,
  ACUDIR_CITA,
  RECOLECTAR_PARACLINICO,
  MONITOREO_SINTOMAS,
  EDUCACION_TEMA,
  ENTREGA_DOCUMENTO,
  OTRO
}
```

---

#### **Semana 9: Servicio Paraclínicos**

**Endpoints**:
```
POST   /api/v1/paraclinicos
GET    /api/v1/paraclinicos?pacienteId={id}
PUT    /api/v1/paraclinicos/{id}/resultado
GET    /api/v1/paraclinicos/pendientes
```

**Entity**:
```java
public class Paraclinico {
  // ... campos de solicitud
  private List<ResultadoParaclinico> resultados;
}

public class ResultadoParaclinico {
  private String archivoPDF;
  private String archivoImagen;
  private Boolean valoresNormales;
  private String observacionesLaboratorio;
  private String recomendacionesMedico;
}
```

---

### **FASE 4: Servicios Maestros (1 semana)**

#### **Semana 10: APIs de Catálogos**

**Endpoints**:
```
// EPS
GET /api/v1/catalogos/eps
POST /api/v1/catalogos/eps  // Admin only

// Departamentos y Municipios
GET /api/v1/catalogos/departamentos
GET /api/v1/catalogos/municipios?departamentoId={id}

// Diagnósticos (CIE-10)
GET /api/v1/catalogos/diagnosticos
GET /api/v1/catalogos/diagnosticos/buscar?query={text}

// Medicamentos
GET /api/v1/catalogos/medicamentos
GET /api/v1/catalogos/medicamentos/buscar?query={text}

// Laboratorios
GET /api/v1/catalogos/laboratorios
GET /api/v1/catalogos/laboratorios?departamentoId={id}
```

---

### **FASE 5: Reportes y Analytics (1 semana)**

#### **Semana 11: Servicio Reportes**

**Endpoints para Coordinador**:
```
GET /api/v1/reportes/adherencia-general
GET /api/v1/reportes/adherencia-por-educadora
GET /api/v1/reportes/barreras-por-categoria
GET /api/v1/reportes/actividades-por-educadora
GET /api/v1/reportes/pacientes-por-estado
GET /api/v1/reportes/indicadores-cumplimiento

// Con filtros avanzados
GET /api/v1/reportes/dashboard?
    fechaInicio=2026-01-01&
    fechaFin=2026-03-12&
    educadoraId=EDU001&
    estadoPaciente=ACTIVO&
    diagnostico=C50&
    eps=1&
    departamento=11&
    tipoBarrera=ECONOMICA
```

**Response Example**:
```json
{
  "periodo": { "inicio": "2026-01-01", "fin": "2026-03-12" },
  "filtrosAplicados": {...},
  "kpis": {
    "totalPacientes": 50,
    "pacientesActivos": 42,
    "tasaAdherencia": 87.5,
    "barrerasActivas": 4,
    "actividadesRealizadas": 245
  },
  "tendenciaAdherencia": [...],  // Datos para gráfico de línea
  "pacientesPorEstado": [...],    // Datos para gráfico de barras
  "barrerasPorCategoria": [...],  // Datos para gráfico de dona
  "educadorasDesempeño": [...]    // Ranking de educadoras
}
```

---

### **CHECKLIST BACKEND**

#### **Estándares de Código**

- ✅ Validaciones con Bean Validation (`@NotNull`, `@Size`, `@Email`)
- ✅ DTOs separados de Entities (nunca exponer Entity directamente)
- ✅ Paginación en todas las listas (PageRequest, Pageable)
- ✅ Filtros dinámicos con Specifications
- ✅ Manejo de errores con `@ControllerAdvice`
- ✅ Documentación Swagger/OpenAPI completa
- ✅ Tests unitarios >70% coverage
- ✅ Logs estructurados (SLF4J + Logback)

#### **Seguridad**

- ✅ JWT en todos los endpoints (excepto `/actuator/health`)
- ✅ Validar rol en cada endpoint:
  - Admin: acceso total
  - Coordinador: solo lectura de todos, escritura de configuraciones
  - Educador: solo CRUD de sus pacientes asignados
- ✅ CORS configurado correctamente
- ✅ SQL Injection protection (JPA Criteria API)
- ✅ No exponer stack traces en respuestas

#### **Performance**

- ✅ Índices en tablas:
  - `pacientes.id_educadora_responsable`
  - `seguimientos.id_paciente`
  - `entregas.fecha_real_entrega`
  - `aplicaciones.fecha_programada_aplicacion`
  - `barreras_paciente_registro.estado_resolucion`
- ✅ Lazy loading en relaciones @OneToMany
- ✅ Caché con Redis para catálogos (EPS, departamentos, etc.)
- ✅ Paginación default: 20 items/página

---

## 🎨 PLAN FRONTEND DEVELOPER

### **Objetivo**: Interfaces modernas para educador, coordinador y admin

### **FASE 1: Dashboard y Navegación (1 semana)**

✅ **COMPLETADO** (Marzo 12, 2026):
- Dashboard general con KPIs simples
- Panel de filtros avanzados colapsable
- Sidebar con nueva paleta Indigo/Cyan
- Componente FilterPanel reutilizable

---

### **FASE 2: Vista 360° del Paciente (2 semanas)**

#### **Componente: PacienteVista360Page.tsx**

**Ruta**: `/patients/:id/vista-360`

**Layout**:
```
┌─────────────────────────────────────────────────────────────┐
│ Header: Foto + Nombre + Estado + Educadora                 │
├───────────────────┬─────────────────────────────────────────┤
│ Sidebar Tabs:     │ Contenido Principal                     │
│ • Resumen         │                                         │
│ • Prescripciones  │  [Contenido según tab seleccionado]    │
│ • Entregas        │                                         │
│ • Aplicaciones    │                                         │
│ • Seguimientos    │                                         │
│ • Barreras        │                                         │
│ • Tareas          │                                         │
│ • Paraclínicos    │                                         │
│ • Timeline        │                                         │
└───────────────────┴─────────────────────────────────────────┘
```

**Tab: Resumen**
- Card: Datos personales (doc, edad, dirección, EPS, IPS)
- Card: Diagnósticos activos (con códigos CIE-10)
- Card: Indicadores de adherencia (circular progress)
- Card: Alertas (barreras activas, citas próximas, tareas vencidas)

**Tab: Prescripciones**
- Tabla: Prescripciones activas
  - Columns: Fecha, Medicamento, Dosis, Frecuencia, Duración, Estado
  - Filtro: Activas / Suspendidas / Vencidas / Todas
- Timeline vertical de prescripciones históricas

**Tab: Entregas**
- Calendario mensual con entregas programadas
- Lista de entregas:
  - Estado: Programada (azul), Entregada (verde), No Entregada (rojo)
  - Botones: "Marcar Entregada", "Marcar No Entregada"
  - Dialog de firma digital
- Estadísticas: Total entregadas, No entregadas, Tasa cumplimiento

**Tab: Aplicaciones**
- Lista de aplicaciones programadas/completadas
- Filtro temporal: Hoy, Esta semana, Este mes, Todas
- Botones: "Marcar Aplicada", "Marcar No Aplicada"
- Dialog con campos:
  - Cantidad aplicada (dosis)
  - Fecha y hora real
  - Descripción de dosis
  - Observaciones
  - Efectos observados

**Tab: Seguimientos**
- Timeline vertical de todos los seguimientos
- Iconos según modalidad (teléfono, casa, video, presencial)
- Filtro por tipo de seguimiento
- Botón: "Nuevo Seguimiento"

**Tab: Barreras**
- Lista de barreras:
  - Activas (destacadas en rojo/naranja)
  - En intervención (amarillo)
  - Resueltas (verde)
- Gráfico de categorías de barreras (dona)
- Botón: "Identificar Nueva Barrera"

**Tab: Tareas**
- Tablero Kanban:
  - Columna: Pendientes
  - Columna: En Proceso
  - Columna: Completadas
  - Columna: Vencidas
- Filtro por prioridad (Alta, Media, Baja)
- Botón: "Asignar Nueva Tarea"

**Tab: Paraclínicos**
- Lista de exámenes solicitados
- Estados: Solicitado, Programado, Tomada muestra, Resultado disponible
- Botón: Ver PDF de resultado
- Observaciones del laboratorio

**Tab: Timeline** ⭐ **MÁS IMPORTANTE**
- **TODAS las actividades del paciente en orden cronológico**
- Incluye:
  - Seguimientos
  - Entregas
  - Aplicaciones
  - Barreras identificadas
  - Tareas creadas/completadas
  - Paraclínicos solicitados
  - Consultas programadas
- Filtro temporal
- Búsqueda por palabra clave
- Colores según tipo de actividad

---

### **FASE 3: Formularios de Registro Rápido (1 semana)**

#### **Quick Actions Modal**

**Botón flotante**: "Acción Rápida" (FAB en esquina inferior derecha)

**Menú de acciones**:
1. ✅ Registrar Seguimiento
2. ✅ Marcar Entrega
3. ✅ Marcar Aplicación
4. ✅ Crear Tarea
5. ✅ Identificar Barrera
6. ✅ Solicitar Paraclínico

**Formulario: Registrar Seguimiento**
```tsx
<Dialog>
  <Autocomplete label="Paciente" />
  <Select label="Tipo de Seguimiento" options={tipos} />
  <Select label="Modalidad" options={modalidades} />
  <DateTimePicker label="Fecha y Hora" />
  <TextField label="Duración (minutos)" type="number" />
  <TextField label="Ubicación" />
  <TextField label="Observaciones" multiline rows={4} />
  <Select label="Resultado" options={resultados} />
  <Button>Registrar</Button>
</Dialog>
```

---

### **FASE 4: Dashboard Educador (1 semana)**

**Ruta**: `/dashboard/educador`

**Secciones**:

1. **Mis Estadísticas Hoy**
   - Pacientes asignados: 12
   - Actividades realizadas hoy: 8
   - Entregas completadas: 5
   - Aplicaciones completadas: 3

2. **Actividades Pendientes**
   - Lista de entregas programadas para HOY
   - Lista de aplicaciones programadas para HOY
   - Tareas vencidas de mis pacientes

3. **Alertas**
   - Pacientes con barreras activas
   - Citas médicas de mis pacientes HOY
   - Resultados de paraclínicos disponibles

4. **Mis Pacientes**
   - Grid de cards con foto, nombre, estado
   - Indicador de adherencia
   - Última actividad
   - Click → Vista 360°

---

### **FASE 5: Dashboard Coordinador (1 semana)**

**Ruta**: `/dashboard/coordinador`

**Secciones**:

1. **Indicadores Globales**
   - Total pacientes del programa
   - Tasa de adherencia general
   - Barreras activas totales
   - Actividades realizadas hoy (todas las educadoras)

2. **Desempeño por Educadora**
   - Tabla:
     - Educadora | Pacientes Asignados | Actividades Hoy | Tasa Adherencia | Barreras Activas
   - Ranking de cumplimiento

3. **Gráficos**
   - Tendencia de adherencia (últimos 6 meses)
   - Pacientes por estado (activo, suspendido, etc.)
   - Barreras por categoría
   - Actividades por tipo

4. **Panel de Filtros Avanzados** (reutilizar FilterPanel)

---

### **FASE 6: Reportes (1 semana)**

**Ruta**: `/reportes`

**Tipos de Reporte**:

1. **Reporte de Adherencia**
   - Filtros: Rango de fechas, educadora, EPS, diagnóstico
   - Gráfico de tendencia
   - Tabla con detalles por paciente
   - Exportar a Excel/PDF

2. **Reporte de Barreras**
   - Filtros: Categoría, estado, educadora, período
   - Gráfico de categorías
   - Tabla con barreras identificadas
   - Tiempo promedio de resolución

3. **Reporte de Actividades**
   - Filtros: Educadora, tipo de actividad, período
   - Gráfico de actividades por tipo
   - Tabla detallada
   - Horas dedicadas por educadora

4. **Reporte de Cumplimiento**
   - % de entregas completadas
   - % de aplicaciones completadas
   - % de tareas completadas
   - Comparativo entre educadoras

---

### **CHECKLIST FRONTEND**

#### **Estándares de Código**

- ✅ TypeScript strict mode
- ✅ ESLint + Prettier configurados
- ✅ Componentes funcionales con hooks
- ✅ Custom hooks para lógica reutilizable
- ✅ Zustand para estado global
- ✅ React Query para cache de datos
- ✅ Lazy loading de rutas
- ✅ Memoización con useMemo/useCallback en componentes pesados

#### **UI/UX**

- ✅ Material-UI v5 + tema personalizado
- ✅ Paleta Indigo/Cyan (NO verde)
- ✅ Glassmorphism en cards principales
- ✅ Framer Motion para animaciones
- ✅ Loading states con Skeleton
- ✅ Error boundaries
- ✅ Toast notifications (success, error, info)
- ✅ Confirmación de acciones destructivas
- ✅ Responsive design (mobile-first)

#### **Accesibilidad**

- ✅ Aria labels en todos los botones
- ✅ Contraste mínimo 4.5:1
- ✅ Navegación con teclado funcional
- ✅ Focus visible
- ✅ Textos alternativos en imágenes

---

## 🏗️ PLAN SOFTWARE ARCHITECT

### **Objetivo**: Infraestructura robusta y escalable

### **FASE 1: Kubernetes & CI/CD (2 semanas)**

#### **Estructura de Microservicios**

```
k8s/
├── namespaces/
│   └── psp-production.yaml
├── deployments/
│   ├── auth-deployment.yaml            (puerto 8001)
│   ├── pacientes-deployment.yaml       (puerto 8002)
│   ├── prescripciones-deployment.yaml  (puerto 8003)
│   ├── seguimientos-deployment.yaml    (puerto 8004)
│   ├── entregas-deployment.yaml        (puerto 8005)
│   ├── aplicaciones-deployment.yaml    (puerto 8006)
│   ├── barreras-deployment.yaml        (puerto 8007)
│   ├── catalogos-deployment.yaml       (puerto 8008)
│   ├── reportes-deployment.yaml        (puerto 8009)
│   └── frontend-deployment.yaml        (puerto 3000)
├── services/
│   ├── auth-service.yaml
│   ├── pacientes-service.yaml
│   └── ... (resto de servicios)
├── ingress/
│   └── psp-ingress.yaml
├── configmaps/
│   └── app-config.yaml
├── secrets/
│   └── db-secrets.yaml              (AWS Secrets Manager)
├── statefulsets/
│   ├── postgresql.yaml
│   └── redis.yaml
└── hpa/
    └── autoscaling.yaml
```

#### **Ingress Configuration**

```yaml
# psp-ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: psp-ingress
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
spec:
  tls:
    - hosts:
        - app.psp-valentech.com
        - api.psp-valentech.com
      secretName: psp-tls
  rules:
    - host: app.psp-valentech.com
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: frontend-service
                port:
                  number: 3000
    - host: api.psp-valentech.com
      http:
        paths:
          - path: /auth
            pathType: Prefix
            backend:
              service:
                name: auth-service
                port:
                  number: 8001
          - path: /api/v1/pacientes
            pathType: Prefix
            backend:
              service:
                name: pacientes-service
                port:
                  number: 8002
          # ... resto de microservicios
```

#### **CI/CD Pipelines**

**GitHub Actions**: `.github/workflows/deploy-production.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up JDK 17
        uses: actions/setup-java@v3
        with:
          java-version: '17'
      - name: Run Tests
        run: mvn clean test jacoco:report
      - name: Check Coverage
        run: |
          coverage=$(grep -Po '(?<=<counter type="LINE" missed="\d+" covered=")[^"]*' target/site/jacoco/jacoco.xml)
          if [ "$coverage" -lt "70" ]; then exit 1; fi

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Set up Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'
      - name: Run Tests
        run: npm run test:coverage

  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Trivy
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'fs'
          severity: 'CRITICAL,HIGH'

  build-and-deploy:
    needs: [backend-tests, frontend-tests, security-scan]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Login to ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build, tag, and push images
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          # Build all microservices
          docker build -t $ECR_REGISTRY/psp-auth:$IMAGE_TAG services/auth
          docker build -t $ECR_REGISTRY/psp-pacientes:$IMAGE_TAG services/pacientes
          # ... resto de servicios
          
          # Push to ECR
          docker push $ECR_REGISTRY/psp-auth:$IMAGE_TAG
          docker push $ECR_REGISTRY/psp-pacientes:$IMAGE_TAG

      - name: Update kubeconfig
        run: aws eks update-kubeconfig --name psp-cluster --region us-east-1

      - name: Deploy to Kubernetes
        run: |
          kubectl apply -f k8s/namespaces/
          kubectl apply -f k8s/configmaps/
          kubectl apply -f k8s/secrets/
          kubectl apply -f k8s/statefulsets/
          kubectl apply -f k8s/deployments/
          kubectl apply -f k8s/services/
          kubectl apply -f k8s/ingress/
          
          # Wait for rollout
          kubectl rollout status deployment/pacientes-deployment -n psp-production

      - name: Health Checks
        run: |
          sleep 60
          curl -f https://api.psp-valentech.com/actuator/health || exit 1
```

---

### **FASE 2: Monitoring & Observability (1 semana)**

#### **Prometheus + Grafana**

**Dashboards**:

1. **Dashboard: Microservicios**
   - Requests/sec por servicio
   - Error rate
   - Latencia p50, p95, p99
   - JVM memory usage
   - Database connections pool

2. **Dashboard: Negocio**
   - Pacientes registrados (últimas 24h)
   - Entregas completadas vs programadas
   - Aplicaciones completadas vs programadas
   - Seguimientos realizados por educadora
   - Barreras identificadas hoy

3. **Dashboard: Infraestructura**
   - CPU usage por pod
   - Memory usage por pod
   - Network I/O
   - Disk usage
   - Pod restarts

**Alertas**:

```yaml
# monitoring/prometheus/alerts/critical.yml
groups:
  - name: critical
    interval: 30s
    rules:
      - alert: HighErrorRate
        expr: rate(http_requests_total{status=~"5.."}[5m]) > 0.05
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Error rate >5% en {{ $labels.service }}"

      - alert: DatabaseDown
        expr: up{job="postgresql"} == 0
        for: 1m
        labels:
          severity: critical
        annotations:
          summary: "PostgreSQL está caído"

      - alert: HighMemoryUsage
        expr: (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes) < 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Memoria disponible <10%"
```

---

### **FASE 3: Seguridad (1 semana)**

#### **AWS Secrets Manager**

```bash
# Crear secrets
aws secretsmanager create-secret \
  --name psp/production/db-credentials \
  --secret-string '{
    "username": "psp_admin",
    "password": "GENERATED_PASSWORD",
    "host": "psp-db.cluster-xxx.us-east-1.rds.amazonaws.com",
    "port": 5432,
    "database": "psp_production"
  }'

aws secretsmanager create-secret \
  --name psp/production/jwt-secret \
  --secret-string '{
    "secret": "GENERATED_256_BIT_SECRET"
  }'
```

#### **Network Policies**

```yaml
# k8s/network-policies/pacientes-policy.yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: pacientes-policy
  namespace: psp-production
spec:
  podSelector:
    matchLabels:
      app: pacientes-service
  ingress:
    - from:
        - podSelector:
            matchLabels:
              app: frontend
        - podSelector:
            matchLabels:
              app: auth-service
      ports:
        - protocol: TCP
          port: 8002
```

---

### **PHASE 4: Backup & Disaster Recovery (1 semana)**

#### **Automated Backups**

```bash
# Backup script: scripts/backup-db.sh
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="psp_backup_$DATE.sql"

# Backup PostgreSQL
pg_dump -h $DB_HOST -U $DB_USER -d psp_production > /backups/$BACKUP_FILE

# Encrypt backup
gpg --encrypt --recipient admin@psp.com /backups/$BACKUP_FILE

# Upload to S3
aws s3 cp /backups/$BACKUP_FILE.gpg s3://psp-backups/production/

# Cleanup old backups (keep 30 days)
find /backups -name "*.sql.gpg" -mtime +30 -delete

# Verify backup
aws s3 ls s3://psp-backups/production/$BACKUP_FILE.gpg || exit 1
```

**Cron Job**:
```yaml
# k8s/cronjobs/backup-db.yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: db-backup
  namespace: psp-production
spec:
  schedule: "0 2 * * *"  # 2 AM diario
  jobTemplate:
    spec:
      template:
        spec:
          containers:
            - name: backup
              image: postgres:15
              command: ["/scripts/backup-db.sh"]
              volumeMounts:
                - name: backup-script
                  mountPath: /scripts
          restartPolicy: OnFailure
```

#### **Disaster Recovery Plan**

**RTO (Recovery Time Objective)**: 30 minutos  
**RPO (Recovery Point Objective)**: 24 horas

**Procedimiento**:
1. Detectar falla (alertas automáticas)
2. Validar última copia de seguridad
3. Aprovisionar nueva instancia RDS (Multi-AZ standby)
4. Restaurar backup más reciente
5. Aplicar logs de transacciones (Point-in-Time Recovery)
6. Actualizar DNS/Ingress
7. Validar health checks
8. Notificar a usuarios

---

## 📅 PLAN DE ACTIVIDADES CONSTANTES

### **Daily (Diario)**

#### **Stand-up Meeting** (15 min - 9:00 AM)
- ¿Qué hice ayer?
- ¿Qué haré hoy?
- ¿Bloqueadores?

#### **Code Reviews**
- Max 2 horas para revisar PRs
- Criterios:
  - ✅ Tests pasando (>70% coverage)
  - ✅ SonarQube quality gate PASS
  - ✅ No secrets hardcodeados
  - ✅ Documentación actualizada

#### **Monitoring Check**
- Revisar dashboards Grafana
- Verificar alertas pendientes
- Validar health checks de servicios

---

### **Weekly (Semanal)**

#### **Sprint Planning** (Lunes - 2 horas)
- Revisar backlog
- Estimar tickets (Fibonacci)
- Asignar tareas a agentes especializados
- Definir Definition of Done

#### **Sprint Review** (Viernes - 1 hora)
- Demo de features completadas
- Feedback de stakeholders
- Actualizar documentación

#### **Retrospectiva** (Viernes - 45 min)
- ¿Qué funcionó bien?
- ¿Qué mejorar?
- Action items para próxima semana

#### **Dependency Updates**
- Actualizar npm packages (frontend)
- Actualizar Maven dependencies (backend)
- Escanear vulnerabilidades con `npm audit` y `mvn dependency-check`

---

### **Bi-Weekly (Quincenal)**

#### **Performance Review**
- Analizar métricas de Lighthouse
- Analizar tiempos de respuesta API (percentiles p95, p99)
- Identificar cuellos de botella
- Crear tickets de optimización

#### **Security Audit**
- Revisar logs de acceso
- Validar configuraciones de firewall
- Actualizar secrets rotados
- Scan de vulnerabilidades con Trivy

---

### **Monthly (Mensual)**

#### **Architecture Review**
- Revisar decisiones técnicas tomadas
- Evaluar escalabilidad
- Identificar deuda técnica
- Planear refactorings

#### **Disaster Recovery Drill**
- Simular caída de base de datos
- Ejecutar procedimiento de recuperación
- Medir RTO/RPO reales
- Actualizar runbook

#### **Backup Verification**
- Restaurar backup en ambiente staging
- Validar integridad de datos
- Documentar issues encontrados

---

### **Quarterly (Trimestral)**

#### **Technology Radar**
- Evaluar nuevas tecnologías
- Actualizar stack tecnológico
- Planear migraciones si aplica

#### **Training & Certifications**
- Capacitación en nuevas herramientas
- Cursos de Kubernetes, AWS
- Certificaciones relevantes

---

## ✅ CRITERIOS DE ACEPTACIÓN

### **Backend**

- ✅ Todos los endpoints documentados en Swagger
- ✅ Cobertura de tests >70%
- ✅ Tiempos de respuesta <300ms (p95)
- ✅ Error rate <0.1%
- ✅ Validaciones completas en DTOs
- ✅ Manejo de errores consistente
- ✅ Logs estructurados en JSON
- ✅ Health checks funcionando

### **Frontend**

- ✅ Lighthouse Score >90
- ✅ Core Web Vitals:
  - LCP <2.5s
  - FID <100ms
  - CLS <0.1
- ✅ Sin errores de consola
- ✅ Responsive en mobile, tablet, desktop
- ✅ Dark mode funcional
- ✅ Accesibilidad WCAG 2.1 AA
- ✅ Loading states en todas las operaciones async
- ✅ Error boundaries implementadas

### **Infraestructura**

- ✅ Uptime >99.9%
- ✅ Backups diarios automatizados
- ✅ Alertas configuradas y funcionando
- ✅ SSL/TLS válido
- ✅ CI/CD pipeline sin fallas
- ✅ Secrets rotados mensualmente
- ✅ Logs centralizados (CloudWatch)
- ✅ Disaster recovery plan probado

---

## 🎯 MÉTRICAS DE ÉXITO DEL PROYECTO

### **Técnicas**

| Métrica | Target | Actual | Status |
|---------|--------|--------|--------|
| Test Coverage Backend | >70% | - | ⏳ |
| Test Coverage Frontend | >70% | - | ⏳ |
| Lighthouse Score | >90 | - | ⏳ |
| API Response Time (p95) | <300ms | - | ⏳ |
| Error Rate | <0.1% | - | ⏳ |
| Uptime | >99.9% | - | ⏳ |

### **Funcionales**

| Feature | Status |
|---------|--------|
| Vista 360° del Paciente | ⏳ Pendiente |
| Dashboard Educador | ⏳ Pendiente |
| Dashboard Coordinador | ✅ Completado |
| Sistema de Filtros Avanzados | ✅ Completado |
| Registro Rápido de Actividades | ⏳ Pendiente |
| Reportes con Gráficos | ⏳ Pendiente |
| Exportación Excel/PDF | ⏳ Pendiente |

### **Negocio**

- ✅ Educador ve TODO del paciente en una sola pantalla
- ✅ TODO lo que hace el educador queda registrado
- ✅ Coordinador puede supervisar a TODAS las educadoras
- ✅ Reportes de adherencia configurables
- ✅ Identificación temprana de barreras

---

## 📞 CONTACTOS Y RESPONSABLES

| Rol | Nombre | Responsabilidad |
|-----|--------|-----------------|
| Tech Lead | PSP Tech Lead | Coordinación general, orquestación de agentes |
| Backend Lead | Senior Backend Developer | APIs REST, microservicios, base de datos |
| Frontend Lead | Senior Frontend Developer | React UI, UX, componentes |
| DevOps Lead | Senior Software Architect | Kubernetes, CI/CD, monitoring |

---

## 📚 DOCUMENTACIÓN RELACIONADA

- [PRODUCCION_ARQUITECTURA.md](../PRODUCCION_ARQUITECTURA.md) - Arquitectura completa del sistema
- [DEPLOYMENT_INDEX.md](./DEPLOYMENT_INDEX.md) - Índice de despliegues
- [GO_LIVE_CHECKLIST.md](./GO_LIVE_CHECKLIST.md) - Checklist de go-live
- [RUNBOOK.md](./RUNBOOK.md) - Procedimientos operacionales
- [RESUMEN_ENTREGABLES.md](../RESUMEN_ENTREGABLES.md) - Estado de entregables

---

**Última actualización**: Marzo 12, 2026  
**Próxima revisión**: Marzo 19, 2026
