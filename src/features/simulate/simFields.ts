import type { SimSettings } from '../engine/model/types'
import type { BehaviourKind, NodeConfig } from './simTypes'

export type Field = {
  key: keyof SimSettings & keyof NodeConfig
  label: string
  choices: number[]
  format?: (value: number) => string
}

const percent = (v: number) => `${Math.round(v * 100)}%`

const RETRIES: Field = {
  key: 'retries',
  label: 'Retries on failure',
  choices: [0, 1, 2, 3],
}

// Few, round numbers: picking "10/s" on camera beats typing into a field.
export const FIELDS: Partial<Record<BehaviourKind, Field[]>> = {
  source: [
    {
      key: 'writes',
      label: 'Writes',
      choices: [0, 0.1, 0.3, 1],
      format: percent,
    },
    RETRIES,
  ],
  limiter: [
    { key: 'rate', label: 'Allowed per second', choices: [2, 5, 10, 20] },
  ],
  cache: [
    {
      key: 'hitRate',
      label: 'Hit rate',
      choices: [0.5, 0.7, 0.9, 0.99],
      format: percent,
    },
  ],
  queue: [
    { key: 'size', label: 'Holds', choices: [5, 12, 25, 50] },
    { key: 'rate', label: 'Drains per second', choices: [1, 2, 5, 10] },
  ],
  service: [
    { key: 'capacity', label: 'Works on at once', choices: [1, 2, 4, 8] },
    {
      key: 'failRate',
      label: 'Fails',
      choices: [0, 0.2, 0.5, 1],
      format: percent,
    },
    RETRIES,
    {
      key: 'compensate',
      label: 'On failure, undo earlier steps (saga)',
      choices: [0, 1],
      format: (v) => (v ? 'Undo' : 'Off'),
    },
  ],
  replica: [
    { key: 'capacity', label: 'Works on at once', choices: [1, 2, 4, 8] },
  ],
  pass: [RETRIES],
}
