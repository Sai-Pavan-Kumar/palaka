import { describe, expect, it } from 'vitest'
import { setTool, toggleTool, useSessionStore } from './sessionStore'

describe('sessionStore toggleTool', () => {
  it('switches tool when inactive', () => {
    setTool('select')
    expect(useSessionStore.getState().tool).toBe('select')

    toggleTool('arrow')
    expect(useSessionStore.getState().tool).toBe('arrow')
  })

  it('toggles back to select when active tool is clicked again', () => {
    setTool('arrow')
    expect(useSessionStore.getState().tool).toBe('arrow')

    toggleTool('arrow')
    expect(useSessionStore.getState().tool).toBe('select')
  })

  it('remains select when select is toggled', () => {
    setTool('select')
    toggleTool('select')
    expect(useSessionStore.getState().tool).toBe('select')
  })
})
