import { describe, expect, it } from 'vitest'
import type { TableShape } from '../../engine/model/types'
import { parseSelect } from '../engine/parseSelect'
import {
  parseDelete,
  parseInsertMutation,
  parseUpdate,
} from '../engine/parseMutation'
import {
  buildDeleteRow,
  buildHighlightColumn,
  buildInsertRow,
  buildJoinHighlight,
  buildJoinQuery,
  buildSelectAggregate,
  buildSelectAll,
  buildSelectOrderLimit,
  buildSelectWhere,
  buildUpdateRow,
  findRelation,
} from './sqlTemplates'

function makeTable(
  name: string,
  columns: {
    name: string
    type?: string
    pk?: boolean
    notNull?: boolean
    unique?: boolean
    fk?: { table: string; column: string }
  }[],
  rows: (string | null)[][],
): TableShape {
  return {
    id: name,
    type: 'table',
    x: 0,
    y: 0,
    scale: 1,
    name,
    columns: columns.map((c) => ({
      name: c.name,
      type: c.type ?? 'text',
      pk: c.pk ?? false,
      notNull: c.notNull ?? false,
      unique: c.unique ?? false,
      fk: c.fk,
    })),
    size: 'm',
    fill: 'tint',
    dash: 'clean',
    color: 'orange',
    opacity: 1,
    rows,
  }
}

const USERS = makeTable(
  'users',
  [
    { name: 'id', type: 'int', pk: true },
    { name: 'name', type: 'text' },
    { name: 'city', type: 'text' },
  ],
  [
    ['1', 'Alice', 'Hyderabad'],
    ['2', 'Bob', 'Vizag'],
  ],
)

const ORDERS = makeTable(
  'orders',
  [
    { name: 'id', type: 'int', pk: true },
    { name: 'user_id', type: 'int', fk: { table: 'users', column: 'id' } },
    { name: 'total', type: 'int' },
  ],
  [
    ['10', '1', '250'],
    ['11', '1', '90'],
  ],
)

describe('sqlTemplates', () => {
  it('builds valid SELECT queries for a single table', () => {
    const all = buildSelectAll(USERS)
    expect(all).toBe('SELECT * FROM users;')
    expect(() => parseSelect(all)).not.toThrow()

    const where = buildSelectWhere(USERS)
    expect(where).toContain('WHERE city =')
    expect(() => parseSelect(where)).not.toThrow()

    const orderLimit = buildSelectOrderLimit(ORDERS)
    expect(orderLimit).toContain('ORDER BY total DESC LIMIT 3')
    expect(() => parseSelect(orderLimit)).not.toThrow()

    const agg = buildSelectAggregate(ORDERS)
    expect(agg).toContain('GROUP BY user_id')
    expect(agg).toContain('COUNT(*) AS count')
    expect(() => parseSelect(agg)).not.toThrow()

    const highlight = buildHighlightColumn(USERS)
    expect(highlight).toBe('-- highlight users.id;')
  })

  it('builds valid mutations for a table', () => {
    const insert = buildInsertRow(USERS)
    expect(insert).toContain('INSERT INTO users VALUES (3,')
    expect(() => parseInsertMutation(insert)).not.toThrow()

    const update = buildUpdateRow(USERS)
    expect(update).toContain("UPDATE users SET name = 'Updated' WHERE id = 1")
    expect(() => parseUpdate(update)).not.toThrow()

    const del = buildDeleteRow(USERS)
    expect(del).toContain('DELETE FROM users WHERE id = 2')
    expect(() => parseDelete(del)).not.toThrow()
  })

  it('detects foreign key relations and builds JOIN queries', () => {
    const rel = findRelation(ORDERS, USERS)
    expect(rel.leftTable).toBe('users')
    expect(rel.rightTable).toBe('orders')
    expect(rel.condition).toBe('users.id = orders.user_id')

    const inner = buildJoinQuery(USERS, ORDERS, 'JOIN')
    expect(inner).toBe(
      'SELECT * FROM users JOIN orders ON users.id = orders.user_id;',
    )
    expect(() => parseSelect(inner)).not.toThrow()

    const left = buildJoinQuery(USERS, ORDERS, 'LEFT JOIN')
    expect(left).toContain('LEFT JOIN')
    expect(() => parseSelect(left)).not.toThrow()

    const joinHl = buildJoinHighlight(USERS, ORDERS)
    expect(joinHl).toBe('-- highlight orders.user_id -> users.id;')
  })
})
