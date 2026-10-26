import { LayoutTemplate } from 'lucide-react'
import { DIAGRAM_TEMPLATES } from './diagramTemplates'
import { insertTemplate } from './insertTemplate'

// Ready-wired diagrams at the top of the block menu: one click, then edit.
// Hidden while searching, since a search is for a single block.
export function TemplateList({
  query,
  onDone,
}: {
  query: string
  onDone: () => void
}) {
  if (query.trim()) return null
  return (
    <section className="block-menu__group">
      <p className="menu-label">Templates</p>
      <div className="block-menu__templates">
        {DIAGRAM_TEMPLATES.map((template) => (
          <button
            key={template.id}
            type="button"
            className="menu-item block-menu__template"
            title={template.teaches}
            onClick={() => {
              insertTemplate(template)
              onDone()
            }}
          >
            <LayoutTemplate size={18} strokeWidth={1.75} aria-hidden />
            <span className="block-menu__template-text">
              <span>{template.name}</span>
              <span className="block-menu__template-hint">
                {template.teaches}
              </span>
            </span>
          </button>
        ))}
      </div>
    </section>
  )
}
