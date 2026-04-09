-- =============================================
-- PSP - Programa de Seguimiento a Pacientes
-- Schema Unificado para Supabase
-- Consolidado de 5 bases de datos en 1
-- =============================================

-- =============================================
-- 1. EXTENSIONES
-- =============================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- 2. TABLAS CATÁLOGO (sin FK externas)
-- =============================================

-- Tenants (multi-tenant)
CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(200) NOT NULL,
  tipo VARCHAR(50) DEFAULT 'ENTERPRISE',
  activo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Países
CREATE TABLE IF NOT EXISTS countries (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL
);

-- Departamentos
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  country_id INTEGER REFERENCES countries(id)
);

-- Ciudades
CREATE TABLE IF NOT EXISTS cities (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10),
  name VARCHAR(100) NOT NULL,
  department_id INTEGER NOT NULL REFERENCES departments(id)
);

-- Tipos de documento
CREATE TABLE IF NOT EXISTS document_types (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL
);

-- Géneros
CREATE TABLE IF NOT EXISTS genres (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) NOT NULL UNIQUE,
  name VARCHAR(50) NOT NULL
);

-- Estados civiles
CREATE TABLE IF NOT EXISTS estados_civiles (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(50) NOT NULL
);

-- Niveles educativos
CREATE TABLE IF NOT EXISTS niveles_educativos (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL
);

-- Tipos de población
CREATE TABLE IF NOT EXISTS tipos_poblacion (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(100) NOT NULL
);

-- EPS
CREATE TABLE IF NOT EXISTS eps (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(200) NOT NULL,
  regime VARCHAR(50),
  active BOOLEAN NOT NULL DEFAULT true,
  nit VARCHAR(20),
  tenant_id UUID REFERENCES tenants(id)
);

-- IPS
CREATE TABLE IF NOT EXISTS ips (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  type VARCHAR(50),
  address VARCHAR(300),
  phone VARCHAR(20),
  city_id INTEGER REFERENCES cities(id),
  active BOOLEAN NOT NULL DEFAULT true,
  tenant_id UUID REFERENCES tenants(id)
);

-- Operadores logísticos
CREATE TABLE IF NOT EXISTS logistics_operators (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  nit VARCHAR(20),
  contact_name VARCHAR(100),
  contact_phone VARCHAR(20),
  contact_email VARCHAR(100),
  active BOOLEAN NOT NULL DEFAULT true,
  tenant_id UUID REFERENCES tenants(id)
);

-- Programas PSP
CREATE TABLE IF NOT EXISTS programas_psp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre VARCHAR(200) NOT NULL,
  descripcion TEXT,
  laboratorio VARCHAR(200),
  medicamento_principal VARCHAR(200),
  activo BOOLEAN NOT NULL DEFAULT true,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Diagnósticos CIE-10
CREATE TABLE IF NOT EXISTS diagnosticos_cie10 (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(10) NOT NULL UNIQUE,
  nombre VARCHAR(300) NOT NULL,
  capitulo VARCHAR(10),
  grupo VARCHAR(100)
);

-- Médicos/Doctores (tabla unificada — reemplaza doctors + medicos + medicos_prescriptores)
CREATE TABLE IF NOT EXISTS doctors (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100),
  registro_medico VARCHAR(50) UNIQUE,
  especialidad VARCHAR(100),
  telefono VARCHAR(20),
  email VARCHAR(100),
  institution VARCHAR(200),
  active BOOLEAN NOT NULL DEFAULT true,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Laboratorios (tabla unificada — reemplaza laboratories + laboratorios)
CREATE TABLE IF NOT EXISTS laboratories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  address VARCHAR(300),
  phone VARCHAR(20),
  city_id INTEGER REFERENCES cities(id),
  active BOOLEAN NOT NULL DEFAULT true,
  tenant_id UUID REFERENCES tenants(id)
);

-- Medicamentos (consolidado de psp_pacientes.medications + psp_prescripciones.medicamentos)
CREATE TABLE IF NOT EXISTS medications (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  nombre_comercial VARCHAR(200),
  concentracion VARCHAR(100),
  unidad VARCHAR(50),
  laboratorio VARCHAR(150),
  codigo_atc VARCHAR(20),
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT true,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tipos de paraclínico
CREATE TABLE IF NOT EXISTS tipos_paraclinicos (
  id SERIAL PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  nombre VARCHAR(200) NOT NULL,
  categoria VARCHAR(100),
  unidad_medida VARCHAR(50),
  valor_referencia_min DECIMAL(10,2),
  valor_referencia_max DECIMAL(10,2),
  descripcion TEXT,
  activo BOOLEAN NOT NULL DEFAULT true
);

-- =============================================
-- 3. PERFILES DE USUARIO (extiende auth.users de Supabase)
-- =============================================

CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email VARCHAR(100) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  apellido VARCHAR(100),
  role VARCHAR(30) NOT NULL CHECK (role IN ('SUPER_ADMIN','ADMIN_INSTITUCION','MEDICO','ENFERMERIA','COORDINADOR','PACIENTE','CUIDADOR')),
  institucion_id VARCHAR(100),
  institucion_nombre VARCHAR(200),
  telefono VARCHAR(20),
  activo BOOLEAN NOT NULL DEFAULT true,
  tenant_id UUID REFERENCES tenants(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 4. TABLA PRINCIPAL: PACIENTES
-- =============================================

CREATE TABLE IF NOT EXISTS patients (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  -- Documento
  document_type_id INTEGER REFERENCES document_types(id),
  document_number VARCHAR(20),
  -- Nombre
  first_name VARCHAR(100) NOT NULL,
  second_name VARCHAR(100),
  last_name VARCHAR(100) NOT NULL,
  second_last_name VARCHAR(100),
  -- Datos personales
  birth_date DATE,
  genre_id INTEGER REFERENCES genres(id),
  email VARCHAR(150),
  phone VARCHAR(20),
  phone2 VARCHAR(20),
  -- Ubicación
  country_id INTEGER REFERENCES countries(id),
  department_id INTEGER REFERENCES departments(id),
  city_id INTEGER REFERENCES cities(id),
  address TEXT,
  neighborhood VARCHAR(200),
  stratum INTEGER,
  -- Seguridad social
  eps_id INTEGER REFERENCES eps(id),
  ips_id INTEGER REFERENCES ips(id),
  regime VARCHAR(50),
  -- Estado civil, educación, población
  estado_civil_id INTEGER REFERENCES estados_civiles(id),
  nivel_educativo_id INTEGER REFERENCES niveles_educativos(id),
  tipo_poblacion_id INTEGER REFERENCES tipos_poblacion(id),
  -- Programa
  programa_psp_id UUID REFERENCES programas_psp(id),
  diagnostico_id INTEGER REFERENCES diagnosticos_cie10(id),
  -- Estado del paciente
  status VARCHAR(20) NOT NULL DEFAULT 'EN_PROCESO' CHECK (status IN ('EN_PROCESO','ACTIVO','SUSPENDIDO','DROP_OUT','INACTIVO','FALLECIDO','RETIRADO')),
  -- Contacto emergencia
  emergency_contact_name VARCHAR(200),
  emergency_contact_phone VARCHAR(20),
  emergency_contact_relationship VARCHAR(100),
  -- Consentimiento
  consentimiento_firmado BOOLEAN DEFAULT false,
  -- Auditoría
  anonymized BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  -- Soft delete
  deleted BOOLEAN DEFAULT false,
  deleted_at TIMESTAMPTZ
);

CREATE INDEX idx_patients_tenant ON patients(tenant_id);
CREATE INDEX idx_patients_status ON patients(status);
CREATE INDEX idx_patients_eps ON patients(eps_id);
CREATE INDEX idx_patients_document ON patients(document_number);
CREATE INDEX idx_patients_name ON patients(first_name, last_name);

-- Historial de estados de paciente
CREATE TABLE IF NOT EXISTS patient_status_history (
  id BIGSERIAL PRIMARY KEY,
  patient_id BIGINT NOT NULL REFERENCES patients(id),
  previous_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  reason TEXT,
  changed_by VARCHAR(100),
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 5. BARRERAS
-- =============================================

CREATE TABLE IF NOT EXISTS barriers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  patient_id BIGINT NOT NULL REFERENCES patients(id),
  category VARCHAR(50) NOT NULL,
  subcategory VARCHAR(100),
  description TEXT NOT NULL,
  detailed_notes TEXT,
  responsible_area VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'ABIERTA' CHECK (status IN ('ABIERTA','EN_PROCESO','CERRADA')),
  prioridad VARCHAR(10) DEFAULT 'MEDIA' CHECK (prioridad IN ('ALTA','MEDIA','BAJA')),
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  expected_resolution_date DATE,
  closed_at TIMESTAMPTZ,
  resolved_by VARCHAR(100),
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100)
);

CREATE INDEX idx_barriers_patient ON barriers(patient_id);
CREATE INDEX idx_barriers_status ON barriers(status);
CREATE INDEX idx_barriers_tenant ON barriers(tenant_id);

-- =============================================
-- 6. SEGUIMIENTOS
-- =============================================

CREATE TABLE IF NOT EXISTS seguimientos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  patient_id BIGINT NOT NULL REFERENCES patients(id),
  responsable_id UUID,
  motivo_seguimiento TEXT NOT NULL,
  tipo_contacto VARCHAR(20) NOT NULL CHECK (tipo_contacto IN ('VIRTUAL','PRESENCIAL','TELEFONICO')),
  prioridad VARCHAR(10) NOT NULL DEFAULT 'MEDIA' CHECK (prioridad IN ('ALTA','MEDIA','BAJA')),
  fecha_programada TIMESTAMPTZ NOT NULL,
  fecha_realizada TIMESTAMPTZ,
  estado_tarea VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado_tarea IN ('PENDIENTE','EFECTIVA','CANCELADA')),
  resultado TEXT,
  observaciones TEXT,
  motivo_cancelacion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100)
);

CREATE INDEX idx_seguimientos_patient ON seguimientos(patient_id);
CREATE INDEX idx_seguimientos_estado ON seguimientos(estado_tarea);
CREATE INDEX idx_seguimientos_tenant ON seguimientos(tenant_id);

-- =============================================
-- 7. TAREAS (para educadoras)
-- =============================================

CREATE TABLE IF NOT EXISTS tareas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  patient_id BIGINT NOT NULL REFERENCES patients(id),
  educadora_id UUID,
  barrera_id UUID REFERENCES barriers(id),
  seguimiento_id UUID REFERENCES seguimientos(id),
  prescripcion_id BIGINT,
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT,
  tipo_tarea VARCHAR(30) DEFAULT 'SEGUIMIENTO' CHECK (tipo_tarea IN ('SEGUIMIENTO','EDUCACION','ADHERENCIA','FARMACIA','CITA_MEDICA','TOMA_MUESTRA','LLAMADA','VISITA_DOMICILIARIA','OTRO')),
  canal VARCHAR(20) DEFAULT 'TELEFONO' CHECK (canal IN ('TELEFONO','WHATSAPP','EMAIL','PRESENCIAL','VIDEOLLAMADA','SMS')),
  prioridad VARCHAR(10) NOT NULL DEFAULT 'MEDIA' CHECK (prioridad IN ('ALTA','MEDIA','BAJA')),
  estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','EN_PROGRESO','COMPLETADA','CANCELADA','REPROGRAMADA')),
  fecha_programada TIMESTAMPTZ,
  fecha_limite TIMESTAMPTZ,
  fecha_completada TIMESTAMPTZ,
  resultado TEXT,
  notas TEXT,
  motivo_cancelacion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100)
);

CREATE INDEX idx_tareas_patient ON tareas(patient_id);
CREATE INDEX idx_tareas_estado ON tareas(estado);
CREATE INDEX idx_tareas_tenant ON tareas(tenant_id);

-- =============================================
-- 8. PRESCRIPCIONES
-- =============================================

CREATE TABLE IF NOT EXISTS prescripciones (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  paciente_id BIGINT NOT NULL REFERENCES patients(id),
  medicamento_id INTEGER REFERENCES medications(id),
  medico_id INTEGER REFERENCES doctors(id),
  dosis VARCHAR(100) NOT NULL,
  frecuencia VARCHAR(200) NOT NULL,
  via_administracion VARCHAR(100),
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE,
  duracion_dias INTEGER,
  dias_tratamiento INTEGER,
  unidad_dosis VARCHAR(50),
  indicaciones TEXT,
  observaciones TEXT,
  especialidad_medica VARCHAR(100),
  estado VARCHAR(20) NOT NULL DEFAULT 'VIGENTE' CHECK (estado IN ('VIGENTE','SUSPENDIDA','VENCIDA','CANCELADA')),
  programa_psp_id UUID REFERENCES programas_psp(id),
  fecha_vencimiento_prescripcion DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100),
  updated_by VARCHAR(100)
);

CREATE INDEX idx_prescripciones_paciente ON prescripciones(paciente_id);
CREATE INDEX idx_prescripciones_estado ON prescripciones(estado);
CREATE INDEX idx_prescripciones_tenant ON prescripciones(tenant_id);

-- =============================================
-- 9. APLICACIONES (administración de medicamentos)
-- =============================================

CREATE TABLE IF NOT EXISTS aplicaciones (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  paciente_id BIGINT NOT NULL REFERENCES patients(id),
  prescripcion_id BIGINT REFERENCES prescripciones(id),
  educadora_id BIGINT,
  medicamento_id INTEGER REFERENCES medications(id),
  tipo VARCHAR(50) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'PROGRAMADA' CHECK (estado IN ('PROGRAMADA','APLICADA','NO_APLICADA','CANCELADA')),
  fecha_programada DATE NOT NULL,
  hora_programada TIME,
  fecha_aplicacion TIMESTAMPTZ,
  dosis_aplicada VARCHAR(100),
  cantidad_aplicada DOUBLE PRECISION,
  lugar_aplicacion VARCHAR(200),
  observaciones TEXT,
  motivo_no_aplicacion TEXT,
  no_aplicado BOOLEAN DEFAULT false,
  profesional_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100),
  updated_by VARCHAR(100)
);

CREATE INDEX idx_aplicaciones_paciente ON aplicaciones(paciente_id);
CREATE INDEX idx_aplicaciones_estado ON aplicaciones(estado);
CREATE INDEX idx_aplicaciones_fecha ON aplicaciones(fecha_programada);
CREATE INDEX idx_aplicaciones_tenant ON aplicaciones(tenant_id);

-- =============================================
-- 10. ENTREGAS (logística de medicamentos)
-- =============================================

CREATE TABLE IF NOT EXISTS entregas (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  paciente_id BIGINT NOT NULL REFERENCES patients(id),
  prescripcion_id BIGINT REFERENCES prescripciones(id),
  operador_logistico_id INTEGER REFERENCES logistics_operators(id),
  medicamento_id INTEGER REFERENCES medications(id),
  tipo VARCHAR(20) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'PROGRAMADA' CHECK (estado IN ('PROGRAMADA','EN_TRANSITO','ENTREGADA','DEVUELTA','CANCELADA')),
  fecha_programada DATE NOT NULL,
  fecha_despacho TIMESTAMPTZ,
  fecha_entrega TIMESTAMPTZ,
  fecha_proxima_entrega DATE,
  lote VARCHAR(100),
  fecha_vencimiento DATE,
  cantidad_entregada INTEGER,
  numero_guia VARCHAR(100),
  guia_tracking VARCHAR(100),
  direccion_entrega TEXT,
  nombre_receptor VARCHAR(200),
  cedula_receptor VARCHAR(20),
  observaciones TEXT,
  motivo_devolucion TEXT,
  no_entregado BOOLEAN DEFAULT false,
  motivo_no_entrega TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100),
  updated_by VARCHAR(100)
);

CREATE INDEX idx_entregas_paciente ON entregas(paciente_id);
CREATE INDEX idx_entregas_estado ON entregas(estado);
CREATE INDEX idx_entregas_tenant ON entregas(tenant_id);

-- =============================================
-- 11. INVENTARIO POR PACIENTE
-- =============================================

CREATE TABLE IF NOT EXISTS inventario_paciente (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  paciente_id BIGINT NOT NULL REFERENCES patients(id),
  medicamento_id INTEGER NOT NULL REFERENCES medications(id),
  entrega_id BIGINT REFERENCES entregas(id),
  lote VARCHAR(100),
  cantidad_entregada INTEGER NOT NULL DEFAULT 0,
  cantidad_disponible INTEGER NOT NULL DEFAULT 0 CHECK (cantidad_disponible >= 0),
  cantidad_aplicada INTEGER NOT NULL DEFAULT 0,
  unidad_medida VARCHAR(50),
  fecha_entrega DATE,
  fecha_vencimiento DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_inventario_paciente ON inventario_paciente(paciente_id);
CREATE INDEX idx_inventario_medicamento ON inventario_paciente(medicamento_id);
CREATE INDEX idx_inventario_tenant ON inventario_paciente(tenant_id);

-- Movimientos de inventario
CREATE TABLE IF NOT EXISTS movimientos_inventario (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  inventario_id UUID REFERENCES inventario_paciente(id),
  paciente_id BIGINT NOT NULL REFERENCES patients(id),
  medicamento_id INTEGER NOT NULL REFERENCES medications(id),
  tipo_movimiento VARCHAR(20) NOT NULL,
  cantidad INTEGER NOT NULL,
  referencia_id VARCHAR(100),
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by VARCHAR(100)
);

-- =============================================
-- 12. PARACLÍNICOS
-- =============================================

CREATE TABLE IF NOT EXISTS paraclinicos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  patient_id BIGINT NOT NULL REFERENCES patients(id),
  tipo_paraclinico_id INTEGER REFERENCES tipos_paraclinicos(id),
  fecha_solicitud DATE NOT NULL,
  fecha_realizacion DATE,
  fecha_resultado DATE,
  valor_resultado DECIMAL(10,2),
  valor_texto TEXT,
  estado_resultado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado_resultado IN ('PENDIENTE','EN_PROCESO','REALIZADO','CANCELADO')),
  es_normal BOOLEAN,
  interpretacion VARCHAR(20) CHECK (interpretacion IN ('NORMAL','ANORMAL','CRITICO','BORDERLINE')),
  observaciones TEXT,
  medico_solicita_id INTEGER REFERENCES doctors(id),
  laboratorio_externo VARCHAR(200),
  profesional_responsable VARCHAR(200),
  motivo_cancelacion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_paraclinicos_patient ON paraclinicos(patient_id);
CREATE INDEX idx_paraclinicos_tenant ON paraclinicos(tenant_id);

-- =============================================
-- 13. TRANSPORTES
-- =============================================

CREATE TABLE IF NOT EXISTS transportes (
  id BIGSERIAL PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  paciente_id BIGINT NOT NULL REFERENCES patients(id),
  tipo_servicio VARCHAR(20) NOT NULL DEFAULT 'SENCILLO' CHECK (tipo_servicio IN ('SENCILLO','DOBLE')),
  estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','EFECTIVO','CANCELADO')),
  fecha_servicio DATE NOT NULL,
  hora_recogida TIME,
  hora_cita TIME,
  origen TEXT,
  destino TEXT,
  institucion VARCHAR(200),
  motivo TEXT,
  acompanante VARCHAR(200),
  observaciones TEXT,
  motivo_cancelacion TEXT,
  fecha_efectivo TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100),
  updated_by VARCHAR(100)
);

CREATE INDEX idx_transportes_paciente ON transportes(paciente_id);
CREATE INDEX idx_transportes_estado ON transportes(estado);
CREATE INDEX idx_transportes_tenant ON transportes(tenant_id);

-- =============================================
-- 14. CONSENTIMIENTOS
-- =============================================

CREATE TABLE IF NOT EXISTS consentimientos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  patient_id BIGINT NOT NULL REFERENCES patients(id),
  consentimiento_psp BOOLEAN NOT NULL DEFAULT false,
  consentimiento_tratamiento BOOLEAN NOT NULL DEFAULT false,
  archivo_documento TEXT,
  fecha_carga TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================
-- 15. FACTURACIÓN
-- =============================================

CREATE TABLE IF NOT EXISTS facturacion (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  patient_id BIGINT NOT NULL REFERENCES patients(id),
  servicio_id UUID,
  tipo_concepto VARCHAR(100) NOT NULL,
  fecha_servicio DATE NOT NULL,
  valor DECIMAL(12,2) NOT NULL,
  estado_factura VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado_factura IN ('PENDIENTE','FACTURADA','PAGADA','ANULADA')),
  numero_factura VARCHAR(50),
  fecha_facturacion DATE,
  fecha_pago DATE,
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_facturacion_patient ON facturacion(patient_id);
CREATE INDEX idx_facturacion_estado ON facturacion(estado_factura);
CREATE INDEX idx_facturacion_tenant ON facturacion(tenant_id);

-- =============================================
-- 16. SERVICIOS COMPLEMENTARIOS
-- =============================================

CREATE TABLE IF NOT EXISTS servicios_complementarios (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  patient_id BIGINT NOT NULL REFERENCES patients(id),
  tipo_servicio VARCHAR(50) NOT NULL CHECK (tipo_servicio IN ('NUTRICION','PSICOLOGIA','TRABAJO_SOCIAL','FISIOTERAPIA','ENFERMERIA_DOMICILIARIA','EDUCACION_PACIENTE','OTRO')),
  estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE' CHECK (estado IN ('PENDIENTE','PROGRAMADO','EN_CURSO','COMPLETADO','CANCELADO')),
  descripcion TEXT,
  profesional_asignado VARCHAR(200),
  fecha_solicitud DATE,
  fecha_programada TIMESTAMPTZ,
  fecha_realizacion TIMESTAMPTZ,
  resultado TEXT,
  observaciones TEXT,
  motivo_cancelacion TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by VARCHAR(100)
);

CREATE INDEX idx_servicios_comp_patient ON servicios_complementarios(patient_id);
CREATE INDEX idx_servicios_comp_estado ON servicios_complementarios(estado);
CREATE INDEX idx_servicios_comp_tenant ON servicios_complementarios(tenant_id);

-- =============================================
-- 17. AUDITORÍA
-- =============================================

CREATE TABLE IF NOT EXISTS auditoria_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID REFERENCES tenants(id),
  tabla VARCHAR(100) NOT NULL,
  operacion VARCHAR(10) NOT NULL CHECK (operacion IN ('INSERT','UPDATE','DELETE')),
  registro_id VARCHAR(100),
  usuario_id UUID,
  datos_anteriores JSONB,
  datos_nuevos JSONB,
  ip_address VARCHAR(50),
  user_agent TEXT,
  fecha_operacion TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_auditoria_tabla ON auditoria_logs(tabla);
CREATE INDEX idx_auditoria_fecha ON auditoria_logs(fecha_operacion);
CREATE INDEX idx_auditoria_tenant ON auditoria_logs(tenant_id);

-- =============================================
-- 18. ADHERENCIA (proyecciones y registros)
-- =============================================

CREATE TABLE IF NOT EXISTS adherencia_proyecciones (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  patient_id BIGINT NOT NULL REFERENCES patients(id),
  prescripcion_id BIGINT REFERENCES prescripciones(id),
  periodo VARCHAR(20),
  fecha_inicio DATE,
  fecha_fin DATE,
  dosis_esperadas INTEGER,
  dosis_reales INTEGER DEFAULT 0,
  porcentaje_adherencia DECIMAL(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS adherencia_registros (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  patient_id BIGINT NOT NULL REFERENCES patients(id),
  prescripcion_id BIGINT REFERENCES prescripciones(id),
  fecha_esperada TIMESTAMPTZ,
  fecha_real TIMESTAMPTZ,
  cumplida BOOLEAN DEFAULT false,
  observaciones TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- 19. FUNCIONES RPC PARA DASHBOARD
-- =============================================

-- Dashboard stats principal
CREATE OR REPLACE FUNCTION get_dashboard_stats(p_tenant_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'totalPacientes', (SELECT COUNT(*) FROM patients WHERE (p_tenant_id IS NULL OR tenant_id = p_tenant_id) AND deleted = false),
    'pacientesActivos', (SELECT COUNT(*) FROM patients WHERE status = 'ACTIVO' AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id) AND deleted = false),
    'pacientesEnProceso', (SELECT COUNT(*) FROM patients WHERE status = 'EN_PROCESO' AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id) AND deleted = false),
    'pacientesSuspendidos', (SELECT COUNT(*) FROM patients WHERE status = 'SUSPENDIDO' AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id) AND deleted = false),
    'pacientesPorEstado', (
      SELECT COALESCE(json_agg(json_build_object('category', status, 'count', cnt)), '[]'::json)
      FROM (SELECT status, COUNT(*) as cnt FROM patients WHERE (p_tenant_id IS NULL OR tenant_id = p_tenant_id) AND deleted = false GROUP BY status) sub
    ),
    'totalSeguimientos', (SELECT COUNT(*) FROM seguimientos WHERE (p_tenant_id IS NULL OR tenant_id = p_tenant_id)),
    'totalTareas', (SELECT COUNT(*) FROM tareas WHERE (p_tenant_id IS NULL OR tenant_id = p_tenant_id)),
    'barrerasActivas', (SELECT COUNT(*) FROM barriers WHERE status != 'CERRADA' AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)),
    'totalBarreras', (SELECT COUNT(*) FROM barriers WHERE (p_tenant_id IS NULL OR tenant_id = p_tenant_id)),
    'barrerasPorCategoria', (
      SELECT COALESCE(json_agg(json_build_object('category', category, 'count', cnt)), '[]'::json)
      FROM (SELECT category, COUNT(*) as cnt FROM barriers WHERE (p_tenant_id IS NULL OR tenant_id = p_tenant_id) GROUP BY category) sub
    ),
    'totalTransportes', (SELECT COUNT(*) FROM transportes WHERE (p_tenant_id IS NULL OR tenant_id = p_tenant_id)),
    'transportesPendientes', (SELECT COUNT(*) FROM transportes WHERE estado = 'PENDIENTE' AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)),
    'transportesEfectivos', (SELECT COUNT(*) FROM transportes WHERE estado = 'EFECTIVO' AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)),
    'totalInventario', (SELECT COALESCE(SUM(cantidad_disponible), 0) FROM inventario_paciente WHERE (p_tenant_id IS NULL OR tenant_id = p_tenant_id)),
    'inventarioCritico', (SELECT COUNT(*) FROM inventario_paciente WHERE cantidad_disponible > 0 AND cantidad_disponible <= 5 AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)),
    'inventarioAgotado', (SELECT COUNT(*) FROM inventario_paciente WHERE cantidad_disponible = 0 AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)),
    'totalParaclinicos', (SELECT COUNT(*) FROM paraclinicos WHERE (p_tenant_id IS NULL OR tenant_id = p_tenant_id)),
    'paraclinicosNormales', (SELECT COUNT(*) FROM paraclinicos WHERE interpretacion = 'NORMAL' AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)),
    'paraclinicosAnormales', (SELECT COUNT(*) FROM paraclinicos WHERE interpretacion IN ('ANORMAL','CRITICO') AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)),
    'paraclinicosPendientes', (SELECT COUNT(*) FROM paraclinicos WHERE estado_resultado = 'PENDIENTE' AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)),
    'totalServiciosComplementarios', (SELECT COUNT(*) FROM servicios_complementarios WHERE (p_tenant_id IS NULL OR tenant_id = p_tenant_id)),
    'serviciosPendientes', (SELECT COUNT(*) FROM servicios_complementarios WHERE estado = 'PENDIENTE' AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)),
    'serviciosCompletados', (SELECT COUNT(*) FROM servicios_complementarios WHERE estado = 'COMPLETADO' AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id)),
    'adherenciaTratamiento', 85.5,
    'adherenciaEntrega', 90.0,
    'barrerasResueltas', (SELECT COUNT(*) FROM barriers WHERE status = 'CERRADA' AND (p_tenant_id IS NULL OR tenant_id = p_tenant_id))
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar barrera activa (regla de negocio: 1 activa por paciente)
CREATE OR REPLACE FUNCTION check_single_active_barrier()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status IN ('ABIERTA', 'EN_PROCESO') THEN
    IF EXISTS (
      SELECT 1 FROM barriers 
      WHERE patient_id = NEW.patient_id 
      AND id != NEW.id 
      AND status IN ('ABIERTA', 'EN_PROCESO')
    ) THEN
      RAISE EXCEPTION 'El paciente ya tiene una barrera activa. Solo se permite 1 barrera activa por paciente.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_check_single_active_barrier
  BEFORE INSERT OR UPDATE ON barriers
  FOR EACH ROW
  EXECUTE FUNCTION check_single_active_barrier();

-- =============================================
-- 20. ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS en tablas principales
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE barriers ENABLE ROW LEVEL SECURITY;
ALTER TABLE seguimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE tareas ENABLE ROW LEVEL SECURITY;
ALTER TABLE prescripciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE aplicaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE entregas ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventario_paciente ENABLE ROW LEVEL SECURITY;
ALTER TABLE paraclinicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE transportes ENABLE ROW LEVEL SECURITY;
ALTER TABLE consentimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE facturacion ENABLE ROW LEVEL SECURITY;
ALTER TABLE servicios_complementarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria_logs ENABLE ROW LEVEL SECURITY;

-- Políticas: usuarios autenticados pueden ver todo (en fase demo)
-- En producción, filtrar por tenant_id del user_profile
CREATE POLICY "Authenticated users can read all" ON patients
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert" ON patients
  FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update" ON patients
  FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can delete" ON patients
  FOR DELETE TO authenticated USING (true);

-- Aplicar misma política simple a todas las tablas operativas
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'barriers','seguimientos','tareas','prescripciones','aplicaciones',
    'entregas','inventario_paciente','paraclinicos','transportes',
    'consentimientos','facturacion','servicios_complementarios','auditoria_logs'
  ]) LOOP
    EXECUTE format('CREATE POLICY "auth_read_%s" ON %I FOR SELECT TO authenticated USING (true)', t, t);
    EXECUTE format('CREATE POLICY "auth_insert_%s" ON %I FOR INSERT TO authenticated WITH CHECK (true)', t, t);
    EXECUTE format('CREATE POLICY "auth_update_%s" ON %I FOR UPDATE TO authenticated USING (true)', t, t);
    EXECUTE format('CREATE POLICY "auth_delete_%s" ON %I FOR DELETE TO authenticated USING (true)', t, t);
  END LOOP;
END $$;

-- Catálogos: lectura pública (anon puede leer)
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'countries','departments','cities','document_types','genres',
    'estados_civiles','niveles_educativos','tipos_poblacion','eps','ips',
    'logistics_operators','programas_psp','diagnosticos_cie10','doctors',
    'laboratories','medications','tipos_paraclinicos','tenants'
  ]) LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY "public_read_%s" ON %I FOR SELECT USING (true)', t, t);
    EXECUTE format('CREATE POLICY "auth_write_%s" ON %I FOR ALL TO authenticated USING (true) WITH CHECK (true)', t, t);
  END LOOP;
END $$;

-- user_profiles: usuarios ven su propio perfil
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own profile" ON user_profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE TO authenticated USING (id = auth.uid());
-- Super admins pueden ver todos
CREATE POLICY "Admins can read all profiles" ON user_profiles
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'SUPER_ADMIN')
  );
CREATE POLICY "Service role full access" ON user_profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);
