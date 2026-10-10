import { useCallback, useEffect, useMemo, useState } from 'react'
import { info } from './data.js'

const PLANS = [
  { name: 'Mensal', months: 1 },
  { name: 'Trimestral', months: 3 },
  { name: 'Semestral', months: 6 },
  { name: 'Anual', months: 12 },
]

const fmt = (iso) => (iso ? new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR') : '—')
const slug = (name) =>
  name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().split(/\s+/).filter(Boolean)
    .slice(0, 2).join('.').replace(/[^a-z0-9.]/g, '')

async function api(url, method = 'GET', body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (res.status === 401) {
    window.location.href = '/entrar'
    throw new Error('Sessão expirada.')
  }
  if (!res.ok) throw new Error(data.error || 'Erro inesperado.')
  return data
}

function status(u) {
  if (!u.active) return { label: 'Desativado', cls: 'off' }
  if (u.role !== 'member') return { label: 'Ativo', cls: 'on' }
  const left = Math.ceil((new Date(u.expiresAt + 'T23:59:59') - new Date()) / 86400000)
  if (left < 0) return { label: 'Vencida', cls: 'off' }
  if (left <= 7) return { label: `Vence em ${left}d`, cls: 'warn' }
  return { label: 'Ativa', cls: 'on' }
}

// janela que mostra a senha uma única vez
function Credentials({ data, onClose }) {
  const { user, password } = data
  const [copied, setCopied] = useState(false)
  const loginUrl = `${window.location.origin}/entrar`
  const message = `Olá, ${user.name.split(' ')[0]}! Seu acesso à Academia Moving:\nUsuário: ${user.username}\nSenha: ${password}\nEntre em: ${loginUrl}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(message)
      setCopied(true)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal-card">
        <h2>Acesso {data.reset ? 'redefinido' : 'criado'}</h2>
        <div className="cred">
          <div><span>Usuário</span><strong>{user.username}</strong></div>
          <div><span>Senha</span><strong>{password}</strong></div>
        </div>
        <p className="auth-error">Anote ou envie agora: por segurança, a senha não poderá ser vista novamente.</p>
        <div className="cta">
          <button className="btn btn-sm" onClick={copy}>{copied ? 'Copiado ✓' : 'Copiar mensagem'}</button>
          {user.phone && (
            <a className="btn btn-sm btn-ghost" target="_blank" rel="noreferrer"
              href={`https://wa.me/55${user.phone.replace(/^55/, '')}?text=${encodeURIComponent(message)}`}>
              Enviar por WhatsApp
            </a>
          )}
          <button className="btn btn-sm btn-ghost" onClick={onClose}>Fechar</button>
        </div>
      </div>
    </div>
  )
}

function NewUserForm({ role, onCreated }) {
  const isMember = role === 'member'
  const [f, setF] = useState({ name: '', username: '', phone: '', plan: 'Mensal', months: 1 })
  const [touched, setTouched] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const username = touched ? f.username : slug(f.name)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const data = await api('/api/admin/users', 'POST', { ...f, username, role })
      setF({ name: '', username: '', phone: '', plan: 'Mensal', months: 1 })
      setTouched(false)
      onCreated(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <form className="panel-form" onSubmit={submit}>
      <h2>{isMember ? 'Novo aluno' : 'Novo administrador'}</h2>
      <div className="form-row">
        <label>Nome completo<input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} required /></label>
        <label>Usuário<input value={username} onChange={(e) => { setTouched(true); setF({ ...f, username: e.target.value.toLowerCase() }) }} autoCapitalize="none" required /></label>
      </div>
      {isMember && (
        <div className="form-row">
          <label>WhatsApp do aluno (opcional)<input value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} inputMode="tel" placeholder="(54) 99999-9999" /></label>
          <label>Plano
            <select value={f.plan} onChange={(e) => {
              const p = PLANS.find((x) => x.name === e.target.value)
              setF({ ...f, plan: p.name, months: p.months })
            }}>
              {PLANS.map((p) => <option key={p.name}>{p.name}</option>)}
            </select>
          </label>
          <label>Meses<input type="number" min="1" max="36" value={f.months} onChange={(e) => setF({ ...f, months: e.target.value })} required /></label>
        </div>
      )}
      <p className="hint">A senha é gerada automaticamente e exibida uma vez após criar.</p>
      {error && <p className="auth-error" role="alert">{error}</p>}
      <button className="btn btn-sm" type="submit" disabled={busy}>{busy ? 'Criando…' : 'Criar acesso'}</button>
    </form>
  )
}

function UserTable({ users, onAction, canRenew }) {
  const [q, setQ] = useState('')
  const rows = useMemo(
    () => users.filter((u) => (u.name + u.username).toLowerCase().includes(q.toLowerCase())),
    [users, q],
  )
  return (
    <div>
      <input className="search" placeholder="Buscar por nome ou usuário…" value={q} onChange={(e) => setQ(e.target.value)} />
      {rows.length === 0 ? <p className="hint">Nenhum registro.</p> : (
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nome</th><th>Usuário</th>{canRenew && <><th>Plano</th><th>Vence</th></>}<th>Status</th><th>Ações</th></tr></thead>
            <tbody>
              {rows.map((u) => {
                const s = status(u)
                return (
                  <tr key={u.username}>
                    <td>{u.name}</td>
                    <td>{u.username}</td>
                    {canRenew && <><td>{u.plan}</td><td>{fmt(u.expiresAt)}</td></>}
                    <td><span className={`pill ${s.cls}`}>{s.label}</span></td>
                    <td className="actions">
                      {canRenew && <button onClick={() => onAction(u, 'renew')}>Renovar</button>}
                      <button onClick={() => onAction(u, 'reset')}>Nova senha</button>
                      <button onClick={() => onAction(u, u.active ? 'disable' : 'enable')}>{u.active ? 'Desativar' : 'Ativar'}</button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function Account() {
  const [f, setF] = useState({ current: '', next: '' })
  const [msg, setMsg] = useState({ type: '', text: '' })
  async function submit(e) {
    e.preventDefault()
    try {
      await api('/api/change-password', 'POST', f)
      setF({ current: '', next: '' })
      setMsg({ type: 'ok', text: 'Senha alterada.' })
    } catch (err) {
      setMsg({ type: 'err', text: err.message })
    }
  }
  return (
    <form className="panel-form" onSubmit={submit}>
      <h2>Alterar minha senha</h2>
      <div className="form-row">
        <label>Senha atual<input type="password" value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} autoComplete="current-password" required /></label>
        <label>Nova senha (mín. 8)<input type="password" minLength={8} value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} autoComplete="new-password" required /></label>
      </div>
      {msg.text && <p className={msg.type === 'ok' ? 'hint ok' : 'auth-error'}>{msg.text}</p>}
      <button className="btn btn-sm" type="submit">Salvar</button>
    </form>
  )
}

export default function Admin() {
  const [me, setMe] = useState(null)
  const [users, setUsers] = useState([])
  const [tab, setTab] = useState('members')
  const [cred, setCred] = useState(null)
  const [error, setError] = useState('')

  const load = useCallback(() => api('/api/admin/users').then((d) => setUsers(d.users)).catch((e) => setError(e.message)), [])

  useEffect(() => {
    api('/api/me')
      .then((d) => {
        if (d.user.role === 'member') window.location.href = '/aluno'
        else {
          setMe(d.user)
          load()
        }
      })
      .catch(() => {})
  }, [load])

  async function onAction(u, action) {
    setError('')
    try {
      let body = { action }
      if (action === 'renew') {
        const m = window.prompt(`Renovar a membresia de ${u.name} por quantos meses?`, '1')
        if (!m) return
        body.months = Number(m)
      } else if (action === 'reset' && !window.confirm(`Gerar uma nova senha para ${u.name}? A anterior deixa de funcionar.`)) return
      else if (action === 'disable' && !window.confirm(`Desativar o acesso de ${u.name}?`)) return

      const data = await api(`/api/admin/users/${encodeURIComponent(u.username)}`, 'PATCH', body)
      if (data.password) setCred({ ...data, reset: true })
      load()
    } catch (e) {
      setError(e.message)
    }
  }

  async function logout() {
    await api('/api/logout', 'POST', {})
    window.location.href = '/'
  }

  if (!me) return <div className="auth-page"><p className="auth-note">Carregando…</p></div>

  const isSuper = me.role === 'superuser'
  const members = users.filter((u) => u.role === 'member')
  const admins = users.filter((u) => u.role === 'admin')
  const tabs = [['members', 'Alunos'], ...(isSuper ? [['admins', 'Administradores']] : []), ['account', 'Minha conta']]

  return (
    <div className="panel">
      <header className="panel-head">
        <div>
          <strong>{info.name}</strong>
          <span className="pill on">{isSuper ? 'Superusuário' : 'Administrador'}</span>
        </div>
        <div className="panel-user">
          {me.name}
          <button onClick={logout}>Sair</button>
        </div>
      </header>

      <nav className="tabs">
        {tabs.map(([k, label]) => (
          <button key={k} className={tab === k ? 'active' : ''} onClick={() => setTab(k)}>{label}</button>
        ))}
      </nav>

      <main className="panel-body">
        {error && <p className="auth-error" role="alert">{error}</p>}
        {tab === 'members' && (
          <>
            <NewUserForm role="member" onCreated={(d) => { setCred(d); load() }} />
            <h2>Alunos ({members.length})</h2>
            <UserTable users={members} onAction={onAction} canRenew />
          </>
        )}
        {tab === 'admins' && isSuper && (
          <>
            <NewUserForm role="admin" onCreated={(d) => { setCred(d); load() }} />
            <h2>Administradores ({admins.length})</h2>
            <UserTable users={admins} onAction={onAction} />
          </>
        )}
        {tab === 'account' && <Account />}
      </main>

      {cred && <Credentials data={cred} onClose={() => setCred(null)} />}
    </div>
  )
}
