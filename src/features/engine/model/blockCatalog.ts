import type { BlockKind, Page, Shape } from './types'

export type BlockGroup = {
  name: string
  kinds: BlockKind[]
}

// The default label a new block is born with. The teacher can rename any
// block on the board ("Orders DB"), so these are just good first words.
export const BLOCK_NAMES: Record<BlockKind, string> = {
  user: 'User',
  browser: 'Browser',
  mobile: 'Mobile app',
  dns: 'DNS',
  cdn: 'CDN',
  loadBalancer: 'Load balancer',
  gateway: 'API gateway',
  rateLimiter: 'Rate limiter',
  service: 'Service',
  worker: 'Worker',
  function: 'Function',
  cluster: 'Cluster',
  sqlDb: 'SQL DB',
  noSqlDb: 'NoSQL DB',
  cache: 'Cache',
  storage: 'Object storage',
  search: 'Search',
  queue: 'Queue',
  pubSub: 'Pub/Sub',
  external: 'External API',
  auth: 'Auth',
  monitoring: 'Monitoring',
  custom: 'Block',
  desktop: 'Desktop app',
  iot: 'IoT device',
  admin: 'Admin',
  firewall: 'Firewall',
  reverseProxy: 'Reverse proxy',
  router: 'Router',
  webServer: 'Web server',
  container: 'Container',
  scheduler: 'Scheduler',
  cloud: 'Cloud',
  warehouse: 'Data warehouse',
  graphDb: 'Graph DB',
  timeSeriesDb: 'Time-series DB',
  replica: 'Replica',
  shard: 'Shard',
  fileSystem: 'File system',
  keyValue: 'Key-value store',
  vectorDb: 'Vector DB',
  eventBus: 'Event bus',
  stream: 'Stream',
  webhook: 'Webhook',
  notification: 'Notification',
  email: 'Email',
  sms: 'SMS',
  secrets: 'Secrets',
  certificate: 'Certificate',
  identity: 'Identity provider',
  logging: 'Logging',
  alerting: 'Alerting',
  tracing: 'Tracing',
  ciCd: 'CI/CD',
  config: 'Config',
  featureFlags: 'Feature flags',
  llm: 'LLM',
  mlModel: 'ML model',
  payment: 'Payment',
  analytics: 'Analytics',
  maps: 'Maps',
}

// Ordered the way a request travels: client → edge → compute → data.
export const BLOCK_GROUPS: BlockGroup[] = [
  {
    name: 'Clients',
    kinds: ['user', 'browser', 'mobile', 'desktop', 'iot', 'admin'],
  },
  {
    name: 'Edge',
    kinds: [
      'dns',
      'cdn',
      'loadBalancer',
      'gateway',
      'rateLimiter',
      'firewall',
      'reverseProxy',
      'router',
    ],
  },
  {
    name: 'Compute',
    kinds: [
      'service',
      'webServer',
      'worker',
      'function',
      'container',
      'cluster',
      'scheduler',
      'cloud',
    ],
  },
  {
    name: 'Data',
    kinds: [
      'sqlDb',
      'noSqlDb',
      'keyValue',
      'cache',
      'storage',
      'fileSystem',
      'search',
      'warehouse',
      'graphDb',
      'timeSeriesDb',
      'vectorDb',
      'replica',
      'shard',
    ],
  },
  {
    name: 'Messaging',
    kinds: [
      'queue',
      'pubSub',
      'eventBus',
      'stream',
      'webhook',
      'notification',
      'email',
      'sms',
    ],
  },
  { name: 'Security', kinds: ['auth', 'identity', 'secrets', 'certificate'] },
  {
    name: 'Ops',
    kinds: [
      'monitoring',
      'logging',
      'alerting',
      'tracing',
      'ciCd',
      'config',
      'featureFlags',
    ],
  },
  { name: 'AI', kinds: ['llm', 'mlModel'] },
  {
    name: 'Other',
    kinds: ['external', 'payment', 'analytics', 'maps', 'custom'],
  },
]

export const BLOCK_KINDS = new Set<BlockKind>(
  BLOCK_GROUPS.flatMap((group) => group.kinds),
)

// A click without a drag drops a block this size.
export const DEFAULT_BLOCK_SIZE = { w: 200, h: 160 }
// Smaller than this and the icon and label start to collide.
export const MIN_BLOCK_SIZE = { w: 96, h: 80 }
export const BLOCK_CORNER_RADIUS = 16

// A block kind this build does not know (a damaged or newer file) becomes a
// plain custom block, so the board still opens and keeps its label.
export function normalizeBlockKinds(page: Page): Page {
  const unknown = Object.values(page.shapes).filter(
    (shape) => shape.type === 'block' && !BLOCK_KINDS.has(shape.kind),
  )
  if (unknown.length === 0) return page
  const shapes = { ...page.shapes }
  for (const shape of unknown)
    shapes[shape.id] = { ...shape, kind: 'custom' } as Shape
  return { ...page, shapes }
}

// Product names people actually say on camera, so typing "redis" in the
// block search finds Cache. Generic blocks only; no brand logos.
const BLOCK_ALIASES: Partial<Record<BlockKind, string>> = {
  sqlDb: 'postgres mysql relational rdbms',
  noSqlDb: 'mongo mongodb dynamodb cassandra document',
  keyValue: 'redis dynamodb kv',
  cache: 'redis memcached',
  storage: 's3 blob bucket gcs',
  search: 'elasticsearch opensearch solr',
  queue: 'sqs rabbitmq',
  stream: 'kafka kinesis',
  pubSub: 'sns kafka topic',
  loadBalancer: 'lb nginx elb alb',
  reverseProxy: 'nginx envoy',
  gateway: 'api kong',
  function: 'lambda serverless',
  container: 'docker pod',
  cluster: 'kubernetes k8s',
  warehouse: 'snowflake bigquery redshift',
  graphDb: 'neo4j',
  vectorDb: 'pinecone embeddings',
  llm: 'gpt claude ai model',
  auth: 'login oauth jwt',
  identity: 'sso okta oauth',
  ciCd: 'github actions jenkins deploy',
  monitoring: 'prometheus grafana metrics',
  payment: 'stripe razorpay upi',
}

export function matchesBlockQuery(kind: BlockKind, query: string): boolean {
  const words = `${BLOCK_NAMES[kind]} ${kind} ${BLOCK_ALIASES[kind] ?? ''}`
  return words.toLowerCase().includes(query.trim().toLowerCase())
}
