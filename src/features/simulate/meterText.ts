import type { NodeState, SimNode } from './simTypes'

// Share of capacity in use: 1 = full, above 1 = requests waiting in line.
export function loadOf(node: SimNode, state: NodeState): number | null {
  const { behaviour, capacity, size } = node.config
  if (behaviour === 'service') {
    return (state.busy.length + state.backlog.length) / capacity
  }
  if (behaviour === 'queue') return state.backlog.length / size
  return null
}

// One short line under each block: the number that explains its story.
export function meterText(node: SimNode, state: NodeState): string | null {
  const { stats } = state
  const { behaviour, capacity, size, rate } = node.config
  switch (behaviour) {
    case 'source':
      return stats.sent === 0 ? null : `${stats.ok} ok · ${stats.failed} failed`
    case 'limiter':
      return `${rate}/s · ${stats.rejected} blocked`
    case 'balancer': {
      const counts = Object.values(stats.routed)
      return counts.length === 0 ? null : counts.join(' · ')
    }
    case 'cache': {
      const total = stats.hits + stats.misses
      return total === 0
        ? 'cold'
        : `hit ${Math.round((stats.hits / total) * 100)}%`
    }
    case 'queue':
      return `${state.backlog.length}/${size} waiting`
    case 'pubsub':
      return `${stats.handled} published`
    case 'service': {
      const waiting = state.backlog.length
      const busy = `${state.busy.length}/${capacity} busy`
      return waiting > 0 ? `${busy} · ${waiting} waiting` : busy
    }
    default:
      return null
  }
}
