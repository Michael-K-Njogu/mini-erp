<script setup>
import { computed } from 'vue'
import { ArrowUp, ArrowDown } from '@lucide/vue'
import BaseSkeleton from '../base/BaseSkeleton.vue'

// Mirrors the design system's KPI Card (Compositions/Data Display/KPI Card)
const props = defineProps({
  label: { type: String, required: true },
  value: { type: [String, Number], required: true },
  trend: {
    type: String,
    default: 'neutral',
    validator: (value) => ['positive', 'negative', 'neutral'].includes(value),
  },
  trendText: { type: String, default: '' },
  trendIcon: {
    type: String,
    default: '',
    validator: (value) => ['', 'up', 'down'].includes(value),
  },
  loading: { type: Boolean, default: false },
})

const ariaLabel = computed(() =>
  [`${props.label}: ${props.value}.`, props.trendText].filter(Boolean).join(' '),
)
</script>

<template>
  <article
    class="dds-kpi-card"
    :class="{ 'dds-kpi-card--loading': loading }"
    :data-trend="trend"
    :aria-label="loading ? `${label}: loading` : ariaLabel"
    :aria-busy="loading"
  >
    <template v-if="loading">
      <BaseSkeleton width="60%" height="16px" />
      <BaseSkeleton width="40%" height="28px" />
      <BaseSkeleton width="70%" height="16px" />
    </template>

    <template v-else>
      <p class="dds-kpi-card__label">{{ label }}</p>
      <p class="dds-kpi-card__value">
        <span>{{ value }}</span>
      </p>
      <div class="dds-kpi-card__trend">
        <ArrowUp v-if="trendIcon === 'up'" :size="16" aria-hidden="true" />
        <ArrowDown v-else-if="trendIcon === 'down'" :size="16" aria-hidden="true" />
        <span>{{ trendText }}</span>
      </div>
    </template>
  </article>
</template>

<style scoped>
.dds-kpi-card {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 160px;
  padding: var(--space-3);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-sm);
  background: var(--color-bg-elevated);
  color: var(--color-text-primary);
}

.dds-kpi-card__label,
.dds-kpi-card__value {
  margin: 0;
}

.dds-kpi-card__label {
  overflow: hidden;
  color: var(--color-text-secondary);
  font: var(--font-weight-regular) var(--font-size-xs) / var(--font-size-md)
    var(--font-family-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dds-kpi-card__value {
  display: flex;
  align-items: baseline;
  gap: var(--space-1);
  min-width: 0;
  font: var(--font-weight-semibold) var(--font-size-xl) / 28px var(--font-family-primary);
  font-variant-numeric: tabular-nums;
}

.dds-kpi-card__trend {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  min-height: 18px;
  color: var(--color-text-muted);
  font: var(--font-weight-semibold) var(--font-size-xs) / var(--font-size-md)
    var(--font-family-primary);
}

.dds-kpi-card[data-trend='positive'] .dds-kpi-card__trend {
  color: var(--color-feedback-success);
}

.dds-kpi-card[data-trend='negative'] .dds-kpi-card__trend {
  color: var(--color-feedback-error);
}

@media (forced-colors: active) {
  .dds-kpi-card {
    border-color: canvastext;
  }
}
</style>
