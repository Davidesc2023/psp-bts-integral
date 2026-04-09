-- =============================================
-- PSP - Seed Data para Demo
-- Catálogos + 10 Pacientes + Datos operativos
-- =============================================

-- 1. TENANT
INSERT INTO tenants (id, nombre, tipo) VALUES 
  ('00000000-0000-0000-0000-000000000001', 'Valentech PSP', 'ENTERPRISE');

-- 2. PAÍS
INSERT INTO countries (id, code, name) VALUES (1, 'CO', 'Colombia');

-- 3. DEPARTAMENTOS
INSERT INTO departments (id, code, name, country_id) VALUES
  (1, '11', 'Bogotá D.C.', 1),
  (2, '05', 'Antioquia', 1),
  (3, '76', 'Valle del Cauca', 1),
  (4, '08', 'Atlántico', 1),
  (5, '68', 'Santander', 1),
  (6, '13', 'Bolívar', 1),
  (7, '66', 'Risaralda', 1),
  (8, '15', 'Boyacá', 1),
  (9, '25', 'Cundinamarca', 1),
  (10, '73', 'Tolima', 1);

-- 4. CIUDADES
INSERT INTO cities (id, code, name, department_id) VALUES
  (1, '11001', 'Bogotá', 1),
  (2, '05001', 'Medellín', 2),
  (3, '76001', 'Cali', 3),
  (4, '08001', 'Barranquilla', 4),
  (5, '68001', 'Bucaramanga', 5),
  (6, '13001', 'Cartagena', 6),
  (7, '66001', 'Pereira', 7),
  (8, '15001', 'Tunja', 8),
  (9, '25754', 'Soacha', 9),
  (10, '73001', 'Ibagué', 10);

-- 5. TIPOS DE DOCUMENTO
INSERT INTO document_types (id, code, name) VALUES
  (1, 'CC', 'Cédula de Ciudadanía'),
  (2, 'TI', 'Tarjeta de Identidad'),
  (3, 'CE', 'Cédula de Extranjería'),
  (4, 'PA', 'Pasaporte'),
  (5, 'RC', 'Registro Civil');

-- 6. GÉNEROS
INSERT INTO genres (id, code, name) VALUES
  (1, 'M', 'Masculino'),
  (2, 'F', 'Femenino'),
  (3, 'O', 'Otro');

-- 7. ESTADOS CIVILES
INSERT INTO estados_civiles (id, codigo, nombre) VALUES
  (1, 'SOLTERO', 'Soltero/a'),
  (2, 'CASADO', 'Casado/a'),
  (3, 'UNION_LIBRE', 'Unión Libre'),
  (4, 'DIVORCIADO', 'Divorciado/a'),
  (5, 'VIUDO', 'Viudo/a'),
  (6, 'SEPARADO', 'Separado/a');

-- 8. NIVELES EDUCATIVOS
INSERT INTO niveles_educativos (id, codigo, nombre) VALUES
  (1, 'NINGUNO', 'Ninguno'),
  (2, 'PRIMARIA', 'Primaria'),
  (3, 'SECUNDARIA', 'Secundaria'),
  (4, 'TECNICO', 'Técnico'),
  (5, 'TECNOLOGO', 'Tecnólogo'),
  (6, 'UNIVERSITARIO', 'Universitario'),
  (7, 'POSGRADO', 'Posgrado');

-- 9. TIPOS DE POBLACIÓN
INSERT INTO tipos_poblacion (id, codigo, nombre) VALUES
  (1, 'GENERAL', 'Población General'),
  (2, 'INDIGENA', 'Indígena'),
  (3, 'AFROCOLOMBIANO', 'Afrocolombiano'),
  (4, 'ROM', 'Rom/Gitano'),
  (5, 'VICTIMA', 'Víctima del Conflicto'),
  (6, 'DISCAPACIDAD', 'Persona con Discapacidad'),
  (7, 'ADULTO_MAYOR', 'Adulto Mayor');

-- 10. EPS
INSERT INTO eps (id, code, name, regime, active, tenant_id) VALUES
  (1, 'EPS001', 'Sura EPS', 'CONTRIBUTIVO', true, '00000000-0000-0000-0000-000000000001'),
  (2, 'EPS002', 'Nueva EPS', 'CONTRIBUTIVO', true, '00000000-0000-0000-0000-000000000001'),
  (3, 'EPS003', 'Compensar', 'CONTRIBUTIVO', true, '00000000-0000-0000-0000-000000000001'),
  (4, 'EPS004', 'Colsanitas', 'CONTRIBUTIVO', true, '00000000-0000-0000-0000-000000000001'),
  (5, 'EPS005', 'Sanitas', 'CONTRIBUTIVO', true, '00000000-0000-0000-0000-000000000001'),
  (6, 'EPS006', 'Coomeva', 'CONTRIBUTIVO', true, '00000000-0000-0000-0000-000000000001'),
  (7, 'EPS007', 'Coosalud', 'SUBSIDIADO', true, '00000000-0000-0000-0000-000000000001'),
  (8, 'EPS008', 'Salud Total', 'CONTRIBUTIVO', true, '00000000-0000-0000-0000-000000000001');

-- 11. IPS
INSERT INTO ips (id, name, type, city_id, active, tenant_id) VALUES
  (1, 'Clínica del Norte', 'PRIVADA', 1, true, '00000000-0000-0000-0000-000000000001'),
  (2, 'Hospital San Vicente', 'PUBLICA', 2, true, '00000000-0000-0000-0000-000000000001'),
  (3, 'Clínica Versalles', 'PRIVADA', 3, true, '00000000-0000-0000-0000-000000000001'),
  (4, 'Fundación Cardiovascular', 'PRIVADA', 5, true, '00000000-0000-0000-0000-000000000001'),
  (5, 'Hospital Naval', 'PUBLICA', 6, true, '00000000-0000-0000-0000-000000000001');

-- 12. OPERADORES LOGÍSTICOS
INSERT INTO logistics_operators (id, name, nit, contact_name, active, tenant_id) VALUES
  (1, 'Medicamentos Express', '900123456', 'Juan Logística', true, '00000000-0000-0000-0000-000000000001'),
  (2, 'PharmaEnvíos', '900234567', 'María Despacho', true, '00000000-0000-0000-0000-000000000001'),
  (3, 'LogiSalud Colombia', '900345678', 'Pedro Envío', true, '00000000-0000-0000-0000-000000000001');

-- 13. PROGRAMAS PSP
INSERT INTO programas_psp (id, nombre, descripcion, laboratorio, medicamento_principal, tenant_id) VALUES
  ('a0000000-0000-0000-0000-000000000001', 'Programa Oncológico', 'Seguimiento a pacientes oncológicos', 'Roche', 'Rituximab', '00000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000002', 'Programa Reumatológico', 'Seguimiento artritis reumatoide', 'Pfizer', 'Tofacitinib', '00000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000003', 'Programa Dermatológico', 'Psoriasis y dermatitis', 'AbbVie', 'Adalimumab', '00000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000004', 'Programa Neurológico', 'Esclerosis múltiple', 'Novartis', 'Fingolimod', '00000000-0000-0000-0000-000000000001'),
  ('a0000000-0000-0000-0000-000000000005', 'Programa VIH', 'Tratamiento antirretroviral', 'Gilead', 'Biktarvy', '00000000-0000-0000-0000-000000000001');

-- 14. DIAGNÓSTICOS CIE-10
INSERT INTO diagnosticos_cie10 (id, codigo, nombre, capitulo) VALUES
  (1, 'C50', 'Tumor maligno de mama', 'II'),
  (2, 'C34', 'Tumor maligno de bronquio y pulmón', 'II'),
  (3, 'M05', 'Artritis reumatoide seropositiva', 'XIII'),
  (4, 'L40', 'Psoriasis', 'XII'),
  (5, 'G35', 'Esclerosis múltiple', 'VI'),
  (6, 'B20', 'Enfermedad por VIH', 'I'),
  (7, 'E11', 'Diabetes mellitus tipo 2', 'IV'),
  (8, 'I10', 'Hipertensión esencial', 'IX'),
  (9, 'J45', 'Asma', 'X'),
  (10, 'N18', 'Enfermedad renal crónica', 'XIV');

-- 15. MÉDICOS
INSERT INTO doctors (id, nombre, apellido, registro_medico, especialidad, telefono, email, active, tenant_id) VALUES
  (1, 'Carlos', 'Pérez', 'RM-001', 'Oncología', '3001234567', 'dr.perez@hospital.com', true, '00000000-0000-0000-0000-000000000001'),
  (2, 'Ana María', 'Rodríguez', 'RM-002', 'Reumatología', '3002345678', 'dra.rodriguez@hospital.com', true, '00000000-0000-0000-0000-000000000001'),
  (3, 'Jorge', 'Martínez', 'RM-003', 'Dermatología', '3003456789', 'dr.martinez@hospital.com', true, '00000000-0000-0000-0000-000000000001'),
  (4, 'Patricia', 'Gómez', 'RM-004', 'Neurología', '3004567890', 'dra.gomez@hospital.com', true, '00000000-0000-0000-0000-000000000001'),
  (5, 'Ricardo', 'López', 'RM-005', 'Infectología', '3005678901', 'dr.lopez@hospital.com', true, '00000000-0000-0000-0000-000000000001');

-- 16. LABORATORIOS
INSERT INTO laboratories (id, name, phone, active, tenant_id) VALUES
  (1, 'Laboratorio Clínico Colsanitas', '6011234567', true, '00000000-0000-0000-0000-000000000001'),
  (2, 'LabQuímico S.A.S', '6012345678', true, '00000000-0000-0000-0000-000000000001'),
  (3, 'Dinámica IPS Lab', '6013456789', true, '00000000-0000-0000-0000-000000000001');

-- 17. MEDICAMENTOS
INSERT INTO medications (id, nombre, nombre_comercial, concentracion, unidad, laboratorio, activo, tenant_id) VALUES
  (1, 'Rituximab', 'MabThera', '500mg/50ml', 'mg', 'Roche', true, '00000000-0000-0000-0000-000000000001'),
  (2, 'Tofacitinib', 'Xeljanz', '5mg', 'mg', 'Pfizer', true, '00000000-0000-0000-0000-000000000001'),
  (3, 'Adalimumab', 'Humira', '40mg/0.8ml', 'mg', 'AbbVie', true, '00000000-0000-0000-0000-000000000001'),
  (4, 'Fingolimod', 'Gilenya', '0.5mg', 'mg', 'Novartis', true, '00000000-0000-0000-0000-000000000001'),
  (5, 'Bictegravir/Emtricitabina/TAF', 'Biktarvy', '50/200/25mg', 'mg', 'Gilead', true, '00000000-0000-0000-0000-000000000001'),
  (6, 'Metotrexato', 'Metotrexato', '2.5mg', 'mg', 'Genérico', true, '00000000-0000-0000-0000-000000000001'),
  (7, 'Pembrolizumab', 'Keytruda', '100mg/4ml', 'mg', 'MSD', true, '00000000-0000-0000-0000-000000000001'),
  (8, 'Secukinumab', 'Cosentyx', '150mg/ml', 'mg', 'Novartis', true, '00000000-0000-0000-0000-000000000001');

-- 18. TIPOS PARACLÍNICOS
INSERT INTO tipos_paraclinicos (id, codigo, nombre, categoria, unidad_medida, activo) VALUES
  (1, 'HEM', 'Hemograma completo', 'HEMATOLOGÍA', NULL, true),
  (2, 'GLU', 'Glucosa en ayunas', 'QUÍMICA', 'mg/dL', true),
  (3, 'CREA', 'Creatinina sérica', 'QUÍMICA', 'mg/dL', true),
  (4, 'TGO', 'Transaminasa GOT/AST', 'HEPATICO', 'U/L', true),
  (5, 'TGP', 'Transaminasa GPT/ALT', 'HEPATICO', 'U/L', true),
  (6, 'PCR', 'Proteína C Reactiva', 'INMUNOLOGÍA', 'mg/L', true),
  (7, 'VSG', 'Velocidad de Sedimentación', 'HEMATOLOGÍA', 'mm/h', true),
  (8, 'TSH', 'Hormona Estimulante Tiroides', 'ENDOCRINOLOGÍA', 'mUI/L', true),
  (9, 'HBA1C', 'Hemoglobina Glicosilada', 'QUÍMICA', '%', true),
  (10, 'CV', 'Carga Viral', 'VIROLOGÍA', 'copias/ml', true);

-- =============================================
-- DATOS DEMO: 10 PACIENTES
-- =============================================

INSERT INTO patients (id, tenant_id, document_type_id, document_number, first_name, second_name, last_name, second_last_name, birth_date, genre_id, email, phone, country_id, department_id, city_id, address, eps_id, ips_id, regime, programa_psp_id, diagnostico_id, status, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship) VALUES
  (1, '00000000-0000-0000-0000-000000000001', 1, '10485621', 'María', 'Elena', 'González', 'Ruiz', '1981-03-15', 2, 'maria.gonzalez@email.com', '3001234567', 1, 1, 1, 'Cra 15 # 80-45 Apt 301', 1, 1, 'CONTRIBUTIVO', 'a0000000-0000-0000-0000-000000000001', 1, 'ACTIVO', 'Pedro González', '3009876543', 'Esposo'),
  (2, '00000000-0000-0000-0000-000000000001', 1, '20394857', 'Carlos', 'Andrés', 'Martínez', 'López', '1964-07-22', 1, 'carlos.martinez@email.com', '3012345678', 1, 2, 2, 'Cl 50 # 30-20', 2, 2, 'CONTRIBUTIVO', 'a0000000-0000-0000-0000-000000000001', 2, 'ACTIVO', 'Lucía Martínez', '3018765432', 'Hija'),
  (3, '00000000-0000-0000-0000-000000000001', 1, '30584726', 'Ana', NULL, 'Rodríguez', 'Mora', '1988-11-03', 2, 'ana.rodriguez@email.com', '3023456789', 1, 3, 3, 'Av 6N # 15-30', 3, 3, 'CONTRIBUTIVO', 'a0000000-0000-0000-0000-000000000002', 3, 'EN_PROCESO', 'Luis Rodríguez', '3027654321', 'Hermano'),
  (4, '00000000-0000-0000-0000-000000000001', 1, '40683915', 'Luis', 'Fernando', 'Pérez', 'Castro', '1971-01-28', 1, 'luis.perez@email.com', '3034567890', 1, 4, 4, 'Cra 54 # 72-80', 4, 1, 'CONTRIBUTIVO', 'a0000000-0000-0000-0000-000000000003', 4, 'SUSPENDIDO', 'Carmen Pérez', '3036543210', 'Esposa'),
  (5, '00000000-0000-0000-0000-000000000001', 1, '50782043', 'Patricia', NULL, 'López', 'Díaz', '1977-05-10', 2, 'patricia.lopez@email.com', '3045678901', 1, 5, 5, 'Cl 36 # 25-15', 5, 4, 'CONTRIBUTIVO', 'a0000000-0000-0000-0000-000000000004', 5, 'ACTIVO', 'Jorge López', '3045432109', 'Esposo'),
  (6, '00000000-0000-0000-0000-000000000001', 1, '60491328', 'Jorge', 'Eduardo', 'Ramírez', 'Torres', '1955-09-14', 1, 'jorge.ramirez@email.com', '3056789012', 1, 1, 1, 'Cl 100 # 15-60 Apt 502', 1, 1, 'CONTRIBUTIVO', 'a0000000-0000-0000-0000-000000000001', 1, 'ACTIVO', 'Sandra Ramírez', '3054321098', 'Hija'),
  (7, '00000000-0000-0000-0000-000000000001', 1, '70395164', 'Sandra', 'Milena', 'Torres', 'Vargas', '1993-04-20', 2, 'sandra.torres@email.com', '3067890123', 1, 7, 7, 'Cra 8 # 20-30', 6, 3, 'CONTRIBUTIVO', 'a0000000-0000-0000-0000-000000000005', 6, 'EN_PROCESO', 'Miguel Torres', '3063210987', 'Padre'),
  (8, '00000000-0000-0000-0000-000000000001', 1, '80264937', 'Eduardo', NULL, 'Vargas', 'Mendoza', '1968-12-05', 1, 'eduardo.vargas@email.com', '3078901234', 1, 6, 6, 'Av Pedro de Heredia # 30-50', 7, 5, 'SUBSIDIADO', 'a0000000-0000-0000-0000-000000000002', 3, 'DROP_OUT', 'Rosa Vargas', '3072109876', 'Esposa'),
  (9, '00000000-0000-0000-0000-000000000001', 1, '90173826', 'Claudia', 'Patricia', 'Hernández', 'Ríos', '1985-08-18', 2, 'claudia.hernandez@email.com', '3089012345', 1, 9, 9, 'Cra 7 # 10-25', 8, 1, 'CONTRIBUTIVO', 'a0000000-0000-0000-0000-000000000003', 4, 'ACTIVO', 'Andrés Hernández', '3081098765', 'Esposo'),
  (10, '00000000-0000-0000-0000-000000000001', 1, '11284735', 'Roberto', NULL, 'Díaz', 'Salazar', '1959-02-25', 1, 'roberto.diaz@email.com', '3090123456', 1, 10, 10, 'Cl 42 # 5-80', 2, 2, 'CONTRIBUTIVO', 'a0000000-0000-0000-0000-000000000005', 6, 'ACTIVO', 'Elena Díaz', '3090987654', 'Esposa');

-- Reset sequence
SELECT setval('patients_id_seq', 10);

-- =============================================
-- BARRERAS (5 barreras — 1 activa por paciente)
-- =============================================

INSERT INTO barriers (tenant_id, patient_id, category, subcategory, description, status, prioridad, opened_at, created_by) VALUES
  ('00000000-0000-0000-0000-000000000001', 1, 'AUTORIZACION', 'PROCESO_AUTORIZACION_PENDIENTE', 'Pendiente autorización de EPS para ciclo 4 de quimioterapia', 'ABIERTA', 'ALTA', NOW() - INTERVAL '3 days', 'admin@psp.com'),
  ('00000000-0000-0000-0000-000000000001', 2, 'DESPACHO', 'PROBLEMA_DESPACHO', 'Medicamento agotado en bodega del operador logístico', 'EN_PROCESO', 'ALTA', NOW() - INTERVAL '5 days', 'admin@psp.com'),
  ('00000000-0000-0000-0000-000000000001', 3, 'FORMULACION', 'FORMULA_MEDICA_INCOMPLETA', 'Fórmula médica sin diagnóstico CIE-10', 'ABIERTA', 'MEDIA', NOW() - INTERVAL '1 day', 'enfermera@psp.com'),
  ('00000000-0000-0000-0000-000000000001', 5, 'RESPONSABILIDAD_PACIENTE', 'ADHERENCIA_PACIENTE', 'Paciente no asiste a citas de seguimiento programadas', 'EN_PROCESO', 'MEDIA', NOW() - INTERVAL '7 days', 'enfermera@psp.com'),
  ('00000000-0000-0000-0000-000000000001', 9, 'AUTORIZACION', 'NEGACION_AUTORIZACION', 'EPS negó autorización de biológico por falta de soportes', 'ABIERTA', 'ALTA', NOW() - INTERVAL '2 days', 'admin@psp.com');

-- =============================================
-- PRESCRIPCIONES (8 prescripciones)
-- =============================================

INSERT INTO prescripciones (tenant_id, paciente_id, medicamento_id, medico_id, dosis, frecuencia, via_administracion, fecha_inicio, duracion_dias, estado, created_by) VALUES
  ('00000000-0000-0000-0000-000000000001', 1, 1, 1, '500mg', 'Cada 21 días', 'IV', '2026-01-15', 180, 'VIGENTE', 'medico@psp.com'),
  ('00000000-0000-0000-0000-000000000001', 2, 7, 1, '200mg', 'Cada 21 días', 'IV', '2026-01-20', 365, 'VIGENTE', 'medico@psp.com'),
  ('00000000-0000-0000-0000-000000000001', 3, 6, 2, '15mg', 'Semanal', 'SC', '2026-02-01', 90, 'VIGENTE', 'medico@psp.com'),
  ('00000000-0000-0000-0000-000000000001', 5, 4, 4, '0.5mg', 'Diario', 'VO', '2026-02-10', 365, 'VIGENTE', 'medico@psp.com'),
  ('00000000-0000-0000-0000-000000000001', 6, 1, 1, '375mg/m2', 'Cada 28 días', 'IV', '2026-02-15', 180, 'VIGENTE', 'medico@psp.com'),
  ('00000000-0000-0000-0000-000000000001', 7, 5, 5, '50/200/25mg', 'Diario', 'VO', '2026-03-01', 365, 'VIGENTE', 'medico@psp.com'),
  ('00000000-0000-0000-0000-000000000001', 9, 3, 3, '40mg', 'Cada 14 días', 'SC', '2026-02-20', 180, 'VIGENTE', 'medico@psp.com'),
  ('00000000-0000-0000-0000-000000000001', 10, 5, 5, '50/200/25mg', 'Diario', 'VO', '2026-01-10', 365, 'VIGENTE', 'medico@psp.com');

-- =============================================
-- SEGUIMIENTOS (6 seguimientos)
-- =============================================

INSERT INTO seguimientos (tenant_id, patient_id, motivo_seguimiento, tipo_contacto, prioridad, fecha_programada, estado_tarea, created_by) VALUES
  ('00000000-0000-0000-0000-000000000001', 1, 'Verificar tolerancia a ciclo 3 de Rituximab', 'TELEFONICO', 'ALTA', NOW() + INTERVAL '2 days', 'PENDIENTE', 'enfermera@psp.com'),
  ('00000000-0000-0000-0000-000000000001', 2, 'Control de efectos adversos post-infusión', 'PRESENCIAL', 'ALTA', NOW() + INTERVAL '1 day', 'PENDIENTE', 'enfermera@psp.com'),
  ('00000000-0000-0000-0000-000000000001', 3, 'Seguimiento inicio de tratamiento', 'VIRTUAL', 'MEDIA', NOW() - INTERVAL '3 days', 'EFECTIVA', 'enfermera@psp.com'),
  ('00000000-0000-0000-0000-000000000001', 5, 'Refuerzo educación en adherencia', 'TELEFONICO', 'MEDIA', NOW() + INTERVAL '5 days', 'PENDIENTE', 'enfermera@psp.com'),
  ('00000000-0000-0000-0000-000000000001', 6, 'Control pre-infusión ciclo 2', 'PRESENCIAL', 'ALTA', NOW() + INTERVAL '3 days', 'PENDIENTE', 'enfermera@psp.com'),
  ('00000000-0000-0000-0000-000000000001', 9, 'Verificar estado de autorización', 'TELEFONICO', 'ALTA', NOW(), 'PENDIENTE', 'admin@psp.com');

-- =============================================
-- TAREAS (5 tareas)
-- =============================================

INSERT INTO tareas (tenant_id, patient_id, titulo, descripcion, tipo_tarea, canal, prioridad, estado, fecha_programada, created_by) VALUES
  ('00000000-0000-0000-0000-000000000001', 1, 'Llamar para confirmar cita infusión', 'Confirmar asistencia a cita de infusión del próximo martes', 'LLAMADA', 'TELEFONO', 'ALTA', 'PENDIENTE', NOW() + INTERVAL '1 day', 'enfermera@psp.com'),
  ('00000000-0000-0000-0000-000000000001', 2, 'Enviar material educativo', 'Enviar guía de cuidados post-infusión por WhatsApp', 'EDUCACION', 'WHATSAPP', 'MEDIA', 'PENDIENTE', NOW(), 'enfermera@psp.com'),
  ('00000000-0000-0000-0000-000000000001', 3, 'Verificar fórmula médica completa', 'Contactar al médico para completar diagnóstico CIE-10 en fórmula', 'SEGUIMIENTO', 'TELEFONO', 'ALTA', 'EN_PROGRESO', NOW() - INTERVAL '1 day', 'admin@psp.com'),
  ('00000000-0000-0000-0000-000000000001', 5, 'Visita domiciliaria adherencia', 'Realizar visita domiciliaria para evaluar adherencia al tratamiento oral', 'VISITA_DOMICILIARIA', 'PRESENCIAL', 'ALTA', 'PENDIENTE', NOW() + INTERVAL '3 days', 'enfermera@psp.com'),
  ('00000000-0000-0000-0000-000000000001', 9, 'Gestionar tutela por negación', 'Apoyar paciente con proceso de tutela ante negación de EPS', 'OTRO', 'PRESENCIAL', 'ALTA', 'PENDIENTE', NOW() + INTERVAL '2 days', 'admin@psp.com');

-- =============================================
-- ENTREGAS (4 entregas)
-- =============================================

INSERT INTO entregas (tenant_id, paciente_id, prescripcion_id, operador_logistico_id, medicamento_id, tipo, estado, fecha_programada, cantidad_entregada, direccion_entrega, created_by) VALUES
  ('00000000-0000-0000-0000-000000000001', 1, 1, 1, 1, 'DOMICILIO', 'ENTREGADA', '2026-01-20', 1, 'Cra 15 # 80-45 Apt 301, Bogotá', 'admin@psp.com'),
  ('00000000-0000-0000-0000-000000000001', 5, 4, 2, 4, 'DOMICILIO', 'PROGRAMADA', '2026-03-15', 30, 'Cl 36 # 25-15, Bucaramanga', 'admin@psp.com'),
  ('00000000-0000-0000-0000-000000000001', 6, 5, 1, 1, 'IPS', 'EN_TRANSITO', '2026-03-10', 1, 'Clínica del Norte, Bogotá', 'admin@psp.com'),
  ('00000000-0000-0000-0000-000000000001', 10, 8, 3, 5, 'DOMICILIO', 'ENTREGADA', '2026-02-01', 30, 'Cl 42 # 5-80, Ibagué', 'admin@psp.com');

-- =============================================
-- APLICACIONES (3 aplicaciones)
-- =============================================

INSERT INTO aplicaciones (tenant_id, paciente_id, prescripcion_id, medicamento_id, tipo, estado, fecha_programada, created_by) VALUES
  ('00000000-0000-0000-0000-000000000001', 1, 1, 1, 'INFUSION', 'APLICADA', '2026-02-05', 'enfermera@psp.com'),
  ('00000000-0000-0000-0000-000000000001', 6, 5, 1, 'INFUSION', 'PROGRAMADA', '2026-03-15', 'enfermera@psp.com'),
  ('00000000-0000-0000-0000-000000000001', 3, 3, 6, 'SUBCUTANEA', 'PROGRAMADA', '2026-03-08', 'enfermera@psp.com');

-- =============================================
-- PARACLÍNICOS (4 paraclínicos)
-- =============================================

INSERT INTO paraclinicos (tenant_id, patient_id, tipo_paraclinico_id, fecha_solicitud, fecha_realizacion, valor_resultado, estado_resultado, es_normal, interpretacion, medico_solicita_id) VALUES
  ('00000000-0000-0000-0000-000000000001', 1, 1, '2026-02-01', '2026-02-03', NULL, 'REALIZADO', true, 'NORMAL', 1),
  ('00000000-0000-0000-0000-000000000001', 2, 4, '2026-02-10', '2026-02-12', 45.0, 'REALIZADO', true, 'NORMAL', 1),
  ('00000000-0000-0000-0000-000000000001', 5, 8, '2026-03-01', NULL, NULL, 'PENDIENTE', NULL, NULL, 4),
  ('00000000-0000-0000-0000-000000000001', 9, 6, '2026-02-25', '2026-02-27', 48.5, 'REALIZADO', false, 'ANORMAL', 2);

-- =============================================
-- TRANSPORTES (3 transportes)
-- =============================================

INSERT INTO transportes (tenant_id, paciente_id, tipo_servicio, estado, fecha_servicio, hora_recogida, hora_cita, origen, destino, institucion, motivo, created_by) VALUES
  ('00000000-0000-0000-0000-000000000001', 1, 'SENCILLO', 'PENDIENTE', CURRENT_DATE + 2, '07:00', '08:30', 'Cra 15 # 80-45, Bogotá', 'Clínica del Norte', 'Clínica del Norte', 'Infusión Rituximab', 'enfermera@psp.com'),
  ('00000000-0000-0000-0000-000000000001', 6, 'DOBLE', 'PENDIENTE', CURRENT_DATE + 3, '06:30', '08:00', 'Cl 100 # 15-60, Bogotá', 'Clínica del Norte', 'Clínica del Norte', 'Infusión + control', 'enfermera@psp.com'),
  ('00000000-0000-0000-0000-000000000001', 8, 'SENCILLO', 'EFECTIVO', CURRENT_DATE - 5, '08:00', '09:30', 'Av Pedro de Heredia, Cartagena', 'Hospital Naval', 'Hospital Naval', 'Consulta reumatología', 'enfermera@psp.com');

-- =============================================
-- CONSENTIMIENTOS (3 consentimientos)
-- =============================================

INSERT INTO consentimientos (tenant_id, patient_id, consentimiento_psp, consentimiento_tratamiento) VALUES
  ('00000000-0000-0000-0000-000000000001', 1, true, true),
  ('00000000-0000-0000-0000-000000000001', 2, true, true),
  ('00000000-0000-0000-0000-000000000001', 5, true, false);

-- =============================================
-- USER PROFILES (vinculados a auth.users creados)
-- IDs generados via Auth Admin API
-- =============================================

INSERT INTO user_profiles (id, email, nombre, role, institucion_nombre, activo, tenant_id) VALUES
  ('25715523-8678-45d3-9281-5d373bbee33e', 'admin@psp.com',      'Admin PSP',          'SUPER_ADMIN', 'Valentech PSP', true, '00000000-0000-0000-0000-000000000001'),
  ('1da906ba-482b-40a6-9e62-10d371248b7b', 'medico@psp.com',     'Dr. Carlos Mendoza', 'MEDICO',      'Valentech PSP', true, '00000000-0000-0000-0000-000000000001'),
  ('f1ddbc9f-b8fb-46f8-a60a-8eacbf63be58', 'enfermera@psp.com',  'Ana Garcia',         'ENFERMERIA',  'Valentech PSP', true, '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  nombre = EXCLUDED.nombre,
  role = EXCLUDED.role,
  tenant_id = EXCLUDED.tenant_id;
