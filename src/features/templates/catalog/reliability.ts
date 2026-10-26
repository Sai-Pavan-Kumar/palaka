import { defineTemplate as t } from '../defineTemplate'

const PG = { label: 'Postgres', icon: 'si:postgresql' }
const C = 'Reliability'

export const RELIABILITY = [
  t(
    C,
    'failover',
    'Redundancy & failover',
    'Simulate, select a server, take it down: traffic moves to the others',
    [
      ['user', 'user', 0, 1],
      ['lb', 'loadBalancer', 1, 1],
      ['s1', 'service', 2, 0, { label: 'Server A' }],
      ['s2', 'service', 2, 1, { label: 'Server B' }],
      ['s3', 'service', 2, 2, { label: 'Server C' }],
    ],
    [
      ['user', 'lb'],
      ['lb', 's1'],
      ['lb', 's2'],
      ['lb', 's3'],
    ],
  ),
  t(
    C,
    'no-redundancy',
    'Single point of failure',
    'Take the one server down and everything fails',
    [
      ['user', 'user', 0, 1],
      ['api', 'service', 1, 1, { label: 'Only server' }],
      ['db', 'sqlDb', 2, 1, PG],
    ],
    [
      ['user', 'api'],
      ['api', 'db'],
    ],
  ),
  t(
    C,
    'retries',
    'Retries',
    'A flaky payment fails 30% of calls; two retries hide most failures',
    [
      ['user', 'user', 0, 1],
      [
        'api',
        'service',
        1,
        1,
        { label: 'API', sim: { retries: 2, capacity: 8 } },
      ],
      [
        'pay',
        'payment',
        2,
        1,
        { label: 'Payment', sim: { failRate: 0.3, capacity: 8 } },
      ],
    ],
    [
      ['user', 'api'],
      ['api', 'pay'],
    ],
  ),
  t(
    C,
    'idempotency',
    'Idempotency & retries',
    'The client retries; an idempotency key makes the second charge a no-op',
    [
      ['user', 'mobile', 0, 1, { label: 'Client', sim: { retries: 2 } }],
      [
        'api',
        'service',
        1,
        1,
        { label: 'Payments API', sim: { failRate: 0.3, capacity: 8 } },
      ],
      [
        'keys',
        'keyValue',
        2,
        0,
        { label: 'Idempotency keys', icon: 'si:redis' },
      ],
      ['db', 'sqlDb', 2, 2, { label: 'Ledger' }],
    ],
    [
      ['user', 'api'],
      ['api', 'keys'],
      ['api', 'db'],
    ],
  ),
  t(
    C,
    'circuit-breaker',
    'Circuit breaker',
    'Take Payment down: after 3 failures the breaker opens and fails fast',
    [
      ['user', 'user', 0, 1],
      ['api', 'service', 1, 1, { label: 'Checkout' }],
      ['cb', 'circuitBreaker', 2, 1],
      ['pay', 'payment', 3, 1, { label: 'Payment' }],
    ],
    [
      ['user', 'api'],
      ['api', 'cb'],
      ['cb', 'pay'],
    ],
  ),
  t(
    C,
    'saga',
    'Saga (distributed transaction)',
    'Inventory fails sometimes; the orchestrator sends UNDO to earlier steps',
    [
      ['user', 'user', 0, 1],
      [
        'orch',
        'service',
        1,
        1,
        { label: 'Order saga', sim: { compensate: 1, capacity: 8 } },
      ],
      ['pay', 'payment', 2, 0, { label: 'Payment' }],
      [
        'stock',
        'service',
        2,
        1,
        { label: 'Inventory', sim: { failRate: 0.3 } },
      ],
      ['ship', 'service', 2, 2, { label: 'Shipping' }],
    ],
    [
      ['user', 'orch'],
      ['orch', 'pay'],
      ['orch', 'stock'],
      ['orch', 'ship'],
    ],
  ),
  t(
    C,
    'cap',
    'CAP theorem',
    'Take the primary down: the replica still answers (available) but stale',
    [
      ['writer', 'user', 0, 0, { label: 'Writer', sim: { writes: 1 } }],
      ['reader', 'user', 0, 2, { label: 'Reader' }],
      ['primary', 'sqlDb', 1, 0, { label: 'Primary' }],
      ['replica', 'replica', 1, 2, { label: 'Replica' }],
    ],
    [
      ['writer', 'primary'],
      ['primary', 'replica'],
      ['reader', 'replica'],
    ],
  ),
  t(
    C,
    'multi-region',
    'Distributed system (multi-region)',
    'Two regions behind one global balancer; lose one, keep serving',
    [
      ['user', 'user', 0, 1],
      ['glb', 'loadBalancer', 1, 1, { label: 'Global LB' }],
      ['ra', 'service', 2, 0, { label: 'Region Mumbai' }],
      ['rb', 'service', 2, 2, { label: 'Region Virginia' }],
      ['dba', 'sqlDb', 3, 0, { label: 'DB Mumbai' }],
      ['dbb', 'replica', 3, 2, { label: 'DB Virginia' }],
    ],
    [
      ['user', 'glb'],
      ['glb', 'ra'],
      ['glb', 'rb'],
      ['ra', 'dba'],
      ['rb', 'dbb'],
      ['dba', 'dbb'],
    ],
  ),
]
