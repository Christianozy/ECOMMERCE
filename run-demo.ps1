# IYKMAVIAN Local Demo Launcher
# ──────────────────────────────

Write-Host "`n🚀 Starting IYKMAVIAN Pharmaceutical Hub Demo...`n" -ForegroundColor Cyan

# 1. Kill any existing node processes on port 5000 (optional but helpful)
try {
    $proc = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
    if ($proc) {
        Write-Host "⚠️  Port 5000 is occupied. Stopping old server..." -ForegroundColor Yellow
        Stop-Process -Id (Get-Process -Id $proc[0].OwningProcess).Id -Force
    }
} catch {}

# 2. Start the Backend
Write-Host "📦 Starting Backend Server (localhost:5000)..." -ForegroundColor Green
Start-Process node -ArgumentList "src/server.js" -WorkingDirectory "$PSScriptRoot\backend" -NoNewWindow

# 3. Wait a moment for the server to spin up
Start-Sleep -Seconds 2

# 4. Open the Frontend
Write-Host "🌐 Opening IYKMAVIAN Frontend..." -ForegroundColor Green
Start-Process "index.html" -WorkingDirectory $PSScriptRoot

Write-Host "`n✅ Demo is running!" -ForegroundColor Cyan
Write-Host "🔑 Admin Login: admin@iykmavian.com"
Write-Host "🔑 Password   : Krilox@2026Secure!" -ForegroundColor Yellow
Write-Host "`nKeep this terminal open while using the app.`n"
