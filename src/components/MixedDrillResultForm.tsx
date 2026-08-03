import { CheckCircle2, LoaderCircle, Save, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { saveMixedDrillResult } from '../services/studentRepository'
import type {
  DailyTask,
  Difficulty,
  Drill,
  ErrorClassification,
  MixedDrillResultInput,
  Skill,
} from '../types/models'

interface MixedDrillResultFormProps {
  studentId: string
  task: DailyTask
  skills: Skill[]
  existingResults: Drill[]
  onSaved: () => void
  onCancel: () => void
}

type Outcome = '' | 'correct' | 'incorrect'

interface SkillResultRow {
  questionNumber: number
  skillId: string
  difficulty: Difficulty
  outcome: Outcome
  classification: ErrorClassification
  note: string
}

const classifications: ErrorClassification[] = [
  'Not Yet Taught', 'Concept Gap', 'Careless', 'Rushed / Timing', 'Second-Guessed',
  'Strategy', 'Misread Question', 'Guess', 'Other',
]

function initialRows(task: DailyTask, existingResults: Drill[]): SkillResultRow[] {
  const easyCount = Math.floor(task.skillIds.length / 2)
  return task.skillIds.map((skillId, index) => {
    const existing = existingResults.find((drill) => drill.skillId === skillId)
    const mistake = existing?.mistakes?.[0]
    return {
      questionNumber: index + 1,
      skillId,
      difficulty: existing?.difficulty ?? (index < easyCount ? 'Easy' : 'Medium'),
      outcome: existing ? (existing.correct === existing.attempted ? 'correct' : 'incorrect') : '',
      classification: mistake?.classification ?? 'Concept Gap',
      note: mistake?.note ?? '',
    }
  })
}

export function MixedDrillResultForm({ studentId, task, skills, existingResults, onSaved, onCancel }: MixedDrillResultFormProps) {
  const availableSkills = useMemo(
    () => task.skillIds.map((skillId) => skills.find((skill) => skill.id === skillId)).filter((skill): skill is Skill => Boolean(skill)),
    [skills, task.skillIds],
  )
  const [date, setDate] = useState(task.date)
  const [source, setSource] = useState(existingResults[0]?.source ?? task.resource ?? 'College Board Educator Question Bank')
  const [timeSpentMinutes, setTimeSpentMinutes] = useState<number | undefined>(existingResults[0]?.timeSpentMinutes)
  const [notes, setNotes] = useState(existingResults[0]?.notes ?? '')
  const [rows, setRows] = useState<SkillResultRow[]>(() => initialRows(task, existingResults))
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const correct = rows.filter((row) => row.outcome === 'correct').length
  const validationError = rows.length < 2
    ? 'This assignment does not have enough linked skills for a mixed result.'
    : rows.some((row) => !row.outcome)
      ? 'Mark every question correct or incorrect.'
      : !source.trim()
        ? 'Add the drill source.'
        : timeSpentMinutes !== undefined && (timeSpentMinutes < 0 || timeSpentMinutes > 180)
          ? 'Time used must be between 0 and 180 minutes.'
          : null

  const updateRow = (index: number, updates: Partial<SkillResultRow>) => {
    setRows((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, ...updates } : row))
  }

  const save = async () => {
    if (validationError) return
    setWorking(true)
    setError(null)
    const result: MixedDrillResultInput = {
      taskId: task.id,
      date,
      source,
      timeLimitMinutes: task.minutes,
      timeSpentMinutes,
      notes,
      skillResults: rows.map((row) => ({
        questionNumber: row.questionNumber,
        skillId: row.skillId,
        difficulty: row.difficulty,
        correct: row.outcome === 'correct',
        classification: row.outcome === 'incorrect' ? row.classification : undefined,
        note: row.outcome === 'incorrect' ? row.note : '',
      })),
    }

    try {
      await saveMixedDrillResult(studentId, result)
      setSuccess(`${correct}/${rows.length} saved. Every question updated its own skill evidence.`)
      onSaved()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'The mixed drill result could not be saved.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <form className="assignment-result-form" aria-busy={working} onSubmit={(event) => { event.preventDefault(); void save() }}>
      <div className="assignment-result-form__header">
        <div><span className="eyebrow">Mixed-skill evidence</span><h4>{existingResults.length ? 'Edit mixed drill result' : 'Record mixed drill result'}</h4></div>
        <span className="assignment-prefill">One question updates one skill</span>
      </div>
      {error && <div className="inline-error" role="alert">{error}</div>}
      {success && <div className="inline-success" role="status"><CheckCircle2 size={16} /> {success}</div>}

      <div className="drill-entry__grid drill-entry__grid--score">
        <label className="field-label">Date<input type="date" value={date} onChange={(event) => setDate(event.target.value)} /></label>
        <label className="field-label">Time allowed<input type="number" value={task.minutes} readOnly /></label>
        <label className="field-label">Time used<input type="number" min="0" max="180" step="0.5" placeholder="Optional" value={timeSpentMinutes ?? ''} onChange={(event) => setTimeSpentMinutes(event.target.value ? Number(event.target.value) : undefined)} /></label>
        <div className="drill-entry__result"><strong>{correct}/{rows.length}</strong><span>{rows.length ? Math.round((correct / rows.length) * 100) : 0}% correct</span></div>
      </div>

      <label className="field-label">Source<input maxLength={200} value={source} onChange={(event) => setSource(event.target.value)} /></label>

      <div className="mixed-drill-results" role="group" aria-label="Question results by skill">
        {rows.map((row, index) => {
          const skill = availableSkills.find((candidate) => candidate.id === row.skillId)
          return (
            <fieldset className="mixed-drill-result" key={row.skillId}>
              <legend>Question {row.questionNumber} · {skill?.name ?? row.skillId}</legend>
              <label className="field-label">Difficulty
                <select value={row.difficulty} onChange={(event) => updateRow(index, { difficulty: event.target.value as Difficulty })}>
                  <option>Easy</option><option>Medium</option><option>Hard</option>
                </select>
              </label>
              <label className="field-label">Result
                <select value={row.outcome} onChange={(event) => updateRow(index, { outcome: event.target.value as Outcome })}>
                  <option value="">Choose result</option><option value="correct">Correct</option><option value="incorrect">Incorrect</option>
                </select>
              </label>
              {row.outcome === 'incorrect' && (
                <>
                  <label className="field-label">Mistake type<select value={row.classification} onChange={(event) => updateRow(index, { classification: event.target.value as ErrorClassification })}>{classifications.map((classification) => <option key={classification}>{classification}</option>)}</select></label>
                  <label className="field-label mixed-drill-result__note">What happened?<input maxLength={500} placeholder="Optional note" value={row.note} onChange={(event) => updateRow(index, { note: event.target.value })} /></label>
                </>
              )}
            </fieldset>
          )
        })}
      </div>

      <label className="field-label">Session note<input maxLength={500} placeholder="Optional context" value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
      <div className="drill-entry__actions">
        {validationError && <p role="alert">{validationError}</p>}
        <button className="button button--secondary" type="button" onClick={onCancel}><X size={15} /> Cancel</button>
        <button className="button button--primary" type="submit" disabled={Boolean(validationError) || working || Boolean(success)}>{working ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />} {working ? 'Saving…' : existingResults.length ? 'Update result' : 'Save result'}</button>
      </div>
    </form>
  )
}
