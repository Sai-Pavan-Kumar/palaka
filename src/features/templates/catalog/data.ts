import { defineTemplate as t } from '../defineTemplate'

const PG = { label: 'Postgres', icon: 'si:postgresql' }
const REDIS = { label: 'Redis', icon: 'si:redis' }
const C = 'Data'

export const DATA = [
  t(
    C,
    'replication-lag',
    'Replication lag (eventual consistency)',
    'Reads that beat the copy come back STALE',
    [
      ['writer', 'user', 0, 0, { label: 'Writer', sim: { writes: 1 } }],
      ['reader', 'user', 0, 2, { label: 'Reader' }],
      ['primary', 'sqlDb', 1, 0, { label: 'Primary', icon: 'si:postgresql' }],
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
    'read-write-split',
    'Read/write split',
    'Writes go to the primary, reads spread over replicas',
    [
      ['user', 'user', 0, 1, { sim: { writes: 0.3 } }],
      ['api', 'service', 1, 1, { label: 'API' }],
      ['primary', 'sqlDb', 2, 1, PG],
      ['r1', 'replica', 3, 0, { label: 'Replica 1' }],
      ['r2', 'replica', 3, 2, { label: 'Replica 2' }],
    ],
    [
      ['user', 'api'],
      ['api', 'primary'],
      ['api', 'r1'],
      ['api', 'r2'],
      ['primary', 'r1'],
      ['primary', 'r2'],
    ],
  ),
  t(
    C,
    'cache-aside',
    'Cache-aside',
    'Hits return fast, misses go to the database',
    [
      ['user', 'user', 0, 1],
      ['api', 'service', 1, 1, { label: 'API' }],
      ['cache', 'cache', 2, 0, REDIS],
      ['db', 'sqlDb', 2, 2, PG],
    ],
    [
      ['user', 'api'],
      ['api', 'cache'],
      ['api', 'db'],
    ],
  ),
  t(
    C,
    'read-through',
    'Read-through cache',
    'The cache itself fetches from the database on a miss',
    [
      ['user', 'user', 0, 1],
      ['api', 'service', 1, 1, { label: 'API' }],
      ['cache', 'cache', 2, 1, REDIS],
      ['db', 'sqlDb', 3, 1, PG],
    ],
    [
      ['user', 'api'],
      ['api', 'cache'],
      ['cache', 'db'],
    ],
  ),
  t(
    C,
    'read-replicas',
    'Read replicas',
    'Reads spread over copies of the database',
    [
      ['user', 'user', 0, 1],
      ['api', 'service', 1, 1, { label: 'API' }],
      ['router', 'loadBalancer', 2, 1, { label: 'Read router' }],
      ['r1', 'replica', 3, 0, { label: 'Replica 1' }],
      ['r2', 'replica', 3, 2, { label: 'Replica 2' }],
    ],
    [
      ['user', 'api'],
      ['api', 'router'],
      ['router', 'r1'],
      ['router', 'r2'],
    ],
  ),
  t(
    C,
    'sharding',
    'Database sharding',
    'A router sends each request to one shard',
    [
      ['user', 'user', 0, 1],
      ['api', 'service', 1, 1, { label: 'API' }],
      ['router', 'loadBalancer', 2, 1, { label: 'Shard router' }],
      ['s1', 'sqlDb', 3, 0, { label: 'Shard A–H' }],
      ['s2', 'sqlDb', 3, 1, { label: 'Shard I–P' }],
      ['s3', 'sqlDb', 3, 2, { label: 'Shard Q–Z' }],
    ],
    [
      ['user', 'api'],
      ['api', 'router'],
      ['router', 's1'],
      ['router', 's2'],
      ['router', 's3'],
    ],
  ),
  t(
    C,
    'search-index',
    'Search with Elasticsearch',
    'Queries go to the search index, not the database',
    [
      ['user', 'user', 0, 1],
      ['api', 'service', 1, 1, { label: 'Search API' }],
      [
        'es',
        'search',
        2,
        1,
        { label: 'Elasticsearch', icon: 'si:elasticsearch' },
      ],
    ],
    [
      ['user', 'api'],
      ['api', 'es'],
    ],
  ),
  t(
    C,
    'object-storage',
    'File upload to S3',
    'Files go to object storage, metadata to the database',
    [
      ['user', 'mobile', 0, 1],
      ['api', 'service', 1, 1, { label: 'Upload API' }],
      [
        's3',
        'storage',
        2,
        0,
        { label: 'S3', icon: 'aws:Amazon-Simple-Storage-Service' },
      ],
      ['db', 'sqlDb', 2, 2, { label: 'Metadata DB' }],
    ],
    [
      ['user', 'api'],
      ['api', 's3'],
      ['api', 'db'],
    ],
  ),
  t(
    C,
    'cqrs',
    'CQRS',
    'Writes and reads take separate paths',
    [
      ['user', 'user', 0, 1],
      ['cmd', 'service', 1, 0, { label: 'Write API' }],
      ['qry', 'service', 1, 2, { label: 'Read API' }],
      ['wdb', 'sqlDb', 2, 0, { label: 'Write DB' }],
      ['rdb', 'noSqlDb', 2, 2, { label: 'Read model', icon: 'si:mongodb' }],
    ],
    [
      ['user', 'cmd'],
      ['user', 'qry'],
      ['cmd', 'wdb'],
      ['qry', 'rdb'],
    ],
  ),
]
