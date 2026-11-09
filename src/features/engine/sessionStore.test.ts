import { describe, expect, it } from 'vitest'
import {
  setCameraFrame,
  setTool,
  toggleCameraFrame,
  useSessionStore,
} from './sessionStore'

describe('sessionStore setTool', () => {
  it('switches to the picked tool', () => {
    setTool('select')
    setTool('arrow')
    expect(useSessionStore.getState().tool).toBe('arrow')
  })

  it('keeps the tool when the active tool is picked again', () => {
    setTool('arrow')
    setTool('arrow')
    expect(useSessionStore.getState().tool).toBe('arrow')
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
