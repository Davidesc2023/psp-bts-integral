/**
 * PSP Supabase Schema Deployment Script
 * 
 * Usage: node deploy-schema.mjs <database-password>
 * 
 * Connects to Supabase PostgreSQL and executes schema.sql + seed.sql
 * Also creates demo auth users.
 */
import pg from 'pg';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const { Client } = pg;

const PROJECT_REF = 'nfxfbkqcxoltkqrqxsce';
const DB_PASSWORD = process.argv[2];

if (!DB_PASSWORD) {
  console.error('❌ Uso: node deploy-schema.mjs <database-password>');
  console.error('   El password es el que estableciste al crear el proyecto en supabase.com');
  process.exit(1);
}

// Try multiple connection methods
const REGIONS = ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2', 'eu-west-1', 'eu-central-1', 'ap-southeast-1', 'sa-east-1'];

function getConnectionStrings(password) {
  const encoded = encodeURIComponent(password);
  return [
    // Direct connection (most reliable for DDL)
    `postgresql://postgres:${encoded}@db.${PROJECT_REF}.supabase.co:5432/postgres`,
    // Session mode pooler for each region
    ...REGIONS.map(r => `postgresql://postgres.${PROJECT_REF}:${encoded}@aws-0-${r}.pooler.supabase.com:5432/postgres`),
  ];
}

async function run() {
  console.log('🔌 Conectando a Supabase PostgreSQL...');
  
  const connStrings = getConnectionStrings(DB_PASSWORD);
  let client = null;
  let connected = false;

  for (const cs of connStrings) {
    const host = cs.match(/@([^:\/]+)/)?.[1] || 'unknown';
    process.stdout.write(`   Intentando ${host}... `);
    client = new Client({ connectionString: cs, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 8000 });
    try {
      await client.connect();
      console.log('✅ Conectado!');
      connected = true;
      break;
    } catch (err) {
      console.log(`❌ ${err.message.slice(0, 60)}`);
      try { await client.end(); } catch {}
    }
  }

  if (!connected || !client) {
    console.error('\n❌ No se pudo conectar a ningún host. Verifica el password.');
    process.exit(1);
  }
  
  try {

    // Execute schema
    console.log('\n📦 Ejecutando schema.sql...');
    const schema = readFileSync(join(__dirname, 'schema.sql'), 'utf8');
    await client.query(schema);
    console.log('✅ Schema creado correctamente');

    // Execute seed
    console.log('\n🌱 Ejecutando seed.sql...');
    const seed = readFileSync(join(__dirname, 'seed.sql'), 'utf8');
    await client.query(seed);
    console.log('✅ Seed data insertada correctamente');

    // Verify tables
    console.log('\n📊 Verificando tablas creadas...');
    const { rows } = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    console.log(`✅ ${rows.length} tablas creadas:`);
    rows.forEach(r => console.log(`   - ${r.table_name}`));

    // Verify patients count
    const { rows: patients } = await client.query('SELECT COUNT(*) as total FROM patients');
    console.log(`\n👥 Pacientes demo: ${patients[0].total}`);

    // Verify RPC function
    const { rows: funcs } = await client.query(`
      SELECT routine_name FROM information_schema.routines
      WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
    `);
    console.log(`⚡ Funciones RPC: ${funcs.map(f => f.routine_name).join(', ') || 'ninguna'}`);

    console.log('\n🎉 ¡Deployment completado exitosamente!');
    console.log('\n📋 Siguiente paso: Crear usuarios de autenticación');
    console.log('   Ve a tu Supabase Dashboard → Authentication → Users → Add User');
    console.log('   - admin@psp.com / Admin123!');
    console.log('   - medico@psp.com / Medico123!');
    console.log('   - enfermera@psp.com / Enfermera123!');

  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.message.includes('password authentication failed')) {
      console.error('🔑 Verifica que el password sea correcto');
    }
    if (err.message.includes('already exists')) {
      console.error('⚠️  Algunas tablas ya existen. Si quieres empezar de cero, ejecuta:');
      console.error('   DROP SCHEMA public CASCADE; CREATE SCHEMA public;');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

run();
