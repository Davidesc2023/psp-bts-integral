/**
 * PSP - Expand Seed Data
 *
 * Inserts additional test records so ALL 10 patients have data in every module:
 * - barriers (respecting 1-active-per-patient rule)
 * - prescripciones
 * - seguimientos
 * - tareas
 * - paraclinicos
 * - transportes
 * - consentimientos
 *
 * Uses ON CONFLICT DO NOTHING to be idempotent.
 * Patients already covered by the base seed are skipped.
 */
import pg from 'pg';
const { Client } = pg;

const DB_URL = 'postgresql://postgres:ME0LIstnXbYbgfvs@db.nfxfbkqcxoltkqrqxsce.supabase.co:5432/postgres';
const TENANT = '00000000-0000-0000-0000-000000000001';

async function run() {
  const client = new Client({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  console.log('✅ Connected');

  // ── Helper ────────────────────────────────────────────────────────────────
  async function exec(label, sql, params = []) {
    try {
      const r = await client.query(sql, params);
      console.log(`  ✅ ${label}: ${r.rowCount ?? '?'} row(s)`);
    } catch (e) {
      console.log(`  ⚠️  ${label}: ${e.message.slice(0, 80)}`);
    }
  }

  // ── 1. Barreras — complete patients 4,7,8,10 (CERRADA so no rule violation) ─
  console.log('\n🚧 Barriers...');
  await exec('barriers pat 4', `
    INSERT INTO barriers (tenant_id, patient_id, category, subcategory, description, status, prioridad, opened_at, closed_at, created_by)
    VALUES ($1,4,'AUTORIZACION','PROCESO_AUTORIZACION_PENDIENTE','Autorización pendiente para insulina basal','CERRADA','MEDIA', NOW()-INTERVAL '10 days', NOW()-INTERVAL '2 days','enfermera@psp.com')
    ON CONFLICT DO NOTHING`, [TENANT]);
  await exec('barriers pat 7', `
    INSERT INTO barriers (tenant_id, patient_id, category, subcategory, description, status, prioridad, opened_at, created_by)
    VALUES ($1,7,'RESPONSABILIDAD_PACIENTE','ADHERENCIA_PACIENTE','Paciente reporta dificultades para tomar medicación oral diaria','EN_PROCESO','MEDIA', NOW()-INTERVAL '4 days','admin@psp.com')
    ON CONFLICT DO NOTHING`, [TENANT]);
  await exec('barriers pat 8', `
    INSERT INTO barriers (tenant_id, patient_id, category, subcategory, description, status, prioridad, opened_at, created_by)
    VALUES ($1,8,'FORMULACION','FORMULA_MEDICA_INCOMPLETA','Fórmula médica requiere actualización de diagnóstico CIE-10','ABIERTA','ALTA', NOW()-INTERVAL '1 day','medico@psp.com')
    ON CONFLICT DO NOTHING`, [TENANT]);
  await exec('barriers pat 10 extra', `
    INSERT INTO barriers (tenant_id, patient_id, category, subcategory, description, status, prioridad, opened_at, created_by)
    VALUES ($1,10,'DESPACHO','PROBLEMA_DESPACHO','Operador logístico reporta retraso en despacho mes actual','ABIERTA','ALTA', NOW()-INTERVAL '3 days','admin@psp.com')
    ON CONFLICT DO NOTHING`, [TENANT]);

  // ── 2. Prescripciones — complete patients 4,8 (patients 1-3,5-7,9,10 already have them) ─
  console.log('\n💊 Prescripciones...');
  await exec('rx pat 4', `
    INSERT INTO prescripciones (tenant_id, paciente_id, medicamento_id, medico_id, dosis, frecuencia, via_administracion, fecha_inicio, duracion_dias, estado, created_by)
    VALUES ($1,4,2,2,'100mg','Mensual','IV','2026-01-05',365,'VIGENTE','medico@psp.com')
    ON CONFLICT DO NOTHING`, [TENANT]);
  await exec('rx pat 8', `
    INSERT INTO prescripciones (tenant_id, paciente_id, medicamento_id, medico_id, dosis, frecuencia, via_administracion, fecha_inicio, duracion_dias, estado, created_by)
    VALUES ($1,8,3,3,'40mg','Cada 14 días','SC','2026-02-01',180,'VIGENTE','medico@psp.com')
    ON CONFLICT DO NOTHING`, [TENANT]);

  // ── 3. Seguimientos — complete patients 4,7,8,10 ─────────────────────────
  console.log('\n📋 Seguimientos...');
  const segs = [
    [4,  'Control mensual de adherencia oral',              'TELEFONICO', 'MEDIA', `NOW() + INTERVAL '4 days'`,  'PENDIENTE'],
    [7,  'Educación en administración de terapia oral',     'VIRTUAL',    'MEDIA', `NOW() + INTERVAL '2 days'`,  'PENDIENTE'],
    [8,  'Seguimiento estado autorización',                 'TELEFONICO', 'ALTA',  `NOW() + INTERVAL '1 day'`,   'PENDIENTE'],
    [10, 'Verificar recepción de medicamento en domicilio', 'TELEFONICO', 'MEDIA', `NOW() - INTERVAL '1 day'`,   'EFECTIVA'],
  ];
  for (const [pid, motivo, tipo, prio, fecha, estado] of segs) {
    await exec(`seg pat ${pid}`, `
      INSERT INTO seguimientos (tenant_id, patient_id, motivo_seguimiento, tipo_contacto, prioridad, fecha_programada, estado_tarea, created_by)
      VALUES ($1,${pid},$2,$3,$4,${fecha},$5,'enfermera@psp.com')
      ON CONFLICT DO NOTHING`, [TENANT, motivo, tipo, prio, estado]);
  }

  // ── 4. Tareas — complete patients 4,6,7,8,10 ──────────────────────────────
  console.log('\n✅ Tareas...');
  const tareas = [
    [4,  'Confirmar próxima cita oncología',     'Coordinar cita control mensual',                                    'LLAMADA',         'TELEFONO',   'MEDIA', 'PENDIENTE',   `NOW() + INTERVAL '2 days'`],
    [6,  'Programar transporte infusión ciclo 3','Gestionar transporte domicilio-clínica para próxima infusión',       'SEGUIMIENTO',     'TELEFONO',   'ALTA',  'PENDIENTE',   `NOW() + INTERVAL '1 day'`],
    [7,  'Refuerzo adherencia terapia oral',     'Llamar para resolver dudas sobre horario de medicación',             'EDUCACION',       'WHATSAPP',   'MEDIA', 'PENDIENTE',   `NOW()`],
    [8,  'Gestionar documentación médica',       'Solicitar al médico actualización de diagnóstico en fórmula',        'SEGUIMIENTO',     'TELEFONO',   'ALTA',  'EN_PROGRESO', `NOW() - INTERVAL '1 day'`],
    [10, 'Verificar entrega domiciliaria',       'Confirmar que el medicamento del mes fue recibido correctamente',    'LLAMADA',         'TELEFONO',   'MEDIA', 'COMPLETADA',  `NOW() - INTERVAL '2 days'`],
  ];
  for (const [pid, titulo, desc, tipo, canal, prio, estado, fecha] of tareas) {
    await exec(`tarea pat ${pid}`, `
      INSERT INTO tareas (tenant_id, patient_id, titulo, descripcion, tipo_tarea, canal, prioridad, estado, fecha_programada, created_by)
      VALUES ($1,${pid},$2,$3,$4,$5,$6,$7,${fecha},'enfermera@psp.com')
      ON CONFLICT DO NOTHING`, [TENANT, titulo, desc, tipo, canal, prio, estado]);
  }

  // ── 5. Paraclínicos — complete patients 3,4,6,7,8,10 ─────────────────────
  console.log('\n🔬 Paraclínicos...');
  const paras = [
    [3,  2, '2026-03-01', '2026-03-03', 12.5,  'REALIZADO', true,  'NORMAL'],
    [4,  3, '2026-02-15', '2026-02-17', null,   'REALIZADO', true,  'NORMAL'],
    [6,  1, '2026-02-20', '2026-02-22', null,   'REALIZADO', true,  'NORMAL'],
    [7,  5, '2026-03-05', null,         null,   'PENDIENTE', null,  null],
    [8,  7, '2026-02-28', '2026-03-02', 155.0,  'REALIZADO', false, 'ANORMAL'],
    [10, 4, '2026-03-10', null,         null,   'PENDIENTE', null,  null],
  ];
  for (const [pid, tipo_id, fsol, freal, valor, estado, normal, interp] of paras) {
    await exec(`para pat ${pid}`, `
      INSERT INTO paraclinicos (tenant_id, patient_id, tipo_paraclinico_id, fecha_solicitud, fecha_realizacion, valor_resultado, estado_resultado, es_normal, interpretacion, medico_solicita_id)
      VALUES ($1, ${pid}, ${tipo_id}, '${fsol}', ${freal ? `'${freal}'` : 'NULL'}, ${valor ?? 'NULL'}, '${estado}', ${normal === null ? 'NULL' : normal}, ${interp ? `'${interp}'` : 'NULL'}, 1)
      ON CONFLICT DO NOTHING`, [TENANT]);
  }

  // ── 6. Transportes — complete patients 2,3,4,5,7,9,10 ────────────────────
  console.log('\n🚗 Transportes...');
  const transportes = [
    [2,  'SENCILLO', 'PENDIENTE',  `CURRENT_DATE + 4`,  '07:30', '09:00', 'Av El Dorado, Bogotá',         'Clínica Central',        'Control post-infusión'],
    [3,  'DOBLE',    'PENDIENTE',  `CURRENT_DATE + 6`,  '06:00', '08:00', 'Cra 30 # 45-80, Bogotá',       'Hospital Universitario', 'Consulta reumatología + examen'],
    [4,  'SENCILLO', 'PENDIENTE',  `CURRENT_DATE + 7`,  '07:00', '09:30', 'Cl 80 # 10-25, Bogotá',        'Instituto de Oncología',  'Control mensual oncología'],
    [5,  'SENCILLO', 'EFECTIVO',   `CURRENT_DATE - 3`,  '07:00', '09:00', 'Cl 36 # 25-15, Bucaramanga',   'Centro Médico Bucaramanga','Control adherencia oral'],
    [7,  'SENCILLO', 'PENDIENTE',  `CURRENT_DATE + 5`,  '08:00', '10:00', 'Av 10 # 40-15, Cali',          'Clínica Valle', 'Consulta oncología'],
    [9,  'SENCILLO', 'PENDIENTE',  `CURRENT_DATE + 2`,  '06:30', '08:30', 'Cl 45 # 30-20, Medellín',      'IPS de Salud Norte',     'Gestión tutela + cita'],
    [10, 'SENCILLO', 'PENDIENTE',  `CURRENT_DATE + 8`,  '07:30', '09:00', 'Cl 42 # 5-80, Ibagué',         'Hospital Tolima Grande',  'Control mensual hematología'],
  ];
  for (const [pid, tipo, estado, fecha, recogida, cita, origen, destino, motivo] of transportes) {
    await exec(`transporte pat ${pid}`, `
      INSERT INTO transportes (tenant_id, paciente_id, tipo_servicio, estado, fecha_servicio, hora_recogida, hora_cita, origen, destino, institucion, motivo, created_by)
      VALUES ($1,${pid},$2,$3,${fecha},$4,$5,$6,$7,$8,$9,'enfermera@psp.com')
      ON CONFLICT DO NOTHING`, [TENANT, tipo, estado, recogida, cita, origen, destino, destino, motivo]);
  }

  // ── 7. Consentimientos — complete patients 3,4,6,7,8,9,10 ─────────────────
  console.log('\n📝 Consentimientos...');
  const consents = [3, 4, 6, 7, 8, 9, 10];
  for (const pid of consents) {
    await exec(`consent pat ${pid}`, `
      INSERT INTO consentimientos (tenant_id, patient_id, consentimiento_psp, consentimiento_tratamiento)
      VALUES ($1,${pid},true,true)
      ON CONFLICT DO NOTHING`, [TENANT]);
  }

  // ── Final count ───────────────────────────────────────────────────────────
  console.log('\n📊 Final counts:');
  const tables = ['patients','barriers','prescripciones','seguimientos','tareas','paraclinicos','transportes','consentimientos'];
  for (const t of tables) {
    const r = await client.query(`SELECT COUNT(*) FROM ${t}`);
    console.log(`  ${t}: ${r.rows[0].count}`);
  }

  await client.end();
  console.log('\n🎉 Seed expansion complete! All 10 patients now have data.');
}

run().catch(err => {
  console.error('❌', err.message);
  process.exit(1);
});
