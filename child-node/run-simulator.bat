@echo off
title Local Orange Pi Simulator (Child Node)
echo ==========================================
echo   AlgoTrade Navigator - Sentry Simulator
echo ==========================================

REM Set Environment Variables to match Mother Node config
set MOTHER_NODE_URL=http://localhost:3000/api/ingest
set ORANGE_PI_SECRET=dev-secret-key
set SYMBOL=btcusdt

echo [INFO] Starting Local Simulator tracking %SYMBOL%
echo [INFO] Bounding to Mother Node at %MOTHER_NODE_URL%
echo.

node index.js
pause
