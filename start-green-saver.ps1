param(
    [string]$BackendPath = "",
    [string]$FrontendPath = "",
    [string]$MysqlExe = "C:\xampp\mysql\bin\mysqld.exe",
    [string]$MysqlConfig = "C:\xampp\mysql\bin\my.ini",
    [string]$DatabasePort = "3308",
    [string]$ApiPort = "8000",
    [string]$ExpoPort = "8090",
    [string]$LanIp = ""
)

$ErrorActionPreference = 'Stop'

$scriptRoot = if ($PSScriptRoot) { $PSScriptRoot } else { Split-Path -Parent $MyInvocation.MyCommand.Path }

if ([string]::IsNullOrWhiteSpace($BackendPath)) {
    $BackendPath = Join-Path $scriptRoot '..\greensaver-backend\backend'
}

if ([string]::IsNullOrWhiteSpace($FrontendPath)) {
    $FrontendPath = $scriptRoot
}

if (-not (Test-Path $MysqlExe)) {
    throw "No se encontró mysqld en: $MysqlExe"
}

if (-not (Test-Path $MysqlConfig)) {
    throw "No se encontró my.ini en: $MysqlConfig"
}

if (-not (Test-Path $BackendPath)) {
    throw "No se encontró el backend en: $BackendPath. Usa -BackendPath para indicar la ruta correcta."
}

if (-not (Test-Path $FrontendPath)) {
    throw "No se encontró el frontend en: $FrontendPath. Usa -FrontendPath para indicar la ruta correcta."
}

# Función para esperar a que la base de datos esté disponible
function Wait-ForDatabasePort {
    param(
        [string]$Host = "127.0.0.1",
        [int]$Port = 3308,
        [int]$MaxAttempts = 30,
        [int]$DelaySeconds = 1
    )
    
    $attempt = 0
    while ($attempt -lt $MaxAttempts) {
        $tcp = Test-NetConnection -ComputerName $Host -Port $Port -WarningAction SilentlyContinue
        if ($tcp.TcpTestSucceeded) {
            Write-Output "[OK] Base de datos disponible en ${Host}:${Port}"
            return $true
        }
        $attempt++
        if ($attempt -lt $MaxAttempts) {
            Write-Output "  Esperando base de datos... ($attempt/$MaxAttempts)"
            Start-Sleep -Seconds $DelaySeconds
        }
    }
    
    Write-Error "Base de datos no respondió en ${Host}:${Port} después de $MaxAttempts intentos."
    return $false
}

$mysqlRunning = Get-Process mysqld, mariadbd -ErrorAction SilentlyContinue
if (-not $mysqlRunning) {
    Write-Output "Iniciando MariaDB..."
    Start-Process -FilePath $MysqlExe -ArgumentList "--defaults-file=$MysqlConfig", "--console" -WindowStyle Hidden
    Start-Sleep -Seconds 2
}

# Esperar a que MariaDB esté disponible antes de iniciar el backend
if (-not (Wait-ForDatabasePort -Host "127.0.0.1" -Port [int]$DatabasePort)) {
    throw "No se pudo conectar a la base de datos. Por favor revisa MariaDB."
}

if ([string]::IsNullOrWhiteSpace($LanIp)) {
    $defaultRoute = Get-NetRoute -DestinationPrefix '0.0.0.0/0' -ErrorAction SilentlyContinue |
        Sort-Object RouteMetric, InterfaceMetric |
        Select-Object -First 1

    if ($defaultRoute) {
        $LanIp = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Where-Object {
                $_.InterfaceIndex -eq $defaultRoute.InterfaceIndex -and
                $_.IPAddress -notlike '127.*' -and
                $_.IPAddress -notlike '169.254.*'
            } |
            Select-Object -First 1 -ExpandProperty IPAddress
    }

    if ([string]::IsNullOrWhiteSpace($LanIp)) {
        $physicalUpIndexes = Get-NetAdapter -Physical -ErrorAction SilentlyContinue |
            Where-Object { $_.Status -eq 'Up' } |
            Select-Object -ExpandProperty InterfaceIndex

        $LanIp = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Where-Object {
                $_.InterfaceIndex -in $physicalUpIndexes -and
                $_.IPAddress -notlike '127.*' -and
                $_.IPAddress -notlike '169.254.*'
            } |
            Select-Object -First 1 -ExpandProperty IPAddress
    }
}

if ([string]::IsNullOrWhiteSpace($LanIp)) {
    throw "No se pudo detectar IP LAN automaticamente. Ejecuta con -LanIp '192.168.x.x'."
}

$selectedIp = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object { $_.IPAddress -eq $LanIp } |
    Select-Object -First 1

if ($selectedIp) {
    $connectionProfile = Get-NetConnectionProfile -ErrorAction SilentlyContinue |
        Where-Object { $_.InterfaceIndex -eq $selectedIp.InterfaceIndex } |
        Select-Object -First 1

    if ($connectionProfile -and $connectionProfile.NetworkCategory -eq 'Public') {
        Write-Warning "Tu red actual esta en perfil Public. Esto puede bloquear Expo desde el telefono."
        Write-Warning "En PowerShell como Administrador: Set-NetConnectionProfile -InterfaceAlias '$($connectionProfile.InterfaceAlias)' -NetworkCategory Private"
    }
}

# Evita que Expo cambie de puerto automaticamente por procesos anteriores.
$portPattern = ":$ExpoPort "
$expoPids = netstat -ano | Select-String $portPattern | ForEach-Object {
    ($_ -split '\s+')[-1]
} | Where-Object { $_ -match '^\d+$' } | Select-Object -Unique

foreach ($processId in $expoPids) {
    Stop-Process -Id ([int]$processId) -Force -ErrorAction SilentlyContinue
}

$backendEnv = @"
`$env:DB_PORT='$DatabasePort'
Set-Location '$BackendPath'
& c:/python314/python.exe -m uvicorn main:app --reload --host 0.0.0.0 --port $ApiPort
"@

$frontendEnv = @"
`$env:EXPO_PUBLIC_API_URL='http://${LanIp}:$ApiPort'
`$env:REACT_NATIVE_PACKAGER_HOSTNAME='$LanIp'
Set-Location '$FrontendPath'
npx expo start --host lan --port $ExpoPort --clear
"@

Start-Process -FilePath powershell -ArgumentList @('-NoExit', '-Command', $backendEnv)
Start-Process -FilePath powershell -ArgumentList @('-NoExit', '-Command', $frontendEnv)

Write-Host '════════════════════════════════════════════════════════════════' -ForegroundColor Green
Write-Host '[OK] Todos los servicios estan iniciando...' -ForegroundColor Green
Write-Host '════════════════════════════════════════════════════════════════' -ForegroundColor Green
Write-Host ""
Write-Host "  [DB]      Base de datos:  MariaDB en http://127.0.0.1:$DatabasePort" -ForegroundColor Cyan
Write-Host "  [API]     Backend:      FastAPI en http://127.0.0.1:$ApiPort" -ForegroundColor Cyan
Write-Host "  [API-LAN] Backend LAN:  http://${LanIp}:$ApiPort" -ForegroundColor Cyan
Write-Host "  [EXPO]    Frontend:     Expo en http://${LanIp}:$ExpoPort" -ForegroundColor Cyan
Write-Host ""
Write-Host "  -> Abre Expo Go en tu telefono y escanea el QR que aparecera" -ForegroundColor Yellow
Write-Host ""
Write-Host '════════════════════════════════════════════════════════════════' -ForegroundColor Green
