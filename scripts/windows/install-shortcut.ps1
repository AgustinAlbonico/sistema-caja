param(
  [string]$ShortcutName = 'Sistema Caja Estudio',
  [switch]$AllUsersDesktop
)

$ErrorActionPreference = 'Stop'

function Get-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
}

function Ensure-LauncherEnv {
  param([Parameter(Mandatory = $true)][string]$ScriptsDir)

  $target = Join-Path $ScriptsDir 'launcher.env'
  $source = Join-Path $ScriptsDir 'launcher.env.example'

  if ((-not (Test-Path -LiteralPath $target)) -and (Test-Path -LiteralPath $source)) {
    Copy-Item -LiteralPath $source -Destination $target -Force
    Write-Host "Se creo launcher.env desde plantilla: $target"
  }
}

function Get-DesktopPath {
  param([bool]$AllUsers)

  if ($AllUsers) {
    return [Environment]::GetFolderPath('CommonDesktopDirectory')
  }

  return [Environment]::GetFolderPath('Desktop')
}

function Resolve-PowerShellExecutable {
  $pwsh = Get-Command pwsh -ErrorAction SilentlyContinue
  if ($pwsh) {
    return $pwsh.Source
  }

  return 'C:\Windows\System32\WindowsPowerShell\v1.0\powershell.exe'
}

function New-LauncherShortcut {
  param(
    [Parameter(Mandatory = $true)][string]$DesktopPath,
    [Parameter(Mandatory = $true)][string]$ShortcutName,
    [Parameter(Mandatory = $true)][string]$LauncherScriptPath,
    [Parameter(Mandatory = $true)][string]$WorkingDirectory
  )

  if (-not (Test-Path -LiteralPath $LauncherScriptPath)) {
    throw "No existe launcher script en: $LauncherScriptPath"
  }

  $shell = New-Object -ComObject WScript.Shell
  $shortcutPath = Join-Path $DesktopPath "$ShortcutName.lnk"

  try {
    $shortcut = $shell.CreateShortcut($shortcutPath)
    $shortcut.TargetPath = Resolve-PowerShellExecutable
    $shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -File `"$LauncherScriptPath`""
    $shortcut.WorkingDirectory = $WorkingDirectory
    $shortcut.IconLocation = "$env:SystemRoot\System32\shell32.dll,176"
    $shortcut.Description = 'Inicia backend + frontend y abre Sistema Caja Estudio'
    $shortcut.WindowStyle = 1
    $shortcut.Save()
  } finally {
    [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($shell)
  }

  return $shortcutPath
}

try {
  $repoRoot = Get-RepoRoot
  $scriptsDir = Join-Path $repoRoot 'scripts\windows'
  $launcherScriptPath = Join-Path $scriptsDir 'start-app.ps1'

  Ensure-LauncherEnv -ScriptsDir $scriptsDir

  $desktopPath = Get-DesktopPath -AllUsers:$AllUsersDesktop.IsPresent
  $shortcutPath = New-LauncherShortcut -DesktopPath $desktopPath -ShortcutName $ShortcutName -LauncherScriptPath $launcherScriptPath -WorkingDirectory $repoRoot

  Write-Host "Acceso directo creado: $shortcutPath"
  Write-Host 'Listo. Doble clic sobre el icono para iniciar el sistema.'
} catch {
  Write-Host "Error al crear acceso directo: $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
