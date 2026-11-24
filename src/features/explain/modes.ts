import type { ComponentType } from 'react'
import {
  Activity,
  CodeXml,
  GitBranch,
  Table2,
  type LucideIcon,
} from 'lucide-react'
import { CodePanel } from '../codesim/panel/CodePanel'
import { GitPanel } from '../gitsim/panel/GitPanel'
import { SimPanel } from '../simulate/SimPanel'
import { SqlPanel } from '../sql/SqlPanel'
import type { ExplainModeId } from './explainStore'

export type ExplainMode = {
  id: ExplainModeId
  label: string
  title: string
  icon: LucideIcon
  Body: ComponentType
}

// Each mode keeps its own input and engine; the shell only switches bodies.
export const EXPLAIN_MODES: ExplainMode[] = [
  {
    id: 'sql',
    label: 'SQL',
    title: 'Tables from SQL',
    icon: Table2,
    Body: SqlPanel,
  },
  {
    id: 'code',
    label: 'Code',
    title: 'Step through Python',
    icon: CodeXml,
    Body: CodePanel,
  },
  {
    id: 'system',
    label: 'System',
    title: 'Traffic through your diagram',
    icon: Activity,
    Body: SimPanel,
  },
  {
    id: 'git',
    label: 'Git',
    title: 'Git, step by step',
    icon: GitBranch,
    Body: GitPanel,
  },
]

export function findMode(id: ExplainModeId): ExplainMode {
  return EXPLAIN_MODES.find((mode) => mode.id === id) ?? EXPLAIN_MODES[0]
}
