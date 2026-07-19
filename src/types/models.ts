export type UserRole = 'parent_admin' | 'student'
export type Section = 'Reading & Writing' | 'Math'
export type Trend = 'up' | 'steady' | 'down'
export type CoachingStatus =
  | 'Not started'
  | 'Learning'
  | 'Developing'
  | 'Needs review'
  | 'Strong'
  | 'Mastered'
export type EvidenceRating =
  | 'No evidence'
  | 'Needs work'
  | 'Developing'
  | 'Improving'
  | 'Strong'
export type ConceptState =
  | 'not_yet_taught'
  | 'learning'
  | 'needs_review'
  | 'strong'
  | 'mastered'
export type Difficulty = 'Easy' | 'Medium' | 'Hard' | 'Mixed'
export type DayType = 'normal' | 'light' | 'no-study' | 'long' | 'review'
export type TaskCategory =
  | 'Learn'
  | 'Drill'
  | 'Review'
  | 'Test strategy'
  | 'Reading'
export type ErrorClassification =
  | 'Not Yet Taught'
  | 'Concept Gap'
  | 'Careless'
  | 'Rushed / Timing'
  | 'Second-Guessed'
  | 'Strategy'
  | 'Misread Question'
  | 'Guess'
  | 'Other'

export interface User {
  id: string
  displayName: string
  role: UserRole
  managedStudentIds: string[]
}

export interface Student {
  id: string
  userId: string
  firstName: string
  grade: number
  targetScore: number
  testDate: string
  baselineScore: number
  currentScore: number
  avatarInitials: string
}

export interface SkillEvidence {
  rating: EvidenceRating
  totalAttempted: number
  totalCorrect: number
  recentAccuracy?: number
  sampleSize: number
}

export interface Skill {
  id: string
  section: Section
  domain: string
  name: string
  description: string
  conceptState: ConceptState
  practiceTestEvidence: SkillEvidence
  drillEvidence: SkillEvidence
  trend: Trend
  combinedStatus: CoachingStatus
  lastPracticed?: string
  khanProgress?: number
  nextStep: string
}

export interface StrategyMetrics {
  blanks: number
  pacingIssues: number
  ninetySecondViolations: number
  rushedQuestions: number
  module1Accuracy?: number
  module2Accuracy?: number
}

export interface DomainPerformance {
  domain: string
  section: Section
  correct: number
  total: number
}

export interface PracticeTestMistake {
  id: string
  practiceTestId: string
  questionNumber: number
  module?: 1 | 2
  section: Section
  domain: string
  skillTopic: string
  classification: ErrorClassification
  userNote?: string
  recommendedAction: string
  reviewed: boolean
}

export interface PracticeTest {
  id: string
  date: string
  name: string
  totalScore: number
  readingWritingScore: number
  mathScore: number
  totalCorrect: number
  totalIncorrect: number
  readingWritingCorrect: number
  readingWritingIncorrect: number
  mathCorrect: number
  mathIncorrect: number
  reliabilityNote?: string
  domainPerformance: DomainPerformance[]
  mistakes: PracticeTestMistake[]
  strategyMetrics?: StrategyMetrics
}

export interface DrillMistake {
  id: string
  questionNumber?: number
  classification: ErrorClassification
  note?: string
}

export interface Drill {
  id: string
  date: string
  section: Section
  domain: string
  skillTopic: string
  difficulty: Difficulty
  source: string
  attempted: number
  correct: number
  incorrect: number
  accuracy: number
  timeLimitMinutes?: number
  timeSpentMinutes?: number
  mistakes?: DrillMistake[]
  notes?: string
}

export interface LearningResourceUnit {
  id: string
  provider: 'Khan Academy' | 'Prep book'
  title: string
  section: Section | 'Both'
  sequence: number
  status: 'Completed' | 'In progress' | 'Locked' | 'Ready'
  progress: number
  note: string
}

export interface DailyTask {
  id: string
  date: string
  title: string
  description: string
  category: TaskCategory
  section?: Section
  minutes: number
  resource?: string
  skillIds: string[]
  initialCompleted: boolean
}

export interface StudyDay {
  date: string
  dayType: DayType
  focus: string
  note?: string
  tasks: DailyTask[]
}

export interface StudyPlan {
  id: string
  studentId: string
  weekOf: string
  title: string
  goal: string
  days: StudyDay[]
}

export interface Book {
  id: string
  title: string
  author: string
  category: 'Current' | 'Up next' | 'Completed'
  pagesRead: number
  totalPages: number
  weeklyGoalPages: number
  note: string
  accent: string
}
