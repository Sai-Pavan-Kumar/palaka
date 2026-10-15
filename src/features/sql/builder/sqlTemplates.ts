import type { TableColumn, TableShape } from '../../engine/model/types'

export type TableRelation = {
  leftTable: string
  rightTable: string
  leftColumn: string
  rightColumn: string
  condition: string
}

function findExplicitFk(t1: TableShape, t2: TableShape): TableRelation | null {
  const fk1 = t1.columns.find(
    (c) => c.fk?.table.toLowerCase() === t2.name.toLowerCase(),
  )
  if (fk1?.fk) {
    return {
      leftTable: t2.name,
      rightTable: t1.name,
      leftColumn: fk1.fk.column,
      rightColumn: fk1.name,
      condition: `${t2.name}.${fk1.fk.column} = ${t1.name}.${fk1.name}`,
    }
  }
  const fk2 = t2.columns.find(
    (c) => c.fk?.table.toLowerCase() === t1.name.toLowerCase(),
  )
  if (fk2?.fk) {
    return {
      leftTable: t1.name,
      rightTable: t2.name,
      leftColumn: fk2.fk.column,
      rightColumn: fk2.name,
      condition: `${t1.name}.${fk2.fk.column} = ${t2.name}.${fk2.name}`,
    }
  }
  return null
}

function inferNameRelation(
  t1: TableShape,
  t2: TableShape,
): TableRelation | null {
  const t1Prefix = t1.name.toLowerCase().replace(/s$/, '')
  const t2Prefix = t2.name.toLowerCase().replace(/s$/, '')
  const colInT2 = t2.columns.find(
    (c) => c.name.toLowerCase() === `${t1Prefix}_id`,
  )
  if (colInT2) {
    return {
      leftTable: t1.name,
      rightTable: t2.name,
      leftColumn: 'id',
      rightColumn: colInT2.name,
      condition: `${t1.name}.id = ${t2.name}.${colInT2.name}`,
    }
  }
  const colInT1 = t1.columns.find(
    (c) => c.name.toLowerCase() === `${t2Prefix}_id`,
  )
  if (colInT1) {
    return {
      leftTable: t2.name,
      rightTable: t1.name,
      leftColumn: 'id',
      rightColumn: colInT1.name,
      condition: `${t2.name}.id = ${t1.name}.${colInT1.name}`,
    }
  }
  return null
}

export function findRelation(t1: TableShape, t2: TableShape): TableRelation {
  return (
    findExplicitFk(t1, t2) ??
    inferNameRelation(t1, t2) ?? {
      leftTable: t1.name,
      rightTable: t2.name,
      leftColumn: t1.columns[0]?.name ?? 'id',
      rightColumn: t2.columns[0]?.name ?? 'id',
      condition: `${t1.name}.${t1.columns[0]?.name ?? 'id'} = ${t2.name}.${t2.columns[0]?.name ?? 'id'}`,
    }
  )
}

export function buildSelectAll(table: TableShape): string {
  return `SELECT * FROM ${table.name};`
}

export function buildSelectWhere(table: TableShape): string {
  const numCol = table.columns.find((c) =>
    /^(total|amount|price|count|score|age|quantity)$/i.test(c.name),
  )
  if (numCol) {
    return `SELECT * FROM ${table.name} WHERE ${numCol.name} > 100;`
  }
  const textCol = table.columns.find(
    (c) => !c.pk && !c.fk && /^(city|status|role|category)$/i.test(c.name),
  )
  if (textCol && table.rows && table.rows.length > 0) {
    const idx = table.columns.indexOf(textCol)
    const val = table.rows[0]?.[idx] ?? 'active'
    return `SELECT * FROM ${table.name} WHERE ${textCol.name} = '${val}';`
  }
  const firstCol = table.columns[0]?.name ?? 'id'
  return `SELECT * FROM ${table.name} WHERE ${firstCol} = 1;`
}

export function buildSelectOrderLimit(table: TableShape): string {
  const numCol =
    table.columns.find((c) =>
      /^(total|amount|price|score|quantity|age)$/i.test(c.name),
    ) ??
    table.columns.find((c) => /^(id)$/i.test(c.name)) ??
    table.columns[0]
  const col = numCol?.name ?? 'id'
  return `SELECT * FROM ${table.name} ORDER BY ${col} DESC LIMIT 3;`
}

export function buildSelectAggregate(table: TableShape): string {
  const groupCol =
    table.columns.find(
      (c) =>
        !c.pk &&
        /^(city|category|status|role|department|type|user_id)$/i.test(c.name),
    ) ??
    table.columns.find((c) => !c.pk && !c.fk) ??
    table.columns[0]
  const numCol = table.columns.find((c) =>
    /^(total|amount|price|score|salary|quantity)$/i.test(c.name),
  )
  const gName = groupCol?.name ?? 'id'
  if (numCol) {
    return `SELECT ${gName}, COUNT(*) AS count, SUM(${numCol.name}) AS total FROM ${table.name} GROUP BY ${gName};`
  }
  return `SELECT ${gName}, COUNT(*) AS count FROM ${table.name} GROUP BY ${gName};`
}

export function buildHighlightColumn(table: TableShape): string {
  const pkCol = table.columns.find((c) => c.pk)?.name ?? table.columns[0]?.name
  return `-- highlight ${table.name}.${pkCol};`
}

function nextSampleVal(
  col: TableColumn,
  rows: (string | null)[][],
  idx: number,
): string {
  if (col.pk) {
    const max = rows.reduce((m, r) => {
      const n = Number(r[idx])
      return !Number.isNaN(n) && n > m ? n : m
    }, 0)
    return String(max > 0 ? max + 1 : rows.length + 1)
  }
  if (col.type.toLowerCase().includes('int')) return '100'
  return "'Sample'"
}

export function buildInsertRow(table: TableShape): string {
  const rows = table.rows ?? []
  const values = table.columns.map((c, i) => nextSampleVal(c, rows, i))
  return `INSERT INTO ${table.name} VALUES (${values.join(', ')});`
}

export function buildUpdateRow(table: TableShape): string {
  const rows = table.rows ?? []
  const pkIdx = table.columns.findIndex((c) => c.pk)
  const pkCol = pkIdx !== -1 ? table.columns[pkIdx] : table.columns[0]
  const pkVal = rows[0]?.[pkIdx !== -1 ? pkIdx : 0] ?? '1'
  const updateIdx = table.columns.findIndex((c, i) => i !== pkIdx && !c.fk)
  const updateCol =
    updateIdx !== -1 ? table.columns[updateIdx] : (table.columns[1] ?? pkCol)
  const isNumeric = updateCol?.type.toLowerCase().includes('int')
  const newVal = isNumeric ? '999' : "'Updated'"
  return `UPDATE ${table.name} SET ${updateCol.name} = ${newVal} WHERE ${pkCol.name} = ${pkVal};`
}

export function buildDeleteRow(table: TableShape): string {
  const rows = table.rows ?? []
  const pkIdx = table.columns.findIndex((c) => c.pk)
  const pkCol = pkIdx !== -1 ? table.columns[pkIdx] : table.columns[0]
  const lastRow = rows[rows.length - 1]
  const pkVal = lastRow?.[pkIdx !== -1 ? pkIdx : 0] ?? '1'
  return `DELETE FROM ${table.name} WHERE ${pkCol.name} = ${pkVal};`
}

export function buildJoinQuery(
  t1: TableShape,
  t2: TableShape,
  joinType: 'JOIN' | 'LEFT JOIN' | 'RIGHT JOIN' | 'FULL JOIN',
): string {
  const rel = findRelation(t1, t2)
  return `SELECT * FROM ${rel.leftTable} ${joinType} ${rel.rightTable} ON ${rel.condition};`
}

export function buildJoinHighlight(t1: TableShape, t2: TableShape): string {
  const rel = findRelation(t1, t2)
  return `-- highlight ${rel.rightTable}.${rel.rightColumn} -> ${rel.leftTable}.${rel.leftColumn};`
}
