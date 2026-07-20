import type {
  Drill,
  ParentPlanningInputs,
  PlanningDraftContent,
  PlanningTaskDraft,
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

function rankSkill(skill: Skill, drills: Drill[], targetDate: string): RecommendationEvidenceItem {
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
  if (taskCount < 2 || ranked.length < 2) return ranked.slice(0, 1)
  const first = ranked[0]
  const otherSection = ranked.find((candidate) => candidate.section !== first.section && candidate.priorityScore >= first.priorityScore - 18)
  const chosen = otherSection ? [first, otherSection] : ranked.slice(0, 2)
  return chosen
}

function makeSkillTask(
  priority: RecommendationEvidenceItem,
  skill: Skill,
  drills: Drill[],
  targetDate: string,
  minutes: number,
): PlanningTaskDraft {
  const mistakes = recentMistakes(skill, drills, targetDate)
  const hasConceptGap = mistakes.some((mistake) => ['Not Yet Taught', 'Concept Gap'].includes(mistake.classification))
    || ['not_yet_taught', 'learning'].includes(skill.conceptState)
    || skill.drillEvidence.rating === 'Needs work'
  const category = hasConceptGap ? 'Learn' : skill.trend === 'down' ? 'Review' : 'Drill'
  const resultTarget = category === 'Drill'
    ? 'Complete a focused 8–12 question set, then classify every miss before checking the explanation.'
    : 'Review one worked example, explain the method aloud, then complete 5–8 untimed questions and classify every miss.'

  return {
    title: `${priority.skillName}: ${category === 'Learn' ? 'learn, then practice' : category.toLowerCase()}`,
    description: resultTarget,
    category,
    section: priority.section,
    minutes,
    resource: category === 'Learn' ? 'Khan Academy or current prep resource' : 'College Board Question Bank',
    skillIds: [priority.skillId],
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
  targetDate: string,
  inputs: ParentPlanningInputs,
): RecommendedPlan {
  const ranked = skills
    .map((skill) => rankSkill(skill, drills, targetDate))
    .sort((a, b) => b.priorityScore - a.priorityScore || a.skillName.localeCompare(b.skillName))

  const desiredTaskCount = inputs.availableMinutes >= 75 ? 3 : inputs.availableMinutes >= 35 ? 2 : 1
  const priorities = choosePriorities(ranked, desiredTaskCount)
  const includeParentTask = Boolean(inputs.mustInclude.trim()) && desiredTaskCount > priorities.length
  const taskCount = priorities.length + (includeParentTask ? 1 : 0)
  const minuteSplit = splitMinutes(inputs.availableMinutes, Math.max(1, taskCount))
  const byId = new Map(skills.map((skill) => [skill.id, skill]))
  const tasks = priorities.map((priority, index) => makeSkillTask(priority, byId.get(priority.skillId)!, drills, targetDate, minuteSplit[index]))

  if (includeParentTask) {
    tasks.push({
      title: 'Parent priority',
      description: inputs.mustInclude.trim(),
      category: 'Review',
      section: null,
      minutes: minuteSplit[tasks.length],
      resource: null,
      skillIds: [],
    })
  } else if (inputs.mustInclude.trim() && tasks[0]) {
    tasks[0] = { ...tasks[0], description: `${tasks[0].description} Parent request: ${inputs.mustInclude.trim()}` }
  }

  const daysRemaining = daysBetween(targetDate, student.testDate)
  const focusNames = priorities.map((priority) => priority.skillName)
  const rationaleParts = priorities.map((priority) => `${priority.skillName}: ${priority.reasons.slice(0, 3).join('; ')}`)

  return {
    draft: {
      focus: focusNames.length ? focusNames.join(' + ') : 'Balanced PSAT practice',
      dayType: inputs.dayType,
      coachNote: `Focus on careful work today. Record the result and the reason for each mistake so tomorrow’s plan can adjust.`,
      rationale: `${daysRemaining} days remain until the test. The rules selected ${rationaleParts.join(' | ')}.`,
      tasks,
    },
    evidenceSummary: {
      source: 'rules-v1',
      generatedAt: new Date().toISOString(),
      daysRemaining,
      rulesApplied: [
        'Needs-review and developing skills come before strong skills.',
        'Practice-test and drill evidence remain separate.',
        'Recent low accuracy, downward trends, concept mistakes, and long practice gaps increase priority.',
        'When priorities are close, the plan balances Math and Reading & Writing.',
        'The plan never exceeds the parent’s available minutes.',
      ],
      priorities: ranked.slice(0, 5),
    },
  }
}
