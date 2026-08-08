import { useMemo, useState } from 'react'
import {
  AlertTriangle,
  BookOpenCheck,
  CheckCircle2,
  CircleDashed,
  ExternalLink,
  Filter,
  GraduationCap,
  ListChecks,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react'
import { PageHeader } from '../components/ui'
import { curriculumMap, ixlBySkillId } from '../data/curriculumMap'
import type { LearningResourceUnit, Section, Skill } from '../types/models'
import { assessCurriculumProgress, type CurriculumLearningStatus } from '../utils/curriculumProgress'

interface CurriculumPageProps {
  skills: Skill[]
  resources: LearningResourceUnit[]
}

const statusOrder: CurriculumLearningStatus[] = ['not-started', 'in-progress', 'verify', 'review', 'reinforce', 'learned']

const statusIcon = {
  learned: CheckCircle2,
  reinforce: RefreshCw,
  review: AlertTriangle,
  'in-progress': BookOpenCheck,
  verify: ListChecks,
  'not-started': CircleDashed,
}

function percentage(correct: number, attempted: number) {
  return attempted ? `${Math.round((correct / attempted) * 100)}%` : 'No evidence'
}

export function CurriculumPage({ skills, resources }: CurriculumPageProps) {
  const [section, setSection] = useState<'All' | Section>('All')
  const [status, setStatus] = useState<'All' | CurriculumLearningStatus>('All')
  const skillsById = useMemo(() => new Map(skills.map((skill) => [skill.id, skill])), [skills])
  const mapped = useMemo(() => curriculumMap.flatMap((entry) => {
    const skill = skillsById.get(entry.skillId)
    if (!skill) return []
    return [{ entry, skill, assessment: assessCurriculumProgress(entry, skill, resources) }]
  }), [resources, skillsById])

  const filtered = mapped.filter((item) => (section === 'All' || item.entry.section === section)
    && (status === 'All' || item.assessment.status === status))
  const counts = statusOrder.reduce<Record<CurriculumLearningStatus, number>>((result, key) => {
    result[key] = mapped.filter((item) => item.assessment.status === key).length
    return result
  }, { learned: 0, reinforce: 0, review: 0, 'in-progress': 0, verify: 0, 'not-started': 0 })

  const groups = Array.from(new Set(filtered.map((item) => `${item.entry.section}|${item.entry.domain}`))).map((key) => {
    const [groupSection, domain] = key.split('|') as [Section, string]
    return { section: groupSection, domain, items: filtered.filter((item) => item.entry.section === groupSection && item.entry.domain === domain) }
  })

  return (
    <>
      <PageHeader
        eyebrow="Learning sequence"
        title="PSAT 8/9 curriculum map"
        description="Every official skill is connected to the smallest useful Khan Academy learning path, with prior study and performance evidence layered on top."
        action={<span className="curriculum-source-chip"><ShieldCheck size={15} /> Personalized status · public curriculum</span>}
      />

      <section className="curriculum-principle" aria-label="How this curriculum map works">
        <div><GraduationCap size={22} /><div><strong>College Board defines the scope</strong><span>Khan supplies the primary concept path; IXL is an optional matched alternative, not a broader syllabus.</span></div></div>
        <div><ListChecks size={22} /><div><strong>Prior study is preserved</strong><span>Completed resources and current test/drill evidence prevent unnecessary restarts.</span></div></div>
        <div><RefreshCw size={22} /><div><strong>Learning and mastery stay separate</strong><span>Finishing a lesson unlocks Easy/Medium practice; 95% evidence controls the move to Hard.</span></div></div>
      </section>

      <section className="curriculum-summary" aria-label="Curriculum progress summary">
        <article className="panel"><span>Learned</span><strong>{counts.learned}</strong><small>Maintain with mixed practice</small></article>
        <article className="panel"><span>Studied</span><strong>{counts.reinforce + counts.review}</strong><small>Reinforce or targeted review</small></article>
        <article className="panel"><span>Verify</span><strong>{counts.verify}</strong><small>Prior evidence conflicts with status</small></article>
        <article className="panel"><span>Still learning</span><strong>{counts['in-progress'] + counts['not-started']}</strong><small>Concept work remains</small></article>
      </section>

      <section className="panel curriculum-controls" aria-label="Curriculum filters">
        <div><Filter size={17} /><strong>Show</strong></div>
        <label>Section
          <select value={section} onChange={(event) => setSection(event.target.value as 'All' | Section)}>
            <option value="All">All sections</option>
            <option value="Reading & Writing">Reading &amp; Writing</option>
            <option value="Math">Math</option>
          </select>
        </label>
        <label>Learning status
          <select value={status} onChange={(event) => setStatus(event.target.value as 'All' | CurriculumLearningStatus)}>
            <option value="All">All statuses</option>
            <option value="not-started">Not yet learned</option>
            <option value="in-progress">Learning in progress</option>
            <option value="verify">Prior study · verify</option>
            <option value="review">Studied · review needed</option>
            <option value="reinforce">Studied · reinforce</option>
            <option value="learned">Learned</option>
          </select>
        </label>
      </section>

      <section className="curriculum-legend" aria-label="Evidence warning">
        <AlertTriangle size={16} />
        <span><strong>“Verify” is intentional.</strong> It means saved results or completed resources show prior exposure while the concept record still says “not yet taught.” The map will not automatically reteach that unit.</span>
      </section>

      <div className="curriculum-groups">
        {groups.map((group) => (
          <section className="curriculum-domain" key={`${group.section}-${group.domain}`}>
            <header><div><span>{group.section}</span><h2>{group.domain}</h2></div><strong>{group.items.length} skills</strong></header>
            <div className="curriculum-grid">
              {group.items.map(({ entry, skill, assessment }) => {
                const StatusIcon = statusIcon[assessment.status]
                const ixlResource = ixlBySkillId.get(entry.skillId)
                return (
                  <article className="panel curriculum-card" key={entry.skillId}>
                    <div className="curriculum-card__header">
                      <div><span className={`curriculum-status curriculum-status--${assessment.status}`}><StatusIcon size={13} />{assessment.label}</span><h3>{skill.name}</h3></div>
                      <div className="curriculum-card__evidence-score"><span>Tests {percentage(skill.practiceTestEvidence.totalCorrect, skill.practiceTestEvidence.totalAttempted)}</span><span>Drills {percentage(skill.drillEvidence.totalCorrect, skill.drillEvidence.totalAttempted)}</span></div>
                    </div>

                    <div className="curriculum-card__columns">
                      <div>
                        <h4>Required PSAT concepts</h4>
                        <ul>{entry.requiredConcepts.map((concept) => <li key={concept}>{concept}</li>)}</ul>
                      </div>
                      <div>
                        <h4>Exact learning path</h4>
                        <a href={entry.resource.url} target="_blank" rel="noreferrer"><span><strong>{entry.resource.course}</strong><small>{entry.resource.unit}</small></span><ExternalLink size={15} /></a>
                        {entry.secondaryResource && <a href={entry.secondaryResource.url} target="_blank" rel="noreferrer"><span><strong>{entry.secondaryResource.course}</strong><small>{entry.secondaryResource.unit}</small></span><ExternalLink size={15} /></a>}
                        {ixlResource && <a className="curriculum-resource--ixl" href={ixlResource.url} target="_blank" rel="noreferrer"><span><strong>IXL alternative · {ixlResource.course}</strong><small>{ixlResource.unit}</small></span><ExternalLink size={15} /></a>}
                      </div>
                    </div>

                    <details className="curriculum-evidence">
                      <summary>Evidence used for this status</summary>
                      <ul>{assessment.evidence.map((item) => <li key={item}>{item}</li>)}</ul>
                    </details>

                    <div className="curriculum-next"><strong>Next action</strong><p>{assessment.nextAction}</p></div>
                    {entry.doNotAssign?.length ? <div className="curriculum-exclusions"><strong>Keep out of the plan</strong><span>{entry.doNotAssign.join(' · ')}</span></div> : null}
                  </article>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      <footer className="curriculum-sources">
        <strong>Scope sources</strong>
        <a href="https://satsuite.collegeboard.org/psat-8-9/whats-on-the-test/reading" target="_blank" rel="noreferrer">College Board R&amp;W <ExternalLink size={13} /></a>
        <a href="https://satsuite.collegeboard.org/psat-8-9/whats-on-the-test/math" target="_blank" rel="noreferrer">College Board Math <ExternalLink size={13} /></a>
        <a href="https://www.khanacademy.org/test-prep/sat-reading-and-writing" target="_blank" rel="noreferrer">Khan R&amp;W <ExternalLink size={13} /></a>
        <a href="https://www.khanacademy.org/math/algebra" target="_blank" rel="noreferrer">Khan Math <ExternalLink size={13} /></a>
        <a href="https://www.ixl.com/ela/grade-8/skills" target="_blank" rel="noreferrer">IXL R&amp;W alternatives <ExternalLink size={13} /></a>
        <a href="https://www.ixl.com/math/grade-8/skills" target="_blank" rel="noreferrer">IXL Math alternatives <ExternalLink size={13} /></a>
      </footer>
    </>
  )
}
