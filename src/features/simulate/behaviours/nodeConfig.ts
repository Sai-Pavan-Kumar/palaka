import type { BlockKind, Shape } from '../../engine/model/types'
import type { BehaviourKind, NodeConfig } from '../simTypes'

const CLIENTS = new Set<BlockKind>([
  'user',
  'browser',
  'mobile',
  'desktop',
  'iot',
  'admin',
])

const BEHAVIOUR_BY_KIND: Partial<Record<BlockKind, BehaviourKind>> = {
  rateLimiter: 'limiter',
  loadBalancer: 'balancer',
  reverseProxy: 'balancer',
  cache: 'cache',
  cdn: 'cache',
  keyValue: 'cache',
  queue: 'queue',
  stream: 'queue',
  eventBus: 'pubsub',
  pubSub: 'pubsub',
  service: 'service',
  webServer: 'service',
  worker: 'service',
  function: 'service',
  container: 'service',
  cluster: 'service',
  llm: 'service',
  mlModel: 'service',
  external: 'service',
  payment: 'service',
  sqlDb: 'service',
  noSqlDb: 'service',
  graphDb: 'service',
  timeSeriesDb: 'service',
  vectorDb: 'service',
  warehouse: 'service',
  replica: 'service',
  search: 'service',
  storage: 'service',
  fileSystem: 'service',
}

// Databases and third parties answer slower than an in-house service, and
// a database takes fewer requests at once: that is why it overloads first.
const SLOW_KINDS = new Set<BlockKind>([
  'sqlDb',
  'noSqlDb',
  'graphDb',
  'timeSeriesDb',
  'vectorDb',
  'warehouse',
  'replica',
  'search',
  'storage',
  'fileSystem',
  'external',
  'payment',
  'llm',
  'mlModel',
])

const DEFAULTS: Omit<NodeConfig, 'behaviour'> = {
  rate: 5,
  hitRate: 0.7,
  capacity: 4,
  size: 12,
  serviceTime: 0.4,
}

function behaviourOf(shape: Shape): BehaviourKind {
  if (shape.type === 'block') {
    if (CLIENTS.has(shape.kind)) return 'source'
    return BEHAVIOUR_BY_KIND[shape.kind] ?? 'pass'
  }
  // A plain box labelled "Server" or a table is something that does work.
  return shape.type === 'image' ? 'pass' : 'service'
}

function slowOverrides(shape: Shape): Partial<NodeConfig> {
  const isSlow =
    shape.type === 'table' ||
    (shape.type === 'block' && SLOW_KINDS.has(shape.kind))
  return isSlow ? { capacity: 3, serviceTime: 0.6 } : {}
}

export function getNodeConfig(shape: Shape): NodeConfig {
  const behaviour = behaviourOf(shape)
  const sim = shape.type === 'block' ? shape.sim : undefined
  const base = { ...DEFAULTS, ...slowOverrides(shape) }
  // A queue drains slower than a limiter admits, so backlog is visible.
  if (behaviour === 'queue') base.rate = 2
  return {
    ...base,
    ...(sim?.rate !== undefined && { rate: sim.rate }),
    ...(sim?.hitRate !== undefined && { hitRate: sim.hitRate }),
    ...(sim?.capacity !== undefined && { capacity: sim.capacity }),
    ...(sim?.size !== undefined && { size: sim.size }),
    behaviour,
  }
}
