import { Sun, Moon, Bell } from 'lucide-react'
import { useTheme } from '../../contexts/ThemeContext'
import { useAuth } from '../../contexts/AuthContext'
import { useLocation } from 'react-router-dom'

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/moodle': 'Dados do Moodle',
  '/automations': 'Automações',
  '/users': 'Gerenciamento de Usuários',
  '/settings': 'Ajustes',
}

export function Header() {
  const { theme, toggleTheme } = useTheme()
  const { appUser } = useAuth()
  const { pathname } = useLocation()

  return (
    <header className="header">
      <div className="header__left">
        <h1 className="header__title">{PAGE_TITLES[pathname] || 'ONG Platform'}</h1>
        <span className="header__date">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
        </span>
      </div>
      <div className="header__actions">
        <button className="header__icon-btn" onClick={toggleTheme} aria-label="Alternar tema" title={theme === 'light' ? 'Modo escuro' : 'Modo claro'}>
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
        <button className="header__icon-btn" aria-label="Notificações"><Bell size={18} /></button>
        {appUser && (
          <div className="header__user">
            <div className="header__avatar">{appUser.displayName.charAt(0).toUpperCase()}</div>
            <div className="header__user-info">
              <span className="header__user-name">{appUser.displayName}</span>
              <span className="header__user-email">{appUser.email}</span>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
