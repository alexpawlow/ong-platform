import { useState, type FormEvent } from 'react'
import { Brain, Mail, Lock, Sun, Moon } from 'lucide-react'
import { login } from '../lib/localAuth'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { useTheme } from '../contexts/ThemeContext'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const urlOk = typeof SUPABASE_URL === 'string' && SUPABASE_URL.startsWith('https://')

function ts() {
  return new Date().toISOString().split('T')[1].slice(0, 8)
}

export default function Login() {
  const { theme, toggleTheme } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [steps, setSteps] = useState<string[]>([])

  function log(msg: string) {
    console.log(`[Login] ${msg}`)
    setSteps(prev => [...prev, `${ts()} ${msg}`])
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setSteps([])
    setLoading(true)

    log('Iniciando login...')
    try {
      log('Chamando fetch direto ao endpoint auth...')
      await login(email, password)
      log('✅ login() retornou — sessão injetada')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      log(`❌ Erro: ${msg}`)
      setError(msg)
    } finally {
      log('finally → parando spinner')
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

        {/* Status da URL */}
        <div style={{
          fontSize: 11, padding: '6px 10px', borderRadius: 8,
          background: urlOk ? '#f0fdf4' : '#fef2f2',
          color: urlOk ? '#16a34a' : '#dc2626',
          border: `1px solid ${urlOk ? '#bbf7d0' : '#fecaca'}`,
        }}>
          {urlOk ? `✅ Supabase URL ok` : `❌ VITE_SUPABASE_URL não encontrada`}
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <Input label="E-mail" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com" icon={<Mail size={16} />} required autoComplete="email" />
          <Input label="Senha" type="password" value={password} onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••" icon={<Lock size={16} />} required autoComplete="current-password" />
          {error && <div className="login-error">{error}</div>}
          <Button type="submit" loading={loading} className="login-submit">Entrar</Button>
        </form>

        {/* Debug — passos em tempo real */}
        {steps.length > 0 && (
          <div style={{
            fontSize: 11, fontFamily: 'monospace', background: '#0f172a', color: '#94a3b8',
            borderRadius: 8, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 3,
          }}>
            {steps.map((s, i) => (
              <span key={i} style={{ color: s.includes('✅') ? '#4ade80' : s.includes('❌') ? '#f87171' : '#94a3b8' }}>
                {s}
              </span>
            ))}
            {loading && <span style={{ color: '#facc15' }}>⏳ aguardando resposta...</span>}
          </div>
        )}
      </div>
    </div>
  )
}
