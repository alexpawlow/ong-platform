import { useState, type FormEvent } from 'react'
import { Brain, Mail, Lock, Sun, Moon } from 'lucide-react'
import { login } from '../lib/localAuth'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { useTheme } from '../contexts/ThemeContext'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const urlOk = typeof SUPABASE_URL === 'string' && SUPABASE_URL.startsWith('https://')

export default function Login() {
  const { theme, toggleTheme } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao entrar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page">
      <button className="login-theme-toggle" onClick={toggleTheme} aria-label="Alternar tema">
        {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
      </button>

      <div className="login-card">
        <div className="login-logo">
          <div className="login-logo__icon"><Brain size={32} /></div>
          <h1 className="login-logo__title">ONG Platform</h1>
          <p className="login-logo__sub">Gestão de Tecnologia — Saúde Mental Educacional</p>
        </div>

        {/* Banner de diagnóstico — remover após confirmar que funciona */}
        <div style={{
          fontSize: 11, padding: '8px 10px', borderRadius: 8,
          background: urlOk ? '#f0fdf4' : '#fef2f2',
          color: urlOk ? '#16a34a' : '#dc2626',
          border: `1px solid ${urlOk ? '#bbf7d0' : '#fecaca'}`,
          wordBreak: 'break-all',
        }}>
          {urlOk
            ? `✅ Supabase URL: ${SUPABASE_URL}`
            : `❌ VITE_SUPABASE_URL não encontrada (valor: "${SUPABASE_URL}"). Configure em Vercel → Settings → Environment Variables e faça Redeploy.`
          }
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com" icon={<Mail size={16} />} required autoComplete="email" />
          <Input label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••" icon={<Lock size={16} />} required autoComplete="current-password" />
          {error && <div className="login-error">{error}</div>}
          <Button type="submit" loading={loading} className="login-submit">Entrar</Button>
        </form>
      </div>
    </div>
  )
}
