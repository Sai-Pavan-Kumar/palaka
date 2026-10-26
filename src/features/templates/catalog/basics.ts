import { defineTemplate as t } from '../defineTemplate'

const PG = { label: 'Postgres', icon: 'si:postgresql' }
const C = 'Basics'

export const BASICS = [
  t(
    C,
    'client-server',
    'Client–server',
    'One request in, one answer back',
    [
      ['user', 'browser', 0, 1],
      ['server', 'webServer', 1, 1, { label: 'Server' }],
      ['db', 'sqlDb', 2, 1, PG],
    ],
    [
      ['user', 'server'],
      ['server', 'db'],
    ],
  ),
  t(
    C,
    'three-tier',
    'Three-tier app',
    'Presentation, logic and data, each its own layer',
    [
      ['user', 'browser', 0, 1],
      ['web', 'webServer', 1, 1, { label: 'Web tier' }],
      ['app', 'service', 2, 1, { label: 'App tier' }],
      ['db', 'sqlDb', 3, 1, PG],
    ],
    [
      ['user', 'web'],
      ['web', 'app'],
      ['app', 'db'],
    ],
  ),
  t(
    C,
    'dns-lookup',
    'DNS lookup',
    'Ask DNS for the address, then call the server',
    [
      ['user', 'browser', 0, 1],
      ['dns', 'dns', 1, 0],
      ['server', 'webServer', 1, 2, { label: 'Server' }],
    ],
    [
      ['user', 'dns'],
      ['user', 'server'],
    ],
  ),
  t(
    C,
    'cdn',
    'CDN',
    'Most requests end at the edge; misses reach the origin',
    [
      ['user', 'user', 0, 1],
      [
        'cdn',
        'cdn',
        1,
        1,
        {
          label: 'CloudFront',
          icon: 'aws:Amazon-CloudFront',
          sim: { hitRate: 0.9 },
        },
      ],
      ['origin', 'webServer', 2, 1, { label: 'Origin' }],
      [
        's3',
        'storage',
        3,
        1,
        { label: 'S3', icon: 'aws:Amazon-Simple-Storage-Service' },
      ],
    ],
    [
      ['user', 'cdn'],
      ['cdn', 'origin'],
      ['origin', 's3'],
    ],
  ),
  t(
    C,
    'rate-limit',
    'Rate limiting',
    'Raise traffic: extra requests get 429',
    [
      ['user', 'user', 0, 1],
      ['limiter', 'rateLimiter', 1, 1, { sim: { rate: 5 } }],
      ['api', 'service', 2, 1, { label: 'API' }],
      ['db', 'sqlDb', 3, 1, PG],
    ],
    [
      ['user', 'limiter'],
      ['limiter', 'api'],
      ['api', 'db'],
    ],
  ),
  t(
    C,
    'api-gateway',
    'API gateway + microservices',
    'One entry point calls each service in turn',
    [
      ['user', 'mobile', 0, 1],
      ['gw', 'gateway', 1, 1],
      ['auth', 'auth', 2, 0, { label: 'Auth' }],
      ['orders', 'service', 2, 1, { label: 'Orders' }],
      ['pay', 'payment', 2, 2, { label: 'Payments' }],
    ],
    [
      ['user', 'gw'],
      ['gw', 'auth'],
      ['gw', 'orders'],
      ['gw', 'pay'],
    ],
  ),
  t(
    C,
    'serverless',
    'Serverless on AWS',
    'API Gateway → Lambda → DynamoDB',
    [
      ['user', 'user', 0, 1],
      [
        'gw',
        'gateway',
        1,
        1,
        { label: 'API Gateway', icon: 'aws:Amazon-API-Gateway' },
      ],
      ['fn', 'function', 2, 1, { label: 'Lambda', icon: 'aws:AWS-Lambda' }],
      [
        'db',
        'noSqlDb',
        3,
        1,
        { label: 'DynamoDB', icon: 'aws:Amazon-DynamoDB' },
      ],
    ],
    [
      ['user', 'gw'],
      ['gw', 'fn'],
      ['fn', 'db'],
    ],
  ),
]
