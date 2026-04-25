param(
    [ValidateSet('usuarios', 'calculos', 'stats', 'all')]
    [string]$View = 'all'
)

$ErrorActionPreference = 'Stop'

function Connect-Database {
    $script:mysqlPath = 'C:\xampp\mysql\bin\mysql.exe'
    $script:dbHost = '127.0.0.1'
    $script:dbPort = '3308'
    $script:dbUser = 'root'
    $script:dbName = 'greensaver'
}

function Query-Database {
    param([string]$SQL)
    
    $SQL | & $mysqlPath -u $dbUser -h $dbHost --port=$dbPort $dbName 2>&1
}

function Show-Usuarios {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "USUARIOS REGISTRADOS" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    
    $sql = @"
SELECT 
    id,
    nombre,
    email,
    rol,
    created_at
FROM usuarios
ORDER BY created_at DESC;
"@
    
    Query-Database $sql | Format-Table -AutoSize
}

function Show-Calculos {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "CALCULOS DE SISTEMAS SOLARES" -ForegroundColor Cyan
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
    
    $sql = @"
SELECT 
    id,
    email,
    consumption,
    estimatedPanels,
    coverage,
    estimatedSavings,
    created_at
FROM calculos_sistema
ORDER BY created_at DESC;
"@
    
    Query-Database $sql | Format-Table -AutoSize
}

function Show-Stats {
    Write-Host ""
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "ESTADISTICAS DE BASE DE DATOS" -ForegroundColor Green
    Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Green
    
    $sql = @"
SELECT 
    'Total Usuarios' as Metrica,
    COUNT(*) as Valor
FROM usuarios
UNION ALL
SELECT 
    'Total Calculos',
    COUNT(*)
FROM calculos_sistema
UNION ALL
SELECT 
    'Consumo Promedio (kWh)',
    ROUND(AVG(consumption), 2)
FROM calculos_sistema
UNION ALL
SELECT 
    'Paneles Promedio',
    ROUND(AVG(estimatedPanels), 1)
FROM calculos_sistema
UNION ALL
SELECT 
    'Ahorro Promedio (USD)',
    ROUND(AVG(estimatedSavings), 2)
FROM calculos_sistema;
"@
    
    Query-Database $sql | Format-Table -AutoSize
}

# Ejecutar
Connect-Database

switch ($View) {
    'usuarios' { Show-Usuarios }
    'calculos' { Show-Calculos }
    'stats'    { Show-Stats }
    'all'      { Show-Usuarios; Show-Calculos; Show-Stats }
}

Write-Host ""
Write-Host "Uso: .\check-database.ps1 -View [usuarios|calculos|stats|all]" -ForegroundColor Yellow
Write-Host ""
