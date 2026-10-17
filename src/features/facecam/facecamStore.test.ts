import { describe, expect, it, vi } from 'vitest'
import { describeCameraError, useFacecamStore } from './facecamStore'
import { useUiStore } from '../shell/uiStore'

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

  it('translates DOMException error types correctly', () => {
    const notAllowed = new DOMException('Permission denied', 'NotAllowedError')
    expect(describeCameraError(notAllowed)).toBe(
      'Camera access was blocked. Allow camera in browser settings.',
    )

    const notFound = new DOMException('No device', 'NotFoundError')
    expect(describeCameraError(notFound)).toBe(
      'No camera found on this device.',
    )

    const inUse = new DOMException('In use', 'NotReadableError')
    expect(describeCameraError(inUse)).toBe(
      'Camera is already in use by another application.',
    )

    const fallback = new Error('Generic failure')
    expect(describeCameraError(fallback)).toBe('Generic failure')
  })

  it('triggers error toast on camera permission denial', async () => {
    const originalMediaDevices = navigator.mediaDevices
    const mockGetUserMedia = vi
      .fn()
      .mockRejectedValue(
        new DOMException('Permission denied', 'NotAllowedError'),
      )

    Object.defineProperty(navigator, 'mediaDevices', {
      value: { getUserMedia: mockGetUserMedia },
      configurable: true,
    })

    try {
      await useFacecamStore.getState().toggleCamera()
      expect(useFacecamStore.getState().isEnabled).toBe(false)
      expect(useFacecamStore.getState().error).toBe(
        'Camera access was blocked. Allow camera in browser settings.',
      )
      expect(useUiStore.getState().toast).toEqual(
        expect.objectContaining({
          message:
            'Camera access was blocked. Allow camera in browser settings.',
          tone: 'error',
        }),
      )
    } finally {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: originalMediaDevices,
        configurable: true,
      })
    }
  })

  it('manages custom size with boundary clamping', () => {
    const store = useFacecamStore.getState()
    store.setCustomSize(200)
    expect(useFacecamStore.getState().customSize).toBe(200)

    // Clamps lower bound
    store.setCustomSize(50)
    expect(useFacecamStore.getState().customSize).toBe(120)

    // Clamps upper bound
    store.setCustomSize(1000)
    expect(useFacecamStore.getState().customSize).toBe(520)

    // cycleSize keeps customSize in sync
    store.cycleSize()
    const size = useFacecamStore.getState().size
    expect(useFacecamStore.getState().customSize).toBe(
      size === 's' ? 180 : size === 'm' ? 240 : 320,
    )
  })

  it('cycles and sets streamer visual effects', () => {
    const store = useFacecamStore.getState()
    store.setEffect('none')
    expect(useFacecamStore.getState().effect).toBe('none')

    store.cycleEffect()
    expect(useFacecamStore.getState().effect).toBe('studio-rim')

    store.cycleEffect()
    expect(useFacecamStore.getState().effect).toBe('pulse')

    store.cycleEffect()
    expect(useFacecamStore.getState().effect).toBe('none')

    store.setBannerText('Follow on X')
    expect(useFacecamStore.getState().bannerText).toBe('Follow on X')
  })

  it('toggles and manages social badge platform', () => {
    const store = useFacecamStore.getState()
    store.setBadgePlatform('youtube')
    expect(useFacecamStore.getState().badgePlatform).toBe('youtube')

    store.toggleBadgePlatform()
    expect(useFacecamStore.getState().badgePlatform).toBe('instagram')

    store.toggleBadgePlatform()
    expect(useFacecamStore.getState().badgePlatform).toBe('youtube')

    store.setBadgePlatform('instagram')
    expect(useFacecamStore.getState().badgePlatform).toBe('instagram')
  })
})
