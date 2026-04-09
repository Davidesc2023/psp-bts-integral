# 🚀 INICIO RÁPIDO - FRONTEND PSP MOCK

## ⚡ Levanta el Frontend en 3 Pasos

### 1️⃣ Abre PowerShell/CMD en la raíz del proyecto

```powershell
cd "c:\Users\DavidEstebanSanguino\OneDrive - BotoShop\Business Intelligence\PSP\SOPORTE PACIENTES"
```

### 2️⃣ Ejecuta el script de verificación

```powershell
.\verificar-frontend.bat
```

### 3️⃣ ¡Listo! El navegador se abrirá automáticamente

---

## 🔐 Credenciales de Acceso

```
Email:    admin@psp.com
Password: admin123
```

*(Acepta cualquier combinación - es MOCK)*

---

## 📍 Rutas Disponibles

- **Login:** http://localhost:3001/login
- **Dashboard:** http://localhost:3001/dashboard
- **Pacientes:** http://localhost:3001/patients

---

## 🎯 Qué Puedes Ver

### ✅ Dashboard
- 4 KPIs con tendencias
- Gráfico de seguimientos mensuales
- Distribución por programa
- Barreras por tipo
- Actividad reciente
- Próximos seguimientos

### ✅ Lista de Pacientes
- 8 pacientes con datos completos
- Búsqueda por nombre/documento
- Paginación (10, 20, 50, 100)
- Ver detalles de cada paciente

---

## 🛠️ Si el Servidor No Está Corriendo

### Opción A: Script Automático
```powershell
cd frontend\web
.\start.bat
```

### Opción B: Manual
```powershell
cd frontend\web
$env:PATH = "$PWD\node-portable\node-v20.11.0-win-x64;$env:PATH"
npm run dev
```

El servidor debería iniciar en: **http://localhost:3001/**

---

## 📊 Datos Mock Incluidos

### Pacientes (8 registros)
- María González Pérez - Bogotá
- Juan Pérez Rodríguez - Medellín
- Ana Martínez López - Cali
- Carlos López Sánchez - Bogotá
- Laura Sánchez Díaz - Barranquilla
- Roberto Díaz García - Cartagena
- Patricia Ramírez Torres - Medellín
- Diego Torres Vargas - Bogotá

### Dashboard KPIs
- Total Pacientes: **1,234**
- Prescripciones Activas: **856**
- Barreras Identificadas: **42**
- Adherencia Promedio: **87%**

---

## ⚠️ Nota Importante

**Backend NO está levantado**  
Todos los datos son MOCK/hardcoded en:
- `frontend/web/src/services/patient.service.ts`
- `frontend/web/src/modules/auth/LoginPage.tsx`
- `frontend/web/src/modules/dashboard/DashboardPage.tsx`

---

## 📖 Documentación Completa

Ver archivo: **`frontend/LEVANTE_FRONTEND_EVIDENCIA.md`**

---

## ✅ Checklist de Verificación

- [ ] Servidor Vite corriendo en http://localhost:3001/
- [ ] Login funciona (cualquier credencial)
- [ ] Dashboard muestra KPIs y gráficos
- [ ] Lista de pacientes muestra 8 registros
- [ ] Búsqueda funciona
- [ ] Navegación entre páginas funciona

---

**¡Todo listo para demostración!** 🎉
