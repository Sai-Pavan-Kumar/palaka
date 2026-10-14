import { useEffect } from 'react'
import { FolderOpen, ListOrdered } from 'lucide-react'
import { IconButton } from '../../shared/ui/IconButton'
import { listProjectAssets } from '../project/openProject'
import { useProjectStore } from '../project/projectStore'
import { RevealOrderList } from '../reveal/RevealOrderList'
import { useUiStore } from '../shell/uiStore'
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

export function LeftPanel() {
  const isOpen = useUiStore((s) => s.isLeftPanelOpen)
  const tab = useUiStore((s) => s.leftPanelTab)
  const toggleLeftPanel = useUiStore((s) => s.toggleLeftPanel)
  const folderName = useProjectStore((s) => s.project?.folderName)
  useRescanOnFocus()

  return (
    <aside className={`left-panel chrome ${isOpen ? 'is-open' : ''}`}>
      <nav className="left-panel__rail floating-bar" aria-label="Panels">
        <IconButton
          icon={FolderOpen}
          label="Folder images"
          tooltipSide="right"
          isActive={isOpen && tab === 'files'}
          onClick={() => toggleLeftPanel('files')}
        />
        <IconButton
          icon={ListOrdered}
          label="Reveal order"
          tooltipSide="right"
          isActive={isOpen && tab === 'order'}
          onClick={() => toggleLeftPanel('order')}
        />
      </nav>
      <section
        className="left-panel__sheet"
        aria-hidden={!isOpen}
        inert={!isOpen}
      >
        <header className="left-panel__header">
          <p className="menu-label">
            {tab === 'files' ? 'Folder' : 'Reveal order'}
          </p>
          <h2 className="left-panel__title">
            {tab === 'files' ? (folderName ?? 'No folder open') : 'This page'}
          </h2>
        </header>
        {tab === 'files' ? <AssetGrid /> : <RevealOrderList />}
      </section>
    </aside>
  )
}
