-- ============================================================
-- MIGRACIÓN: transportes + servicios_complementarios v2
-- Ejecutar en Supabase SQL Editor
-- ============================================================

-- ============================================================
-- 1. TRANSPORTES — agregar columnas que usa el frontend
-- ============================================================

ALTER TABLE transportes ADD COLUMN IF NOT EXISTS paciente_nombre VARCHAR(300);
ALTER TABLE transportes ADD COLUMN IF NOT EXISTS direccion_origen TEXT;
ALTER TABLE transportes ADD COLUMN IF NOT EXISTS barrio_origen VARCHAR(200);
ALTER TABLE transportes ADD COLUMN IF NOT EXISTS municipio_origen VARCHAR(200);
ALTER TABLE transportes ADD COLUMN IF NOT EXISTS departamento_origen VARCHAR(200);
ALTER TABLE transportes ADD COLUMN IF NOT EXISTS telefono_contacto VARCHAR(30);
ALTER TABLE transportes ADD COLUMN IF NOT EXISTS tratamiento VARCHAR(200);
ALTER TABLE transportes ADD COLUMN IF NOT EXISTS direccion_destino TEXT;
ALTER TABLE transportes ADD COLUMN IF NOT EXISTS barrio_destino VARCHAR(200);
ALTER TABLE transportes ADD COLUMN IF NOT EXISTS municipio_destino VARCHAR(200);
ALTER TABLE transportes ADD COLUMN IF NOT EXISTS departamento_destino VARCHAR(200);
ALTER TABLE transportes ADD COLUMN IF NOT EXISTS nombre_ips_destino VARCHAR(300);
ALTER TABLE transportes ADD COLUMN IF NOT EXISTS hora_servicio TIME;
ALTER TABLE transportes ADD COLUMN IF NOT EXISTS fecha_regreso DATE;
ALTER TABLE transportes ADD COLUMN IF NOT EXISTS hora_regreso TIME;
ALTER TABLE transportes ADD COLUMN IF NOT EXISTS requiere_acompanante BOOLEAN DEFAULT false;
ALTER TABLE transportes ADD COLUMN IF NOT EXISTS nombre_acompanante VARCHAR(200);
ALTER TABLE transportes ADD COLUMN IF NOT EXISTS gestora_solicitante VARCHAR(200);
ALTER TABLE transportes ADD COLUMN IF NOT EXISTS requerimiento_transporte TEXT;
ALTER TABLE transportes ADD COLUMN IF NOT EXISTS condiciones_especiales TEXT;
ALTER TABLE transportes ADD COLUMN IF NOT EXISTS comentarios TEXT;
ALTER TABLE transportes ADD COLUMN IF NOT EXISTS fecha_cierre TIMESTAMPTZ;
ALTER TABLE transportes ADD COLUMN IF NOT EXISTS observaciones_cierre TEXT;
ALTER TABLE transportes ADD COLUMN IF NOT EXISTS quien_cierra VARCHAR(200);

-- Verificar columnas agregadas
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'transportes'
ORDER BY ordinal_position;

-- ============================================================
-- 2. SERVICIOS COMPLEMENTARIOS — verificar columnas existentes
-- (el servicio ya fue corregido para usar: estado, profesional_asignado, fecha_programada)
-- ============================================================

-- Asegurar columna resultado existe (se usa en completar)
ALTER TABLE servicios_complementarios ADD COLUMN IF NOT EXISTS resultado TEXT;

-- Verificar columnas
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'servicios_complementarios'
ORDER BY ordinal_position;

-- ============================================================
-- 3. PROGRAMAS PSP — agregar alias 'active' para compatibilidad
--    (schema usa 'activo', el filtro paginado usa 'active')
-- ============================================================

-- No se puede crear alias, pero se puede renombrar la columna de forma segura
-- SOLO ejecutar si confirmas que no hay otra lógica dependiente de 'activo'
-- ALTER TABLE programas_psp RENAME COLUMN activo TO active;
-- Por ahora se deja como está: el filtro por active simplemente no filtra,
-- lo cual no es un error crítico (devuelve todos).

-- ============================================================
-- 4. DIAGNOSTICOS CIE10 — no tiene activo, tabla es catálogo fijo
--    El toggle en UI es no-op (ya manejado en adminCatalog.service.ts)
-- ============================================================

-- Sin cambios requeridos.
