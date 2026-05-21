param(
    [string]$BackendPath = "",
    [string]$BackendPython = "",
    [string]$FrontendPath = "",
    [string]$RenderApiUrl = "https://green-saver-api.onrender.com",
    [switch]$ForceLocalBackend,
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
    $primaryBackendPath = Join-Path $scriptRoot '..\green-saver-backend'
    $legacyBackendPath = Join-Path $scriptRoot '..\greensaver-backend\backend'

    if (Test-Path $primaryBackendPath) {
        $BackendPath = $primaryBackendPath
    }
    else {
        $BackendPath = $legacyBackendPath
    }
}

if ([string]::IsNullOrWhiteSpace($BackendPython)) {
    $venvPython = Join-Path $BackendPath '.venv\Scripts\python.exe'
    if (Test-Path $venvPython) {
        $BackendPython = $venvPython
    }
    else {
        $BackendPython = 'python'
    }
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

if (($BackendPython -ne 'python') -and (-not (Test-Path $BackendPython))) {
    throw "No se encontró el ejecutable de Python del backend en: $BackendPython"
}

if (-not (Test-Path $FrontendPath)) {
    throw "No se encontró el frontend en: $FrontendPath. Usa -FrontendPath para indicar la ruta correcta."
}

$resolvedDatabaseUrl =
    [Environment]::GetEnvironmentVariable('DATABASE_URL', 'Process')

if ([string]::IsNullOrWhiteSpace($resolvedDatabaseUrl)) {
    $resolvedDatabaseUrl = [Environment]::GetEnvironmentVariable('DATABASE_URL', 'User')
}

if ([string]::IsNullOrWhiteSpace($resolvedDatabaseUrl)) {
    $resolvedDatabaseUrl = [Environment]::GetEnvironmentVariable('DATABASE_URL', 'Machine')
}

$useLocalBackend = $ForceLocalBackend.IsPresent -or -not [string]::IsNullOrWhiteSpace($resolvedDatabaseUrl)

# Función para esperar a que la base de datos esté disponible
function Wait-ForDatabasePort {
    param(
        [string]$HostName = "127.0.0.1",
        [int]$Port = 3308,
        [int]$MaxAttempts = 30,
        [int]$DelaySeconds = 1
    )
    
    $attempt = 0
    while ($attempt -lt $MaxAttempts) {
        $tcp = Test-NetConnection -ComputerName $HostName -Port $Port -WarningAction SilentlyContinue
        if ($tcp.TcpTestSucceeded) {
            Write-Output "[OK] Base de datos disponible en ${HostName}:${Port}"
            return $true
        }
        $attempt++
        if ($attempt -lt $MaxAttempts) {
            Write-Output "  Esperando base de datos... ($attempt/$MaxAttempts)"
            Start-Sleep -Seconds $DelaySeconds
        }
    }
    
    Write-Error "Base de datos no respondió en ${HostName}:${Port} después de $MaxAttempts intentos."
    return $false
}

if ($useLocalBackend) {
    $mysqlRunning = Get-Process mysqld, mariadbd -ErrorAction SilentlyContinue
    if (-not $mysqlRunning) {
        Write-Output "Iniciando MariaDB..."
        Start-Process -FilePath $MysqlExe -ArgumentList "--defaults-file=$MysqlConfig", "--console" -WindowStyle Hidden
        Start-Sleep -Seconds 2
    }

    # Esperar a que MariaDB esté disponible antes de iniciar el backend
    if (-not (Wait-ForDatabasePort -HostName "127.0.0.1" -Port $DatabasePort)) {
        throw "No se pudo conectar a la base de datos. Por favor revisa MariaDB."
    }
}
else {
    Write-Warning "No se encontró DATABASE_URL local. El frontend se conectará a Render: $RenderApiUrl"
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
`$env:DATABASE_URL='$resolvedDatabaseUrl'
Set-Location '$BackendPath'
& '$BackendPython' -m uvicorn app.main:app --app-dir '$BackendPath' --reload --host 0.0.0.0 --port $ApiPort
"@

$frontendApiUrl = if ($useLocalBackend) { "http://${LanIp}:$ApiPort" } else { $RenderApiUrl }
$frontendEnv = @"
`$env:EXPO_PUBLIC_API_URL='$frontendApiUrl'
`$env:REACT_NATIVE_PACKAGER_HOSTNAME='$LanIp'
Set-Location '$FrontendPath'
npx expo start --host lan --port $ExpoPort --clear
"@

# Validar dependencias minimas del backend antes de abrir terminales
if ($useLocalBackend -and $BackendPython -ne 'python') {
    $uvicornCheck = & $BackendPython -c "import uvicorn" 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "El entorno virtual del backend no tiene uvicorn. Ejecuta: $BackendPython -m pip install -r '$BackendPath\requirements.txt'"
    }
}

if ($useLocalBackend) {
    $backendProcess = Start-Process -FilePath powershell -ArgumentList @('-NoExit', '-Command', $backendEnv) -PassThru

    # Asegurar que la API este arriba antes de iniciar Expo para evitar timeouts en login/registro.
    if (-not (Wait-ForDatabasePort -HostName '127.0.0.1' -Port ([int]$ApiPort) -MaxAttempts 25 -DelaySeconds 1)) {
        throw "El backend no inicio en el puerto $ApiPort. Revisa la consola del backend (PID $($backendProcess.Id))."
    }
}

Start-Process -FilePath powershell -ArgumentList @('-NoExit', '-Command', $frontendEnv)

Write-Host '════════════════════════════════════════════════════════════════' -ForegroundColor Green
Write-Host '[OK] Todos los servicios estan iniciando...' -ForegroundColor Green
Write-Host '════════════════════════════════════════════════════════════════' -ForegroundColor Green
Write-Host ""
Write-Host "  [DB]      Base de datos:  MariaDB en http://127.0.0.1:$DatabasePort" -ForegroundColor Cyan
if ($useLocalBackend) {
    Write-Host "  [API]     Backend:      FastAPI en http://127.0.0.1:$ApiPort" -ForegroundColor Cyan
    Write-Host "  [API-LAN] Backend LAN:  http://${LanIp}:$ApiPort" -ForegroundColor Cyan
}
else {
    Write-Host "  [API]     Backend:      Render en $RenderApiUrl" -ForegroundColor Cyan
}
Write-Host "  [EXPO]    Frontend:     Expo en http://${LanIp}:$ExpoPort" -ForegroundColor Cyan
Write-Host ""
Write-Host "  -> Abre Expo Go en tu telefono y escanea el QR que aparecera" -ForegroundColor Yellow
Write-Host ""
Write-Host '════════════════════════════════════════════════════════════════' -ForegroundColor Green
