import { commitCurrentPage, getCurrentPage } from './boardActions'
import { getShapesInOrder, replaceShapes } from './model/documentOps'
import type { Page, TableShape, TableView } from './model/types'
import { useSessionStore } from './sessionStore'

export function getSelectedTables(page: Page, selectedIds: string[]) {
  return getShapesInOrder(page, selectedIds).filter(
    (shape): shape is TableShape => shape.type === 'table',
  )
}

// Undoable like any style change; arrows re-aim because the size changes.
export function setTableView(view: TableView): void {
  const { selectedIds } = useSessionStore.getState()
  const tables = getSelectedTables(getCurrentPage(), selectedIds)
  if (tables.length === 0) return
  commitCurrentPage((page) =>
    replaceShapes(
      page,
      tables.map((table) => ({ ...table, view })),
    ),
  )
}
