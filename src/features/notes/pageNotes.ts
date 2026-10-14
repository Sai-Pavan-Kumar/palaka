import type { Editor, TLPageId } from 'tldraw'

// Notes live in the page's own meta, so they save with the board in both
// modes (browser storage or folder) and follow a page when it is deleted.
// Edits skip undo history: Ctrl Z should undo drawing, not typing in notes.
export function getPageNote(editor: Editor, pageId: TLPageId): string {
  const note = editor.getPage(pageId)?.meta.notes
  return typeof note === 'string' ? note : ''
}

export function setPageNote(
  editor: Editor,
  pageId: TLPageId,
  text: string,
): void {
  const page = editor.getPage(pageId)
  if (!page) return
  editor.run(
    () =>
      editor.updatePage({ id: pageId, meta: { ...page.meta, notes: text } }),
    {
      history: 'ignore',
    },
  )
}

// Early builds kept notes in project.json; move them onto their pages once.
export function importLegacyNotes(
  editor: Editor,
  notes: Record<string, string>,
): void {
  for (const [pageId, text] of Object.entries(notes)) {
    const page = editor.getPage(pageId as TLPageId)
    if (page && text && !getPageNote(editor, page.id))
      setPageNote(editor, page.id, text)
  }
}
