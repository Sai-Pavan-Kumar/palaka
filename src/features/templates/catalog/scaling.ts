import { defineTemplate as t } from '../defineTemplate'

const PG = { label: 'Postgres', icon: 'si:postgresql' }
const REDIS = { label: 'Redis', icon: 'si:redis' }
const C = 'Scaling'

export const SCALING = [
  t(
    C,
    'load-balancing',
    'Load balancing',
    'Requests split evenly across servers',
    [
      ['user', 'user', 0, 1],
      ['lb', 'loadBalancer', 1, 1],
      ['s1', 'service', 2, 0, { label: 'Server 1' }],
      ['s2', 'service', 2, 1, { label: 'Server 2' }],
      ['s3', 'service', 2, 2, { label: 'Server 3' }],
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
    'vertical-limit',
    'Single server limit',
    'One small server: raise traffic and watch it fail',
    [
      ['user', 'user', 0, 1],
      [
        'server',
        'service',
        1,
        1,
        { label: 'One server', sim: { capacity: 2 } },
      ],
      ['db', 'sqlDb', 2, 1, PG],
    ],
    [
      ['user', 'server'],
      ['server', 'db'],
    ],
  ),
  t(
    C,
    'stateless-scale',
    'Horizontal scaling + shared cache',
    'Many app servers, one shared session store',
    [
      ['user', 'user', 0, 1],
      ['lb', 'loadBalancer', 1, 1],
      ['a1', 'service', 2, 0, { label: 'App 1' }],
      ['a2', 'service', 2, 2, { label: 'App 2' }],
      ['cache', 'cache', 3, 1, REDIS],
    ],
    [
      ['user', 'lb'],
      ['lb', 'a1'],
      ['lb', 'a2'],
      ['a1', 'cache'],
      ['a2', 'cache'],
    ],
  ),
  t(
    C,
    'reverse-proxy',
    'Reverse proxy',
    'Nginx in front, apps behind it',
    [
      ['user', 'browser', 0, 1],
      ['proxy', 'reverseProxy', 1, 1, { label: 'Nginx', icon: 'si:nginx' }],
      ['a1', 'webServer', 2, 0, { label: 'App 1' }],
      ['a2', 'webServer', 2, 2, { label: 'App 2' }],
    ],
    [
      ['user', 'proxy'],
      ['proxy', 'a1'],
      ['proxy', 'a2'],
    ],
  ),
  t(
    C,
    'full-stack',
    'Production web stack',
    'Limiter, balancer, servers, cache and database together',
    [
      ['user', 'user', 0, 1],
      ['rl', 'rateLimiter', 1, 1],
      ['lb', 'loadBalancer', 2, 1],
      ['a1', 'service', 3, 0, { label: 'App 1' }],
      ['a2', 'service', 3, 2, { label: 'App 2' }],
      ['cache', 'cache', 4, 0, REDIS],
      ['db', 'sqlDb', 4, 2, PG],
    ],
    [
      ['user', 'rl'],
      ['rl', 'lb'],
      ['lb', 'a1'],
      ['lb', 'a2'],
      ['a1', 'cache'],
      ['a1', 'db'],
      ['a2', 'cache'],
      ['a2', 'db'],
    ],
  ),
  t(
    C,
    'geo-cdn',
    'Global users + CDN',
    'Users everywhere hit the nearest edge',
    [
      ['u1', 'user', 0, 0, { label: 'India' }],
      ['u2', 'user', 0, 2, { label: 'USA' }],
      ['e1', 'cdn', 1, 0, { label: 'Edge Mumbai' }],
      ['e2', 'cdn', 1, 2, { label: 'Edge Virginia' }],
      ['origin', 'webServer', 2, 1, { label: 'Origin' }],
    ],
    [
      ['u1', 'e1'],
      ['u2', 'e2'],
      ['e1', 'origin'],
      ['e2', 'origin'],
    ],
  ),
]
