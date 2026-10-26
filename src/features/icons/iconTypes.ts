import type { LucideIcon } from 'lucide-react'
import type { BlockKind } from '../engine/model/types'

type IconBase = {
  // "aws:<name>" or "si:<slug>"; stored on the block, so never renamed.
  id: string
  label: string
  group: string
  // Decides the simulation behaviour and the fallback icon.
  kind: BlockKind
  keywords: string
}

// Full-colour AWS service icon, used exactly as AWS ships it.
export type AwsIcon = IconBase & { svg: string }

// One-path brand logo on a 24-unit grid, in the brand's own colour.
export type BrandIcon = IconBase & { path: string; hex: string }

// Everyday line icon for analogies; drawn in the block's ink colour.
export type RealWorldIcon = IconBase & { Icon: LucideIcon }

export type LibraryIcon = AwsIcon | BrandIcon | RealWorldIcon
