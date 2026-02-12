param(
    [string]$RuntimeRoot = 'C:\SistemaCajaEstudio',
    [string]$DesktopPath = [Environment]::GetFolderPath('Desktop')
)

$ErrorActionPreference = 'Stop'

function Ensure-Directory {
    param([string]$Path)
    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function New-HiddenWrapper {
    param(
        [string]$WrapperPath,
        [string]$ScriptPath,
        [string]$Arguments
    )

    $content = @"
Set shell = CreateObject("WScript.Shell")
shell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""$ScriptPath"" $Arguments", 0, False
"@

    Set-Content -LiteralPath $WrapperPath -Encoding ASCII -Value $content
}

function New-Shortcut {
    param(
        [string]$ShortcutPath,
        [string]$TargetPath,
        [string]$Description
    )

    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($ShortcutPath)
    $shortcut.TargetPath = $TargetPath
    $shortcut.WorkingDirectory = Split-Path -Path $TargetPath -Parent
    $shortcut.Description = $Description
    $shortcut.Save()
}

function Remove-FileIfExists {
    param([string]$Path)

    if (Test-Path -LiteralPath $Path) {
        Remove-Item -LiteralPath $Path -Force
    }
}

$scriptsDir = Join-Path $RuntimeRoot 'scripts'
$wrappersDir = Join-Path $scriptsDir 'wrappers'

Ensure-Directory -Path $scriptsDir
Ensure-Directory -Path $wrappersDir

$wrapperStart = Join-Path $wrappersDir 'iniciar-sistema.vbs'

Remove-FileIfExists -Path (Join-Path $wrappersDir 'detener-sistema.vbs')
Remove-FileIfExists -Path (Join-Path $wrappersDir 'actualizar-sistema.vbs')
Remove-FileIfExists -Path (Join-Path $wrappersDir 'configurar-db.vbs')
Remove-FileIfExists -Path (Join-Path $wrappersDir 'probar-db.vbs')

New-HiddenWrapper -WrapperPath $wrapperStart -ScriptPath (Join-Path $scriptsDir 'start-system.ps1') -Arguments "-RuntimeRoot `"$RuntimeRoot`""

New-Shortcut -ShortcutPath (Join-Path $DesktopPath 'Sistema Caja - Iniciar.lnk') -TargetPath $wrapperStart -Description 'Inicia backend y frontend del sistema'

Remove-FileIfExists -Path (Join-Path $DesktopPath 'Sistema Caja - Detener.lnk')
Remove-FileIfExists -Path (Join-Path $DesktopPath 'Sistema Caja - Actualizar.lnk')
Remove-FileIfExists -Path (Join-Path $DesktopPath 'Sistema Caja - Config DB.lnk')
Remove-FileIfExists -Path (Join-Path $DesktopPath 'Sistema Caja - Probar DB.lnk')

Write-Host "Accesos creados en $DesktopPath"
