import { useState } from 'react'
import { info } from './data.js'

const wa = `https://wa.me/${info.whatsapp}?text=${encodeURIComponent('Olá! Quero adquirir uma membresia na Academia Moving.')}`

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Não foi possível entrar.')
      window.location.href = data.user.role === 'member' ? '/aluno' : '/admin'
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'Servidor indisponível. Tente novamente.' : err.message)
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <a href="/" className="auth-back">← Voltar ao site</a>
      <form className="auth-card" onSubmit={submit}>
        <img src="/icon.jpg" alt="Academia Moving" className="auth-logo" />
        <h1>Área do aluno</h1>

        <p className="auth-note">
          O usuário e a senha são entregues pela academia <strong>após a adesão da membresia</strong>.
          Não há cadastro online. Ainda não é aluno?{' '}
          <a href={wa} target="_blank" rel="noreferrer">Fale conosco no WhatsApp</a>.
        </p>

        <label>
          Usuário
          <input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" required />
        </label>
        <label>
          Senha
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </label>

        {error && <p className="auth-error" role="alert">{error}</p>}

        <button className="btn" type="submit" disabled={loading}>{loading ? 'Entrando…' : 'Entrar'}</button>
        <p className="auth-help">Esqueceu a senha? Solicite uma nova na recepção.</p>
      </form>
    </div>
  )
}
