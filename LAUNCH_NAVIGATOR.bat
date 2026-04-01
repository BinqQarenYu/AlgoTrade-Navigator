@echo off
title AlgoTrade-Navigator: Mother Node Launcher
echo ======================================================
echo   [1/3] CLEANING PREVIOUS NODE SESSIONS...
echo ======================================================
taskkill /F /IM node.exe /T >nul 2>&1

echo [2/3] STARTING NAVIGATOR (MOTHER NODE) DEV SERVER...
:: Starts the server in a new minimized window
start /min cmd /c "npm run dev"

echo [3/3] WAITING 12 SECS FOR TURBOPACK TO INITIALIZE...
timeout /t 12 /nobreak >nul

echo [SYSTEM] Launching Dashboard in Browser...
start http://localhost:3000

echo.
echo ======================================================
echo   MOTHER NODE IS NOW ACTIVE IN THE BACKGROUND.
echo   UI ACCESSIBLE AT: http://localhost:3000
echo.
echo   TO CLOSE COMPLETELY: CLOSE THIS WINDOW AND 
echo   RUN THIS AGAIN TO WIPE STALE SESSIONS.
echo ======================================================
pause
