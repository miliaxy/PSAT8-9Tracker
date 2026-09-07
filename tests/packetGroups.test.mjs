import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import ts from 'typescript'

const source = readFileSync(new URL('../src/utils/packetGroups.ts', import.meta.url), 'utf8')
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText
const { groupPacketTasks, packetSummary } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString('base64')}`)
const task = { title: 'R&W mixed packet — sample — 2 questions', category: 'Drill', section: 'Reading & Writing', resource: 'https://example.com/packet.pdf', minutes: 3, description: '• 1 Easy and 1 Medium' }
const list = [{ ...task, id: 'one' }, { ...task, id: 'two' }, { ...task, id: 'three', category: 'Review' }, { ...task, id: 'four' }]
const snapshot = JSON.stringify(list)
const groups = groupPacketTasks(list)
assert.deepEqual(groups.map((group) => group.map((entry) => entry.index)), [[0, 1], [2], [3]])
assert.equal(groups[0][0].task, list[0])
assert.equal(JSON.stringify(list), snapshot, 'Grouping must not modify task IDs or evidence')
assert.deepEqual(packetSummary(groups[0].map((entry) => entry.task)), { title: 'R&W mixed drill', minutes: 6, questions: 4, mix: '2 Easy + 2 Medium' })
assert.equal(groupPacketTasks([task, { ...task, resource: 'https://example.com/other.pdf' }]).length, 2)
assert.equal(groupPacketTasks([{ ...task, section: 'Math' }, { ...task, section: 'Math' }]).length, 2)
assert.equal(groupPacketTasks([{ ...task, resource: '' }, { ...task, resource: '' }]).length, 2)
assert.equal(packetSummary([{ ...task, description: 'Unspecified' }]).mix, null)
console.log('Packet grouping tests passed: identity, boundaries, scope, count, timing, difficulty.')
