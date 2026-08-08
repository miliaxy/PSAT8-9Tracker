import type { CurriculumMapEntry } from '../data/curriculumMap'
import type { LearningResourceUnit, Skill } from '../types/models'

export type CurriculumLearningStatus =
  | 'learned'
  | 'reinforce'
  | 'review'
  | 'in-progress'
  | 'verify'
  | 'not-started'

export interface CurriculumProgressAssessment {
  status: CurriculumLearningStatus
  label: string
  evidence: string[]
  nextAction: string
}

function matchingSavedResources(entry: CurriculumMapEntry, resources: LearningResourceUnit[]) {
  const patterns = entry.priorResourceTitles ?? []
  return resources.filter((resource) => patterns.some((pattern) => resource.title.toLowerCase().includes(pattern.toLowerCase())))
}

function evidenceSummary(skill: Skill, savedResources: LearningResourceUnit[]) {
  const evidence: string[] = []
  if (skill.khanProgress !== undefined) evidence.push(`Saved Khan progress: ${Math.round(skill.khanProgress)}%`)
  const completed = savedResources.filter((resource) => resource.status === 'Completed')
  const underway = savedResources.filter((resource) => resource.status === 'In progress')
  if (completed.length) evidence.push(`Completed resource: ${completed.map((resource) => resource.title).join(', ')}`)
  if (underway.length) evidence.push(`Resource in progress: ${underway.map((resource) => `${resource.title} (${Math.round(resource.progress)}%)`).join(', ')}`)
  if (skill.practiceTestEvidence.totalAttempted) {
    evidence.push(`Full-test evidence: ${skill.practiceTestEvidence.totalCorrect}/${skill.practiceTestEvidence.totalAttempted}`)
  }
  if (skill.drillEvidence.totalAttempted) {
    evidence.push(`Drill evidence: ${skill.drillEvidence.totalCorrect}/${skill.drillEvidence.totalAttempted}`)
  }
  if (!evidence.length) evidence.push('No saved learning or performance evidence yet')
  return evidence
}

export function assessCurriculumProgress(
  entry: CurriculumMapEntry,
  skill: Skill,
  resources: LearningResourceUnit[],
): CurriculumProgressAssessment {
  const savedResources = matchingSavedResources(entry, resources)
  const evidence = evidenceSummary(skill, savedResources)
  const attempted = skill.practiceTestEvidence.totalAttempted + skill.drillEvidence.totalAttempted
  const completedResource = savedResources.some((resource) => resource.status === 'Completed')

  if (skill.conceptState === 'mastered' || skill.conceptState === 'strong') {
    return {
      status: 'learned',
      label: 'Learned',
      evidence,
      nextAction: 'Do not restart the course unit. Keep this skill in spaced mixed practice and review only when a mistake reveals a concept gap.',
    }
  }

  if (skill.conceptState === 'needs_review') {
    return {
      status: 'review',
      label: 'Studied · review needed',
      evidence,
      nextAction: 'Review only the listed concept connected to the mistake, then return to Easy/Medium practice. Do not repeat the entire unit.',
    }
  }

  if (skill.conceptState === 'learning') {
    if (attempted >= 5 || completedResource || skill.khanProgress === 100) {
      return {
        status: 'reinforce',
        label: 'Studied · reinforce',
        evidence,
        nextAction: 'Treat the concept as introduced. Use the linked lesson only for targeted correction; the main next step is Easy/Medium mastery evidence.',
      }
    }
    return {
      status: 'in-progress',
      label: 'Learning in progress',
      evidence,
      nextAction: 'Finish the required concepts shown here, record the learning evidence, and only then unlock a short Easy/Medium checkpoint.',
    }
  }

  if (skill.khanProgress === 100 || completedResource || attempted >= 3) {
    return {
      status: 'verify',
      label: 'Prior study · verify',
      evidence,
      nextAction: 'Do not assign the full lesson again. Use a five-question Easy/Medium checkpoint; at 95% or better, confirm it as learned, otherwise review only the missed concept.',
    }
  }

  return {
    status: 'not-started',
    label: 'Not yet learned',
    evidence,
    nextAction: 'Teach the required concepts in order. Keep College Board drilling locked until the concept learning is complete.',
  }
}

