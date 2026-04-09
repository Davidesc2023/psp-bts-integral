#!/usr/bin/env powershell
Set-StrictMode -Version Latest
$ErrorActionPreference = "SilentlyContinue"

cd "c:\Users\DavidEstebanSanguino\OneDrive - BotoShop\Business Intelligence\PSP\SOPORTE PACIENTES\frontend\web"

Write-Host "Configuring Node PATH..." -ForegroundColor Cyan
$env:PATH = "$(pwd)\node-portable\node-v20.11.0-win-x64;$env:PATH"

Write-Host "Verifying node..." -ForegroundColor Cyan
& node --version
& npm --version

Write-Host "Installing dependencies..." -ForegroundColor Cyan
& npm install --legacy-peer-deps --no-audit

if ($LASTEXITCODE -ne 0) {
    Write-Host "npm install failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit 1
}

Write-Host "Building..." -ForegroundColor Cyan
& npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed with exit code $LASTEXITCODE" -ForegroundColor Red
    exit 1
}

Write-Host "Build successful!" -ForegroundColor Green
