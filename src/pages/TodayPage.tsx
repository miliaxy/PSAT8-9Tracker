import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleGauge,
  Clock3,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'
import { TaskCard } from '../components/TaskCard'
import { EmptyState, PageHeader, ProgressBar, StatCard } from '../components/ui'
import type { DailyTask, Drill, PracticeTest, Skill, Student, StudyPlan } from '../types/models'
import { daysBetween, formatDate, formatLongDate } from '../utils/format'

interface TodayPageProps {
  student: Student
  tasks: DailyTask[]
  plan: StudyPlan
  practiceTests: PracticeTest[]
  drills: Drill[]
  skills: Skill[]
  completedTaskIds: Set<string>
  onToggleTask: (taskId: string) => void
  onViewWeek: () => void
  canRecordResults: boolean
  onResultSaved: () => void
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(dateKey: string, days: number) {
  const date = new Date(`${dateKey}T12:00:00`)
  date.setDate(date.getDate() + days)
  return localDateKey(date)
}

export function TodayPage({ student, tasks, plan, practiceTests, drills, skills, completedTaskIds, onToggleTask, onViewWeek, canRecordResults, onResultSaved }: TodayPageProps) {
  const todayKey = localDateKey()
  const today = plan.days.find((day) => day.date === todayKey)
  const tomorrowKey = addDays(todayKey, 1)
  const tomorrow = plan.days.find((day) => day.date === tomorrowKey)
  const latestTest = practiceTests.at(-1)
  const previousTest = practiceTests.at(-2)
  const latestGain = latestTest && previousTest ? latestTest.totalScore - previousTest.totalScore : 0
  const strongSkills = skills.filter((skill) => ['Strong', 'Mastered'].includes(skill.combinedStatus)).length
  const todaySkillIds = new Set(tasks.flatMap((task) => task.skillIds))
  const todaySkills = skills.filter((skill) => todaySkillIds.has(skill.id))
  const completedCount = tasks.filter((task) => completedTaskIds.has(task.id)).length
  const totalMinutes = tasks.reduce((total, task) => total + task.minutes, 0)
  const remainingMinutes = tasks
    .filter((task) => !completedTaskIds.has(task.id))
    .reduce((total, task) => total + task.minutes, 0)
  const dailyProgress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0
  const scoreJourney = student.targetScore - student.baselineScore
  const scoreProgress = scoreJourney <= 0
    ? student.currentScore >= student.targetScore ? 100 : 0
    : Math.max(0, Math.min(100, Math.round(((student.currentScore - student.baselineScore) / scoreJourney) * 100)))
  const pointsToGoal = Math.max(0, student.targetScore - student.currentScore)
  const daysToTest = daysBetween(todayKey, student.testDate)
  const nextIncompleteTask = tasks.find((task) => !completedTaskIds.has(task.id))

  const continueNextTask = () => {
    if (!nextIncompleteTask) return
    const taskCard = document.getElementById(`task-${nextIncompleteTask.id}`)
    taskCard?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' })
    taskCard?.focus({ preventScroll: true })
  }

  return (
    <>
      <PageHeader
        eyebrow={formatLongDate(todayKey)}
        title={`Good morning, ${student.firstName}`}
        description={tasks.length
          ? 'Your private plan is ready. Work through today’s assignments, then review the reason behind every miss.'
          : 'There are no assignments scheduled for today yet. Open the weekly plan to see what is coming next.'}
        action={
          <button className="button button--secondary" onClick={onViewWeek}>
            <CalendarDays size={16} /> View full week
          </button>
        }
      />

      <section className="today-hero">
        <article className="score-hero">
          <div className="score-hero__topline">
            <span><TrendingUp size={15} /> Current trajectory</span>
            <span className="score-hero__gain">+{student.currentScore - student.baselineScore} points from baseline</span>
          </div>
          <div className="score-hero__main">
            <div>
              <small>Current score</small>
              <strong>{student.currentScore}</strong>
              <span>Last full practice test</span>
            </div>
            <div className="score-hero__target">
              <Target size={18} />
              <span>Goal</span>
              <strong>{student.targetScore}</strong>
            </div>
          </div>
          <ProgressBar value={scoreProgress} tone="gold" label="Progress from baseline to target score" />
          <div className="score-hero__footer">
            <span>{scoreProgress}% of the journey from baseline</span>
            <span>{pointsToGoal ? `${pointsToGoal} points to go` : 'Goal reached'}</span>
          </div>
        </article>

        <article className="daily-progress-card">
          <div className="progress-ring" style={{ '--progress': `${dailyProgress * 3.6}deg` } as React.CSSProperties}>
            <div>
              <strong>{completedCount}/{tasks.length}</strong>
              <span>complete</span>
            </div>
          </div>
          <div className="daily-progress-card__copy">
            <span className="eyebrow">Today’s plan</span>
            <h2>{tasks.length > 0 && completedCount === tasks.length ? 'Great work—you’re done!' : 'A focused finish'}</h2>
            <p><Clock3 size={15} /> {remainingMinutes} minutes remaining of {totalMinutes}</p>
            <p><CalendarDays size={15} /> {daysToTest >= 0 ? `Test in ${daysToTest} days` : 'Test date has passed'}</p>
          </div>
        </article>
      </section>

      <section className="stats-grid stats-grid--four" aria-label="Progress snapshot">
        <StatCard label="Current score" value={student.currentScore} detail={previousTest ? `${latestGain >= 0 ? '+' : ''}${latestGain} since ${formatDate(previousTest.date)}` : 'Latest recorded full test'} icon={CircleGauge} tone="violet" />
        <StatCard label="Tests logged" value={practiceTests.length} detail={latestTest ? `Latest: ${formatDate(latestTest.date)}` : 'No test records yet'} icon={Sparkles} tone="gold" />
        <StatCard label="Skills strong" value={`${strongSkills} / ${skills.length}`} detail="Strong or mastered" icon={CheckCircle2} tone="teal" />
        <StatCard label="PSAT 8/9 test day" value={formatDate(student.testDate, { month: 'short', day: 'numeric' })} detail={daysToTest >= 0 ? `${daysToTest} days away` : 'Date has passed'} icon={CalendarDays} tone="blue" />
      </section>

      {nextIncompleteTask && (
        <section className="next-action-strip" aria-labelledby="next-action-title">
          <div className="next-action-strip__icon"><ArrowRight size={19} /></div>
          <div>
            <span className="eyebrow">Continue next</span>
            <h2 id="next-action-title">{nextIncompleteTask.title}</h2>
            <p>{nextIncompleteTask.category} · {nextIncompleteTask.minutes} minutes</p>
          </div>
          <button className="button button--primary" type="button" onClick={continueNextTask}>Go to assignment <ArrowRight size={15} /></button>
        </section>
      )}

      <div className="content-grid content-grid--today">
        <section className="panel today-plan">
          <div className="panel__header">
            <div>
              <span className="eyebrow">{formatDate(todayKey, { weekday: 'long' })} · {totalMinutes >= 60 ? 'Longer session' : 'Focused session'}</span>
              <h2>Today’s assignments</h2>
            </div>
            <span className="panel__total"><Clock3 size={15} /> {totalMinutes} min</span>
          </div>
          <div className="task-list">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                completed={completedTaskIds.has(task.id)}
                onToggle={onToggleTask}
                studentId={canRecordResults ? student.id : undefined}
                skills={skills}
                result={drills.find((drill) => drill.taskId === task.id) ?? practiceTests.find((test) => test.taskId === task.id)}
                onResultSaved={canRecordResults ? onResultSaved : undefined}
              />
            ))}
            {!tasks.length && <EmptyState title="Nothing assigned today" description="Use View full week to check upcoming work or enjoy the planned rest day." />}
          </div>
        </section>

        <aside className="today-aside">
          <article className="coach-card">
            <div className="coach-card__icon"><Target size={21} /></div>
            <span className="eyebrow">Published plan</span>
            <h2>{today?.focus || 'Follow today’s assignments'}</h2>
            <p>{today ? 'This is the focus saved with today’s approved plan.' : 'No daily focus has been published yet.'}</p>
            <div className="coach-card__skill">
              <div>
                <span>Linked skills</span>
                <strong>{todaySkills.length ? todaySkills.slice(0, 2).map((skill) => skill.name).join(' · ') : 'None linked'}</strong>
              </div>
              <span>{todaySkills.length ? `${todaySkills.length} linked` : 'General plan'}</span>
            </div>
          </article>

          <article className="strategy-card">
            <div className="panel__header panel__header--compact">
              <div>
                <span className="eyebrow">Student-specific guidance</span>
                <h2>Coaching note</h2>
              </div>
              <Sparkles size={18} />
            </div>
            <p>{today?.note || 'No coaching note has been added for today.'}</p>
          </article>

          <button className="next-up-card" onClick={onViewWeek}>
            <span>
              <small>Tomorrow · {formatDate(tomorrowKey)}</small>
              <strong>{tomorrow?.focus ?? 'No assignments scheduled yet'}</strong>
            </span>
            <ArrowRight size={18} />
          </button>
        </aside>
      </div>
    </>
  )
}
