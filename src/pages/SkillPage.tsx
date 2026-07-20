import {
  Activity,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Filter,
  GraduationCap,
  Lightbulb,
  Target,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { ScoreChart } from '../components/ScoreChart'
import { SkillCard } from '../components/SkillCard'
import { PageHeader, StatCard, StatusBadge } from '../components/ui'
import type { Drill, PracticeTest, Section, Skill } from '../types/models'
import { formatDate } from '../utils/format'

interface SkillPageProps {
  section: Section
  allSkills: Skill[]
  drills: Drill[]
  tests: PracticeTest[]
}

type StatusFilter = 'all' | 'attention' | 'strong'

export function SkillPage({ section, allSkills, drills, tests }: SkillPageProps) {
  const sectionSkills = useMemo(() => allSkills.filter((skill) => skill.section === section), [allSkills, section])
  const sectionDrills = useMemo(() => drills.filter((drill) => drill.section === section), [drills, section])
  const domains = [...new Set(sectionSkills.map((skill) => skill.domain))]
  const [domainFilter, setDomainFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const filteredSkills = sectionSkills.filter((skill) => {
    const matchesDomain = domainFilter === 'all' || skill.domain === domainFilter
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'strong' && ['Strong', 'Mastered'].includes(skill.combinedStatus)) ||
      (statusFilter === 'attention' && !['Strong', 'Mastered'].includes(skill.combinedStatus))
    return matchesDomain && matchesStatus
  })
  const groupedSkills = domains
    .map((domain) => ({
      domain,
      skills: filteredSkills.filter((skill) => skill.domain === domain),
    }))
    .filter((group) => group.skills.length > 0)

  const attempted = sectionDrills.reduce((sum, drill) => sum + drill.attempted, 0)
  const correct = sectionDrills.reduce((sum, drill) => sum + drill.correct, 0)
  const averageAccuracy = attempted ? Math.round((correct / attempted) * 100) : 0
  const strongSkills = sectionSkills.filter((skill) => ['Strong', 'Mastered'].includes(skill.combinedStatus)).length
  const improvingSkills = sectionSkills.filter((skill) => skill.trend === 'up').length
  const sectionName = section === 'Reading & Writing' ? 'Reading & Writing' : 'Math'
  const sectionDescription =
    section === 'Reading & Writing'
      ? 'Track every College Board domain using separate full-test and daily-drill signals.'
      : 'See concept readiness, Khan learning progress, and performance under test conditions.'

  return (
    <>
      <PageHeader
        eyebrow={`${sectionName} coaching`}
        title={`${sectionName} skill map`}
        description={sectionDescription}
        action={<span className="evidence-chip"><Activity size={16} /> Two evidence streams</span>}
      />

      <section className="stats-grid stats-grid--four">
        <StatCard label="Recent drill accuracy" value={`${averageAccuracy}%`} detail={`${correct} of ${attempted} correct`} icon={Target} tone={section === 'Math' ? 'teal' : 'violet'} />
        <StatCard label="Strong skills" value={`${strongSkills} / ${sectionSkills.length}`} detail="Strong or mastered" icon={CheckCircle2} tone="teal" />
        <StatCard label="Trending up" value={improvingSkills} detail="Skills gaining momentum" icon={Activity} tone="gold" />
        <StatCard label="Practice sessions" value={sectionDrills.length} detail="Most recent two weeks" icon={Clock3} tone="blue" />
      </section>

      <section className="skill-overview-grid">
        <article className="panel skill-trend-panel">
          <div className="panel__header panel__header--compact">
            <div><span className="eyebrow">Full-test evidence</span><h2>{sectionName} score trend</h2></div>
            <strong>{section === 'Math' ? tests.at(-1)?.mathScore : tests.at(-1)?.readingWritingScore}</strong>
          </div>
          <ScoreChart
            tests={tests}
            compact
            section={section === 'Math' ? 'math' : 'reading-writing'}
            target={1400}
          />
        </article>

        <article className="evidence-explainer">
          <div className="evidence-explainer__icon"><BrainCircuit size={22} /></div>
          <div>
            <span className="eyebrow">How coaching status works</span>
            <h2>Keep the signals honest</h2>
            <p>
              A skill can look strong in a short drill but still need work on a full test. The coach reads both
              signals—and always shows you the raw evidence.
            </p>
          </div>
          <div className="signal-pair">
            <span><i className="dot dot--violet" /> Practice tests</span>
            <span><i className="dot dot--teal" /> Daily drills</span>
          </div>
        </article>
      </section>

      {section === 'Math' && (
        <section className="concept-strip" aria-label="Math concept states">
          <div><GraduationCap size={19} /><span>Learning path</span></div>
          <span className="concept-state concept-state--not-yet-taught">Not yet taught · {sectionSkills.filter((skill) => skill.conceptState === 'not_yet_taught').length}</span>
          <span className="concept-state concept-state--learning">Learning · {sectionSkills.filter((skill) => skill.conceptState === 'learning').length}</span>
          <span className="concept-state concept-state--needs-review">Needs review · {sectionSkills.filter((skill) => skill.conceptState === 'needs_review').length}</span>
          <span className="concept-state concept-state--strong">Strong · {sectionSkills.filter((skill) => ['strong', 'mastered'].includes(skill.conceptState)).length}</span>
        </section>
      )}

      <section className="panel skills-panel">
        <div className="panel__header skills-panel__header">
          <div>
            <span className="eyebrow">Skill-level coaching</span>
            <h2>
              {filteredSkills.length} {filteredSkills.length === 1 ? 'skill' : 'skills'} across {groupedSkills.length} {groupedSkills.length === 1 ? 'domain' : 'domains'}
            </h2>
          </div>
          <div className="filters">
            <label>
              <Filter size={14} />
              <span className="sr-only">Filter by domain</span>
              <select value={domainFilter} onChange={(event) => setDomainFilter(event.target.value)}>
                <option value="all">All domains</option>
                {domains.map((domain) => <option key={domain} value={domain}>{domain}</option>)}
              </select>
            </label>
            <label>
              <span className="sr-only">Filter by coaching status</span>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
                <option value="all">All statuses</option>
                <option value="attention">Needs attention</option>
                <option value="strong">Strong / mastered</option>
              </select>
            </label>
          </div>
        </div>
        <div className="skill-domain-list">
          {groupedSkills.map((group) => (
            <section className="skill-domain-group" key={group.domain}>
              <div className="skill-domain-group__header">
                <div><span className="eyebrow">Domain</span><h3>{group.domain}</h3></div>
                <span>{group.skills.length} {group.skills.length === 1 ? 'skill' : 'skills'}</span>
              </div>
              <div className="skill-list">
                {group.skills.map((skill) => <SkillCard skill={skill} showDomain={false} key={skill.id} />)}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="panel drill-history-panel">
        <div className="panel__header">
          <div><span className="eyebrow">Skill-specific evidence</span><h2>Recent drill history</h2></div>
          <span className="muted-caption">College Board question bank</span>
        </div>
        <div className="drill-table-wrap">
          <table className="drill-table">
            <thead><tr><th>Date</th><th>Skill</th><th>Domain</th><th>Difficulty</th><th>Result</th><th>Time</th><th>Signal</th></tr></thead>
            <tbody>
              {sectionDrills.map((drill) => (
                <tr key={drill.id}>
                  <td>{formatDate(drill.date)}</td>
                  <td><strong>{drill.skillTopic}</strong></td>
                  <td>{drill.domain}</td>
                  <td><span className={`difficulty difficulty--${drill.difficulty.toLowerCase()}`}>{drill.difficulty}</span></td>
                  <td><strong className={drill.accuracy >= 80 ? 'accuracy accuracy--good' : drill.accuracy >= 70 ? 'accuracy accuracy--developing' : 'accuracy accuracy--needs-work'}>{drill.correct}/{drill.attempted} · {drill.accuracy}%</strong></td>
                  <td>{drill.timeSpentMinutes ? `${drill.timeSpentMinutes}/${drill.timeLimitMinutes} min` : '—'}</td>
                  <td><StatusBadge status={drill.accuracy >= 85 ? 'Strong' : drill.accuracy >= 70 ? 'Improving' : 'Needs work'} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="table-note"><Lightbulb size={14} /> Drill results remain separate from full-test evidence throughout the app.</div>
      </section>
    </>
  )
}
