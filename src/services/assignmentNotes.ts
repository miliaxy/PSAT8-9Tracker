import { supabase } from '../lib/supabase'

export const noteKinds = {
  note: 'Thoughts / notes', blocked: 'Cannot access resource', unclear: 'Instructions unclear',
  completed: 'Already completed', easy: 'Too easy / too short', difficult: 'Need help',
} as const
export type NoteKind = keyof typeof noteKinds
export interface AssignmentNote {
  id: string; student_id: string; task_id: string | null; task_title: string; task_date: string;
  task_resource: string | null; author_role: 'parent' | 'student'; kind: NoteKind; body: string; effectiveness_rating: number | null;
  created_at: string; reviewed_at: string | null; planning_response: string | null;
}
function db() { if (!supabase) throw new Error('Sign in to save private assignment notes.'); return supabase }
export async function loadAssignmentNotes(studentId: string) {
  const result: AssignmentNote[] = []
  for (let start = 0; ; start += 500) {
    const { data, error } = await db().from('assignment_notes').select('*').eq('student_id', studentId)
      .order('created_at', { ascending: false }).order('id').range(start, start + 499)
    if (error) throw new Error('Assignment notes could not be loaded. Please retry before planning.')
    result.push(...data as AssignmentNote[])
    if (data.length < 500) return result
  }
}
export async function addAssignmentNote(id: string, studentId: string, taskId: string, kind: NoteKind, body: string) {
  const { data, error } = await db().rpc('add_assignment_note', {
    note_id: id, target_student_id: studentId, target_task_id: taskId, note_kind: kind, note_body: body.trim(),
  })
  if (error) throw new Error(error.message)
  return data as AssignmentNote
}
export async function reviewAssignmentNote(id: string, response: string) {
  const { data, error } = await db().rpc('review_assignment_note', { target_note_id: id, response: response.trim() })
  if (error) throw new Error(error.message)
  return data as AssignmentNote
}

export async function addAssignmentRating(id: string, studentId: string, taskId: string, rating: number, rationale: string) {
  const { data, error } = await db().rpc('add_assignment_rating', {
    note_id: id, target_student_id: studentId, target_task_id: taskId, rating, rationale: rationale.trim(),
  })
  if (error) throw new Error(error.message)
  return data as AssignmentNote
}
