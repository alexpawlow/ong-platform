import type { InputHTMLAttributes, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
  icon?: ReactNode
}

export function Input({ label, error, hint, icon, id, className = '', ...props }: InputProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="field">
      {label && <label className="field-label" htmlFor={inputId}>{label}</label>}
      <div className="field-wrapper">
        {icon && <span className="field-icon">{icon}</span>}
        <input
          id={inputId}
          className={`field-input ${icon ? 'field-input--icon' : ''} ${error ? 'field-input--error' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <p className="field-error">{error}</p>}
      {hint && !error && <p className="field-hint">{hint}</p>}
    </div>
  )
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  children: ReactNode
}

export function Select({ label, error, id, className = '', children, ...props }: SelectProps) {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
  return (
    <div className="field">
      {label && <label className="field-label" htmlFor={inputId}>{label}</label>}
      <select id={inputId} className={`field-input ${error ? 'field-input--error' : ''} ${className}`} {...props}>
        {children}
      </select>
      {error && <p className="field-error">{error}</p>}
    </div>
  )
}
