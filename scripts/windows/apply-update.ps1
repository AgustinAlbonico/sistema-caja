param(
    [string]$Owner = '',
    [string]$Repo = '',
    [string]$RuntimeRoot = 'C:\SistemaCajaEstudio',
    [string]$BackendServiceName = 'SistemaCajaBackend',
    [string]$FrontendServiceName = 'SistemaCajaFrontend',
    [string]$AssetName = '',
    [int]$HealthRetries = 10
)

$ErrorActionPreference = 'Stop'

. "$PSScriptRoot\runtime-env.ps1"

$script:backendHealthUrl = 'http://127.0.0.1:47832/api/health'
$script:frontendHealthUrl = 'http://127.0.0.1:5173'

function Normalize-Version {
    param([string]$Tag)
    return ($Tag -replace '^v', '').Trim()
}

function Stop-Services {
    param([string[]]$Names)

    foreach ($name in $Names) {
        $service = Get-Service -Name $name -ErrorAction SilentlyContinue
        if ($null -eq $service) {
            continue
        }

        if ($service.Status -ne 'Stopped') {
            Stop-Service -Name $name -Force
            Start-Sleep -Seconds 1
        }
    }
}

function Start-Services {
    param([string[]]$Names)

    foreach ($name in $Names) {
        $service = Get-Service -Name $name -ErrorAction SilentlyContinue
        if ($null -eq $service) {
            continue
        }

        Start-Service -Name $name
    }
}

function Test-Health {
    param([int]$Retries)

    $backendHealthy = $false
    $frontendHealthy = $false

    for ($i = 0; $i -lt $Retries; $i++) {
        try {
            $backendResponse = Invoke-WebRequest -UseBasicParsing -Uri $script:backendHealthUrl -TimeoutSec 5
            if ($backendResponse.StatusCode -eq 200) {
                $backendHealthy = $true
            }
        } catch {
        }

        try {
            $frontendResponse = Invoke-WebRequest -UseBasicParsing -Uri $script:frontendHealthUrl -TimeoutSec 5
            if ($frontendResponse.StatusCode -ge 200 -and $frontendResponse.StatusCode -lt 500) {
                $frontendHealthy = $true
            }
        } catch {
        }

        if ($backendHealthy -and $frontendHealthy) {
            return $true
        }

        Start-Sleep -Seconds 2
    }

    return $false
}

function Resolve-PayloadRoot {
    param([string]$ExtractedDir)

    $children = Get-ChildItem -LiteralPath $ExtractedDir
    if ($children.Count -eq 1 -and $children[0].PSIsContainer) {
        return $children[0].FullName
    }

    return $ExtractedDir
}

function Read-Sha256FromFile {
    param([string]$Path)

    $content = Get-Content -LiteralPath $Path -Raw
    $token = $content.Split([char[]]@(' ', "`t", "`r", "`n"), [System.StringSplitOptions]::RemoveEmptyEntries)[0]
    return $token.ToLower()
}

$versionFilePath = Join-Path $RuntimeRoot 'version.json'
$updatesRoot = Join-Path $RuntimeRoot 'updates'
$releasesRoot = Join-Path $RuntimeRoot 'releases'
$currentPath = Join-Path $RuntimeRoot 'current'

$envMap = Import-RuntimeEnv -RuntimeRoot $RuntimeRoot
if (-not $Owner) { $Owner = Get-RuntimeEnvValue -EnvMap $envMap -Key 'UPDATE_OWNER' -DefaultValue '' }
if (-not $Repo) { $Repo = Get-RuntimeEnvValue -EnvMap $envMap -Key 'UPDATE_REPO' -DefaultValue '' }
if (-not $AssetName) { $AssetName = Get-RuntimeEnvValue -EnvMap $envMap -Key 'UPDATE_ASSET_NAME' -DefaultValue '' }

$backendPort = Get-RuntimeEnvValue -EnvMap $envMap -Key 'APP_PORT' -DefaultValue '47832'
$frontendPort = Get-RuntimeEnvValue -EnvMap $envMap -Key 'FRONTEND_PORT' -DefaultValue '5173'

$script:backendHealthUrl = "http://127.0.0.1:$backendPort/api/health"
$script:frontendHealthUrl = "http://127.0.0.1:$frontendPort"

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

foreach ($path in @($updatesRoot, $releasesRoot)) {
    if (-not (Test-Path -LiteralPath $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
    }
}

if (-not (Test-Path -LiteralPath $versionFilePath)) {
    throw "No existe version.json en $versionFilePath"
}

$currentState = Get-Content -LiteralPath $versionFilePath -Raw | ConvertFrom-Json

$headers = @{ Accept = 'application/vnd.github+json' }
$releaseUrl = "https://api.github.com/repos/$Owner/$Repo/releases/latest"
$latestRelease = Invoke-RestMethod -Uri $releaseUrl -Headers $headers -Method Get

$localVersion = Normalize-Version -Tag ([string]$currentState.version)
$remoteTag = [string]$latestRelease.tag_name
$remoteVersion = Normalize-Version -Tag $remoteTag

$hasUpdate = $false
try {
    $hasUpdate = ([version]$remoteVersion -gt [version]$localVersion)
} catch {
    $hasUpdate = ($remoteVersion -ne $localVersion)
}

if (-not $hasUpdate) {
    Write-Host "Sin actualizacion. Version actual: $($currentState.version)"
    exit 0
}

$assets = @($latestRelease.assets)
if ($assets.Count -eq 0) {
    throw 'Release sin assets descargables'
}

$selectedAsset = $null
if ($AssetName) {
    $selectedAsset = $assets | Where-Object { $_.name -eq $AssetName } | Select-Object -First 1
}

if ($null -eq $selectedAsset) {
    $selectedAsset = $assets | Where-Object { $_.name -like '*.zip' } | Select-Object -First 1
}

if ($null -eq $selectedAsset) {
    throw 'No se encontro un asset .zip para actualizar'
}

$versionUpdateDir = Join-Path $updatesRoot $remoteTag
if (-not (Test-Path -LiteralPath $versionUpdateDir)) {
    New-Item -ItemType Directory -Path $versionUpdateDir -Force | Out-Null
}

$zipPath = Join-Path $versionUpdateDir $selectedAsset.name
Invoke-WebRequest -Uri $selectedAsset.browser_download_url -OutFile $zipPath -UseBasicParsing

$expectedHash = ''
if ($selectedAsset.digest) {
    $expectedHash = ([string]$selectedAsset.digest -replace '^sha256:', '').ToLower()
} else {
    $shaAsset = $assets | Where-Object { $_.name -eq ($selectedAsset.name + '.sha256') } | Select-Object -First 1
    if ($null -ne $shaAsset) {
        $shaPath = Join-Path $versionUpdateDir $shaAsset.name
        Invoke-WebRequest -Uri $shaAsset.browser_download_url -OutFile $shaPath -UseBasicParsing
        $expectedHash = Read-Sha256FromFile -Path $shaPath
    }
}

if (-not $expectedHash) {
    throw 'No hay hash SHA-256 disponible (digest o .sha256). Actualizacion abortada.'
}

$actualHash = (Get-FileHash -LiteralPath $zipPath -Algorithm SHA256).Hash.ToLower()
if ($actualHash -ne $expectedHash) {
    throw "Hash invalido. Esperado=$expectedHash Actual=$actualHash"
}

$releaseExtractRoot = Join-Path $releasesRoot $remoteTag
if (Test-Path -LiteralPath $releaseExtractRoot) {
    Remove-Item -LiteralPath $releaseExtractRoot -Recurse -Force
}
New-Item -ItemType Directory -Path $releaseExtractRoot -Force | Out-Null

Expand-Archive -LiteralPath $zipPath -DestinationPath $releaseExtractRoot -Force
$payloadRoot = Resolve-PayloadRoot -ExtractedDir $releaseExtractRoot

if (-not (Test-Path -LiteralPath (Join-Path $payloadRoot 'backend'))) {
    throw 'El release no contiene carpeta backend'
}

if (-not (Test-Path -LiteralPath (Join-Path $payloadRoot 'frontend'))) {
    throw 'El release no contiene carpeta frontend'
}

$backupPath = Join-Path $releasesRoot ("rollback-" + (Get-Date -Format 'yyyyMMddHHmmss'))
$services = @($BackendServiceName, $FrontendServiceName)

Stop-Services -Names $services

$switched = $false
try {
    if (Test-Path -LiteralPath $currentPath) {
        Move-Item -LiteralPath $currentPath -Destination $backupPath -Force
    }

    Move-Item -LiteralPath $payloadRoot -Destination $currentPath -Force
    $switched = $true

    Start-Services -Names $services

    $healthy = Test-Health -Retries $HealthRetries
    if (-not $healthy) {
        throw 'Health-check fallido despues de actualizar'
    }

    $currentState.version = $remoteTag
    $currentState.updatedAt = (Get-Date).ToString('o')
    $currentState.previousVersion = $localVersion
    $currentState.previousReleasePath = $backupPath
    $currentState.currentReleasePath = $currentPath

    $stateJson = $currentState | ConvertTo-Json -Depth 10
    Set-Content -LiteralPath $versionFilePath -Encoding UTF8 -Value $stateJson

    Write-Host "Actualizacion aplicada correctamente: $remoteTag"
    exit 0
} catch {
    $errorMessage = $_.Exception.Message
    Write-Host "Fallo update: $errorMessage"

    Stop-Services -Names $services

    if ($switched -and (Test-Path -LiteralPath $backupPath)) {
        if (Test-Path -LiteralPath $currentPath) {
            Remove-Item -LiteralPath $currentPath -Recurse -Force
        }
        Move-Item -LiteralPath $backupPath -Destination $currentPath -Force
    }

    Start-Services -Names $services
    Write-Host 'Rollback aplicado'
    exit 1
}
