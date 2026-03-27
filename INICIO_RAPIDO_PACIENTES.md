# Inicio Rápido - Módulo de Pacientes

## Verificar Backend
```powershell
# 1. Verificar que el microservicio de pacientes esté corriendo
curl http://localhost:8001/api/v1/patients?page=0&size=5

# 2. Verificar Swagger UI
start http://localhost:8001/swagger-ui.html

# 3. Verificar catálogos
curl http://localhost:8001/api/v1/catalogs/departments
curl http://localhost:8001/api/v1/catalogs/eps
```

## Levantar Frontend
```powershell
cd frontend/web
npm run dev

# Abrir en navegador:
# http://localhost:5173
```

## Rutas disponibles

- **Lista:** http://localhost:5173/patients
- **Crear:** http://localhost:5173/patients/new
- **Detalle:** http://localhost:5173/patients/1
- **Editar:** http://localhost:5173/patients/1/editar

## Verificar Funcionalidad

### 1. Lista de Pacientes
- [ ] Ver tabla con pacientes
- [ ] Expandir filtros
- [ ] Buscar por nombre
- [ ] Filtrar por departamento
- [ ] Cambiar página
- [ ] Click en "Ver" (ojo)
- [ ] Click en "Editar" (lápiz)
- [ ] Click en "Eliminar" (papelera)

### 2. Crear Paciente
- [ ] Click en "+ Crear Paciente"
- [ ] Llenar formulario
- [ ] Seleccionar departamento → Ver ciudades
- [ ] Seleccionar EPS
- [ ] Marcar consentimiento
- [ ] Click en "Guardar Paciente"
- [ ] Ver toast de éxito
- [ ] Redirección a lista

### 3. Detalle
- [ ] Ver información personal
- [ ] Ver información clínica
- [ ] Ver contacto de emergencia
- [ ] Cambiar entre tabs
- [ ] Click en "Editar"

### 4. Responsive
- [ ] Abrir en móvil (DevTools)
- [ ] Ver cards en lugar de tabla
- [ ] Probar todos los breakpoints

## Solución de Problemas

### Backend no responde
```powershell
cd services/pacientes
$env:JAVA_HOME="..\..\jdk-portable\jdk-17.0.18+8"
.\mvnw.cmd clean package -Dmaven.test.skip=true
& "$env:JAVA_HOME\bin\java.exe" -jar target\pacientes-service-1.0.0.jar
```

### Puerto 5173 ocupado
```powershell
# Cambiar puerto en frontend/web/vite.config.ts
server: { port: 3000 }
```

### Errores de compilación
```powershell
cd frontend/web
npm install
npm run dev
```

## Estado Esperado

✅ Backend en puerto 8001  
✅ Frontend en puerto 5173  
✅ Sin errores de compilación  
✅ Todas las rutas funcionando  
✅ Toasts verde/rojo funcionando  
✅ Loading states visible

**Tiempo estimado de verificación:** 15 minutos
