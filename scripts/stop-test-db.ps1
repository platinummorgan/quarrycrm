# Stop the local Postgres test DB
$composeFile = Join-Path $PSScriptRoot '..\docker-compose.test.yml'
Write-Host "Stopping test DB with docker-compose file: $composeFile"
docker compose -f $composeFile down -v
Write-Host 'Test DB stopped.'
*** End Patch