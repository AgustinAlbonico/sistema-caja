Set-StrictMode -Version Latest

function Get-RuntimeEnvPath {
    param([Parameter(Mandatory = $true)][string]$RuntimeRoot)

    return Join-Path $RuntimeRoot 'config\.env'
}

function Ensure-RuntimeEnvTemplate {
    param([Parameter(Mandatory = $true)][string]$RuntimeRoot)

    $configDir = Join-Path $RuntimeRoot 'config'
    if (-not (Test-Path -LiteralPath $configDir)) {
        New-Item -ItemType Directory -Path $configDir -Force | Out-Null
    }

    $envPath = Get-RuntimeEnvPath -RuntimeRoot $RuntimeRoot
    if (Test-Path -LiteralPath $envPath) {
        return $envPath
    }

    $lines = @(
        '# Configuracion principal del runtime',
        'APP_HOST=127.0.0.1',
        'APP_PORT=47832',
        'FRONTEND_PORT=5173',
        'FRONTEND_URL=http://127.0.0.1:5173',
        '',
        '# Base de datos (completar manualmente)',
        'DB_HOST=',
        'DB_PORT=5432',
        'DB_USER=',
        'DB_PASSWORD=',
        'DB_NAME=',
        '',
        '# JWT (completar manualmente)',
        'JWT_SECRET=',
        'JWT_EXPIRATION=24h',
        '',
        '# Updater GitHub Releases',
        'UPDATE_OWNER=',
        'UPDATE_REPO=',
        'UPDATE_ASSET_NAME=',
        'UPDATE_CHANNEL=stable'
    )

    Set-Content -LiteralPath $envPath -Encoding UTF8 -Value $lines
    return $envPath
}

function Import-RuntimeEnv {
    param([Parameter(Mandatory = $true)][string]$RuntimeRoot)

    $envPath = Ensure-RuntimeEnvTemplate -RuntimeRoot $RuntimeRoot
    $content = Get-Content -LiteralPath $envPath
    $values = @{}

    foreach ($line in $content) {
        $trimmed = $line.Trim()
        if (-not $trimmed) {
            continue
        }

        if ($trimmed.StartsWith('#')) {
            continue
        }

        $idx = $trimmed.IndexOf('=')
        if ($idx -lt 1) {
            continue
        }

        $key = $trimmed.Substring(0, $idx).Trim()
        $rawValue = $trimmed.Substring($idx + 1)
        $value = $rawValue.Trim()

        if (
            $value.Length -ge 2 -and
            (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'")))
        ) {
            $value = $value.Substring(1, $value.Length - 2)
        }

        $values[$key] = $value
    }

    return $values
}

function Get-RuntimeEnvValue {
    param(
        [Parameter(Mandatory = $true)][hashtable]$EnvMap,
        [Parameter(Mandatory = $true)][string]$Key,
        [string]$DefaultValue = ''
    )

    if ($EnvMap.ContainsKey($Key)) {
        return [string]$EnvMap[$Key]
    }

    return $DefaultValue
}

function Get-RuntimeEnvBool {
    param(
        [Parameter(Mandatory = $true)][hashtable]$EnvMap,
        [Parameter(Mandatory = $true)][string]$Key,
        [bool]$DefaultValue
    )

    $value = Get-RuntimeEnvValue -EnvMap $EnvMap -Key $Key -DefaultValue ''
    if (-not $value) {
        return $DefaultValue
    }

    switch ($value.ToLower()) {
        '1' { return $true }
        'true' { return $true }
        'yes' { return $true }
        'y' { return $true }
        'on' { return $true }
        '0' { return $false }
        'false' { return $false }
        'no' { return $false }
        'n' { return $false }
        'off' { return $false }
        default { return $DefaultValue }
    }
}
