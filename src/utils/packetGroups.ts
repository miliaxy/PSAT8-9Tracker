import type { TaskCategory } from '../types/models'

export interface PacketTask {
  title: string
  category: TaskCategory
  section?: string | null
  resource?: string | null
  minutes: number
  description?: string
}

// Presentation-only grouping: original task IDs and skill-level results stay intact.
export function groupPacketTasks<T extends PacketTask>(tasks: T[]) {
  const groups: Array<Array<{ task: T; index: number }>> = []
  tasks.forEach((task, index) => {
    const previous = groups.at(-1)
    const first = previous?.[0].task
    const eligible = (item: PacketTask) => item.category === 'Drill'
      && item.section === 'Reading & Writing'
      && /mixed packet/i.test(item.title)
      && /^https:\/\//.test(item.resource ?? '')
    if (first && eligible(first) && eligible(task) && first.resource === task.resource) {
      previous!.push({ task, index })
    } else groups.push([{ task, index }])
  })
  return groups
}

export function packetSummary(tasks: PacketTask[]) {
  const counts = tasks.map((task) => Number(task.title.match(/(\d+)\s+questions?\b/i)?.[1] ?? 0))
  const questions = counts.every(Boolean) ? counts.reduce((total, count) => total + count, 0) : null
  const difficulty = ['Easy', 'Medium', 'Hard'].map((level) => ({
    level,
    count: tasks.reduce((total, task) => total + Number(task.description?.match(new RegExp(`(\\d+)\\s+${level}\\b`, 'i'))?.[1] ?? 0), 0),
  }))
  return {
    title: 'R&W mixed drill',
    minutes: tasks.reduce((total, task) => total + task.minutes, 0),
    questions,
    mix: difficulty.reduce((sum, item) => sum + item.count, 0) === questions
      ? difficulty.filter((item) => item.count).map((item) => `${item.count} ${item.level}`).join(' + ')
      : null,
  }
}
