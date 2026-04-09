# Build Instructions - auth-lambda (Unit 6)

**Unidad**: Unit 6 - entrevista-auth
**Build Tool**: uv (Python workspace manager)
**Nota arquitectonica**: auth-lambda NO es un servicio deployado. El "build" consiste en instalar el paquete `entrevista-shared` en el workspace uv para que los otros lambdas puedan consumirlo.

---

## Prerequisites

| Requisito | Version | Verificacion |
|-----------|---------|-------------|
| Python | >= 3.12 | `python --version` |
| uv | >= 0.4.0 | `uv --version` |
| Git | any | Acceso al repo |

### Instalar uv (si no esta instalado)
```bash
# macOS / Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows (PowerShell)
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

# Con pip
pip install uv
```

---

## Environment Variables

Estas variables son necesarias para que los tests pasen. Para el build en si (uv sync) no son necesarias.

| Variable | Requerida para | Ejemplo |
|----------|---------------|---------|
| `SUPABASE_JWT_SECRET` | Tests de JWT verifier | `super-secret-jwt-key-min-32-chars` |
| `MONGODB_URI` | Tests de MongoDB client | `mongodb://localhost:27017` |

Para tests locales, crea un archivo `.env` en `packages/entrevista-shared/` (NO commitear):
```bash
SUPABASE_JWT_SECRET=test-secret-key-at-least-32-characters-long
MONGODB_URI=mongodb://localhost:27017/test
```

---

## Build Steps

### 1. Ubicarse en la raiz del workspace uv

```bash
# El pyproject.toml del workspace esta en la raiz del polyrepo
cd agentic_interviewer_ai/
```

### 2. Inicializar y sincronizar el workspace uv

```bash
uv sync
```

**Que hace este comando**:
- Lee `pyproject.toml` de la raiz (workspace definition)
- Descarga e instala `entrevista-shared` y todas sus dependencias
- Crea `.venv/` en la raiz del workspace (si no existe)
- Instala las dependencias del grupo `dev` (pytest, pytest-asyncio)

**Output esperado**:
```
Resolved [N] packages in [X]ms
Installed [N] packages in [X]ms
 + entrevista-shared==0.1.0 (editable)
 + PyJWT==2.x.x
 + cryptography==4x.x.x
 + motor==3.x.x
 + pymongo==4.x.x
 + aws-xray-sdk==2.x.x
 + httpx==0.x.x
 + pytest==8.x.x
 + pytest-asyncio==0.x.x
```

### 3. Verificar instalacion del paquete

```bash
uv run python -c "import entrevista_shared; print('OK:', entrevista_shared.__version__)"
```

Output esperado: `OK: 0.1.0`

### 4. Verificar modulos individuales

```bash
uv run python -c "
from entrevista_shared.auth.supabase_jwt_verifier import verify_supabase_token
from entrevista_shared.db.mongodb_client import get_mongo_client
from entrevista_shared.db.retry import with_db_retry
from entrevista_shared.observability.xray_utils import xray_subsegment
print('Todos los modulos importan correctamente')
"
```

---

## Build Artifacts

| Artefacto | Ubicacion | Descripcion |
|-----------|-----------|-------------|
| Package instalado (editable) | `.venv/lib/python3.12/site-packages/` | entrevista-shared en modo editable |
| Wheel (opcional) | `packages/entrevista-shared/dist/` | Solo si se hace `uv build` |
| Lock file | `uv.lock` (raiz) | Dependencias pinneadas |

### Build opcional: generar wheel

Si se necesita distribuir el paquete (p.ej., para Docker lambda layers):
```bash
cd packages/entrevista-shared/
uv build
# Genera: dist/entrevista_shared-0.1.0-py3-none-any.whl
```

---

## Troubleshooting

### Error: `uv: command not found`
```bash
# Verificar que uv este en PATH
which uv   # macOS/Linux
where uv   # Windows

# Si no esta, agregar ~/.cargo/bin (o %USERPROFILE%\.cargo\bin) al PATH
```

### Error: `No workspace root found`
```bash
# Verificar que existe pyproject.toml en la raiz con [tool.uv.workspace]
cat pyproject.toml | grep -A3 "uv.workspace"
# Debe mostrar: members = ["packages/entrevista-shared"]
```

### Error: `Python 3.12 not found`
```bash
# Instalar Python 3.12 con uv
uv python install 3.12
uv sync
```

### Error al importar cryptography
```bash
# En algunos sistemas necesita compiladores C
# macOS: xcode-select --install
# Linux: sudo apt install build-essential python3-dev
# Windows: instalar Visual C++ Build Tools
```
