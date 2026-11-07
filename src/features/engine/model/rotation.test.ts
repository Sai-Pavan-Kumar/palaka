import { describe, expect, it } from 'vitest'
import { getShapeBounds, toShapeFrame } from './geometry'
import { hitTestShape } from './hitTest'
import { routeConnector, bindingAt, findBindTarget } from './connectors'
import { createEmptyDocument } from './documentOps'
import { rotatePoint } from './rotation'
import { createGeo, DEFAULT_STYLE } from './shapeFactory'
import {
  rotateShapeAround,
  scaleKeepingAnchor,
  scaleRotatedMember,
} from './transform'
import type { GeoShape, LineShape, Page } from './types'
import { snapAngle } from '../tools/rotateGesture'

// 200 wide, 100 tall, centred on (200, 150). Unfilled, then filled per test.
function box(rotation = 0): GeoShape {
  const area = { x: 100, y: 100, w: 200, h: 100 }
  const shape = createGeo('rectangle', area, DEFAULT_STYLE)
  return { ...shape, fill: 'solid', rotation }
}

describe('rotated geometry', () => {
  it('rotatePoint turns clockwise on screen', () => {
    const turned = rotatePoint({ x: 1, y: 0 }, { x: 0, y: 0 }, 90)
    expect(turned.x).toBeCloseTo(0)
    expect(turned.y).toBeCloseTo(1)
  })

  it('board bounds swap width and height at 90 degrees', () => {
    const bounds = getShapeBounds(box(90))
    const padding = (bounds.maxY - bounds.minY - 200) / 2
    expect(bounds.minX + padding).toBeCloseTo(150)
    expect(bounds.maxX - padding).toBeCloseTo(250)
  })

  it('hit test follows the rotated shape', () => {
    // (200, 230) is below the upright box but inside it at 90 degrees.
    expect(hitTestShape(box(), 200, 230, 0)).toBe(false)
    expect(hitTestShape(box(90), 200, 230, 0)).toBe(true)
    // (280, 150) is the other way round.
    expect(hitTestShape(box(), 280, 150, 0)).toBe(true)
    expect(hitTestShape(box(90), 280, 150, 0)).toBe(false)
  })
})

describe('rotateShapeAround', () => {
  it('turns a shape in place around its own centre', () => {
    const turned = rotateShapeAround(box(), { x: 200, y: 150 }, 30) as GeoShape
    expect(turned.rotation).toBe(30)
    expect(turned.x).toBeCloseTo(100)
    expect(turned.y).toBeCloseTo(100)
  })

  it('orbits a group member around the group centre', () => {
    const turned = rotateShapeAround(box(), { x: 0, y: 150 }, 90) as GeoShape
    expect(turned.rotation).toBe(90)
    expect(turned.x + turned.w / 2).toBeCloseTo(0)
    expect(turned.y + turned.h / 2).toBeCloseTo(350)
  })

  it('moves line ends instead of storing an angle', () => {
    const line = {
      type: 'line',
      x1: 0,
      y1: 0,
      x2: 100,
      y2: 0,
    } as LineShape
    const turned = rotateShapeAround(line, { x: 50, y: 0 }, 90) as LineShape
    expect(turned.rotation).toBeUndefined()
    expect(turned.x1).toBeCloseTo(50)
    expect(turned.y1).toBeCloseTo(-50)
    expect(turned.y2).toBeCloseTo(50)
  })
})

describe('resizing rotated shapes', () => {
  const corner = (shape: GeoShape) =>
    rotatePoint(
      { x: 100, y: 100 },
      { x: shape.x + shape.w / 2, y: shape.y + shape.h / 2 },
      shape.rotation ?? 0,
    )

  it('keeps the anchored corner still on the board', () => {
    const shape = box(40)
    const before = corner(shape)
    const scaled = scaleKeepingAnchor(shape, {
      originX: 100,
      originY: 100,
      scaleX: 2,
      scaleY: 1.5,
    }) as GeoShape
    expect(scaled.w).toBeCloseTo(400)
    const after = rotatePoint(
      { x: scaled.x, y: scaled.y },
      { x: scaled.x + scaled.w / 2, y: scaled.y + scaled.h / 2 },
      40,
    )
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
  })

  it('moves a group member by its centre and keeps its angle', () => {
    const scaled = scaleRotatedMember(box(40), {
      originX: 0,
      originY: 0,
      scaleX: 2,
      scaleY: 2,
    }) as GeoShape
    expect(scaled.rotation).toBe(40)
    expect(scaled.w).toBeCloseTo(400)
    expect(scaled.x + scaled.w / 2).toBeCloseTo(400)
    expect(scaled.y + scaled.h / 2).toBeCloseTo(300)
  })
})

describe('connectors on rotated shapes', () => {
  function pageWith(target: GeoShape): Page {
    const page = createEmptyDocument().pages[0]
    return {
      ...page,
      shapes: { [target.id]: target },
      order: [target.id],
    }
  }

  it('finds a rotated target where it is drawn', () => {
    const shape = box(90)
    const page = pageWith(shape)
    expect(findBindTarget(page, { x: 200, y: 230 })?.id).toBe(shape.id)
    expect(findBindTarget(page, { x: 280, y: 150 })).toBeNull()
  })

  it('pins an anchor that turns with the shape', () => {
    const shape = box(90)
    const spot = rotatePoint({ x: 300, y: 150 }, { x: 200, y: 150 }, 90)
    const binding = bindingAt(shape, spot)
    expect(binding.anchor).toEqual({ x: 1, y: 0.5 })
    const line = {
      type: 'line',
      x1: 0,
      y1: 0,
      x2: 0,
      y2: 0,
      endBinding: binding,
    } as LineShape
    const routed = routeConnector(pageWith(shape), line)
    expect(routed.x2).toBeCloseTo(200)
    expect(routed.y2).toBeGreaterThan(250)
  })

  it('stops at the rotated outline when aiming at the centre', () => {
    const shape = box(90)
    const line = {
      type: 'line',
      x1: 200,
      y1: 500,
      x2: 0,
      y2: 0,
      endBinding: { shapeId: shape.id },
    } as LineShape
    const routed = routeConnector(pageWith(shape), line)
    expect(routed.x2).toBeCloseTo(200)
    expect(routed.y2).toBeGreaterThan(250)
    expect(routed.y2).toBeLessThan(270)
  })
})

describe('toShapeFrame', () => {
  it('undoes the shape rotation', () => {
    const local = toShapeFrame(box(90), { x: 200, y: 250 })
    expect(local.x).toBeCloseTo(300)
    expect(local.y).toBeCloseTo(150)
  })
})

describe('snapAngle', () => {
  it('clicks onto right angles when close', () => {
    expect(snapAngle(2, false)).toBe(0)
    expect(snapAngle(88, false)).toBe(90)
    expect(snapAngle(20, false)).toBe(20)
  })

  it('moves in 15 degree steps with Shift', () => {
    expect(snapAngle(22, true)).toBe(15)
    expect(snapAngle(23, true)).toBe(30)
  })
})
