Set-StrictMode -Version Latest

function Resolve-NodeExecutable {
    param([string]$RuntimeRoot)

    $candidate = Join-Path $RuntimeRoot 'current\tools\node\node.exe'
    if (Test-Path -LiteralPath $candidate) {
        return $candidate
    }

    $command = Get-Command node -ErrorAction SilentlyContinue
    if ($null -ne $command -and $command.Source) {
        return $command.Source
    }

    throw 'No se encontro node.exe. Instala Node o incluye runtime\current\tools\node\node.exe.'
}

function Resolve-NssmExecutable {
    param(
        [string]$RuntimeRoot,
        [string]$NssmPath
    )

    if ($NssmPath) {
        if (Test-Path -LiteralPath $NssmPath) {
            return $NssmPath
        }

        throw "No se encontro nssm.exe en la ruta indicada: $NssmPath"
    }

    $defaultNssm = Join-Path $RuntimeRoot 'scripts\tools\nssm.exe'
    if (Test-Path -LiteralPath $defaultNssm) {
        return $defaultNssm
    }

    $command = Get-Command nssm -ErrorAction SilentlyContinue
    if ($null -ne $command -and $command.Source) {
        return $command.Source
    }

    throw 'No se encontro nssm.exe. Copia nssm.exe a runtime\scripts\tools\ o agrega nssm al PATH.'
}

function Resolve-NssmServiceBinaryPath {
    param(
        [Parameter(Mandatory = $true)][string]$RuntimeRoot,
        [Parameter(Mandatory = $true)][string]$NssmExe
    )

    $sourcePath = $NssmExe
    $item = Get-Item -LiteralPath $NssmExe -ErrorAction SilentlyContinue
    if ($null -ne $item -and $item.LinkType -eq 'SymbolicLink' -and $item.Target) {
        $targetPath = if ($item.Target -is [array]) { [string]$item.Target[0] } else { [string]$item.Target }
        if ($targetPath) {
            $sourcePath = $targetPath
        }
    }

    if ($sourcePath -like 'C:\Users\*') {
        $toolsDir = Join-Path $RuntimeRoot 'scripts\tools'
        if (-not (Test-Path -LiteralPath $toolsDir)) {
            New-Item -ItemType Directory -Path $toolsDir -Force | Out-Null
        }

        $runtimeNssm = Join-Path $toolsDir 'nssm.exe'
        Copy-Item -LiteralPath $sourcePath -Destination $runtimeNssm -Force
        return $runtimeNssm
    }

    return $NssmExe
}

function Invoke-Nssm {
    param(
        [Parameter(Mandatory = $true)][string]$NssmExe,
        [Parameter(Mandatory = $true)][string[]]$Arguments
    )

    & $NssmExe @Arguments
    if ($LASTEXITCODE -ne 0) {
        $argsText = $Arguments -join ' '
        throw "nssm fallo con codigo $LASTEXITCODE al ejecutar: $argsText"
    }
}
