param([string]$RuntimeRoot = 'C:\SistemaCajaEstudio')

$ErrorActionPreference = 'Stop'

Add-Type -AssemblyName System.Windows.Forms

$applyScript = Join-Path $PSScriptRoot 'apply-update.ps1'

$output = & powershell.exe -NoProfile -ExecutionPolicy Bypass -File $applyScript -RuntimeRoot $RuntimeRoot 2>&1
$exitCode = $LASTEXITCODE
$text = ($output | Out-String)

if (-not $text.Trim()) {
    $text = if ($exitCode -eq 0) { 'Actualizacion completada o no habia version nueva.' } else { 'La actualizacion fallo. Revisa logs.' }
}

$title = if ($exitCode -eq 0) { 'Actualizacion del sistema' } else { 'Fallo de actualizacion' }
$icon = if ($exitCode -eq 0) { [System.Windows.Forms.MessageBoxIcon]::Information } else { [System.Windows.Forms.MessageBoxIcon]::Error }

[System.Windows.Forms.MessageBox]::Show($text, $title, [System.Windows.Forms.MessageBoxButtons]::OK, $icon) | Out-Null

exit $exitCode
