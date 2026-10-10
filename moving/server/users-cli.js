// Gerencia os acessos dos alunos. Uso:
//   npm run user -- add <usuario> "<Nome completo>" "<Plano>" <meses>
//   npm run user -- reset <usuario>
//   npm run user -- renew <usuario> <meses>
//   npm run user -- disable <usuario>
//   npm run user -- enable <usuario>
//   npm run user -- list
import crypto from 'node:crypto'
import { loadUsers, saveUsers, hashPassword } from './users.js'

const [cmd, rawName, ...rest] = process.argv.slice(2)
const username = rawName?.trim().toLowerCase()
const users = loadUsers()
const find = () => users.find((u) => u.username === username)

const addMonths = (from, n) => {
  const d = new Date(from)
  d.setMonth(d.getMonth() + Number(n))
  return d.toISOString().slice(0, 10)
}

function newPassword() {
  const chars = 'abcdefghjkmnpqrstuvwxyzACDEFGHJKLMNPQRTUVWXYZ2346789'
  return Array.from(crypto.randomBytes(10), (b) => chars[b % chars.length]).join('')
}

function fail(msg) {
  console.error(msg)
  process.exit(1)
}

switch (cmd) {
  case 'add': {
    const [name, plan, months] = rest
    if (!username || !name || !plan || !months) fail('Uso: add <usuario> "<Nome>" "<Plano>" <meses>')
    if (!/^[a-z0-9._-]{3,30}$/.test(username)) fail('Usuário: 3 a 30 caracteres (letras, números, . _ -).')
    if (find()) fail('Esse usuário já existe.')
    const password = newPassword()
    users.push({ username, name, plan, expiresAt: addMonths(new Date(), months), active: true, ...hashPassword(password) })
    saveUsers(users)
    console.log(`\nAcesso criado.\n  Usuário: ${username}\n  Senha:   ${password}\n\nEntregue ao aluno. A senha não fica salva em texto e não poderá ser vista de novo.`)
    break
  }
  case 'reset': {
    const u = find() || fail('Usuário não encontrado.')
    const password = newPassword()
    Object.assign(u, hashPassword(password))
    saveUsers(users)
    console.log(`\nNova senha de ${username}: ${password}`)
    break
  }
  case 'renew': {
    const u = find() || fail('Usuário não encontrado.')
    const base = new Date(u.expiresAt) > new Date() ? u.expiresAt : new Date()
    u.expiresAt = addMonths(base, rest[0] || 1)
    saveUsers(users)
    console.log(`Membresia de ${username} válida até ${u.expiresAt}.`)
    break
  }
  case 'disable':
  case 'enable': {
    const u = find() || fail('Usuário não encontrado.')
    u.active = cmd === 'enable'
    saveUsers(users)
    console.log(`${username}: ${u.active ? 'ativado' : 'desativado'}.`)
    break
  }
  case 'list':
    console.table(users.map(({ username, name, plan, expiresAt, active }) => ({ username, name, plan, expiresAt, active })))
    break
  default:
    fail('Comando inválido. Use: add | reset | renew | disable | enable | list')
}
