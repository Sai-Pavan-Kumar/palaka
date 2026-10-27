import { describe, expect, it } from 'vitest'
import { normalizePaper, PAPER_COLORS } from './paper'

describe('paper colours', () => {
  it('offers black in place of mist', () => {
    expect(Object.keys(PAPER_COLORS)).toEqual([
      'white',
      'cream',
      'black',
      'blueprint',
      'chalk',
    ])
  })

  it('opens boards saved on the removed Mist paper on White', () => {
    const paper = normalizePaper({
      pattern: 'dots',
      color: 'mist',
      showBrand: false,
    })
    expect(paper).toEqual({ pattern: 'dots', color: 'white', showBrand: false })
  })
})
