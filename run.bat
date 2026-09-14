@echo off
setlocal
cd /d "%~dp0"
set "GRIDWATCH_PYTHON=%~dp0.venv\Scripts\python.exe"
if exist "%GRIDWATCH_PYTHON%" goto launch
set "GRIDWATCH_PYTHON=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if exist "%GRIDWATCH_PYTHON%" goto launch
set "GRIDWATCH_PYTHON=python"
:launch
"%GRIDWATCH_PYTHON%" src\server.py --port 8766 %*
exit /b %errorlevel%
