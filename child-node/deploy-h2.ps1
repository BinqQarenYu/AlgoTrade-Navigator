# Deploy to H2 (Orange Pi) Child Node
# This script automates Phase 2 and Phase 3 of the Deployment Plan.

param (
    [string]$H2_IP = "192.168.1.32", # Replace with your H2's actual IP
    [string]$H2_USER = "orangepi",    # Default Orange Pi username
    [string]$MOTHER_IP = "192.168.1.2",
    [string]$SECRET = "dev-secret-key",
    [string]$SYMBOL = "btcusdt"
)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  AlgoTrade Navigator - H2 Node Deployer" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

if ($H2_IP -eq "192.168.1.XXX") {
    Write-Host "ERROR: Please edit this script or pass the exact -H2_IP parameter before running." -ForegroundColor Red
    exit 1
}

Write-Host "`n[1/4] Zipping child-node directory..." -ForegroundColor Yellow
if (Test-Path "$env:TEMP\child-node.zip") { Remove-Item "$env:TEMP\child-node.zip" -Force }
Compress-Archive -Path ".\*" -DestinationPath "$env:TEMP\child-node.zip" -Force

Write-Host "[2/4] Transferring files to H2 ($H2_USER@$H2_IP)..." -ForegroundColor Yellow
# Using scp to transfer to the home directory
scp "$env:TEMP\child-node.zip" ${H2_USER}@${H2_IP}:~/child-node.zip

Write-Host "[3/4] Extracting and installing dependencies on H2..." -ForegroundColor Yellow
$installCmd = "unzip -o ~/child-node.zip -d ~/child-node && cd ~/child-node && npm install && sudo npm install -g pm2"
ssh ${H2_USER}@${H2_IP} $installCmd

Write-Host "[4/4] Starting Sentry Node via PM2..." -ForegroundColor Yellow
$pm2StartCmd = "cd ~/child-node && pm2 start index.js --name 'orange-pi-sentry' -e MOTHER_NODE_URL='http://${MOTHER_IP}:3000/api/ingest' ORANGE_PI_SECRET='${SECRET}' SYMBOL='${SYMBOL}' && pm2 save"
ssh ${H2_USER}@${H2_IP} $pm2StartCmd

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host " Deployment Complete!" -ForegroundColor Green
Write-Host " The H2 is now running the child node." -ForegroundColor Green
Write-Host " To view logs on the H2, SSH in and run: pm2 logs orange-pi-sentry" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green

# Cleanup temp file
if (Test-Path "$env:TEMP\child-node.zip") { Remove-Item "$env:TEMP\child-node.zip" -Force }
