# Start a local Postgres test DB using docker-compose.test.yml
# Usage: ./scripts/start-test-db.ps1

$composeFile = Join-Path $PSScriptRoot '..\docker-compose.test.yml'
Write-Host "Starting test DB with docker-compose file: $composeFile"
# Check if docker is available
try {
  & docker --version > $null 2>&1
} catch {
  Write-Error "Docker is not available on this machine. Please install Docker Desktop or provide TEST_DATABASE_URL in .env.test to run tests against a real DB."
  exit 1
}

# Use docker compose (v2) if available, otherwise fall back to docker-compose
try {
  docker compose -f $composeFile up -d
} catch {
  docker-compose -f $composeFile up -d
}

Write-Host 'Waiting for Postgres to accept connections on localhost:5433...'
# simple wait loop
for ($i=0; $i -lt 30; $i++) {
  try {
    $tcp = New-Object System.Net.Sockets.TcpClient
    $async = $tcp.BeginConnect('127.0.0.1', 5433, $null, $null)
    $wait = $async.AsyncWaitHandle.WaitOne(1000)
    if ($wait) {
      $tcp.EndConnect($async)
      $tcp.Close()
      Write-Host 'Postgres appears to be accepting connections.'
      break
    }
  } catch {
  }
  Start-Sleep -Seconds 1
}

Write-Host 'Test DB started.'
Write-Host 'Set TEST_DATABASE_URL to: "postgresql://test:test@127.0.0.1:5433/quarrycrm_test"'