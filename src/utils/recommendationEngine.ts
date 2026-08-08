import type {
  Drill,
  ParentPlanningInputs,
  PlanningDraftContent,
  PlanningTaskDraft,
  PracticeTest,
  RecommendationEvidenceItem,
  RecommendationEvidenceSummary,
  ScoreRoadmap,
  Skill,
  Student,
} from '../types/models'
import { curriculumBySkillId } from '../data/curriculumMap'
import { buildScoreRoadmap } from './roadmapEngine'

export interface RecommendedPlan {
  draft: PlanningDraftContent
  evidenceSummary: RecommendationEvidenceSummary
}

function connectRoadmap(plan: RecommendedPlan, roadmap: ScoreRoadmap): RecommendedPlan {
  return {
    draft: {
      ...plan.draft,
      rationale: `${plan.draft.rationale} Active roadmap milestone: ${roadmap.activeMilestone.title}. ${roadmap.activeMilestone.outcomes.join(' ')}`,
    },
    evidenceSummary: {
      ...plan.evidenceSummary,
      rulesApplied: [
        `Every assignment must advance the active ${roadmap.activeMilestone.title} milestone or protect retention/recovery.`,
        ...plan.evidenceSummary.rulesApplied,
      ],
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
}

const statusScore: Record<Skill['combinedStatus'], number> = {
  'Needs review': 50,
  Developing: 36,
  Learning: 32,
  'Not started': 22,
  Strong: 4,
  Mastered: 0,
}

const evidenceScore: Record<Skill['drillEvidence']['rating'], number> = {
  'No evidence': 5,
  'Needs work': 20,
  Developing: 13,
  Improving: 6,
  Strong: 0,
}

function daysBetween(fromDate: string, toDate: string) {
  const start = new Date(`${fromDate}T12:00:00`)
  const end = new Date(`${toDate}T12:00:00`)
  return Math.max(0, Math.ceil((end.getTime() - start.getTime()) / 86_400_000))
}

function daysSince(date: string | undefined, targetDate: string) {
  if (!date) return undefined
  return daysBetween(date, targetDate)
}

function recentMistakes(skill: Skill, drills: Drill[], targetDate: string) {
  const cutoff = new Date(`${targetDate}T12:00:00`)
  cutoff.setDate(cutoff.getDate() - 21)
  return drills
    .filter((drill) => drill.skillTopic === skill.name && new Date(`${drill.date}T12:00:00`) >= cutoff)
    .flatMap((drill) => drill.mistakes ?? [])
}

function rankSkill(skill: Skill, drills: Drill[], practiceTests: PracticeTest[], targetDate: string): RecommendationEvidenceItem {
  let priorityScore = statusScore[skill.combinedStatus]
  const reasons: string[] = [`Coaching status: ${skill.combinedStatus}`]

  priorityScore += evidenceScore[skill.practiceTestEvidence.rating]
  if (skill.practiceTestEvidence.rating !== 'No evidence') {
    reasons.push(`Practice-test evidence: ${skill.practiceTestEvidence.rating} (${skill.practiceTestEvidence.totalCorrect}/${skill.practiceTestEvidence.totalAttempted})`)
  }

  priorityScore += evidenceScore[skill.drillEvidence.rating]
  if (skill.drillEvidence.rating === 'No evidence') {
    reasons.push('No drill evidence yet')
  } else {
    reasons.push(`Drill evidence: ${skill.drillEvidence.rating} (${skill.drillEvidence.totalCorrect}/${skill.drillEvidence.totalAttempted})`)
  }

  const accuracy = skill.drillEvidence.recentAccuracy
  if (accuracy !== undefined) {
    if (accuracy < 60) priorityScore += 18
    else if (accuracy < 75) priorityScore += 11
    else if (accuracy < 85) priorityScore += 5
    reasons.push(`Recent drill accuracy: ${Math.round(accuracy)}%`)
  }

  if (skill.trend === 'down') {
    priorityScore += 12
    reasons.push('Recent trend is down')
  } else if (skill.trend === 'up') {
    priorityScore -= 4
    reasons.push('Recent trend is improving')
  }

  const sincePractice = daysSince(skill.lastPracticed, targetDate)
  if (sincePractice === undefined) {
    priorityScore += 6
    reasons.push('Not practiced yet')
  } else if (sincePractice >= 14) {
    priorityScore += 8
    reasons.push(`Not practiced for ${sincePractice} days`)
  }

  const mistakes = recentMistakes(skill, drills, targetDate)
  const conceptMistakes = mistakes.filter((mistake) => ['Not Yet Taught', 'Concept Gap'].includes(mistake.classification)).length
  const timingMistakes = mistakes.filter((mistake) => ['Rushed / Timing', 'Careless', 'Misread Question'].includes(mistake.classification)).length
  if (conceptMistakes) {
    priorityScore += Math.min(15, conceptMistakes * 5)
    reasons.push(`${conceptMistakes} recent concept ${conceptMistakes === 1 ? 'mistake' : 'mistakes'}`)
  }
  if (timingMistakes) {
    priorityScore += Math.min(8, timingMistakes * 2)
    reasons.push(`${timingMistakes} recent execution ${timingMistakes === 1 ? 'mistake' : 'mistakes'}`)
  }

  const recentTestMistakes = [...practiceTests]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 3)
    .flatMap((test) => test.mistakes)
    .filter((mistake) => mistake.skillTopic === skill.name)
  if (recentTestMistakes.length) {
    priorityScore += Math.min(18, recentTestMistakes.length * 6)
    reasons.push(`${recentTestMistakes.length} recent full-test ${recentTestMistakes.length === 1 ? 'mistake' : 'mistakes'}`)
  }

  return {
    skillId: skill.id,
    skillName: skill.name,
    section: skill.section,
    domain: skill.domain,
    priorityScore,
    reasons,
  }
}

function choosePriorities(ranked: RecommendationEvidenceItem[], taskCount: number) {
  if (taskCount <= 0) return []
  if (taskCount < 2 || ranked.length < 2) return ranked.slice(0, 1)
  const first = ranked[0]
  const otherSection = ranked.find((candidate) => candidate.section !== first.section && candidate.priorityScore >= first.priorityScore - 18)
  const chosen = otherSection ? [first, otherSection] : ranked.slice(0, 2)
  for (const candidate of ranked) {
    if (chosen.length >= taskCount) break
    if (!chosen.some((priority) => priority.skillId === candidate.skillId)) chosen.push(candidate)
  }
  return chosen.slice(0, taskCount)
}

function isReadyForHard(skill: Skill, drills: Drill[], targetDate: string) {
  const targetTime = new Date(`${targetDate}T12:00:00`).getTime()
  const recentFoundationWork = drills
    .filter((drill) => drill.skillTopic === skill.name
      && drill.difficulty !== 'Hard'
      && new Date(`${drill.date}T12:00:00`).getTime() < targetTime)
    .sort((a, b) => b.date.localeCompare(a.date))

  let attempted = 0
  let correct = 0
  for (const drill of recentFoundationWork) {
    attempted += drill.attempted
    correct += drill.correct
    if (attempted >= 20) break
  }

  return attempted >= 20 && (correct / attempted) * 100 >= 95
}

function learningTopic(skill: Skill) {
  const continuation = skill.nextStep.match(/^(?:finish|continue)\s+(.+?)(?:, then|\. |\.$)/i)?.[1]
  if (!continuation) return skill.name
  return continuation.charAt(0).toUpperCase() + continuation.slice(1)
}

function makeSkillTasks(
  priority: RecommendationEvidenceItem,
  skill: Skill,
  drills: Drill[],
  targetDate: string,
  minutes: number,
): PlanningTaskDraft[] {
  const mistakes = recentMistakes(skill, drills, targetDate)
  const conceptInProgress = ['not_yet_taught', 'learning'].includes(skill.conceptState)
  const needsReview = mistakes.some((mistake) => ['Not Yet Taught', 'Concept Gap'].includes(mistake.classification))
    || skill.conceptState === 'needs_review'
    || skill.drillEvidence.rating === 'Needs work'
  const tasks: PlanningTaskDraft[] = []

  if (minutes) {
    const topic = conceptInProgress ? learningTopic(skill) : priority.skillName
    const curriculum = curriculumBySkillId.get(skill.id)
    const requiredConcepts = curriculum?.requiredConcepts.join('; ')
    tasks.push({
      title: conceptInProgress
        ? `${topic}: learn the concept`
        : needsReview
          ? `${topic}: review the method`
          : `${topic}: spaced review`,
      description: conceptInProgress
        ? `${skill.nextStep || `Learn the core method for ${priority.skillName}.`} Required PSAT concepts: ${requiredConcepts ?? priority.skillName}. Explain the method aloud and write one rule or takeaway. Drilling waits until the concept is complete.`
        : `${skill.nextStep || `Review one worked example for ${priority.skillName}.`} Revisit the method, explain it aloud, and write one rule or takeaway. Today’s mixed spiral is a separate assignment and may include this skill only if the concept has already been learned.`,
      category: conceptInProgress ? 'Learn' : 'Review',
      section: priority.section,
      minutes,
      resource: curriculum
        ? `${curriculum.resource.course} · ${curriculum.resource.unit} · ${curriculum.resource.url}`
        : 'No verified learning resource mapped yet',
      skillIds: [priority.skillId],
    })
  }

  return tasks
}

function dateRotation(dateKey: string) {
  return dateKey.split('-').reduce((total, part) => total + Number(part), 0)
}

function rotatedPriorities(items: RecommendationEvidenceItem[], count: number, targetDate: string) {
  if (items.length <= count) return items
  const anchorCount = Math.min(2, count)
  const selected = items.slice(0, anchorCount)
  const rotating = items.slice(anchorCount)
  const offset = rotating.length ? dateRotation(targetDate) % rotating.length : 0

  for (let index = 0; selected.length < count && index < rotating.length; index += 1) {
    selected.push(rotating[(offset + index) % rotating.length])
  }
  return selected
}

function mixedSpiralTask(
  ranked: RecommendationEvidenceItem[],
  skills: Skill[],
  drills: Drill[],
  targetDate: string,
): PlanningTaskDraft | null {
  const byId = new Map(skills.map((skill) => [skill.id, skill]))
  const eligible = ranked.filter((priority) => {
    const skill = byId.get(priority.skillId)
    return skill
      && ['needs_review', 'strong', 'mastered'].includes(skill.conceptState)
      && Boolean(skill.lastPracticed)
  })
  const readingWriting = rotatedPriorities(
    eligible.filter((priority) => priority.section === 'Reading & Writing'),
    4,
    targetDate,
  )
  const math = rotatedPriorities(
    eligible.filter((priority) => priority.section === 'Math'),
    3,
    targetDate,
  )
  const selected = [...readingWriting, ...math]

  for (const priority of eligible) {
    if (selected.length >= 7) break
    if (!selected.some((candidate) => candidate.skillId === priority.skillId)) selected.push(priority)
  }
  if (selected.length < 2) return null

  const chosen = selected.slice(0, 7)
  const allHardReady = chosen.every((priority) => {
    const skill = byId.get(priority.skillId)
    return skill ? isReadyForHard(skill, drills, targetDate) : false
  })
  const questionCount = chosen.length
  const firstDifficultyCount = Math.floor(questionCount / 2)
  const secondDifficultyCount = questionCount - firstDifficultyCount
  const difficultyMix = allHardReady
    ? `${firstDifficultyCount} Medium and ${secondDifficultyCount} Hard`
    : `${firstDifficultyCount} Easy and ${secondDifficultyCount} Medium`
  const skillsList = chosen.map((priority) => priority.skillName).join('; ')

  return {
    title: `Daily mixed-skill spiral: ${questionCount} questions`,
    description: `Complete one previously unused official PSAT 8/9 question for each linked skill: ${skillsList}. Use exactly ${difficultyMix} questions and one 10-minute timer for the full set. Keep College Board's Exclude Active Questions filter turned on. This drill rotates previously learned material; it does not include a concept that is still being learned. Review every miss afterward and record the result against the skill for that question. ${allHardReady ? 'Every linked skill has earned Hard work through at least 95% recent Easy/Medium accuracy.' : 'Hard questions remain locked until every linked skill reaches at least 95% on recent Easy/Medium work.'}`,
    category: 'Drill',
    section: null,
    minutes: 10,
    resource: 'College Board Educator Question Bank · PSAT 8/9 · Exclude Active Questions ON · previously unused questions only',
    skillIds: chosen.map((priority) => priority.skillId),
  }
}

function readingTask(minutes: number): PlanningTaskDraft {
  return {
    title: 'Daily independent reading',
    description: `Read the current book for ${minutes} uninterrupted minutes. Record the starting page, ending page, and a one-sentence summary.`,
    category: 'Reading',
    section: null,
    minutes,
    resource: 'Current independent-reading book',
    skillIds: [],
  }
}

function dayOfWeek(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`).getDay()
}

function weeklyDrillMistakes(drills: Drill[], saturdayDate: string) {
  const saturday = new Date(`${saturdayDate}T12:00:00`)
  const monday = new Date(saturday)
  monday.setDate(monday.getDate() - 5)

  return drills
    .filter((drill) => {
      const drillDate = new Date(`${drill.date}T12:00:00`)
      return drillDate >= monday && drillDate < saturday
    })
    .flatMap((drill) => (drill.mistakes ?? []).map((mistake) => ({
      date: drill.date,
      skillId: drill.skillId,
      skillName: drill.skillTopic,
      questionNumber: mistake.questionNumber,
      classification: mistake.classification,
    })))
    .sort((a, b) => a.date.localeCompare(b.date)
      || a.skillName.localeCompare(b.skillName)
      || (a.questionNumber ?? 0) - (b.questionNumber ?? 0))
}

function saturdayPlan(
  ranked: RecommendationEvidenceItem[],
  drills: Drill[],
  targetDate: string,
  inputs: ParentPlanningInputs,
  daysRemaining: number,
  scoreGap: number,
  urgency: RecommendationEvidenceSummary['urgency'],
): RecommendedPlan {
  const mistakes = weeklyDrillMistakes(drills, targetDate)
  const readingMinutes = Math.min(20, Math.max(10, inputs.availableMinutes - 10))
  const labMinutes = Math.max(0, inputs.availableMinutes - readingMinutes)
  const mistakeList = mistakes.map((mistake) => {
    const question = mistake.questionNumber ? ` Q${mistake.questionNumber}` : ''
    return `${mistake.date.slice(5)} ${mistake.skillName}${question} (${mistake.classification})`
  }).join('; ')
  const linkedSkillIds = [...new Set(mistakes.map((mistake) => mistake.skillId).filter((skillId): skillId is string => Boolean(skillId)))]

  const tasks: PlanningTaskDraft[] = []
  if (readingMinutes) tasks.push(readingTask(readingMinutes))
  if (labMinutes) {
    tasks.push({
      title: mistakes.length
        ? `Mistake Research Lab - all ${mistakes.length} misses from this week`
        : 'Weekly mastery reflection',
      description: mistakes.length
        ? `Research every recorded miss from Monday through Friday: ${mistakeList}. For each question, identify the skill, reconstruct the original thinking, mark the first incorrect decision, research the rule or method, explain why the earlier choice fails and the correct reasoning works, create a new example, and finish "Next time, I will...". This is not a scored redo.`
        : 'No drill misses were recorded from Monday through Friday. Review the week, name two methods that became more reliable, and write one habit to carry into next week. This is not a scored drill.',
      category: 'Review',
      section: null,
      minutes: labMinutes,
      resource: mistakes.length
        ? 'Weekly Mistake Research Lab PDF - parent adds the private workbook link before publishing'
        : 'PSAT Pathway - Week, Reading & Writing, and Math tabs',
      skillIds: linkedSkillIds,
    })
  }

  return {
    draft: {
      focus: mistakes.length
        ? `Light Saturday: daily reading + research all ${mistakes.length} weekly misses`
        : 'Light Saturday: daily reading + weekly mastery reflection',
      dayType: 'light',
      coachNote: mistakes.length
        ? 'Today is a research day, not another test. Study every question you missed this week and turn each mistake into a rule you can use next time.'
        : 'Today is a light consolidation day. Reflect on what became more reliable this week, then recharge.',
      rationale: mistakes.length
        ? `Saturday consolidates all ${mistakes.length} mistakes recorded from Monday through Friday. No scored drill is assigned.`
        : 'Saturday remains a light consolidation day. No scored drill is assigned because no weekly misses were recorded.',
      tasks,
    },
    evidenceSummary: {
      source: 'rules-v1',
      generatedAt: new Date().toISOString(),
      daysRemaining,
      scoreGap,
      urgency,
      rulesApplied: [
        'Saturday is a light consolidation day.',
        'Independent reading remains part of Saturday.',
        'The Mistake Research Lab covers every recorded drill miss from Monday through Friday.',
        'Mistake research is not scored and does not repeat the week’s drill.',
        'Sunday is reserved for recovery with no assigned PSAT work.',
        'The plan never exceeds the parent’s available minutes.',
      ],
      priorities: ranked.slice(0, 5),
    },
  }
}

function sundayPlan(
  ranked: RecommendationEvidenceItem[],
  daysRemaining: number,
  scoreGap: number,
  urgency: RecommendationEvidenceSummary['urgency'],
): RecommendedPlan {
  return {
    draft: {
      focus: 'Protected Sunday recovery day',
      dayType: 'no-study',
      coachNote: 'No PSAT work is assigned today. Rest, recharge, and return fresh for the new week.',
      rationale: 'Sunday is intentionally protected as a no-study day after the longer weekday sessions and Saturday consolidation.',
      tasks: [],
    },
    evidenceSummary: {
      source: 'rules-v1',
      generatedAt: new Date().toISOString(),
      daysRemaining,
      scoreGap,
      urgency,
      rulesApplied: [
        'Sunday is a protected recovery day.',
        'No reading, drill, review, or practice-test task is assigned.',
        'The next recommendation resumes with the new week’s evidence.',
      ],
      priorities: ranked.slice(0, 5),
    },
  }
}

function parentPriorityTask(description: string, minutes: number): PlanningTaskDraft {
  return {
    title: 'Parent priority',
    description,
    category: 'Review',
    section: null,
    minutes,
    resource: null,
    skillIds: [],
  }
}

function splitMinutes(total: number, taskCount: number) {
  const base = Math.floor(total / taskCount / 5) * 5
  const values = Array.from({ length: taskCount }, () => Math.max(10, base))
  let remaining = total - values.reduce((sum, value) => sum + value, 0)
  let index = 0
  while (remaining >= 5) {
    values[index % values.length] += 5
    remaining -= 5
    index += 1
  }
  return values
}

export function buildRecommendedPlan(
  student: Student,
  skills: Skill[],
  drills: Drill[],
  practiceTests: PracticeTest[],
  targetDate: string,
  inputs: ParentPlanningInputs,
): RecommendedPlan {
  const roadmap = buildScoreRoadmap(student, skills, drills, practiceTests, targetDate)
  const roadmapPriorities = new Set(roadmap.activeMilestone.prioritySkillIds)
  const ranked = skills
    .map((skill) => rankSkill(skill, drills, practiceTests, targetDate))
    .map((priority) => roadmapPriorities.has(priority.skillId) ? {
      ...priority,
      priorityScore: priority.priorityScore + 30,
      reasons: [`Active ${roadmap.activeMilestone.title} milestone`, ...priority.reasons],
    } : priority)
    .sort((a, b) => b.priorityScore - a.priorityScore || a.skillName.localeCompare(b.skillName))

  const daysRemaining = daysBetween(targetDate, student.testDate)
  const scoreGap = Math.max(0, student.targetScore - student.currentScore)
  const urgency: RecommendationEvidenceSummary['urgency'] = daysRemaining <= 30
    ? 'final-stretch'
    : daysRemaining <= 75 || scoreGap >= 150
      ? 'focused'
      : 'steady'

  const weekday = dayOfWeek(targetDate)
  if (weekday === 0) return connectRoadmap(sundayPlan(ranked, daysRemaining, scoreGap, urgency), roadmap)
  if (weekday === 6) return connectRoadmap(saturdayPlan(ranked, drills, targetDate, inputs, daysRemaining, scoreGap, urgency), roadmap)

  const spiralTask = mixedSpiralTask(ranked, skills, drills, targetDate)
  const spiralMinutes = spiralTask && inputs.availableMinutes >= 15 ? spiralTask.minutes : 0
  const readingMinutes = Math.min(20, Math.max(0, inputs.availableMinutes - spiralMinutes))
  const includesReadingRequest = /\bread(?:ing)?\b/i.test(inputs.mustInclude)
  const includeParentTask = Boolean(inputs.mustInclude.trim()) && !includesReadingRequest
  const parentTaskMinutes = includeParentTask && inputs.availableMinutes - readingMinutes - spiralMinutes >= 25 ? 15 : 0
  const coachingMinutes = Math.max(0, inputs.availableMinutes - readingMinutes - spiralMinutes - parentTaskMinutes)
  const capacityTaskCount = Math.floor(coachingMinutes / 20)
  const desiredTaskCount = coachingMinutes >= 60 || (coachingMinutes >= 40 && urgency !== 'steady')
    ? 3
    : coachingMinutes >= 35
      ? 2
      : coachingMinutes >= 10
        ? 1
        : 0
  const priorityCount = Math.min(desiredTaskCount, Math.max(1, capacityTaskCount || desiredTaskCount))
  const priorities = choosePriorities(ranked, priorityCount)
  const minuteSplit = priorities.length ? splitMinutes(coachingMinutes, priorities.length) : []
  const byId = new Map(skills.map((skill) => [skill.id, skill]))
  const priorityTasks = priorities.flatMap((priority, index) => makeSkillTasks(priority, byId.get(priority.skillId)!, drills, targetDate, minuteSplit[index]))
  const tasks: PlanningTaskDraft[] = []

  if (readingMinutes) tasks.push(readingTask(readingMinutes))
  if (spiralTask && spiralMinutes) tasks.push(spiralTask)
  tasks.push(...priorityTasks)
  if (includeParentTask && parentTaskMinutes) tasks.push(parentPriorityTask(inputs.mustInclude.trim(), parentTaskMinutes))

  const focusNames = priorities.map((priority) => priority.skillName)
  const rationaleParts = priorities.map((priority) => `${priority.skillName}: ${priority.reasons.slice(0, 3).join('; ')}`)

  return connectRoadmap({
    draft: {
      focus: focusNames.length ? `${focusNames.join(' + ')} + Mixed spiral + Daily reading` : 'Mixed spiral + Daily independent reading',
      dayType: inputs.dayType,
      coachNote: `Accuracy before difficulty: reach at least 95% on Easy/Medium work before moving to Hard questions. Easy and Medium questions should bank time for harder work. Drill time means answering time only. Afterward, review every missed question and record what caused the mistake so you can avoid making it again.`,
      rationale: `${daysRemaining} days remain until the test. The current score is ${student.currentScore}, the target is ${student.targetScore}, and the gap is ${scoreGap} points. The rules selected ${rationaleParts.join(' | ')}.`,
      tasks,
    },
    evidenceSummary: {
      source: 'rules-v1',
      generatedAt: new Date().toISOString(),
      daysRemaining,
      scoreGap,
      urgency,
      rulesApplied: [
        'Needs-review and developing skills come before strong skills.',
        'Practice-test and drill evidence remain separate.',
        'Recent low accuracy, downward trends, concept mistakes, and long practice gaps increase priority.',
        'When priorities are close, the plan balances Math and Reading & Writing.',
        'The score goal and days remaining determine whether the session stays narrow or covers a third priority.',
        'Learning a concept and drilling it are separate assignments.',
        'A skill marked Not yet taught or Learning receives concept work only; drilling waits until the concept is complete.',
        'A previously taught skill that needs reinforcement receives a review task and may then be drilled the same day.',
        'Every Monday-through-Friday study plan includes a 10-minute mixed spiral drawn from previously learned skills.',
        'The mixed spiral rotates skills across Reading & Writing and Math instead of repeating only the day’s focus skill.',
        'Mixed-drill results are recorded by skill so the evidence remains accurate.',
        'Hard questions stay locked until recent Easy/Medium work reaches at least 95%.',
        'Daily drills never use active College Board practice-test questions; Exclude Active Questions stays on.',
        'Drill timers use PSAT 8/9 section pacing, with faster Easy/Medium targets that bank time for Hard questions.',
        'Assigned drill minutes include answering time only; afterward, every missed question must be reviewed and its cause recorded.',
        'Daily independent reading is included in every plan.',
        'The plan never exceeds the parent’s available minutes.',
      ],
      priorities: ranked.slice(0, 5),
    },
  }, roadmap)
}
