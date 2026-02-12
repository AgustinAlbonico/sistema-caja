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
