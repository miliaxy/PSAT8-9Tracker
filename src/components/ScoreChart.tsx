import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useId } from 'react'
import type { PracticeTest } from '../types/models'
import { formatDate } from '../utils/format'

interface ScoreChartProps {
  tests: PracticeTest[]
  compact?: boolean
  section?: 'total' | 'reading-writing' | 'math'
  target?: number
}

export function ScoreChart({ tests, compact = false, section = 'total', target = 1400 }: ScoreChartProps) {
  const descriptionId = useId()
  const data = tests.map((test) => ({
    date: formatDate(test.date, { month: 'short' }),
    Total: test.totalScore,
    'R&W': test.readingWritingScore,
    Math: test.mathScore,
  }))
  const isSection = section !== 'total'
  const goal = isSection ? target / 2 : target
  const seriesLabel = section === 'total' ? 'Total' : section === 'reading-writing' ? 'Reading & Writing' : 'Math'
  const values = tests.map((test) => section === 'total' ? test.totalScore : section === 'reading-writing' ? test.readingWritingScore : test.mathScore)
  const officialMinimum = isSection ? 120 : 240
  const officialMaximum = isSection ? 720 : 1440
  const observedMinimum = Math.min(...values, goal)
  const observedMaximum = Math.max(...values, goal)
  const step = isSection ? 50 : 100
  const domain = [
    Math.max(officialMinimum, Math.floor((observedMinimum - step) / step) * step),
    Math.min(officialMaximum, Math.ceil((observedMaximum + step) / step) * step),
  ]
  const firstValue = values[0]
  const latestValue = values.at(-1)
  const change = firstValue === undefined || latestValue === undefined ? 0 : latestValue - firstValue
  const summary = tests.length
    ? `${seriesLabel} scores across ${tests.length} practice ${tests.length === 1 ? 'test' : 'tests'}. Latest score ${latestValue}. ${change === 0 ? 'No change' : `${change > 0 ? 'Up' : 'Down'} ${Math.abs(change)} points`} from the first recorded test. Goal ${Math.round(goal)}.`
    : `No ${seriesLabel.toLowerCase()} practice-test scores recorded.`

  return (
    <div className={compact ? 'chart chart--compact' : 'chart'} role="group" aria-label={`${seriesLabel} score trend chart`} aria-describedby={descriptionId}>
      <p className="sr-only" id={descriptionId}>{summary}</p>
      <table className="sr-only">
        <caption>{seriesLabel} practice-test score data</caption>
        <thead><tr><th scope="col">Date</th><th scope="col">Score</th></tr></thead>
        <tbody>{tests.map((test, index) => <tr key={test.id}><td>{formatDate(test.date)}</td><td>{values[index]}</td></tr>)}</tbody>
      </table>
      <div className="chart__visual" aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 10, right: 12, left: compact ? -24 : -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#e8eaf1" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: '#77809a', fontSize: 11 }} />
          <YAxis domain={domain} tickLine={false} axisLine={false} tick={{ fill: '#9aa1b5', fontSize: 10 }} />
          <Tooltip
            contentStyle={{ border: '1px solid #e2e5ee', borderRadius: 12, boxShadow: '0 10px 30px rgba(25,35,66,.1)' }}
            labelStyle={{ color: '#17233f', fontWeight: 700 }}
          />
          <ReferenceLine y={goal} stroke="#e88955" strokeDasharray="5 5" label={compact ? undefined : { value: 'Goal', fill: '#c96d3f', fontSize: 11 }} />
          {section === 'total' && (
            <Line type="monotone" dataKey="Total" stroke="#635bdb" strokeWidth={3} dot={{ r: 4, fill: '#fff', strokeWidth: 3 }} activeDot={{ r: 6 }} />
          )}
          {section === 'reading-writing' && (
            <Line type="monotone" dataKey="R&W" stroke="#635bdb" strokeWidth={3} dot={{ r: 4, fill: '#fff', strokeWidth: 3 }} />
          )}
          {section === 'math' && (
            <Line type="monotone" dataKey="Math" stroke="#1f9d88" strokeWidth={3} dot={{ r: 4, fill: '#fff', strokeWidth: 3 }} />
          )}
          {!compact && section === 'total' && <Legend iconType="circle" />}
        </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
