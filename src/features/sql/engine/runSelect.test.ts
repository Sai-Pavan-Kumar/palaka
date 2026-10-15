import { describe, expect, it } from 'vitest'
import { parseSelect } from './parseSelect'
import { runSelect, type SourceTable } from './runSelect'

const ORDERS: SourceTable = {
  name: 'orders',
  columns: ['id', 'user_id', 'total', 'city'],
  rows: [
    ['10', '1', '250', 'Hyderabad'],
    ['11', '1', '90', 'Vizag'],
    ['12', '3', '400', 'Hyderabad'],
    ['13', '2', null, 'Pune'],
  ],
}

const run = (sql: string) => runSelect(parseSelect(sql), ORDERS)

const USERS: SourceTable = {
  name: 'users',
  columns: ['id', 'name'],
  rows: [
    ['1', 'Alice'],
    ['2', 'Bob'],
    ['3', 'Charlie'],
    ['4', 'Devi'],
  ],
}

const ALL_TABLES = new Map<string, SourceTable>([
  ['orders', ORDERS],
  ['users', USERS],
])

const runWithTables = (sql: string) => {
  const query = parseSelect(sql)
  const primary = ALL_TABLES.get(query.table.toLowerCase())!
  return runSelect(query, primary, ALL_TABLES)
}

describe('runSelect', () => {
  it('filters with WHERE and records which rows fade', () => {
    const { stages, result } = run(
      "SELECT id, total FROM orders WHERE total > 100 AND city = 'Hyderabad'",
    )
    expect(stages.map((s) => s.label)).toEqual([
      "WHERE total > 100 AND city = 'Hyderabad'",
    ])
    expect(stages[0].rows.map((r) => r.dim)).toEqual([false, true, false, true])
    expect(result).toEqual({
      columns: ['id', 'total'],
      rows: [
        ['10', '250'],
        ['12', '400'],
      ],
    })
  })

  it('orders, limits and moves rows', () => {
    const { stages, result } = run(
      'SELECT * FROM orders WHERE total IS NOT NULL ORDER BY total DESC LIMIT 2',
    )
    expect(stages.map((s) => s.label.split(' ')[0])).toEqual([
      'WHERE',
      'ORDER',
      'LIMIT',
    ])
    expect(stages[1].rows.map((r) => r.pos)).toEqual([1, 2, 0, 3])
    expect(result.rows.map((r) => r[0])).toEqual(['12', '10'])
  })

  it('groups and aggregates', () => {
    const { stages, result } = run(
      'SELECT user_id, COUNT(*) AS orders, SUM(total) AS spent FROM orders GROUP BY user_id ORDER BY spent DESC',
    )
    expect(stages[0].label).toBe('GROUP BY user_id')
    expect(stages[0].rows.map((r) => r.group)).toEqual([0, 0, 1, 2])
    expect(result.columns).toEqual(['user_id', 'orders', 'spent'])
    expect(result.rows).toEqual([
      ['3', '1', '400'],
      ['1', '2', '340'],
      ['2', '1', null],
    ])
  })

  it('handles LIKE, IN and NOT', () => {
    expect(
      run("SELECT id FROM orders WHERE city LIKE 'H%'").result.rows,
    ).toEqual([['10'], ['12']])
    expect(
      run('SELECT id FROM orders WHERE NOT user_id IN (1, 2)').result.rows,
    ).toEqual([['12']])
  })

  it('performs INNER JOIN and syncs matching row states across both tables', () => {
    const { stages, result } = runWithTables(
      'SELECT u.name, o.id AS order_id, o.total FROM users u INNER JOIN orders o ON u.id = o.user_id',
    )
    expect(stages[0].label).toBe('INNER JOIN orders ON u.id = o.user_id')
    expect(stages[0].tableRows?.['users']?.map((r) => r.dim)).toEqual([
      false, // Alice (has orders 10, 11)
      false, // Bob (has order 13)
      false, // Charlie (has order 12)
      true, // Devi (no orders)
    ])
    expect(stages[0].tableRows?.['orders']?.map((r) => r.dim)).toEqual([
      false,
      false,
      false,
      false,
    ])
    expect(result.columns).toEqual(['name', 'order_id', 'total'])
    expect(result.rows).toEqual([
      ['Alice', '10', '250'],
      ['Alice', '11', '90'],
      ['Bob', '13', null],
      ['Charlie', '12', '400'],
    ])
  })

  it('performs LEFT JOIN preserving all left rows with nulls', () => {
    const { stages, result } = runWithTables(
      'SELECT u.name, o.total FROM users u LEFT JOIN orders o ON u.id = o.user_id',
    )
    expect(stages[0].tableRows?.['users']?.map((r) => r.dim)).toEqual([
      false,
      false,
      false,
      false, // Devi is kept in LEFT JOIN!
    ])
    expect(result.rows).toContainEqual(['Devi', null])
  })

  it('performs RIGHT JOIN and FULL JOIN correctly', () => {
    const rightRes = runWithTables(
      'SELECT u.name, o.city FROM users u RIGHT JOIN orders o ON u.id = o.user_id',
    )
    expect(rightRes.result.rows.length).toBe(4)

    const fullRes = runWithTables(
      'SELECT u.name, o.city FROM users u FULL JOIN orders o ON u.id = o.user_id',
    )
    // 4 matched/order rows + 1 unmatched user (Devi)
    expect(fullRes.result.rows.length).toBe(5)
    expect(fullRes.result.rows).toContainEqual(['Devi', null])
  })

  it('explains what it cannot do instead of guessing', () => {
    expect(() => parseSelect('SELECT * FROM orders, users')).toThrow(
      /Comma joins/,
    )
    expect(() => run('SELECT * FROM orders WHERE nope = 1')).toThrow(/nope/)
    expect(() => parseSelect('SELECT * FROM orders LIMIT ten')).toThrow(/LIMIT/)
  })
})
