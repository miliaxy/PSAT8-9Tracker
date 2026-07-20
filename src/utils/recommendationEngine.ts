import type {
  Drill,
  ParentPlanningInputs,
  PlanningDraftContent,
  PlanningTaskDraft,
  PracticeTest,
  RecommendationEvidenceItem,
  RecommendationEvidenceSummary,
  Skill,
  Student,
} from '../types/models'

export interface RecommendedPlan {
  draft: PlanningDraftContent
  evidenceSummary: RecommendationEvidenceSummary
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

const pacingSeconds = {
  'Reading & Writing': { average: 71, easy: 55, medium: 70, hard: 90 },
  Math: { average: 95, easy: 70, medium: 90, hard: 125 },
} as const

function formatDuration(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return seconds ? `${minutes}:${String(seconds).padStart(2, '0')}` : `${minutes}:00`
}

function drillQuestionMix(minutes: number, section: Skill['section'], hardReady: boolean) {
  const pacing = pacingSeconds[section]
  let questionCount = minutes >= 20 ? 10 : minutes >= 15 ? 8 : 6
  const maxAnsweringSeconds = Math.max(60, minutes * 60)

  const buildMix = (count: number) => {
    if (hardReady) {
      const medium = Math.ceil(count / 2)
      const hard = count - medium
      return {
        detail: `${medium} Medium and ${hard} Hard`,
        answeringSeconds: medium * pacing.medium + hard * pacing.hard,
      }
    }
    const easy = Math.floor(count / 2)
    const medium = count - easy
    return {
      detail: `${easy} Easy and ${medium} Medium`,
      answeringSeconds: easy * pacing.easy + medium * pacing.medium,
    }
  }

  let mix = buildMix(questionCount)
  while (questionCount > 4 && mix.answeringSeconds > maxAnsweringSeconds) {
    questionCount -= 2
    mix = buildMix(questionCount)
  }

  return {
    questionCount,
    detail: mix.detail,
    answeringSeconds: mix.answeringSeconds,
    timer: formatDuration(mix.answeringSeconds),
    average: formatDuration(pacing.average),
    easyTarget: formatDuration(pacing.easy),
    mediumTarget: formatDuration(pacing.medium),
    hardTarget: formatDuration(pacing.hard),
  }
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
  const preparationMinutes = conceptInProgress
    ? minutes
    : needsReview && minutes >= 20
      ? (minutes >= 30 ? 15 : 10)
      : needsReview
        ? minutes
        : 0
  const drillMinutes = conceptInProgress ? 0 : minutes - preparationMinutes
  const tasks: PlanningTaskDraft[] = []

  if (preparationMinutes) {
    const topic = conceptInProgress ? learningTopic(skill) : priority.skillName
    tasks.push({
      title: conceptInProgress ? `${topic}: learn the concept` : `${topic}: review the method`,
      description: conceptInProgress
        ? `${skill.nextStep || `Learn the core method for ${priority.skillName}.`} Explain the method aloud and write one rule or takeaway. Drilling waits until the concept is complete.`
        : `${skill.nextStep || `Review one worked example for ${priority.skillName}.`} Revisit one worked example, explain the method aloud, and write one rule or takeaway. The drill is a separate assignment.`,
      category: conceptInProgress ? 'Learn' : 'Review',
      section: priority.section,
      minutes: preparationMinutes,
      resource: 'Khan Academy or current prep resource',
      skillIds: [priority.skillId],
    })
  }

  if (drillMinutes) {
    const hardReady = isReadyForHard(skill, drills, targetDate)
    const mix = drillQuestionMix(drillMinutes, priority.section, hardReady)
    const thresholdMessage = hardReady
      ? 'You earned the move to Hard work by reaching at least 95% on recent Easy/Medium practice.'
      : 'Hard questions stay locked until your recent Easy/Medium work reaches at least 95%.'
    tasks.push({
      title: `${priority.skillName}: ${mix.questionCount}-question drill`,
      description: `Complete exactly ${mix.questionCount} questions: ${mix.detail}. Spend ${mix.timer} on the drill; the section average is ${mix.average} per question. Pacing targets: Easy ${mix.easyTarget}, Medium ${mix.mediumTarget}, Hard ${mix.hardTarget}. ${thresholdMessage}`,
      category: 'Drill',
      section: priority.section,
      minutes: Math.ceil(mix.answeringSeconds / 60),
      resource: 'College Board Question Bank',
      skillIds: [priority.skillId],
    })
  }

  return tasks
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
  const ranked = skills
    .map((skill) => rankSkill(skill, drills, practiceTests, targetDate))
    .sort((a, b) => b.priorityScore - a.priorityScore || a.skillName.localeCompare(b.skillName))

  const daysRemaining = daysBetween(targetDate, student.testDate)
  const scoreGap = Math.max(0, student.targetScore - student.currentScore)
  const urgency: RecommendationEvidenceSummary['urgency'] = daysRemaining <= 30
    ? 'final-stretch'
    : daysRemaining <= 75 || scoreGap >= 150
      ? 'focused'
      : 'steady'
  const readingMinutes = Math.min(20, inputs.availableMinutes)
  const includesReadingRequest = /\bread(?:ing)?\b/i.test(inputs.mustInclude)
  const includeParentTask = Boolean(inputs.mustInclude.trim()) && !includesReadingRequest
  const parentTaskMinutes = includeParentTask && inputs.availableMinutes - readingMinutes >= 25 ? 15 : 0
  const coachingMinutes = Math.max(0, inputs.availableMinutes - readingMinutes - parentTaskMinutes)
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
  const tasks = priorities.flatMap((priority, index) => makeSkillTasks(priority, byId.get(priority.skillId)!, drills, targetDate, minuteSplit[index]))

  if (includeParentTask && parentTaskMinutes) tasks.push(parentPriorityTask(inputs.mustInclude.trim(), parentTaskMinutes))
  if (readingMinutes) tasks.push(readingTask(readingMinutes))

  const focusNames = priorities.map((priority) => priority.skillName)
  const rationaleParts = priorities.map((priority) => `${priority.skillName}: ${priority.reasons.slice(0, 3).join('; ')}`)

  return {
    draft: {
      focus: focusNames.length ? `${focusNames.join(' + ')} + Daily reading` : 'Daily independent reading',
      dayType: inputs.dayType,
      coachNote: `Accuracy before difficulty: reach at least 95% on Easy/Medium work before moving to Hard questions. Easy and Medium questions should bank time for harder work. Drill time means answering time only; decide for yourself whether to review afterward.`,
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
        'Hard questions stay locked until recent Easy/Medium work reaches at least 95%.',
        'Drill timers use PSAT 8/9 section pacing, with faster Easy/Medium targets that bank time for Hard questions.',
        'Assigned drill minutes include answering time only; review is optional and student-directed.',
        'Daily independent reading is included in every plan.',
        'The plan never exceeds the parent’s available minutes.',
      ],
      priorities: ranked.slice(0, 5),
    },
  }
}
