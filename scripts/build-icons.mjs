// Builds the icon packs the block menu loads on demand.
// Run with `npm run icons` after changing vendor/aws-icons or BRANDS below.
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs'
import * as lucide from 'lucide-react'
import * as simpleIcons from 'simple-icons'
import { REAL_WORLD } from './realWorldIcons.mjs'

const OUT_DIR = 'src/features/icons/generated'
const AWS_DIR = 'vendor/aws-icons'

// AWS service name fragments → the block kind that simulates like it.
// First match wins, so specific names sit above broad ones.
const AWS_KINDS = [
  [/ElastiCache|MemoryDB|DAX/i, 'cache'],
  [/CloudFront/i, 'cdn'],
  [/Elastic-Load-Balancing/i, 'loadBalancer'],
  [/API-Gateway|AppSync/i, 'gateway'],
  [/Simple-Queue|MQ$|Amazon-MQ/i, 'queue'],
  [/Kinesis|Managed-Streaming|MSK/i, 'stream'],
  [/Simple-Notification|EventBridge/i, 'pubSub'],
  [/Step-Functions|Batch$/i, 'scheduler'],
  [/Lambda/i, 'function'],
  [/DynamoDB|DocumentDB|Keyspaces/i, 'noSqlDb'],
  [/Neptune/i, 'graphDb'],
  [/Timestream/i, 'timeSeriesDb'],
  [/RDS|Aurora|Database/i, 'sqlDb'],
  [/Redshift|Athena|Lake/i, 'warehouse'],
  [/OpenSearch|CloudSearch|Kendra/i, 'search'],
  [/Simple-Storage|S3|Glacier|Backup/i, 'storage'],
  [/Elastic-File|FSx|Elastic-Block/i, 'fileSystem'],
  [/Route-53/i, 'dns'],
  [/WAF|Shield|Firewall|Network-Firewall/i, 'firewall'],
  [/Cognito|Identity|IAM|Single-Sign/i, 'identity'],
  [/Secrets|Key-Management|KMS/i, 'secrets'],
  [/Certificate/i, 'certificate'],
  [
    /CloudWatch|X-Ray|Managed-Grafana|Managed-Service-for-Prometheus/i,
    'monitoring',
  ],
  [/CloudTrail/i, 'logging'],
  [/Code|Amplify/i, 'ciCd'],
  [/Bedrock|SageMaker|Q$|Nova/i, 'llm'],
  [/Simple-Email/i, 'email'],
  [/Elastic-Kubernetes|EKS|Elastic-Container|ECS|Fargate/i, 'container'],
  [/EC2|Lightsail|Elastic-Beanstalk|App-Runner/i, 'service'],
  [/VPC|Transit|Direct-Connect|Global-Accelerator/i, 'router'],
]

// Short names people actually say and search for.
const AWS_ALIASES = {
  'Amazon-Simple-Storage-Service': 's3',
  'Amazon-EC2': 'ec2 server vm',
  'Amazon-RDS': 'rds postgres mysql',
  'Amazon-Simple-Queue-Service': 'sqs queue',
  'Amazon-Simple-Notification-Service': 'sns pubsub',
  'AWS-Lambda': 'serverless function',
  'Amazon-DynamoDB': 'dynamo nosql',
  'Amazon-ElastiCache': 'redis memcached cache',
  'Amazon-CloudFront': 'cdn',
  'Elastic-Load-Balancing': 'elb alb nlb load balancer',
  'Amazon-API-Gateway': 'api gateway',
  'Amazon-Route-53': 'dns route53',
  'Amazon-Elastic-Kubernetes-Service': 'eks kubernetes k8s',
  'Amazon-Elastic-Container-Service': 'ecs docker',
  'Amazon-Managed-Streaming-for-Apache-Kafka': 'msk kafka',
  'Amazon-Kinesis': 'stream',
  'Amazon-Cognito': 'auth login',
  'AWS-Identity-and-Access-Management': 'iam',
}

// What people write on a whiteboard; the long AWS name stays searchable.
const AWS_SHORT = {
  'Amazon-Simple-Storage-Service': 'S3',
  'Amazon-EC2': 'EC2',
  'Amazon-RDS': 'RDS',
  'Amazon-Simple-Queue-Service': 'SQS',
  'Amazon-Simple-Notification-Service': 'SNS',
  'Amazon-Simple-Email-Service': 'SES',
  'Amazon-Elastic-Kubernetes-Service': 'EKS',
  'Amazon-Elastic-Container-Service': 'ECS',
  'Amazon-Elastic-Container-Registry': 'ECR',
  'Amazon-Elastic-Block-Store': 'EBS',
  'Amazon-Elastic-File-System': 'EFS',
  'Amazon-Managed-Streaming-for-Apache-Kafka': 'MSK',
  'AWS-Identity-and-Access-Management': 'IAM',
  'AWS-Key-Management-Service': 'KMS',
  'Amazon-Virtual-Private-Cloud': 'VPC',
  'Elastic-Load-Balancing': 'Load balancer',
  'Amazon-Route-53': 'Route 53',
}

// Tech brands worth having in a system design video, with the kind that
// decides how each one behaves in a simulation. Missing slugs are skipped.
const BRANDS = {
  Databases: {
    sqlDb:
      'postgresql mysql mariadb sqlite oracle cockroachlabs planetscale supabase neon prisma',
    noSqlDb:
      'mongodb apachecassandra couchbase apachecouchdb scylladb firebase realm',
    graphDb: 'neo4j arangodb',
    timeSeriesDb: 'influxdb timescale',
    warehouse:
      'clickhouse snowflake databricks googlebigquery duckdb apachespark apachehadoop dbt apachehive trino',
    search: 'elasticsearch opensearch algolia meilisearch apachesolr typesense',
    vectorDb: 'milvus qdrant',
    cache: 'redis valkey hazelcast memcached',
  },
  Messaging: {
    stream: 'apachekafka apachepulsar apacheflink',
    queue: 'rabbitmq apacheactivemq celery',
    pubSub: 'natsdotio eclipsemosquitto mqtt zeromq',
    scheduler: 'apacheairflow temporal',
  },
  Infrastructure: {
    container: 'docker podman',
    cluster: 'kubernetes nomad helm rancher openshift',
    webServer: 'nginx apache caddy',
    reverseProxy: 'traefikproxy envoyproxy',
    loadBalancer: 'haproxy',
    gateway: 'kong graphql apollographql trpc',
    cdn: 'cloudflare fastly akamai jsdelivr',
    cloud:
      'googlecloud vercel netlify heroku digitalocean vultr hetzner ovh alibabacloud render flydotio railway ibmcloud linode',
    function: 'cloudflareworkers',
    config: 'terraform ansible pulumi consul',
    router: 'istio linkerd',
  },
  'Languages & frameworks': {
    service:
      'nodedotjs deno bun python go rust openjdk spring springboot dotnet php laravel ruby rubyonrails django flask fastapi express nestjs kotlin swift typescript javascript elixir scala',
    webServer: 'nextdotjs nuxtdotjs remix astro',
    browser: 'react vuedotjs angular svelte html5',
    mobile: 'flutter android apple ios',
  },
  Observability: {
    monitoring: 'prometheus grafana datadog newrelic dynatrace',
    alerting: 'sentry pagerduty opsgenie',
    logging: 'kibana logstash splunk fluentd graylog',
    tracing: 'opentelemetry jaeger honeycomb',
  },
  'Dev & delivery': {
    ciCd: 'github gitlab githubactions jenkins circleci argo bitbucket git travisci',
    featureFlags: 'launchdarkly',
  },
  Security: {
    auth: 'auth0 clerk jsonwebtokens openid',
    identity: 'okta keycloak',
    secrets: 'vault 1password bitwarden',
    certificate: 'letsencrypt',
  },
  'Third parties': {
    payment:
      'stripe paypal razorpay square visa mastercard googlepay phonepe paytm',
    sms: 'twilio',
    email: 'mailgun mailchimp gmail',
    notification: 'slack discord whatsapp telegram',
    maps: 'googlemaps mapbox openstreetmap',
    llm: 'openai anthropic claude googlegemini ollama langchain mistralai perplexity',
    mlModel: 'huggingface pytorch tensorflow',
    analytics: 'googleanalytics mixpanel segment posthog',
    storage: 'minio backblaze dropbox googledrive cloudinary',
  },
  'Real products': {
    external:
      'youtube netflix uber airbnb spotify instagram facebook x tiktok linkedin reddit twitch shopify zomato swiggy flipkart whatsapp google zoom',
  },
}

function bySlug() {
  const map = new Map()
  for (const icon of Object.values(simpleIcons)) {
    if (icon && typeof icon === 'object' && icon.slug) map.set(icon.slug, icon)
  }
  return map
}

function buildBrands() {
  const icons = bySlug()
  const out = []
  const missing = []
  const seen = new Set()
  for (const [group, kinds] of Object.entries(BRANDS)) {
    for (const [kind, slugs] of Object.entries(kinds)) {
      for (const slug of slugs.split(/\s+/)) {
        const icon = icons.get(slug)
        if (!icon) missing.push(slug)
        if (!icon || seen.has(slug)) continue
        seen.add(slug)
        out.push({
          id: `si:${slug}`,
          label: icon.title,
          group,
          kind,
          keywords: `${icon.title} ${slug}`.toLowerCase(),
          path: icon.path,
          hex: icon.hex,
        })
      }
    }
  }
  console.log(`brands: ${out.length}, skipped: ${missing.join(' ') || 'none'}`)
  return out
}

function awsKind(name) {
  return AWS_KINDS.find(([pattern]) => pattern.test(name))?.[1] ?? 'service'
}

// Drop the XML header, title and ids: they add bytes and nothing visible.
function slimSvg(svg) {
  return svg
    .replace(/<\?xml[^>]*>/, '')
    .replace(/<title>[\s\S]*?<\/title>/, '')
    .replace(/\s(id|xmlns:xlink|version)="[^"]*"/g, '')
    .replace(/>\s+</g, '><')
    .trim()
}

function buildAws() {
  const groups = new Map(
    readFileSync(`${AWS_DIR}/_groups.tsv`, 'utf8')
      .trim()
      .split('\n')
      .map((line) => line.split('\t')),
  )
  const files = readdirSync(AWS_DIR).filter((f) => f.endsWith('.svg'))
  const out = files.map((file) => {
    const name = file.replace(/^Arch_/, '').replace(/_48\.svg$/, '')
    const label =
      AWS_SHORT[name] ?? name.replace(/^(Amazon|AWS)-/, '').replace(/-/g, ' ')
    const group = (groups.get(file) ?? 'Arch_General').replace(/^Arch_/, '')
    return {
      id: `aws:${name}`,
      label,
      group: `AWS · ${group.replace(/-/g, ' ')}`,
      kind: awsKind(name),
      keywords: `aws ${name.replace(/-/g, ' ')} ${AWS_ALIASES[name] ?? ''}`
        .toLowerCase()
        .trim(),
      svg: slimSvg(readFileSync(`${AWS_DIR}/${file}`, 'utf8')),
    }
  })
  console.log(`aws: ${out.length}`)
  return out.sort((a, b) => a.group.localeCompare(b.group))
}

function write(file, constName, type, rows) {
  const body =
    `// Generated by scripts/build-icons.mjs. Do not edit by hand.\n` +
    `import type { ${type} } from '../iconTypes'\n\n` +
    `export const ${constName}: ${type}[] = ${JSON.stringify(rows, null, 1)}\n`
  writeFileSync(`${OUT_DIR}/${file}`, body)
}

// Real-world icons are Lucide components, so the file imports them by
// name (tree-shaken into the lazy chunk) instead of embedding SVG text.
function buildRealWorld() {
  const have = new Set(Object.keys(lucide.icons))
  const seen = new Set()
  const rows = []
  const missing = []
  for (const [group, list] of Object.entries(REAL_WORLD)) {
    for (const [name, label, kind = 'custom'] of list) {
      if (!have.has(name)) missing.push(name)
      if (!have.has(name) || seen.has(name)) continue
      seen.add(name)
      rows.push({ name, label, group: `Real world · ${group}`, kind })
    }
  }
  console.log(
    `real world: ${rows.length}, skipped: ${missing.join(' ') || 'none'}`,
  )
  const NL = '\n'
  const names = [...new Set(rows.map((r) => r.name))].sort()
  const entry = (r) =>
    `  { id: 'lu:${r.name}', label: ${JSON.stringify(r.label)}, ` +
    `group: ${JSON.stringify(r.group)}, kind: '${r.kind}', ` +
    `keywords: ${JSON.stringify(`${r.label} ${r.name}`.toLowerCase())}, Icon: ${r.name} },`
  const text = [
    '// Generated by scripts/build-icons.mjs. Do not edit by hand.',
    'import {',
    ...names.map((n) => `  ${n},`),
    "} from 'lucide-react'",
    "import type { RealWorldIcon } from '../iconTypes'",
    '',
    'export const REAL_WORLD_ICONS: RealWorldIcon[] = [',
    ...rows.map(entry),
    ']',
    '',
  ].join(NL)
  writeFileSync(`${OUT_DIR}/realWorldIcons.ts`, text)
}

mkdirSync(OUT_DIR, { recursive: true })
write('awsIcons.ts', 'AWS_ICONS', 'AwsIcon', buildAws())
write('brandIcons.ts', 'BRAND_ICONS', 'BrandIcon', buildBrands())
buildRealWorld()
