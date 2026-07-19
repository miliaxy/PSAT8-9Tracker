import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Calculator,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  PenLine,
  Target,
} from 'lucide-react'
import type { Student } from '../types/models'

export type ViewId = 'today' | 'week' | 'scores' | 'reading-writing' | 'math' | 'books'

interface AppShellProps {
  activeView: ViewId
  onNavigate: (view: ViewId) => void
  student: Student
  dataMode: 'demo' | 'private'
  accountLabel?: string
  onSignOut?: () => void
  children: React.ReactNode
}

const navItems: { id: ViewId; label: string; shortLabel: string; icon: typeof LayoutDashboard }[] = [
  { id: 'today', label: 'Today', shortLabel: 'Today', icon: LayoutDashboard },
  { id: 'week', label: 'Week', shortLabel: 'Week', icon: CalendarDays },
  { id: 'scores', label: 'Scores', shortLabel: 'Scores', icon: BarChart3 },
  { id: 'reading-writing', label: 'Reading & Writing', shortLabel: 'R&W', icon: PenLine },
  { id: 'math', label: 'Math', shortLabel: 'Math', icon: Calculator },
  { id: 'books', label: 'Books & Resources', shortLabel: 'Books', icon: BookOpen },
]

export function AppShell({ activeView, onNavigate, student, dataMode, accountLabel, onSignOut, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <button className="brand" onClick={() => onNavigate('today')} aria-label="Go to Today">
          <span className="brand__mark"><Target size={21} /></span>
          <span>
            <strong>PSAT Pathway</strong>
            <small>Coach & tracker</small>
          </span>
        </button>

        <nav className="sidebar__nav" aria-label="Main navigation">
          <p>Workspace</p>
          {navItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={activeView === id ? 'nav-item nav-item--active' : 'nav-item'}
              onClick={() => onNavigate(id)}
              aria-current={activeView === id ? 'page' : undefined}
            >
              <Icon size={19} strokeWidth={2} />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="student-switcher">
            <span className="avatar">{student.avatarInitials}</span>
            <div>
              <strong>{student.firstName}</strong>
              <small>Grade {student.grade} student</small>
            </div>
            <ChevronDown size={15} />
          </div>
          <p className={dataMode === 'private' ? 'demo-label demo-label--private' : 'demo-label'}>
            {dataMode === 'private' ? 'Private profile · Protected data' : 'Demo profile · Local data'}
          </p>
          {onSignOut && (
            <button className="sidebar-signout" onClick={onSignOut} title={`Sign out${accountLabel ? ` ${accountLabel}` : ''}`}>
              <LogOut size={14} /> Sign out
            </button>
          )}
        </div>
      </aside>

      <div className="app-main">
        <div className="mobile-topbar">
          <button className="brand brand--mobile" onClick={() => onNavigate('today')}>
            <span className="brand__mark"><Target size={18} /></span>
            <strong>PSAT Pathway</strong>
          </button>
          <span className="avatar avatar--small">{student.avatarInitials}</span>
        </div>
        <main className="content">{children}</main>
      </div>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {navItems.map(({ id, shortLabel, icon: Icon }) => (
          <button
            key={id}
            className={activeView === id ? 'mobile-nav__item mobile-nav__item--active' : 'mobile-nav__item'}
            onClick={() => onNavigate(id)}
            aria-current={activeView === id ? 'page' : undefined}
          >
            <Icon size={19} />
            <span>{shortLabel}</span>
          </button>
        ))}
      </nav>
    </div>
  )
}
