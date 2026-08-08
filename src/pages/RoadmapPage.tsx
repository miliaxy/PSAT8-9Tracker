import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  CalendarCheck2,
  CheckCircle2,
  CircleDashed,
  Clock3,
  Flag,
  Gauge,
  RefreshCw,
  Route,
  ShieldCheck,
  Target,
} from 'lucide-react'
import { PageHeader } from '../components/ui'
import { curriculumMap } from '../data/curriculumMap'
import type { Drill, LearningResourceUnit, PracticeTest, ProgramPlan, ProgramPlanBlockKind, Skill, Student } from '../types/models'
import { assessCurriculumProgress } from '../utils/curriculumProgress'
import { formatDate } from '../utils/format'
import { buildScoreRoadmap, localDateKey } from '../utils/roadmapEngine'

interface RoadmapPageProps {
  student: Student
  skills: Skill[]
  drills: Drill[]
  practiceTests: PracticeTest[]
  learningResources: LearningResourceUnit[]
  programPlan?: ProgramPlan
}

const programKindLabel: Record<ProgramPlanBlockKind, string> = {
  learning: 'Learn',
  verification: 'Verify',
  review: 'Review',
  'practice-test': 'Full test',
  analysis: 'Analyze',
  'catch-up': 'Catch up',
  mastery: 'Mastery',
  integration: 'Timed integration',
  readiness: 'Final readiness',
  rest: 'Rest',
  'test-day': 'Test day',
}

function programDateRange(startDate: string, endDate: string) {
  return startDate === endDate ? formatDate(startDate, { weekday: 'short', month: 'short', day: 'numeric' }) : `${formatDate(startDate)}–${formatDate(endDate)}`
}

function percent(value: number, total: number) {
  return total ? Math.round((value / total) * 100) : 0
}

export function RoadmapPage({ student, skills, drills, practiceTests, learningResources, programPlan }: RoadmapPageProps) {
  const roadmap = buildScoreRoadmap(student, skills, drills, practiceTests, localDateKey())
  const activeIndex = roadmap.milestones.findIndex((milestone) => milestone.id === roadmap.activeMilestone.id)
  const skillsById = new Map(skills.map((skill) => [skill.id, skill]))
  const conceptsRemaining = curriculumMap.filter((entry) => {
    const skill = skillsById.get(entry.skillId)
    if (!skill) return false
    return ['not-started', 'in-progress'].includes(assessCurriculumProgress(entry, skill, learningResources).status)
  }).length
  const currentDate = localDateKey()
  const activeProgramBlock = programPlan?.blocks.find((block) => block.startDate <= currentDate && block.endDate >= currentDate)

  return (
    <>
      <PageHeader
        eyebrow="End-to-end strategy"
        title={`Road to ${roadmap.targetScore}`}
        description={`A backward plan from ${formatDate(roadmap.testDate)}. Every daily assignment should advance the active weekly milestone.`}
        action={<span className="roadmap-live"><RefreshCw size={15} /> Recalculates from saved results</span>}
      />

      <section className="roadmap-hero">
        <div className="roadmap-hero__score">
          <span className="eyebrow">Latest full-test position</span>
          <div><strong>{roadmap.currentScore}</strong><ArrowRight size={24} /><strong>{roadmap.targetScore}</strong></div>
          <p>{roadmap.scoreGap} points to close · {roadmap.daysRemaining} days remaining</p>
        </div>
        <div className="roadmap-hero__phase">
          <span className="roadmap-phase-chip">Active phase</span>
          <h2>{roadmap.activePhase.label}</h2>
          <p>{roadmap.activePhase.objective}</p>
        </div>
        <div className="roadmap-hero__deadline">
          <CalendarCheck2 size={20} />
          <span>Next full-test checkpoint</span>
          <strong>By {formatDate(roadmap.nextPracticeTestDate)}</strong>
          <small>Use the score and mistakes to recalculate every remaining week.</small>
        </div>
      </section>

      <section className="roadmap-readiness" aria-label="Roadmap readiness">
        <article className="panel roadmap-readiness__card">
          <span className="roadmap-card-icon roadmap-card-icon--violet"><BookOpenCheck size={18} /></span>
          <div><span>Concept coverage</span><strong>{roadmap.conceptCoveragePercent}%</strong></div>
          <div className="progress"><span style={{ width: `${roadmap.conceptCoveragePercent}%` }} /></div>
          <small>Learned or in review across the official skill map</small>
        </article>
        <article className="panel roadmap-readiness__card">
          <span className="roadmap-card-icon roadmap-card-icon--teal"><Gauge size={18} /></span>
          <div><span>95% foundation mastery</span><strong>{roadmap.foundationMasteryPercent}%</strong></div>
          <div className="progress"><span style={{ width: `${roadmap.foundationMasteryPercent}%` }} /></div>
          <small>Skills with at least 20 questions and 95% recent accuracy</small>
        </article>
        <article className="panel roadmap-readiness__card">
          <span className="roadmap-card-icon roadmap-card-icon--gold"><Clock3 size={18} /></span>
          <div><span>Time remaining</span><strong>{roadmap.weeksRemaining} weeks</strong></div>
          <div className="progress"><span style={{ width: `${Math.max(5, Math.min(100, (roadmap.daysRemaining / 77) * 100))}%` }} /></div>
          <small>The final 14 days are reserved for readiness, not broad new learning</small>
        </article>
      </section>

      {programPlan && (
        <section className="panel program-plan" aria-label="Published program plan">
          <div className="panel__header program-plan__header">
            <div><span className="eyebrow">Published program plan</span><h2>{programPlan.title}</h2></div>
            <span className="program-plan__private"><ShieldCheck size={14} /> Private student plan</span>
          </div>
          <div className="program-plan__deadline">
            <div>
              <span>Concept-learning deadline</span>
              <strong>{formatDate(programPlan.conceptDeadline, { month: 'long', day: 'numeric' })}</strong>
              <small>{conceptsRemaining} concepts currently remain unlearned or in progress</small>
            </div>
            <div>
              <span>After the deadline</span>
              <strong>Mastery, timing, and transfer</strong>
              <small>No broad new units after school begins unless new test evidence reveals a genuine gap.</small>
            </div>
            <nav className="program-plan__subject-links" aria-label="Open subject learning maps">
              <a href="#reading-writing"><BookOpenCheck size={15} /> R&amp;W learning map</a>
              <a href="#math"><BookOpenCheck size={15} /> Math learning map</a>
            </nav>
          </div>
          <p className="program-plan__principle">{programPlan.principle}</p>
          {activeProgramBlock && (
            <div className="program-plan__now">
              <Target size={17} />
              <div><span>Current allocation</span><strong>{activeProgramBlock.title}</strong></div>
              <small>{programDateRange(activeProgramBlock.startDate, activeProgramBlock.endDate)}</small>
            </div>
          )}
          <div className="program-plan__list">
            {programPlan.blocks.map((block) => (
              <article className={`program-block program-block--${block.kind}`} key={block.id}>
                <div className="program-block__date">
                  <span>{programDateRange(block.startDate, block.endDate)}</span>
                  <strong>{programKindLabel[block.kind]}</strong>
                </div>
                <div className="program-block__body">
                  <h3>{block.title}</h3>
                  <div className="program-block__focus">
                    {block.mathFocus && <p><strong>Math</strong><span>{block.mathFocus}</span></p>}
                    {block.readingWritingFocus && <p><strong>R&amp;W</strong><span>{block.readingWritingFocus}</span></p>}
                  </div>
                  {block.note && <small>{block.note}</small>}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="panel roadmap-now">
        <div className="panel__header">
          <div><span className="eyebrow">This week must accomplish</span><h2>{roadmap.activeMilestone.title}</h2></div>
          <span className="roadmap-week">{formatDate(roadmap.activeMilestone.weekStart)}–{formatDate(roadmap.activeMilestone.weekEnd)}</span>
        </div>
        <div className="roadmap-now__grid">
          <div className="roadmap-outcomes">
            {roadmap.activeMilestone.outcomes.map((outcome) => (
              <div key={outcome}><CheckCircle2 size={16} /><span>{outcome}</span></div>
            ))}
          </div>
          <aside className="roadmap-checkpoint">
            <span className="eyebrow">Score checkpoint</span>
            <strong>{roadmap.activeMilestone.scoreCheckpoint}</strong>
            <div><span>R&amp;W {roadmap.activeMilestone.readingWritingCheckpoint}</span><span>Math {roadmap.activeMilestone.mathCheckpoint}</span></div>
            <small>This is a trajectory checkpoint, not a guarantee. Full-test evidence is the deciding signal.</small>
          </aside>
        </div>
      </section>

      <section className="roadmap-section-grid">
        {roadmap.sections.map((section) => {
          const coverage = percent(section.learnedSkills, section.totalSkills)
          const mastery = percent(section.masteredSkills, section.totalSkills)
          return (
            <article className="panel roadmap-section" key={section.section}>
              <div className="roadmap-section__header">
                <div><span className="eyebrow">Section route</span><h2>{section.section}</h2></div>
                <div className="roadmap-section__score"><strong>{section.currentScore}</strong><ArrowRight size={16} /><strong>{section.targetScore}</strong></div>
              </div>
              <div className="roadmap-section__signals">
                <div><span>Concept coverage</span><strong>{coverage}%</strong></div>
                <div><span>95% mastery</span><strong>{mastery}%</strong></div>
                <div><span>No drill evidence</span><strong>{section.noDrillEvidence}</strong></div>
              </div>
              <h3>Highest-value gaps</h3>
              <div className="roadmap-priorities">
                {section.prioritySkills.map((priority, index) => (
                  <div key={priority.skillId}>
                    <span>{index + 1}</span>
                    <div><strong>{priority.skillName}</strong><small>{priority.domain} · {priority.reason}</small></div>
                  </div>
                ))}
              </div>
            </article>
          )
        })}
      </section>

      <section className="panel roadmap-timeline">
        <div className="panel__header">
          <div><span className="eyebrow">Backward plan</span><h2>Weekly milestones through test day</h2></div>
          <Route size={20} />
        </div>
        <div className="roadmap-timeline__list">
          {roadmap.milestones.map((milestone, index) => {
            const isActive = milestone.id === roadmap.activeMilestone.id
            const Icon = milestone.status === 'complete' ? CheckCircle2 : isActive ? Target : CircleDashed
            return (
              <article className={`roadmap-milestone roadmap-milestone--${milestone.status}`} key={milestone.id}>
                <div className="roadmap-milestone__rail"><Icon size={18} />{index < roadmap.milestones.length - 1 && <span />}</div>
                <div className="roadmap-milestone__body">
                  <div className="roadmap-milestone__heading">
                    <div><span>Week {index + 1} · {formatDate(milestone.weekStart)}</span><h3>{milestone.title}</h3></div>
                    <div className="roadmap-milestone__badges">
                      {isActive && <span className="roadmap-active-badge">Now</span>}
                      {milestone.practiceTestDue && <span className="roadmap-test-badge"><Flag size={12} /> Full test</span>}
                      <strong>{milestone.scoreCheckpoint}</strong>
                    </div>
                  </div>
                  <p>{milestone.prioritySkillNames.length ? milestone.prioritySkillNames.join(' · ') : 'Consolidation and test readiness'}</p>
                  {(isActive || index === activeIndex + 1) && (
                    <ul>{milestone.outcomes.map((outcome) => <li key={outcome}>{outcome}</li>)}</ul>
                  )}
                </div>
              </article>
            )
          })}
        </div>
      </section>

      <section className="roadmap-evidence-note"><BarChart3 size={16} /><span>{roadmap.evidenceNote}</span></section>
    </>
  )
}
