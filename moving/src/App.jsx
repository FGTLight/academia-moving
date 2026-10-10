import { info, hours, features, testimonials } from './data.js'

function useOpenNow() {
  const now = new Date()
  const mins = now.getHours() * 60 + now.getMinutes()
  const today = hours.find((h) => h.days.includes(now.getDay()))
  return { today, open: today.slots.some(([a, b]) => mins >= a && mins < b) }
}

const wa = `https://wa.me/${info.whatsapp}?text=${encodeURIComponent('Olá! Gostaria de saber mais sobre a Academia Moving.')}`

export default function App() {
  const { today, open } = useOpenNow()
  return (
    <>
      <header className="nav">
        <a href="#top" className="logo"><img src="/icon.jpg" alt="Moving Personal & Academia" /></a>
        <nav>
          <a href="#diferenciais">Diferenciais</a>
          <a href="#horarios">Horários</a>
          <a href="#avaliacoes">Avaliações</a>
          <a href="#contato">Contato</a>
          <a href="/entrar" className="nav-login">Entrar</a>
          <a href={wa} className="btn btn-sm" target="_blank" rel="noreferrer">WhatsApp</a>
        </nav>
      </header>

      <main id="top">
        <section className="hero">
          <div className="hero-inner">
            <img className="hero-logo" src="/logo.jpg" alt="" aria-hidden="true" />
            <h1>Mova-se.<br />Evolua. <em>Todos os dias.</em></h1>
            <p className="lead">Musculação em Erechim com estrutura moderna, ambiente climatizado e instrutores que acompanham o seu treino.</p>
            <div className="cta">
              <a href={wa} className="btn" target="_blank" rel="noreferrer">Agendar aula experimental</a>
              <a href="#contato" className="btn btn-ghost">Como chegar</a>
            </div>
          </div>
        </section>

        <section id="diferenciais" className="section">
          <h2>Por que treinar na Moving</h2>
          <div className="grid">
            {features.map((f) => (
              <article key={f.title} className="card">
                <div className="icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="photo-band">
          <img src="/gym.jpg" alt="Salão de musculação da Academia Moving com bancos e equipamentos" loading="lazy" />
          <div className="photo-text">
            <h2>Estrutura pensada para o seu treino</h2>
            <p>Salão amplo, piso emborrachado, iluminação moderna e equipamentos de ponta.</p>
          </div>
        </section>

        <section id="horarios" className="section">
          <h2>Nossos horários</h2>
          <p className={`status ${open ? 'on' : 'off'}`}>
            <span className="dot" /> {open ? 'Aberto agora' : 'Fechado agora'} · hoje: {today.text}
          </p>
          <ul className="hours">
            {hours.map((h) => (
              <li key={h.label} className={h === today ? 'today' : ''}>
                <strong>{h.label}</strong>
                <span>{h.text}</span>
              </li>
            ))}
          </ul>
        </section>

        <section id="avaliacoes" className="section dark">
          <h2>Quem treina, recomenda</h2>
          <div className="grid three">
            {testimonials.map((t) => (
              <blockquote key={t.name} className="quote">
                <p>“{t.text}”</p>
                <footer>— {t.name}</footer>
              </blockquote>
            ))}
          </div>
        </section>

        <section id="contato" className="section">
          <h2>Venha nos visitar</h2>
          <div className="contact">
            <div className="contact-info">
              <p><strong>Endereço</strong><br />{info.address}</p>
              <p><strong>Telefone / WhatsApp</strong><br /><a href={`tel:+${info.whatsapp}`}>{info.phone}</a></p>
              <p><strong>Funcionamento</strong><br />Seg–Qui 6h–23h · Sex 6h–21:30h<br />Sáb 9h–12h e 14h–17h · Dom fechado</p>
              <div className="cta">
                <a href={wa} className="btn" target="_blank" rel="noreferrer">Chamar no WhatsApp</a>
                <a href={info.instagram} className="btn btn-ghost dark-ghost" target="_blank" rel="noreferrer">Instagram</a>
                <a href={info.mapsUrl} className="btn btn-ghost dark-ghost" target="_blank" rel="noreferrer">Abrir no Maps</a>
              </div>
            </div>
            <iframe title="Mapa da Academia Moving" src={info.embed} loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
          </div>
        </section>
      </main>

      <footer className="footer">
        © {new Date().getFullYear()} Academia Moving · Erechim - RS ·{' '}
        <a href={info.instagram} target="_blank" rel="noreferrer">{info.instagramHandle}</a>      </footer>
      <a href={wa} className="fab" target="_blank" rel="noreferrer" aria-label="WhatsApp">💬</a>
    </>
  )
}
