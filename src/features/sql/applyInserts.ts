import type { SqlInsert, SqlValue } from './parseInsert'
import type { SqlParseResult } from './parseSql'

// Puts each INSERT's rows into its table, in the table's column order;
// columns the INSERT did not name stay NULL. Rows for a table that has no
// CREATE TABLE in the same SQL cannot be drawn and are reported.
export function applyInserts(
  result: SqlParseResult,
  inserts: SqlInsert[],
): void {
  const byName = new Map(result.tables.map((t) => [t.name.toLowerCase(), t]))
  for (const insert of inserts) {
    const table = byName.get(insert.table.toLowerCase())
    if (!table) {
      result.errors.push(
        `INSERT INTO ${insert.table}: add its CREATE TABLE to this SQL.`,
      )
      continue
    }
    const names = insert.columns ?? table.columns.map((c) => c.name)
    const positions = table.columns.map((column) =>
      names.findIndex(
        (name) => name.toLowerCase() === column.name.toLowerCase(),
      ),
    )
    for (const values of insert.rows) {
      if (values.length !== names.length) {
        result.errors.push(
          `INSERT INTO ${insert.table}: a row has ${values.length} values for ${names.length} columns.`,
        )
        continue
      }
      table.rows.push(
        positions.map((index): SqlValue =>
          index === -1 ? null : values[index],
        ),
      )
    }
  }
}
