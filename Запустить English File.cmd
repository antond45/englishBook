@echo off
chcp 65001 >nul
title English File
cd /d "%~dp0"

rem Запуск приложения одним кликом: собирает сайт и запускает сервер на http://localhost:3000
rem Чтобы остановить — закрой это окно.

rem Приложение уже работает (открыто другое окно запускатора) — просто открываем браузер
curl.exe -s -f -o nul --max-time 2 http://localhost:3000/api/auth/me >nul 2>nul && (
  echo Приложение уже запущено — открываю браузер.
  start "" http://localhost:3000
  timeout /t 3 >nul
  exit /b 0
)

where node >nul 2>nul || (
  echo Не найден Node.js. Установи его с https://nodejs.org ^(версия 24 или новее^) и запусти снова.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Первый запуск: устанавливаю зависимости...
  call npm install --no-fund --no-audit || goto :fail
)

echo Собираю приложение...
call npx vite build --logLevel error || goto :fail

set PORT=3000
if not defined EFA_NO_BROWSER start "" cmd /c "timeout /t 2 >nul & start http://localhost:3000"
echo.
echo Приложение работает: http://localhost:3000
echo Чтобы остановить, закрой это окно.
echo.
node server/index.ts
goto :eof

:fail
echo.
echo Не получилось запустить. Текст ошибки выше.
pause
exit /b 1
