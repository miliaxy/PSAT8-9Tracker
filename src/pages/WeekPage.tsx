import { CalendarCheck2, ChevronDown, Clock3, RotateCcw, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { TaskCard } from '../components/TaskCard'
import { PageHeader, ProgressBar } from '../components/ui'
import type { DayType, Drill, PracticeTest, Skill, StudyPlan } from '../types/models'
import { formatDate } from '../utils/format'

interface WeekPageProps {
  plan: StudyPlan
  completedTaskIds: Set<string>
  onToggleTask: (taskId: string) => void
  studentId?: string
  skills: Skill[]
  drills: Drill[]
  practiceTests: PracticeTest[]
  onResultSaved?: () => void
}

const dayTypeLabels: Record<DayType, string> = {
  normal: 'Normal day',
  light: 'Light day',
  'no-study': 'No study',
  long: 'Long session',
  review: 'Review loop',
}

export function WeekPage({ plan, completedTaskIds, onToggleTask, studentId, skills, drills, practiceTests, onResultSaved }: WeekPageProps) {
  const today = new Date()
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
  const firstDay = plan.days[0]?.date ?? plan.weekOf
  const lastDay = plan.days.at(-1)?.date ?? plan.weekOf
  const [openDay, setOpenDay] = useState(plan.days.some((day) => day.date === todayKey) ? todayKey : firstDay)
  const tasks = plan.days.flatMap((day) => day.tasks)
  const completedCount = tasks.filter((task) => completedTaskIds.has(task.id)).length
  const totalMinutes = tasks.reduce((sum, task) => sum + task.minutes, 0)
  const completedMinutes = tasks
    .filter((task) => completedTaskIds.has(task.id))
    .reduce((sum, task) => sum + task.minutes, 0)
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0

  return (
    <>
      <PageHeader
        eyebrow={`Week of ${formatDate(plan.weekOf, { month: 'long', day: 'numeric' })}`}
        title="Your weekly game plan"
        description="A flexible rhythm that balances new learning, daily drills, spaced review, and real rest."
        action={<span className="week-range"><CalendarCheck2 size={16} /> {formatDate(firstDay, { month: 'short', day: 'numeric' })}–{formatDate(lastDay, { month: 'short', day: 'numeric' })}</span>}
      />

      <section className="week-summary">
        <div className="week-summary__main">
          <span className="eyebrow">This week’s theme</span>
          <h2>{plan.title}</h2>
          <p>{plan.goal}</p>
          <div className="week-summary__progress">
            <ProgressBar value={progress} tone="violet" label="Weekly plan completion" />
            <span>{completedCount} of {tasks.length} tasks · {progress}%</span>
          </div>
        </div>
        <div className="week-summary__metric">
          <Clock3 size={20} />
          <div><strong>{completedMinutes}</strong><span>of {totalMinutes} min done</span></div>
        </div>
        <div className="week-summary__metric">
          <RotateCcw size={20} />
          <div><strong>Friday</strong><span>Mistake-review loop</span></div>
        </div>
      </section>

      <section className="panel week-panel">
        <div className="panel__header">
          <div>
            <span className="eyebrow">Daily workload</span>
            <h2>{formatDate(firstDay, { month: 'long', day: 'numeric' })}–{formatDate(lastDay, { month: 'long', day: 'numeric' })}</h2>
          </div>
          <div className="workload-legend" aria-label="Workload type legend">
            <span><i className="dot dot--normal" /> Normal</span>
            <span><i className="dot dot--light" /> Light</span>
            <span><i className="dot dot--off" /> Off</span>
            <span><i className="dot dot--long" /> Long</span>
          </div>
        </div>

        <div className="week-days">
          {plan.days.map((day) => {
            const isOpen = day.date === openDay
            const isToday = day.date === todayKey
            const dayCompleted = day.tasks.filter((task) => completedTaskIds.has(task.id)).length
            const dayMinutes = day.tasks.reduce((sum, task) => sum + task.minutes, 0)
            const dayIsComplete = day.tasks.length > 0 && dayCompleted === day.tasks.length

            return (
              <article
                key={day.date}
                className={`week-day week-day--${day.dayType}${isToday ? ' week-day--today' : ''}`}
              >
                <button
                  className="week-day__summary"
                  onClick={() => setOpenDay(isOpen ? '' : day.date)}
                  aria-expanded={isOpen}
                >
                  <div className="week-day__date">
                    <span>{formatDate(day.date, { weekday: 'short' })}</span>
                    <strong>{formatDate(day.date, { day: 'numeric' })}</strong>
                  </div>
                  <div className="week-day__focus">
                    <div>
                      <span className={`day-type day-type--${day.dayType}`}>{dayTypeLabels[day.dayType]}</span>
                      {isToday && <span className="today-chip">Today</span>}
                    </div>
                    <h3>{day.focus}</h3>
                    {day.note && <p>{day.note}</p>}
                  </div>
                  <div className="week-day__meta">
                    {day.dayType === 'no-study' ? (
                      <span className="rest-label"><Sparkles size={14} /> Protected rest</span>
                    ) : (
                      <>
                        <span>{dayCompleted}/{day.tasks.length} tasks</span>
                        <span><Clock3 size={13} /> {dayMinutes} min</span>
                      </>
                    )}
                  </div>
                  <span className={dayIsComplete ? 'day-check day-check--done' : 'day-check'}>
                    {dayIsComplete ? '✓' : day.tasks.length}
                  </span>
                  <ChevronDown className={isOpen ? 'chevron chevron--open' : 'chevron'} size={18} />
                </button>

                {isOpen && (
                  <div className="week-day__details">
                    {day.tasks.length ? (
                      day.tasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          completed={completedTaskIds.has(task.id)}
                          onToggle={onToggleTask}
                          compact
                          studentId={studentId}
                          skills={skills}
                          result={drills.find((drill) => drill.taskId === task.id) ?? practiceTests.find((test) => test.taskId === task.id)}
                          onResultSaved={onResultSaved}
                        />
                      ))
                    ) : (
                      <div className="rest-day-copy">
                        <Sparkles size={20} />
                        <div><strong>Nothing to make up.</strong><span>This rest day protects energy for the longer Saturday session.</span></div>
                      </div>
                    )}
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </section>
    </>
  )
}
