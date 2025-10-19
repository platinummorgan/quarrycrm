#!/usr/bin/env node

/**
 * Vercel Deployment Helper Script
 *
 * This interactive script helps you deploy the CRM to Vercel
 * with proper configuration and environment setup.
 */

import { exec } from 'child_process'
import { promisify } from 'util'
import * as readline from 'readline'

const execAsync = promisify(exec)

interface DeploymentConfig {
  projectName: string
  databaseUrl: string
  nextauthSecret: string
  nextauthUrl: string
  useVercelPostgres: boolean
}

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
}

const log = {
  info: (msg: string) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
  success: (msg: string) =>
    console.log(`${colors.green}✓${colors.reset} ${msg}`),
  warning: (msg: string) =>
    console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
  error: (msg: string) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
  step: (msg: string) =>
    console.log(`\n${colors.bright}${colors.cyan}→ ${msg}${colors.reset}\n`),
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
})

const question = (query: string): Promise<string> => {
  return new Promise((resolve) => rl.question(query, resolve))
}

async function checkVercelCLI(): Promise<boolean> {
  try {
    await execAsync('vercel --version')
    return true
  } catch {
    return false
  }
}

async function checkGitRepository(): Promise<boolean> {
  try {
    await execAsync('git rev-parse --is-inside-work-tree')
    return true
  } catch {
    return false
  }
}

async function checkGitRemote(): Promise<string | null> {
  try {
    const { stdout } = await execAsync('git remote get-url origin')
    return stdout.trim()
  } catch {
    return null
  }
}

function generateNextAuthSecret(): string {
  const crypto = require('crypto')
  return crypto.randomBytes(32).toString('base64')
}

async function collectConfig(): Promise<DeploymentConfig> {
  log.step('Configuration Setup')

  const projectName = await question('Project name (default: crm): ')
  const useVercelPostgres =
    (await question('Use Vercel Postgres? (y/n): ')).toLowerCase() === 'y'

  let databaseUrl = ''
  if (!useVercelPostgres) {
    databaseUrl = await question(
      'Database URL (PostgreSQL connection string): '
    )
  }

  const nextauthSecret = generateNextAuthSecret()
  log.info(`Generated NEXTAUTH_SECRET: ${nextauthSecret.substring(0, 20)}...`)

  const nextauthUrl = await question(
    'Production URL (e.g., https://your-app.vercel.app): '
  )

  return {
    projectName: projectName || 'crm',
    databaseUrl,
    nextauthSecret,
    nextauthUrl,
    useVercelPostgres,
  }
}

async function setupVercelCLI() {
  log.step('Setting up Vercel CLI')

  const hasVercel = await checkVercelCLI()
  if (!hasVercel) {
    log.warning('Vercel CLI not found. Installing...')
    await execAsync('npm install -g vercel')
    log.success('Vercel CLI installed')
  } else {
    log.success('Vercel CLI already installed')
  }

  log.info('Logging in to Vercel...')
  await execAsync('vercel login')
  log.success('Logged in to Vercel')
}

async function setupGit() {
  log.step('Git Repository Setup')

  const isGitRepo = await checkGitRepository()
  if (!isGitRepo) {
    log.warning('Not a git repository. Initializing...')
    await execAsync('git init')
    log.success('Git repository initialized')
  } else {
    log.success('Git repository found')
  }

  const remote = await checkGitRemote()
  if (!remote) {
    log.warning('No git remote found.')
    log.info('Please add a remote manually:')
    console.log(
      '  git remote add origin https://github.com/yourusername/your-repo.git'
    )
    console.log('  git push -u origin main')
  } else {
    log.success(`Git remote: ${remote}`)
  }
}

async function deployToVercel(config: DeploymentConfig) {
  log.step('Deploying to Vercel')

  log.info('Linking project...')
  try {
    await execAsync(`vercel link --project=${config.projectName} --yes`)
  } catch {
    log.info('Creating new project...')
  }

  log.info('Setting environment variables...')

  if (!config.useVercelPostgres) {
    await execAsync(
      `vercel env add DATABASE_URL production <<< "${config.databaseUrl}"`
    )
  }
  await execAsync(
    `vercel env add NEXTAUTH_SECRET production <<< "${config.nextauthSecret}"`
  )
  await execAsync(
    `vercel env add NEXTAUTH_URL production <<< "${config.nextauthUrl}"`
  )

  log.success('Environment variables set')

  if (config.useVercelPostgres) {
    log.info('Setting up Vercel Postgres...')
    console.log('Please run these commands manually:')
    console.log('  vercel postgres create crm-db')
    console.log('  vercel postgres link')
    console.log('\nPress Enter when done...')
    await question('')
  }

  log.info('Deploying to production...')
  await execAsync('vercel --prod')

  log.success('Deployment complete!')
}

async function showPostDeployment(config: DeploymentConfig) {
  log.step('Post-Deployment Steps')

  console.log(`
${colors.bright}Next Steps:${colors.reset}

1. ${colors.bright}Run Database Migrations${colors.reset}
   vercel env pull .env.production
   npx prisma db push

2. ${colors.bright}Create Admin User${colors.reset}
   Visit your deployment and sign up with your email

3. ${colors.bright}Verify Deployment${colors.reset}
   Visit: ${colors.cyan}${config.nextauthUrl}${colors.reset}
   Check /speed page for performance benchmarks

4. ${colors.bright}Set Up Custom Domain (Optional)${colors.reset}
   Go to Vercel Dashboard → Settings → Domains
   Update NEXTAUTH_URL after adding custom domain

5. ${colors.bright}Monitor Application${colors.reset}
   Vercel Dashboard → Analytics
   vercel logs --follow

${colors.bright}Documentation:${colors.reset}
  📚 Full guide: ${colors.cyan}docs/vercel-deployment.md${colors.reset}
  🔒 Security: ${colors.cyan}docs/definition-of-done.md${colors.reset}
  ⚡ Performance: ${colors.cyan}docs/performance-benchmarking.md${colors.reset}

${colors.green}${colors.bright}✨ Deployment successful!${colors.reset}
`)
}

async function main() {
  console.log(`
${colors.bright}${colors.cyan}
╔═══════════════════════════════════════╗
║   Vercel Deployment Helper Script    ║
║        Quarry CRM v0.1.0              ║
╚═══════════════════════════════════════╝
${colors.reset}
`)

  try {
    // Pre-flight checks
    log.step('Pre-flight Checks')

    log.info('Checking TypeScript...')
    // Allow tests or quick deploys to skip the TypeScript preflight by setting
    // SKIP_TYPE_CHECK=1 in the environment. This is useful for CI or one-off
    // deploys where local type errors (tests/scripts) should not block deploy.
    if (process.env.SKIP_TYPE_CHECK === '1') {
      log.warning('Skipping TypeScript check (SKIP_TYPE_CHECK=1)')
    } else {
      await execAsync('npm run type-check')
      log.success('TypeScript check passed')
    }

    log.info('Checking build...')
    if (process.env.SKIP_BUILD === '1') {
      log.warning(
        'Skipping local build (SKIP_BUILD=1). Vercel will build remotely.'
      )
    } else {
      await execAsync('npm run build')
      log.success('Build successful')
    }

    // Setup
    await setupVercelCLI()
    await setupGit()

    // Configuration
    const config = await collectConfig()

    // Deploy
    const proceed = await question(
      `\nReady to deploy "${config.projectName}" to Vercel? (y/n): `
    )
    if (proceed.toLowerCase() !== 'y') {
      log.warning('Deployment cancelled')
      rl.close()
      return
    }

    await deployToVercel(config)
    await showPostDeployment(config)

    rl.close()
  } catch (error) {
    log.error(`Deployment failed: ${(error as Error).message}`)
    console.error(error)
    rl.close()
    process.exit(1)
  }
}

main()
