import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { MessageSquare, Save } from 'lucide-react'
import { addAssignmentNote, loadAssignmentNotes, noteKinds, reviewAssignmentNote, type AssignmentNote, type NoteKind } from '../services/assignmentNotes'

interface NotesState {
  notes: AssignmentNote[]; loading: boolean; error: string; enabled: boolean; canReview: boolean;
  refresh: () => Promise<void>;
  save: (id: string, taskId: string, kind: NoteKind, body: string) => Promise<void>;
  review: (id: string, response: string) => Promise<void>;
}
const NotesContext = createContext<NotesState | null>(null)
export function AssignmentNotesProvider({ studentId, enabled, canReview, children }: {
  studentId: string; enabled: boolean; canReview: boolean; children: ReactNode;
}) {
  const [notes, setNotes] = useState<AssignmentNote[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState('')
  const request = useRef(0)
  const refresh = useCallback(async () => {
    if (!enabled) return
    const version = ++request.current
    setLoading(true)
    try { const next = await loadAssignmentNotes(studentId); if (version === request.current) { setNotes(next); setError('') } }
    catch (e) { if (version === request.current) setError(e instanceof Error ? e.message : 'Could not load notes.') }
    finally { if (version === request.current) setLoading(false) }
  }, [studentId, enabled])
  useEffect(() => {
    const timer = window.setTimeout(() => { void refresh() }, 0)
    const onFocus = () => { void refresh() }
    window.addEventListener('focus', onFocus)
    return () => { window.clearTimeout(timer); window.removeEventListener('focus', onFocus) }
  }, [refresh])
  const retain = (note: AssignmentNote) => { request.current++; setLoading(false); setNotes(current => [note, ...current.filter(n => n.id !== note.id)].sort((a,b) => b.created_at.localeCompare(a.created_at))) }
  const save = async (id: string, taskId: string, kind: NoteKind, body: string) => {
    if (!enabled) throw new Error('Sign in to save notes.'); retain(await addAssignmentNote(id, studentId, taskId, kind, body)); await refresh()
  }
  const review = async (id: string, response: string) => { retain(await reviewAssignmentNote(id, response)); await refresh() }
  return <NotesContext.Provider value={{ notes, loading, error, enabled, canReview, refresh, save, review }}>{children}</NotesContext.Provider>
}
// The hook shares the provider contract; it does not render UI.
// eslint-disable-next-line react-refresh/only-export-components
export function useAssignmentNotes() {
  const value = useContext(NotesContext)
  if (!value) throw new Error('Assignment notes provider is missing.')
  return value
}
function NoteEntry({ note, allowReview = false }: { note: AssignmentNote; allowReview?: boolean }) {
  const { review } = useAssignmentNotes()
  const [response, setResponse] = useState(note.planning_response ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  return <div className="assignment-note">
    <small>{note.author_role === 'parent' ? 'Parent' : 'Student'} · {new Date(note.created_at).toLocaleString()} · {noteKinds[note.kind]}</small>
    <p>{note.body}</p>
    {note.planning_response && <div className="assignment-note__response"><strong>Planning response</strong><p>{note.planning_response}</p></div>}
    {!note.reviewed_at && <small>Awaiting planning review</small>}
    {allowReview && !note.reviewed_at && <form onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError('')
      try { await review(note.id, response) } catch(e) { setError(e instanceof Error ? e.message : 'Could not save response.') } finally { setBusy(false) }
    }}>
      <label className="field-label">How will this affect the plan?<textarea value={response} onChange={e=>setResponse(e.target.value)} maxLength={2000} required disabled={busy} /></label>
      {error && <p role="alert">{error}</p>}
      <button className="button button--secondary" disabled={busy || !response.trim()}>{busy ? 'Saving…' : 'Save planning response'}</button>
    </form>}
  </div>
}
export function TaskNotes({ taskId }: { taskId: string }) {
  const { notes, enabled, loading, error, refresh, save } = useAssignmentNotes()
  const [body, setBody] = useState('')
  const [kind, setKind] = useState<NoteKind>('note')
  const [busy, setBusy] = useState(false)
  const [notice, setNotice] = useState('')
  const [saveError, setSaveError] = useState('')
  const retry = useRef<{ id: string; body: string; kind: NoteKind } | null>(null)
  const entries = notes.filter(n=>n.task_id === taskId)
  return <details className="task-notes">
    <summary><MessageSquare size={15} /> Notes & feedback{entries.length ? ` (${entries.length})` : ''}</summary>
    <p>Save thoughts, questions or an access problem. Shared with your parent and used when planning future work. Saving a note does not mark work complete.</p>
    {loading && <p role="status">Loading saved notes…</p>}
    {error && <p role="alert">{error} <button type="button" onClick={()=>void refresh()}>Retry</button></p>}
    {entries.map(note=><NoteEntry key={note.id} note={note} />)}
    {enabled ? <form onSubmit={async e=>{
      e.preventDefault(); setBusy(true); setNotice(''); setSaveError('')
      if (!retry.current || retry.current.body !== body || retry.current.kind !== kind) retry.current={id:crypto.randomUUID(),body,kind}
      try { await save(retry.current.id,taskId,kind,body); setBody(''); retry.current=null; setNotice('Saved. You can find this again in Assignment notes.') }
      catch(e) { setSaveError(e instanceof Error ? e.message : 'Could not save. Your text is still here; retry.') }
      finally { setBusy(false) }
    }}>
      <label className="field-label">Feedback type<select value={kind} onChange={e=>setKind(e.target.value as NoteKind)} disabled={busy}>{Object.entries(noteKinds).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
      <label className="field-label">Your note<textarea rows={4} maxLength={4000} required value={body} onChange={e=>{setBody(e.target.value);setNotice('')}} disabled={busy} placeholder="What happened? What should we change? You can include a link to your completed work." /></label>
      {saveError && <p role="alert">{saveError}</p>}
      {notice && <p role="status">{notice}</p>}
      <button className="button button--secondary" disabled={busy || !body.trim()}><Save size={14} />{busy ? 'Saving…' : 'Save note'}</button>
    </form> : <p>Sign in to save private notes. Demo notes are not stored.</p>}
  </details>
}
export function AssignmentNotesInbox({ planning = false }: { planning?: boolean }) {
  const { notes, loading, error, refresh, enabled, canReview } = useAssignmentNotes()
  const [search, setSearch] = useState('')
  const [pendingOnly, setPendingOnly] = useState(planning)
  const matching=notes.filter(n=>(!pendingOnly || !n.reviewed_at) && `${n.task_title} ${n.task_date} ${n.body} ${n.planning_response ?? ''}`.toLowerCase().includes(search.toLowerCase()))
  return <section className="panel assignment-notes-inbox" aria-label="Assignment notes and feedback">
    <div className="panel__header"><div><h2>{planning ? 'Feedback to use in this plan' : 'Assignment notes'}</h2><p>Notes stay here even when a plan changes. Parent responses explain what happens next.</p></div><button className="button button--quiet" onClick={()=>void refresh()} disabled={!enabled || loading}>Refresh notes</button></div>
    <label className="field-label">Find a note<input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Assignment, date or words in your note" /></label>
    <label className="notes-filter"><input type="checkbox" checked={pendingOnly} onChange={e=>setPendingOnly(e.target.checked)} /> Awaiting planning review only</label>
    {loading && <p role="status">Loading notes…</p>}{error && <p role="alert">{error}</p>}
    {!loading && !error && !matching.length && <p>{enabled ? 'No matching notes yet. Open Notes & feedback on any assignment to add one.' : 'Sign in to use private assignment notes.'}</p>}
    {matching.map(note=><article key={note.id}><h3>{note.task_date} · {note.task_title}</h3>{!note.task_id && <small>Earlier version of this assignment</small>}<NoteEntry note={note} allowReview={canReview} /></article>)}
  </section>
}
