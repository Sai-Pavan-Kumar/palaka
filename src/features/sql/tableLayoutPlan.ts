import type { SqlTable } from './parseSql'

// Columns of tables left to right: parents first, then the tables that
// point at them. A viewer reads the schema the way the data depends on it.
export function getDependencyLevels(tables: SqlTable[]): Map<string, number> {
  const byName = new Map(tables.map((t) => [t.name.toLowerCase(), t]))
  const levels = new Map<string, number>()

  const levelOf = (table: SqlTable, visiting: Set<string>): number => {
    const key = table.name.toLowerCase()
    const known = levels.get(key)
    if (known !== undefined) return known
    // A cycle (a → b → a) cannot be ordered; stop it at this table.
    if (visiting.has(key)) return 0
    visiting.add(key)
    let level = 0
    for (const column of table.columns) {
      const parentKey = column.fk?.table.toLowerCase()
      const parent = parentKey && parentKey !== key && byName.get(parentKey)
      if (parent) level = Math.max(level, levelOf(parent, visiting) + 1)
    }
    visiting.delete(key)
    levels.set(key, level)
    return level
  }

  for (const table of tables) levelOf(table, new Set())
  return levels
}
