<script setup>
import { computed } from 'vue'
import { formatDate, formatRelativeDate } from '../../utils/formatters'
import { ORDER_TIMELINE } from '../../constants/orderTimeline'

const props = defineProps({
  order: {
    type: Object,
    required: true,
  },
})

const timeline = computed(() => {
  return ORDER_TIMELINE.map((event) => {
    const timestamp = props.order[event.key]

    const statusByKey = {
      createdAt: 'Draft',
      postedAt: 'Pending',
      processingStartedAt: 'Processing',
      completedAt: 'Completed',
      canceledAt: 'Canceled',
    }
    const actorByKey = {
      createdAt: ['createdByName', 'createdBy'],
      postedAt: ['postedByName', 'postedBy'],
      processingStartedAt: ['processingStartedByName', 'processingStartedBy'],
      completedAt: ['completedByName', 'completedBy'],
      canceledAt: ['canceledByName', 'canceledBy'],
    }
    const [actorNameField, actorIdField] = actorByKey[event.key]

    return {
      ...event,
      title: typeof event.title === 'function' ? event.title(props.order) : event.title,

      timestamp,
      status: statusByKey[event.key],
      actorName: props.order[actorNameField],
      actorId: props.order[actorIdField],

      isCompleted: Boolean(timestamp),
      isCurrent: statusByKey[event.key] === props.order.status,
      isUpcoming: !timestamp && statusByKey[event.key] !== props.order.status,
    }
  }).filter((event) => {
    // Always show the order creation event
    if (event.key === 'createdAt') {
      return true
    }

    // For cancelled orders, show only events that happened
    // plus the cancellation event.
    if (props.order.status === 'Canceled') {
      return Boolean(event.timestamp)
    }

    // Hide the cancellation path for non-cancelled orders
    if (event.key === 'canceledAt') {
      return false
    }

    // Show completed events and the next/current lifecycle stage
    return true
  })
})

function formatActorName(name, id) {
  if (name && name !== id) return name
  if (id) return `User ${id.slice(0, 8)}`
  return 'User not recorded'
}

const lastUpdatedActor = computed(() =>
  formatActorName(props.order.updatedByName, props.order.updatedBy),
)
</script>

<template>
  <section class="order-timeline-card card" aria-labelledby="order-timeline-title">
    <div class="card-header order-timeline-header">
      <div>
        <h2 id="order-timeline-title">Order timeline</h2>
        <p>Track each step from creation to completion.</p>
        <span v-if="order.updatedAt" class="order-timeline-updated">
          Last updated {{ formatDate(order.updatedAt) }} by
          <strong>{{ lastUpdatedActor }}</strong>
        </span>
      </div>
    </div>

    <div class="card-body">
      <div class="order-timeline" role="list">
        <div
          v-for="(event, index) in timeline"
          :key="event.key"
          class="timeline-item"
          role="listitem"
          :class="{
            'is-completed': event.isCompleted,
            'is-current': event.isCurrent,
            'is-upcoming': event.isUpcoming,
          }"
        >
          <div class="timeline-track">
            <div
              class="timeline-marker"
              :class="[
                `timeline-marker--${event.color}`,
                {
                  'is-completed': event.isCompleted,
                  'is-current': event.isCurrent,
                  'is-upcoming': event.isUpcoming,
                },
              ]"
            >
              <component :is="event.icon" :size="16" class="timeline-icon" />
            </div>

            <div
              v-if="index < timeline.length - 1"
              class="timeline-line"
              :class="{
                'is-completed': event.isCompleted,
              }"
            />
          </div>

          <div class="timeline-content">
            <div class="timeline-title-row">
              <p class="timeline-title">{{ event.title }}</p>

              <span v-if="event.isCurrent" class="timeline-current-label">Current step</span>
            </div>

            <div v-if="event.timestamp" class="timeline-date">
              <span>
                {{ formatDate(event.timestamp) }}
              </span>

              <span class="timeline-date-relative">
                {{ formatRelativeDate(event.timestamp) }}
              </span>
            </div>
            <p v-if="event.timestamp" class="timeline-actor">
              By {{ formatActorName(event.actorName, event.actorId) }}
            </p>

            <p v-else-if="event.isUpcoming" class="timeline-pending">Not yet reached</p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.order-timeline-card {
  overflow: hidden;
  padding: 0;
}

.order-timeline-header {
  border-bottom: 1px solid var(--border-colour-subtle);
  margin: 0;
  padding: 18px 20px 14px;
}

.order-timeline-header h2 {
  font-size: 16px;
  font-weight: 600;
  margin: 0;
}

.order-timeline-header p {
  color: var(--text-colour-secondary);
  font-size: 12px;
  margin: 4px 0 0;
}

.order-timeline-updated {
  color: var(--text-colour-secondary);
  display: block;
  font-size: 11px;
  line-height: 1.4;
  margin-top: 8px;
}

.order-timeline-updated strong {
  color: var(--text-colour-primary);
  font-weight: 600;
}

.order-timeline-card :deep(.card-body) {
  padding: 18px 20px 4px;
}

.timeline-item {
  gap: 12px;
  min-height: 4.25rem;
}

.timeline-marker {
  transition:
    background-color 160ms ease,
    border-color 160ms ease,
    box-shadow 160ms ease;
}

.timeline-marker--primary.is-completed {
  background: var(--bg-info-muted);
  border-color: var(--border-info);
  color: var(--text-colour-accent);
}

.timeline-marker--info.is-completed {
  background: var(--bg-info-muted);
  border-color: var(--border-info);
  color: var(--text-colour-info);
}

.timeline-marker--warning.is-completed {
  background: var(--bg-warning-muted);
  border-color: var(--border-warning);
  color: var(--text-colour-warning);
}

.timeline-marker--success.is-completed {
  background: var(--bg-success-muted);
  border-color: var(--border-success);
  color: var(--text-colour-success);
}

.timeline-marker--danger.is-completed {
  background: var(--bg-danger-muted);
  border-color: var(--border-danger);
  color: var(--text-colour-danger);
}

.timeline-item.is-current .timeline-marker {
  box-shadow: 0 0 0 3px var(--bg-info-muted);
}

.timeline-item.is-upcoming .timeline-marker {
  background: var(--bg-colour-default);
}

.timeline-current-label {
  background: var(--bg-info-muted);
  color: var(--text-colour-accent);
  flex-shrink: 0;
}

.timeline-title {
  font-size: 13px;
  line-height: 1.4;
}

.timeline-actor {
  color: var(--text-colour-secondary);
  font-size: 11px;
  margin: 4px 0 0;
  overflow-wrap: anywhere;
}

.timeline-pending {
  color: var(--text-colour-tertiary);
  font-size: 12px;
  margin: 4px 0 0;
}

@media (prefers-reduced-motion: reduce) {
  .timeline-marker {
    transition: none;
  }
}
</style>
