#!/usr/bin/env node
const { execSync } = require('child_process')
const fs = require('fs')

const SKIP_DOCKER = process.env.SKIP_DOCKER === '1' || process.env.SKIP_DOCKER === 'true'

function dockerAvailable() {
  try {
    execSync('docker --version', { stdio: 'ignore' })
    return true
  } catch (e) {
    return false
  }
}

async function main(){
  if (SKIP_DOCKER) {
    console.log('[info] SKIP_DOCKER=1, skipping Docker')
    return
  }

  if (!dockerAvailable()) {
    console.log('[info] docker not found on PATH, skipping Docker')
    return
  }

  // If we reach here, docker is available and SKIP_DOCKER is false.
  // Try to start docker compose if docker-compose.test.yml exists
  const composeFile = 'docker-compose.test.yml'
  if (!fs.existsSync(composeFile)) {
    console.log(`[info] ${composeFile} not found, skipping Docker`) 
    return
  }

  console.log('[info] Starting Docker services via docker compose...')
  try {
    execSync(`docker compose -f ${composeFile} up -d`, { stdio: 'inherit' })
    console.log('[info] Docker compose started')
  } catch (e) {
    try {
      execSync(`docker-compose -f ${composeFile} up -d`, { stdio: 'inherit' })
      console.log('[info] Docker compose (legacy) started')
    } catch (err) {
      console.error('[error] Failed to start Docker compose:', err.message)
      process.exit(1)
    }
  }
}

main()
