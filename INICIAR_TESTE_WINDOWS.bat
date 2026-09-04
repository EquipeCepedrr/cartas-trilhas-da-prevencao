@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Abrindo o Trilhas da Prevencao em http://localhost:8000
echo Para encerrar o servidor, feche esta janela ou pressione Ctrl+C.
start "" "http://localhost:8000"
where py >nul 2>nul
if %errorlevel%==0 (
  py -m http.server 8000
) else (
  python -m http.server 8000
)
pause
