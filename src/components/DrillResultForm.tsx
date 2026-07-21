import { useMemo, useState } from 'react'
import { CheckCircle2, LoaderCircle, Plus, Save, Trash2, X } from 'lucide-react'
import { recordDrillResult, updateDrillResult } from '../services/studentRepository'
import type {
  DailyTask,
  Difficulty,
  Drill,
  DrillResultInput,
  DrillResultMistakeInput,
  ErrorClassification,
  Skill,
} from '../types/models'

interface DrillResultFormProps {
  studentId: string
  task: DailyTask
  skills: Skill[]
  existingResult?: Drill
  onSaved: () => void
  onCancel: () => void
}

const classifications: ErrorClassification[] = [
  'Not Yet Taught', 'Concept Gap', 'Careless', 'Rushed / Timing', 'Second-Guessed',
  'Strategy', 'Misread Question', 'Guess', 'Other',
]

function initialResult(task: DailyTask, skills: Skill[], existingResult?: Drill): DrillResultInput {
  if (existingResult) {
    const matchingSkill = skills.find((skill) => (
      skill.section === existingResult.section
      && skill.domain === existingResult.domain
      && skill.name === existingResult.skillTopic
    ))
    return {
      taskId: existingResult.taskId ?? task.id,
      date: existingResult.date,
      skillId: existingResult.skillId ?? matchingSkill?.id ?? task.skillIds[0] ?? '',
      difficulty: existingResult.difficulty,
      source: existingResult.source,
      attempted: existingResult.attempted,
      correct: existingResult.correct,
      timeLimitMinutes: existingResult.timeLimitMinutes,
      timeSpentMinutes: existingResult.timeSpentMinutes,
      notes: existingResult.notes ?? '',
      mistakes: (existingResult.mistakes ?? []).map((mistake) => ({
        questionNumber: mistake.questionNumber,
        classification: mistake.classification,
        note: mistake.note ?? '',
      })),
    }
  }
  return {
    taskId: task.id,
    date: task.date,
    skillId: task.skillIds[0] ?? '',
    difficulty: 'Medium',
    source: task.resource || 'College Board Question Bank',
    attempted: 10,
    correct: 0,
    timeLimitMinutes: task.minutes,
    timeSpentMinutes: undefined,
    notes: '',
    mistakes: [],
  }
}

function emptyMistake(): DrillResultMistakeInput {
  return { classification: 'Concept Gap', note: '' }
}

export function DrillResultForm({ studentId, task, skills, existingResult, onSaved, onCancel }: DrillResultFormProps) {
  const availableSkills = useMemo(
    () => task.section ? skills.filter((skill) => skill.section === task.section) : skills,
    [skills, task.section],
  )
  const [result, setResult] = useState<DrillResultInput>(() => initialResult(task, skills, existingResult))
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const selectedSkill = availableSkills.find((skill) => skill.id === result.skillId)
  const validationId = `drill-validation-${task.id}`
  const incorrect = Math.max(0, result.attempted - result.correct)
  const accuracy = result.attempted ? Math.round((result.correct / result.attempted) * 100) : 0
  const validationError = !result.skillId
    ? 'Choose the skill practiced.'
    : !result.source.trim()
      ? 'Add the practice source.'
      : !Number.isInteger(result.attempted) || result.attempted < 1
        ? 'Attempted questions must be a whole number greater than zero.'
        : !Number.isInteger(result.correct) || result.correct < 0 || result.correct > result.attempted
          ? 'Correct answers must be between zero and attempted questions.'
          : result.mistakes.length > incorrect
            ? 'There cannot be more mistake details than incorrect answers.'
            : result.mistakes.some((mistake) => mistake.questionNumber && mistake.questionNumber > result.attempted)
              ? 'A mistake question number cannot exceed the number attempted.'
              : null

  const updateMistake = (index: number, updates: Partial<DrillResultMistakeInput>) => {
    setResult((current) => ({
      ...current,
      mistakes: current.mistakes.map((mistake, mistakeIndex) => mistakeIndex === index ? { ...mistake, ...updates } : mistake),
    }))
  }

  const save = async () => {
    if (validationError) return
    setWorking(true)
    setError(null)
    try {
      if (existingResult) await updateDrillResult(studentId, existingResult.id, result)
      else await recordDrillResult(studentId, result)
      setSuccess(`${selectedSkill?.name ?? 'Drill'} ${existingResult ? 'updated' : 'saved'}. Skill evidence and planning priorities were recalculated.`)
      onSaved()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'The drill result could not be saved.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <form className="assignment-result-form" aria-busy={working} onSubmit={(event) => { event.preventDefault(); void save() }}>
      <div className="assignment-result-form__header">
        <div><span className="eyebrow">Assignment evidence</span><h4>{existingResult ? 'Edit drill result' : 'Record drill result'}</h4></div>
        <span className="assignment-prefill">{existingResult ? 'Saved values prefilled' : 'Date, skill and source prefilled'}</span>
      </div>
      {error && <div className="inline-error" role="alert">{error}</div>}
      {success && <div className="inline-success" role="status"><CheckCircle2 size={16} /> {success}</div>}

      <div className="drill-entry__grid">
        <label className="field-label field-label--wide">Skill
          <select value={result.skillId} aria-invalid={!result.skillId} aria-describedby={validationError ? validationId : undefined} onChange={(event) => setResult({ ...result, skillId: event.target.value })}>
            <option value="">Choose skill</option>
            {availableSkills.map((skill) => <option key={skill.id} value={skill.id}>{skill.domain} · {skill.name}</option>)}
          </select>
        </label>
        <label className="field-label">Date<input type="date" value={result.date} onChange={(event) => setResult({ ...result, date: event.target.value })} /></label>
        <label className="field-label">Difficulty<select value={result.difficulty} onChange={(event) => setResult({ ...result, difficulty: event.target.value as Difficulty })}><option>Easy</option><option>Medium</option><option>Hard</option><option>Mixed</option></select></label>
      </div>

      <div className="drill-entry__grid drill-entry__grid--score">
        <label className="field-label">Attempted<input type="number" min="1" max="100" value={result.attempted} aria-invalid={!Number.isInteger(result.attempted) || result.attempted < 1} aria-describedby={validationError ? validationId : undefined} onChange={(event) => setResult({ ...result, attempted: Number(event.target.value) })} /></label>
        <label className="field-label">Correct<input type="number" min="0" max={result.attempted} value={result.correct} aria-invalid={!Number.isInteger(result.correct) || result.correct < 0 || result.correct > result.attempted} aria-describedby={validationError ? validationId : undefined} onChange={(event) => setResult({ ...result, correct: Number(event.target.value) })} /></label>
        <div className="drill-entry__result"><strong>{accuracy}%</strong><span>{incorrect} incorrect</span></div>
        <label className="field-label">Time allowed<input type="number" min="1" max="180" value={result.timeLimitMinutes ?? ''} onChange={(event) => setResult({ ...result, timeLimitMinutes: event.target.value ? Number(event.target.value) : undefined })} /></label>
        <label className="field-label">Time used<input type="number" min="0" max="180" step="0.5" placeholder="Optional" value={result.timeSpentMinutes ?? ''} onChange={(event) => setResult({ ...result, timeSpentMinutes: event.target.value ? Number(event.target.value) : undefined })} /></label>
      </div>

      <div className="drill-entry__grid">
        <label className="field-label field-label--wide">Source<input maxLength={200} value={result.source} aria-invalid={!result.source.trim()} aria-describedby={validationError ? validationId : undefined} onChange={(event) => setResult({ ...result, source: event.target.value })} /></label>
        <label className="field-label field-label--wide">Session note<input maxLength={500} placeholder="Optional context" value={result.notes} onChange={(event) => setResult({ ...result, notes: event.target.value })} /></label>
      </div>

      <div className="drill-entry__mistakes">
        <div className="drill-entry__mistake-heading">
          <div><span className="eyebrow">Optional</span><h3>What caused the misses?</h3></div>
          <button className="button button--quiet" type="button" disabled={result.mistakes.length >= incorrect || incorrect === 0} onClick={() => setResult({ ...result, mistakes: [...result.mistakes, emptyMistake()] })}><Plus size={15} /> Add mistake</button>
        </div>
        {incorrect === 0 && <p className="drill-entry__hint">Perfect score—no mistake details needed.</p>}
        {result.mistakes.map((mistake, index) => (
          <div className="drill-entry__mistake" key={index}>
            <label className="field-label">Question<input type="number" min="1" max={result.attempted} placeholder="Optional" value={mistake.questionNumber ?? ''} onChange={(event) => updateMistake(index, { questionNumber: event.target.value ? Number(event.target.value) : undefined })} /></label>
            <label className="field-label">Mistake type<select value={mistake.classification} onChange={(event) => updateMistake(index, { classification: event.target.value as ErrorClassification })}>{classifications.map((classification) => <option key={classification}>{classification}</option>)}</select></label>
            <label className="field-label field-label--wide">What happened?<input maxLength={500} placeholder="Optional note" value={mistake.note} onChange={(event) => updateMistake(index, { note: event.target.value })} /></label>
            <button className="drill-entry__remove" type="button" aria-label={`Remove mistake ${index + 1}`} onClick={() => setResult({ ...result, mistakes: result.mistakes.filter((_, mistakeIndex) => mistakeIndex !== index) })}><Trash2 size={16} /></button>
          </div>
        ))}
      </div>

      <div className="drill-entry__actions">
        {validationError && <p id={validationId} role="alert">{validationError}</p>}
        <button className="button button--secondary" type="button" onClick={onCancel}><X size={15} /> Cancel</button>
        <button className="button button--primary" type="submit" disabled={Boolean(validationError) || working || Boolean(success)}>{working ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />} {working ? 'Saving…' : existingResult ? 'Update result' : 'Save result'}</button>
      </div>
    </form>
  )
}
