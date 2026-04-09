# QA — Estrategia de Calidad PSP

## Estado Actual

| Aspecto | Estado |
|---------|--------|
| TypeScript (tsc --noEmit) | Sin errores |
| Módulos implementados | 14 módulos |
| Reglas de negocio validadas | Tipo doc/edad, 1 barrera activa, Drop Out + anonimización |
| RLS activo en Supabase | Sí |

---

## Validaciones de Negocio Implementadas

| Regla | Dónde |
|-------|-------|
| Tipo de documento vs edad (CC/TI/RC/MS) | `Step1BasicData.tsx` — validación en tiempo real |
| 1 barrera activa por paciente | `barrierService.ts` |
| Drop Out → anonimización automática | `patient.service.ts` |
| Prioridad de seguimientos por días | `seguimientoService.ts` |
| Código de paciente automático | `PacienteFormPage.tsx` |

---

## Verificación de Tipos

```bash
cd frontend/web
npx tsc --noEmit
# O con Node portable:
.\node-portable\node-v20.11.0-win-x64\npx.cmd tsc --noEmit
```

Debe producir **0 errores**.

---

## Pruebas Manuales por Módulo

### Pacientes
- [ ] Crear paciente con todos los campos del formulario (6 pasos)
- [ ] Validación tipo doc vs fecha de nacimiento muestra alerta en Step 1
- [ ] Código de paciente se genera automáticamente
- [ ] Cambio de estado funciona correctamente
- [ ] Drop Out solicita fecha + motivo y anonimiza datos

### Prescripciones
- [ ] Crear prescripción vinculada a paciente
- [ ] Listado paginado funciona

### Seguimientos
- [ ] Prioridad se calcula correctamente por días restantes
- [ ] Marcar como completado actualiza estado

### Barreras
- [ ] Solo se puede tener 1 barrera activa por paciente
- [ ] Cierre de barrera libera el límite

### Autenticación
- [ ] Login y logout funcionan
- [ ] Rutas protegidas redirigen a /login sin sesión
- [ ] Educadores no ven datos de otros laboratorios (RLS)

---

## Seguridad

- [ ] Variables de entorno no commiteadas (`.env` en `.gitignore`)
- [ ] RLS activo en Supabase para todas las tablas de datos
- [ ] No se usa la `service_role` key en el frontend
- [ ] Inputs de formularios con validación (tipos TS + validaciones del formulario)

---

## Performance

- [ ] Build de producción sin warnings (`npm run build`)
- [ ] Lazy loading activo en todas las rutas (AppRoutes.tsx)
- [ ] Sin imports innecesarios de módulos pesados
