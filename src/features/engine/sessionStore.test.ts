import { describe, expect, it } from 'vitest'
import {
  setCameraFrame,
  setTool,
  toggleCameraFrame,
  toggleTool,
  useSessionStore,
} from './sessionStore'

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

describe('sessionStore camera frame', () => {
  it('updates active camera frame with setCameraFrame', () => {
    setCameraFrame(1)
    expect(useSessionStore.getState().activeFrame).toBe(1)
    setCameraFrame(0)
    expect(useSessionStore.getState().activeFrame).toBe(0)
  })

  it('cycles camera frames with toggleCameraFrame', () => {
    setCameraFrame(0)
    toggleCameraFrame(2)
    expect(useSessionStore.getState().activeFrame).toBe(1)
    toggleCameraFrame(2)
    expect(useSessionStore.getState().activeFrame).toBe(0)
  })
})
