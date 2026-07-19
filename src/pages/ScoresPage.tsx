import {
  AlertTriangle,
  ArrowUpRight,
  CheckCircle2,
  CircleGauge,
  Clock3,
  Flag,
  Goal,
  ListChecks,
  Target,
} from 'lucide-react'
import { useState } from 'react'
import { ScoreChart } from '../components/ScoreChart'
import { PageHeader, ProgressBar, StatCard } from '../components/ui'
import type { PracticeTest } from '../types/models'
import { formatDate, formatLongDate, statusKey } from '../utils/format'

export function ScoresPage({ tests, targetScore }: { tests: PracticeTest[]; targetScore: number }) {
  const [selectedTestId, setSelectedTestId] = useState(tests.at(-1)?.id ?? '')

  if (!tests.length) {
    return (
      <>
        <PageHeader
          eyebrow="Practice-test performance"
          title="Scores & full-test evidence"
          description="See the trend, inspect each test, and turn every missed question into a useful next action."
          action={<span className="goal-chip"><Target size={16} /> Target {targetScore}</span>}
        />
        <section className="panel empty-data-panel">
          <CircleGauge size={25} />
          <h2>No practice tests yet</h2>
          <p>The first score report will appear here after a parent administrator adds it.</p>
        </section>
      </>
    )
  }

  const selectedTest = tests.find((test) => test.id === selectedTestId) ?? tests.at(-1)!
  const firstTest = tests[0]
  const latestTest = tests.at(-1)!
  const scoreGain = latestTest.totalScore - firstTest.totalScore
  const testAccuracy = Math.round((selectedTest.totalCorrect / (selectedTest.totalCorrect + selectedTest.totalIncorrect)) * 100)

  return (
    <>
      <PageHeader
        eyebrow="Practice-test performance"
        title="Scores & full-test evidence"
        description="See the trend, inspect each test, and turn every missed question into a useful next action."
        action={<span className="goal-chip"><Target size={16} /> Target {targetScore}</span>}
      />

      <section className="stats-grid stats-grid--four">
        <StatCard label="Latest score" value={latestTest.totalScore} detail="Bluebook Practice 6" icon={CircleGauge} tone="violet" />
        <StatCard label="Total growth" value={`+${scoreGain}`} detail={`Since ${formatDate(firstTest.date)}`} icon={ArrowUpRight} tone="teal" />
        <StatCard label="Points to goal" value={targetScore - latestTest.totalScore} detail="Target: 1400" icon={Goal} tone="gold" />
        <StatCard label="Tests completed" value={tests.length} detail="Next test: Aug 8" icon={ListChecks} tone="blue" />
      </section>

      <section className="panel score-trend-panel">
        <div className="panel__header">
          <div>
            <span className="eyebrow">All practice tests</span>
            <h2>Total score trend</h2>
          </div>
          <div className="score-legend">
            <span><i className="dot dot--violet" /> Total score</span>
            <span><i className="goal-dash" /> Goal line</span>
          </div>
        </div>
        <ScoreChart tests={tests} target={targetScore} />
      </section>

      <div className="section-trends">
        <article className="panel mini-trend-panel">
          <div className="panel__header panel__header--compact">
            <div><span className="eyebrow">Section trend</span><h2>Reading & Writing</h2></div>
            <strong>{latestTest.readingWritingScore}</strong>
          </div>
          <ScoreChart tests={tests} compact section="reading-writing" target={targetScore} />
        </article>
        <article className="panel mini-trend-panel">
          <div className="panel__header panel__header--compact">
            <div><span className="eyebrow">Section trend</span><h2>Math</h2></div>
            <strong>{latestTest.mathScore}</strong>
          </div>
          <ScoreChart tests={tests} compact section="math" target={targetScore} />
        </article>
      </div>

      <section className="panel tests-panel">
        <div className="panel__header">
          <div><span className="eyebrow">History</span><h2>Practice-test records</h2></div>
          <span className="muted-caption">Select a test to inspect it</span>
        </div>
        <div className="test-table-wrap">
          <table className="test-table">
            <thead>
              <tr><th>Test</th><th>Date</th><th>Total</th><th>R&W</th><th>Math</th><th>Questions</th></tr>
            </thead>
            <tbody>
              {[...tests].reverse().map((test) => (
                <tr
                  key={test.id}
                  className={test.id === selectedTest.id ? 'test-row test-row--selected' : 'test-row'}
                  onClick={() => setSelectedTestId(test.id)}
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') setSelectedTestId(test.id)
                  }}
                >
                  <td><strong>{test.name}</strong>{test.id === latestTest.id && <span className="latest-chip">Latest</span>}</td>
                  <td>{formatDate(test.date, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                  <td><strong>{test.totalScore}</strong></td>
                  <td>{test.readingWritingScore}</td>
                  <td>{test.mathScore}</td>
                  <td><span className="correct-count">{test.totalCorrect} correct</span> · {test.totalIncorrect} missed</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="test-detail">
        <div className="test-detail__header">
          <div>
            <span className="eyebrow">Selected record · {formatLongDate(selectedTest.date)}</span>
            <h2>{selectedTest.name}</h2>
            {selectedTest.reliabilityNote && <p>{selectedTest.reliabilityNote}</p>}
          </div>
          <div className="test-detail__score"><span>Total</span><strong>{selectedTest.totalScore}</strong></div>
        </div>

        <div className="test-detail__stats">
          <div><span>R&W</span><strong>{selectedTest.readingWritingScore}</strong><small>{selectedTest.readingWritingCorrect}/{selectedTest.readingWritingCorrect + selectedTest.readingWritingIncorrect} correct</small></div>
          <div><span>Math</span><strong>{selectedTest.mathScore}</strong><small>{selectedTest.mathCorrect}/{selectedTest.mathCorrect + selectedTest.mathIncorrect} correct</small></div>
          <div><span>Accuracy</span><strong>{testAccuracy}%</strong><small>{selectedTest.totalCorrect} of {selectedTest.totalCorrect + selectedTest.totalIncorrect}</small></div>
          <div><span>Mistakes logged</span><strong>{selectedTest.mistakes.length}</strong><small>{selectedTest.mistakes.filter((mistake) => mistake.reviewed).length} reviewed</small></div>
        </div>

        {!!selectedTest.domainPerformance.length && (
          <div className="domain-performance">
            <div className="subsection-heading"><div><span className="eyebrow">Test evidence</span><h3>Domain performance</h3></div></div>
            <div className="domain-grid">
              {selectedTest.domainPerformance.map((domain) => {
                const accuracy = Math.round((domain.correct / domain.total) * 100)
                return (
                  <div className="domain-row" key={`${domain.section}-${domain.domain}`}>
                    <div><span>{domain.section === 'Reading & Writing' ? 'R&W' : 'Math'}</span><strong>{domain.domain}</strong></div>
                    <ProgressBar value={accuracy} tone={accuracy >= 80 ? 'teal' : accuracy >= 70 ? 'gold' : 'coral'} label={`${domain.domain} accuracy`} />
                    <span>{domain.correct}/{domain.total} · {accuracy}%</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {selectedTest.strategyMetrics && (
          <div className="strategy-metrics">
            <div className="subsection-heading"><div><span className="eyebrow">Test behavior</span><h3>Strategy check</h3></div></div>
            <div className="strategy-metrics__grid">
              <div className={selectedTest.strategyMetrics.blanks === 0 ? 'strategy-metric strategy-metric--good' : 'strategy-metric'}><CheckCircle2 size={18} /><span>Blanks</span><strong>{selectedTest.strategyMetrics.blanks}</strong></div>
              <div><Clock3 size={18} /><span>Pacing issues</span><strong>{selectedTest.strategyMetrics.pacingIssues}</strong></div>
              <div><Flag size={18} /><span>90-sec violations</span><strong>{selectedTest.strategyMetrics.ninetySecondViolations}</strong></div>
              <div><AlertTriangle size={18} /><span>Rushed</span><strong>{selectedTest.strategyMetrics.rushedQuestions}</strong></div>
              <div><Target size={18} /><span>Module 1</span><strong>{selectedTest.strategyMetrics.module1Accuracy}%</strong></div>
              <div><Target size={18} /><span>Module 2</span><strong>{selectedTest.strategyMetrics.module2Accuracy}%</strong></div>
            </div>
          </div>
        )}

        <div className="mistake-log">
          <div className="subsection-heading">
            <div><span className="eyebrow">Question-level review</span><h3>Mistake log</h3></div>
            <span>{selectedTest.mistakes.length} tracked</span>
          </div>
          {selectedTest.mistakes.length ? (
            <div className="mistake-list">
              {selectedTest.mistakes.map((mistake) => (
                <article className="mistake-card" key={mistake.id}>
                  <div className="mistake-card__question">Q{mistake.questionNumber}<small>Module {mistake.module}</small></div>
                  <div className="mistake-card__body">
                    <div className="mistake-card__topline">
                      <span className={`error-tag error-tag--${statusKey(mistake.classification)}`}>{mistake.classification}</span>
                      <span>{mistake.section} · {mistake.domain}</span>
                    </div>
                    <h4>{mistake.skillTopic}</h4>
                    {mistake.userNote && <p>“{mistake.userNote}”</p>}
                    <div className="follow-up"><ArrowUpRight size={14} /><span><strong>Follow up:</strong> {mistake.recommendedAction}</span></div>
                  </div>
                  <span className={mistake.reviewed ? 'review-state review-state--done' : 'review-state'}>{mistake.reviewed ? 'Reviewed' : 'Open'}</span>
                </article>
              ))}
            </div>
          ) : (
            <div className="no-detail">Question-level mistakes have not been entered for this demo record.</div>
          )}
        </div>
      </section>
    </>
  )
}
