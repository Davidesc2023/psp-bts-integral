# PSP — Programa de Seguimiento a Pacientes
## Minimum Viable Product (MVP)

**Versión:** 1.0  
**Fecha:** 2025  
**Basado en:** psp-prd.md v1.0  

---

## 1. Objetivo del MVP

Entregar la versión mínima funcional del PSP que permita a programas de soporte iniciar la operación controlada con un grupo piloto de pacientes, validar flujos principales y generar valor inmediato, antes de desarrollar funcionalidades avanzadas.

---

## 2. Criterios de Inclusión en el MVP

Un requisito entra al MVP si cumple **al menos uno** de los siguientes criterios:

- Bloquea el registro o seguimiento básico de pacientes
- Es requerido por normativa colombiana (Ley Habeas Data)
- Tiene alto impacto operativo diario para educadoras y coordinadores
- No puede ser suplido manualmente sin alto riesgo de error

---

## 3. Fases del MVP

### Fase 1 — Core (MVP Estricto)

**Funcionalidades que deben estar operativas para lanzar el piloto:**

#### 3.1.1 Gestión de Pacientes
- [x] Creación de paciente con todos los campos del PRD (tabla Pacientes completa)
- [x] Validación en tiempo real: tipo de documento vs fecha de nacimiento (misma pantalla)
- [x] Código de paciente automático: iniciales_tratamiento + número secuencial
- [x] Cambio de estado del paciente (parametrizado por laboratorio)
- [x] Flujo de Drop Out con:
  - Aviso previo obligatorio
  - Registro de fecha retiro + motivo + cambio de tratamiento
  - Anonimización automática de datos sensibles (cumplimiento Ley Habeas Data Colombia)
- [x] Edición de paciente
- [x] Listado con filtros por estado, laboratorio, educador

#### 3.1.2 Prescripciones
- [x] Registro de prescripción vinculada a paciente
- [x] Campos mínimos: fecha, médico, medicamento, dosis, días de tratamiento, MIPRES
- [x] Listado de prescripciones por paciente

#### 3.1.3 Seguimientos (Tareas)
- [x] Registro de seguimientos con tipo, contacto, fecha programada, observación
- [x] Cálculo automático de prioridad por días restantes
- [x] Listado de seguimientos pendientes ordenado por prioridad
- [x] Marcado de seguimiento como completado / no efectivo

#### 3.1.4 Autenticación y Roles
- [x] Login con email/contraseña
- [x] Roles: Administrador, Coordinador, Educador
- [x] Educadores ven solo sus pacientes asignados (por laboratorio/tratamiento)
- [x] RLS activo en base de datos

#### 3.1.5 Consentimientos
- [x] Registro de consentimientos por paciente
- [x] Estado: firmado / pendiente / revocado
- [x] Check de lista de documentos en ficha del paciente

---

### Fase 2 — Operación Completa

**Funcionalidades necesarias para la operación completa de un programa posicionado:**

#### 3.2.1 Entregas
- [ ] Registro de entregas de medicamentos por paciente
- [ ] Tipo de entrega: IPS / domicilio
- [ ] Fecha de fin de medicamento
- [ ] Número secuencial de entrega
- [ ] Comprobante de entrega

#### 3.2.2 Aplicaciones
- [ ] Registro de aplicaciones/infusiones por paciente
- [ ] Estado: efectiva / no efectiva → redirección a Barreras
- [ ] Registro sin prescripción activa (flag)
- [ ] Sub-módulo de crisis/heridas (ubicación corporal, fotos, apósitos)
- [ ] Fechas múltiples para aplicaciones episódicas

#### 3.2.3 Inventario
- [ ] Inventario automático por paciente
- [ ] Cálculo: unidades_entregadas - unidades_aplicadas
- [ ] Días estimados de medicamento restante
- [ ] Actualización automática al registrar entrega o aplicación

#### 3.2.4 Paraclínicos
- [ ] Registro de paraclínicos por ciclo
- [ ] Resultado texto y numérico con referencia
- [ ] Fecha estimada y confirmada del próximo
- [ ] Adjunto del resultado

#### 3.2.5 Consultas Médicas
- [ ] Registro de consulta vinculada a paciente y médico
- [ ] Vinculación con prescripción generada
- [ ] Fechas de próxima consulta (estimada y confirmada)

#### 3.2.6 Vista 360° del Paciente
- [ ] Panel consolidado para educadoras con: prescripción activa/por vencer, barreras abiertas, aplicaciones pendientes, entregas, días de medicamento, seguimientos urgentes

#### 3.2.7 Notificaciones
- [ ] Alertas en tiempo real: seguimientos próximos, prescripciones por vencer, paraclínicos, barreras abiertas
- [ ] Navegación directa desde notificación al paciente/módulo/acción
- [ ] Tutorial de uso de notificaciones para nuevos usuarios

---

### Fase 3 — Escala y Avanzado

**Funcionalidades para múltiples programas y análisis avanzado:**

#### 3.3.1 Import / Export Excel
- [ ] Exportación a Excel de todas las tablas del sistema
- [ ] Importación masiva desde plantilla Excel con validación de errores por fila
- [ ] Plantilla de importación descargable

#### 3.3.2 Multi-Tenancy Avanzada
- [ ] Gestión de laboratorios, programas y parametrización desde UI de Administrador
- [ ] Parametrización de estados y subestados por laboratorio
- [ ] Parametrización de tipos de seguimiento, tipos de paraclínicos, etc.
- [ ] Asignación de usuarios a múltiples laboratorios/programas

#### 3.3.3 Reportes
- [ ] Reportes operativos: pacientes por estado, adherencia, cobertura
- [ ] Reportes de seguimientos por educador
- [ ] Reportes de entregas y aplicaciones
- [ ] Dashboard con KPIs del programa

#### 3.3.4 Roles Adicionales
- [ ] Rol MSL con acceso a datos médicos y estadísticos
- [ ] Rol Médico para registro de prescripciones y consultas
- [ ] Fundaciones vinculadas

---

## 4. Fuera del MVP (No contemplado)

Los siguientes elementos están **explícitamente fuera del alcance** del MVP y de todas las fases:

| Elemento | Motivo |
|----------|--------|
| Módulo de Facturación | Eliminado del alcance por decisión del negocio |
| Integración con sistemas de salud externos (MIPRES API, SISPRO) | Complejidad técnica, fase posterior |
| App móvil nativa | Fuera del alcance actual |
| IA / predicciones de adherencia | Funcionalidad futura |
| Firma electrónica de consentimientos | Requiere integración con proveedor externo |

---

## 5. Criterios de Éxito del MVP (Fase 1)

| Criterio | Métrica |
|----------|---------|
| Registro de pacientes | ≥ 20 pacientes registrados en piloto sin errores críticos |
| Adopción de educadoras | ≥ 80% de seguimientos registrados en el sistema vs papel |
| Rendimiento | Formularios guardan en < 2 segundos |
| Seguridad | 0 incidentes de acceso no autorizado entre educadoras de distintos laboratorios |
| Cumplimiento normativo | 100% de pacientes Drop Out correctamente anonimizados |

---

## 6. Definición de "Listo" por Fase

Una fase está lista cuando:
1. Todas las funcionalidades marcadas están implementadas y testeadas
2. Los criterios de éxito correspondientes se cumplen en entorno de staging
3. El equipo de educadoras/coordinadores valida con pruebas de usuario ≥ 2 sesiones
4. No hay bugs críticos abiertos (P0/P1)
5. La documentación del usuario (guía rápida) está disponible

---

*Documento generado para el Programa de Seguimiento a Pacientes (PSP)*
