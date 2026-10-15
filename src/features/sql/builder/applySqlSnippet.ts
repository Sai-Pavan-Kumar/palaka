import { useSessionStore } from '../../engine/sessionStore'
import { useNotesStore } from '../../notes/pageNotes'
import { useUiStore } from '../../shell/uiStore'
import { insertSqlTables } from '../insertTables'
import { parseSql } from '../parseSql'

export function applySqlSnippet(statement: string, title?: string): void {
  const { pageId } = useSessionStore.getState()
  const currentSql = useNotesStore.getState().sql[pageId] ?? ''
  const trimmed = currentSql.trim()
  const nextSql = trimmed ? `${trimmed}\n\n${statement}` : statement
  useNotesStore.getState().setSql(pageId, nextSql)
  const parsed = parseSql(nextSql)
  const result = insertSqlTables(parsed)
  if (result.errors.length > 0) {
    useUiStore.getState().showToast(result.errors[0], 'error')
  } else {
    useUiStore
      .getState()
      .showToast(
        title ? `Added: ${title}` : 'SQL statement added and animated',
        'success',
      )
  }
}
