# PRD -- Plataforma PSP

**Versión:** 0.3\
**Tipo:** Plataforma SaaS para gestión de Programas de Soporte al
Paciente (PSP)

------------------------------------------------------------------------

# 1. Roles del sistema

Solo existen **3 roles principales**.

## Administrador

Responsable de: - Parametrización del sistema - Gestión de catálogos -
Gestión de usuarios - Auditoría

## Coordinador

Responsable de: - Supervisión del programa PSP - Control de adherencia -
Gestión de barreras - Gestión de servicios

## Educador / Enfermería

Responsable de: - Registro de pacientes - Seguimiento - Aplicaciones -
Entregas - Registro de barreras

------------------------------------------------------------------------

# 2. Catálogos (Parametrización)

Todos los siguientes deben ser **parametrizables**.

## Ubicación

-   País
-   Departamento
-   Ciudad

Relación jerárquica:

Pais → Departamento → Ciudad

## Entidades del sistema

-   EPS
-   IPS
-   Operador logístico
-   Laboratorio

## Demografía

-   Tipo documento
-   Género
-   Estado civil
-   Nivel educativo
-   Estrato socioeconómico
-   Tipo población
-   Zona residencia

## Medicamentos

Campos:

-   id
-   nombre_comercial
-   nombre_generico
-   laboratorio_id
-   presentacion
-   concentracion
-   via_administracion
-   unidad_medida
-   fecha_creacion
-   fecha_actualizacion

------------------------------------------------------------------------

# 3. Programas PSP

Campos:

-   id
-   nombre_programa
-   laboratorio_id
-   medicamento_id
-   patologia
-   descripcion
-   estado
-   fecha_creacion
-   fecha_actualizacion

------------------------------------------------------------------------

# 4. Pacientes

Campos:

-   id
-   tipo_documento
-   numero_documento
-   nombres
-   apellidos
-   fecha_nacimiento
-   genero
-   telefono
-   correo
-   direccion
-   pais_id
-   departamento_id
-   ciudad_id
-   eps_id
-   ips_id
-   nivel_educativo_id
-   estrato
-   estado_civil_id
-   ocupacion
-   tipo_poblacion_id
-   zona_residencia
-   fecha_creacion
-   fecha_actualizacion

------------------------------------------------------------------------

# 5. Consentimientos informados

Campos:

-   id
-   paciente_id
-   consentimiento_psp
-   consentimiento_tratamiento
-   archivo_documento
-   fecha_carga
-   fecha_creacion

En la tabla pacientes debe mostrarse:

**Consentimiento cargado: Sí / No**

------------------------------------------------------------------------

# 6. Código de tipificación del paciente

Formato automático:

Iniciales del tratamiento + "-" + consecutivo

Ejemplo:

AD-0001\
HE-0002

------------------------------------------------------------------------

# 7. Estados del paciente

Parametrizables:

-   Prescrito sin inicio
-   En proceso
-   Activo
-   Suspendido
-   Drop out
-   Retirado

------------------------------------------------------------------------

# 8. Anonimización de pacientes

Cuando el estado sea:

-   Drop out
-   Retirado

El sistema debe anonimizar:

-   Nombre
-   Documento
-   Teléfono
-   Correo
-   Dirección

Se conservan:

-   Edad
-   Ciudad
-   Datos clínicos
-   Datos demográficos

------------------------------------------------------------------------

# 9. Prescripciones

Campos:

-   id
-   paciente_id
-   medicamento_id
-   medico_id
-   especialidad_medica
-   centro_atencion_id
-   fecha_prescripcion
-   fecha_inicio_tratamiento
-   dias_tratamiento
-   dosis
-   frecuencia
-   via_administracion
-   estado_prescripcion
-   fecha_creacion
-   fecha_actualizacion

Estados de prescripción:

-   Vigente
-   Vencida

------------------------------------------------------------------------

# 10. Médicos prescriptores

Campos:

-   id
-   nombre
-   especialidad
-   centro_atencion_id
-   telefono
-   correo
-   fecha_creacion

------------------------------------------------------------------------

# 11. Aplicaciones

Tipos de tratamiento soportados:

-   Inyección
-   Infusión
-   Crema
-   Curación
-   Medicamento oral
-   Crisis

Campos:

-   id
-   paciente_id
-   prescripcion_id
-   tipo_aplicacion
-   fecha_programada
-   fecha_aplicada
-   estado_aplicacion
-   observaciones
-   fecha_creacion
-   fecha_actualizacion

Estados:

-   Programada
-   Aplicada
-   No aplicada

Aplicaciones por rango de fechas:

El sistema debe permitir seleccionar:

-   fecha_inicio
-   fecha_fin

y generar automáticamente las aplicaciones diarias.

------------------------------------------------------------------------

# 12. Entregas de medicamentos

Campos:

-   id
-   paciente_id
-   medicamento_id
-   operador_logistico_id
-   tipo_entrega
-   fecha_entrega
-   cantidad
-   lote
-   fecha_vencimiento
-   responsable
-   observaciones
-   fecha_creacion

Tipos de entrega:

-   Punto
-   Domicilio
-   IPS
-   Farmacia

------------------------------------------------------------------------

# 13. Inventario del paciente

Campos:

-   id
-   paciente_id
-   medicamento_id
-   lote
-   cantidad_entregada
-   cantidad_disponible
-   fecha_entrega
-   fecha_vencimiento
-   fecha_creacion
-   fecha_actualizacion

Regla:

Cada aplicación realizada debe descontar automáticamente:

-   medicamento
-   jeringas
-   apósitos
-   insumos

------------------------------------------------------------------------

# 14. Relación ENTREGA -- APLICACIÓN

Si ocurre:

-   No entrega
-   No aplicación

El sistema debe mostrar botón:

**Crear barrera**

Flujo:

1.  Registrar evento
2.  Sugerir crear barrera
3.  Abrir formulario
4.  Mostrar previsualización

------------------------------------------------------------------------

# 15. Barreras

## Barreras principales

-   Paciente
-   Administrativa
-   Logística
-   Clínica

## Subbarreras

Ejemplo:

Paciente → Enfermedad\
Paciente → Viaje\
Administrativa → Autorización

Campos:

-   id
-   paciente_id
-   aplicacion_id
-   barrera_principal
-   subbarrera
-   estado_barrera
-   fecha_apertura
-   fecha_cierre
-   observaciones
-   fecha_creacion

Estados:

-   Abierta
-   Cerrada

------------------------------------------------------------------------

# 16. Seguimientos / tareas

Campos:

-   id
-   paciente_id
-   responsable_id
-   motivo_seguimiento
-   tipo_contacto
-   fecha_programada
-   fecha_realizada
-   estado_tarea
-   observaciones
-   fecha_creacion

Tipos de contacto:

-   Virtual
-   Presencial
-   Telefónico

Estados:

-   Pendiente
-   Cancelada
-   Efectiva

Regla:

Todos los pacientes deben tener tareas activas excepto:

-   Retirado
-   Drop out

------------------------------------------------------------------------

# 17. Servicios complementarios

Tipos:

-   Transporte
-   Nutrición
-   Psicología
-   Trabajo social

Campos:

-   id
-   paciente_id
-   servicio
-   profesional_solicita
-   fecha_solicitud
-   estado
-   observaciones
-   fecha_creacion

------------------------------------------------------------------------

# 18. Transporte

Tipos de trayecto:

-   Sencillo
-   Múltiple
-   Circular

Campos:

-   id
-   solicitud_servicio_id
-   orden
-   origen
-   destino
-   costo
-   fecha_creacion

------------------------------------------------------------------------

# 19. Registro del servicio

Campos:

-   id
-   paciente_id
-   servicio
-   profesional
-   fecha_servicio
-   observaciones
-   fecha_creacion

------------------------------------------------------------------------

# 20. Facturación

Campos:

-   id
-   paciente_id
-   servicio
-   fecha_servicio
-   valor
-   estado_factura
-   fecha_facturacion
-   fecha_creacion

------------------------------------------------------------------------

# 21. Indicadores del sistema

-   Adherencia tratamiento
-   Adherencia entrega
-   Barreras abiertas
-   Barreras resueltas
-   Costo transporte
-   Servicios realizados

------------------------------------------------------------------------

# 22. Dashboards

-   Panel laboratorio
-   Panel PSP
-   Panel adherencia
-   Panel logística
-   Panel servicios complementarios

------------------------------------------------------------------------

# 23. Reglas de negocio críticas

1.  No puede existir aplicación sin prescripción.
2.  No puede existir aplicación sin medicamento disponible en
    inventario.
3.  Toda barrera debe tener fecha de apertura.
4.  Todo paciente debe tener tareas activas excepto retirados y drop
    out.
5.  Aplicaciones pueden generarse por rango de fechas.
6.  Entregas pueden cubrir varios meses.
7.  Inventario se descuenta automáticamente con cada aplicación.

------------------------------------------------------------------------

# 24. Seguridad y auditoría

-   Control por roles
-   Auditoría de cambios
-   Registro de actividad

------------------------------------------------------------------------

# 25. Escalabilidad

El sistema debe soportar:

-   Múltiples laboratorios
-   Múltiples programas PSP
-   Múltiples patologías
-   Múltiples medicamentos

------------------------------------------------------------------------

# Estado del documento

PRD v0.3 listo para revisión técnica por equipo de desarrollo, analítica
y arquitectura.
