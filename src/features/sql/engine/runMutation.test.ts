import { describe, expect, it } from 'vitest'
import type { TableShape } from '../../engine/model/types'
import { parseDelete, parseInsertMutation, parseUpdate } from './parseMutation'
import { runMutation } from './runMutation'

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
    { name: 'id', type: 'int', pk: true, notNull: true },
    { name: 'name', type: 'text', notNull: true },
  ],
  [
    ['1', 'Alice'],
    ['2', 'Bob'],
    ['3', 'Charlie'],
  ],
)

const ORDERS = makeTable(
  'orders',
  [
    { name: 'id', type: 'int', pk: true, notNull: true },
    {
      name: 'user_id',
      type: 'int',
      fk: { table: 'users', column: 'id' },
    },
    { name: 'total', type: 'int' },
    { name: 'city', type: 'text' },
  ],
  [
    ['10', '1', '250', 'Hyderabad'],
    ['11', '1', '90', 'Vizag'],
    ['12', '3', '400', 'Hyderabad'],
  ],
)

const ALL_TABLES = new Map<string, TableShape>([
  ['users', USERS],
  ['orders', ORDERS],
])

describe('runMutation', () => {
  it('updates matching rows with new values', () => {
    const mutation = parseUpdate(
      "UPDATE users SET name = 'Alicia' WHERE id = 1",
    )
    const run = runMutation(mutation, USERS, USERS.rows!, ALL_TABLES)

    expect(run.stages).toHaveLength(1)
    expect(run.stages[0].rows[0].values).toEqual(['1', 'Alicia'])
    expect(run.stages[0].rows[0].group).toBe(0)
    expect(run.stages[0].rows[1].values).toEqual(['2', 'Bob'])
    expect(run.stages[0].rows[1].group).toBeNull()

    expect(run.nextRows).toEqual([
      ['1', 'Alicia'],
      ['2', 'Bob'],
      ['3', 'Charlie'],
    ])
  })

  it('dims deleted rows and removes them from nextRows', () => {
    const mutation = parseDelete("DELETE FROM orders WHERE city = 'Hyderabad'")
    const run = runMutation(mutation, ORDERS, ORDERS.rows!, ALL_TABLES)

    expect(run.stages).toHaveLength(1)
    expect(run.stages[0].rows.map((r) => r.dim)).toEqual([true, false, true])
    expect(run.nextRows).toEqual([['11', '1', '90', 'Vizag']])
  })

  it('inserts a new row and marks it isNew', () => {
    const mutation = parseInsertMutation(
      "INSERT INTO users (id, name) VALUES (4, 'Devi')",
    )
    const run = runMutation(mutation, USERS, USERS.rows!, ALL_TABLES)

    expect(run.stages[0].rows).toHaveLength(4)
    const lastRow = run.stages[0].rows[3]
    expect(lastRow.isNew).toBe(true)
    expect(lastRow.values).toEqual(['4', 'Devi'])
    expect(lastRow.error).toBeUndefined()
    expect(run.nextRows).toHaveLength(4)
    expect(run.nextRows[3]).toEqual(['4', 'Devi'])
  })

  it('validates primary key uniqueness during insert', () => {
    const mutation = parseInsertMutation(
      "INSERT INTO users (id, name) VALUES (1, 'Duplicate')",
    )
    const run = runMutation(mutation, USERS, USERS.rows!, ALL_TABLES)

    const lastRow = run.stages[0].rows[3]
    expect(lastRow.error).toContain('Duplicate PK')
    // Rejected row is not added to nextRows
    expect(run.nextRows).toHaveLength(3)
  })

  it('validates NOT NULL constraints during insert', () => {
    const mutation = parseInsertMutation(
      'INSERT INTO users (id, name) VALUES (4, NULL)',
    )
    const run = runMutation(mutation, USERS, USERS.rows!, ALL_TABLES)

    const lastRow = run.stages[0].rows[3]
    expect(lastRow.error).toContain('NOT NULL failed: name')
    expect(run.nextRows).toHaveLength(3)
  })

  it('validates foreign key constraints against parent tables', () => {
    const badFk = parseInsertMutation(
      "INSERT INTO orders (id, user_id, total, city) VALUES (13, 99, 100, 'Pune')",
    )
    const badRun = runMutation(badFk, ORDERS, ORDERS.rows!, ALL_TABLES)
    expect(badRun.stages[0].rows[3].error).toContain(
      'FK error: user_id = 99 not in users',
    )
    expect(badRun.nextRows).toHaveLength(3)

    const goodFk = parseInsertMutation(
      "INSERT INTO orders (id, user_id, total, city) VALUES (13, 2, 100, 'Pune')",
    )
    const goodRun = runMutation(goodFk, ORDERS, ORDERS.rows!, ALL_TABLES)
    expect(goodRun.stages[0].rows[3].error).toBeUndefined()
    expect(goodRun.nextRows).toHaveLength(4)
  })
})
