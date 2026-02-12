param(
    [string]$Owner = '',
    [string]$Repo = '',
    [string]$RuntimeRoot = 'C:\SistemaCajaEstudio',
    [string]$Channel = 'stable'
)

$ErrorActionPreference = 'Stop'

. "$PSScriptRoot\runtime-env.ps1"

function Normalize-Version {
    param([string]$Tag)
    return ($Tag -replace '^v', '').Trim()
}

$versionFilePath = Join-Path $RuntimeRoot 'version.json'

$envMap = Import-RuntimeEnv -RuntimeRoot $RuntimeRoot
if (-not $Owner) { $Owner = Get-RuntimeEnvValue -EnvMap $envMap -Key 'UPDATE_OWNER' -DefaultValue '' }
if (-not $Repo) { $Repo = Get-RuntimeEnvValue -EnvMap $envMap -Key 'UPDATE_REPO' -DefaultValue '' }

$envChannel = Get-RuntimeEnvValue -EnvMap $envMap -Key 'UPDATE_CHANNEL' -DefaultValue ''
if ($envChannel) {
    $Channel = $envChannel
}

if (-not $Owner -or -not $Repo) {
    $updateConfigPath = Join-Path $RuntimeRoot 'config\update-config.json'
    if (Test-Path -LiteralPath $updateConfigPath) {
        $updateConfig = Get-Content -LiteralPath $updateConfigPath -Raw | ConvertFrom-Json
        if (-not $Owner) { $Owner = [string]$updateConfig.owner }
        if (-not $Repo) { $Repo = [string]$updateConfig.repo }
    }
}

if (-not $Owner -or -not $Repo) {
    throw 'Debes indicar Owner y Repo o completar UPDATE_OWNER/UPDATE_REPO en runtime\\config\\.env'
}

if (-not (Test-Path -LiteralPath $versionFilePath)) {
    throw "No existe version.json en $versionFilePath"
}

$localState = Get-Content -LiteralPath $versionFilePath -Raw | ConvertFrom-Json
$localVersionRaw = [string]$localState.version
$localVersion = Normalize-Version -Tag $localVersionRaw

$headers = @{ Accept = 'application/vnd.github+json' }
$releaseUrl = "https://api.github.com/repos/$Owner/$Repo/releases/latest"
$latestRelease = Invoke-RestMethod -Uri $releaseUrl -Headers $headers -Method Get

$remoteTag = [string]$latestRelease.tag_name
$remoteVersion = Normalize-Version -Tag $remoteTag

$hasUpdate = $false
try {
    $hasUpdate = ([version]$remoteVersion -gt [version]$localVersion)
} catch {
    $hasUpdate = ($remoteVersion -ne $localVersion)
}

$result = [ordered]@{
    channel = $Channel
    localVersion = $localVersionRaw
    remoteVersion = $remoteTag
    hasUpdate = $hasUpdate
    releaseId = $latestRelease.id
    releaseName = $latestRelease.name
}

$resultJson = $result | ConvertTo-Json -Depth 8
Write-Output $resultJson

if ($hasUpdate) {
    exit 10
}

exit 0
