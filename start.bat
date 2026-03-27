@echo off
echo ============================================
echo PSP Web - Quick Start
echo ============================================
echo.

REM Verifica si Node.js está instalado
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no está instalado
    echo Por favor instala Node.js desde https://nodejs.org/
    pause
    exit /b 1
)

echo [INFO] Node version:
node --version
echo.

REM Verifica si node_modules existe
if not exist "node_modules" (
    echo [INFO] Instalando dependencias...
    echo.
    call npm install
    if %errorlevel% neq 0 (
        echo [ERROR] Error al instalar dependencias
        pause
        exit /b 1
    )
)

REM Copia .env.example si .env no existe
if not exist ".env" (
    echo [INFO] Creando archivo .env desde .env.example...
    copy .env.example .env
    echo.
    echo [IMPORTANTE] Revisa el archivo .env y configura las variables necesarias
    echo.
)

echo [INFO] Iniciando servidor de desarrollo...
echo.
echo ============================================
echo La aplicación estará disponible en:
echo http://localhost:3000
echo ============================================
echo.
echo Presiona Ctrl+C para detener el servidor
echo.

call npm run dev

pause
