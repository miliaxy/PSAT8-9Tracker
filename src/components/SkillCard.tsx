import { BookOpenCheck, CalendarClock, ExternalLink, Lightbulb, ListChecks, TestTube2 } from 'lucide-react'
import type { CurriculumMapEntry, CurriculumResource } from '../data/curriculumMap'
import type { Skill } from '../types/models'
import type { CurriculumProgressAssessment } from '../utils/curriculumProgress'
import { formatDate, statusKey } from '../utils/format'
import { ProgressBar, StatusBadge, TrendBadge } from './ui'

interface SkillCardProps {
  skill: Skill
  showDomain?: boolean
  curriculumEntry?: CurriculumMapEntry
  learningAssessment?: CurriculumProgressAssessment
  ixlResource?: CurriculumResource
}

export function SkillCard({ skill, showDomain = true, curriculumEntry, learningAssessment, ixlResource }: SkillCardProps) {
  const drillAccuracy = skill.drillEvidence.recentAccuracy
  const testAccuracy = skill.practiceTestEvidence.recentAccuracy

  return (
    <article className="skill-card">
      <div className="skill-card__header">
        <div>
          {showDomain && <span className="skill-card__domain">{skill.domain}</span>}
          <h3>{skill.name}</h3>
          <p>{skill.description}</p>
        </div>
        <StatusBadge status={skill.combinedStatus} />
      </div>

      <div className="evidence-grid">
        <div className="evidence-card evidence-card--test">
          <div className="evidence-card__label">
            <TestTube2 size={15} /> Practice tests
          </div>
          <div className="evidence-card__value-row">
            <strong>{skill.practiceTestEvidence.rating}</strong>
            <span>{testAccuracy === undefined ? 'No score' : `${testAccuracy}%`}</span>
          </div>
          <ProgressBar value={testAccuracy} tone="violet" label={`${skill.name} practice test accuracy`} />
          <small>{skill.practiceTestEvidence.totalCorrect}/{skill.practiceTestEvidence.totalAttempted} correct across tests</small>
        </div>
        <div className="evidence-card evidence-card--drill">
          <div className="evidence-card__label">
            <Lightbulb size={15} /> Daily drills
          </div>
          <div className="evidence-card__value-row">
            <strong>{skill.drillEvidence.rating}</strong>
            <span>{drillAccuracy === undefined ? 'No score' : `${drillAccuracy}%`}</span>
          </div>
          <ProgressBar value={drillAccuracy} tone="teal" label={`${skill.name} drill accuracy`} />
          <small>{skill.drillEvidence.totalCorrect}/{skill.drillEvidence.totalAttempted} correct across drills</small>
        </div>
      </div>

      {skill.khanProgress !== undefined && (
        <div className="khan-progress">
          <span>Khan learning path</span>
          <ProgressBar value={skill.khanProgress} tone="gold" label={`${skill.name} Khan Academy progress`} />
          <strong>{skill.khanProgress}%</strong>
        </div>
      )}

      {curriculumEntry && learningAssessment && (
        <section className="skill-learning" aria-label={`${skill.name} learning path`}>
          <div className="skill-learning__header">
            <div>
              <span className="eyebrow"><BookOpenCheck size={14} /> Learning status</span>
              <strong className={`curriculum-status curriculum-status--${learningAssessment.status}`}>{learningAssessment.label}</strong>
            </div>
            <span>College Board skill · matched resources</span>
          </div>

          <div className="skill-learning__action">
            <strong>What to do next</strong>
            <p>{learningAssessment.nextAction}</p>
          </div>

          <div className="skill-learning__resources" aria-label="Study resources">
            <a href={curriculumEntry.resource.url} target="_blank" rel="noreferrer">
              <span><strong>{curriculumEntry.resource.provider} · {curriculumEntry.resource.course}</strong><small>{curriculumEntry.resource.unit}</small></span>
              <ExternalLink size={15} />
            </a>
            {curriculumEntry.secondaryResource && (
              <a href={curriculumEntry.secondaryResource.url} target="_blank" rel="noreferrer">
                <span><strong>{curriculumEntry.secondaryResource.provider} · {curriculumEntry.secondaryResource.course}</strong><small>{curriculumEntry.secondaryResource.unit}</small></span>
                <ExternalLink size={15} />
              </a>
            )}
            {ixlResource && (
              <a className="skill-learning__resource--ixl" href={ixlResource.url} target="_blank" rel="noreferrer">
                <span><strong>IXL alternative · {ixlResource.course}</strong><small>{ixlResource.unit}</small></span>
                <ExternalLink size={15} />
              </a>
            )}
          </div>

          <details className="skill-learning__details">
            <summary><ListChecks size={14} /> See required concepts and status evidence</summary>
            <div>
              <section>
                <h4>Required PSAT 8/9 concepts</h4>
                <ul>{curriculumEntry.requiredConcepts.map((concept) => <li key={concept}>{concept}</li>)}</ul>
              </section>
              <section>
                <h4>Evidence used</h4>
                <ul>{learningAssessment.evidence.map((item) => <li key={item}>{item}</li>)}</ul>
              </section>
            </div>
          </details>
        </section>
      )}

      <div className="skill-card__footer">
        <TrendBadge trend={skill.trend} />
        <span className={`concept-state concept-state--${statusKey(skill.conceptState)}`}>
          {skill.conceptState.replaceAll('_', ' ')}
        </span>
        <span className="last-practiced">
          <CalendarClock size={14} />
          {skill.lastPracticed ? `Last practiced ${formatDate(skill.lastPracticed)}` : 'Not practiced yet'}
        </span>
      </div>
      <div className="skill-card__next">
        <Lightbulb size={15} />
        <span><strong>Performance next step:</strong> {skill.nextStep}</span>
      </div>
    </article>
  )
}
