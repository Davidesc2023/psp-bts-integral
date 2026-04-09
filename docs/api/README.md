# API Reference — PSP

El sistema PSP utiliza **Supabase** como backend. La comunicación se realiza directamente desde el frontend a través del cliente de Supabase JS (`@supabase/supabase-js`).

No hay una API REST propia — todas las operaciones de datos se ejecutan contra las tablas de PostgreSQL en Supabase, sujetas a las políticas de Row Level Security (RLS).

---

## Tablas Principales

| Tabla | Descripción | Servicio frontend |
|-------|-------------|-------------------|
| `pacientes` | Ficha completa del paciente | `patient.service.ts` |
| `prescripciones` | Órdenes médicas | `prescripcionService.ts` |
| `consultas_medicas` | Visitas médicas | `consultaService.ts` |
| `seguimientos` | Seguimientos programados | `seguimientoService.ts` |
| `paraclínicos` | Resultados de laboratorio | `paraclinicoService.ts` |
| `entregas` | Entregas de medicamentos | `entregaService.ts` |
| `aplicaciones` | Aplicaciones/infusiones | `aplicacionService.ts` |
| `inventario_paciente` | Stock por paciente | *(en desarrollo)* |
| `barreras` | Barreras de acceso | `barrierService.ts` |
| `tareas` | Tareas para educadoras | `tareaService.ts` |
| `consentimientos` | Consentimientos | `consentimientoService.ts` |
| `user_profiles` | Perfiles de usuario | `auth.service.ts` |

---

## Autenticación

El sistema usa **Supabase Auth** con JWT. El token se obtiene al hacer login y se envía automáticamente en cada request via el cliente Supabase.

```typescript
// Login
const { data, error } = await supabase.auth.signInWithPassword({
  email: credentials.email,
  password: credentials.password,
});

// El cliente supabase adjunta el token automáticamente en cada query
const { data: pacientes } = await supabase.from('pacientes').select('*');
```

---

## Row Level Security (RLS)

Todas las tablas tienen RLS habilitado. Las políticas están definidas en `supabase/fix_rls_policies.pgsql` y controlan:

- Los **educadores** solo ven pacientes de su laboratorio/programa asignado
- Los **coordinadores** ven todos los pacientes de sus programas
- Los **administradores** tienen acceso global

---

## Servicios Frontend (`src/services/`)

Cada servicio exporta funciones para CRUD sobre su tabla correspondiente:

```typescript
// Ejemplo: patient.service.ts
export const patientService = {
  listar: () => supabase.from('pacientes').select('*'),
  obtener: (id: string) => supabase.from('pacientes').select('*').eq('id', id).single(),
  crear: (data: CreatePacienteDTO) => supabase.from('pacientes').insert(data),
  actualizar: (id: string, data: UpdatePacienteDTO) => supabase.from('pacientes').update(data).eq('id', id),
};
```
