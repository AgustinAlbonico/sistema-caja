param(
    [string]$RuntimeRoot = 'C:\SistemaCajaEstudio',
    [string]$InitialVersion = '0.0.0'
)

$ErrorActionPreference = 'Stop'

. "$PSScriptRoot\runtime-env.ps1"

function Ensure-Directory {
    param([Parameter(Mandatory = $true)][string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) {
        New-Item -ItemType Directory -Path $Path -Force | Out-Null
    }
}

function Ensure-JsonFile {
    param(
        [Parameter(Mandatory = $true)][string]$Path,
        [Parameter(Mandatory = $true)][hashtable]$Payload
    )

    if (-not (Test-Path -LiteralPath $Path)) {
        $json = $Payload | ConvertTo-Json -Depth 8
        Set-Content -LiteralPath $Path -Encoding UTF8 -Value $json
    }
}

Ensure-Directory -Path $RuntimeRoot

$directories = @(
    'config',
    'logs',
    'updates',
    'releases',
    'scripts',
    'current'
)

foreach ($directory in $directories) {
    Ensure-Directory -Path (Join-Path $RuntimeRoot $directory)
}

$versionFilePath = Join-Path $RuntimeRoot 'version.json'
$installStatePath = Join-Path $RuntimeRoot 'install-state.json'
$updateConfigPath = Join-Path $RuntimeRoot 'config\update-config.json'

$envPath = Ensure-RuntimeEnvTemplate -RuntimeRoot $RuntimeRoot

Ensure-JsonFile -Path $versionFilePath -Payload @{
    version = $InitialVersion
    channel = 'stable'
    currentReleasePath = (Join-Path $RuntimeRoot 'current')
    updatedAt = (Get-Date).ToString('o')
}

Ensure-JsonFile -Path $installStatePath -Payload @{
    installed = $true
    runtimeRoot = $RuntimeRoot
    initializedAt = (Get-Date).ToString('o')
    layoutVersion = 1
}

Ensure-JsonFile -Path $updateConfigPath -Payload @{
    owner = ''
    repo = ''
    assetName = ''
    channel = 'stable'
    checkOnStart = $true
}

Write-Host "Runtime listo en $RuntimeRoot"
Write-Host 'Estructura validada: config, logs, updates, releases, scripts, current'
Write-Host "Template .env: $envPath"
exit 0
