import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext.jsx'

export default function Login() {
  const { login }    = useAuth()
  const navigate     = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Erreur de connexion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.root}>
      {/* Fond décoratif */}
      <div style={styles.bgLeft}/>
      <div style={styles.bgDot}/>

      <div style={styles.card} className="anim-fade-up">
        {/* Logo */}
        <div style={styles.logo}>
          <span style={styles.logoText}>ex<span style={styles.logoH}>h</span>elia</span>
          <span style={styles.logoSub}>Espace Bureau</span>
        </div>

        <h1 style={styles.title}>Connexion</h1>
        <p style={styles.subtitle}>Accès réservé aux responsables d'équipe</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div>
            <label className="input-label">Adresse email</label>
            <input
              className="input"
              type="email"
              placeholder="prenom.nom@exhelia.fr"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoFocus
            />
          </div>

          <div>
            <label className="input-label">Mot de passe</label>
            <input
              className="input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div style={styles.error}>
              <span>⚠</span> {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
            disabled={loading}
          >
            {loading ? <><span className="loader" style={{width:16,height:16}}/> Connexion...</> : 'Se connecter'}
          </button>
        </form>

        <div style={styles.footer}>
          <span style={styles.dot}/> Connexion sécurisée
        </div>
      </div>
    </div>
  )
}

const styles = {
  root: {
    height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: 'var(--navy)', position: 'relative', overflow: 'hidden'
  },
  bgLeft: {
    position: 'absolute', left: '-20%', top: '-20%',
    width: '60vw', height: '60vw', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(74,184,64,0.06) 0%, transparent 70%)',
    pointerEvents: 'none'
  },
  bgDot: {
    position: 'absolute', right: '10%', bottom: '15%',
    width: '300px', height: '300px', borderRadius: '50%',
    background: 'radial-gradient(circle, rgba(74,184,64,0.04) 0%, transparent 70%)',
    pointerEvents: 'none'
  },
  card: {
    width: 420, background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 20, padding: '48px 40px',
    backdropFilter: 'blur(20px)', position: 'relative', zIndex: 1
  },
  logo: { marginBottom: 32, textAlign: 'center' },
  logoText: {
    fontFamily: "'Playfair Display', serif", fontSize: '2rem',
    color: '#fff', letterSpacing: '-0.03em'
  },
  logoH: { color: 'var(--green)', fontStyle: 'italic' },
  logoSub: {
    display: 'block', fontSize: '0.7rem', letterSpacing: '0.2em',
    textTransform: 'uppercase', color: 'rgba(255,255,255,0.35)',
    marginTop: 4
  },
  title: {
    fontSize: '1.5rem', fontWeight: 600, color: '#fff',
    marginBottom: 6
  },
  subtitle: { fontSize: '0.875rem', color: 'rgba(255,255,255,0.4)', marginBottom: 32 },
  form: { display: 'flex', flexDirection: 'column', gap: 20 },
  error: {
    background: 'rgba(231,76,60,0.12)', border: '1px solid rgba(231,76,60,0.3)',
    borderRadius: 8, padding: '10px 14px', color: '#e74c3c',
    fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: 8
  },
  footer: {
    marginTop: 28, textAlign: 'center', fontSize: '0.75rem',
    color: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center',
    justifyContent: 'center', gap: 8
  },
  dot: {
    width: 6, height: 6, borderRadius: '50%',
    background: 'var(--green)', display: 'inline-block'
  }
}
