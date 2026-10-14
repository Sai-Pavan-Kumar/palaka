import type { CSSProperties } from 'react'
import { getShapeBounds } from '../model/geometry'
import type { Shape } from '../model/types'
import {
  drawMaskId,
  getDrawDuration,
  getDrawPlan,
  MASK_MARGIN,
  MASK_REGION,
  MASK_WIDTH_FACTOR,
} from './drawOnPlan'

// A white band that grows along the drawing path. Whatever it covers shows;
// the rest of the shape stays hidden until the band reaches it.
export function DrawOnMask({ shape }: { shape: Shape }) {
  const plan = getDrawPlan(shape)
  const duration = getDrawDuration(shape)
  if (!plan || duration === null) return null
  const style = { '--draw-duration': `${duration}s` } as CSSProperties
  const bounds = getShapeBounds(shape)
  return (
    <mask
      id={drawMaskId(shape)}
      maskUnits="userSpaceOnUse"
      x={-MASK_REGION / 2}
      y={-MASK_REGION / 2}
      width={MASK_REGION}
      height={MASK_REGION}
    >
      {plan.kind === 'trace' ? (
        <path
          className="draw-on-path"
          style={style}
          d={plan.d}
          pathLength={1}
          fill="none"
          stroke="white"
          strokeWidth={plan.width * MASK_WIDTH_FACTOR + MASK_MARGIN}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : (
        <rect
          className="draw-on-wipe"
          style={style}
          x={bounds.minX - MASK_MARGIN}
          y={bounds.minY - MASK_MARGIN}
          width={bounds.maxX - bounds.minX + MASK_MARGIN * 2}
          height={bounds.maxY - bounds.minY + MASK_MARGIN * 2}
          fill="white"
        />
      )}
    </mask>
  )
}
