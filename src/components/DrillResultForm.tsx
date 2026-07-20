import { useMemo, useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronUp, LoaderCircle, Plus, Save, Trash2, X } from 'lucide-react'
import { recordDrillResult } from '../services/studentRepository'
import type {
  Difficulty,
  DrillResultInput,
  DrillResultMistakeInput,
  ErrorClassification,
  Section,
  Skill,
} from '../types/models'

interface DrillResultFormProps {
  studentId: string
  section: Section
  skills: Skill[]
  onSaved: () => void
}

const classifications: ErrorClassification[] = [
  'Not Yet Taught',
  'Concept Gap',
  'Careless',
  'Rushed / Timing',
  'Second-Guessed',
  'Strategy',
  'Misread Question',
  'Guess',
  'Other',
]

function localDateKey() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function initialResult(skillId = ''): DrillResultInput {
  return {
    date: localDateKey(),
    skillId,
    difficulty: 'Medium',
    source: 'College Board Question Bank',
    attempted: 10,
    correct: 0,
    timeLimitMinutes: 15,
    timeSpentMinutes: undefined,
    notes: '',
    mistakes: [],
  }
}

function emptyMistake(): DrillResultMistakeInput {
  return { classification: 'Concept Gap', note: '' }
}

export function DrillResultForm({ studentId, section, skills, onSaved }: DrillResultFormProps) {
  const sectionSkills = useMemo(() => skills.filter((skill) => skill.section === section), [section, skills])
  const [open, setOpen] = useState(false)
  const [result, setResult] = useState<DrillResultInput>(() => initialResult(sectionSkills[0]?.id))
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const selectedSkill = sectionSkills.find((skill) => skill.id === result.skillId)
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
    setSuccess(null)
    try {
      await recordDrillResult(studentId, result)
      setSuccess(`${selectedSkill?.name ?? 'Drill'} saved. Skill evidence and planning priorities were recalculated.`)
      setResult(initialResult(result.skillId))
      onSaved()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'The drill result could not be saved.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <section className={open ? 'panel drill-entry drill-entry--open' : 'panel drill-entry'}>
      <button className="drill-entry__toggle" type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <div>
          <span className="eyebrow">New evidence</span>
          <h2>Record a drill result</h2>
          <p>Add the score first; mistake details are optional but improve tomorrow’s recommendation.</p>
        </div>
        <span>{open ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span>
      </button>

      {open && (
        <div className="drill-entry__body">
          {error && <div className="inline-error" role="alert">{error}</div>}
          {success && <div className="inline-success" role="status"><CheckCircle2 size={16} /> {success}</div>}

          <div className="drill-entry__grid">
            <label className="field-label field-label--wide">Skill
              <select value={result.skillId} onChange={(event) => setResult({ ...result, skillId: event.target.value })}>
                {sectionSkills.map((skill) => <option key={skill.id} value={skill.id}>{skill.domain} · {skill.name}</option>)}
              </select>
            </label>
            <label className="field-label">Date<input type="date" max={localDateKey()} value={result.date} onChange={(event) => setResult({ ...result, date: event.target.value })} /></label>
            <label className="field-label">Difficulty<select value={result.difficulty} onChange={(event) => setResult({ ...result, difficulty: event.target.value as Difficulty })}><option>Easy</option><option>Medium</option><option>Hard</option><option>Mixed</option></select></label>
          </div>

          <div className="drill-entry__grid drill-entry__grid--score">
            <label className="field-label">Attempted<input type="number" min="1" max="100" value={result.attempted} onChange={(event) => setResult({ ...result, attempted: Number(event.target.value) })} /></label>
            <label className="field-label">Correct<input type="number" min="0" max={result.attempted} value={result.correct} onChange={(event) => setResult({ ...result, correct: Number(event.target.value) })} /></label>
            <div className="drill-entry__result"><strong>{accuracy}%</strong><span>{incorrect} incorrect</span></div>
            <label className="field-label">Time allowed<input type="number" min="1" max="180" placeholder="Optional" value={result.timeLimitMinutes ?? ''} onChange={(event) => setResult({ ...result, timeLimitMinutes: event.target.value ? Number(event.target.value) : undefined })} /></label>
            <label className="field-label">Time used<input type="number" min="0" max="180" step="0.5" placeholder="Optional" value={result.timeSpentMinutes ?? ''} onChange={(event) => setResult({ ...result, timeSpentMinutes: event.target.value ? Number(event.target.value) : undefined })} /></label>
          </div>

          <div className="drill-entry__grid">
            <label className="field-label field-label--wide">Source<input maxLength={200} value={result.source} onChange={(event) => setResult({ ...result, source: event.target.value })} /></label>
            <label className="field-label field-label--wide">Session note<input maxLength={500} placeholder="Optional context about the session" value={result.notes} onChange={(event) => setResult({ ...result, notes: event.target.value })} /></label>
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
            {validationError && <p>{validationError}</p>}
            <button className="button button--secondary" type="button" onClick={() => setOpen(false)}><X size={15} /> Close</button>
            <button className="button button--primary" type="button" disabled={Boolean(validationError) || working} onClick={() => void save()}>{working ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />} Save result</button>
          </div>
        </div>
      )}
    </section>
  )
}
