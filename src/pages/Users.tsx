import { useState, useEffect } from 'react'
import { UserPlus, Trash2, Edit2, Shield, Eye, EyeOff } from 'lucide-react'
import { Button } from '../components/ui/Button'
import { Input, Select } from '../components/ui/Input'
import { RoleBadge, StatusBadge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { getUsers, updateUser, deleteUser, createUser, generateId } from '../lib/storage'
import { useAuth } from '../contexts/AuthContext'
import type { AppUser, UserRole } from '../types'

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  admin: 'Acesso total — dashboards, Moodle, automações, usuários e ajustes.',
  manager: 'Pode ver dashboards, dados do Moodle e gerenciar automações.',
  viewer: 'Somente leitura — dashboards e dados do Moodle.',
}

const EMPTY_FORM = { displayName: '', email: '', password: '', role: 'viewer' as UserRole, active: true }

export default function Users() {
  const { appUser } = useAuth()
  const [users, setUsers] = useState<AppUser[]>([])
  const [editTarget, setEditTarget] = useState<AppUser | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [form, setForm] = useState({ displayName: '', role: 'viewer' as UserRole, active: true })
  const [inviteForm, setInviteForm] = useState({ ...EMPTY_FORM })
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')

  useEffect(() => { setUsers(getUsers()) }, [])

  function openEdit(user: AppUser) {
    setEditTarget(user)
    setForm({ displayName: user.displayName, role: user.role, active: user.active })
  }

  function handleSave() {
    if (!editTarget) return
    setSaving(true)
    updateUser(editTarget.uid, form)
    setUsers((prev) => prev.map((u) => u.uid === editTarget.uid ? { ...u, ...form } : u))
    setEditTarget(null)
    setSaving(false)
  }

  function handleInvite() {
    if (!inviteForm.displayName || !inviteForm.email || !inviteForm.password) return
    setSaving(true)
    const uid = generateId()
    const newUser: AppUser = { uid, email: inviteForm.email, displayName: inviteForm.displayName, role: inviteForm.role, active: true, createdAt: new Date().toISOString() }
    createUser({ ...newUser, password: inviteForm.password })
    setUsers((prev) => [...prev, newUser])
    setInviteForm({ ...EMPTY_FORM })
    setInviteOpen(false)
    setSaving(false)
  }

  function handleDelete(uid: string) {
    deleteUser(uid)
    setUsers((prev) => prev.filter((u) => u.uid !== uid))
    setDeleteTarget(null)
  }

  const filtered = users.filter((u) =>
    u.displayName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  )
  const isAdmin = appUser?.role === 'admin'

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h2 className="page__title">Usuários e Permissões</h2>
          <p className="page__subtitle">Gerencie o acesso e os papéis dos membros da equipe</p>
        </div>
        {isAdmin && <Button icon={<UserPlus size={16} />} onClick={() => setInviteOpen(true)}>Adicionar usuário</Button>}
      </div>

      <div className="role-cards">
        {(Object.entries(ROLE_DESCRIPTIONS) as [UserRole, string][]).map(([role, desc]) => (
          <div key={role} className={`role-card role-card--${role}`}>
            <div className="role-card__header"><Shield size={16} /><RoleBadge role={role} /></div>
            <p className="role-card__desc">{desc}</p>
            <span className="role-card__count">{users.filter((u) => u.role === role).length} usuário(s)</span>
          </div>
        ))}
      </div>

      <Input placeholder="Buscar por nome ou e-mail..." value={search} onChange={(e) => setSearch(e.target.value)} className="users-search" />

      <div className="chart-card">
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Usuário</th><th>E-mail</th><th>Papel</th><th>Status</th><th>Criado em</th>
                {isAdmin && <th>Ações</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.uid} className={user.uid === appUser?.uid ? 'table-row--highlight' : ''}>
                  <td>
                    <div className="table-user">
                      <div className="table-user__avatar">{user.displayName.charAt(0).toUpperCase()}</div>
                      <span className="table-user__name">{user.displayName}{user.uid === appUser?.uid && <span className="table-user__you"> (você)</span>}</span>
                    </div>
                  </td>
                  <td className="text-secondary">{user.email}</td>
                  <td><RoleBadge role={user.role} /></td>
                  <td><StatusBadge active={user.active} /></td>
                  <td className="text-muted text-sm">{new Date(user.createdAt).toLocaleDateString('pt-BR')}</td>
                  {isAdmin && (
                    <td>
                      <div className="table-actions">
                        <button className="icon-btn" onClick={() => openEdit(user)} title="Editar"><Edit2 size={15} /></button>
                        {user.uid !== appUser?.uid && <button className="icon-btn icon-btn--danger" onClick={() => setDeleteTarget(user.uid)} title="Excluir"><Trash2 size={15} /></button>}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {filtered.length === 0 && <tr><td colSpan={isAdmin ? 6 : 5} className="table-empty">Nenhum usuário encontrado</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Editar usuário" size="sm"
        footer={<div className="modal-footer-row"><Button variant="ghost" onClick={() => setEditTarget(null)}>Cancelar</Button><Button onClick={handleSave} loading={saving}>Salvar</Button></div>}
      >
        <div className="form-stack">
          <Input label="Nome" value={form.displayName} onChange={(e) => setForm({ ...form, displayName: e.target.value })} />
          <Select label="Papel" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}>
            <option value="admin">Admin</option>
            <option value="manager">Gestor</option>
            <option value="viewer">Visualizador</option>
          </Select>
          <div className="alert alert--info">{ROLE_DESCRIPTIONS[form.role]}</div>
          <label className="toggle-field">
            <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} />
            <span>Conta ativa</span>
          </label>
        </div>
      </Modal>

      <Modal open={inviteOpen} onClose={() => setInviteOpen(false)} title="Adicionar usuário" size="sm"
        footer={<div className="modal-footer-row"><Button variant="ghost" onClick={() => setInviteOpen(false)}>Cancelar</Button><Button onClick={handleInvite} loading={saving} disabled={!inviteForm.displayName || !inviteForm.email || !inviteForm.password}>Adicionar</Button></div>}
      >
        <div className="form-stack">
          <Input label="Nome completo" value={inviteForm.displayName} onChange={(e) => setInviteForm({ ...inviteForm, displayName: e.target.value })} placeholder="Ex: Maria Silva" />
          <Input label="E-mail" type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} placeholder="maria@ong.local" />
          <div className="field">
            <label className="field-label">Senha inicial</label>
            <div className="field-wrapper">
              <input className="field-input" type={showPw ? 'text' : 'password'} value={inviteForm.password} onChange={(e) => setInviteForm({ ...inviteForm, password: e.target.value })} placeholder="Mínimo 6 caracteres" style={{ paddingRight: 36 }} />
              <button type="button" onClick={() => setShowPw((v) => !v)} style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
                {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <Select label="Papel" value={inviteForm.role} onChange={(e) => setInviteForm({ ...inviteForm, role: e.target.value as UserRole })}>
            <option value="admin">Admin</option>
            <option value="manager">Gestor</option>
            <option value="viewer">Visualizador</option>
          </Select>
          <div className="alert alert--info">{ROLE_DESCRIPTIONS[inviteForm.role]}</div>
        </div>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Remover usuário" size="sm"
        footer={<div className="modal-footer-row"><Button variant="ghost" onClick={() => setDeleteTarget(null)}>Cancelar</Button><Button variant="danger" onClick={() => deleteTarget && handleDelete(deleteTarget)}>Remover</Button></div>}
      >
        <p>Esta ação remove o acesso deste usuário à plataforma.</p>
      </Modal>
    </div>
  )
}
