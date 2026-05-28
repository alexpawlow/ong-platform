type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'neutral' | 'info'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  dot?: boolean
}

export function Badge({ children, variant = 'neutral', dot = false }: BadgeProps) {
  return (
    <span className={`badge badge--${variant}`}>
      {dot && <span className="badge__dot" />}
      {children}
    </span>
  )
}

export function RoleBadge({ role }: { role: string }) {
  const map: Record<string, BadgeVariant> = {
    admin: 'danger',
    manager: 'primary',
    viewer: 'neutral',
  }
  const labels: Record<string, string> = {
    admin: 'Admin',
    manager: 'Gestor',
    viewer: 'Visualizador',
  }
  return <Badge variant={map[role] || 'neutral'}>{labels[role] || role}</Badge>
}

export function StatusBadge({ active }: { active: boolean }) {
  return (
    <Badge variant={active ? 'success' : 'neutral'} dot>
      {active ? 'Ativo' : 'Inativo'}
    </Badge>
  )
}
