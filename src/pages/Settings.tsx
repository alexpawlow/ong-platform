import { useState } from 'react'
import { Lock, Save, CheckCircle2, AlertCircle, BookOpen, Mail } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { changePassword } from '../lib/localAuth'
import { useAuth } from '../contexts/AuthContext'

type Status = 'idle' | 'loading' | 'success' | 'error'

export default function Settings() {
  const { appUser } = useAuth()
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' })
  const [pwStatus, setPwStatus] = useState<Status>('idle')
  const [pwError, setPwError] = useState('')

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault()
    setPwError('')
    if (pwForm.next !== pwForm.confirm) { setPwError('As senhas não coincidem.'); return }
    if (!appUser) return
    setPwStatus('loading')
    try {
      await changePassword(appUser.uid, pwForm.current, pwForm.next)
      setPwStatus('success')
      setPwForm({ current: '', next: '', confirm: '' })
      setTimeout(() => setPwStatus('idle'), 4000)
    } catch (err: unknown) {
      setPwStatus('error')
      setPwError(err instanceof Error ? err.message : 'Erro ao alterar senha.')
    }
  }

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h2 className="page__title">Ajustes</h2>
          <p className="page__subtitle">Configurações da sua conta e integrações</p>
        </div>
      </div>

      <div className="settings-grid">
        <Card>
          <div className="settings-section">
            <h3 className="settings-section__title">Perfil</h3>
            <div className="settings-profile">
              <div className="settings-profile__avatar">{appUser?.displayName.charAt(0).toUpperCase()}</div>
              <div>
                <p className="settings-profile__name">{appUser?.displayName}</p>
                <p className="settings-profile__email">{appUser?.email}</p>
                <p className="settings-profile__role">Papel: <strong>{appUser?.role}</strong></p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <div className="settings-section">
            <h3 className="settings-section__title"><Lock size={16} /> Alterar Senha</h3>
            <form onSubmit={handlePasswordChange} className="form-stack">
              <Input label="Senha atual" type="password" value={pwForm.current} onChange={(e) => setPwForm({ ...pwForm, current: e.target.value })} placeholder="••••••••" required autoComplete="current-password" />
              <Input label="Nova senha" type="password" value={pwForm.next} onChange={(e) => setPwForm({ ...pwForm, next: e.target.value })} placeholder="••••••••" hint="Mínimo de 6 caracteres." required autoComplete="new-password" />
              <Input label="Confirmar nova senha" type="password" value={pwForm.confirm} onChange={(e) => setPwForm({ ...pwForm, confirm: e.target.value })} placeholder="••••••••" required autoComplete="new-password" />
              {pwError && <div className="alert alert--error"><AlertCircle size={15} /> {pwError}</div>}
              {pwStatus === 'success' && <div className="alert alert--success"><CheckCircle2 size={15} /> Senha alterada com sucesso!</div>}
              <Button type="submit" loading={pwStatus === 'loading'} icon={<Save size={15} />}>Salvar nova senha</Button>
            </form>
          </div>
        </Card>

        <Card>
          <div className="settings-section">
            <h3 className="settings-section__title"><BookOpen size={16} /> Integração Moodle</h3>
            <p className="text-secondary">Configure a URL e o token da API do Moodle na página <a href="/moodle" className="link">Dados do Moodle</a>.</p>
            <div className="alert alert--info" style={{ marginTop: 12 }}>
              As configurações ficam salvas no Supabase e são compartilhadas entre todos os usuários admin.
            </div>
          </div>
        </Card>

        <Card>
          <div className="settings-section">
            <h3 className="settings-section__title"><Mail size={16} /> Integração Mailchimp</h3>
            <p className="text-secondary">A integração com o Mailchimp será gerenciada via Supabase Edge Functions para proteger sua API key.</p>
            <div className="alert alert--warning" style={{ marginTop: 12 }}>
              <strong>Nunca</strong> insira sua API key do Mailchimp diretamente no frontend.
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
