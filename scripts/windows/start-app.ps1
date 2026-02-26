param(
  [int]$BackendPort = 47832,
  [int]$FrontendPort = 5173,
  [int]$StartTimeoutSeconds = 60,
  [string]$AppUrl
)

$ErrorActionPreference = 'Stop'

function Get-RepoRoot {
  return (Resolve-Path (Join-Path $PSScriptRoot '..\..')).Path
}

function Ensure-Directory {
  param([Parameter(Mandatory = $true)][string]$Path)

  if (-not (Test-Path -LiteralPath $Path)) {
    New-Item -Path $Path -ItemType Directory -Force | Out-Null
  }
}

function Write-LauncherLog {
  param(
    [Parameter(Mandatory = $true)][string]$Message,
    [ValidateSet('INFO', 'WARN', 'ERROR')][string]$Level = 'INFO'
  )

  $line = "[{0}] [{1}] {2}" -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Level, $Message
  Add-Content -Path $script:LogFile -Value $line
  Write-Host $line
}

function Read-KeyValueEnvFile {
  param([Parameter(Mandatory = $true)][string]$Path)

  $result = @{}
  if (-not (Test-Path -LiteralPath $Path)) {
    return $result
  }

  foreach ($rawLine in Get-Content -LiteralPath $Path) {
    $line = $rawLine.Trim()
    if ($line.Length -eq 0 -or $line.StartsWith('#')) {
      continue
    }

    $separatorIndex = $line.IndexOf('=')
    if ($separatorIndex -le 0) {
      continue
    }

    $key = $line.Substring(0, $separatorIndex).Trim()
    $value = $line.Substring($separatorIndex + 1).Trim().Trim('"')
    if ($key.Length -gt 0) {
      $result[$key] = $value
    }
  }

  return $result
}

function Resolve-Port {
  param(
    [hashtable]$LauncherConfig,
    [hashtable]$BackendEnv,
    [int]$Current,
    [string]$LauncherKey,
    [string]$BackendKey
  )

  if ($LauncherConfig.ContainsKey($LauncherKey)) {
    return [int]$LauncherConfig[$LauncherKey]
  }

  return $Current
}

function Test-PortListening {
  param([Parameter(Mandatory = $true)][int]$Port)

  try {
    $conn = Get-NetTCPConnection -State Listen -LocalPort $Port -ErrorAction Stop
    return $null -ne $conn
  } catch {
    try {
      $client = [System.Net.Sockets.TcpClient]::new()
      $task = $client.ConnectAsync('127.0.0.1', $Port)
      $connected = $task.Wait(400) -and $client.Connected
      $client.Close()
      $client.Dispose()
      return $connected
    } catch {
      return $false
    }
  }
}

function Wait-Port {
  param(
    [Parameter(Mandatory = $true)][int]$Port,
    [Parameter(Mandatory = $true)][int]$TimeoutSeconds,
    [Parameter(Mandatory = $true)][string]$ServiceName
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-PortListening -Port $Port) {
      Write-LauncherLog -Message "$ServiceName disponible en 127.0.0.1:$Port"
      return $true
    }

    Start-Sleep -Milliseconds 500
  }

  return $false
}

function Resolve-Runner {
  if (Get-Command npm -ErrorAction SilentlyContinue) {
    return 'npm'
  }

  if (Get-Command bun -ErrorAction SilentlyContinue) {
    return 'bun'
  }

  throw 'No se encontro npm ni bun instalados en PATH.'
}

function ConvertTo-Bool {
  param(
    [Parameter(Mandatory = $true)][string]$Value,
    [bool]$Default = $false
  )

  $normalized = $Value.Trim().ToLowerInvariant()
  if (@('1', 'true', 'yes', 'y', 'on', 'si', 's') -contains $normalized) {
    return $true
  }

  if (@('0', 'false', 'no', 'n', 'off') -contains $normalized) {
    return $false
  }

  return $Default
}

function Get-RunArguments {
  param(
    [Parameter(Mandatory = $true)][string]$ScriptName,
    [string[]]$ScriptArgs = @()
  )

  if ($ScriptArgs.Count -gt 0) {
    return @('run', $ScriptName, '--') + $ScriptArgs
  }

  return @('run', $ScriptName)
}

function Invoke-RunAndWait {
  param(
    [Parameter(Mandatory = $true)][string]$Runner,
    [Parameter(Mandatory = $true)][string]$WorkingDirectory,
    [Parameter(Mandatory = $true)][string]$ScriptName,
    [string[]]$ScriptArgs = @(),
    [Parameter(Mandatory = $true)][string]$TaskName
  )

  $runArguments = Get-RunArguments -ScriptName $ScriptName -ScriptArgs $ScriptArgs
  Write-LauncherLog -Message "Ejecutando $TaskName con '$Runner $($runArguments -join ' ')'"

  $process = Start-Process -FilePath $Runner -ArgumentList $runArguments -WorkingDirectory $WorkingDirectory -WindowStyle Minimized -PassThru -Wait
  if ($process.ExitCode -ne 0) {
    throw "Fallo '$TaskName' (exit code $($process.ExitCode))."
  }
}

function Start-ServiceIfNeeded {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][int]$Port,
    [Parameter(Mandatory = $true)][string]$Runner,
    [Parameter(Mandatory = $true)][string]$WorkingDirectory,
    [Parameter(Mandatory = $true)][string]$Command,
    [string[]]$CommandArgs = @(),
    [Parameter(Mandatory = $true)][int]$TimeoutSeconds
  )

  if (Test-PortListening -Port $Port) {
    Write-LauncherLog -Message "$Name ya estaba corriendo en 127.0.0.1:$Port"
    return $true
  }

  $runArguments = Get-RunArguments -ScriptName $Command -ScriptArgs $CommandArgs
  Write-LauncherLog -Message "Iniciando $Name con '$Runner $($runArguments -join ' ')' desde $WorkingDirectory"
  Start-Process -FilePath $Runner -ArgumentList $runArguments -WorkingDirectory $WorkingDirectory -WindowStyle Minimized | Out-Null

  if (Wait-Port -Port $Port -TimeoutSeconds $TimeoutSeconds -ServiceName $Name) {
    return $true
  }

  Write-LauncherLog -Level 'ERROR' -Message "Timeout esperando a $Name en puerto $Port"
  return $false
}

function Open-AppInBrowser {
  param([Parameter(Mandatory = $true)][string]$Url)

  Write-LauncherLog -Message "Abriendo app en navegador: $Url"
  Start-Process -FilePath $Url | Out-Null
}

try {
  $repoRoot = Get-RepoRoot
  $runtimeRoot = 'C:\SistemaCajaEstudio'
  $logsDir = Join-Path $runtimeRoot 'logs'
  Ensure-Directory -Path $logsDir

  $script:LogFile = Join-Path $logsDir 'launcher.log'
  Write-LauncherLog -Message '--- Inicio de launcher ---'

  $backendDir = Join-Path $repoRoot 'backend'
  $frontendDir = Join-Path $repoRoot 'frontend'

  if (-not (Test-Path -LiteralPath $backendDir)) {
    throw "No se encontro backend en $backendDir"
  }

  if (-not (Test-Path -LiteralPath $frontendDir)) {
    throw "No se encontro frontend en $frontendDir"
  }

  $launcherEnvPath = Join-Path $PSScriptRoot 'launcher.env'
  $backendEnvPath = Join-Path $backendDir '.env'

  $launcherConfig = Read-KeyValueEnvFile -Path $launcherEnvPath
  $backendEnv = Read-KeyValueEnvFile -Path $backendEnvPath

  $BackendPort = Resolve-Port -LauncherConfig $launcherConfig -BackendEnv $backendEnv -Current $BackendPort -LauncherKey 'BACKEND_PORT' -BackendKey 'PORT'
  $FrontendPort = Resolve-Port -LauncherConfig $launcherConfig -BackendEnv $backendEnv -Current $FrontendPort -LauncherKey 'FRONTEND_PORT' -BackendKey 'FRONTEND_PORT'

  if ($backendEnv.ContainsKey('PORT')) {
    Write-LauncherLog -Level 'WARN' -Message "backend/.env define PORT=$($backendEnv['PORT']); launcher usa BACKEND_PORT=$BackendPort. Ajuste scripts/windows/launcher.env si necesita otro puerto."
  }

  if ([string]::IsNullOrWhiteSpace($AppUrl)) {
    if ($launcherConfig.ContainsKey('APP_URL')) {
      $AppUrl = $launcherConfig['APP_URL']
    } else {
      $AppUrl = "http://127.0.0.1:$FrontendPort/login"
    }
  }

  if ($launcherConfig.ContainsKey('START_TIMEOUT_SECONDS')) {
    $StartTimeoutSeconds = [int]$launcherConfig['START_TIMEOUT_SECONDS']
  }

  $requiredDbKeys = @('DB_HOST', 'DB_PORT', 'DB_USER', 'DB_PASSWORD', 'DB_NAME')
  foreach ($key in $requiredDbKeys) {
    if (-not $backendEnv.ContainsKey($key) -or [string]::IsNullOrWhiteSpace([string]$backendEnv[$key])) {
      Write-LauncherLog -Level 'WARN' -Message "Falta variable $key en backend/.env"
    }
  }

  $runner = Resolve-Runner
  Write-LauncherLog -Message "Runner detectado: $runner"
  Write-LauncherLog -Message "BackendPort=$BackendPort FrontendPort=$FrontendPort Timeout=${StartTimeoutSeconds}s"

  $appMode = 'production'
  if ($launcherConfig.ContainsKey('APP_MODE') -and -not [string]::IsNullOrWhiteSpace([string]$launcherConfig['APP_MODE'])) {
    $appMode = ([string]$launcherConfig['APP_MODE']).Trim().ToLowerInvariant()
  }

  if ($appMode -notin @('production', 'development')) {
    Write-LauncherLog -Level 'WARN' -Message "APP_MODE='$appMode' invalido; se usa 'production'."
    $appMode = 'production'
  }

  $autoBuildOnMissingDist = $true
  if ($launcherConfig.ContainsKey('AUTO_BUILD_ON_MISSING_DIST')) {
    $autoBuildOnMissingDist = ConvertTo-Bool -Value ([string]$launcherConfig['AUTO_BUILD_ON_MISSING_DIST']) -Default $true
  }

  $backendCommand = 'start:dev'
  $backendCommandArgs = @()
  $frontendCommand = 'dev'
  $frontendCommandArgs = @()

  if ($appMode -eq 'production') {
    $backendDistPath = Join-Path $backendDir 'dist\main.js'
    $frontendDistPath = Join-Path $frontendDir 'dist\index.html'

    if ((-not (Test-Path -LiteralPath $backendDistPath)) -or (-not (Test-Path -LiteralPath $frontendDistPath))) {
      if ($autoBuildOnMissingDist) {
        Write-LauncherLog -Level 'WARN' -Message 'No se encontro build de produccion; se ejecuta build inicial (una sola vez).'
        Invoke-RunAndWait -Runner $runner -WorkingDirectory $backendDir -ScriptName 'build' -TaskName 'build backend'
        Invoke-RunAndWait -Runner $runner -WorkingDirectory $frontendDir -ScriptName 'build' -TaskName 'build frontend'
      } else {
        Write-LauncherLog -Level 'WARN' -Message 'No se encontro build y AUTO_BUILD_ON_MISSING_DIST=false. Se usa modo development.'
      }
    }

    if ((Test-Path -LiteralPath $backendDistPath) -and (Test-Path -LiteralPath $frontendDistPath)) {
      $backendCommand = 'start:prod'
      $frontendCommand = 'preview'
      $frontendCommandArgs = @('--host', '127.0.0.1', '--port', "$FrontendPort", '--strictPort')
      Write-LauncherLog -Message 'Modo production activo: start:prod + preview.'
    } else {
      $appMode = 'development'
      Write-LauncherLog -Level 'WARN' -Message 'Sin build disponible; fallback a modo development (mas lento).'
    }
  }

  if ($appMode -eq 'development') {
    Write-LauncherLog -Message 'Modo development activo: start:dev + dev.'
  }

  $backendAlreadyRunning = Test-PortListening -Port $BackendPort
  $frontendAlreadyRunning = Test-PortListening -Port $FrontendPort

  if ($backendAlreadyRunning -and $frontendAlreadyRunning) {
    Write-LauncherLog -Message 'Backend y frontend ya estaban corriendo; solo se abre la app.'
    Open-AppInBrowser -Url $AppUrl
    exit 0
  }

  if (-not (Start-ServiceIfNeeded -Name 'Backend' -Port $BackendPort -Runner $runner -WorkingDirectory $backendDir -Command $backendCommand -CommandArgs $backendCommandArgs -TimeoutSeconds $StartTimeoutSeconds)) {
    throw "No se pudo iniciar backend en 127.0.0.1:$BackendPort"
  }

  if (-not (Start-ServiceIfNeeded -Name 'Frontend' -Port $FrontendPort -Runner $runner -WorkingDirectory $frontendDir -Command $frontendCommand -CommandArgs $frontendCommandArgs -TimeoutSeconds $StartTimeoutSeconds)) {
    throw "No se pudo iniciar frontend en 127.0.0.1:$FrontendPort"
  }

  Open-AppInBrowser -Url $AppUrl
  Write-LauncherLog -Message 'Flujo completado correctamente.'
  exit 0
} catch {
  Write-LauncherLog -Level 'ERROR' -Message $_.Exception.Message
  exit 1
}
