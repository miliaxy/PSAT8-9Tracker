import type { LucideIcon } from 'lucide-react'
import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react'
import type { CoachingStatus, EvidenceRating, Trend } from '../types/models'
import { statusKey } from '../utils/format'

interface PageHeaderProps {
  eyebrow?: string
  title: string
  description: string
  action?: React.ReactNode
}

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <header className="page-header">
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action && <div className="page-header__action">{action}</div>}
    </header>
  )
}

interface StatCardProps {
  label: string
  value: string | number
  detail: string
  icon: LucideIcon
  tone?: 'violet' | 'teal' | 'gold' | 'blue'
}

export function StatCard({ label, value, detail, icon: Icon, tone = 'violet' }: StatCardProps) {
  return (
    <article className="stat-card">
      <div className={`stat-card__icon stat-card__icon--${tone}`}>
        <Icon size={18} strokeWidth={2.2} />
      </div>
      <div>
        <span className="stat-card__label">{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  )
}

interface ProgressBarProps {
  value?: number
  tone?: 'violet' | 'teal' | 'gold' | 'coral'
  label?: string
}

export function ProgressBar({ value, tone = 'violet', label }: ProgressBarProps) {
  if (value === undefined) {
    return (
      <div className="progress progress--empty" role="img" aria-label={`${label ?? 'Progress'}: no evidence recorded`}>
        <span className="progress__empty-label">No evidence</span>
      </div>
    )
  }

  const boundedValue = Math.max(0, Math.min(100, value))

  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={label}
      aria-valuenow={boundedValue}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`${Math.round(boundedValue)} percent`}
    >
      <span className={`progress__fill progress__fill--${tone}`} style={{ width: `${boundedValue}%` }} />
    </div>
  )
}

export function StatusBadge({ status }: { status: CoachingStatus | EvidenceRating | string }) {
  return <span className={`status-badge status-badge--${statusKey(status)}`}>{status}</span>
}

export function TrendBadge({ trend }: { trend: Trend }) {
  const Icon = trend === 'up' ? ArrowUp : trend === 'down' ? ArrowDown : ArrowRight
  const label = trend === 'up' ? 'Trending up' : trend === 'down' ? 'Trending down' : 'Holding steady'

  return (
    <span className={`trend trend--${trend}`}>
      <Icon size={13} /> {label}
    </span>
  )
}

interface EmptyStateProps {
  title: string
  description: string
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  )
}
