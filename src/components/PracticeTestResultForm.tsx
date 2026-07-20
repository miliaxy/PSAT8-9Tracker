import { useState } from 'react'
import { CheckCircle2, LoaderCircle, Plus, Save, Trash2, X } from 'lucide-react'
import { recordPracticeTestResult } from '../services/studentRepository'
import type {
  DailyTask,
  ErrorClassification,
  PracticeTestResultInput,
  PracticeTestResultMistakeInput,
  Skill,
} from '../types/models'

interface PracticeTestResultFormProps {
  studentId: string
  task: DailyTask
  skills: Skill[]
  onSaved: () => void
  onCancel: () => void
}

const classifications: ErrorClassification[] = [
  'Not Yet Taught', 'Concept Gap', 'Careless', 'Rushed / Timing', 'Second-Guessed',
  'Strategy', 'Misread Question', 'Guess', 'Other',
]

function initialResult(task: DailyTask): PracticeTestResultInput {
  return {
    taskId: task.id,
    date: task.date,
    name: task.title || 'PSAT 8/9 Practice Test',
    totalScore: 480,
    readingWritingScore: 240,
    mathScore: 240,
    reliabilityNote: '',
    mistakes: [],
  }
}

function emptyMistake(skills: Skill[]): PracticeTestResultMistakeInput {
  return { questionNumber: 1, module: 1, skillId: skills[0]?.id ?? '', classification: 'Concept Gap', note: '' }
}

export function PracticeTestResultForm({ studentId, task, skills, onSaved, onCancel }: PracticeTestResultFormProps) {
  const [result, setResult] = useState<PracticeTestResultInput>(() => initialResult(task))
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const validationError = result.readingWritingScore < 120 || result.readingWritingScore > 720
    ? 'Reading & Writing score must be between 120 and 720.'
    : result.mathScore < 120 || result.mathScore > 720
      ? 'Math score must be between 120 and 720.'
      : result.totalScore !== result.readingWritingScore + result.mathScore
        ? 'Total score must equal the two section scores.'
        : result.totalScore < 240 || result.totalScore > 1440
          ? 'Total score must be between 240 and 1440.'
          : !result.name.trim()
            ? 'Add the practice-test name.'
            : result.mistakes.some((mistake) => !mistake.skillId || !Number.isInteger(mistake.questionNumber) || mistake.questionNumber < 1 || mistake.questionNumber > 98)
              ? 'Every mistake needs a valid question number and skill.'
              : null

  const setSectionScore = (field: 'readingWritingScore' | 'mathScore', value: number) => {
    const next = { ...result, [field]: value }
    setResult({ ...next, totalScore: next.readingWritingScore + next.mathScore })
  }

  const updateMistake = (index: number, updates: Partial<PracticeTestResultMistakeInput>) => {
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
      await recordPracticeTestResult(studentId, result)
      setSuccess(`${result.name} saved. The score trend and planning evidence are now current.`)
      onSaved()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'The practice-test result could not be saved.')
    } finally {
      setWorking(false)
    }
  }

  return (
    <div className="assignment-result-form">
      <div className="assignment-result-form__header">
        <div><span className="eyebrow">Full-test evidence</span><h4>Record practice-test result</h4></div>
        <span className="assignment-prefill">Detailed mistakes are optional</span>
      </div>
      {error && <div className="inline-error" role="alert">{error}</div>}
      {success && <div className="inline-success" role="status"><CheckCircle2 size={16} /> {success}</div>}

      <div className="practice-result__identity">
        <label className="field-label field-label--wide">Practice test<input maxLength={160} value={result.name} onChange={(event) => setResult({ ...result, name: event.target.value })} /></label>
        <label className="field-label">Date<input type="date" value={result.date} onChange={(event) => setResult({ ...result, date: event.target.value })} /></label>
      </div>
      <div className="practice-result__scores">
        <label className="field-label">Reading &amp; Writing<input type="number" min="120" max="720" step="10" value={result.readingWritingScore} onChange={(event) => setSectionScore('readingWritingScore', Number(event.target.value))} /></label>
        <span>+</span>
        <label className="field-label">Math<input type="number" min="120" max="720" step="10" value={result.mathScore} onChange={(event) => setSectionScore('mathScore', Number(event.target.value))} /></label>
        <span>=</span>
        <div className="practice-result__total"><span>Total</span><strong>{result.totalScore}</strong></div>
      </div>
      <label className="field-label">Test note<input maxLength={500} placeholder="Optional: interruptions, extra breaks, or other reliability context" value={result.reliabilityNote} onChange={(event) => setResult({ ...result, reliabilityNote: event.target.value })} /></label>

      <div className="drill-entry__mistakes">
        <div className="drill-entry__mistake-heading">
          <div><span className="eyebrow">Optional</span><h3>Question-level mistakes</h3></div>
          <button className="button button--quiet" type="button" onClick={() => setResult({ ...result, mistakes: [...result.mistakes, emptyMistake(skills)] })}><Plus size={15} /> Add mistake</button>
        </div>
        {result.mistakes.map((mistake, index) => {
          const selectedSkill = skills.find((skill) => skill.id === mistake.skillId)
          return (
            <div className="practice-result__mistake" key={index}>
              <label className="field-label">Question<input type="number" min="1" max="98" value={mistake.questionNumber} onChange={(event) => updateMistake(index, { questionNumber: Number(event.target.value) })} /></label>
              <label className="field-label">Module<select value={mistake.module ?? ''} onChange={(event) => updateMistake(index, { module: event.target.value ? Number(event.target.value) as 1 | 2 : undefined })}><option value="">Unknown</option><option value="1">1</option><option value="2">2</option></select></label>
              <label className="field-label field-label--wide">Skill<select value={mistake.skillId} onChange={(event) => updateMistake(index, { skillId: event.target.value })}>{skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.section === 'Reading & Writing' ? 'R&W' : 'Math'} · {skill.name}</option>)}</select><small>{selectedSkill?.domain}</small></label>
              <label className="field-label">Mistake type<select value={mistake.classification} onChange={(event) => updateMistake(index, { classification: event.target.value as ErrorClassification })}>{classifications.map((classification) => <option key={classification}>{classification}</option>)}</select></label>
              <label className="field-label field-label--wide">What happened?<input maxLength={500} placeholder="Optional note" value={mistake.note} onChange={(event) => updateMistake(index, { note: event.target.value })} /></label>
              <button className="drill-entry__remove" type="button" aria-label={`Remove mistake ${index + 1}`} onClick={() => setResult({ ...result, mistakes: result.mistakes.filter((_, mistakeIndex) => mistakeIndex !== index) })}><Trash2 size={16} /></button>
            </div>
          )
        })}
      </div>

      <div className="drill-entry__actions">
        {validationError && <p>{validationError}</p>}
        <button className="button button--secondary" type="button" onClick={onCancel}><X size={15} /> Cancel</button>
        <button className="button button--primary" type="button" disabled={Boolean(validationError) || working || Boolean(success)} onClick={() => void save()}>{working ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />} Save test result</button>
      </div>
    </div>
  )
}
