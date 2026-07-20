import { supabase } from '../lib/supabase'
import type {
  Book,
  CoachingStatus,
  ConceptState,
  DailyTask,
  DashboardBundle,
  DayType,
  Difficulty,
  Drill,
  ErrorClassification,
  EvidenceRating,
  LearningResourceUnit,
  ParentPlanningInputs,
  PlanningDraftContent,
  PlanningDraftRecord,
  PracticeTest,
  Section,
  Skill,
  StudyDay,
  StudyPlan,
  Student,
  TaskCategory,
  Trend,
} from '../types/models'

type Row = Record<string, unknown>

function client() {
  if (!supabase) throw new Error('Supabase is not configured.')
  return supabase
}

function rows(data: unknown): Row[] {
  return Array.isArray(data) ? data as Row[] : []
}

function value<T>(row: Row, key: string) {
  return row[key] as T
}

function optionalNumber(input: unknown) {
  return input === null || input === undefined ? undefined : Number(input)
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function emptyPlan(studentId: string): StudyPlan {
  return {
    id: 'not-scheduled',
    studentId,
    weekOf: localDateKey(),
    title: 'Study plan not scheduled',
    goal: 'A parent administrator can add the first weekly plan.',
    days: [],
  }
}

function mapStudent(row: Row): Student {
  return {
    id: String(row.id),
    userId: String(row.auth_user_id || ''),
    firstName: String(row.first_name),
    grade: Number(row.grade),
    targetScore: Number(row.target_score),
    testDate: String(row.test_date),
    baselineScore: Number(row.baseline_score),
    currentScore: Number(row.current_score),
    avatarInitials: String(row.avatar_initials),
  }
}

export async function loadAccessibleStudents(): Promise<Student[]> {
  const { data, error } = await client()
    .from('student_profiles')
    .select('id, auth_user_id, first_name, grade, target_score, test_date, baseline_score, current_score, avatar_initials')
    .order('created_at', { ascending: true })

  if (error) throw new Error(error.message)
  return rows(data).map(mapStudent)
}

export async function loadStudentDashboard(student: Student): Promise<DashboardBundle> {
  const db = client()
  const studentId = student.id

  const [
    skillCatalogResult,
    skillProgressResult,
    testsResult,
    testDomainsResult,
    testMistakesResult,
    drillsResult,
    drillMistakesResult,
    plansResult,
    booksResult,
    resourcesResult,
  ] = await Promise.all([
    db.from('skill_catalog').select('*').order('sort_order'),
    db.from('student_skill_progress').select('*').eq('student_id', studentId),
    db.from('practice_tests').select('*').eq('student_id', studentId).order('test_date', { ascending: true }),
    db.from('practice_test_domains').select('*').eq('student_id', studentId),
    db.from('practice_test_mistakes').select('*').eq('student_id', studentId).order('question_number'),
    db.from('drills').select('*').eq('student_id', studentId).order('drill_date', { ascending: false }),
    db.from('drill_mistakes').select('*').eq('student_id', studentId),
    db.from('study_plans').select('*').eq('student_id', studentId).order('week_of', { ascending: false }).limit(1),
    db.from('books').select('*').eq('student_id', studentId).order('created_at'),
    db.from('learning_resource_progress').select('*').eq('student_id', studentId).order('provider').order('sequence'),
  ])

  const firstError = [
    skillCatalogResult.error,
    skillProgressResult.error,
    testsResult.error,
    testDomainsResult.error,
    testMistakesResult.error,
    drillsResult.error,
    drillMistakesResult.error,
    plansResult.error,
    booksResult.error,
    resourcesResult.error,
  ].find(Boolean)
  if (firstError) throw new Error(firstError.message)

  const progressBySkill = new Map(rows(skillProgressResult.data).map((row) => [String(row.skill_id), row]))
  const skills: Skill[] = rows(skillCatalogResult.data).map((catalog) => {
    const progress = progressBySkill.get(String(catalog.id))
    const practiceAttempted = progress ? Number(progress.practice_test_attempted) : 0
    const practiceCorrect = progress ? Number(progress.practice_test_correct) : 0
    const drillAttempted = progress ? Number(progress.drill_attempted) : 0
    return {
      id: String(catalog.id),
      section: value<Section>(catalog, 'section'),
      domain: String(catalog.domain),
      name: String(catalog.name),
      description: String(catalog.description),
      conceptState: (progress?.concept_state || 'not_yet_taught') as ConceptState,
      practiceTestEvidence: {
        rating: (progress?.practice_test_rating || 'No evidence') as EvidenceRating,
        totalAttempted: practiceAttempted,
        totalCorrect: practiceCorrect,
        recentAccuracy: practiceAttempted ? Math.round((practiceCorrect / practiceAttempted) * 100) : undefined,
        sampleSize: practiceAttempted,
      },
      drillEvidence: {
        rating: (progress?.drill_rating || 'No evidence') as EvidenceRating,
        totalAttempted: drillAttempted,
        totalCorrect: progress ? Number(progress.drill_correct) : 0,
        recentAccuracy: optionalNumber(progress?.recent_drill_accuracy),
        sampleSize: drillAttempted,
      },
      trend: (progress?.trend || 'steady') as Trend,
      combinedStatus: (progress?.combined_status || 'Not started') as CoachingStatus,
      lastPracticed: progress?.last_practiced ? String(progress.last_practiced) : undefined,
      khanProgress: optionalNumber(progress?.khan_progress),
      nextStep: progress ? String(progress.next_step) : 'Not scheduled yet.',
    }
  })

  const domainRows = rows(testDomainsResult.data)
  const mistakeRows = rows(testMistakesResult.data)
  const practiceTests: PracticeTest[] = rows(testsResult.data).map((test) => ({
    id: String(test.id),
    date: String(test.test_date),
    name: String(test.name),
    totalScore: Number(test.total_score),
    readingWritingScore: Number(test.reading_writing_score),
    mathScore: Number(test.math_score),
    totalCorrect: Number(test.total_correct),
    totalIncorrect: Number(test.total_incorrect),
    readingWritingCorrect: Number(test.reading_writing_correct),
    readingWritingIncorrect: Number(test.reading_writing_incorrect),
    mathCorrect: Number(test.math_correct),
    mathIncorrect: Number(test.math_incorrect),
    reliabilityNote: test.reliability_note ? String(test.reliability_note) : undefined,
    domainPerformance: domainRows.filter((row) => row.test_id === test.id).map((row) => ({
      domain: String(row.domain),
      section: value<Section>(row, 'section'),
      correct: Number(row.correct),
      total: Number(row.total),
    })),
    mistakes: mistakeRows.filter((row) => row.test_id === test.id).map((row) => ({
      id: String(row.id),
      practiceTestId: String(test.id),
      questionNumber: Number(row.question_number),
      module: row.module ? Number(row.module) as 1 | 2 : undefined,
      section: value<Section>(row, 'section'),
      domain: String(row.domain),
      skillTopic: String(row.skill_topic),
      classification: value<ErrorClassification>(row, 'classification'),
      userNote: row.user_note ? String(row.user_note) : undefined,
      recommendedAction: String(row.recommended_action),
      reviewed: Boolean(row.reviewed),
    })),
    strategyMetrics: {
      blanks: Number(test.blanks),
      pacingIssues: Number(test.pacing_issues),
      ninetySecondViolations: Number(test.ninety_second_violations),
      rushedQuestions: Number(test.rushed_questions),
      module1Accuracy: optionalNumber(test.module_1_accuracy),
      module2Accuracy: optionalNumber(test.module_2_accuracy),
    },
  }))

  const drillMistakes = rows(drillMistakesResult.data)
  const drills: Drill[] = rows(drillsResult.data).map((drill) => ({
    id: String(drill.id),
    date: String(drill.drill_date),
    section: value<Section>(drill, 'section'),
    domain: String(drill.domain),
    skillTopic: String(drill.skill_topic),
    difficulty: value<Difficulty>(drill, 'difficulty'),
    source: String(drill.source),
    attempted: Number(drill.attempted),
    correct: Number(drill.correct),
    incorrect: Number(drill.incorrect),
    accuracy: Number(drill.accuracy),
    timeLimitMinutes: optionalNumber(drill.time_limit_minutes),
    timeSpentMinutes: optionalNumber(drill.time_spent_minutes),
    notes: drill.notes ? String(drill.notes) : undefined,
    mistakes: drillMistakes.filter((row) => row.drill_id === drill.id).map((row) => ({
      id: String(row.id),
      questionNumber: optionalNumber(row.question_number),
      classification: value<ErrorClassification>(row, 'classification'),
      note: row.note ? String(row.note) : undefined,
    })),
  }))

  let studyPlan = emptyPlan(studentId)
  const planRow = rows(plansResult.data)[0]
  if (planRow) {
    const { data: dayData, error: dayError } = await db
      .from('study_days')
      .select('*')
      .eq('student_id', studentId)
      .eq('plan_id', String(planRow.id))
      .order('study_date')
    if (dayError) throw new Error(dayError.message)

    const dayRows = rows(dayData)
    const dayIds = dayRows.map((row) => String(row.id))
    const taskResult = dayIds.length
      ? await db.from('daily_tasks').select('*').eq('student_id', studentId).in('day_id', dayIds).order('task_date')
      : { data: [], error: null }
    if (taskResult.error) throw new Error(taskResult.error.message)

    const taskRows = rows(taskResult.data)
    const taskIds = taskRows.map((row) => String(row.id))
    const taskSkillResult = taskIds.length
      ? await db.from('daily_task_skills').select('*').eq('student_id', studentId).in('task_id', taskIds)
      : { data: [], error: null }
    if (taskSkillResult.error) throw new Error(taskSkillResult.error.message)
    const taskSkillRows = rows(taskSkillResult.data)

    const days: StudyDay[] = dayRows.map((day) => ({
      date: String(day.study_date),
      dayType: value<DayType>(day, 'day_type'),
      focus: String(day.focus),
      note: day.note ? String(day.note) : undefined,
      tasks: taskRows.filter((task) => task.day_id === day.id).map((task): DailyTask => ({
        id: String(task.id),
        date: String(task.task_date),
        title: String(task.title),
        description: String(task.description),
        category: value<TaskCategory>(task, 'category'),
        section: task.section ? value<Section>(task, 'section') : undefined,
        minutes: Number(task.minutes),
        resource: task.resource ? String(task.resource) : undefined,
        skillIds: taskSkillRows.filter((link) => link.task_id === task.id).map((link) => String(link.skill_id)),
        initialCompleted: Boolean(task.completed),
      })),
    }))

    studyPlan = {
      id: String(planRow.id),
      studentId,
      weekOf: String(planRow.week_of),
      title: String(planRow.title),
      goal: String(planRow.goal),
      days,
    }
  }

  const books: Book[] = rows(booksResult.data).map((book) => ({
    id: String(book.id),
    title: String(book.title),
    author: String(book.author),
    category: value<Book['category']>(book, 'category'),
    pagesRead: Number(book.pages_read),
    totalPages: Number(book.total_pages),
    weeklyGoalPages: Number(book.weekly_goal_pages),
    note: String(book.note),
    accent: String(book.accent),
  }))

  const learningResources: LearningResourceUnit[] = rows(resourcesResult.data).map((resource) => ({
    id: String(resource.id),
    provider: value<LearningResourceUnit['provider']>(resource, 'provider'),
    title: String(resource.title),
    section: value<LearningResourceUnit['section']>(resource, 'section'),
    sequence: Number(resource.sequence),
    status: value<LearningResourceUnit['status']>(resource, 'status'),
    progress: Number(resource.progress),
    note: String(resource.note),
  }))

  const todayKey = localDateKey()
  const todayTasks = studyPlan.days.find((day) => day.date === todayKey)?.tasks ?? []

  return { student, todayTasks, studyPlan, practiceTests, drills, skills, books, learningResources }
}

export async function setTaskCompletion(studentId: string, taskId: string, completed: boolean) {
  const { error } = await client()
    .from('daily_tasks')
    .update({ completed })
    .eq('student_id', studentId)
    .eq('id', taskId)

  if (error) throw new Error(error.message)
}

function mapPlanningDraft(row: Row): PlanningDraftRecord {
  return {
    id: String(row.id),
    studentId: String(row.student_id),
    targetDate: String(row.target_date),
    status: value<PlanningDraftRecord['status']>(row, 'status'),
    parentInputs: value<ParentPlanningInputs>(row, 'parent_inputs'),
    draft: value<PlanningDraftContent>(row, 'draft'),
    evidenceSummary: value<Record<string, unknown>>(row, 'evidence_summary') || {},
    model: row.model ? String(row.model) : undefined,
    publishedAt: row.published_at ? String(row.published_at) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  }
}

export async function loadLatestPlanningDraft(studentId: string, targetDate: string) {
  const { data, error } = await client()
    .from('planning_drafts')
    .select('*')
    .eq('student_id', studentId)
    .eq('target_date', targetDate)
    .in('status', ['draft', 'published'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data ? mapPlanningDraft(data as Row) : null
}

export async function createBlankPlanningDraft(
  studentId: string,
  targetDate: string,
  inputs: ParentPlanningInputs,
) {
  const content: PlanningDraftContent = {
    focus: '',
    dayType: inputs.dayType,
    coachNote: '',
    rationale: 'Parent-created draft.',
    tasks: [{
      title: '',
      description: '',
      category: 'Learn',
      section: null,
      minutes: Math.min(20, inputs.availableMinutes),
      resource: null,
      skillIds: [],
    }],
  }

  const { data, error } = await client()
    .from('planning_drafts')
    .insert({
      student_id: studentId,
      target_date: targetDate,
      parent_inputs: inputs,
      draft: content,
      evidence_summary: { source: 'parent' },
    })
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapPlanningDraft(data as Row)
}

export async function requestAiPlanningDraft(
  studentId: string,
  targetDate: string,
  inputs: ParentPlanningInputs,
) {
  const { data, error } = await client().functions.invoke('draft-daily-plan', {
    body: {
      studentId,
      targetDate,
      availableMinutes: inputs.availableMinutes,
      dayType: inputs.dayType,
      parentNotes: inputs.parentNotes,
      mustInclude: inputs.mustInclude,
    },
  })

  if (error) {
    let message = error.message
    const context = 'context' in error ? error.context : null
    if (context instanceof Response) {
      try {
        const body = await context.clone().json() as { error?: string }
        if (body.error) message = body.error
      } catch {
        // Keep the function client's error message when no JSON body is available.
      }
    }
    throw new Error(message)
  }
  if (!data?.draft) throw new Error('The AI planner did not return a saved draft.')
  return mapPlanningDraft(data.draft as Row)
}

export async function savePlanningDraft(record: PlanningDraftRecord) {
  const { data, error } = await client()
    .from('planning_drafts')
    .update({ parent_inputs: record.parentInputs, draft: record.draft })
    .eq('id', record.id)
    .eq('student_id', record.studentId)
    .eq('status', 'draft')
    .select('*')
    .single()

  if (error) throw new Error(error.message)
  return mapPlanningDraft(data as Row)
}

export async function publishPlanningDraft(draftId: string) {
  const { data, error } = await client().rpc('publish_planning_draft', { target_draft_id: draftId })
  if (error) throw new Error(error.message)
  return String(data)
}
