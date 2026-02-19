@echo off
setlocal

set "AUTOSYNC_URL=%~1"
set "AUTOSYNC_TOKEN=%~2"

if "%AUTOSYNC_URL%"=="" (
  echo Uso:
  echo   scripts\setup-roadmap-autosync.cmd ^<ROADMAP_AUTOSYNC_URL^> ^<ROADMAP_AUTOSYNC_TOKEN^>
  echo.
  echo Ejemplo:
  echo   scripts\setup-roadmap-autosync.cmd https://urbanfix-web.vercel.app/api/admin/roadmap/auto-sync TU_TOKEN
  exit /b 1
)

if "%AUTOSYNC_TOKEN%"=="" (
  echo Falta ROADMAP_AUTOSYNC_TOKEN.
  echo Uso:
  echo   scripts\setup-roadmap-autosync.cmd ^<ROADMAP_AUTOSYNC_URL^> ^<ROADMAP_AUTOSYNC_TOKEN^>
  exit /b 1
)

setx ROADMAP_AUTOSYNC_URL "%AUTOSYNC_URL%" >nul
setx ROADMAP_AUTOSYNC_TOKEN "%AUTOSYNC_TOKEN%" >nul

echo Variables ROADMAP_AUTOSYNC_* guardadas para el usuario actual.
echo Cierra y abre la terminal para que tomen efecto.
echo.
echo Verificacion recomendada:
echo   npm run roadmap:sync
