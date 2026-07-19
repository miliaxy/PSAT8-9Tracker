import { CalendarClock, Lightbulb, TestTube2 } from 'lucide-react'
import type { Skill } from '../types/models'
import { formatDate, statusKey } from '../utils/format'
import { ProgressBar, StatusBadge, TrendBadge } from './ui'

export function SkillCard({ skill }: { skill: Skill }) {
  const drillAccuracy = skill.drillEvidence.recentAccuracy
  const testAccuracy = skill.practiceTestEvidence.recentAccuracy

  return (
    <article className="skill-card">
      <div className="skill-card__header">
        <div>
          <span className="skill-card__domain">{skill.domain}</span>
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
          <ProgressBar value={testAccuracy ?? 0} tone="violet" label={`${skill.name} practice test accuracy`} />
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
          <ProgressBar value={drillAccuracy ?? 0} tone="teal" label={`${skill.name} drill accuracy`} />
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
        <span><strong>Coach’s next step:</strong> {skill.nextStep}</span>
      </div>
    </article>
  )
}
