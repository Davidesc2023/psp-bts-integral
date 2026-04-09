# PSP — Programa de Seguimiento a Pacientes
## Product Requirements Document (PRD)

**Versión:** 1.0  
**Fecha:** 2025  
**Estado:** Activo  

---

## 1. Visión General

El **PSP (Programa de Seguimiento a Pacientes)** es una plataforma multi-laboratorio y multi-programa para la gestión integral de pacientes en programas de soporte, seguimiento farmacoterapéutico y educación para la salud en Colombia.

El sistema debe ser **multi-tenant**, escalable, y permitir a cada laboratorio/programa gestionar su propia configuración dentro de una misma infraestructura. Los educadores solo ven los pacientes de su laboratorio/tratamiento asignado.

---

## 2. Alcance

- Gestión de pacientes y su ciclo de vida en el programa
- Registro de prescripciones médicas
- Seguimiento de consultas médicas
- Control de paraclínicos (laboratorios)
- Gestión de entregas de medicamentos
- Registro de aplicaciones de medicamentos
- Inventario por paciente
- Seguimientos y tareas a pacientes
- Consentimientos informados
- Vista 360° del paciente (para educadoras)
- Notificaciones y alertas
- Importación y exportación de datos en Excel
- Eliminación de módulo de facturación

---

## 3. Roles de Usuario

| Rol | Descripción | Acceso |
|-----|-------------|--------|
| Administrador | Acceso completo a todos los módulos, laboratorios y programas | Global |
| Coordinador | Gestión de pacientes de su(s) programa(s) asignado(s) | Por programa |
| Educador | Seguimiento y educación de pacientes de su laboratorio/tratamiento | Por laboratorio/tratamiento |
| MSL (Medical Science Liaison) | Visualización y análisis de datos médicos | Por laboratorio |
| Médico | Registro de prescripciones y consultas | Por IPS/programa |

---

## 4. Multi-Tenancy y Parametrización

- Cada **laboratorio** y **programa** es un tenant con su propia parametrización
- Los **estados del paciente** son configurables por laboratorio/programa
- Los **tratamientos** y **medicamentos** son parametrizables por laboratorio
- El **código de paciente** se genera automáticamente: `[iniciales_tratamiento][número_secuencial]`  
  *Ejemplo: para tratamiento "ADALIMUMAB" → AD001, AD002...*
- Las educadoras solo visualizan los pacientes de su laboratorio y tratamiento asignados
- La configuración de formularios, estados y workflows es gestionada por el administrador

---

## 5. Tablas del Sistema

### 5.1 Tabla: Pacientes

Campo principal de toda la plataforma.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| idpaciente | UUID/INT PK | Identificador único interno |
| codigo | VARCHAR | Código automático: iniciales_tratamiento + número (ej. AD001) |
| tipo_id | CATALOG | Tipo de documento (CC, TI, RC, CE, PAS, MS, NIT, etc.) |
| numero_id | VARCHAR | Número de identificación |
| nombres_apellidos | VARCHAR | Nombre completo del paciente |
| iniciales | VARCHAR(10) | Iniciales calculadas automáticamente |
| fecha_nacimiento | DATE | Fecha de nacimiento |
| genero | CATALOG | Género del paciente |
| pais | CATALOG | País de residencia |
| departamento | CATALOG | Departamento de residencia |
| municipio | CATALOG | Municipio de residencia |
| direccion | VARCHAR | Dirección de residencia |
| comunidad | VARCHAR | Comunidad o sector |
| barrio | VARCHAR | Barrio de residencia |
| acudiente | VARCHAR | Nombre del acudiente o responsable |
| tipo_id_acudiente | CATALOG | Tipo de documento del acudiente |
| numero_id_acudiente | VARCHAR | Número de documento del acudiente |
| telefono_1 | VARCHAR | Teléfono principal |
| telefono_2 | VARCHAR | Teléfono alternativo |
| telefono_3 | VARCHAR | Tercer teléfono de contacto |
| correo | VARCHAR | Correo electrónico |
| eps | CATALOG/FK | EPS del paciente |
| ips_tratante_principal | CATALOG/FK | IPS tratante principal |
| enfermedad | CATALOG/FK | Diagnóstico principal (CIE-10) |
| tratamiento | CATALOG/FK | Medicamento/tratamiento (parametrizable por laboratorio) |
| programa | FK | Programa PSP al que pertenece |
| laboratorio | FK | Laboratorio que gestiona el programa |
| medico | FK | Médico tratante principal |
| fecha_ingreso_psp | DATE | Fecha de ingreso al programa PSP |
| otros_diagnosticos | TEXT | Otros diagnósticos del paciente |
| otros_medicamentos | TEXT | Otros medicamentos que toma el paciente |
| fecha_inicio_tratamiento | DATE | Fecha de inicio del tratamiento actual |
| estado | CATALOG/FK | Estado actual del paciente (parametrizado por laboratorio) |
| subestado | CATALOG/FK | Subestado (parametrizado por laboratorio) |
| msl | FK | MSL asignado |
| ram | BOOLEAN/TEXT | Reporte de RAM (reacción adversa a medicamento) |
| educador | FK | Educador asignado |
| coordinador | FK | Coordinador asignado |
| fundacion | VARCHAR | Fundación vinculada (si aplica) |
| tutela_si_no | BOOLEAN | ¿El paciente tiene tutela? |
| fallo_tutela | TEXT | Descripción del fallo de tutela |
| observaciones | TEXT | Observaciones generales libres |
| doc_autorizacion_eps | BOOLEAN | Tiene autorización de EPS |
| doc_formula_medica | BOOLEAN | Tiene fórmula médica |
| doc_consentimiento_informado | BOOLEAN | Tiene consentimiento informado firmado |
| doc_historia_clinica | BOOLEAN | Tiene historia clínica adjunta |
| doc_examen_diagnostico | BOOLEAN | Tiene examen diagnóstico |
| doc_resultado_paraclínico | BOOLEAN | Tiene resultado de paraclínico |
| doc_fotografia_lesiones | BOOLEAN | Tiene fotografía de lesiones |
| doc_carnet_eps | BOOLEAN | Tiene carnet EPS |
| doc_documento_identidad | BOOLEAN | Tiene documento de identidad adjunto |
| doc_otro_soporte | BOOLEAN | Tiene otro soporte adicional |
| fecha_retiro | DATE | Fecha de retiro del programa (si aplica) |
| motivo_retiro | CATALOG | Motivo de retiro (parametrizable) |
| cambio_tratamiento_a | TEXT | Si el motivo de retiro es cambio de tratamiento, indicar a cuál |
| vacunas | TEXT/JSON | Registro de vacunas del paciente |
| anonimizado | BOOLEAN | Indica si el paciente fue anonimizado (Drop Out + ley colombiana) |
| fecha_anonimizacion | DATE | Fecha en que se anonimizaron los datos |
| created_at | TIMESTAMP | Fecha de creación del registro |
| updated_at | TIMESTAMP | Fecha de última actualización |

#### 5.1.1 Estados del Paciente

Los estados son parametrizados por **laboratorio/programa**. Estados base sugeridos:

| Estado | Descripción | Lógica |
|--------|-------------|--------|
| Prescrito sin Inicio | Tiene prescripción pero no ha comenzado tratamiento | Estado inicial |
| En Proceso | En proceso de admisión/documentación | Durante onboarding |
| Activo | Recibiendo tratamiento activamente | Estado operativo principal |
| Interrumpido Temporalmente | Pausa temporal en tratamiento | Requiere motivo y fecha estimada de reanudación |
| Drop Out | Abandono del programa | **Requiere: fecha retiro + motivo retiro + (si cambio de tratamiento: a cuál)** |

**Regla de negocio crítica – Drop Out y Ley Colombiana (Habeas Data):**
- Cuando un paciente pasa al estado **Drop Out**, el sistema debe mostrar un aviso previo explicando las implicaciones
- Se debe registrar: fecha_retiro, motivo_retiro, cambio_tratamiento_a (si aplica)
- Después de confirmado el Drop Out, el sistema **anonimiza automáticamente** los siguientes campos:
  - nombres_apellidos
  - numero_id
  - tipo_id
  - fecha_nacimiento
  - acudiente
  - numero_id_acudiente
  - tipo_id_acudiente
  - telefono_1, telefono_2, telefono_3
  - correo
  - direccion
- El campo `anonimizado = true` y `fecha_anonimizacion` quedan registrados
- El código de paciente y datos clínicos permanecen para trazabilidad estadística

---

### 5.2 Tabla: Prescripciones

| Campo | Tipo | Descripción |
|-------|------|-------------|
| prescripcion_id | UUID/INT PK | Identificador único |
| paciente_id | FK → Pacientes | Paciente al que pertenece |
| codigo_paciente | VARCHAR | Código del paciente (desnormalizado para trazabilidad) |
| consulta_medica_id | FK → Consultas | Consulta médica que generó la prescripción (opcional) |
| fecha_prescripcion | DATE | Fecha de la prescripción |
| numero_mipres | VARCHAR | Número MIPRES de la prescripción |
| ips_id | FK → IPS | IPS donde se realizó la prescripción |
| prescriptor_id | FK → Médicos | Médico prescriptor |
| medicamento_id | FK → Medicamentos | Medicamento prescrito |
| dosis_1 | DECIMAL | Dosis principal |
| unidad_dosis_1 | CATALOG | Unidad de la dosis principal (mg, ml, UI, etc.) |
| dosis_2 | DECIMAL | Segunda dosis (si aplica) |
| unidad_dosis_2 | CATALOG | Unidad de la segunda dosis |
| peso_kg | DECIMAL | Peso en kg al momento de la prescripción |
| talla_cm | DECIMAL | Talla en cm al momento de la prescripción |
| frecuencia_1 | VARCHAR | Frecuencia de administración 1 |
| frecuencia_2 | VARCHAR | Frecuencia de administración 2 (si aplica) |
| unidades_totales_1 | DECIMAL | Total unidades dosis 1 |
| unidades_totales_2 | DECIMAL | Total unidades dosis 2 |
| unidades_comerciales | DECIMAL | Total unidades comerciales |
| dias_tratamiento | INT | Número de días del tratamiento prescrito |
| unidades_primarias_1 | DECIMAL | Unidades primarias dosis 1 |
| unidades_primarias_2 | DECIMAL | Unidades primarias dosis 2 |
| estado | CATALOG | Estado de la prescripción (vigente, vencida, reemplazada) |
| created_at | TIMESTAMP | Fecha de creación |
| updated_at | TIMESTAMP | Fecha de actualización |

---

### 5.3 Tabla: Consultas Médicas

| Campo | Tipo | Descripción |
|-------|------|-------------|
| consulta_medica_id | UUID/INT PK | Identificador único |
| paciente_id | FK → Pacientes | Paciente |
| codigo_paciente | VARCHAR | Código del paciente |
| fecha_consulta | DATE | Fecha en que se realizó la consulta |
| medico_id | FK → Médicos | Médico que realizó la consulta |
| ips_id | FK → IPS | IPS donde se realizó |
| prescripcion_si_no | BOOLEAN | ¿La consulta generó prescripción? |
| prescripcion_id | FK → Prescripciones | Prescripción generada (relacionado si prescripcion_si_no = true) |
| fecha_estimada_proxima_consulta | DATE | Fecha estimada de la próxima consulta |
| fecha_confirmada_proxima_consulta | DATE | Fecha confirmada de la próxima consulta |
| tiene_historia_clinica | BOOLEAN | ¿Se adjuntó historia clínica? |
| observaciones | TEXT | Observaciones de la consulta |
| created_at | TIMESTAMP | Fecha de creación |
| updated_at | TIMESTAMP | Fecha de actualización |

---

### 5.4 Tabla: Seguimientos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| idseguimiento | UUID/INT PK | Identificador único |
| paciente_id | FK → Pacientes | Paciente |
| tipo_seguimiento | CATALOG | Tipo: educativo, adherencia, farmacovigilancia, administrativo, etc. |
| tipo_contacto | CATALOG | Medio: llamada, visita domiciliaria, WhatsApp, presencial, etc. |
| fecha_hora_programada | TIMESTAMP | Fecha y hora programada para el seguimiento |
| fecha_hora_realizado | TIMESTAMP | Fecha y hora en que se realizó (si se completó) |
| observacion | TEXT | Observaciones del seguimiento |
| resultado | CATALOG | Resultado: efectivo, no efectivo, no contactado, reagendado |
| prioridad | INT | **Calculada automáticamente** por días restantes (menor días = mayor prioridad) |
| estado | CATALOG | Estado: pendiente, completado, cancelado |
| created_at | TIMESTAMP | Fecha de creación |
| updated_at | TIMESTAMP | Fecha de actualización |

**Regla de negocio – Prioridad automática:**
- La prioridad se calcula con base en los días restantes hasta `fecha_hora_programada`
- A menor número de días restantes → mayor valor de prioridad (1 = urgente)
- Los seguimientos vencidos (fecha_hora_programada < hoy) tienen prioridad máxima (0 o negativo)
- Se recalcula automáticamente en cada carga de la vista

---

### 5.5 Tabla: Paraclínicos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| paraclinico_id | UUID/INT PK | Identificador único |
| paciente_id | FK → Pacientes | Paciente |
| codigo_paciente | VARCHAR | Código del paciente |
| tipo_paraclinico | CATALOG | Tipo de examen/paraclínico (hemograma, creatinina, etc.) |
| ciclo | VARCHAR/INT | Ciclo de tratamiento al que corresponde |
| fecha_paraclinico | DATE | Fecha en que se realizó el paraclínico |
| resultado_texto | TEXT | Resultado en texto libre |
| resultado_numerico | DECIMAL | Resultado numérico (si aplica) |
| unidad_resultado | VARCHAR | Unidad del resultado numérico |
| valor_referencia_min | DECIMAL | Valor mínimo de referencia |
| valor_referencia_max | DECIMAL | Valor máximo de referencia |
| fecha_estimada_proximo | DATE | Fecha estimada del próximo paraclínico |
| fecha_confirmada_proximo | DATE | Fecha confirmada del próximo paraclínico |
| ips_id | FK → IPS | IPS donde se realizó |
| tiene_archivo_resultado | BOOLEAN | ¿Tiene archivo de resultado adjunto? |
| archivo_url | VARCHAR | URL del archivo adjunto |
| created_at | TIMESTAMP | Fecha de creación |
| updated_at | TIMESTAMP | Fecha de actualización |

---

### 5.6 Tabla: Entregas

Registro de entregas de medicamentos al paciente.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| entrega_id | UUID/INT PK | Identificador único |
| paciente_id | FK → Pacientes | Paciente |
| codigo_paciente | VARCHAR | Código del paciente |
| factura_despacho | VARCHAR | Número de factura o despacho |
| fecha_entrega | DATE | Fecha en que se realizó la entrega |
| cantidad_entregada | DECIMAL | Cantidad de unidades entregadas |
| fecha_fin_medicamento | DATE | Fecha estimada de fin del medicamento entregado |
| numero_entrega | INT | Número secuencial de entrega del paciente |
| tipo_entrega | CATALOG | Tipo: IPS / Domicilio |
| quien_entrega | VARCHAR | Nombre de quien hace la entrega |
| comprobante_entrega | BOOLEAN | ¿Tiene comprobante de entrega? |
| archivo_comprobante_url | VARCHAR | URL del comprobante adjunto |
| observaciones | TEXT | Observaciones de la entrega |
| created_at | TIMESTAMP | Fecha de creación |
| updated_at | TIMESTAMP | Fecha de actualización |

---

### 5.7 Tabla: Aplicaciones

Registro de aplicaciones/infusiones de medicamentos.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| aplicacion_id | UUID/INT PK | Identificador único |
| paciente_id | FK → Pacientes | Paciente |
| codigo_paciente | VARCHAR | Código del paciente |
| prescripcion_id | FK → Prescripciones | Prescripción de referencia (puede ser null si se registra sin prescripción) |
| fecha_aplicacion | DATE | Fecha de la aplicación |
| cantidad_aplicada | DECIMAL | Cantidad administrada |
| fecha_proxima_aplicacion | DATE | Fecha programada siguiente aplicación |
| fase | VARCHAR | Fase del tratamiento (inducción, mantenimiento, etc.) |
| tipo_infusion | CATALOG | Tipo de infusión (IV, SC, IM, etc.) |
| dosis_real | DECIMAL | Dosis real administrada |
| ips_id | FK → IPS | IPS donde se realizó la aplicación |
| numero_aplicacion | INT | Número secuencial de aplicación del paciente |
| tiene_reporte_infusion | BOOLEAN | ¿Tiene reporte de infusión adjunto? |
| archivo_reporte_url | VARCHAR | URL del reporte adjunto |
| estado_aplicacion | CATALOG | Estado: efectiva / no efectiva |
| sin_prescripcion | BOOLEAN | ¿Se registró sin prescripción activa? |
| created_at | TIMESTAMP | Fecha de creación |
| updated_at | TIMESTAMP | Fecha de actualización |

**Regla de negocio:**
- Si `estado_aplicacion = 'no efectiva'` → el sistema debe redirigir al módulo de **Barreras** para registrar la barrera asociada
- Al registrar una aplicación, se debe descontar del **inventario** del paciente automáticamente

#### 5.7.1 Sub-registro: Crisis / Heridas

Aplica cuando el tipo de aplicación lo requiere (ej: medicamentos para heridas o crisis):

| Campo | Tipo | Descripción |
|-------|------|-------------|
| ubicacion_corporal | CATALOG | Selector amplio de ubicación corporal (cabeza, tronco anterior/posterior, extremidades, etc.) |
| medicamento_del_paciente | FK | Auto-cargado desde la parametrización del paciente |
| tiene_herida | BOOLEAN | ¿Hay herida asociada? |
| fotos_heridas | ARRAY | Múltiples archivos fotográficos de la herida |
| apósitos_si_no | BOOLEAN | ¿Se usaron apósitos? |
| cantidad_apósitos | INT | Cantidad de apósitos utilizados |
| fechas_seleccionadas | DATE[] | Selector de múltiples fechas para crisis episódicas |

---

### 5.8 Tabla: Inventario por Paciente

El inventario es por paciente, calculado automáticamente.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| inventario_id | UUID/INT PK | Identificador único |
| paciente_id | FK → Pacientes | Paciente |
| codigo_paciente | VARCHAR | Código del paciente |
| medicamento_id | FK | Medicamento (auto-cargado del tratamiento del paciente) |
| unidades_disponibles | DECIMAL | Unidades actualmente disponibles (calculado) |
| unidades_entregadas_total | DECIMAL | Total histórico de unidades entregadas |
| unidades_aplicadas_total | DECIMAL | Total histórico de unidades aplicadas |
| fecha_ultima_entrega | DATE | Fecha de la última entrega registrada |
| fecha_ultima_aplicacion | DATE | Fecha de la última aplicación registrada |
| dias_estimados_restantes | INT | Días estimados de medicamento restante |
| updated_at | TIMESTAMP | Fecha de última actualización |

**Regla de negocio:**
- El `unidades_disponibles` = `unidades_entregadas_total - unidades_aplicadas_total`
- Se actualiza automáticamente al registrar una entrega o una aplicación
- El `dias_estimados_restantes` se calcula con base en la dosis diaria de la última prescripción activa

---

## 6. Módulo de Consentimientos

- Todos los consentimientos informados del paciente se gestionan en su propio módulo
- Se pueden adjuntar documentos físicos escaneados
- Registro de: tipo de consentimiento, fecha de firma, versión del consentimiento, estado (firmado/pendiente/revocado)
- Trazabilidad completa de consentimientos por paciente y por programa

---

## 7. Vista 360° del Paciente (para Educadoras)

Panel consolidado que muestra para un paciente:

| Sección | Información |
|---------|-------------|
| Prescripción | Prescripción activa, fecha de vencimiento, días para vencer |
| Barreras | Barreras abiertas + días transcurridos desde apertura |
| Aplicaciones | Próxima aplicación pendiente, última aplicación realizada |
| Entregas | Última entrega, fecha de fin de medicamento, días restantes |
| Seguimientos | Tareas pendientes de alta prioridad |
| Estado general | Indicadores visuales de alerta/riesgo |

---

## 8. Notificaciones

- Las notificaciones deben ser **coherentes**: al hacer clic en una notificación, se navega directamente al paciente/módulo/acción correspondiente
- Las notificaciones incluyen:
  - Seguimientos próximos (próximas 24/48/72 horas)
  - Prescripciones por vencer
  - Paraclínicos por programar
  - Fechas de fin de medicamento
  - Barreras abiertas sin resolución
  - Aplicaciones no efectivas sin barrera registrada
  - Alertas de estado de paciente
- El sistema debe incluir un **tutorial de uso** de las notificaciones para nuevos usuarios

---

## 9. Import / Export Excel

Todas las tablas principales deben soportar:

| Funcionalidad | Descripción |
|---------------|-------------|
| Exportar a Excel | Descarga de todos los registros de la tabla con los filtros aplicados |
| Importar desde Excel | Carga masiva de datos desde plantilla Excel predefinida |
| Plantilla de importación | Descarga de plantilla vacía con las columnas requeridas |
| Validación de importación | Reporte de errores por fila al importar datos inválidos |

Tablas con funcionalidad de import/export:
- Pacientes
- Prescripciones
- Consultas Médicas
- Seguimientos
- Paraclínicos
- Entregas
- Aplicaciones

---

## 10. Módulos Eliminados

- ~~**Facturación**~~: Este módulo fue eliminado del alcance del sistema

---

## 11. Reglas de Negocio Transversales

### 11.1 Código de Paciente
- Generado automáticamente al crear el paciente
- Formato: `[iniciales_tratamiento][número_secuencial_3_dígitos]`
- Ejemplo: Tratamiento "ADALIMUMAB" → `AD001`, `AD002`, ...
- Una vez asignado, el código no cambia aunque cambie el tratamiento (trazabilidad)

### 11.2 Validación Tipo de Documento vs Edad
- **CC (Cédula de Ciudadanía)**: solo para mayores de 18 años
- **TI (Tarjeta de Identidad)**: para personas de 7 a 17 años
- **RC (Registro Civil)**: para menores de 7 años
- **MS (Menor sin identificación)**: para menores de 18 años
- La validación se realiza en tiempo real en el formulario de creación/edición del paciente
- Se muestra advertencia visual pero no bloquea el guardado (registro puede existir por excepciones legales)

### 11.3 Multi-Tenancy
- Cada laboratorio/programa tiene su propia parametrización independiente
- Los usuarios están asociados a uno o más laboratorios/programas
- Los educadores solo visualizan los pacientes del/los laboratorio(s) y tratamiento(s) que tienen asignados
- Los reportes y exportaciones están filtrados por el acceso del usuario

### 11.4 Anonimización (Ley de Habeas Data - Colombia)
- Al cambiar el estado de un paciente a **Drop Out**:
  1. El sistema muestra aviso explicativo de las consecuencias legales
  2. Se solicita confirmación explícita del usuario
  3. Se registran: fecha_retiro, motivo_retiro, cambio_tratamiento_a
  4. El sistema anonimiza automáticamente los campos de datos personales sensibles
  5. El registro queda marcado como `anonimizado = true`
  6. Los datos clínicos e identificadores de programa se mantienen para estadísticas

### 11.5 Prioridad de Seguimientos
- La prioridad se calcula automáticamente: `prioridad = días hasta fecha_programada`
- Seguimiento vencido (fecha pasada) → prioridad = 0 (máxima urgencia)
- Seguimiento próximo 0-3 días → prioridad alta
- Seguimiento 4-7 días → prioridad media
- Seguimiento 8+ días → prioridad normal
- La prioridad se recalcula en cada carga de vista, sin necesidad de trigger en BD

---

## 12. Requerimientos No Funcionales

| Requerimiento | Especificación |
|---------------|----------------|
| Seguridad | Row Level Security (RLS) por laboratorio/programa; datos en tránsito cifrados (TLS) |
| Autenticación | JWT con Supabase Auth; soporte multi-rol |
| Escalabilidad | Arquitectura multi-tenant por laboratorio/programa |
| Disponibilidad | 99.5% uptime en horario laboral |
| Rendimiento | Listados < 2s; formularios < 500ms |
| Exportación | Archivos Excel generados en < 10s para hasta 10.000 registros |
| Compatibilidad | Chrome 90+, Edge 90+, Firefox 90+ |
| Responsive | Tablet y desktop (mínimo 768px) |

---

## 13. Tecnología

- **Frontend**: React 18 + TypeScript + MUI v5
- **Backend/BaaS**: Supabase (PostgreSQL + Auth + Storage + RLS)
- **Despliegue**: Vercel (frontend) + Supabase Cloud (backend)
- **Color primario**: `#0e7490`

---

*Documento generado para el Programa de Seguimiento a Pacientes (PSP)*
