import type { ReactNode } from 'react'
import { packetSummary, type PacketTask } from '../utils/packetGroups'

export function PacketGroup({ tasks, children, editing = false }: {
  tasks: PacketTask[]
  children: ReactNode
  editing?: boolean
}) {
  const summary = packetSummary(tasks)
  return (
    <section className="packet-group" aria-label={summary.title}>
      <h3>{summary.title} · {summary.questions ? `${summary.questions} questions · ` : ''}{summary.minutes} min</h3>
      <ul>
        {summary.mix && <li>{summary.mix}. No Hard questions until the mastery gate is met.</li>}
        <li>Open the packet. Use one continuous {summary.minutes}-minute timer.</li>
        <li>Mark guesses. Check answers only after finishing.</li>
        <li>Record each skill below, then complete the separate mistake review.</li>
      </ul>
      <a href={tasks[0].resource!} target="_blank" rel="noreferrer">Open question packet (new tab)</a>
      <details>
        <summary>{editing ? 'Edit instructions and skill result entries' : 'Results, notes & feedback by skill'}</summary>
        <div className="packet-group__entries">{children}</div>
      </details>
    </section>
  )
}
