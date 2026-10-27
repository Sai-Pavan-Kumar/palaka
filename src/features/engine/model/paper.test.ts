import { describe, expect, it } from 'vitest'
import { getPalette, normalizePaper, PAPER_COLORS } from './paper'

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

  it('keeps brand blue exact on dark paper while blue turns light', () => {
    const dark = getPalette({
      pattern: 'plain',
      color: 'black',
      showBrand: true,
    })
    const light = getPalette({
      pattern: 'plain',
      color: 'white',
      showBrand: true,
    })
    expect(dark.ink.brand).toBe('#005ae0')
    expect(light.ink.brand).toBe('#005ae0')
    expect(dark.ink.blue).not.toBe('#005ae0')
  })
})
