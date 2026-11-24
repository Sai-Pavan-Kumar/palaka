import { describe, expect, it } from 'vitest'
import { runScript } from '../engine/runScript'
import { layoutGraph } from './graphLayout'

const AREA = { left: 320, right: 1800, top: 220, bottom: 490 }

describe('graph labels', () => {
  it('folds a crowded commit into three labels and keeps HEAD', () => {
    const steps = runScript(
      'git init\ntouch a\ngit add .\ngit commit -m A\ngit tag v1\ngit branch one\ngit branch two\ngit branch three',
    )
    const { labels } = layoutGraph(steps.at(-1)!.state, AREA)
    expect(labels).toHaveLength(3)
    expect(labels.map((l) => l.text)).toEqual(['main', '+4 more', 'HEAD'])
    for (const label of labels) expect(label.y).toBeGreaterThan(90)
  })
})
