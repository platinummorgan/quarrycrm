param(
  [string]$DatabaseUrlEnv = 'TEST_DATABASE_URL',
  [int]$MaxAttempts = 3
)

# Usage: pwsh .\scripts\retry-migrate.ps1

if (Get-ChildItem Env:$DatabaseUrlEnv) {
  $dbUrl = (Get-Item Env:$DatabaseUrlEnv).Value
  Set-Item -Path Env:DATABASE_URL -Value $dbUrl
  Write-Host "Mirrored $DatabaseUrlEnv -> DATABASE_URL"
} else {
  Write-Host "Warning: $DatabaseUrlEnv not set in environment."
}

# Set test-friendly envs
Set-Item -Path Env:SKIP_DOCKER -Value '1'
Set-Item -Path Env:RATE_LIMIT_ADAPTER -Value 'memory'

$attempt = 1
while ($attempt -le $MaxAttempts) {
  Write-Host ('Attempt ' + $attempt + '/' + $MaxAttempts + ': npx prisma migrate deploy')
  npx prisma migrate deploy
  if ($LASTEXITCODE -eq 0) {
    Write-Host 'migrate deploy succeeded'
    exit 0
  }
  if ($attempt -lt $MaxAttempts) {
    $delay = $attempt * 5
    Write-Host "Failed; sleeping $delay seconds then retrying..."
    Start-Sleep -Seconds $delay
  } else {
    Write-Host 'All attempts failed; exit with error'
    exit 1
  }
  $attempt++
}
