param([string]$RuntimeRoot = 'C:\SistemaCajaEstudio')

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Windows.Forms

$scriptPath = Join-Path $PSScriptRoot 'test-db-connection.ps1'

$output = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $scriptPath -RuntimeRoot $RuntimeRoot 2>&1
$exitCode = $LASTEXITCODE

$text = ($output | Out-String)
if (-not $text.Trim()) {
    $text = if ($exitCode -eq 0) { 'PASS: conexion exitosa' } else { 'FAIL: error sin detalle' }
}

$title = if ($exitCode -eq 0) { 'Prueba DB exitosa' } else { 'Prueba DB fallida' }
$icon = if ($exitCode -eq 0) { [System.Windows.Forms.MessageBoxIcon]::Information } else { [System.Windows.Forms.MessageBoxIcon]::Error }

[System.Windows.Forms.MessageBox]::Show($text, $title, [System.Windows.Forms.MessageBoxButtons]::OK, $icon) | Out-Null

exit $exitCode
