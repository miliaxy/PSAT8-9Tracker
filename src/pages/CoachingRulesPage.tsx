import {
  ArrowRight,
  BarChart3,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileCheck2,
  Gauge,
  GraduationCap,
  ListChecks,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
} from 'lucide-react'
import { PageHeader } from '../components/ui'

const decisionSteps = [
  { number: '01', title: 'Read the evidence', detail: 'Full-test results, drills, mistakes, concept status, and time since practice.', icon: BarChart3 },
  { number: '02', title: 'Choose priorities', detail: 'Skills needing attention rise above skills that are already strong.', icon: Target },
  { number: '03', title: 'Build the work', detail: 'The plan separates learning, review, drills, reading, and test strategy.', icon: ListChecks },
  { number: '04', title: 'Learn from results', detail: 'New evidence updates skill status and the next recommendation.', icon: RefreshCw },
]

const ruleGroups = [
  {
    title: 'Evidence stays transparent',
    eyebrow: 'What the engine reads',
    icon: BarChart3,
    tone: 'violet',
    rules: [
      'Practice-test evidence and daily-drill evidence remain separate.',
      'A skill without enough information is labeled No evidence—not guessed.',
      'Recent accuracy, mistakes, trends, and time since practice all matter.',
    ],
  },
  {
    title: 'Priorities come from need',
    eyebrow: 'What rises first',
    icon: Target,
    tone: 'coral',
    rules: [
      'Needs-review and developing skills come before strong skills.',
      'Recent low accuracy, concept mistakes, and long gaps increase priority.',
      'The score goal and days remaining influence how narrow or broad a day should be.',
    ],
  },
  {
    title: 'Learn, review, and drill are different',
    eyebrow: 'Instructional sequence',
    icon: BrainCircuit,
    tone: 'teal',
    rules: [
      'Learn introduces a concept that is not yet secure.',
      'Review revisits a previously taught method that needs reinforcement.',
      'Drill applies a learned method under deliberate practice conditions.',
      'A concept still being learned is not drilled until the concept work is complete.',
    ],
  },
  {
    title: 'Accuracy unlocks difficulty',
    eyebrow: 'The 95% rule',
    icon: Gauge,
    tone: 'gold',
    rules: [
      'Easy and Medium work comes before Hard work.',
      'Hard questions unlock only after recent Easy/Medium accuracy reaches at least 95%.',
      'The threshold rewards reliable method and execution—not a single lucky result.',
    ],
  },
  {
    title: 'Pacing is based on the test',
    eyebrow: 'Question counts and time',
    icon: Clock3,
    tone: 'blue',
    rules: [
      'Every drill has an exact question count and difficulty mix.',
      'Reading & Writing averages about 1:11 per question; Math averages about 1:35.',
      'Easy and Medium questions should bank time for harder questions.',
      'Drill minutes measure answering time. Review happens afterward and is still required.',
    ],
  },
  {
    title: 'Every mistake completes a loop',
    eyebrow: 'Required reflection',
    icon: CheckCircle2,
    tone: 'teal',
    rules: [
      'Every missed question is reviewed after the timed work.',
      'The cause is classified so the same mistake is less likely to repeat.',
      'Concept gaps lead back to learning or review; execution errors lead to a targeted habit.',
    ],
  },
  {
    title: 'Reading is a daily foundation',
    eyebrow: 'Standing habit',
    icon: BookOpen,
    tone: 'violet',
    rules: [
      'Independent reading appears on every study day.',
      'The goal is sustained comprehension, vocabulary growth, and reading stamina.',
      'The reading task stays distinct from PSAT question drills.',
    ],
  },
  {
    title: 'A parent approves the plan',
    eyebrow: 'Human control',
    icon: FileCheck2,
    tone: 'blue',
    rules: [
      'Recommendations begin as drafts, never as automatically published homework.',
      'A parent can edit timing, resources, task wording, and priorities.',
      'Only an explicitly reviewed plan is published to the student.',
    ],
  },
]

export function CoachingRulesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Transparent by design"
        title="How coaching works"
        description="The tracker turns evidence into an editable daily plan using visible, consistent rules. Nothing here depends on a hidden combined score."
        action={<span className="rules-version"><ShieldCheck size={16} /> Coaching rules v1 · July 2026</span>}
      />

      <section className="panel rules-intro">
        <div className="rules-intro__copy">
          <span className="eyebrow">The decision loop</span>
          <h2>Evidence becomes action—and action creates better evidence.</h2>
          <p>Each recommendation can be traced back to what the student has learned, attempted, missed, and recently practiced.</p>
        </div>
        <div className="rules-flow" aria-label="Coaching decision flow">
          {decisionSteps.map(({ number, title, detail, icon: Icon }, index) => (
            <div className="rules-flow__step" key={number}>
              <span className="rules-flow__number">{number}</span>
              <span className="rules-flow__icon"><Icon size={18} /></span>
              <strong>{title}</strong>
              <p>{detail}</p>
              {index < decisionSteps.length - 1 && <ArrowRight className="rules-flow__arrow" size={17} aria-hidden="true" />}
            </div>
          ))}
        </div>
      </section>

      <section className="rules-heading">
        <div><span className="eyebrow">Codified approach</span><h2>The rules used for recommendations</h2></div>
        <p>These rules are educational choices, not permanent assumptions. They can be refined with parent and teacher feedback.</p>
      </section>

      <section className="rules-grid">
        {ruleGroups.map(({ title, eyebrow, icon: Icon, tone, rules }) => (
          <article className={`panel rule-card rule-card--${tone}`} key={title}>
            <div className="rule-card__header">
              <span className="rule-card__icon"><Icon size={19} /></span>
              <div><span className="eyebrow">{eyebrow}</span><h3>{title}</h3></div>
            </div>
            <ul>
              {rules.map((rule) => <li key={rule}><CheckCircle2 size={14} /> <span>{rule}</span></li>)}
            </ul>
          </article>
        ))}
      </section>

      <section className="rules-bottom-grid">
        <article className="panel rules-never">
          <div className="rule-card__header">
            <span className="rule-card__icon"><ShieldCheck size={19} /></span>
            <div><span className="eyebrow">Guardrails</span><h3>What the engine never does</h3></div>
          </div>
          <div className="rules-never__grid">
            <span><ShieldCheck size={15} /> Invent results or fill missing evidence with guesses</span>
            <span><ShieldCheck size={15} /> Hide practice-test and drill evidence inside one opaque score</span>
            <span><ShieldCheck size={15} /> Diagnose, shame, compare, or guarantee an outcome</span>
            <span><ShieldCheck size={15} /> Publish homework without parent review and approval</span>
          </div>
        </article>

        <article className="panel rules-feedback">
          <span className="rules-feedback__icon"><Sparkles size={22} /></span>
          <span className="eyebrow">Teacher partnership</span>
          <h3>These rules are meant to improve.</h3>
          <p>A teacher can suggest different priorities, pacing, resources, or mastery thresholds. The tracker should make those choices visible and consistent.</p>
        </article>
      </section>

      <section className="panel rules-sources">
        <div>
          <span className="rule-card__icon"><GraduationCap size={19} /></span>
          <div><span className="eyebrow">Official foundation</span><h3>College Board PSAT 8/9 references</h3><p>The skill taxonomy and test pacing begin with the official test specifications.</p></div>
        </div>
        <nav aria-label="Official PSAT 8/9 references">
          <a href="https://satsuite.collegeboard.org/psat-8-9/whats-on-the-test/reading" target="_blank" rel="noreferrer">Reading &amp; Writing <ExternalLink size={13} /></a>
          <a href="https://satsuite.collegeboard.org/psat-8-9/whats-on-the-test/math" target="_blank" rel="noreferrer">Math <ExternalLink size={13} /></a>
          <a href="https://satsuite.collegeboard.org/psat-8-9/whats-on-the-test/structure" target="_blank" rel="noreferrer">Test structure <ExternalLink size={13} /></a>
        </nav>
      </section>
    </>
  )
}
