# MonoClip — one-time setup
#
# Run this once after cloning:
#     .\setup.ps1
#
# It checks prerequisites, creates backend\.env with a random JWT_SECRET
# (the backend refuses to start without one), and installs frontend deps.
#
# If you see "running scripts is disabled on this system", run once:
#     Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot

Write-Host ""
Write-Host "=== MonoClip setup ===" -ForegroundColor Cyan
Write-Host ""

# --- 1. Check prerequisites -------------------------------------------------
function Test-Tool($name, $cmd, $hint) {
    if (Get-Command $cmd -ErrorAction SilentlyContinue) {
        Write-Host ("  [OK]   {0}" -f $name) -ForegroundColor Green
        return $true
    }
    Write-Host ("  [MISS] {0} - {1}" -f $name, $hint) -ForegroundColor Yellow
    return $false
}

Write-Host "Checking prerequisites..."
$ok = $true
$ok = (Test-Tool "Docker"  "docker" "https://www.docker.com/products/docker-desktop/") -and $ok
$ok = (Test-Tool "Node.js" "node"   "https://nodejs.org/")                              -and $ok
$ok = (Test-Tool "Rust"    "cargo"  "https://www.rust-lang.org/tools/install")          -and $ok

if (-not $ok) {
    Write-Host ""
    Write-Host "Some prerequisites are missing. Install them, then re-run .\setup.ps1" -ForegroundColor Yellow
    Write-Host "(Docker is only needed for the easiest backend path; see README for the manual route.)"
    Write-Host ""
}

# --- 2. Create backend\.env -------------------------------------------------
$envPath     = Join-Path $root "backend\.env"
$envExample  = Join-Path $root "backend\.env.example"

Write-Host ""
if (Test-Path $envPath) {
    Write-Host "backend\.env already exists - leaving it untouched." -ForegroundColor Green
} else {
    if (-not (Test-Path $envExample)) {
        throw "backend\.env.example not found - cannot create .env"
    }

    # Generate a strong random JWT secret (URL-safe base64, ~48 bytes).
    $bytes = New-Object 'System.Byte[]' 48
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
    $secret = [Convert]::ToBase64String($bytes).TrimEnd('=').Replace('+', '-').Replace('/', '_')

    # Copy the example and inject the secret on the JWT_SECRET= line.
    $content = Get-Content $envExample -Raw
    $content = $content -replace '(?m)^JWT_SECRET=.*$', ("JWT_SECRET=" + $secret)
    Set-Content -Path $envPath -Value $content -Encoding UTF8 -NoNewline

    Write-Host "Created backend\.env with a random JWT_SECRET." -ForegroundColor Green
    Write-Host "(Optional: add SMTP / Google / GitHub credentials in that file for full login features.)"
}

# --- 3. Install frontend dependencies --------------------------------------
Write-Host ""
$frontend = Join-Path $root "frontend"
if (Get-Command npm -ErrorAction SilentlyContinue) {
    Write-Host "Installing frontend dependencies (npm install)..."
    Push-Location $frontend
    try {
        npm install
        Write-Host "Frontend dependencies installed." -ForegroundColor Green
    } finally {
        Pop-Location
    }
} else {
    Write-Host "Skipping npm install - Node.js not found." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=== Setup complete ===" -ForegroundColor Cyan
Write-Host "Next: double-click run.bat (or run it from a terminal) to start MonoClip."
Write-Host ""
