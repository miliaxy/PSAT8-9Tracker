import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { LogOut, RefreshCw, ShieldCheck, UserRoundPlus } from 'lucide-react'
import { AuthProvider, useAuth } from './auth/AuthContext'
import { AuthScreen } from './auth/AuthScreen'
import { AppShell, type ViewId } from './components/AppShell'
import { demoDashboardBundle } from './data/demoData'
import { loadAccessibleStudents, loadStudentDashboard, setTaskCompletion } from './services/studentRepository'
import type { DashboardBundle } from './types/models'

const TodayPage = lazy(() => import('./pages/TodayPage').then((module) => ({ default: module.TodayPage })))
const WeekPage = lazy(() => import('./pages/WeekPage').then((module) => ({ default: module.WeekPage })))
const ScoresPage = lazy(() => import('./pages/ScoresPage').then((module) => ({ default: module.ScoresPage })))
const SkillPage = lazy(() => import('./pages/SkillPage').then((module) => ({ default: module.SkillPage })))
const BooksPage = lazy(() => import('./pages/BooksPage').then((module) => ({ default: module.BooksPage })))
const PlannerPage = lazy(() => import('./pages/PlannerPage').then((module) => ({ default: module.PlannerPage })))

const validViews: ViewId[] = ['today', 'week', 'scores', 'reading-writing', 'math', 'books', 'planner']
const completionStorageKey = 'psat-pathway-demo-completed-tasks'

function getInitialView(allowPlanner = false): ViewId {
  const hashView = window.location.hash.slice(1) as ViewId
  if (hashView === 'planner' && !allowPlanner) return 'today'
  return validViews.includes(hashView) ? hashView : 'today'
}

function initialCompletion(bundle: DashboardBundle, demoMode: boolean) {
  const completed = bundle.studyPlan.days
    .flatMap((day) => day.tasks)
    .filter((task) => task.initialCompleted)
    .map((task) => task.id)

  if (!demoMode) return new Set(completed)

  try {
    const saved = window.localStorage.getItem(completionStorageKey)
    return new Set<string>(saved ? JSON.parse(saved) as string[] : completed)
  } catch {
    return new Set<string>(completed)
  }
}

function Dashboard({ bundle, demoMode, onDataChanged }: { bundle: DashboardBundle; demoMode: boolean; onDataChanged?: () => void }) {
  const { profile, signOut } = useAuth()
  const canPlan = !demoMode && profile?.role === 'parent_admin'
  const [activeView, setActiveView] = useState<ViewId>(() => getInitialView(canPlan))
  const [completedTaskIds, setCompletedTaskIds] = useState(() => initialCompletion(bundle, demoMode))
  const [taskError, setTaskError] = useState<string | null>(null)

  useEffect(() => {
    const handleHashChange = () => setActiveView(getInitialView(canPlan))
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [canPlan])

  const allTodayTaskIds = useMemo(() => new Set(bundle.todayTasks.map((task) => task.id)), [bundle.todayTasks])

  const navigate = (view: ViewId) => {
    setActiveView(view)
    window.location.hash = view
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleTask = (taskId: string) => {
    const wasCompleted = completedTaskIds.has(taskId)
    const next = new Set(completedTaskIds)
    if (wasCompleted) next.delete(taskId)
    else next.add(taskId)
    setCompletedTaskIds(next)
    setTaskError(null)

    if (demoMode) {
      try {
        window.localStorage.setItem(completionStorageKey, JSON.stringify([...next]))
      } catch {
        // The demo remains usable if browser storage is unavailable.
      }
      return
    }

    void setTaskCompletion(bundle.student.id, taskId, !wasCompleted).catch(() => {
      setCompletedTaskIds(completedTaskIds)
      setTaskError('That task change could not be saved. Please try again.')
    })
  }

  const renderView = () => {
    switch (activeView) {
      case 'today':
        return (
          <TodayPage
            student={bundle.student}
            tasks={bundle.todayTasks}
            plan={bundle.studyPlan}
            practiceTests={bundle.practiceTests}
            skills={bundle.skills}
            completedTaskIds={new Set([...completedTaskIds].filter((id) => allTodayTaskIds.has(id)))}
            onToggleTask={toggleTask}
            onViewWeek={() => navigate('week')}
          />
        )
      case 'week':
        return <WeekPage plan={bundle.studyPlan} completedTaskIds={completedTaskIds} onToggleTask={toggleTask} />
      case 'scores':
        return <ScoresPage tests={bundle.practiceTests} targetScore={bundle.student.targetScore} />
      case 'reading-writing':
        return <SkillPage key="reading-writing" section="Reading & Writing" allSkills={bundle.skills} drills={bundle.drills} tests={bundle.practiceTests} />
      case 'math':
        return <SkillPage key="math" section="Math" allSkills={bundle.skills} drills={bundle.drills} tests={bundle.practiceTests} />
      case 'books':
        return <BooksPage books={bundle.books} resources={bundle.learningResources} />
      case 'planner':
        return canPlan
          ? <PlannerPage student={bundle.student} skills={bundle.skills} onPublished={onDataChanged ?? (() => undefined)} />
          : <TodayPage student={bundle.student} tasks={bundle.todayTasks} plan={bundle.studyPlan} practiceTests={bundle.practiceTests} skills={bundle.skills} completedTaskIds={new Set([...completedTaskIds].filter((id) => allTodayTaskIds.has(id)))} onToggleTask={toggleTask} onViewWeek={() => navigate('week')} />
    }
  }

  return (
    <AppShell
      activeView={activeView}
      onNavigate={navigate}
      student={bundle.student}
      dataMode={demoMode ? 'demo' : 'private'}
      showPlanner={canPlan}
      accountLabel={profile?.displayName}
      onSignOut={demoMode ? undefined : () => void signOut()}
    >
      {!demoMode && (
        <div className="privacy-banner"><ShieldCheck size={15} /> Private workspace · database access is limited to linked family accounts.</div>
      )}
      {taskError && <div className="inline-error" role="alert">{taskError}</div>}
      <Suspense fallback={<div className="page-loading"><span />Loading your dashboard…</div>}>
        {renderView()}
      </Suspense>
    </AppShell>
  )
}

function PrivateWorkspace() {
  const { status, profile, signOut } = useAuth()
  const [bundle, setBundle] = useState<DashboardBundle | null>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading')
  const [reload, setReload] = useState(0)

  useEffect(() => {
    if (status !== 'authenticated') return
    let active = true
    void loadAccessibleStudents()
      .then(async (students) => {
        if (!students.length) return null
        return loadStudentDashboard(students[0])
      })
      .then((result) => {
        if (!active) return
        if (!result) {
          setBundle(null)
          setState('empty')
        } else {
          setBundle(result)
          setState('ready')
        }
      })
      .catch(() => {
        if (active) setState('error')
      })
    return () => { active = false }
  }, [reload, status])

  if (state === 'loading') return <div className="workspace-state"><div className="page-loading"><span />Opening your private workspace…</div></div>
  if (state === 'ready' && bundle) return <Dashboard bundle={bundle} demoMode={false} onDataChanged={() => setReload((value) => value + 1)} />

  return (
    <main className="workspace-state">
      <div className="workspace-card">
        <div className="workspace-card__icon">{state === 'empty' ? <UserRoundPlus size={25} /> : <RefreshCw size={25} />}</div>
        <span className="eyebrow">Private workspace</span>
        <h1>{state === 'empty' ? 'Your account is ready' : 'We could not load the dashboard'}</h1>
        <p>
          {state === 'empty'
            ? `No student profile is linked to ${profile?.displayName || 'this account'} yet. This is the safe starting point before private data is imported.`
            : 'Your sign-in is still active. Check the Supabase configuration and try again.'}
        </p>
        {state === 'error' && <button className="button button--primary" onClick={() => { setState('loading'); setReload((value) => value + 1) }}><RefreshCw size={16} /> Try again</button>}
        <button className="workspace-signout" onClick={() => void signOut()}><LogOut size={15} /> Sign out</button>
      </div>
    </main>
  )
}

function AppGate() {
  const { mode, status } = useAuth()
  if (mode === 'demo') return <Dashboard bundle={demoDashboardBundle} demoMode />
  if (status === 'loading') return <div className="workspace-state"><div className="page-loading"><span />Checking your secure session…</div></div>
  if (status === 'anonymous') return <AuthScreen />
  return <PrivateWorkspace />
}

export default function App() {
  return <AuthProvider><AppGate /></AuthProvider>
}
