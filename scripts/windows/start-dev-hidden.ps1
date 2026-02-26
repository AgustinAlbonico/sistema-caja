param(
    [string]$ProjectRoot = '',
    [int]$TimeoutSeconds = 120,
    [switch]$NoOpenBrowser
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

function Import-EnvFile {
    param([string]$EnvPath)

    $values = @{}
    if (-not (Test-Path -LiteralPath $EnvPath)) {
        return $values
    }

    foreach ($line in (Get-Content -LiteralPath $EnvPath)) {
        $trimmed = $line.Trim()
        if (-not $trimmed -or $trimmed.StartsWith('#')) {
            continue
        }

        $idx = $trimmed.IndexOf('=')
        if ($idx -lt 1) {
            continue
        }

        $key = $trimmed.Substring(0, $idx).Trim()
        $value = $trimmed.Substring($idx + 1).Trim()
        $values[$key] = $value
    }

    return $values
}

function Get-EnvValue {
    param(
        [hashtable]$EnvMap,
        [string]$Key,
        [string]$DefaultValue
    )

    if ($EnvMap.ContainsKey($Key) -and -not [string]::IsNullOrWhiteSpace($EnvMap[$Key])) {
        return [string]$EnvMap[$Key]
    }

    return $DefaultValue
}

function Test-PortListening {
    param([int]$Port)

    return [bool](Test-NetConnection -ComputerName 127.0.0.1 -Port $Port -InformationLevel Quiet -WarningAction SilentlyContinue)
}

function Wait-Port {
    param(
        [int]$Port,
        [string]$Name,
        [int]$Timeout
    )

    $deadline = (Get-Date).AddSeconds($Timeout)
    while ((Get-Date) -lt $deadline) {
        if (Test-PortListening -Port $Port) {
            return
        }

        Start-Sleep -Seconds 1
    }

    throw "Timeout esperando $Name en 127.0.0.1:$Port"
}

function Get-FirstListeningPort {
    param([int[]]$Ports)

    foreach ($port in $Ports) {
        if (Test-PortListening -Port $port) {
            return $port
        }
    }

    return $null
}

function Wait-AnyPort {
    param(
        [int[]]$Ports,
        [string]$Name,
        [int]$Timeout
    )

    $deadline = (Get-Date).AddSeconds($Timeout)
    while ((Get-Date) -lt $deadline) {
        $listeningPort = Get-FirstListeningPort -Ports $Ports
        if ($null -ne $listeningPort) {
            return [int]$listeningPort
        }

        Start-Sleep -Seconds 1
    }

    throw "Timeout esperando $Name en puertos: $($Ports -join ', ')"
}

function Resolve-FrontendPort {
    param([hashtable]$EnvMap)

    $frontendUrl = Get-EnvValue -EnvMap $EnvMap -Key 'FRONTEND_URL' -DefaultValue ''
    if ([string]::IsNullOrWhiteSpace($frontendUrl)) {
        return 5173
    }

    try {
        $uri = [Uri]$frontendUrl
        if ($uri.Port -gt 0) {
            return $uri.Port
        }
    } catch {
        Write-Verbose "No se pudo parsear FRONTEND_URL '$frontendUrl'. Se usara 5173."
    }

    return 5173
}

function Start-HiddenRunner {
    param(
        [string]$RunnerPath,
        [string]$WorkingDirectory,
        [string]$ScriptName,
        [string]$StdOutPath,
        [string]$StdErrPath
    )

    $command = "Set-Location -LiteralPath '$WorkingDirectory'; & '$RunnerPath' run $ScriptName"
    $process = Start-Process -FilePath 'powershell.exe' `
        -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', $command) `
        -WorkingDirectory $WorkingDirectory `
        -WindowStyle Hidden `
        -PassThru `
        -RedirectStandardOutput $StdOutPath `
        -RedirectStandardError $StdErrPath

    return $process
}

$rootPath = Resolve-ProjectRoot -ProvidedRoot $ProjectRoot
$backendPath = Join-Path $rootPath 'backend'
$frontendPath = Join-Path $rootPath 'frontend'

if (-not (Test-Path -LiteralPath $backendPath)) {
    throw "No existe backend en $backendPath"
}

if (-not (Test-Path -LiteralPath $frontendPath)) {
    throw "No existe frontend en $frontendPath"
}

$bun = Get-Command bun -ErrorAction SilentlyContinue
$runner = Get-Command npm -ErrorAction SilentlyContinue

if ($null -ne $bun) {
    $runner = $bun
}

if ($null -eq $runner) {
    throw 'No se encontro bun ni npm en PATH.'
}

$backendEnv = Import-EnvFile -EnvPath (Join-Path $backendPath '.env')
$backendPortRaw = Get-EnvValue -EnvMap $backendEnv -Key 'PORT' -DefaultValue '3000'
$backendPort = 3000
[void][int]::TryParse($backendPortRaw, [ref]$backendPort)
$frontendPort = Resolve-FrontendPort -EnvMap $backendEnv

$runtimeDir = Join-Path $rootPath '.runtime'
$logsDir = Join-Path $runtimeDir 'logs'
$pidsFile = Join-Path $runtimeDir 'dev-hidden-pids.json'

if (-not (Test-Path -LiteralPath $runtimeDir)) {
    New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null
}

if (-not (Test-Path -LiteralPath $logsDir)) {
    New-Item -ItemType Directory -Path $logsDir -Force | Out-Null
}

$backendOut = Join-Path $logsDir 'backend-dev-hidden.log'
$backendErr = Join-Path $logsDir 'backend-dev-hidden-error.log'
$frontendOut = Join-Path $logsDir 'frontend-dev-hidden.log'
$frontendErr = Join-Path $logsDir 'frontend-dev-hidden-error.log'

$backendCandidatePorts = @($backendPort, 47832, 3000) | Select-Object -Unique
$frontendCandidatePorts = @($frontendPort, 5173) | Select-Object -Unique

$backendAlreadyPort = Get-FirstListeningPort -Ports $backendCandidatePorts
$frontendAlreadyPort = Get-FirstListeningPort -Ports $frontendCandidatePorts

$backendAlreadyRunning = $null -ne $backendAlreadyPort
$frontendAlreadyRunning = $null -ne $frontendAlreadyPort

$backendProcess = $null
if (-not $backendAlreadyRunning) {
    $backendProcess = Start-HiddenRunner `
        -RunnerPath $runner.Source `
        -WorkingDirectory $backendPath `
        -ScriptName 'start:dev' `
        -StdOutPath $backendOut `
        -StdErrPath $backendErr
}

$frontendProcess = $null
if (-not $frontendAlreadyRunning) {
    $frontendProcess = Start-HiddenRunner `
        -RunnerPath $runner.Source `
        -WorkingDirectory $frontendPath `
        -ScriptName 'dev' `
        -StdOutPath $frontendOut `
        -StdErrPath $frontendErr
}

try {
    if ($backendAlreadyRunning) {
        $backendPort = [int]$backendAlreadyPort
    } else {
        $backendPort = Wait-AnyPort -Ports $backendCandidatePorts -Name 'Backend' -Timeout $TimeoutSeconds
    }

    if ($frontendAlreadyRunning) {
        $frontendPort = [int]$frontendAlreadyPort
    } else {
        $frontendPort = Wait-AnyPort -Ports $frontendCandidatePorts -Name 'Frontend' -Timeout $TimeoutSeconds
    }
} catch {
    if ($null -ne $backendProcess) {
        Stop-Process -Id $backendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    if ($null -ne $frontendProcess) {
        Stop-Process -Id $frontendProcess.Id -Force -ErrorAction SilentlyContinue
    }
    throw
}

$pids = [ordered]@{
    backendPid = if ($null -ne $backendProcess) { $backendProcess.Id } else { $null }
    frontendPid = if ($null -ne $frontendProcess) { $frontendProcess.Id } else { $null }
    backendPort = $backendPort
    frontendPort = $frontendPort
    startedAt = (Get-Date).ToString('o')
}
$pids | ConvertTo-Json | Set-Content -LiteralPath $pidsFile -Encoding UTF8

if (-not $NoOpenBrowser) {
    Start-Process "http://127.0.0.1:$frontendPort" | Out-Null
}
