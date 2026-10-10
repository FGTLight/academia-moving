import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import express from 'express'
import {
  loadUsers, saveUsers, checkPassword, hashPassword, generatePassword, addMonths,
  publicUser, roleOf, dataDir,
} from './users.js'

const PORT = process.env.PORT || 3001
const isProd = process.env.NODE_ENV === 'production'
const SESSION_MS = 7 * 24 * 60 * 60 * 1000
const USERNAME_RE = /^[a-z0-9._-]{3,30}$/

// ---------- sessão ----------
function getSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET
  const f = path.join(dataDir, 'secret.key')
  try {
    return fs.readFileSync(f, 'utf8')
  } catch {
    fs.mkdirSync(dataDir, { recursive: true })
    const s = crypto.randomBytes(32).toString('hex')
    fs.writeFileSync(f, s)
    return s
  }
}
const SECRET = getSecret()
const sign = (data) => crypto.createHmac('sha256', SECRET).update(data).digest('base64url')

function makeToken(username) {
  const body = Buffer.from(JSON.stringify({ u: username, exp: Date.now() + SESSION_MS })).toString('base64url')
  return `${body}.${sign(body)}`
}

function readToken(token) {
  if (!token) return null
  const [body, sig] = token.split('.')
  if (!body || !sig) return null
  const good = Buffer.from(sign(body))
  const given = Buffer.from(sig)
  if (good.length !== given.length || !crypto.timingSafeEqual(good, given)) return null
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString())
    return p.exp > Date.now() ? p.u : null
  } catch {
    return null
  }
}

function getCookie(req, name) {
  const m = (req.headers.cookie || '').split(';').map((c) => c.trim()).find((c) => c.startsWith(name + '='))
  return m ? decodeURIComponent(m.slice(name.length + 1)) : null
}

const cookieOpts = `Path=/; HttpOnly; SameSite=Lax${isProd ? '; Secure' : ''}`
const setSession = (res, username) =>
  res.setHeader('Set-Cookie', `session=${makeToken(username)}; ${cookieOpts}; Max-Age=${SESSION_MS / 1000}`)

// ---------- limite de tentativas: 5 falhas / 15 min por IP ----------
const fails = new Map()
const WINDOW = 15 * 60 * 1000
const blocked = (ip) => {
  const f = fails.get(ip)
  return Boolean(f) && Date.now() - f.first <= WINDOW && f.count >= 5
}
function registerFail(ip) {
  const f = fails.get(ip)
  if (!f || Date.now() - f.first > WINDOW) fails.set(ip, { count: 1, first: Date.now() })
  else f.count++
}

// ---------- código de configuração inicial (só existe enquanto não há superusuário) ----------
let setupCode = null
function refreshSetupCode() {
  if (loadUsers().some((u) => roleOf(u) === 'superuser')) {
    setupCode = null
    return
  }
  if (!setupCode) {
    setupCode = crypto.randomBytes(4).toString('hex').toUpperCase()
    console.log('\n==============================================')
    console.log(' Nenhum superusuário cadastrado.')
    console.log(` Abra /configurar no site e use o código: ${setupCode}`)
    console.log('==============================================\n')
  }
}

// ---------- app ----------
const app = express()
app.disable('x-powered-by')
app.set('trust proxy', 1) // atrás do proxy do host: IP e HTTPS reais
app.use(express.json({ limit: '4kb' }))

// proteção extra contra CSRF: escritas só com JSON
app.use('/api', (req, res, next) => {
  if (req.method !== 'GET' && !req.is('application/json')) {
    return res.status(415).json({ error: 'Requisição inválida.' })
  }
  next()
})

function auth(req, _res, next) {
  const username = readToken(getCookie(req, 'session'))
  const user = username && loadUsers().find((u) => u.username === username && u.active !== false)
  req.user = user || null
  next()
}
app.use('/api', auth)

const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Não autenticado.' })
  if (!roles.includes(roleOf(req.user))) return res.status(403).json({ error: 'Sem permissão.' })
  next()
}

app.get('/api/setup-status', (_req, res) => {
  refreshSetupCode()
  res.json({ needed: Boolean(setupCode) })
})

app.post('/api/setup', (req, res) => {
  refreshSetupCode()
  if (!setupCode) return res.status(409).json({ error: 'A configuração inicial já foi feita.' })
  if (blocked(req.ip)) return res.status(429).json({ error: 'Muitas tentativas. Tente novamente em alguns minutos.' })

  const { code, username, name, password } = req.body || {}
  const codeOk = typeof code === 'string' && code.trim().toUpperCase() === setupCode
  if (!codeOk) {
    registerFail(req.ip)
    return res.status(401).json({ error: 'Código de configuração incorreto.' })
  }
  const uname = String(username || '').trim().toLowerCase()
  if (!USERNAME_RE.test(uname)) return res.status(400).json({ error: 'Usuário: 3 a 30 caracteres (letras, números, . _ -).' })
  if (typeof password !== 'string' || password.length < 8) return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres.' })
  if (!String(name || '').trim()) return res.status(400).json({ error: 'Informe o nome.' })

  const users = loadUsers()
  if (users.some((u) => u.username === uname)) return res.status(409).json({ error: 'Esse usuário já existe.' })
  const user = { username: uname, name: String(name).trim(), role: 'superuser', active: true, createdAt: new Date().toISOString(), ...hashPassword(password) }
  users.push(user)
  saveUsers(users)
  setupCode = null
  setSession(res, uname)
  res.json({ user: publicUser(user) })
})

app.post('/api/login', (req, res) => {
  const ip = req.ip
  if (blocked(ip)) return res.status(429).json({ error: 'Muitas tentativas. Tente novamente em alguns minutos.' })

  const { username, password } = req.body || {}
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Informe usuário e senha.' })
  }
  const user = loadUsers().find((u) => u.username === username.trim().toLowerCase())
  if (!checkPassword(password, user)) {
    registerFail(ip)
    return res.status(401).json({ error: 'Usuário ou senha incorretos.' })
  }
  if (user.active === false) {
    return res.status(403).json({ error: 'Acesso desativado. Procure a recepção da academia.' })
  }
  if (roleOf(user) === 'member' && user.expiresAt && new Date(user.expiresAt + 'T23:59:59') < new Date()) {
    return res.status(403).json({ error: 'Sua membresia está vencida. Procure a recepção para renovar.' })
  }
  fails.delete(ip)
  setSession(res, user.username)
  res.json({ user: publicUser(user) })
})

app.get('/api/me', requireRole('member', 'admin', 'superuser'), (req, res) => res.json({ user: publicUser(req.user) }))

app.post('/api/logout', (_req, res) => {
  res.setHeader('Set-Cookie', `session=; ${cookieOpts}; Max-Age=0`)
  res.json({ ok: true })
})

app.post('/api/change-password', requireRole('member', 'admin', 'superuser'), (req, res) => {
  const { current, next } = req.body || {}
  if (typeof current !== 'string' || typeof next !== 'string') return res.status(400).json({ error: 'Dados inválidos.' })
  if (next.length < 8) return res.status(400).json({ error: 'A nova senha deve ter pelo menos 8 caracteres.' })
  if (!checkPassword(current, req.user)) return res.status(401).json({ error: 'Senha atual incorreta.' })
  const users = loadUsers()
  Object.assign(users.find((u) => u.username === req.user.username), hashPassword(next))
  saveUsers(users)
  res.json({ ok: true })
})

// ---------- painel administrativo ----------
// admin gerencia alunos; superusuário gerencia alunos e admins
const canManage = (actor, target) => {
  const t = roleOf(target)
  if (t === 'superuser') return false
  if (t === 'admin') return roleOf(actor) === 'superuser'
  return true
}

app.get('/api/admin/users', requireRole('admin', 'superuser'), (req, res) => {
  const isSuper = roleOf(req.user) === 'superuser'
  const list = loadUsers()
    .filter((u) => (isSuper ? roleOf(u) !== 'superuser' : roleOf(u) === 'member'))
    .map(publicUser)
  res.json({ users: list })
})

app.post('/api/admin/users', requireRole('admin', 'superuser'), (req, res) => {
  const { username, name, plan, months, phone, role = 'member' } = req.body || {}
  const uname = String(username || '').trim().toLowerCase()

  if (role !== 'member' && role !== 'admin') return res.status(400).json({ error: 'Perfil inválido.' })
  if (role === 'admin' && roleOf(req.user) !== 'superuser') return res.status(403).json({ error: 'Só o superusuário cria administradores.' })
  if (!USERNAME_RE.test(uname)) return res.status(400).json({ error: 'Usuário: 3 a 30 caracteres (letras, números, . _ -).' })
  if (!String(name || '').trim()) return res.status(400).json({ error: 'Informe o nome.' })

  const user = { username: uname, name: String(name).trim(), role, active: true, createdAt: new Date().toISOString() }
  if (role === 'member') {
    const m = Number(months)
    if (!String(plan || '').trim() || !Number.isInteger(m) || m < 1 || m > 36) {
      return res.status(400).json({ error: 'Informe o plano e a duração (1 a 36 meses).' })
    }
    user.plan = String(plan).trim()
    user.expiresAt = addMonths(new Date(), m)
    const ph = String(phone || '').replace(/\D/g, '')
    if (ph) user.phone = ph
  }

  const users = loadUsers()
  if (users.some((u) => u.username === uname)) return res.status(409).json({ error: 'Esse usuário já existe.' })
  const password = generatePassword()
  Object.assign(user, hashPassword(password))
  users.push(user)
  saveUsers(users)
  res.status(201).json({ user: publicUser(user), password })
})

app.patch('/api/admin/users/:username', requireRole('admin', 'superuser'), (req, res) => {
  const users = loadUsers()
  const target = users.find((u) => u.username === req.params.username)
  if (!target) return res.status(404).json({ error: 'Usuário não encontrado.' })
  if (!canManage(req.user, target)) return res.status(403).json({ error: 'Sem permissão para alterar este usuário.' })

  const { action, months } = req.body || {}
  let password
  switch (action) {
    case 'renew': {
      const m = Number(months)
      if (roleOf(target) !== 'member') return res.status(400).json({ error: 'Só alunos têm membresia.' })
      if (!Number.isInteger(m) || m < 1 || m > 36) return res.status(400).json({ error: 'Duração inválida (1 a 36 meses).' })
      const base = target.expiresAt && new Date(target.expiresAt + 'T23:59:59') > new Date() ? target.expiresAt : new Date()
      target.expiresAt = addMonths(base, m)
      break
    }
    case 'disable':
      target.active = false
      break
    case 'enable':
      target.active = true
      break
    case 'reset':
      password = generatePassword()
      Object.assign(target, hashPassword(password))
      break
    default:
      return res.status(400).json({ error: 'Ação inválida.' })
  }
  saveUsers(users)
  res.json({ user: publicUser(target), ...(password && { password }) })
})

// ---------- site compilado ----------
const dist = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')))
}

refreshSetupCode()
app.listen(PORT, () => console.log(`Servidor em http://localhost:${PORT}`))
