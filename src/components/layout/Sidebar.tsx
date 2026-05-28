import { NavLink } from 'react-router-dom'
import { LayoutDashboard, BookOpen, Zap, Users, Settings, LogOut, ChevronLeft, ChevronRight, Brain } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import { ROLE_PERMISSIONS } from '../../types'

const NAV_ITEMS = [
  { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard', resource: 'dashboard' },
  { to: '/moodle', icon: <BookOpen size={20} />, label: 'Dados Moodle', resource: 'moodle' },
  { to: '/automations', icon: <Zap size={20} />, label: 'Automações', resource: 'automations' },
  { to: '/users', icon: <Users size={20} />, label: 'Usuários', resource: 'users' },
  { to: '/settings', icon: <Settings size={20} />, label: 'Ajustes', resource: 'settings' },
]

export function Sidebar() {
  const { appUser, logout } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const allowed = appUser ? ROLE_PERMISSIONS[appUser.role] : []

  return (
    <aside className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar__logo">
        <div className="sidebar__logo-icon"><Brain size={22} /></div>
        {!collapsed && (
          <div className="sidebar__logo-text">
            <span className="sidebar__logo-title">ONG Platform</span>
            <span className="sidebar__logo-sub">Saúde Mental</span>
          </div>
        )}
      </div>

      <nav className="sidebar__nav">
        {NAV_ITEMS.filter((item) => allowed.includes(item.resource)).map((item) => (
          <NavLink key={item.to} to={item.to} title={collapsed ? item.label : undefined}
            className={({ isActive }) => `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`}
          >
            <span className="sidebar__link-icon">{item.icon}</span>
            {!collapsed && <span className="sidebar__link-label">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="sidebar__footer">
        {appUser && (
          <div className="sidebar__user" title={collapsed ? appUser.displayName : undefined}>
            <div className="sidebar__avatar">{appUser.displayName.charAt(0).toUpperCase()}</div>
            {!collapsed && (
              <div className="sidebar__user-info">
                <span className="sidebar__user-name">{appUser.displayName}</span>
                <span className="sidebar__user-role">{appUser.role}</span>
              </div>
            )}
          </div>
        )}
        <button className="sidebar__logout" onClick={logout} title="Sair">
          <LogOut size={18} />
          {!collapsed && <span>Sair</span>}
        </button>
        <button className="sidebar__collapse" onClick={() => setCollapsed((c) => !c)} aria-label={collapsed ? 'Expandir' : 'Recolher'}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
    </aside>
  )
}
