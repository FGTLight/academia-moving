import { useEffect, useState } from 'react'
import { hours } from './data.js'

const fmt = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR')

export default function Member() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    fetch('/api/me')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => {
        if (d.user.role !== 'member') window.location.href = '/admin'
        else setUser(d.user)
      })
      .catch(() => { window.location.href = '/entrar' })
  }, [])

  async function logout() {
    await fetch('/api/logout', { method: 'POST' })
    window.location.href = '/'
  }

  if (!user) return <div className="auth-page"><p className="auth-note">Carregando…</p></div>

  const daysLeft = Math.ceil((new Date(user.expiresAt + 'T23:59:59') - new Date()) / 86400000)

  return (
    <div className="auth-page member">
      <a href="/" className="auth-back">← Voltar ao site</a>
      <div className="auth-card wide">
        <img src="/icon.jpg" alt="" className="auth-logo" />
        <h1>Olá, {user.name.split(' ')[0]}!</h1>

        <div className="member-grid">
          <div><span>Plano</span><strong>{user.plan}</strong></div>
          <div><span>Válida até</span><strong>{fmt(user.expiresAt)}</strong></div>
          <div><span>Restam</span><strong>{daysLeft > 0 ? `${daysLeft} dias` : 'Vence hoje'}</strong></div>
        </div>
        {daysLeft <= 7 && <p className="auth-error">Sua membresia está perto de vencer. Procure a recepção para renovar.</p>}

        <h2>Horários da academia</h2>
        <ul className="hours small">
          {hours.map((h) => (
            <li key={h.label}><strong>{h.label}</strong><span>{h.text}</span></li>
          ))}
        </ul>

        <button className="btn btn-ghost dark-ghost" onClick={logout}>Sair</button>
      </div>
    </div>
  )
}
