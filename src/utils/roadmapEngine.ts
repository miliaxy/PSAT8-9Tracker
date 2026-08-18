import type {
  Drill,
  PlanningDraftContent,
  PracticeTest,
  RoadmapMilestone,
  RoadmapPhase,
  RoadmapPhaseId,
  RoadmapSectionSummary,
  RoadmapSkillPriority,
  ScoreRoadmap,
  Section,
  Skill,
  Student,
} from '../types/models'

const DAY_MS = 86_400_000

const domainWeights: Record<string, number> = {
  'Information and Ideas': 26,
  'Craft and Structure': 28,
  'Expression of Ideas': 20,
  'Standard English Conventions': 26,
  Algebra: 42.5,
  'Advanced Math': 20,
  'Problem-Solving and Data Analysis': 25,
  Geometry: 12.5,
  'Geometry and Trigonometry': 12.5,
}

const phaseCopy: Record<RoadmapPhaseId, Pick<RoadmapPhase, 'label' | 'objective' | 'exitCriteria'>> = {
  foundation: {
    label: 'Complete the foundation',
    objective: 'Finish the PSAT 8/9 concepts that are still unlearned and establish trustworthy Easy/Medium evidence.',
    exitCriteria: [
      'Every official skill is learned or has a scheduled learning sequence.',
      'Newly learned skills have an initial Easy/Medium evidence set.',
      'No drill is assigned before its concept work is complete.',
    ],
  },
  mastery: {
    label: 'Build reliable mastery',
    objective: 'Raise learned skills to at least 95% on recent Easy/Medium work and eliminate repeat concept errors.',
    exitCriteria: [
      'Priority skills reach at least 95% Easy/Medium accuracy across meaningful evidence.',
      'Previously missed concepts return through spaced mixed practice.',
      'Full-test checkpoints show the score gap narrowing in both sections.',
    ],
  },
  integration: {
    label: 'Integrate under time',
    objective: 'Combine mastered skills in timed modules while protecting accuracy, pacing, and decision quality.',
    exitCriteria: [
      'Timed mixed work stays accurate at PSAT 8/9 pace.',
      'Hard questions appear only for skills that cleared the 95% gate.',
      'A full-length checkpoint confirms that gains transfer beyond isolated drills.',
    ],
  },
  readiness: {
    label: 'Confirm test readiness',
    objective: 'Confirm the target trajectory, repair only repeatable errors, and arrive rested rather than overloaded.',
    exitCriteria: [
      'The final full-test evidence is close to the target range.',
      'Every recurring mistake has a written prevention rule.',
      'The final week protects sleep, confidence, and normal test pacing.',
    ],
  },
}

function parseDate(dateKey: string) {
  return new Date(`${dateKey}T12:00:00`)
}

function dateKey(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function addDays(dateKeyValue: string, days: number) {
  const date = parseDate(dateKeyValue)
  date.setDate(date.getDate() + days)
  return dateKey(date)
}

function differenceInDays(fromDate: string, toDate: string) {
  return Math.max(0, Math.ceil((parseDate(toDate).getTime() - parseDate(fromDate).getTime()) / DAY_MS))
}

function mondayOnOrBefore(dateKeyValue: string) {
  const date = parseDate(dateKeyValue)
  const day = date.getDay()
  date.setDate(date.getDate() - (day === 0 ? 6 : day - 1))
  return dateKey(date)
}

function clampScore(score: number) {
  return Math.max(120, Math.min(720, Math.round(score / 10) * 10))
}

function latestTest(practiceTests: PracticeTest[], asOfDate: string) {
  return [...practiceTests]
    .filter((test) => test.date <= asOfDate)
    .sort((a, b) => b.date.localeCompare(a.date))[0]
    ?? [...practiceTests].sort((a, b) => b.date.localeCompare(a.date))[0]
}

function targetSectionScores(student: Student, test?: PracticeTest) {
  const currentReadingWriting = test?.readingWritingScore ?? Math.round(student.currentScore / 20) * 10
  const currentMath = test?.mathScore ?? student.currentScore - currentReadingWriting
  const gap = Math.max(0, student.targetScore - currentReadingWriting - currentMath)
  let readingWritingGain = Math.round(gap / 20) * 10
  let mathGain = gap - readingWritingGain

  if (currentReadingWriting + readingWritingGain > 720) {
    const overflow = currentReadingWriting + readingWritingGain - 720
    readingWritingGain -= overflow
    mathGain += overflow
  }
  if (currentMath + mathGain > 720) {
    const overflow = currentMath + mathGain - 720
    mathGain -= overflow
    readingWritingGain += overflow
  }

  return {
    currentReadingWriting,
    currentMath,
    targetReadingWriting: clampScore(currentReadingWriting + readingWritingGain),
    targetMath: clampScore(currentMath + mathGain),
  }
}

function skillPriority(skill: Skill, skills: Skill[], drills: Drill[]): RoadmapSkillPriority {
  const peerCount = Math.max(1, skills.filter((candidate) => candidate.domain === skill.domain).length)
  let priorityScore = (domainWeights[skill.domain] ?? 20) / peerCount
  const reasons: string[] = []

  if (skill.conceptState === 'not_yet_taught') {
    priorityScore += 42
    reasons.push('concept not yet learned')
  } else if (skill.conceptState === 'learning') {
    priorityScore += 38
    reasons.push('concept learning is in progress')
  } else if (skill.conceptState === 'needs_review') {
    priorityScore += 30
    reasons.push('learned method needs review')
  }

  if (skill.practiceTestEvidence.rating === 'Needs work') {
    priorityScore += 24
    reasons.push('full-test evidence needs work')
  } else if (skill.practiceTestEvidence.rating === 'Developing') {
    priorityScore += 14
    reasons.push('full-test evidence is developing')
  } else if (skill.practiceTestEvidence.rating === 'No evidence') {
    priorityScore += 8
    reasons.push('no full-test evidence yet')
  }

  const recentSkillDrills = drills
    .filter((drill) => drill.skillId === skill.id || drill.skillTopic === skill.name)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 4)
  const attempted = recentSkillDrills.reduce((sum, drill) => sum + drill.attempted, 0)
  const correct = recentSkillDrills.reduce((sum, drill) => sum + drill.correct, 0)
  const accuracy = attempted ? (correct / attempted) * 100 : skill.drillEvidence.recentAccuracy

  if (accuracy === undefined) {
    priorityScore += 12
    reasons.push('no drill evidence yet')
  } else if (accuracy < 75) {
    priorityScore += 26
    reasons.push(`${Math.round(accuracy)}% recent drill accuracy`)
  } else if (accuracy < 95) {
    priorityScore += 18
    reasons.push(`${Math.round(accuracy)}% is below the 95% foundation gate`)
  }

  if (skill.trend === 'down') {
    priorityScore += 10
    reasons.push('recent trend is down')
  }

  return {
    skillId: skill.id,
    skillName: skill.name,
    section: skill.section,
    domain: skill.domain,
    status: skill.combinedStatus,
    priorityScore: Math.round(priorityScore * 10) / 10,
    reason: reasons.slice(0, 2).join('; ') || 'spaced maintenance protects retention',
  }
}

function phaseForDate(date: string, testDate: string): RoadmapPhaseId {
  const daysRemaining = differenceInDays(date, testDate)
  if (daysRemaining <= 14) return 'readiness'
  if (daysRemaining <= 28) return 'integration'
  if (daysRemaining <= 56) return 'mastery'
  return 'foundation'
}

function statusForRange(asOfDate: string, startDate: string, endDate: string) {
  if (asOfDate > endDate) return 'complete' as const
  if (asOfDate >= startDate) return 'active' as const
  return 'upcoming' as const
}

function buildPhases(asOfDate: string, testDate: string): RoadmapPhase[] {
  const programStart = asOfDate
  const ranges: Array<{ id: RoadmapPhaseId; startDate: string; endDate: string }> = [
    { id: 'foundation', startDate: programStart, endDate: addDays(testDate, -57) },
    { id: 'mastery', startDate: addDays(testDate, -56), endDate: addDays(testDate, -29) },
    { id: 'integration', startDate: addDays(testDate, -28), endDate: addDays(testDate, -15) },
    { id: 'readiness', startDate: addDays(testDate, -14), endDate: testDate },
  ]

  return ranges
    .filter((range) => range.endDate >= programStart)
    .map((range) => ({
      ...range,
      ...phaseCopy[range.id],
      startDate: range.startDate < programStart ? programStart : range.startDate,
      status: statusForRange(asOfDate, range.startDate, range.endDate),
    }))
}

function checkpointScore(current: number, target: number, asOfDate: string, checkpointDate: string, testDate: string) {
  const totalDays = Math.max(1, differenceInDays(asOfDate, testDate))
  const elapsed = Math.min(totalDays, differenceInDays(asOfDate, checkpointDate))
  return Math.min(target, Math.round((current + (target - current) * (elapsed / totalDays)) / 10) * 10)
}

function milestoneOutcomes(
  phaseId: RoadmapPhaseId,
  priorities: RoadmapSkillPriority[],
  practiceTestDue: boolean,
) {
  const readingWriting = priorities.find((priority) => priority.section === 'Reading & Writing')
  const math = priorities.find((priority) => priority.section === 'Math')
  const outcomes: string[] = []

  if (phaseId === 'foundation') {
    if (readingWriting) outcomes.push(`Complete the next learning/review step for ${readingWriting.skillName}; then collect initial Easy/Medium evidence.`)
    if (math) outcomes.push(`Complete the next learning/review step for ${math.skillName}; do not drill material that has not been learned.`)
    outcomes.push('Continue the daily mixed spiral using previously learned skills only.')
  } else if (phaseId === 'mastery') {
    if (readingWriting) outcomes.push(`Move ${readingWriting.skillName} toward 95% Easy/Medium accuracy.`)
    if (math) outcomes.push(`Move ${math.skillName} toward 95% Easy/Medium accuracy.`)
    outcomes.push('Research every miss and verify that the same concept error does not repeat.')
  } else if (phaseId === 'integration') {
    outcomes.push('Complete timed mixed work at PSAT 8/9 pace without sacrificing accuracy.')
    outcomes.push('Use Hard questions only for skills that have cleared the 95% Easy/Medium gate.')
    outcomes.push('Track pacing, blanks, and second-guessing alongside accuracy.')
  } else {
    outcomes.push('Repair only recurring, high-value mistakes; avoid broad new units.')
    outcomes.push('Complete the final full-test checkpoint early enough to review it calmly.')
    outcomes.push('Reduce volume during the final week and protect normal sleep and pacing.')
  }

  if (practiceTestDue) outcomes.push('Complete and review one official full-length PSAT 8/9 checkpoint under standard conditions.')
  return outcomes
}

function buildMilestones(
  student: Student,
  asOfDate: string,
  currentScore: number,
  currentReadingWriting: number,
  currentMath: number,
  targetReadingWriting: number,
  targetMath: number,
  priorities: RoadmapSkillPriority[],
) {
  const milestones: RoadmapMilestone[] = []
  let weekStart = mondayOnOrBefore(asOfDate)
  let index = 0

  while (weekStart <= student.testDate) {
    const weekEnd = [addDays(weekStart, 6), student.testDate].sort()[0]
    const effectiveStart = weekStart < asOfDate ? asOfDate : weekStart
    const phaseId = phaseForDate(effectiveStart, student.testDate)
    const phasePriorities = priorities
      .filter((priority) => phaseId !== 'foundation' || !['Strong', 'Mastered'].includes(priority.status))
    const rotationStart = phasePriorities.length ? (index * 2) % phasePriorities.length : 0
    const rotated = [...phasePriorities.slice(rotationStart), ...phasePriorities.slice(0, rotationStart)]
    const selected: RoadmapSkillPriority[] = []

    for (const section of ['Reading & Writing', 'Math'] as Section[]) {
      const match = rotated.find((priority) => priority.section === section && !selected.some((item) => item.skillId === priority.skillId))
      if (match) selected.push(match)
    }
    for (const priority of rotated) {
      if (selected.length >= 4) break
      if (!selected.some((item) => item.skillId === priority.skillId)) selected.push(priority)
    }

    const weeksUntilTest = Math.ceil(differenceInDays(weekEnd, student.testDate) / 7)
    const practiceTestDue = phaseId === 'mastery'
      ? weeksUntilTest % 2 === 0
      : phaseId === 'integration'
        ? index % 2 === 0
        : phaseId === 'readiness' && weeksUntilTest === 1

    milestones.push({
      id: `roadmap-${weekStart}`,
      weekStart,
      weekEnd,
      phaseId,
      status: statusForRange(asOfDate, weekStart, weekEnd),
      title: phaseCopy[phaseId].label,
      scoreCheckpoint: checkpointScore(currentScore, student.targetScore, asOfDate, weekEnd, student.testDate),
      readingWritingCheckpoint: checkpointScore(currentReadingWriting, targetReadingWriting, asOfDate, weekEnd, student.testDate),
      mathCheckpoint: checkpointScore(currentMath, targetMath, asOfDate, weekEnd, student.testDate),
      prioritySkillIds: selected.map((priority) => priority.skillId),
      prioritySkillNames: selected.map((priority) => priority.skillName),
      outcomes: milestoneOutcomes(phaseId, selected, practiceTestDue),
      practiceTestDue,
    })

    weekStart = addDays(weekStart, 7)
    index += 1
  }

  return milestones
}

function sectionSummary(
  section: Section,
  currentScore: number,
  targetScore: number,
  skills: Skill[],
  priorities: RoadmapSkillPriority[],
): RoadmapSectionSummary {
  const sectionSkills = skills.filter((skill) => skill.section === section)
  const learnedSkills = sectionSkills.filter((skill) => skill.conceptState !== 'not_yet_taught' && skill.conceptState !== 'learning').length
  const masteredSkills = sectionSkills.filter((skill) => ['strong', 'mastered'].includes(skill.conceptState)
    && (skill.drillEvidence.recentAccuracy ?? 0) >= 95
    && skill.drillEvidence.totalAttempted >= 20).length

  return {
    section,
    currentScore,
    targetScore,
    totalSkills: sectionSkills.length,
    learnedSkills,
    masteredSkills,
    noDrillEvidence: sectionSkills.filter((skill) => skill.drillEvidence.rating === 'No evidence').length,
    prioritySkills: priorities.filter((priority) => priority.section === section).slice(0, 5),
  }
}

export function localDateKey(date = new Date()) {
  return dateKey(date)
}

export function buildScoreRoadmap(
  student: Student,
  skills: Skill[],
  drills: Drill[],
  practiceTests: PracticeTest[],
  asOfDate = localDateKey(),
): ScoreRoadmap {
  const test = latestTest(practiceTests, asOfDate)
  const currentScore = test?.totalScore ?? student.currentScore
  const sectionScores = targetSectionScores({ ...student, currentScore }, test)
  const priorities = skills
    .map((skill) => skillPriority(skill, skills, drills))
    .sort((a, b) => b.priorityScore - a.priorityScore || a.skillName.localeCompare(b.skillName))
  const phases = buildPhases(asOfDate, student.testDate)
  const milestones = buildMilestones(
    student,
    asOfDate,
    currentScore,
    sectionScores.currentReadingWriting,
    sectionScores.currentMath,
    sectionScores.targetReadingWriting,
    sectionScores.targetMath,
    priorities,
  )
  const activeMilestone = milestones.find((milestone) => milestone.status === 'active') ?? milestones[0]
  const activePhase = phases.find((phase) => phase.id === activeMilestone.phaseId) ?? phases[0]
  const learnedCount = skills.filter((skill) => !['not_yet_taught', 'learning'].includes(skill.conceptState)).length
  const masteredCount = skills.filter((skill) => ['strong', 'mastered'].includes(skill.conceptState)
    && (skill.drillEvidence.recentAccuracy ?? 0) >= 95
    && skill.drillEvidence.totalAttempted >= 20).length
  const nextPracticeTest = milestones.find((milestone) => milestone.status !== 'complete' && milestone.practiceTestDue)

  return {
    asOfDate,
    testDate: student.testDate,
    daysRemaining: differenceInDays(asOfDate, student.testDate),
    weeksRemaining: Math.ceil(differenceInDays(asOfDate, student.testDate) / 7),
    currentScore,
    targetScore: student.targetScore,
    scoreGap: Math.max(0, student.targetScore - currentScore),
    phases,
    milestones,
    activePhase,
    activeMilestone,
    sections: [
      sectionSummary('Reading & Writing', sectionScores.currentReadingWriting, sectionScores.targetReadingWriting, skills, priorities),
      sectionSummary('Math', sectionScores.currentMath, sectionScores.targetMath, skills, priorities),
    ],
    conceptCoveragePercent: skills.length ? Math.round((learnedCount / skills.length) * 100) : 0,
    foundationMasteryPercent: skills.length ? Math.round((masteredCount / skills.length) * 100) : 0,
    nextPracticeTestDate: nextPracticeTest?.weekEnd ?? addDays(student.testDate, -7),
    evidenceNote: test
      ? `Score checkpoints begin with ${test.name} on ${test.date} and are recalculated after every saved result.`
      : 'No full-test result is available yet, so section checkpoints are provisional until a baseline is recorded.',
  }
}

function recentFoundationEvidence(skill: Skill, drills: Drill[], targetDate: string) {
  const recent = drills
    .filter((drill) => (drill.skillId === skill.id || drill.skillTopic === skill.name)
      && drill.date < targetDate
      && drill.difficulty !== 'Hard')
    .sort((a, b) => b.date.localeCompare(a.date))

  let attempted = 0
  let correct = 0
  for (const drill of recent) {
    attempted += drill.attempted
    correct += drill.correct
    if (attempted >= 20) break
  }
  return { attempted, accuracy: attempted ? (correct / attempted) * 100 : 0 }
}

export function validatePlanAgainstRoadmap(
  draft: PlanningDraftContent,
  roadmap: ScoreRoadmap,
  skills: Skill[],
  drills: Drill[],
  targetDate: string,
) {
  if (draft.dayType === 'no-study') return []
  const issues: string[] = []
  const byId = new Map(skills.map((skill) => [skill.id, skill]))
  const activePriorities = new Set(roadmap.activeMilestone.prioritySkillIds)
  const isWeekend = [0, 6].includes(parseDate(targetDate).getDay())
  let advancesMilestone = false

  for (const task of draft.tasks) {
    const taskText = `${task.title} ${task.description} ${task.resource ?? ''}`
    const hasDirectResource = /^https?:\/\/\S+$/i.test(task.resource?.trim() ?? '')
    const exempt = task.category === 'Reading'
      || task.category === 'Practice test'
      || task.category === 'Test strategy'
      || /^parent priority$/i.test(task.title.trim())
    if (!exempt && !task.skillIds.length) {
      issues.push(`“${task.title || 'Untitled assignment'}” must be linked to the PSAT 8/9 skill it advances.`)
    }

    if (task.skillIds.some((skillId) => activePriorities.has(skillId))) advancesMilestone = true

    const isSkillLessonOrReview = task.skillIds.length > 0
      && ['Learn', 'Review'].includes(task.category)
      && !/mistake|error|correction/i.test(`${task.title} ${task.description}`)
    if (isSkillLessonOrReview && !hasDirectResource) {
      issues.push(`“${task.title}” needs a direct lesson or course link so the student knows exactly where to work.`)
    }

    if (task.category !== 'Drill') continue
    if (!hasDirectResource || /satsuiteeducatorquestionbank\.collegeboard\.org\/digital\/(?:search|results)/i.test(task.resource ?? '')) {
      issues.push(`“${task.title}” needs an attached student question packet, not a generic Question Bank page.`)
    }
    const assignsHard = /\b\d+\s+Hard(?:\s+questions?)?\b/i.test(taskText)
      || /\bDifficulty\s*:\s*Hard\b/i.test(taskText)
    if (!/\b\d+\s+(?:(?:official|mixed|PSAT\s*8\/9)\s+)*questions?\b/i.test(taskText)) {
      issues.push(`“${task.title}” needs an exact question count.`)
    }
    if (!/\b(Easy|Medium|Hard)\b/i.test(taskText)) {
      issues.push(`“${task.title}” must name the exact difficulty mix.`)
    }
    if (/college board/i.test(taskText) && !/exclude active questions/i.test(taskText)) {
      issues.push(`“${task.title}” must explicitly keep College Board’s Exclude Active Questions filter on.`)
    }

    for (const skillId of task.skillIds) {
      const skill = byId.get(skillId)
      if (!skill) continue
      if (['not_yet_taught', 'learning'].includes(skill.conceptState)) {
        issues.push(`“${task.title}” drills ${skill.name} before its concept learning is complete.`)
      }
      if (assignsHard) {
        const foundation = recentFoundationEvidence(skill, drills, targetDate)
        if (foundation.attempted < 20 || foundation.accuracy < 95) {
          issues.push(`Hard work for ${skill.name} is locked until at least 20 recent Easy/Medium questions reach 95% accuracy.`)
        }
      }
    }
  }

  const hasCoachingWork = draft.tasks.some((task) => !['Reading', 'Practice test', 'Test strategy'].includes(task.category))
  if (!isWeekend && hasCoachingWork && !advancesMilestone) {
    issues.push(`At least one assignment must advance this week’s ${roadmap.activeMilestone.title} milestone.`)
  }

  return [...new Set(issues)]
}
