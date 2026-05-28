import { useState, type FormEvent } from 'react'
import { Brain, Mail, Lock, Sun, Moon } from 'lucide-react'
import { login } from '../lib/localAuth'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { useTheme } from '../contexts/ThemeContext'

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
      // AuthContext detecta o login via onAuthStateChange — redirecionamento automático
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
