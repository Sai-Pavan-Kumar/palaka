import { describe, expect, it } from 'vitest'
import { useFacecamStore } from './facecamStore'

describe('facecamStore', () => {
  it('cycles through sizes', () => {
    const store = useFacecamStore.getState()
    expect(store.size).toBe('m')

    store.cycleSize()
    expect(useFacecamStore.getState().size).toBe('l')

    store.cycleSize()
    expect(useFacecamStore.getState().size).toBe('s')

    store.cycleSize()
    expect(useFacecamStore.getState().size).toBe('m')
  })

  it('cycles shape between circle and rounded', () => {
    const store = useFacecamStore.getState()
    expect(store.shape).toBe('circle')

    store.cycleShape()
    expect(useFacecamStore.getState().shape).toBe('rounded')

    store.cycleShape()
    expect(useFacecamStore.getState().shape).toBe('circle')
  })

  it('toggles mirrored and updates position', () => {
    const store = useFacecamStore.getState()
    expect(store.mirrored).toBe(true)

    store.toggleMirrored()
    expect(useFacecamStore.getState().mirrored).toBe(false)

    store.setPos({ x: 300, y: 400 })
    expect(useFacecamStore.getState().pos).toEqual({ x: 300, y: 400 })

    store.closeCamera()
    expect(useFacecamStore.getState().isEnabled).toBe(false)
  })
})
