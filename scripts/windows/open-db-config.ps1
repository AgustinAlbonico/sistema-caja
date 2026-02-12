param([string]$RuntimeRoot = 'C:\SistemaCajaEstudio')

$ErrorActionPreference = 'Stop'

. "$PSScriptRoot\runtime-env.ps1"

$envPath = Ensure-RuntimeEnvTemplate -RuntimeRoot $RuntimeRoot

Start-Process notepad.exe -ArgumentList "`"$envPath`"" | Out-Null
