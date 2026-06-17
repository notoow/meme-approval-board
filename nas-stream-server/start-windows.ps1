$ErrorActionPreference = "Stop"

$env:HOST = "127.0.0.1"
$env:PORT = "8787"
$env:NAS_ALLOWED_PREFIX = "\\192.168.0.10\highst_영상팀\@종편,클린본,콜렉트\숏폼\밈 나스링크"

Write-Host "NAS stream server starting..."
Write-Host "URL: http://$($env:HOST):$($env:PORT)"
Write-Host "Allowed folder: $($env:NAS_ALLOWED_PREFIX)"

node "$PSScriptRoot\server.js"
