import { useState, useEffect } from 'react'
import { Plus, Zap, Play, Pause, Trash2, Edit2 } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input, Select } from '../components/ui/Input'
import { Badge, StatusBadge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { getAutomations, saveAutomation, updateAutomation, deleteAutomation } from '../firebase/firestore'
import { useAuth } from '../contexts/AuthContext'
import type { Automation, AutomationType } from '../types'
import { MOCK_COURSES } from '../services/moodleService'
import { MOCK_AUDIENCES } from '../services/mailchimpService'

const AUTOMATION_LABELS: Record<AutomationType, string> = {
  on_completion: 'Ao concluir curso',
  on_enrollment: 'Ao se matricular',
  on_inactivity: 'Após inatividade',
  weekly_report: 'Relatório semanal',
}

const AUTOMATION_COLORS: Record<AutomationType, 'success' | 'primary' | 'warning' | 'info'> = {
  on_completion: 'success',
  on_enrollment: 'primary',
  on_inactivity: 'warning',
  weekly_report: 'info',
}

const EMPTY = {
  name: '',
  type: 'on_completion' as AutomationType,
  courseId: undefined as number | undefined,
  courseName: undefined as string | undefined,
  mailchimpTag: '',
  mailchimpListId: '',
  inactivityDays: 7,
  active: true,
}

export default function Automations() {
  const { appUser } = useAuth()
  const [automations, setAutomations] = useState<Automation[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [editing, setEditing] = useState<Automation | null>(null)
  const [form, setForm] = useState({ ...EMPTY })
  const [saving, setSaving] = useState(false)

  useEffect(() => { getAutomations().then(setAutomations) }, [])

  function openCreate() {
    setEditing(null)
    setForm({ ...EMPTY })
    setModalOpen(true)
  }

  function openEdit(a: Automation) {
    setEditing(a)
    setForm({ name: a.name, type: a.type, courseId: a.courseId, courseName: a.courseName, mailchimpTag: a.mailchimpTag || '', mailchimpListId: a.mailchimpListId || '', inactivityDays: a.inactivityDays || 7, active: a.active })
    setModalOpen(true)
  }

  async function handleSave() {
    if (!form.name || !appUser) return
    setSaving(true)
    try {
      if (editing) {
        await updateAutomation(editing.id, form)
        setAutomations((prev) => prev.map((a) => a.id === editing.id ? { ...a, ...form } : a))
      } else {
        const id = await saveAutomation({ ...form, runCount: 0, createdBy: appUser.uid, createdAt: new Date().toISOString() })
        setAutomations((prev) => [{ id, ...form, runCount: 0, createdBy: appUser.uid, createdAt: new Date().toISOString() }, ...prev])
      }
      setModalOpen(false)
    } finally {
      setSaving(false)
    }
  }

  async function handleToggle(a: Automation) {
    await updateAutomation(a.id, { active: !a.active })
    setAutomations((prev) => prev.map((x) => x.id === a.id ? { ...x, active: !a.active } : x))
  }

  async function handleDelete(id: string) {
    await deleteAutomation(id)
    setAutomations((prev) => prev.filter((a) => a.id !== id))
    setDeleteTarget(null)
  }

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h2 className="page__title">Automações</h2>
          <p className="page__subtitle">Fluxos automáticos entre Moodle e Mailchimp</p>
        </div>
        <Button icon={<Plus size={16} />} onClick={openCreate}>Nova Automação</Button>
      </div>

      {automations.length === 0 ? (
        <div className="empty-state">
          <Zap size={40} className="empty-state__icon" />
          <h3>Nenhuma automação criada</h3>
          <p>Crie fluxos para sincronizar dados do Moodle com o Mailchimp automaticamente.</p>
          <Button icon={<Plus size={16} />} onClick={openCreate}>Criar primeira automação</Button>
        </div>
      ) : (
        <div className="automations-list">
          {automations.map((a) => (
            <div key={a.id} className="automation-card">
              <div className="automation-card__left">
                <div className={`automation-card__icon automation-card__icon--${AUTOMATION_COLORS[a.type]}`}>
                  <Zap size={18} />
                </div>
                <div className="automation-card__info">
                  <h4 className="automation-card__name">{a.name}</h4>
                  <div className="automation-card__meta">
                    <Badge variant={AUTOMATION_COLORS[a.type]}>{AUTOMATION_LABELS[a.type]}</Badge>
                    {a.courseName && <span className="text-muted">· {a.courseName}</span>}
                    {a.mailchimpTag && <span className="text-muted">· Tag: {a.mailchimpTag}</span>}
                  </div>
                  <div className="automation-card__stats">
                    <span>{a.runCount} execuções</span>
                    {a.lastRun && <span>· Última: {new Date(a.lastRun).toLocaleString('pt-BR')}</span>}
                    <span>· Criada em {new Date(a.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
              </div>
              <div className="automation-card__actions">
                <StatusBadge active={a.active} />
                <button className="icon-btn" onClick={() => handleToggle(a)} title={a.active ? 'Pausar' : 'Ativar'}>
                  {a.active ? <Pause size={16} /> : <Play size={16} />}
                </button>
                <button className="icon-btn" onClick={() => openEdit(a)} title="Editar"><Edit2 size={16} /></button>
                <button className="icon-btn icon-btn--danger" onClick={() => setDeleteTarget(a.id)} title="Excluir"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Automação' : 'Nova Automação'} size="md"
        footer={<div className="modal-footer-row"><Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button><Button onClick={handleSave} loading={saving}>Salvar</Button></div>}
      >
        <div className="form-stack">
          <Input label="Nome da automação" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ex: Concluintes → Tag Mailchimp" />
          <Select label="Tipo de gatilho" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as AutomationType })}>
            {Object.entries(AUTOMATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
          {(form.type !== 'weekly_report') && (
            <Select label="Curso" value={form.courseId || ''} onChange={(e) => { const c = MOCK_COURSES.find((x) => x.id === Number(e.target.value)); setForm({ ...form, courseId: Number(e.target.value) || undefined, courseName: c?.fullname }) }}>
              <option value="">Todos os cursos</option>
              {MOCK_COURSES.map((c) => <option key={c.id} value={c.id}>{c.shortname} — {c.fullname}</option>)}
            </Select>
          )}
          {form.type === 'on_inactivity' && (
            <Input label="Dias de inatividade" type="number" min={1} max={90} value={form.inactivityDays} onChange={(e) => setForm({ ...form, inactivityDays: Number(e.target.value) })} />
          )}
          <Select label="Lista Mailchimp" value={form.mailchimpListId || ''} onChange={(e) => setForm({ ...form, mailchimpListId: e.target.value })}>
            <option value="">Selecionar lista</option>
            {MOCK_AUDIENCES.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
          <Input label="Tag a aplicar no Mailchimp" value={form.mailchimpTag || ''} onChange={(e) => setForm({ ...form, mailchimpTag: e.target.value })} placeholder="Ex: concluinte-modulo1" hint="Tag adicionada ao contato no Mailchimp quando a automação disparar." />
          <label className="toggle-field">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            <span>Ativar automação imediatamente</span>
          </label>
        </div>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Excluir automação" size="sm"
        footer={<div className="modal-footer-row"><Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Button><Button variant="danger" onClick={() => deleteTarget && handleDelete(deleteTarget)}>Excluir</Button></div>}
      >
        <p>Tem certeza que deseja excluir esta automação? Esta ação não pode ser desfeita.</p>
      </Modal>
    </div>
  )
}
