import { useEffect } from 'react'
import {
  CodeXml,
  FolderOpen,
  ListOrdered,
  Table2,
  type LucideIcon,
} from 'lucide-react'
import { IconButton } from '../../shared/ui/IconButton'
import { CodePanel } from '../codesim/panel/CodePanel'
import { listProjectAssets } from '../project/openProject'
import { useProjectStore } from '../project/projectStore'
import { RevealOrderList } from '../reveal/RevealOrderList'
import { SqlPanel } from '../sql/SqlPanel'
import { useUiStore, type LeftPanelTab } from '../shell/uiStore'
import { AssetGrid } from './AssetGrid'
import './leftPanel.css'

// Files dropped into the folder from another app appear when you come back
// to the tab, without a manual refresh.
function useRescanOnFocus() {
  useEffect(() => {
    const rescan = async () => {
      const root = useProjectStore.getState().project?.root
      if (!root) return
      try {
        useProjectStore.getState().setAssets(await listProjectAssets(root))
      } catch (error) {
        console.warn('Folder rescan failed', error)
      }
    }
    window.addEventListener('focus', rescan)
    return () => window.removeEventListener('focus', rescan)
  }, [])
}

type TabInfo = {
  id: LeftPanelTab
  icon: LucideIcon
  label: string
  kicker: string
}

const TABS: TabInfo[] = [
  { id: 'files', icon: FolderOpen, label: 'Folder images', kicker: 'Folder' },
  {
    id: 'order',
    icon: ListOrdered,
    label: 'Reveal order',
    kicker: 'Reveal order',
  },
  { id: 'sql', icon: Table2, label: 'Tables from SQL', kicker: 'Blueprint' },
  { id: 'code', icon: CodeXml, label: 'Code simulation', kicker: 'Code' },
]

function TabBody({ tab }: { tab: LeftPanelTab }) {
  if (tab === 'files') return <AssetGrid />
  if (tab === 'order') return <RevealOrderList />
  if (tab === 'code') return <CodePanel />
  return <SqlPanel />
}

function tabTitle(tab: LeftPanelTab, folderName?: string): string {
  if (tab === 'files') return folderName ?? 'No folder open'
  if (tab === 'order') return 'This page'
  if (tab === 'code') return 'Step through Python'
  return 'Tables from SQL'
}

export function LeftPanel() {
  const isOpen = useUiStore((s) => s.isLeftPanelOpen)
  const tab = useUiStore((s) => s.leftPanelTab)
  const toggleLeftPanel = useUiStore((s) => s.toggleLeftPanel)
  const folderName = useProjectStore((s) => s.project?.folderName)
  const info = TABS.find((t) => t.id === tab) ?? TABS[0]
  useRescanOnFocus()

  return (
    <aside className={`left-panel chrome ${isOpen ? 'is-open' : ''}`}>
      <nav className="left-panel__rail floating-bar" aria-label="Panels">
        {TABS.map((item) => (
          <IconButton
            key={item.id}
            icon={item.icon}
            label={item.label}
            tooltipSide="right"
            isActive={isOpen && tab === item.id}
            onClick={() => toggleLeftPanel(item.id)}
          />
        ))}
      </nav>
      <section
        className="left-panel__sheet"
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        <header className="left-panel__header">
          <p className="menu-label">{info.kicker}</p>
          <h2 className="left-panel__title">{tabTitle(tab, folderName)}</h2>
        </header>
        <TabBody tab={tab} />
      </section>
    </aside>
  )
}
