import {
  ArrowRight,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  CircleGauge,
  Clock3,
  Flag,
  Sparkles,
  Target,
  TrendingUp,
} from 'lucide-react'
import { TaskCard } from '../components/TaskCard'
import { PageHeader, ProgressBar, StatCard } from '../components/ui'
import type { DailyTask, Student } from '../types/models'
import { daysBetween, formatDate } from '../utils/format'

interface TodayPageProps {
  student: Student
  tasks: DailyTask[]
  completedTaskIds: Set<string>
  onToggleTask: (taskId: string) => void
  onViewWeek: () => void
}

export function TodayPage({ student, tasks, completedTaskIds, onToggleTask, onViewWeek }: TodayPageProps) {
  const completedCount = tasks.filter((task) => completedTaskIds.has(task.id)).length
  const totalMinutes = tasks.reduce((total, task) => total + task.minutes, 0)
  const remainingMinutes = tasks
    .filter((task) => !completedTaskIds.has(task.id))
    .reduce((total, task) => total + task.minutes, 0)
  const dailyProgress = Math.round((completedCount / tasks.length) * 100)
  const scoreProgress = Math.round(
    ((student.currentScore - student.baselineScore) / (student.targetScore - student.baselineScore)) * 100,
  )

  return (
    <>
      <PageHeader
        eyebrow="Saturday, July 18"
        title={`Good morning, ${student.firstName}`}
        description="Your plan is ready. Today is a longer practice day, with one new concept and one important accuracy target."
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
            <span className="score-hero__gain">+{student.currentScore - student.baselineScore} points</span>
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
            <span>{student.targetScore - student.currentScore} points to go</span>
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
            <h2>{completedCount === tasks.length ? 'Great work—you’re done!' : 'A focused finish'}</h2>
            <p><Clock3 size={15} /> {remainingMinutes} minutes remaining of {totalMinutes}</p>
            <p><CalendarDays size={15} /> Test in {daysBetween('2026-07-18', student.testDate)} days</p>
          </div>
        </article>
      </section>

      <section className="stats-grid stats-grid--four" aria-label="Progress snapshot">
        <StatCard label="Current score" value={student.currentScore} detail="Up 40 since last test" icon={CircleGauge} tone="violet" />
        <StatCard label="Daily streak" value="9 days" detail="Personal best: 12" icon={Sparkles} tone="gold" />
        <StatCard label="Skills strong" value="8 / 22" detail="3 improved this month" icon={CheckCircle2} tone="teal" />
        <StatCard label="Next practice test" value="Aug 8" detail="Three weeks away" icon={CalendarDays} tone="blue" />
      </section>

      <div className="content-grid content-grid--today">
        <section className="panel today-plan">
          <div className="panel__header">
            <div>
              <span className="eyebrow">Saturday · Longer session</span>
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
              />
            ))}
          </div>
        </section>

        <aside className="today-aside">
          <article className="coach-card">
            <div className="coach-card__icon"><BrainCircuit size={21} /></div>
            <span className="eyebrow">Coach’s focus</span>
            <h2>Accuracy before speed</h2>
            <p>
              Boundaries drill accuracy is improving, but full-test evidence still lags. Explain the rule
              behind every miss today—don’t just correct the answer.
            </p>
            <div className="coach-card__skill">
              <div>
                <span>Priority skill</span>
                <strong>Boundaries</strong>
              </div>
              <span>75% recent</span>
            </div>
          </article>

          <article className="strategy-card">
            <div className="panel__header panel__header--compact">
              <div>
                <span className="eyebrow">Test-day habits</span>
                <h2>Three rules</h2>
              </div>
              <Flag size={18} />
            </div>
            <ol className="strategy-list">
              <li>
                <span>01</span>
                <div><strong>90-second flag</strong><p>If progress stalls, flag it, guess, and move on.</p></div>
              </li>
              <li>
                <span>02</span>
                <div><strong>Zero blanks</strong><p>Every question gets an answer before time ends.</p></div>
              </li>
              <li>
                <span>03</span>
                <div><strong>Module 1 accuracy</strong><p>Protect accuracy early on the adaptive test.</p></div>
              </li>
            </ol>
          </article>

          <button className="next-up-card" onClick={onViewWeek}>
            <span>
              <small>Tomorrow · {formatDate('2026-07-19')}</small>
              <strong>Read, reset, and preview the week</strong>
            </span>
            <ArrowRight size={18} />
          </button>
        </aside>
      </div>
    </>
  )
}
