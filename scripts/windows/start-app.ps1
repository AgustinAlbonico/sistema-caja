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

function Get-MapString {
  param(
    [hashtable]$Map,
    [Parameter(Mandatory = $true)][string]$Key,
    [string]$Default = ''
  )

  if ($null -eq $Map) {
    return $Default
  }

  if ($Map.ContainsKey($Key) -and -not [string]::IsNullOrWhiteSpace([string]$Map[$Key])) {
    return [string]$Map[$Key]
  }

  return $Default
}

function ConvertTo-IntOrDefault {
  param(
    [string]$Value,
    [int]$Default
  )

  $parsedValue = 0
  if (-not [string]::IsNullOrWhiteSpace($Value) -and [int]::TryParse($Value, [ref]$parsedValue)) {
    return $parsedValue
  }

  return $Default
}

function Write-BackendRuntimeConfig {
  param(
    [Parameter(Mandatory = $true)][string]$RuntimeRoot,
    [Parameter(Mandatory = $true)][hashtable]$LauncherConfig,
    [Parameter(Mandatory = $true)][hashtable]$BackendEnv,
    [Parameter(Mandatory = $true)][int]$BackendPort,
    [Parameter(Mandatory = $true)][int]$FrontendPort
  )

  $configDir = Join-Path $RuntimeRoot 'config'
  Ensure-Directory -Path $configDir

  $runtimeConfigPath = Join-Path $configDir 'config.json'
  $runtimeConfigSnapshotPath = Join-Path $configDir 'config.launcher.json'
  $backendHost = Get-MapString -Map $LauncherConfig -Key 'BACKEND_HOST' -Default '127.0.0.1'

  $dbHost = Get-MapString -Map $BackendEnv -Key 'DB_HOST' -Default '127.0.0.1'
  $dbPort = ConvertTo-IntOrDefault -Value (Get-MapString -Map $BackendEnv -Key 'DB_PORT' -Default '5432') -Default 5432
  $dbUser = Get-MapString -Map $BackendEnv -Key 'DB_USER' -Default 'postgres'
  $dbPassword = Get-MapString -Map $BackendEnv -Key 'DB_PASSWORD' -Default 'postgres'
  $dbName = Get-MapString -Map $BackendEnv -Key 'DB_NAME' -Default 'sistema_caja'

  $jwtSecret = Get-MapString -Map $BackendEnv -Key 'JWT_SECRET' -Default 'change-me'
  $jwtExpiration = Get-MapString -Map $BackendEnv -Key 'JWT_EXPIRATION' -Default '7d'
  $schemaVersion = Get-MapString -Map $LauncherConfig -Key 'SCHEMA_VERSION' -Default '1.0.0'
  $frontendUrl = "http://127.0.0.1:$FrontendPort"

  $runtimeConfig = @{
    port = $BackendPort
    host = $backendHost
    database = @{
      host = $dbHost
      port = $dbPort
      username = $dbUser
      password = $dbPassword
      database = $dbName
    }
    jwt = @{
      secret = $jwtSecret
      expiration = $jwtExpiration
    }
    schemaVersion = $schemaVersion
    frontendUrl = $frontendUrl
  }

  $runtimeConfigJson = $runtimeConfig | ConvertTo-Json -Depth 6
  Set-Content -LiteralPath $runtimeConfigPath -Value $runtimeConfigJson -Encoding UTF8
  Set-Content -LiteralPath $runtimeConfigSnapshotPath -Value $runtimeConfigJson -Encoding UTF8

  $env:APP_CONFIG_PATH = $runtimeConfigPath
  $env:SISTEMA_CAJA_RUNTIME_ROOT = $RuntimeRoot

  Write-LauncherLog -Message "Config runtime backend sincronizada en $runtimeConfigPath"
  Write-LauncherLog -Message "Snapshot de config runtime en $runtimeConfigSnapshotPath"
  Write-LauncherLog -Message "Backend host/port forzados a ${backendHost}:$BackendPort (DB: ${dbHost}:$dbPort)"
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
    [Parameter(Mandatory = $true)][string]$ServiceName,
    [System.Diagnostics.Process]$ObservedProcess,
    [string]$StdErrLogPath = ''
  )

  $deadline = (Get-Date).AddSeconds($TimeoutSeconds)
  while ((Get-Date) -lt $deadline) {
    if (Test-PortListening -Port $Port) {
      Write-LauncherLog -Message "$ServiceName disponible en 127.0.0.1:$Port"
      return $true
    }

    if ($null -ne $ObservedProcess -and $ObservedProcess.HasExited) {
      Write-LauncherLog -Level 'ERROR' -Message "$ServiceName finalizo antes de abrir puerto (exit code $($ObservedProcess.ExitCode))."

      if (-not [string]::IsNullOrWhiteSpace($StdErrLogPath) -and (Test-Path -LiteralPath $StdErrLogPath)) {
        $stderrTail = Get-Content -LiteralPath $StdErrLogPath -Tail 6 -ErrorAction SilentlyContinue
        foreach ($line in $stderrTail) {
          if (-not [string]::IsNullOrWhiteSpace($line)) {
            Write-LauncherLog -Level 'ERROR' -Message "$ServiceName stderr> $line"
          }
        }
      }

      return $false
    }

    Start-Sleep -Milliseconds 500
  }

  return $false
}

function Resolve-Runner {
  if (Get-Command npm.cmd -ErrorAction SilentlyContinue) {
    return 'npm'
  }

  if (Get-Command npm -ErrorAction SilentlyContinue) {
    return 'npm'
  }

  if (Get-Command bun -ErrorAction SilentlyContinue) {
    return 'bun'
  }

  throw 'No se encontro npm ni bun instalados en PATH.'
}

function Get-RunnerProcessSpec {
  param(
    [Parameter(Mandatory = $true)][string]$Runner,
    [Parameter(Mandatory = $true)][string[]]$RunArguments
  )

  if ($Runner -eq 'npm') {
    return @{
      FilePath = 'cmd.exe'
      Arguments = @('/c', 'npm.cmd') + $RunArguments
    }
  }

  return @{
    FilePath = 'bun'
    Arguments = $RunArguments
  }
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

  $processSpec = Get-RunnerProcessSpec -Runner $Runner -RunArguments $runArguments
  $process = Start-Process -FilePath $processSpec.FilePath -ArgumentList $processSpec.Arguments -WorkingDirectory $WorkingDirectory -WindowStyle Minimized -PassThru -Wait
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

  $stdOutLogPath = Join-Path $script:LogsDir ("{0}-stdout.log" -f $Name.ToLowerInvariant())
  $stdErrLogPath = Join-Path $script:LogsDir ("{0}-stderr.log" -f $Name.ToLowerInvariant())
  $processSpec = Get-RunnerProcessSpec -Runner $Runner -RunArguments $runArguments
  $serviceProcess = Start-Process -FilePath $processSpec.FilePath -ArgumentList $processSpec.Arguments -WorkingDirectory $WorkingDirectory -WindowStyle Minimized -PassThru -RedirectStandardOutput $stdOutLogPath -RedirectStandardError $stdErrLogPath

  if (Wait-Port -Port $Port -TimeoutSeconds $TimeoutSeconds -ServiceName $Name -ObservedProcess $serviceProcess -StdErrLogPath $stdErrLogPath) {
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
  $script:LogsDir = $logsDir

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
    Write-LauncherLog -Message "backend/.env define PORT=$($backendEnv['PORT']); launcher sincronizara backend con BACKEND_PORT=$BackendPort."
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

  Write-BackendRuntimeConfig -RuntimeRoot $runtimeRoot -LauncherConfig $launcherConfig -BackendEnv $backendEnv -BackendPort $BackendPort -FrontendPort $FrontendPort

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
