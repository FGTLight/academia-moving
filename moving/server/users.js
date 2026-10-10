import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'

// DATA_DIR aponta para o disco persistente em produção (ex.: /var/data)
const dir = process.env.DATA_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'data')
const file = path.join(dir, 'users.json')

export const ROLES = ['member', 'admin', 'superuser']
export const roleOf = (u) => u.role || 'member' // contas antigas, sem campo role, são alunos

export function loadUsers() {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return []
  }
}

export function saveUsers(users) {
  fs.mkdirSync(dir, { recursive: true })
  const tmp = file + '.tmp'
  fs.writeFileSync(tmp, JSON.stringify(users, null, 2))
  fs.renameSync(tmp, file)
}

export function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return { salt, hash }
}

export function checkPassword(password, user) {
  // sempre calcula o hash, mesmo sem usuário, para não revelar quais usuários existem
  const salt = user?.salt ?? '0'.repeat(32)
  const expected = Buffer.from(user?.hash ?? '0'.repeat(128), 'hex')
  const actual = crypto.scryptSync(password, salt, 64)
  return Boolean(user) && crypto.timingSafeEqual(actual, expected)
}

export function generatePassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzACDEFGHJKLMNPQRTUVWXYZ2346789'
  return Array.from(crypto.randomBytes(10), (b) => chars[b % chars.length]).join('')
}

export function addMonths(from, n) {
  const d = new Date(from)
  d.setMonth(d.getMonth() + Number(n))
  return d.toISOString().slice(0, 10)
}

export function publicUser(u) {
  return {
    username: u.username,
    name: u.name,
    role: roleOf(u),
    plan: u.plan,
    phone: u.phone,
    expiresAt: u.expiresAt,
    active: u.active !== false,
    createdAt: u.createdAt,
  }
}

export const dataDir = dir
