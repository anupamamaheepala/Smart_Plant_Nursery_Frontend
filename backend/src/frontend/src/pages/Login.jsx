import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import axios from 'axios'

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const [form, setForm]   = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await axios.post('/api/auth/login', form)
      login(res.data)
      const { role } = res.data
      if (role === 'gardener') navigate('/gardener/live')
      else if (role === 'owner')    navigate('/owner')
      else if (role === 'admin')    navigate('/admin')
    } catch {
      setError('Invalid username or password')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.page}>
      {/* Background grid */}
      <div style={styles.grid} />

      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoRow}>
          <div style={styles.logoIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8 2 5 6 5 10c0 5 7 12 7 12s7-7 7-12c0-4-3-8-7-8z"
                fill="#22c55e" opacity="0.9"/>
              <path d="M12 6c-1.5 0-3 1.5-3 4s3 7 3 7 3-4 3-7-1.5-4-3-4z"
                fill="#4ade80"/>
            </svg>
          </div>
          <span style={styles.logoText}>NurseryPulse</span>
        </div>

        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.subtitle}>Sign in to your dashboard</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Username</label>
            <input
              style={styles.input}
              type="text"
              placeholder="Enter username"
              value={form.username}
              onChange={e => setForm({...form, username: e.target.value})}
              required
              autoFocus
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              type="password"
              placeholder="Enter password"
              value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
              required
            />
          </div>

          {error && <p style={styles.error}>{error}</p>}

          <button style={{
            ...styles.btn,
            opacity: loading ? 0.7 : 1,
            cursor:  loading ? 'not-allowed' : 'pointer',
          }} type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>

        <p style={styles.hint}>
          Access level determined by your assigned role
        </p>
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#0d1410',
    position: 'relative',
    overflow: 'hidden',
  },
  grid: {
    position: 'absolute', inset: 0,
    backgroundImage: `
      linear-gradient(rgba(34,197,94,0.04) 1px, transparent 1px),
      linear-gradient(90deg, rgba(34,197,94,0.04) 1px, transparent 1px)
    `,
    backgroundSize: '40px 40px',
    pointerEvents: 'none',
  },
  card: {
    position: 'relative',
    width: '100%',
    maxWidth: '400px',
    background: '#161f18',
    border: '1px solid #243d28',
    borderRadius: '18px',
    padding: '40px',
    boxShadow: '0 8px 48px rgba(0,0,0,0.6)',
  },
  logoRow: {
    display: 'flex', alignItems: 'center', gap: '10px',
    marginBottom: '28px',
  },
  logoIcon: {
    width: '42px', height: '42px',
    background: '#0d1f12',
    border: '1px solid #243d28',
    borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  logoText: {
    fontFamily: "'Outfit', sans-serif",
    fontWeight: '700',
    fontSize: '18px',
    color: '#e8f5e9',
    letterSpacing: '-0.02em',
  },
  title: {
    fontFamily: "'Outfit', sans-serif",
    fontSize: '26px',
    fontWeight: '700',
    color: '#e8f5e9',
    marginBottom: '6px',
    letterSpacing: '-0.03em',
  },
  subtitle: {
    color: '#86a98a',
    fontSize: '14px',
    marginBottom: '28px',
  },
  form: { display: 'flex', flexDirection: 'column', gap: '16px' },
  field: { display: 'flex', flexDirection: 'column', gap: '6px' },
  label: {
    fontSize: '12px',
    fontWeight: '600',
    color: '#86a98a',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  },
  input: {
    background: '#0d1410',
    border: '1px solid #243d28',
    borderRadius: '8px',
    padding: '11px 14px',
    color: '#e8f5e9',
    fontFamily: "'Outfit', sans-serif",
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  error: {
    color: '#f87171',
    fontSize: '13px',
    background: '#7f1d1d22',
    border: '1px solid #991b1b',
    borderRadius: '8px',
    padding: '10px 14px',
  },
  btn: {
    background: 'linear-gradient(135deg, #16a34a, #22c55e)',
    border: 'none',
    borderRadius: '8px',
    padding: '13px',
    color: '#fff',
    fontFamily: "'Outfit', sans-serif",
    fontWeight: '600',
    fontSize: '15px',
    marginTop: '4px',
    transition: 'opacity 0.2s, transform 0.1s',
    letterSpacing: '-0.01em',
  },
  hint: {
    marginTop: '20px',
    textAlign: 'center',
    color: '#4a6b4e',
    fontSize: '12px',
  }
}
