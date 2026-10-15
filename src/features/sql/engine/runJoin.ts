import { compareValues, evaluate, type Row } from './expr'
import type { JoinType, SelectItem, SelectQuery } from './parseSelect'
import type { QueryRun, QueryStage, RowState, SourceTable } from './runSelect'

function makeRowDict(
  table: SourceTable,
  values: (string | null)[],
  alias?: string,
): Row {
  const dict: Row = {}
  table.columns.forEach((col, i) => {
    const val = values[i] ?? null
    const c = col.toLowerCase()
    dict[c] = val
    dict[`${table.name.toLowerCase()}.${c}`] = val
    if (alias) {
      dict[`${alias.toLowerCase()}.${c}`] = val
    }
  })
  return dict
}

function mergeDicts(
  leftCols: string[],
  rightCols: string[],
  left: Row | null,
  right: Row | null,
): Row {
  const merged: Row = {}
  const shared = new Set(
    leftCols
      .map((c) => c.toLowerCase())
      .filter((c) => rightCols.map((rc) => rc.toLowerCase()).includes(c)),
  )
  if (left) {
    for (const [k, v] of Object.entries(left)) {
      if (!shared.has(k) || k.includes('.')) merged[k] = v
    }
  }
  if (right) {
    for (const [k, v] of Object.entries(right)) {
      if (!shared.has(k) || k.includes('.')) merged[k] = v
    }
  }
  return merged
}

function computeMatches(
  leftTable: SourceTable,
  rightTable: SourceTable,
  leftAlias: string | undefined,
  rightAlias: string | undefined,
  onExpr: import('./expr').Expr,
) {
  const leftMatches: number[][] = leftTable.rows.map(() => [])
  const rightMatches: number[][] = rightTable.rows.map(() => [])

  leftTable.rows.forEach((lRow, i) => {
    const lDict = makeRowDict(leftTable, lRow, leftAlias)
    rightTable.rows.forEach((rRow, j) => {
      const rDict = makeRowDict(rightTable, rRow, rightAlias)
      const combined = mergeDicts(
        leftTable.columns,
        rightTable.columns,
        lDict,
        rDict,
      )
      if (evaluate(onExpr, combined)) {
        leftMatches[i].push(j)
        rightMatches[j].push(i)
      }
    })
  })
  return { leftMatches, rightMatches }
}

function assignGroups(
  leftCount: number,
  rightCount: number,
  leftMatches: number[][],
) {
  let nextGroup = 0
  const leftGroup: (number | null)[] = new Array(leftCount).fill(null)
  const rightGroup: (number | null)[] = new Array(rightCount).fill(null)

  for (let i = 0; i < leftCount; i++) {
    if (leftMatches[i].length > 0) {
      const grp = nextGroup++
      leftGroup[i] = grp
      for (const j of leftMatches[i]) {
        if (rightGroup[j] === null) {
          rightGroup[j] = grp
        }
      }
    }
  }
  return { leftGroup, rightGroup }
}

function computeDimming(
  type: JoinType,
  leftMatches: number[][],
  rightMatches: number[][],
) {
  const leftDim = leftMatches.map((matches) =>
    type === 'right' || type === 'inner' ? matches.length === 0 : false,
  )
  const rightDim = rightMatches.map((matches) =>
    type === 'left' || type === 'inner' ? matches.length === 0 : false,
  )
  return { leftDim, rightDim }
}

function buildJoinedRows(
  type: JoinType,
  leftTable: SourceTable,
  rightTable: SourceTable,
  leftAlias: string | undefined,
  rightAlias: string | undefined,
  leftMatches: number[][],
  rightMatches: number[][],
): Row[] {
  const joined: Row[] = []
  const leftEmpty = makeRowDict(
    leftTable,
    new Array(leftTable.columns.length).fill(null),
    leftAlias,
  )
  const rightEmpty = makeRowDict(
    rightTable,
    new Array(rightTable.columns.length).fill(null),
    rightAlias,
  )

  leftTable.rows.forEach((lRow, i) => {
    const lDict = makeRowDict(leftTable, lRow, leftAlias)
    if (leftMatches[i].length > 0) {
      for (const j of leftMatches[i]) {
        const rDict = makeRowDict(rightTable, rightTable.rows[j], rightAlias)
        joined.push(
          mergeDicts(leftTable.columns, rightTable.columns, lDict, rDict),
        )
      }
    } else if (type === 'left' || type === 'full') {
      joined.push(
        mergeDicts(leftTable.columns, rightTable.columns, lDict, rightEmpty),
      )
    }
  })

  if (type === 'right' || type === 'full') {
    rightTable.rows.forEach((rRow, j) => {
      if (rightMatches[j].length === 0) {
        const rDict = makeRowDict(rightTable, rRow, rightAlias)
        joined.push(
          mergeDicts(leftTable.columns, rightTable.columns, leftEmpty, rDict),
        )
      }
    })
  }
  return joined
}

function projectJoinedColumns(
  items: SelectItem[],
  leftTable: SourceTable,
  rightTable: SourceTable,
  leftAlias?: string,
  rightAlias?: string,
): string[] {
  if (items.some((it) => it.kind === 'all')) {
    const shared = new Set(
      leftTable.columns
        .map((c) => c.toLowerCase())
        .filter((c) =>
          rightTable.columns.map((rc) => rc.toLowerCase()).includes(c),
        ),
    )
    const leftPrefix = leftAlias ?? leftTable.name
    const rightPrefix = rightAlias ?? rightTable.name
    const cols: string[] = []
    for (const c of leftTable.columns) {
      cols.push(shared.has(c.toLowerCase()) ? `${leftPrefix}.${c}` : c)
    }
    for (const c of rightTable.columns) {
      cols.push(shared.has(c.toLowerCase()) ? `${rightPrefix}.${c}` : c)
    }
    return cols
  }
  return items.map((it) => (it.kind === 'all' ? '*' : it.label))
}

function projectJoinedRow(
  items: SelectItem[],
  row: Row,
  leftCols: string[],
  rightCols: string[],
): (string | null)[] {
  return items.flatMap((item) => {
    if (item.kind === 'all') {
      const vals: (string | null)[] = []
      for (const c of [...leftCols, ...rightCols]) {
        vals.push(row[c.toLowerCase()] ?? null)
      }
      return vals
    }
    if (item.kind === 'column') {
      return [row[item.column] ?? row[item.label.toLowerCase()] ?? null]
    }
    return [null]
  })
}

function createJoinStages(
  join: import('./parseSelect').JoinClause,
  leftTable: SourceTable,
  rightTable: SourceTable,
  leftRowStates: RowState[],
  rightRowStates: RowState[],
  whereText?: string,
): QueryStage[] {
  const joinLabel = `${join.type.toUpperCase()} JOIN ${join.table.name} ON ${join.text}`
  const tableRows = {
    [leftTable.name.toLowerCase()]: leftRowStates,
    [rightTable.name.toLowerCase()]: rightRowStates,
  }
  const stages: QueryStage[] = [
    { label: joinLabel, rows: leftRowStates, tableRows },
  ]
  if (whereText) {
    stages.push({ label: `WHERE ${whereText}`, rows: leftRowStates, tableRows })
  }
  return stages
}

function filterAndSortJoined(joined: Row[], query: SelectQuery): Row[] {
  let rows = joined
  if (query.where) {
    rows = rows.filter((r) => evaluate(query.where!, r))
  }
  if (query.orderBy.length > 0) {
    rows = [...rows].sort((a, b) => {
      for (const { column, desc } of query.orderBy) {
        const x = a[column] ?? ''
        const y = b[column] ?? ''
        const diff = compareValues(x, y)
        if (diff !== 0) return desc ? -diff : diff
      }
      return 0
    })
  }
  if (query.limit !== null) {
    rows = rows.slice(0, query.limit)
  }
  return rows
}

function computeTableStates(
  leftTable: SourceTable,
  rightTable: SourceTable,
  join: import('./parseSelect').JoinClause,
  leftMatches: number[][],
  rightMatches: number[][],
) {
  const { leftGroup, rightGroup } = assignGroups(
    leftTable.rows.length,
    rightTable.rows.length,
    leftMatches,
  )
  const { leftDim, rightDim } = computeDimming(
    join.type,
    leftMatches,
    rightMatches,
  )
  const leftRowStates = leftTable.rows.map((_, i) => ({
    dim: leftDim[i],
    group: leftGroup[i],
    pos: i,
  }))
  const rightRowStates = rightTable.rows.map((_, j) => ({
    dim: rightDim[j],
    group: rightGroup[j],
    pos: j,
  }))
  return { leftRowStates, rightRowStates }
}

function projectResults(
  query: SelectQuery,
  leftTable: SourceTable,
  rightTable: SourceTable,
  filtered: Row[],
) {
  const columns = projectJoinedColumns(
    query.items,
    leftTable,
    rightTable,
    query.from.alias,
    query.joins[0].table.alias,
  )
  const rows = filtered.map((row) =>
    projectJoinedRow(query.items, row, leftTable.columns, rightTable.columns),
  )
  return { columns, rows }
}

// Executes a multi-table JOIN query, producing synchronized row states for
// both source tables and generating the joined result dataset.
export function runJoin(
  query: SelectQuery,
  leftTable: SourceTable,
  tables: Map<string, SourceTable>,
): QueryRun {
  const join = query.joins[0]
  const rightTable = tables.get(join.table.name.toLowerCase())
  if (!rightTable) {
    throw new Error(`Table "${join.table.name}" not found on page`)
  }

  const { leftMatches, rightMatches } = computeMatches(
    leftTable,
    rightTable,
    query.from.alias,
    join.table.alias,
    join.on,
  )
  const { leftRowStates, rightRowStates } = computeTableStates(
    leftTable,
    rightTable,
    join,
    leftMatches,
    rightMatches,
  )

  const rawJoined = buildJoinedRows(
    join.type,
    leftTable,
    rightTable,
    query.from.alias,
    join.table.alias,
    leftMatches,
    rightMatches,
  )
  const filtered = filterAndSortJoined(rawJoined, query)
  return {
    stages: createJoinStages(
      join,
      leftTable,
      rightTable,
      leftRowStates,
      rightRowStates,
      query.where ? query.text.where : undefined,
    ),
    result: projectResults(query, leftTable, rightTable, filtered),
  }
}
