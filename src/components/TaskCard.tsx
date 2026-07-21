import {
  BookOpen,
  BarChart3,
  BrainCircuit,
  Check,
  Clock3,
  ExternalLink,
  Flag,
  PencilLine,
  RefreshCw,
} from 'lucide-react'
import { useState } from 'react'
import { DrillResultForm } from './DrillResultForm'
import { PracticeTestResultForm } from './PracticeTestResultForm'
import type { DailyTask, Drill, PracticeTest, Skill, TaskCategory } from '../types/models'

interface TaskCardProps {
  task: DailyTask
  completed: boolean
  onToggle: (taskId: string) => void
  compact?: boolean
  studentId?: string
  skills?: Skill[]
  result?: Drill | PracticeTest
  onResultSaved?: () => void
}

const categoryMeta: Record<TaskCategory, { icon: typeof BookOpen; tone: string }> = {
  Learn: { icon: BrainCircuit, tone: 'violet' },
  Drill: { icon: PencilLine, tone: 'coral' },
  Review: { icon: RefreshCw, tone: 'teal' },
  'Test strategy': { icon: Flag, tone: 'gold' },
  'Practice test': { icon: BarChart3, tone: 'gold' },
  Reading: { icon: BookOpen, tone: 'blue' },
}

function isDrillResult(result: Drill | PracticeTest): result is Drill {
  return 'attempted' in result && 'accuracy' in result
}

function ResourceMeta({ resource }: { resource: string }) {
  const links = [...resource.matchAll(/(?:(Lesson|Worked example):\s*)?(https?:\/\/[^\s|]+)/gi)]

  if (!links.length) return <span><ExternalLink size={12} /> {resource}</span>

  return (
    <span className="task-card__resource-links">
      <ExternalLink size={12} />
      {links.map((link, index) => (
        <a key={link[2]} href={link[2]} target="_blank" rel="noreferrer" aria-label={`${link[1] ?? (links.length === 1 ? 'Open resource' : `Open resource ${index + 1}`)} (opens in a new tab)`}>
          {link[1] ?? (links.length === 1 ? 'Open resource' : `Open resource ${index + 1}`)}
        </a>
      ))}
    </span>
  )
}

export function TaskCard({ task, completed, onToggle, compact = false, studentId, skills = [], result, onResultSaved }: TaskCardProps) {
  const { icon: Icon, tone } = categoryMeta[task.category]
  const [showResultForm, setShowResultForm] = useState(false)
  const canRecordResult = Boolean(studentId && onResultSaved && (task.category === 'Drill' || task.category === 'Practice test'))
  const resultFormId = `result-form-${task.id}`

  return (
    <article id={`task-${task.id}`} tabIndex={-1} className={`task-card${completed ? ' task-card--complete' : ''}${compact ? ' task-card--compact' : ''}`}>
      <button
        className="task-card__check"
        onClick={() => onToggle(task.id)}
        aria-label={completed ? `Mark ${task.title} incomplete` : `Mark ${task.title} complete`}
        aria-pressed={completed}
      >
        {completed && <Check size={15} strokeWidth={3} />}
      </button>
      <div className={`task-card__icon task-card__icon--${tone}`}>
        <Icon size={19} />
      </div>
      <div className="task-card__body">
        <div className="task-card__title-row">
          <div>
            <span className={`task-type task-type--${tone}`}>{task.category}</span>
            <h3>{task.title}</h3>
          </div>
          <span className="task-card__time"><Clock3 size={14} /> {task.minutes} min</span>
        </div>
        {!compact && <p>{task.description}</p>}
        {!compact && (
          <div className="task-card__meta">
            {task.section && <span>{task.section}</span>}
            {task.resource && <ResourceMeta resource={task.resource} />}
          </div>
        )}
        {canRecordResult && (
          <div className="task-card__evidence">
            {result ? (
              <div className="task-result-summary">
                <span className="task-result-chip"><Check size={13} /> {isDrillResult(result) ? `${result.correct}/${result.attempted} · ${Math.round(result.accuracy)}%` : `Score ${result.totalScore}`}</span>
                {isDrillResult(result) && (
                  <button className="task-result-button" type="button" onClick={() => setShowResultForm((value) => !value)} aria-expanded={showResultForm} aria-controls={resultFormId}>
                    <PencilLine size={14} /> {showResultForm ? 'Close editor' : 'Edit result'}
                  </button>
                )}
              </div>
            ) : (
              <button className="task-result-button" type="button" onClick={() => setShowResultForm((value) => !value)} aria-expanded={showResultForm} aria-controls={resultFormId}><BarChart3 size={14} /> {showResultForm ? 'Close result form' : `Record ${task.category === 'Practice test' ? 'test' : 'drill'} result`}</button>
            )}
          </div>
        )}
      </div>
      {showResultForm && studentId && onResultSaved && (!result || isDrillResult(result)) && (
        <div className="task-card__result-form" id={resultFormId}>
          {task.category === 'Practice test'
            ? <PracticeTestResultForm studentId={studentId} task={task} skills={skills} onSaved={onResultSaved} onCancel={() => setShowResultForm(false)} />
            : <DrillResultForm studentId={studentId} task={task} skills={skills} existingResult={result && isDrillResult(result) ? result : undefined} onSaved={() => { setShowResultForm(false); onResultSaved() }} onCancel={() => setShowResultForm(false)} />}
        </div>
      )}
    </article>
  )
}
