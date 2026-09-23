import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const backendDir = path.join(root, 'backend')
const frontendDir = path.join(root, 'frontend')
const isWindows = process.platform === 'win32'
const backendPort = process.env.LEETCODESYSTEM_BACKEND_PORT || '8081'

if (!/^\d{1,5}$/.test(backendPort) || Number(backendPort) < 1 || Number(backendPort) > 65535) {
  console.error('LEETCODESYSTEM_BACKEND_PORT precisa ser uma porta entre 1 e 65535.')
  process.exit(1)
}

const children = []
let shuttingDown = false
let shutdownCode = 0
let forceStopTimer

function killProcessTree(child, force = false) {
  if (!child.pid) return

  if (isWindows) {
    const killer = spawn('taskkill.exe', ['/PID', String(child.pid), '/T', '/F'], {
      stdio: 'ignore',
      windowsHide: true,
    })
    killer.on('error', () => child.kill(force ? 'SIGKILL' : 'SIGTERM'))
    return
  }

  try {
    process.kill(-child.pid, force ? 'SIGKILL' : 'SIGTERM')
  } catch {
    child.kill(force ? 'SIGKILL' : 'SIGTERM')
  }
}

function finishIfStopped() {
  if (!shuttingDown || children.some(({ closed }) => !closed)) return
  clearTimeout(forceStopTimer)
  process.exit(shutdownCode)
}

function stopAll(code = 0) {
  if (shuttingDown) {
    if (code !== 0) shutdownCode = code
    return
  }

  shuttingDown = true
  shutdownCode = code
  console.log('\nEncerrando frontend e API...')

  for (const { child, closed } of children) {
    if (!closed) killProcessTree(child)
  }

  forceStopTimer = setTimeout(() => {
    for (const { child, closed } of children) {
      if (!closed) killProcessTree(child, true)
    }
  }, 4000)
  forceStopTimer.unref()
  finishIfStopped()
}

function startService(name, command, args, cwd, env = {}) {
  console.log(`[${name}] iniciando...`)
  const child = spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: 'inherit',
    windowsHide: true,
    detached: !isWindows,
  })
  const entry = { child, closed: false }
  children.push(entry)

  child.on('error', (error) => {
    console.error(`[${name}] não foi possível iniciar: ${error.message}`)
    stopAll(1)
  })

  child.on('close', (code, signal) => {
    entry.closed = true
    if (!shuttingDown) {
      const expectedSignal = signal === 'SIGINT' || signal === 'SIGTERM'
      console.error(`[${name}] encerrou${code === null ? ` (${signal ?? 'sem código'})` : ` com código ${code}`}.`)
      stopAll(expectedSignal ? 0 : code === 0 ? 1 : code ?? 1)
    }
    finishIfStopped()
  })
}

process.on('SIGINT', () => stopAll(0))
process.on('SIGTERM', () => stopAll(0))
if (isWindows) process.on('SIGBREAK', () => stopAll(0))

const backendCommand = isWindows ? (process.env.ComSpec || 'cmd.exe') : './mvnw'
const backendArgs = isWindows
  ? ['/d', '/s', '/c', `mvnw.cmd spring-boot:run -Dspring-boot.run.arguments=--server.port=${backendPort}`]
  : ['spring-boot:run', `-Dspring-boot.run.arguments=--server.port=${backendPort}`]
const npmCli = process.env.npm_execpath
const frontendCommand = npmCli ? process.execPath : isWindows ? 'npm.cmd' : 'npm'
const frontendArgs = npmCli
  ? [npmCli, 'run', 'dev', '--', '--host', 'localhost']
  : ['run', 'dev', '--', '--host', 'localhost']

console.log(`Frontend: http://localhost:5173 | API: http://localhost:${backendPort}`)
console.log('Pressione Ctrl+C para encerrar os dois serviços.')

startService('api', backendCommand, backendArgs, backendDir)
startService('frontend', frontendCommand, frontendArgs, frontendDir, {
  VITE_API_PROXY_TARGET: `http://localhost:${backendPort}`,
})
