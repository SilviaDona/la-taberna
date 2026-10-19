@echo off
rem work-shelter en Windows: el equivalente de ./shelter. Todo lo hace shelter.ps1 (sin cambiar la directiva de
rem ejecución del sistema: -ExecutionPolicy Bypass solo vale para esta ejecución).
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0shelter.ps1" %*
exit /b %ERRORLEVEL%
