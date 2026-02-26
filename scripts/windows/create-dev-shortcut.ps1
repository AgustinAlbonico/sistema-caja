param(
    [string]$ProjectRoot = '',
    [string]$DesktopPath = [Environment]::GetFolderPath('Desktop')
)

$ErrorActionPreference = 'Stop'

function Resolve-ProjectRoot {
    param([string]$ProvidedRoot)

    if (-not [string]::IsNullOrWhiteSpace($ProvidedRoot)) {
        return (Resolve-Path -LiteralPath $ProvidedRoot).Path
    }

    $scriptsRoot = Split-Path -Path $PSScriptRoot -Parent
    return (Split-Path -Path $scriptsRoot -Parent)
}

function New-HiddenWrapper {
    param(
        [string]$WrapperPath,
        [string]$ScriptPath,
        [string]$ProjectPath
    )

    $escapedProjectPath = $ProjectPath -replace '"', '""'
    $content = @"
Set shell = CreateObject("WScript.Shell")
shell.Run "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File ""$ScriptPath"" -ProjectRoot ""$escapedProjectPath""", 0, False
"@

    Set-Content -LiteralPath $WrapperPath -Encoding ASCII -Value $content
}

function New-Shortcut {
    param(
        [string]$ShortcutPath,
        [string]$TargetPath,
        [string]$Description,
        [string]$IconLocation
    )

    $shell = New-Object -ComObject WScript.Shell
    $shortcut = $shell.CreateShortcut($ShortcutPath)
    $shortcut.TargetPath = $TargetPath
    $shortcut.WorkingDirectory = Split-Path -Path $TargetPath -Parent
    $shortcut.Description = $Description
    $shortcut.IconLocation = $IconLocation
    $shortcut.Save()
}

$rootPath = Resolve-ProjectRoot -ProvidedRoot $ProjectRoot
$launcherScript = Join-Path $rootPath 'scripts\windows\start-dev-hidden.ps1'

if (-not (Test-Path -LiteralPath $launcherScript)) {
    throw "No existe el launcher esperado en $launcherScript"
}

$wrappersDir = Join-Path $rootPath 'scripts\windows\wrappers'
if (-not (Test-Path -LiteralPath $wrappersDir)) {
    New-Item -ItemType Directory -Path $wrappersDir -Force | Out-Null
}

$wrapperPath = Join-Path $wrappersDir 'iniciar-sistema-local.vbs'
$shortcutPath = Join-Path $DesktopPath 'Sistema Caja - Iniciar (Local).lnk'

New-HiddenWrapper -WrapperPath $wrapperPath -ScriptPath $launcherScript -ProjectPath $rootPath
New-Shortcut -ShortcutPath $shortcutPath -TargetPath $wrapperPath -Description 'Inicia backend y frontend local sin consola y abre navegador' -IconLocation 'SHELL32.dll,137'

Write-Host "Acceso directo creado en: $shortcutPath"
