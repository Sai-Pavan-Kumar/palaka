import { PageRecordType, type Editor } from 'tldraw'

export function goToPageOffset(editor: Editor, offset: 1 | -1): void {
  const pages = editor.getPages()
  const index = pages.findIndex((page) => page.id === editor.getCurrentPageId())
  const target = pages[index + offset]
  if (target) editor.setCurrentPage(target.id)
}

export function addPageAfterCurrent(editor: Editor): void {
  const id = PageRecordType.createId()
  editor.markHistoryStoppingPoint('add page')
  editor.createPage({ id, name: `Page ${editor.getPages().length + 1}` })
  editor.setCurrentPage(id)
}

export function deleteCurrentPage(editor: Editor): void {
  if (editor.getPages().length <= 1) return
  editor.markHistoryStoppingPoint('delete page')
  editor.deletePage(editor.getCurrentPageId())
}
