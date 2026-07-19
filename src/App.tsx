import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { AppShell, type ViewId } from './components/AppShell'
import {
  books,
  demoStudent,
  demoStudyPlan,
  drills,
  learningResources,
  practiceTests,
  skills,
  todayTasks,
} from './data/demoData'

const TodayPage = lazy(() => import('./pages/TodayPage').then((module) => ({ default: module.TodayPage })))
const WeekPage = lazy(() => import('./pages/WeekPage').then((module) => ({ default: module.WeekPage })))
const ScoresPage = lazy(() => import('./pages/ScoresPage').then((module) => ({ default: module.ScoresPage })))
const SkillPage = lazy(() => import('./pages/SkillPage').then((module) => ({ default: module.SkillPage })))
const BooksPage = lazy(() => import('./pages/BooksPage').then((module) => ({ default: module.BooksPage })))

const validViews: ViewId[] = ['today', 'week', 'scores', 'reading-writing', 'math', 'books']
const completionStorageKey = 'psat-pathway-demo-completed-tasks'

function getInitialView(): ViewId {
  const hashView = window.location.hash.slice(1) as ViewId
  return validViews.includes(hashView) ? hashView : 'today'
}

function getInitialCompletedTasks() {
  const allPlanTasks = demoStudyPlan.days.flatMap((day) => day.tasks)
  const demoCompleted = allPlanTasks.filter((task) => task.initialCompleted).map((task) => task.id)

  try {
    const saved = window.localStorage.getItem(completionStorageKey)
    return new Set<string>(saved ? (JSON.parse(saved) as string[]) : demoCompleted)
  } catch {
    return new Set<string>(demoCompleted)
  }
}

export default function App() {
  const [activeView, setActiveView] = useState<ViewId>(getInitialView)
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(getInitialCompletedTasks)

  useEffect(() => {
    const handleHashChange = () => setActiveView(getInitialView())
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const allTodayTaskIds = useMemo(() => new Set(todayTasks.map((task) => task.id)), [])

  const navigate = (view: ViewId) => {
    setActiveView(view)
    window.location.hash = view
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const toggleTask = (taskId: string) => {
    setCompletedTaskIds((previous) => {
      const next = new Set(previous)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)

      try {
        window.localStorage.setItem(completionStorageKey, JSON.stringify([...next]))
      } catch {
        // The dashboard remains usable if browser storage is unavailable.
      }
      return next
    })
  }

  const renderView = () => {
    switch (activeView) {
      case 'today':
        return (
          <TodayPage
            student={demoStudent}
            tasks={todayTasks}
            completedTaskIds={new Set([...completedTaskIds].filter((id) => allTodayTaskIds.has(id)))}
            onToggleTask={toggleTask}
            onViewWeek={() => navigate('week')}
          />
        )
      case 'week':
        return <WeekPage plan={demoStudyPlan} completedTaskIds={completedTaskIds} onToggleTask={toggleTask} />
      case 'scores':
        return <ScoresPage tests={practiceTests} targetScore={demoStudent.targetScore} />
      case 'reading-writing':
        return <SkillPage key="reading-writing" section="Reading & Writing" allSkills={skills} drills={drills} tests={practiceTests} />
      case 'math':
        return <SkillPage key="math" section="Math" allSkills={skills} drills={drills} tests={practiceTests} />
      case 'books':
        return <BooksPage books={books} resources={learningResources} />
    }
  }

  return (
    <AppShell activeView={activeView} onNavigate={navigate} student={demoStudent}>
      <Suspense fallback={<div className="page-loading"><span />Loading your dashboard…</div>}>
        {renderView()}
      </Suspense>
    </AppShell>
  )
}
