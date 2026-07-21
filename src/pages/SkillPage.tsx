import {
  Activity,
  CheckCircle2,
  Clock3,
  Filter,
  GraduationCap,
  Lightbulb,
  Search,
  Target,
  X,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { ScoreChart } from '../components/ScoreChart'
import { SkillCard } from '../components/SkillCard'
import { EmptyState, PageHeader, ProgressBar, StatCard, StatusBadge } from '../components/ui'
import type { Drill, PracticeTest, Section, Skill } from '../types/models'
import { formatDate } from '../utils/format'

interface SkillPageProps {
  section: Section
  allSkills: Skill[]
  drills: Drill[]
  tests: PracticeTest[]
  targetScore: number
}

type StatusFilter = 'all' | 'attention' | 'strong'

function mixedAccuracyTarget(targetScore: number) {
  if (targetScore >= 1380) return 95
  if (targetScore >= 1300) return 92
  if (targetScore >= 1200) return 90
  if (targetScore >= 1100) return 85
  return 80
}

export function SkillPage({ section, allSkills, drills, tests, targetScore }: SkillPageProps) {
  const sectionSkills = useMemo(() => allSkills.filter((skill) => skill.section === section), [allSkills, section])
  const sectionDrills = useMemo(() => drills.filter((drill) => drill.section === section), [drills, section])
  const domains = [...new Set(sectionSkills.map((skill) => skill.domain))]
  const domainSummaries = domains.map((domain) => {
    const testEvidence = tests
      .flatMap((test) => test.domainPerformance)
      .filter((result) => result.section === section && result.domain === domain)
    const drillEvidence = sectionDrills.filter((drill) => drill.domain === domain)
    const testAttempted = testEvidence.reduce((sum, result) => sum + result.total, 0)
    const testCorrect = testEvidence.reduce((sum, result) => sum + result.correct, 0)
    const drillAttempted = drillEvidence.reduce((sum, drill) => sum + drill.attempted, 0)
    const drillCorrect = drillEvidence.reduce((sum, drill) => sum + drill.correct, 0)

    return {
      domain,
      testAttempted,
      testCorrect,
      testAccuracy: testAttempted ? Math.round((testCorrect / testAttempted) * 100) : undefined,
      drillAttempted,
      drillCorrect,
      drillAccuracy: drillAttempted ? Math.round((drillCorrect / drillAttempted) * 100) : undefined,
    }
  })
  const [domainFilter, setDomainFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [skillQuery, setSkillQuery] = useState('')

  const filteredSkills = sectionSkills.filter((skill) => {
    const matchesDomain = domainFilter === 'all' || skill.domain === domainFilter
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'strong' && ['Strong', 'Mastered'].includes(skill.combinedStatus)) ||
      (statusFilter === 'attention' && !['Strong', 'Mastered'].includes(skill.combinedStatus))
    const normalizedQuery = skillQuery.trim().toLowerCase()
    const matchesQuery = !normalizedQuery || `${skill.name} ${skill.domain} ${skill.description}`.toLowerCase().includes(normalizedQuery)
    return matchesDomain && matchesStatus && matchesQuery
  })
  const groupedSkills = domains
    .map((domain) => ({
      domain,
      skills: filteredSkills.filter((skill) => skill.domain === domain),
    }))
    .filter((group) => group.skills.length > 0)

  const attempted = sectionDrills.reduce((sum, drill) => sum + drill.attempted, 0)
  const correct = sectionDrills.reduce((sum, drill) => sum + drill.correct, 0)
  const averageAccuracy = attempted ? Math.round((correct / attempted) * 100) : undefined
  const accuracyTarget = mixedAccuracyTarget(targetScore)
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

      <section className="accuracy-target-panel" aria-label={`${sectionName} accuracy target`}>
        <div className="accuracy-target-panel__intro">
          <div><Target size={20} /></div>
          <span className="eyebrow">Readiness target for a {targetScore} score goal</span>
          <h2>{accuracyTarget}%+ timed mixed accuracy</h2>
          <p>A coaching target for practice—not a guaranteed score conversion.</p>
        </div>
        <div className="accuracy-target-panel__metrics">
          <div><span>Easy + Medium</span><strong>95%+</strong><small>Before moving to Hard</small></div>
          <div><span>Hard questions</span><strong>90%+</strong><small>Strong readiness</small></div>
          <div><span>Recorded {section === 'Math' ? 'Math' : 'R&W'} drills</span><strong>{averageAccuracy === undefined ? '—' : `${averageAccuracy}%`}</strong><small>{attempted ? `${correct}/${attempted} correct` : 'No drill evidence yet'}</small></div>
        </div>
      </section>

      <section className="stats-grid stats-grid--four">
        <StatCard label="Recorded drill accuracy" value={averageAccuracy === undefined ? '—' : `${averageAccuracy}%`} detail={attempted ? `${correct} of ${attempted} correct` : 'No drill evidence yet'} icon={Target} tone={section === 'Math' ? 'teal' : 'violet'} />
        <StatCard label="Strong skills" value={`${strongSkills} / ${sectionSkills.length}`} detail="Strong or mastered" icon={CheckCircle2} tone="teal" />
        <StatCard label="Trending up" value={improvingSkills} detail="Skills gaining momentum" icon={Activity} tone="gold" />
        <StatCard label="Practice sessions" value={sectionDrills.length} detail="All recorded drills" icon={Clock3} tone="blue" />
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
            target={targetScore}
          />
        </article>

        <article className="panel domain-summary-panel">
          <div className="panel__header panel__header--compact">
            <div><span className="eyebrow">Domain-level evidence</span><h2>Performance by domain</h2></div>
            <div className="signal-pair">
              <span><i className="dot dot--violet" /> Tests</span>
              <span><i className="dot dot--teal" /> Drills</span>
            </div>
          </div>
          <div className="domain-summary-list">
            {domainSummaries.map((summary) => (
              <div className="domain-summary-row" key={summary.domain}>
                <strong>{summary.domain}</strong>
                <div className="domain-summary-signal">
                  <span>Practice tests</span>
                  <ProgressBar value={summary.testAccuracy} tone="violet" label={`${summary.domain} practice-test accuracy`} />
                  <small>{summary.testAccuracy === undefined ? 'No evidence' : `${summary.testCorrect}/${summary.testAttempted} · ${summary.testAccuracy}%`}</small>
                </div>
                <div className="domain-summary-signal">
                  <span>Daily drills</span>
                  <ProgressBar value={summary.drillAccuracy} tone="teal" label={`${summary.domain} drill accuracy`} />
                  <small>{summary.drillAccuracy === undefined ? 'No evidence' : `${summary.drillCorrect}/${summary.drillAttempted} · ${summary.drillAccuracy}%`}</small>
                </div>
              </div>
            ))}
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
            <label className="filter-search">
              <Search size={14} />
              <span className="sr-only">Search skills</span>
              <input value={skillQuery} onChange={(event) => setSkillQuery(event.target.value)} placeholder="Search skills" />
            </label>
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
            {(skillQuery || domainFilter !== 'all' || statusFilter !== 'all') && (
              <button className="filter-clear" type="button" onClick={() => { setSkillQuery(''); setDomainFilter('all'); setStatusFilter('all') }}><X size={14} /> Clear</button>
            )}
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
          {!groupedSkills.length && <EmptyState title="No skills match these filters" description="Clear a filter or try a different search term." />}
        </div>
      </section>

      <section className="panel drill-history-panel">
        <div className="panel__header">
          <div><span className="eyebrow">Skill-specific evidence</span><h2>Recent drill history</h2></div>
          <span className="muted-caption">College Board question bank</span>
        </div>
        <div className="drill-table-wrap" role="region" aria-label="Drill history; scroll horizontally for all columns" tabIndex={0}>
          <table className="drill-table">
            <caption className="sr-only">Recorded drill history for {sectionName}</caption>
            <thead><tr><th scope="col">Date</th><th scope="col">Skill</th><th scope="col">Domain</th><th scope="col">Difficulty</th><th scope="col">Result</th><th scope="col">Time</th><th scope="col">Signal</th></tr></thead>
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
