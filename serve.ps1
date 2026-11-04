# wuyu local static preview server (zero dependency: built-in Windows PowerShell)
# Usage:
#   powershell -NoProfile -ExecutionPolicy Bypass -File serve.ps1 [-OpenPath /prompt/] [-NoAutoOpen]
param(
  [string]$OpenPath = "/",
  [switch]$NoAutoOpen,
  [int]$Port = 0
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
if (-not $root) { $root = (Get-Location).Path }

function Get-FreePort([int]$start) {
  for ($p = $start; $p -lt ($start + 30); $p++) {
    try {
      $l = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $p)
      $l.Start(); $l.Stop()
      return $p
    } catch { }
  }
  return $null
}

if ($Port -gt 0) {
  try {
    $t = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Loopback, $Port)
    $t.Start(); $t.Stop()
    $port = $Port
  } catch { Write-Host ("Port " + $Port + " unavailable."); exit 1 }
} else {
  $port = Get-FreePort 8099
  if (-not $port) { Write-Host "No free local port found."; exit 1 }
}

$mime = @{
  ".html"  = "text/html; charset=utf-8"
  ".css"   = "text/css; charset=utf-8"
  ".js"    = "text/javascript; charset=utf-8"
  ".mjs"   = "text/javascript; charset=utf-8"
  ".json"  = "application/json; charset=utf-8"
  ".svg"   = "image/svg+xml"
  ".png"   = "image/png"
  ".jpg"   = "image/jpeg"
  ".jpeg"  = "image/jpeg"
  ".gif"   = "image/gif"
  ".webp"  = "image/webp"
  ".woff2" = "font/woff2"
  ".woff"  = "font/woff"
  ".ttf"   = "font/ttf"
  ".ico"   = "image/x-icon"
  ".md"    = "text/markdown; charset=utf-8"
  ".txt"   = "text/plain; charset=utf-8"
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:" + $port + "/")
$listener.Start()

try {
  Write-Host ""
  Write-Host "  wuyu local preview started." -ForegroundColor Green
  Write-Host ("  Portal   http://127.0.0.1:" + $port + "/")
  Write-Host ("  Prompt   http://127.0.0.1:" + $port + "/prompt/")
  Write-Host ("  Judou    http://127.0.0.1:" + $port + "/judou/")
  Write-Host "  Close this window, or press Ctrl+C, to stop."
  Write-Host ""

  if (-not $NoAutoOpen) {
    $urlPath = $OpenPath
    if (-not $urlPath.StartsWith("/")) { $urlPath = "/" + $urlPath }
    Start-Process ("http://127.0.0.1:" + $port + $urlPath)
  }

  while ($listener.IsListening) {
    $ctx = $null
    try { $ctx = $listener.GetContext() } catch { break }
    try {
      $raw = [System.Uri]::UnescapeDataString($ctx.Request.Url.LocalPath)
      $rel = $raw.TrimStart("/")
      if ($rel -eq "") { $rel = "index.html" }

      $fsPath = Join-Path $root ($rel -replace "/", [System.IO.Path]::DirectorySeparatorChar)
      $full = [System.IO.Path]::GetFullPath($fsPath)
      $rootFull = [System.IO.Path]::GetFullPath($root)
      if (-not $full.StartsWith($rootFull, [System.StringComparison]::OrdinalIgnoreCase)) {
        $ctx.Response.StatusCode = 403; $ctx.Response.Close(); continue
      }

      if (Test-Path -LiteralPath $full -PathType Container) {
        $index = Join-Path $full "index.html"
        if (Test-Path -LiteralPath $index -PathType Leaf) { $full = $index }
      }

      if (Test-Path -LiteralPath $full -PathType Leaf) {
        $bytes = [System.IO.File]::ReadAllBytes($full)
        $ext = [System.IO.Path]::GetExtension($full).ToLower()
        $ct = $mime[$ext]
        if (-not $ct) { $ct = "application/octet-stream" }
        $ctx.Response.ContentType = $ct
        $ctx.Response.ContentLength64 = $bytes.Length
        $ctx.Response.OutputStream.Write($bytes, 0, $bytes.Length)
        $ctx.Response.StatusCode = 200
      } else {
        $ctx.Response.StatusCode = 404
        $msg = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found: " + $raw)
        $ctx.Response.OutputStream.Write($msg, 0, $msg.Length)
      }
      $ctx.Response.Close()
    } catch {
      try { if ($ctx) { $ctx.Response.Close() } } catch { }
    }
  }
} finally {
  try { $listener.Stop() } catch { }
  try { $listener.Close() } catch { }
}
