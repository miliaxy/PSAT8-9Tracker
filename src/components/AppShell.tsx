import {
  BarChart3,
  BookOpen,
  CalendarDays,
  Calculator,
  ClipboardPenLine,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  PenLine,
  Target,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { Student } from '../types/models'

export type ViewId = 'today' | 'week' | 'scores' | 'reading-writing' | 'math' | 'books' | 'how-it-works' | 'planner'

interface AppShellProps {
  activeView: ViewId
  onNavigate: (view: ViewId) => void
  student: Student
  dataMode: 'demo' | 'private'
  showPlanner?: boolean
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
  { id: 'how-it-works', label: 'How Coaching Works', shortLabel: 'Rules', icon: ListChecks },
  { id: 'planner', label: 'Planning Room', shortLabel: 'Plan', icon: ClipboardPenLine },
]

const mobilePrimaryViews: ViewId[] = ['today', 'week', 'reading-writing', 'math']

const viewTitles: Record<ViewId, string> = {
  today: 'Today',
  week: 'Weekly Plan',
  scores: 'Scores',
  'reading-writing': 'Reading & Writing',
  math: 'Math',
  books: 'Books & Resources',
  'how-it-works': 'How Coaching Works',
  planner: 'Planning Room',
}

export function AppShell({ activeView, onNavigate, student, dataMode, showPlanner = false, accountLabel, onSignOut, children }: AppShellProps) {
  const visibleNavItems = navItems.filter((item) => item.id !== 'planner' || showPlanner)
  const mobilePrimaryItems = visibleNavItems.filter((item) => mobilePrimaryViews.includes(item.id))
  const mobileMoreItems = visibleNavItems.filter((item) => !mobilePrimaryViews.includes(item.id))
  const [moreOpen, setMoreOpen] = useState(false)
  const mainRef = useRef<HTMLElement>(null)
  const moreDialogRef = useRef<HTMLDialogElement>(null)
  const initialView = useRef(activeView)

  useEffect(() => {
    document.title = `${viewTitles[activeView]} · PSAT Pathway`
    if (initialView.current !== activeView) {
      mainRef.current?.focus({ preventScroll: true })
      initialView.current = activeView
    }
  }, [activeView])

  useEffect(() => {
    const dialog = moreDialogRef.current
    if (!dialog) return
    if (moreOpen && !dialog.open) dialog.showModal()
    if (!moreOpen && dialog.open) dialog.close()
  }, [moreOpen])

  const navigate = (view: ViewId) => {
    setMoreOpen(false)
    onNavigate(view)
  }

  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">Skip to main content</a>
      <aside className="sidebar">
        <button className="brand" onClick={() => navigate('today')} aria-label="Go to Today">
          <span className="brand__mark"><Target size={21} /></span>
          <span>
            <strong>PSAT Pathway</strong>
            <small>Coach & tracker</small>
          </span>
        </button>

        <nav className="sidebar__nav" aria-label="Main navigation">
          <p>Workspace</p>
          {visibleNavItems.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              className={activeView === id ? 'nav-item nav-item--active' : 'nav-item'}
              onClick={() => navigate(id)}
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
          <button className="brand brand--mobile" onClick={() => navigate('today')} aria-label="Go to Today">
            <span className="brand__mark"><Target size={18} /></span>
            <strong>PSAT Pathway</strong>
          </button>
          <button className="mobile-account" type="button" onClick={() => setMoreOpen(true)} aria-label="Open account and more pages" aria-expanded={moreOpen} aria-haspopup="dialog" aria-controls="mobile-more-dialog">
            <span className="avatar avatar--small">{student.avatarInitials}</span>
          </button>
        </div>
        <main className="content" id="main-content" ref={mainRef} tabIndex={-1} aria-label={`${viewTitles[activeView]} page`}>{children}</main>
      </div>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        {mobilePrimaryItems.map(({ id, shortLabel, icon: Icon }) => (
          <button
            key={id}
            className={activeView === id ? 'mobile-nav__item mobile-nav__item--active' : 'mobile-nav__item'}
            onClick={() => navigate(id)}
            aria-current={activeView === id ? 'page' : undefined}
          >
            <Icon size={19} />
            <span>{shortLabel}</span>
          </button>
        ))}
        <button
          className={mobileMoreItems.some((item) => item.id === activeView) ? 'mobile-nav__item mobile-nav__item--active' : 'mobile-nav__item'}
          type="button"
          onClick={() => setMoreOpen(true)}
          aria-expanded={moreOpen}
          aria-haspopup="dialog"
          aria-controls="mobile-more-dialog"
        >
          <Menu size={19} />
          <span>More</span>
        </button>
      </nav>

      <dialog
        id="mobile-more-dialog"
        className="mobile-more-dialog"
        ref={moreDialogRef}
        aria-labelledby="mobile-more-title"
        onClose={() => setMoreOpen(false)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setMoreOpen(false)
        }}
      >
        <div className="mobile-more-sheet">
          <div className="mobile-more-sheet__header">
            <div>
              <span className="eyebrow">Workspace</span>
              <h2 id="mobile-more-title">More pages</h2>
            </div>
            <button className="icon-button" type="button" onClick={() => setMoreOpen(false)} aria-label="Close more pages"><X size={20} /></button>
          </div>
          <nav className="mobile-more-grid" aria-label="More pages">
            {mobileMoreItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={activeView === id ? 'mobile-more-item mobile-more-item--active' : 'mobile-more-item'}
                type="button"
                onClick={() => navigate(id)}
                aria-current={activeView === id ? 'page' : undefined}
              >
                <Icon size={20} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <div className="mobile-account-card">
            <span className="avatar">{student.avatarInitials}</span>
            <div><strong>{student.firstName}</strong><small>{dataMode === 'private' ? 'Private profile' : 'Demo profile'}</small></div>
            {onSignOut && <button type="button" onClick={() => { setMoreOpen(false); onSignOut() }}><LogOut size={15} /> Sign out</button>}
          </div>
        </div>
      </dialog>
    </div>
  )
}
