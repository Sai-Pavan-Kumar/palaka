import type { BehaviourKind } from '../simTypes'
import type { Behaviour } from './behaviour'
import { cache } from './cache'
import { circuitBreaker } from './circuitBreaker'
import { loadBalancer } from './loadBalancer'
import { pubSub, queue } from './queue'
import { rateLimiter } from './rateLimiter'
import { passThrough, replica, service, sink } from './service'

export const BEHAVIOURS: Record<BehaviourKind, Behaviour> = {
  source: passThrough,
  pass: passThrough,
  limiter: rateLimiter,
  balancer: loadBalancer,
  cache,
  queue,
  pubsub: pubSub,
  service,
  breaker: circuitBreaker,
  replica,
  sink,
}
