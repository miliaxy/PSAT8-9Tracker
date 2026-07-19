import {
  BookOpen,
  BrainCircuit,
  Check,
  Clock3,
  ExternalLink,
  Flag,
  PencilLine,
  RefreshCw,
} from 'lucide-react'
import type { DailyTask, TaskCategory } from '../types/models'

interface TaskCardProps {
  task: DailyTask
  completed: boolean
  onToggle: (taskId: string) => void
  compact?: boolean
}

const categoryMeta: Record<TaskCategory, { icon: typeof BookOpen; tone: string }> = {
  Learn: { icon: BrainCircuit, tone: 'violet' },
  Drill: { icon: PencilLine, tone: 'coral' },
  Review: { icon: RefreshCw, tone: 'teal' },
  'Test strategy': { icon: Flag, tone: 'gold' },
  Reading: { icon: BookOpen, tone: 'blue' },
}

export function TaskCard({ task, completed, onToggle, compact = false }: TaskCardProps) {
  const { icon: Icon, tone } = categoryMeta[task.category]

  return (
    <article className={`task-card${completed ? ' task-card--complete' : ''}${compact ? ' task-card--compact' : ''}`}>
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
            {task.resource && <span><ExternalLink size={12} /> {task.resource}</span>}
          </div>
        )}
      </div>
    </article>
  )
}
