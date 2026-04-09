/**
 * PSP - Crear usuarios de autenticación en Supabase
 * 
 * Usage: node create-users.mjs
 * 
 * Usa el service_role key para crear usuarios directamente via Auth Admin API
 */

const SUPABASE_URL = 'https://nfxfbkqcxoltkqrqxsce.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5meGZia3FjeG9sdGtxcnF4c2NlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDYzOTM1NSwiZXhwIjoyMDkwMjE1MzU1fQ.dDn4uD4vQjqQGrLieWS-5SmQLxFHG0wNM5sSzggeB_g';

const USERS = [
  { email: 'admin@psp.com', password: 'Admin123!', role: 'SUPER_ADMIN', nombre: 'Admin PSP' },
  { email: 'medico@psp.com', password: 'Medico123!', role: 'MEDICO', nombre: 'Dr. Carlos Mendoza' },
  { email: 'enfermera@psp.com', password: 'Enfermera123!', role: 'ENFERMERIA', nombre: 'Ana García' },
];

async function createUser(user) {
  // 1. Create auth user
  const authRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: user.email,
      password: user.password,
      email_confirm: true,
      user_metadata: { nombre: user.nombre, role: user.role },
    }),
  });

  if (!authRes.ok) {
    const err = await authRes.json();
    if (err.msg?.includes('already been registered') || err.message?.includes('already been registered')) {
      console.log(`⚠️  ${user.email} ya existe, actualizando...`);
      // Get existing user
      const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=50`, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });
      const list = await listRes.json();
      const existing = list.users?.find(u => u.email === user.email);
      if (existing) return existing.id;
      return null;
    }
    console.error(`❌ Error creando ${user.email}:`, err);
    return null;
  }

  const authUser = await authRes.json();
  console.log(`✅ Auth user creado: ${user.email} (${authUser.id})`);
  return authUser.id;
}

async function createProfile(userId, user) {
  if (!userId) return;

  // Insert into user_profiles table via PostgREST
  const res = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    },
    body: JSON.stringify({
      id: userId,
      email: user.email,
      nombre: user.nombre,
      role: user.role,
      institucion: 'Valentech PSP',
      activo: true,
      tenant_id: '00000000-0000-0000-0000-000000000001',
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    if (errText.includes('duplicate') || errText.includes('already exists')) {
      console.log(`⚠️  Profile ${user.email} ya existe`);
      return;
    }
    console.error(`❌ Error creando profile ${user.email}:`, errText);
    return;
  }
  console.log(`✅ Profile creado: ${user.email} → ${user.role}`);
}

async function main() {
  console.log('🔐 Creando usuarios de autenticación en Supabase...\n');

  for (const user of USERS) {
    const userId = await createUser(user);
    await createProfile(userId, user);
    console.log('');
  }

  console.log('🎉 ¡Usuarios creados exitosamente!');
  console.log('\n📋 Credenciales de acceso:');
  console.log('───────────────────────────────');
  USERS.forEach(u => {
    console.log(`   ${u.email} / ${u.password} → ${u.role}`);
  });
  console.log('───────────────────────────────');
}

main().catch(err => {
  console.error('❌ Error fatal:', err);
  process.exit(1);
});
