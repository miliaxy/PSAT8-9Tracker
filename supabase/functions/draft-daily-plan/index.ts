import { createClient } from 'npm:@supabase/supabase-js@2.110.7'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const allowedDayTypes = new Set(['normal', 'light', 'long', 'review'])
const allowedCategories = new Set(['Learn', 'Drill', 'Review', 'Test strategy', 'Reading'])
const allowedSections = new Set(['Reading & Writing', 'Math'])

type UnknownRow = Record<string, unknown>

interface RequestBody {
  studentId?: unknown
  targetDate?: unknown
  availableMinutes?: unknown
  dayType?: unknown
  parentNotes?: unknown
  mustInclude?: unknown
}

interface DraftTask {
  title: string
  description: string
  category: string
  section: string | null
  minutes: number
  resource: string | null
  skillIds: string[]
}

interface DailyPlanDraft {
  focus: string
  dayType: string
  coachNote: string
  rationale: string
  tasks: DraftTask[]
}

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function isDateKey(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function rows(value: unknown): UnknownRow[] {
  return Array.isArray(value) ? value as UnknownRow[] : []
}

function responseText(response: UnknownRow) {
  if (typeof response.output_text === 'string') return response.output_text

  const pieces: string[] = []
  for (const output of rows(response.output)) {
    if (output.type !== 'message') continue
    for (const content of rows(output.content)) {
      if (content.type === 'output_text' && typeof content.text === 'string') {
        pieces.push(content.text)
      }
    }
  }
  return pieces.join('')
}

async function hashIdentifier(value: string) {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function validateDraft(value: unknown, availableMinutes: number, validSkillIds: Set<string>): DailyPlanDraft {
  if (!value || typeof value !== 'object') throw new Error('The planner returned an empty draft.')
  const draft = value as UnknownRow
  const tasks = Array.isArray(draft.tasks) ? draft.tasks as UnknownRow[] : []

  if (typeof draft.focus !== 'string' || !draft.focus.trim()) throw new Error('The draft is missing a focus.')
  if (typeof draft.coachNote !== 'string' || !draft.coachNote.trim()) throw new Error('The draft is missing a coach note.')
  if (typeof draft.rationale !== 'string' || !draft.rationale.trim()) throw new Error('The draft is missing a rationale.')
  if (typeof draft.dayType !== 'string' || !allowedDayTypes.has(draft.dayType)) throw new Error('The draft has an invalid day type.')
  if (tasks.length < 1 || tasks.length > 6) throw new Error('The draft must contain between 1 and 6 assignments.')

  const normalizedTasks = tasks.map((task): DraftTask => {
    const title = typeof task.title === 'string' ? task.title.trim() : ''
    const description = typeof task.description === 'string' ? task.description.trim() : ''
    const category = typeof task.category === 'string' ? task.category : ''
    const section = typeof task.section === 'string' && allowedSections.has(task.section) ? task.section : null
    const minutes = Number(task.minutes)
    const resource = typeof task.resource === 'string' && task.resource.trim() ? task.resource.trim() : null
    const skillIds = Array.isArray(task.skillIds)
      ? task.skillIds.filter((id): id is string => typeof id === 'string' && validSkillIds.has(id))
      : []

    if (!title || !description || !allowedCategories.has(category)) throw new Error('An assignment is incomplete.')
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 180) throw new Error('An assignment has invalid minutes.')

    return { title, description, category, section, minutes, resource, skillIds: [...new Set(skillIds)] }
  })

  const totalMinutes = normalizedTasks.reduce((sum, task) => sum + task.minutes, 0)
  if (totalMinutes > availableMinutes) throw new Error('The draft exceeds the available study time.')

  return {
    focus: draft.focus.trim(),
    dayType: draft.dayType,
    coachNote: draft.coachNote.trim(),
    rationale: draft.rationale.trim(),
    tasks: normalizedTasks,
  }
}

const dailyPlanSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['focus', 'dayType', 'coachNote', 'rationale', 'tasks'],
  properties: {
    focus: { type: 'string', minLength: 1, maxLength: 120 },
    dayType: { type: 'string', enum: ['normal', 'light', 'long', 'review'] },
    coachNote: { type: 'string', minLength: 1, maxLength: 280 },
    rationale: { type: 'string', minLength: 1, maxLength: 500 },
    tasks: {
      type: 'array',
      minItems: 1,
      maxItems: 6,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'description', 'category', 'section', 'minutes', 'resource', 'skillIds'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: 100 },
          description: { type: 'string', minLength: 1, maxLength: 400 },
          category: { type: 'string', enum: ['Learn', 'Drill', 'Review', 'Test strategy', 'Reading'] },
          section: { type: ['string', 'null'], enum: ['Reading & Writing', 'Math', null] },
          minutes: { type: 'integer', minimum: 1, maximum: 180 },
          resource: { type: ['string', 'null'], maxLength: 160 },
          skillIds: { type: 'array', items: { type: 'string' }, maxItems: 4 },
        },
      },
    },
  },
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json(405, { error: 'Method not allowed.' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const publishableKeys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}') as Record<string, string>
  const supabasePublishableKey = publishableKeys.default || Deno.env.get('SUPABASE_ANON_KEY')
  const openAiKey = Deno.env.get('OPENAI_API_KEY')
  const authorization = request.headers.get('Authorization')

  if (!supabaseUrl || !supabasePublishableKey) return json(500, { error: 'The planner database is not configured.' })
  if (!openAiKey) return json(503, { error: 'AI planning is not configured yet. Start a blank draft for now.' })
  if (!authorization) return json(401, { error: 'Please sign in again.' })

  let body: RequestBody
  try {
    body = await request.json() as RequestBody
  } catch {
    return json(400, { error: 'The planning request is not valid.' })
  }

  const studentId = typeof body.studentId === 'string' ? body.studentId : ''
  const targetDate = body.targetDate
  const availableMinutes = Number(body.availableMinutes)
  const dayType = typeof body.dayType === 'string' ? body.dayType : 'normal'
  const parentNotes = typeof body.parentNotes === 'string' ? body.parentNotes.trim().slice(0, 1200) : ''
  const mustInclude = typeof body.mustInclude === 'string' ? body.mustInclude.trim().slice(0, 500) : ''

  if (!studentId || !isDateKey(targetDate)) return json(400, { error: 'Choose a student and planning date.' })
  if (!Number.isInteger(availableMinutes) || availableMinutes < 15 || availableMinutes > 180) {
    return json(400, { error: 'Available time must be between 15 and 180 minutes.' })
  }
  if (!allowedDayTypes.has(dayType)) return json(400, { error: 'Choose a valid study-day intensity.' })

  const db = createClient(supabaseUrl, supabasePublishableKey, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: userData, error: userError } = await db.auth.getUser()
  if (userError || !userData.user) return json(401, { error: 'Please sign in again.' })

  const { data: profile, error: profileError } = await db
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single()
  if (profileError || profile?.role !== 'parent_admin') {
    return json(403, { error: 'Only the parent account can create homework drafts.' })
  }

  const { data: student, error: studentError } = await db
    .from('student_profiles')
    .select('id, grade, target_score, test_date, baseline_score, current_score')
    .eq('id', studentId)
    .single()
  if (studentError || !student) return json(403, { error: 'This student profile is not available to your account.' })

  const fourteenDaysAgo = new Date(`${targetDate}T12:00:00Z`)
  fourteenDaysAgo.setUTCDate(fourteenDaysAgo.getUTCDate() - 14)
  const recentDate = fourteenDaysAgo.toISOString().slice(0, 10)

  const [skillsResult, testsResult, drillsResult, tasksResult, resourcesResult] = await Promise.all([
    db.from('student_skill_progress')
      .select('skill_id, concept_state, practice_test_rating, practice_test_attempted, practice_test_correct, drill_rating, drill_attempted, drill_correct, recent_drill_accuracy, trend, combined_status, last_practiced, next_step, skill_catalog(section, domain, name)')
      .eq('student_id', studentId),
    db.from('practice_tests')
      .select('test_date, total_score, reading_writing_score, math_score, reliability_note, blanks, pacing_issues, ninety_second_violations')
      .eq('student_id', studentId)
      .order('test_date', { ascending: false })
      .limit(3),
    db.from('drills')
      .select('drill_date, section, domain, skill_topic, difficulty, source, attempted, correct, accuracy, time_limit_minutes, time_spent_minutes, notes')
      .eq('student_id', studentId)
      .order('drill_date', { ascending: false })
      .limit(12),
    db.from('daily_tasks')
      .select('task_date, title, category, section, minutes, completed')
      .eq('student_id', studentId)
      .gte('task_date', recentDate)
      .order('task_date', { ascending: false })
      .limit(30),
    db.from('learning_resource_progress')
      .select('provider, title, section, status, progress, note')
      .eq('student_id', studentId)
      .in('status', ['In progress', 'Ready'])
      .order('sequence')
      .limit(12),
  ])

  const evidenceError = [skillsResult.error, testsResult.error, drillsResult.error, tasksResult.error, resourcesResult.error].find(Boolean)
  if (evidenceError) return json(500, { error: 'The current coaching evidence could not be loaded.' })

  const skills = rows(skillsResult.data)
  const priorityOrder = new Map([
    ['Needs review', 0],
    ['Developing', 1],
    ['Learning', 2],
    ['Not started', 3],
    ['Strong', 4],
    ['Mastered', 5],
  ])
  const prioritySkills = [...skills]
    .sort((a, b) => {
      const statusDifference = (priorityOrder.get(String(a.combined_status)) ?? 9) - (priorityOrder.get(String(b.combined_status)) ?? 9)
      if (statusDifference) return statusDifference
      return Number(a.recent_drill_accuracy ?? 101) - Number(b.recent_drill_accuracy ?? 101)
    })
    .slice(0, 8)
  const validSkillIds = new Set(skills.map((skill) => String(skill.skill_id)))

  const planningContext = {
    student: {
      grade: student.grade,
      baselineScore: student.baseline_score,
      currentScore: student.current_score,
      targetScore: student.target_score,
      testDate: student.test_date,
    },
    targetDate,
    parentConstraints: { availableMinutes, dayType, parentNotes, mustInclude },
    prioritySkills,
    recentPracticeTests: testsResult.data ?? [],
    recentDrills: drillsResult.data ?? [],
    recentAssignments: tasksResult.data ?? [],
    availableResources: resourcesResult.data ?? [],
  }

  const instructions = `You are a cautious PSAT 8/9 coach creating one day of homework for a minor.

Goal: produce a realistic, evidence-based draft that a parent will review before publication.

Requirements:
- Use only the supplied coaching evidence and resources. Do not invent book pages, exercise numbers, scores, or prior performance.
- Keep practice-test evidence and daily-drill evidence distinct when choosing priorities.
- Respect the parent's available minutes and requested day type. The sum of task minutes must not exceed availableMinutes.
- Prefer 2 to 4 focused assignments. Include learning or review before difficult drilling when the evidence shows a concept gap.
- Use only skillIds that appear in prioritySkills. It is acceptable to use an empty skillIds array.
- Make every assignment executable: name the resource when it is known and explain what success looks like.
- Avoid shame, diagnoses, guarantees, and comparisons with other students.
- The coachNote is student-facing. The rationale is parent-facing.
- This is a draft only. Do not claim that homework has been assigned or published.`

  const model = Deno.env.get('OPENAI_MODEL') || 'gpt-5.6-terra'
  const safetyIdentifier = await hashIdentifier(userData.user.id)
  const openAiResponse = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${openAiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      store: false,
      safety_identifier: safetyIdentifier,
      reasoning: { effort: 'medium' },
      instructions,
      input: JSON.stringify(planningContext),
      max_output_tokens: 2500,
      text: {
        verbosity: 'low',
        format: {
          type: 'json_schema',
          name: 'daily_homework_draft',
          strict: true,
          schema: dailyPlanSchema,
        },
      },
    }),
  })

  const responseBody = await openAiResponse.json() as UnknownRow
  if (!openAiResponse.ok) {
    console.error('OpenAI planning error', responseBody)
    return json(502, { error: 'The AI draft could not be created. Start a blank draft or try again.' })
  }

  let draft: DailyPlanDraft
  try {
    const text = responseText(responseBody)
    if (!text) throw new Error('No structured output was returned.')
    draft = validateDraft(JSON.parse(text), availableMinutes, validSkillIds)
    draft.dayType = dayType
  } catch (error) {
    console.error('Invalid AI planning output', error)
    return json(502, { error: 'The AI draft did not pass the homework safety checks. Start a blank draft or try again.' })
  }

  const evidenceSummary = {
    practiceTestsReviewed: rows(testsResult.data).length,
    recentDrillsReviewed: rows(drillsResult.data).length,
    recentAssignmentsReviewed: rows(tasksResult.data).length,
    prioritySkillIds: prioritySkills.map((skill) => skill.skill_id),
  }

  const { data: savedDraft, error: saveError } = await db
    .from('planning_drafts')
    .insert({
      student_id: studentId,
      target_date: targetDate,
      parent_inputs: { availableMinutes, dayType, parentNotes, mustInclude },
      draft,
      evidence_summary: evidenceSummary,
      model,
      created_by: userData.user.id,
    })
    .select('*')
    .single()

  if (saveError || !savedDraft) {
    console.error('Planning draft save error', saveError)
    return json(500, { error: 'The draft was created but could not be saved.' })
  }

  return json(200, { draft: savedDraft })
})
