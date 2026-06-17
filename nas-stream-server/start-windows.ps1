$ErrorActionPreference = "Stop"

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
chcp 65001 > $null

$allowedPrefixBase64 = "XABcADEAOQAyAC4AMQA2ADgALgAwAC4AMQAwAFwAaABpAGcAaABzAHQAXwABxsHAANNcAEAAhci40ywAdNCwufi8LABczwm4uNJcAA/C/NNcAAi8IACYsKTCwbls0A=="
$allowedPrefix = [System.Text.Encoding]::Unicode.GetString([System.Convert]::FromBase64String($allowedPrefixBase64))

if (-not $env:HOST) {
  $env:HOST = "127.0.0.1"
}

if (-not $env:PORT) {
  $env:PORT = "8787"
}

if (-not $env:NAS_ALLOWED_PREFIX) {
  $env:NAS_ALLOWED_PREFIX = $allowedPrefix
}

Write-Host "NAS stream server starting..."
Write-Host "URL: http://$($env:HOST):$($env:PORT)"
Write-Host "Allowed folder: $($env:NAS_ALLOWED_PREFIX)"

node "$PSScriptRoot\server.js"
