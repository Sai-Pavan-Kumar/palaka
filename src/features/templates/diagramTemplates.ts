import type { BlockKind, SimSettings } from '../engine/model/types'

export type TemplateNode = {
  key: string
  kind: BlockKind
  // Grid cell (column, row); the inserter turns it into slide pixels.
  at: [col: number, row: number]
  label?: string
  // Library icon id, e.g. "si:redis".
  icon?: string
  sim?: SimSettings
}

// Steps in the order a teacher would draw them while talking, so Present
// reveals the story left to right: node, the arrow into the next, node…
export type TemplateStep =
  { node: TemplateNode } | { edge: [from: string, to: string] }

export type DiagramTemplate = {
  id: string
  name: string
  // What the simulation shows when you press play on it.
  teaches: string
  steps: TemplateStep[]
}

const node = (n: TemplateNode): TemplateStep => ({ node: n })
const edge = (from: string, to: string): TemplateStep => ({ edge: [from, to] })

export const DIAGRAM_TEMPLATES: DiagramTemplate[] = [
  {
    id: 'rate-limit',
    name: 'Rate limiting',
    teaches: 'Raise traffic: extra requests get 429',
    steps: [
      node({ key: 'user', kind: 'user', at: [0, 1] }),
      edge('user', 'limiter'),
      node({
        key: 'limiter',
        kind: 'rateLimiter',
        at: [1, 1],
        sim: { rate: 5 },
      }),
      edge('limiter', 'api'),
      node({ key: 'api', kind: 'service', at: [2, 1], label: 'API' }),
      edge('api', 'db'),
      node({
        key: 'db',
        kind: 'sqlDb',
        at: [3, 1],
        label: 'Postgres',
        icon: 'si:postgresql',
      }),
    ],
  },
  {
    id: 'cache-aside',
    name: 'Cache-aside',
    teaches: 'Hits return fast, misses go to the database',
    steps: [
      node({ key: 'user', kind: 'user', at: [0, 1] }),
      edge('user', 'api'),
      node({ key: 'api', kind: 'service', at: [1, 1], label: 'API' }),
      edge('api', 'cache'),
      node({
        key: 'cache',
        kind: 'cache',
        at: [2, 0],
        label: 'Redis',
        icon: 'si:redis',
      }),
      edge('api', 'db'),
      node({
        key: 'db',
        kind: 'sqlDb',
        at: [2, 2],
        label: 'Postgres',
        icon: 'si:postgresql',
      }),
    ],
  },
  {
    id: 'load-balancing',
    name: 'Load balancing',
    teaches: 'Requests split evenly across servers',
    steps: [
      node({ key: 'user', kind: 'user', at: [0, 1] }),
      edge('user', 'lb'),
      node({ key: 'lb', kind: 'loadBalancer', at: [1, 1] }),
      edge('lb', 's1'),
      node({ key: 's1', kind: 'service', at: [2, 0], label: 'Server 1' }),
      edge('lb', 's2'),
      node({ key: 's2', kind: 'service', at: [2, 1], label: 'Server 2' }),
      edge('lb', 's3'),
      node({ key: 's3', kind: 'service', at: [2, 2], label: 'Server 3' }),
    ],
  },
  {
    id: 'queue-workers',
    name: 'Queue + workers',
    teaches: 'The API answers at once; workers drain the backlog',
    steps: [
      node({ key: 'user', kind: 'user', at: [0, 1] }),
      edge('user', 'api'),
      node({ key: 'api', kind: 'service', at: [1, 1], label: 'API' }),
      edge('api', 'queue'),
      node({ key: 'queue', kind: 'queue', at: [2, 1], label: 'Job queue' }),
      edge('queue', 'w1'),
      node({ key: 'w1', kind: 'worker', at: [3, 0], label: 'Worker 1' }),
      edge('queue', 'w2'),
      node({ key: 'w2', kind: 'worker', at: [3, 2], label: 'Worker 2' }),
    ],
  },
  {
    id: 'pub-sub',
    name: 'Pub/Sub fan-out',
    teaches: 'One event, a copy for every subscriber',
    steps: [
      node({ key: 'user', kind: 'user', at: [0, 1] }),
      edge('user', 'orders'),
      node({
        key: 'orders',
        kind: 'service',
        at: [1, 1],
        label: 'Order service',
      }),
      edge('orders', 'topic'),
      node({ key: 'topic', kind: 'pubSub', at: [2, 1], label: 'order.placed' }),
      edge('topic', 'email'),
      node({ key: 'email', kind: 'email', at: [3, 0], label: 'Email' }),
      edge('topic', 'sms'),
      node({ key: 'sms', kind: 'sms', at: [3, 1], label: 'SMS' }),
      edge('topic', 'analytics'),
      node({
        key: 'analytics',
        kind: 'analytics',
        at: [3, 2],
        label: 'Analytics',
      }),
    ],
  },
]
