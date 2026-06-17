# NAS Stream Server

This helper lets the GitHub Pages board play a Windows/NAS path such as:

```text
\\192.168.0.10\highst_영상팀\@종편,클린본,콜렉트\숏폼\밈 나스링크\260616 무영등트랜지션 3차 완성본.mp4
```

Browsers cannot play SMB paths directly from a web page. This helper reads the SMB file and exposes it as an HTTP video stream with byte-range support.

## Windows Start

```powershell
cd "C:\Users\alpha\Desktop\WOOTAN\@Programming\260615 meme-approval-board\nas-stream-server"
.\start-windows.ps1
```

Or double-click `start-windows.cmd`.

The start script stores the Korean NAS folder in an encoded form so older Windows PowerShell sessions do not break the path.

The board defaults to:

```text
http://127.0.0.1:8787
```

In the board settings, `NAS 스트리밍 주소` can be changed if this helper is hosted elsewhere.

If port `8787` is already in use, start it on a temporary port:

```powershell
$env:PORT="8788"
.\start-windows.ps1
```

## Manual Start

```powershell
$env:HOST="127.0.0.1"
$env:PORT="8787"
$env:NAS_ALLOWED_PREFIX="\\192.168.0.10\highst_영상팀\@종편,클린본,콜렉트\숏폼\밈 나스링크"
node .\server.js
```

## Endpoints

```text
GET /health
GET /stream?path=<encoded NAS path>
GET /probe?path=<encoded NAS path>
```

Only files under `NAS_ALLOWED_PREFIX` are served. `/probe` checks file access and returns metadata without streaming the video body.
