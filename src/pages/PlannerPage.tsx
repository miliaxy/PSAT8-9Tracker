import { useEffect, useMemo, useState } from 'react'
import {
  CalendarCheck2,
  CheckCircle2,
  Clock3,
  Flag,
  FilePenLine,
  Lightbulb,
  LoaderCircle,
  Plus,
  Route,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react'
import { PageHeader } from '../components/ui'
import {
  createBlankPlanningDraft,
  createRecommendedPlanningDraft,
  loadLatestPlanningDraft,
  publishPlanningDraft,
  savePlanningDraft,
} from '../services/studentRepository'
import type {
  Drill,
  ParentPlanningInputs,
  PlanningDraftContent,
  PlanningDraftRecord,
  PlanningTaskDraft,
  PracticeTest,
  Skill,
  Student,
  TaskCategory,
} from '../types/models'
import { formatDate } from '../utils/format'
import { buildRecommendedPlan } from '../utils/recommendationEngine'
import { buildScoreRoadmap, validatePlanAgainstRoadmap } from '../utils/roadmapEngine'

interface PlannerPageProps {
  student: Student
  skills: Skill[]
  drills: Drill[]
  practiceTests: PracticeTest[]
  onPublished: () => void
}

const categories: TaskCategory[] = ['Learn', 'Drill', 'Review', 'Test strategy', 'Practice test', 'Reading']

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

function initialInputs(): ParentPlanningInputs {
  return {
    availableMinutes: 60,
    dayType: 'normal',
    parentNotes: '',
    mustInclude: '',
  }
}

function emptyTask(availableMinutes: number): PlanningTaskDraft {
  return {
    title: '',
    description: '',
    category: 'Learn',
    section: null,
    minutes: Math.min(20, availableMinutes),
    resource: null,
    skillIds: [],
  }
}

function validateDraft(record: PlanningDraftRecord | null, availableMinutes: number) {
  if (!record) return 'Create a draft first.'
  if (!record.draft.focus.trim()) return 'Add the day’s focus.'
  if (!record.draft.coachNote.trim()) return 'Add a short note for the student.'
  if (!record.draft.tasks.length && record.draft.dayType !== 'no-study') return 'Add at least one assignment.'

  for (const task of record.draft.tasks) {
    if (!task.title.trim() || !task.description.trim()) return 'Every assignment needs a title and clear instructions.'
    if (!Number.isInteger(task.minutes) || task.minutes < 1) return 'Every assignment needs valid minutes.'
  }

  const total = record.draft.tasks.reduce((sum, task) => sum + task.minutes, 0)
  if (total > availableMinutes) return `The assignments total ${total} minutes, above the ${availableMinutes}-minute limit.`
  return null
}

export function PlannerPage({ student, skills, drills, practiceTests, onPublished }: PlannerPageProps) {
  const [targetDate, setTargetDate] = useState(() => addDays(localDateKey(), 1))
  const [inputs, setInputs] = useState<ParentPlanningInputs>(initialInputs)
  const [record, setRecord] = useState<PlanningDraftRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [working, setWorking] = useState<'recommend' | 'blank' | 'save' | 'publish' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    void loadLatestPlanningDraft(student.id, targetDate)
      .then((nextRecord) => {
        if (!active) return
        setRecord(nextRecord)
        if (nextRecord?.parentInputs) setInputs(nextRecord.parentInputs)
        else setInputs(initialInputs())
      })
      .catch((nextError: unknown) => {
        if (active) setError(nextError instanceof Error ? nextError.message : 'The planning draft could not be loaded.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [student.id, targetDate])

  const totalMinutes = useMemo(
    () => record?.draft.tasks.reduce((sum, task) => sum + Number(task.minutes || 0), 0) ?? 0,
    [record],
  )
  const roadmap = useMemo(
    () => buildScoreRoadmap(student, skills, drills, practiceTests, targetDate),
    [student, skills, drills, practiceTests, targetDate],
  )
  const roadmapIssues = useMemo(
    () => record ? validatePlanAgainstRoadmap(record.draft, roadmap, skills, drills, targetDate) : [],
    [record, roadmap, skills, drills, targetDate],
  )
  const validationError = validateDraft(record, inputs.availableMinutes) ?? roadmapIssues[0] ?? null
  const published = record?.status === 'published'

  const changeTargetDate = (nextDate: string) => {
    setLoading(true)
    setError(null)
    setMessage(null)
    setRecord(null)
    setTargetDate(nextDate)
  }

  const run = async <T,>(kind: NonNullable<typeof working>, action: () => Promise<T>) => {
    setWorking(kind)
    setError(null)
    setMessage(null)
    try {
      return await action()
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Something went wrong. Please try again.')
      return null
    } finally {
      setWorking(null)
    }
  }

  const createRecommended = async () => {
    const recommendation = buildRecommendedPlan(student, skills, drills, practiceTests, targetDate, inputs)
    const recommendedInputs = { ...inputs, dayType: recommendation.draft.dayType }
    const nextRecord = await run('recommend', () => createRecommendedPlanningDraft(
      student.id,
      targetDate,
      recommendedInputs,
      recommendation.draft,
      recommendation.evidenceSummary,
    ))
    if (!nextRecord) return
    setRecord(nextRecord)
    setInputs(nextRecord.parentInputs)
    setMessage('Recommended draft created from the current evidence. Edit anything you want, then publish with one click.')
  }

  const createBlank = async () => {
    const nextRecord = await run('blank', () => createBlankPlanningDraft(student.id, targetDate, inputs))
    if (!nextRecord) return
    setRecord(nextRecord)
    setMessage('Blank draft ready. Fill in the assignments, then publish with one click when it is ready.')
  }

  const updateContent = (updates: Partial<PlanningDraftContent>) => {
    setRecord((current) => current ? {
      ...current,
      parentInputs: inputs,
      draft: { ...current.draft, ...updates },
    } : current)
  }

  const updateTask = (index: number, updates: Partial<PlanningTaskDraft>) => {
    if (!record) return
    const tasks = record.draft.tasks.map((task, taskIndex) => taskIndex === index ? { ...task, ...updates } : task)
    updateContent({ tasks })
  }

  const save = async () => {
    if (!record || published) return
    const recordToSave = {
      ...record,
      parentInputs: inputs,
      draft: { ...record.draft, dayType: inputs.dayType },
      evidenceSummary: {
        ...record.evidenceSummary,
        roadmap: {
          phaseId: roadmap.activePhase.id,
          phaseLabel: roadmap.activePhase.label,
          milestoneId: roadmap.activeMilestone.id,
          milestoneTitle: roadmap.activeMilestone.title,
          weekStart: roadmap.activeMilestone.weekStart,
          weekEnd: roadmap.activeMilestone.weekEnd,
          scoreCheckpoint: roadmap.activeMilestone.scoreCheckpoint,
          prioritySkillIds: roadmap.activeMilestone.prioritySkillIds,
          outcomes: roadmap.activeMilestone.outcomes,
        },
      },
    }
    const saved = await run('save', () => savePlanningDraft(recordToSave))
    if (!saved) return
    setRecord(saved)
    setMessage('Draft saved privately. It is still not visible as homework.')
  }

  const publish = async () => {
    if (!record || published || validationError) return
    const recordToSave = {
      ...record,
      parentInputs: inputs,
      draft: { ...record.draft, dayType: inputs.dayType },
      evidenceSummary: {
        ...record.evidenceSummary,
        roadmap: {
          phaseId: roadmap.activePhase.id,
          phaseLabel: roadmap.activePhase.label,
          milestoneId: roadmap.activeMilestone.id,
          milestoneTitle: roadmap.activeMilestone.title,
          weekStart: roadmap.activeMilestone.weekStart,
          weekEnd: roadmap.activeMilestone.weekEnd,
          scoreCheckpoint: roadmap.activeMilestone.scoreCheckpoint,
          prioritySkillIds: roadmap.activeMilestone.prioritySkillIds,
          outcomes: roadmap.activeMilestone.outcomes,
        },
      },
    }
    const saved = await run('publish', () => savePlanningDraft(recordToSave))
    if (!saved) return
    const publishedDate = await run('publish', () => publishPlanningDraft(saved.id))
    if (!publishedDate) return
    setRecord({ ...saved, status: 'published', publishedAt: new Date().toISOString() })
    setMessage(`Homework for ${formatDate(publishedDate)} is published. ${student.firstName} will see it after refreshing the dashboard.`)
    onPublished()
  }

  return (
    <>
      <PageHeader
        eyebrow="Parent workspace"
        title="Daily Planning Room"
        description={`Create ${student.firstName}’s next homework plan from recent evidence, edit it if needed, then publish it.`}
        action={<span className="planner-private-badge"><ShieldCheck size={15} /> Parent only</span>}
      />

      <section className="planner-safety-strip">
        <ShieldCheck size={18} />
        <div>
          <strong>Draft first, one-click publish second</strong>
          <p>Nothing reaches the student dashboard until you select Publish homework.</p>
        </div>
      </section>

      <section className="planner-roadmap-link">
        <span className="planner-roadmap-link__icon"><Route size={18} /></span>
        <div>
          <span className="eyebrow">Active 1400 milestone · {formatDate(roadmap.activeMilestone.weekStart)}–{formatDate(roadmap.activeMilestone.weekEnd)}</span>
          <strong>{roadmap.activeMilestone.title}</strong>
          <p>{roadmap.activeMilestone.outcomes[0]}</p>
        </div>
        <div className="planner-roadmap-link__checkpoint"><Flag size={14} /><span>Checkpoint</span><strong>{roadmap.activeMilestone.scoreCheckpoint}</strong></div>
      </section>

      <div className="planner-layout">
        <aside className="panel planner-setup">
          <div className="panel__header panel__header--compact">
            <div><span className="eyebrow">Step 1</span><h2>Set tomorrow’s boundaries</h2></div>
            <CalendarCheck2 size={19} />
          </div>

          <label className="field-label">
            Homework date
            <input
              type="date"
              value={targetDate}
              onChange={(event) => {
                if (event.target.value) changeTargetDate(event.target.value)
              }}
            />
          </label>

          <div className="planner-field-row">
            <label className="field-label">
              Available time
              <div className="input-with-unit"><input type="number" min="15" max="180" step="5" value={inputs.availableMinutes} onChange={(event) => setInputs({ ...inputs, availableMinutes: Number(event.target.value) })} /><span>min</span></div>
            </label>
            <label className="field-label">
              Day intensity
              <select value={inputs.dayType} onChange={(event) => setInputs({ ...inputs, dayType: event.target.value as ParentPlanningInputs['dayType'] })}>
                <option value="light">Light</option>
                <option value="normal">Normal</option>
                <option value="long">Long</option>
                <option value="review">Review</option>
                {new Date(`${targetDate}T12:00:00`).getDay() === 0 && <option value="no-study">No study</option>}
              </select>
            </label>
          </div>

          <label className="field-label">
            Anything that must be included?
            <input value={inputs.mustInclude} placeholder="Example: finish the Khan algebra lesson" maxLength={500} onChange={(event) => setInputs({ ...inputs, mustInclude: event.target.value })} />
          </label>

          <label className="field-label">
            Parent context
            <textarea value={inputs.parentNotes} placeholder="Example: heavy school-homework night; keep this focused" maxLength={1200} rows={4} onChange={(event) => setInputs({ ...inputs, parentNotes: event.target.value })} />
            <small>Share only what affects the plan; avoid school names or other identifying details.</small>
          </label>

          <div className="planner-create-actions">
            <button className="button button--primary" disabled={Boolean(working) || inputs.availableMinutes < 15 || inputs.availableMinutes > 180} onClick={() => void createRecommended()}>
              {working === 'recommend' ? <LoaderCircle className="spin" size={16} /> : <Sparkles size={16} />} Build recommended plan
            </button>
            <button className="button button--secondary" disabled={Boolean(working)} onClick={() => void createBlank()}>
              {working === 'blank' ? <LoaderCircle className="spin" size={16} /> : <FilePenLine size={16} />} Start blank
            </button>
          </div>
        </aside>

        <section className="panel planner-editor">
          <div className="panel__header">
            <div>
              <span className="eyebrow">Step 2 · Edit or publish</span>
              <h2>{published ? 'Published homework' : 'Editable homework draft'}</h2>
            </div>
            {record && <span className={`draft-status draft-status--${record.status}`}>{record.status}</span>}
          </div>

          {error && <div className="inline-error" role="alert">{error}</div>}
          {message && <div className="inline-success" role="status"><CheckCircle2 size={16} /> {message}</div>}

          {loading ? (
            <div className="planner-empty"><LoaderCircle className="spin" size={24} /><p>Checking for a draft…</p></div>
          ) : !record ? (
            <div className="planner-empty">
              <div><Lightbulb size={25} /></div>
              <h3>No draft for {formatDate(targetDate)}</h3>
              <p>Set the time and context, then build a recommendation from the current evidence or start with a blank plan.</p>
            </div>
          ) : (
            <div className={published ? 'planner-form planner-form--locked' : 'planner-form'}>
              <div className="planner-field-row planner-field-row--focus">
                <label className="field-label">
                  Day’s focus
                  <input disabled={published} value={record.draft.focus} placeholder="Example: Linear equations—accuracy before speed" onChange={(event) => updateContent({ focus: event.target.value })} />
                </label>
                <div className="planner-total"><Clock3 size={16} /><strong>{totalMinutes}</strong><span>of {inputs.availableMinutes} min</span></div>
              </div>

              <label className="field-label">
                Note shown to {student.firstName}
                <textarea disabled={published} value={record.draft.coachNote} rows={2} placeholder="A short, encouraging coaching note" onChange={(event) => updateContent({ coachNote: event.target.value })} />
              </label>

              {record.draft.rationale && (
                <div className="planner-rationale"><Lightbulb size={17} /><div><strong>Why this plan</strong><p>{record.draft.rationale}</p></div></div>
              )}

              {record.evidenceSummary.source === 'rules-v1' && Array.isArray(record.evidenceSummary.priorities) && (
                <details className="planner-evidence" open>
                  <summary><span><Sparkles size={16} /> How the recommendation was calculated</span><small>Transparent rules · recalculated from saved results</small></summary>
                  <div className="planner-evidence__body">
                    <div className="planner-evidence__rules">
                      {(Array.isArray(record.evidenceSummary.rulesApplied) ? record.evidenceSummary.rulesApplied : []).map((rule) => <span key={String(rule)}><CheckCircle2 size={13} /> {String(rule)}</span>)}
                    </div>
                    <div className="planner-evidence__priorities">
                      {(record.evidenceSummary.priorities as Array<Record<string, unknown>>).slice(0, 3).map((priority, index) => (
                        <article key={String(priority.skillId)}>
                          <span>Priority {index + 1}</span>
                          <strong>{String(priority.skillName)}</strong>
                          <small>{String(priority.section)} · {String(priority.domain)}</small>
                          <ul>{(Array.isArray(priority.reasons) ? priority.reasons : []).map((reason) => <li key={String(reason)}>{String(reason)}</li>)}</ul>
                        </article>
                      ))}
                    </div>
                  </div>
                </details>
              )}

              <div className="planner-task-heading">
                <div><span className="eyebrow">Assignments</span><h3>What {student.firstName} will do</h3></div>
                {!published && <button className="button button--quiet" onClick={() => updateContent({ tasks: [...record.draft.tasks, emptyTask(inputs.availableMinutes)] })}><Plus size={15} /> Add task</button>}
              </div>

              <div className="planner-task-list">
                {record.draft.tasks.map((task, index) => (
                  <article className="planner-task" key={`${record.id}-${index}`}>
                    <div className="planner-task__number">{index + 1}</div>
                    <div className="planner-task__fields">
                      <div className="planner-field-row">
                        <label className="field-label field-label--wide">Title<input disabled={published} value={task.title} placeholder="Assignment title" onChange={(event) => updateTask(index, { title: event.target.value })} /></label>
                        <label className="field-label field-label--minutes">Minutes<input disabled={published} type="number" min="1" max="180" value={task.minutes} onChange={(event) => updateTask(index, { minutes: Number(event.target.value) })} /></label>
                      </div>
                      <label className="field-label">Clear instructions<textarea disabled={published} value={task.description} rows={2} placeholder="Exactly what to do and how to check the work" onChange={(event) => updateTask(index, { description: event.target.value })} /></label>
                      <div className="planner-field-row planner-field-row--three">
                        <label className="field-label">Type<select disabled={published} value={task.category} onChange={(event) => updateTask(index, { category: event.target.value as TaskCategory })}>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
                        <label className="field-label">Section<select disabled={published} value={task.section ?? ''} onChange={(event) => updateTask(index, { section: event.target.value ? event.target.value as PlanningTaskDraft['section'] : null })}><option value="">Both / general</option><option>Reading &amp; Writing</option><option>Math</option></select></label>
                        <label className="field-label">Priority skill<select disabled={published} value={task.skillIds[0] ?? ''} onChange={(event) => updateTask(index, { skillIds: event.target.value ? [event.target.value] : [] })}><option value="">No linked skill</option>{skills.map((skill) => <option key={skill.id} value={skill.id}>{skill.name}</option>)}</select></label>
                      </div>
                      <label className="field-label">Resource<input disabled={published} value={task.resource ?? ''} placeholder="Khan Academy, prep book, or other source" onChange={(event) => updateTask(index, { resource: event.target.value || null })} /></label>
                    </div>
                    {!published && record.draft.tasks.length > 1 && <button className="planner-task__remove" aria-label={`Remove assignment ${index + 1}`} onClick={() => updateContent({ tasks: record.draft.tasks.filter((_, taskIndex) => taskIndex !== index) })}><Trash2 size={16} /></button>}
                  </article>
                ))}
              </div>

              {!published && (
                <div className="planner-publish-box">
                  {roadmapIssues.length > 0 && (
                    <div className="planner-roadmap-issues" role="alert">
                      <strong>Roadmap check found {roadmapIssues.length} {roadmapIssues.length === 1 ? 'issue' : 'issues'}:</strong>
                      <ul>{roadmapIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul>
                    </div>
                  )}
                  {validationError && !roadmapIssues.length && <p className="planner-validation">{validationError}</p>}
                  {!validationError && <p className="planner-publish-note"><strong>Ready to publish.</strong> Selecting Publish homework is the parent approval step.</p>}
                  <div>
                    <button className="button button--secondary" disabled={Boolean(working)} onClick={() => void save()}>{working === 'save' ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />} Save draft</button>
                    <button className="button button--primary" disabled={Boolean(working) || Boolean(validationError)} onClick={() => void publish()}>{working === 'publish' ? <LoaderCircle className="spin" size={16} /> : <Send size={16} />} Publish homework</button>
                  </div>
                </div>
              )}

              {published && (
                <div className="planner-published-actions">
                  <CheckCircle2 size={19} />
                  <div><strong>Published for {formatDate(record.targetDate)}</strong><p>To make changes, start a new draft. Publishing it will replace this day only if no assignment has been completed.</p></div>
                  <button className="button button--secondary" disabled={Boolean(working)} onClick={() => void createBlank()}><FilePenLine size={15} /> Create revision</button>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </>
  )
}
