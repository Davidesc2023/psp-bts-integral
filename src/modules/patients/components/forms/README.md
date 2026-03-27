# Wizard de Pacientes - 4 Pasos

## Descripción

Wizard simplificado para registro/edición de pacientes con validación por paso, upload de PDF y diseño Material-UI profesional.

## Estructura de Archivos

```
frontend/web/src/modules/patients/
├── pages/
│   └── PacienteFormPage.tsx          # Wizard principal con MUI Stepper
├── components/
│   ├── forms/
│   │   ├── Step1BasicData.tsx        # Paso 1/4 - Datos Básicos
│   │   ├── Step2Sociodemographic.tsx # Paso 2/4 - Sociodemográfico
│   │   ├── Step3Clinical.tsx         # Paso 3/4 - Datos Clínicos
│   │   ├── Step4GuardianConsent.tsx  # Paso 4/4 - Acudiente + PDF
│   │   ├── types.ts                   # TypeScript interfaces
│   │   └── index.ts                   # Barrel export
│   └── FileUpload.tsx                 # Componente de upload PDF
```

## Pasos del Wizard

### Paso 1: Datos Básicos (1/4)
**Campos:**
- Tipo de documento (select)
- Número de documento *
- Primer nombre *
- Segundo nombre
- Primer apellido *
- Segundo apellido
- Fecha de nacimiento *
- Género * (select)
- Teléfono principal *
- Teléfono alternativo
- Email *
- Dirección *

**Validaciones:**
- Documento requerido
- Nombres y apellido requeridos
- Email válido (regex)
- Fecha válida
- Todos los campos obligatorios completos

### Paso 2: Sociodemográfico (2/4)
**Campos:**
- País (Colombia por defecto)
- Departamento * (autocomplete)
- Ciudad * (depende de departamento)
- Zona de residencia * (Urbano/Rural)
- Estrato socioeconómico * (1-6)
- Estado civil * (select)
- Nivel educativo (opcional)
- Ocupación (opcional)

**Validaciones:**
- Departamento y ciudad requeridos
- Zona de residencia requerida
- Estrato requerido
- Estado civil requerido

### Paso 3: Datos Clínicos (3/4)
**Campos:**
- EPS * (autocomplete)
- IPS * (autocomplete)
- Estado del paciente * (Activo/Suspendido/Retirado/Fallecido)
- Fecha de ingreso *
- Fecha de suspensión (si estado = Suspendido)
- Fecha de retiro (si estado = Retirado)
- Motivo de suspensión/retiro (condicional)
- Tipo de población (opcional)

**Validaciones:**
- EPS e IPS requeridas
- Estado requerido
- Fecha de ingreso requerida
- Fechas condicionales según estado

### Paso 4: Acudiente y Consentimiento (4/4)
**Campos:**
- Nombre del acudiente
- Relación con el paciente (select)
- Teléfono del acudiente
- Email del acudiente
- Dirección del acudiente
- **Consentimiento firmado * (checkbox)**
- **Documento PDF * (upload - solo si consentimiento = true)**

**Validaciones:**
- Consentimiento debe estar marcado
- Si consentimiento = true, PDF es obligatorio
- PDF máximo 5MB
- Solo formato PDF

## Características Técnicas

### Navegación
```typescript
- Stepper visual de Material-UI
- Botones: "Anterior", "Siguiente", "Guardar"
- Validación antes de avanzar a siguiente paso
- Indicador de progreso (Paso X de 4)
```

### Upload de PDF
```typescript
// FileUpload.tsx
- Drag & drop funcional
- Click to upload
- Validación de tipo (solo PDF)
- Validación de tamaño (max 5MB)
- Preview del nombre del archivo
- Botón para eliminar archivo
```

### Integración con API
```typescript
// Al hacer submit en paso 4:
const formData = new FormData();
formData.append('patient', JSON.stringify(patientData));
if (consentDocument) {
  formData.append('consentDocument', consentDocument);
}

await patientService.createPatient(formData);
```

### Validación por Paso
```typescript
validateStep(stepNumber: number): boolean
- Paso 0: Valida datos básicos
- Paso 1: Valida ubicación y sociodemográfico
- Paso 2: Valida EPS, IPS y fechas
- Paso 3: Valida consentimiento y PDF
```

## Uso

### Acceso
```
URL: http://localhost:3000/patients/new
Ruta: /patients/new
Componente: PacienteFormPage
```

### Flujo de Usuario
1. Usuario entra a /patients
2. Click en "Nuevo Paciente"
3. Completa Paso 1 → Click "Siguiente"
4. Completa Paso 2 → Click "Siguiente"
5. Completa Paso 3 → Click "Siguiente"
6. Marca consentimiento → Sube PDF → Click "Guardar"
7. Redirección a /patients con toast de éxito

### Estados del Formulario
```typescript
interface PatientFormData {
  // 40+ campos organizados por paso
  // Ver: components/forms/types.ts
}
```

## Estilos y Diseño

### Material-UI Components Usados
- `Stepper`, `Step`, `StepLabel`
- `Grid`, `TextField`, `MenuItem`
- `Paper`, `Box`, `Typography`
- `Button`, `IconButton`
- `Checkbox`, `FormControlLabel`
- `Alert`, `CircularProgress`

### Responsive Design
```typescript
// Stepper alternativo en móvil
<Stepper alternativeLabel={isMobile}>
  
// Mobile: muestra "1/4", Desktop: muestra "Datos Básicos"
<StepLabel>
  {isMobile ? `${index + 1}/4` : label}
</StepLabel>
```

### Palette de Colores
- Primary: `#111827` (títulos)
- Secondary: `#6b7280` (subtítulos)
- Error: `theme.palette.error`
- Success: `theme.palette.success`

## Errores Comunes y Soluciones

### Error: "Cannot find module './types'"
**Solución:** Recargar VS Code (Ctrl+Shift+P → "Reload Window")

### Error: "consentDocument must be PDF"
**Solución:** FileUpload valida automáticamente, solo permite PDFs

### Error: Backend devuelve 400 Bad Request
**Solución:** Verificar que el backend espera FormData con multipart/form-data

### Error: Fechas inválidas
**Solución:** Usar formato ISO: `YYYY-MM-DD`

## Testing

### Testing Manual
```bash
# 1. Levantar frontend
cd frontend/web
npm run dev

# 2. Ir a http://localhost:3000/patients/new
# 3. Completar wizard completo
# 4. Verificar PDF upload funciona
# 5. Verificar validaciones por paso
```

### Testing con React Testing Library
```typescript
// Ejemplo de test para Step1
test('valida campos obligatorios en Paso 1', () => {
  render(<Step1BasicData {...mockProps} />);
  
  const nextButton = screen.getByText('Siguiente');
  fireEvent.click(nextButton);
  
  expect(screen.getByText(/documento requerido/i)).toBeInTheDocument();
});
```

## Próximas Mejoras

- [ ] Modo edición (pre-cargar datos de paciente existente)
- [ ] Guardar borrador en localStorage
- [ ] Preview del PDF antes de submit
- [ ] Descarga del PDF subido
- [ ] Validación de documento único en tiempo real
- [ ] Autoguardado cada X segundos
- [ ] Animaciones entre pasos
- [ ] Modo oscuro

## Mantenimiento

### Agregar nuevo campo
1. Agregar a `PatientFormData` en `types.ts`
2. Agregar input en el Step correspondiente
3. Agregar validación en `validateStep()`
4. Actualizar payload en `createMutation`

### Agregar nuevo paso
1. Crear `Step5*.tsx` en `components/forms/`
2. Agregar label en array `STEPS`
3. Agregar case en `renderStep()`
4. Agregar validación en `validateStep()`

---

**Autor:** Senior Frontend Developer Mode  
**Fecha:** 2026-03-13  
**Versión:** 1.0.0  
**Framework:** React 18 + TypeScript + Material-UI  
