import { ChevronRight, LayoutTemplate } from 'lucide-react'
import { useState } from 'react'
import { DIAGRAM_TEMPLATES, type DiagramTemplate } from './diagramTemplates'
import { insertTemplate } from './insertTemplate'

function matches(template: DiagramTemplate, query: string): boolean {
  const q = query.trim().toLowerCase()
  return `${template.name} ${template.teaches} ${template.category}`
    .toLowerCase()
    .includes(q)
}

function byCategory(templates: DiagramTemplate[]) {
  const groups = new Map<string, DiagramTemplate[]>()
  for (const template of templates) {
    groups.set(template.category, [
      ...(groups.get(template.category) ?? []),
      template,
    ])
  }
  return [...groups.entries()]
}

function TemplateButton({
  template,
  onDone,
}: {
  template: DiagramTemplate
  onDone: () => void
}) {
  return (
    <button
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
        <span className="block-menu__template-hint">{template.teaches}</span>
      </span>
    </button>
  )
}

// Ready-wired diagrams, folded away so the block list stays the first
// thing you see. A search opens it with only the matching templates.
export function TemplateList({
  query,
  onDone,
}: {
  query: string
  onDone: () => void
}) {
  const [isOpen, setOpen] = useState(false)
  const isSearching = query.trim() !== ''
  const shown = DIAGRAM_TEMPLATES.filter((t) => matches(t, query))
  if (isSearching && shown.length === 0) return null
  const expanded = isOpen || isSearching
  return (
    <section className="block-menu__group">
      <button
        type="button"
        className="block-menu__fold"
        aria-expanded={expanded}
        onClick={() => setOpen(!isOpen)}
      >
        <ChevronRight
          size={14}
          className={expanded ? 'is-open' : undefined}
          aria-hidden
        />
        Templates
        <span className="block-menu__count">{shown.length}</span>
      </button>
      {expanded &&
        byCategory(shown).map(([category, templates]) => (
          <div key={category} className="block-menu__templates">
            <p className="block-menu__subhead">{category}</p>
            {templates.map((template) => (
              <TemplateButton
                key={template.id}
                template={template}
                onDone={onDone}
              />
            ))}
          </div>
        ))}
    </section>
  )
}
