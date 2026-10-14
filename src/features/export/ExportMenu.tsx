import { useState } from 'react'
import { Download, FileArchive, FileImage, FileText, Save } from 'lucide-react'
import type { Editor } from 'tldraw'
import { IconButton } from '../../shared/ui/IconButton'
import { Popover } from '../../shared/ui/Popover'
import { useProjectStore } from '../project/projectStore'
import { saveBoardNow } from '../project/useAutosave'
import { useUiStore } from '../shell/uiStore'
import {
  exportAllPagesPdf,
  exportAllPagesZip,
  exportCurrentPagePng,
  exportCurrentPagePdf,
} from './exportActions'

type ExportMenuProps = {
  editor: Editor
  disabled: boolean
}

const EXPORT_ITEMS = [
  { label: 'This page as PNG', icon: FileImage, run: exportCurrentPagePng },
  { label: 'This page as PDF', icon: FileText, run: exportCurrentPagePdf },
  { label: 'All pages as PDF', icon: FileText, run: exportAllPagesPdf },
  { label: 'All pages as ZIP', icon: FileArchive, run: exportAllPagesZip },
] as const

type ExportAction = (editor: Editor) => Promise<string | void>

// Runs one export, tells the user where the file went, and blocks double runs.
function useExportRunner(editor: Editor) {
  const [isBusy, setIsBusy] = useState(false)
  const showToast = useUiStore((s) => s.showToast)

  const run = async (action: ExportAction, close: () => void) => {
    close()
    setIsBusy(true)
    try {
      const savedPath = await action(editor)
      showToast(savedPath ? `Saved ${savedPath}` : 'Project saved', 'success')
    } catch (error) {
      console.error('Export failed', error)
      showToast(
        error instanceof Error ? error.message : 'Export failed',
        'error',
      )
    } finally {
      setIsBusy(false)
    }
  }
  return { isBusy, run }
}

export function ExportMenu({ editor, disabled }: ExportMenuProps) {
  const { isBusy, run } = useExportRunner(editor)
  const hasFolder = useProjectStore((s) => s.project !== null)

  return (
    <Popover
      align="end"
      trigger={({ toggle }) => (
        <IconButton
          icon={Download}
          label={disabled ? 'Export (stop presenting first)' : 'Export'}
          disabled={disabled || isBusy}
          onClick={toggle}
        />
      )}
    >
      {(close) => (
        <>
          <p className="menu-label">
            {hasFolder ? 'Export to folder' : 'Download'}
          </p>
          {EXPORT_ITEMS.map((item) => (
            <button
              key={item.label}
              type="button"
              className="menu-item"
              onClick={() => void run(item.run, close)}
            >
              <item.icon size={18} strokeWidth={1.75} aria-hidden />
              {item.label}
            </button>
          ))}
          {hasFolder && (
            <button
              type="button"
              className="menu-item"
              onClick={() => void run(saveBoardNow, close)}
            >
              <Save size={18} strokeWidth={1.75} aria-hidden />
              Save to folder now
            </button>
          )}
        </>
      )}
    </Popover>
  )
}
