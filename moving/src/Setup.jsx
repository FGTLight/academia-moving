import { useEffect, useState } from 'react'

export default function Setup() {
  const [needed, setNeeded] = useState(null)
  const [f, setF] = useState({ code: '', name: '', username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  useEffect(() => {
    fetch('/api/setup-status').then((r) => r.json()).then((d) => setNeeded(d.needed)).catch(() => setNeeded(false))
  }, [])

  async function submit(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const res = await fetch('/api/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(f),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      setError(data.error || 'Erro ao configurar.')
      setLoading(false)
      return
    }
    window.location.href = '/admin'
  }

  if (needed === null) return <div className="auth-page"><p className="auth-note">Carregando…</p></div>

  if (!needed) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1>Configuração concluída</h1>
          <p className="auth-note">O superusuário já foi criado. <a href="/entrar">Ir para o login</a>.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>Criar superusuário</h1>
        <p className="auth-note">
          Primeira configuração. Digite o código exibido no terminal onde o servidor foi iniciado.
          Esta página deixa de funcionar depois que o superusuário é criado.
        </p>
        <label>Código de configuração<input value={f.code} onChange={set('code')} autoComplete="off" required /></label>
        <label>Nome<input value={f.name} onChange={set('name')} required /></label>
        <label>Usuário<input value={f.username} onChange={set('username')} autoCapitalize="none" autoComplete="username" required /></label>
        <label>Senha (mínimo 8 caracteres)<input type="password" minLength={8} value={f.password} onChange={set('password')} autoComplete="new-password" required /></label>
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="btn" type="submit" disabled={loading}>{loading ? 'Criando…' : 'Criar superusuário'}</button>
      </form>
    </div>
  )
}
