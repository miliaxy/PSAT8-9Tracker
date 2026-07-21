import { CalendarCheck2, ChevronDown, Clock3, Expand, LocateFixed, Minimize2, Printer, RotateCcw, Sparkles } from 'lucide-react'
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
  const initialOpenDay = plan.days.some((day) => day.date === todayKey) ? todayKey : firstDay
  const [openDays, setOpenDays] = useState<Set<string>>(() => new Set(initialOpenDay ? [initialOpenDay] : []))
  const tasks = plan.days.flatMap((day) => day.tasks)
  const completedCount = tasks.filter((task) => completedTaskIds.has(task.id)).length
  const totalMinutes = tasks.reduce((sum, task) => sum + task.minutes, 0)
  const completedMinutes = tasks
    .filter((task) => completedTaskIds.has(task.id))
    .reduce((sum, task) => sum + task.minutes, 0)
  const progress = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0
  const reviewDay = plan.days.find((day) => day.dayType === 'review')
  const allDaysOpen = plan.days.length > 0 && openDays.size === plan.days.length

  const toggleDay = (date: string) => {
    setOpenDays((current) => {
      const next = new Set(current)
      if (next.has(date)) next.delete(date)
      else next.add(date)
      return next
    })
  }

  const jumpToToday = () => {
    if (!plan.days.some((day) => day.date === todayKey)) return
    setOpenDays((current) => new Set(current).add(todayKey))
    const todayCard = document.getElementById(`week-day-${todayKey}`)
    todayCard?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' })
    todayCard?.focus({ preventScroll: true })
  }

  const printPlan = () => {
    setOpenDays(new Set(plan.days.map((day) => day.date)))
    window.requestAnimationFrame(() => window.requestAnimationFrame(() => window.print()))
  }

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
          <div><strong>{reviewDay ? formatDate(reviewDay.date, { weekday: 'long' }) : 'Flexible'}</strong><span>{reviewDay ? 'Mistake-review loop' : 'Review when scheduled'}</span></div>
        </div>
      </section>

      <section className="panel week-panel">
        <div className="panel__header">
          <div>
            <span className="eyebrow">Daily workload</span>
            <h2>{formatDate(firstDay, { month: 'long', day: 'numeric' })}–{formatDate(lastDay, { month: 'long', day: 'numeric' })}</h2>
          </div>
          <div className="week-panel__tools">
            <div className="workload-legend" aria-label="Workload type legend">
              <span><i className="dot dot--normal" /> Normal</span>
              <span><i className="dot dot--light" /> Light</span>
              <span><i className="dot dot--off" /> Off</span>
              <span><i className="dot dot--long" /> Long</span>
            </div>
            <div className="week-controls" aria-label="Weekly-plan controls">
              <button type="button" disabled={!plan.days.some((day) => day.date === todayKey)} onClick={jumpToToday}><LocateFixed size={15} /> Today</button>
              <button type="button" onClick={() => setOpenDays(allDaysOpen ? new Set() : new Set(plan.days.map((day) => day.date)))}>{allDaysOpen ? <Minimize2 size={15} /> : <Expand size={15} />} {allDaysOpen ? 'Collapse' : 'Expand all'}</button>
              <button type="button" onClick={printPlan}><Printer size={15} /> Print</button>
            </div>
          </div>
        </div>

        <div className="week-days">
          {plan.days.map((day) => {
            const isOpen = openDays.has(day.date)
            const isToday = day.date === todayKey
            const dayCompleted = day.tasks.filter((task) => completedTaskIds.has(task.id)).length
            const dayMinutes = day.tasks.reduce((sum, task) => sum + task.minutes, 0)
            const dayIsComplete = day.tasks.length > 0 && dayCompleted === day.tasks.length

            return (
              <article
                key={day.date}
                id={`week-day-${day.date}`}
                tabIndex={-1}
                className={`week-day week-day--${day.dayType}${isToday ? ' week-day--today' : ''}`}
              >
                <button
                  className="week-day__summary"
                  onClick={() => toggleDay(day.date)}
                  aria-expanded={isOpen}
                  aria-controls={`week-details-${day.date}`}
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
                  <div className="week-day__details" id={`week-details-${day.date}`}>
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
                        <div><strong>Protected rest day.</strong><span>No assignments are scheduled. Rest supports the next focused session.</span></div>
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
