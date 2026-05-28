import type { ReactNode } from 'react'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: 'sm' | 'md' | 'lg' | 'none'
}

export function Card({ children, className = '', padding = 'md' }: CardProps) {
  return (
    <div className={`card card-pad-${padding} ${className}`}>
      {children}
    </div>
  )
}

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: ReactNode
  trend?: { value: number; label: string }
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'info'
}

export function MetricCard({ title, value, subtitle, icon, trend, color = 'primary' }: MetricCardProps) {
  const trendPositive = trend && trend.value >= 0
  return (
    <div className={`metric-card metric-card--${color}`}>
      <div className="metric-card__header">
        <div className="metric-card__icon">{icon}</div>
        {trend && (
          <span className={`metric-card__trend ${trendPositive ? 'metric-card__trend--up' : 'metric-card__trend--down'}`}>
            {trendPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
          </span>
        )}
      </div>
      <div className="metric-card__value">{value}</div>
      <div className="metric-card__title">{title}</div>
      {subtitle && <div className="metric-card__subtitle">{subtitle}</div>}
      {trend && <div className="metric-card__trend-label">{trend.label}</div>}
    </div>
  )
}
