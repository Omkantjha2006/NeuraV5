# Neura V5 — PostgreSQL + Prisma setup helper
# Run this file from PowerShell in the backend folder:
#   powershell -ExecutionPolicy Bypass -File .\setup-postgres.ps1

$ErrorActionPreference = "Stop"

Write-Host "`n=== Neura V5 PostgreSQL + Prisma Setup ===`n"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw "Node.js is not installed or not available in PATH."
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw "npm is not available in PATH."
}

if (-not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "Created .env from .env.example"
}

$password = Read-Host "Enter your PostgreSQL 'postgres' password" -AsSecureString
$plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
    [Runtime.InteropServices.Marshal]::SecureStringToBSTR($password)
)

# URL-encode the password so special characters are safe in DATABASE_URL.
$encoded = [System.Uri]::EscapeDataString($plain)
$dbUrl = "postgresql://postgres:$encoded@localhost:5432/neura"

$envLines = Get-Content ".env"
$found = $false
$newLines = foreach ($line in $envLines) {
    if ($line -match '^DATABASE_URL=') {
        $found = $true
        "DATABASE_URL=$dbUrl"
    } else {
        $line
    }
}
if (-not $found) {
    $newLines += "DATABASE_URL=$dbUrl"
}
Set-Content ".env" $newLines -Encoding UTF8

Remove-Variable plain -ErrorAction SilentlyContinue
Remove-Variable password -ErrorAction SilentlyContinue

Write-Host "`n1/6 Installing backend dependencies..."
npm install

Write-Host "`n2/6 Generating Prisma Client..."
npm run prisma:generate

Write-Host "`n3/6 Validating Prisma schema..."
npm run prisma:validate

Write-Host "`n4/6 Applying PostgreSQL migrations..."
npm run prisma:migrate:deploy

Write-Host "`n5/6 Seeding Neura agents..."
npm run seed

Write-Host "`n6/6 Verifying database..."
npm run db:verify

Write-Host "`n=== SUCCESS ==="
Write-Host "PostgreSQL + Prisma are connected and the Neura database is ready."
Write-Host "Five canonical agents should now be seeded."
