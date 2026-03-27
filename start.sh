#!/bin/bash

echo "============================================"
echo "PSP Web - Quick Start"
echo "============================================"
echo ""

# Verifica si Node.js está instalado
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js no está instalado"
    echo "Por favor instala Node.js desde https://nodejs.org/"
    exit 1
fi

echo "[INFO] Node version:"
node --version
echo ""

# Verifica si node_modules existe
if [ ! -d "node_modules" ]; then
    echo "[INFO] Instalando dependencias..."
    echo ""
    npm install
    if [ $? -ne 0 ]; then
        echo "[ERROR] Error al instalar dependencias"
        exit 1
    fi
fi

# Copia .env.example si .env no existe
if [ ! -f ".env" ]; then
    echo "[INFO] Creando archivo .env desde .env.example..."
    cp .env.example .env
    echo ""
    echo "[IMPORTANTE] Revisa el archivo .env y configura las variables necesarias"
    echo ""
fi

echo "[INFO] Iniciando servidor de desarrollo..."
echo ""
echo "============================================"
echo "La aplicación estará disponible en:"
echo "http://localhost:3000"
echo "============================================"
echo ""
echo "Presiona Ctrl+C para detener el servidor"
echo ""

npm run dev
