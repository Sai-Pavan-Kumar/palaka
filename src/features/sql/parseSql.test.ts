import { describe, expect, it } from 'vitest'
import { parseSql } from './parseSql'

const POSTGRES = `
-- Orders schema
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

/* one user, many orders */
CREATE TABLE "orders" (
  "id" BIGSERIAL PRIMARY KEY,
  "user_id" INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total NUMERIC(10, 2) DEFAULT 0
);
CREATE INDEX orders_user_idx ON orders (user_id);
`

describe('parseSql', () => {
  it('reads Postgres tables, types, keys and inline references', () => {
    const { tables, skipped, errors } = parseSql(POSTGRES)
    expect(errors).toEqual([])
    expect(skipped).toEqual(['CREATE INDEX orders_user_idx'])
    expect(tables.map((t) => t.name)).toEqual(['users', 'orders'])
    const [users, orders] = tables
    expect(users.columns[0]).toMatchObject({
      name: 'id',
      type: 'SERIAL',
      pk: true,
    })
    expect(users.columns[1]).toMatchObject({
      name: 'email',
      type: 'VARCHAR(255)',
      notNull: true,
      unique: true,
    })
    expect(users.columns[2].type).toBe('TIMESTAMP WITH TIME ZONE')
    expect(orders.columns[1].fk).toEqual({ table: 'users', column: 'id' })
    expect(orders.columns[2].type).toBe('NUMERIC(10, 2)')
  })

  it('reads MySQL table-level keys and backtick names', () => {
    const { tables, errors } = parseSql(`
      CREATE TABLE \`order_items\` (
        \`order_id\` int NOT NULL,
        \`product_id\` int NOT NULL,
        \`qty\` int DEFAULT 1,
        PRIMARY KEY (\`order_id\`, \`product_id\`),
        KEY idx_product (\`product_id\`),
        CONSTRAINT fk_order FOREIGN KEY (\`order_id\`) REFERENCES \`orders\` (\`id\`)
      ) ENGINE=InnoDB;`)
    expect(errors).toEqual([])
    const [items] = tables
    expect(items.columns.filter((c) => c.pk).map((c) => c.name)).toEqual([
      'order_id',
      'product_id',
    ])
    expect(items.columns[0].fk).toEqual({ table: 'orders', column: 'id' })
    expect(items.columns[1].fk).toBeUndefined()
  })

  it('points a bare REFERENCES at the parent primary key', () => {
    const { tables } = parseSql(`
      CREATE TABLE teams (team_key TEXT PRIMARY KEY);
      CREATE TABLE players (id INTEGER PRIMARY KEY, team TEXT REFERENCES teams);`)
    expect(tables[1].columns[1].fk).toEqual({
      table: 'teams',
      column: 'team_key',
    })
  })

  it('handles self references and composite foreign keys', () => {
    const { tables } = parseSql(`
      CREATE TABLE employees (
        id INT PRIMARY KEY,
        manager_id INT REFERENCES employees(id)
      );
      CREATE TABLE shipments (
        order_id INT, line_no INT,
        FOREIGN KEY (order_id, line_no) REFERENCES order_lines (order_id, line_no)
      );`)
    expect(tables[0].columns[1].fk).toEqual({
      table: 'employees',
      column: 'id',
    })
    expect(tables[1].columns.map((c) => c.fk?.column)).toEqual([
      'order_id',
      'line_no',
    ])
  })

  it('ignores semicolons and commas inside strings and comments', () => {
    const { tables, errors } = parseSql(`
      CREATE TABLE notes (
        body TEXT DEFAULT 'a; b, c', -- trailing; comment, here
        kind TEXT
      );`)
    expect(errors).toEqual([])
    expect(tables[0].columns.map((c) => c.name)).toEqual(['body', 'kind'])
  })

  it('reports broken tables without dropping the good ones', () => {
    const { tables, errors } = parseSql(`
      CREATE TABLE good (id INT);
      CREATE TABLE broken (id INT;
      CREATE TABLE empty ();`)
    expect(tables.map((t) => t.name)).toEqual(['good'])
    expect(errors).toHaveLength(2)
  })

  it('returns nothing for empty input', () => {
    expect(parseSql('  \n -- just a comment\n')).toEqual({
      tables: [],
      highlights: [],
      queries: [],
      mutations: [],
      skipped: [],
      errors: [],
    })
  })

  it('fills sample rows from INSERT in column order', () => {
    const { tables, errors } = parseSql(`
      CREATE TABLE users (id INT PRIMARY KEY, name TEXT, city TEXT);
      INSERT INTO users VALUES (1, 'Asha', 'Hyderabad'), (2, 'Ravi', NULL);
      INSERT INTO users (city, id) VALUES ('Vizag', 3);
      INSERT INTO users (id, name) VALUES (4, 'It''s me');`)
    expect(errors).toEqual([])
    expect(tables[0].rows).toEqual([
      ['1', 'Asha', 'Hyderabad'],
      ['2', 'Ravi', null],
      ['3', null, 'Vizag'],
      ['4', "It's me", null],
    ])
  })

  it('reports INSERTs it cannot place', () => {
    const { errors } = parseSql(`
      CREATE TABLE t (a INT, b INT);
      INSERT INTO t VALUES (1);
      INSERT INTO missing VALUES (1);`)
    expect(errors).toHaveLength(2)
  })

  it('reads highlight comments as steps', () => {
    const { highlights, errors } = parseSql(`
      -- highlight orders.user_id -> users.id
      -- highlight users.email, users.id
      -- highlight nonsense here`)
    expect(highlights).toEqual([
      [
        { table: 'orders', column: 'user_id' },
        { table: 'users', column: 'id' },
      ],
      [
        { table: 'users', column: 'email' },
        { table: 'users', column: 'id' },
      ],
    ])
    expect(errors).toHaveLength(1)
  })

  it('collects UPDATE and DELETE statements as mutations', () => {
    const { mutations, errors } = parseSql(`
      CREATE TABLE users (id INT PRIMARY KEY, name TEXT);
      INSERT INTO users VALUES (1, 'Alice');
      UPDATE users SET name = 'Alicia' WHERE id = 1;
      DELETE FROM users WHERE id = 1;`)
    expect(errors).toEqual([])
    expect(mutations).toHaveLength(2)
    expect(mutations[0]).toContain("UPDATE users SET name = 'Alicia'")
    expect(mutations[1]).toContain('DELETE FROM users WHERE id = 1')
  })
})
