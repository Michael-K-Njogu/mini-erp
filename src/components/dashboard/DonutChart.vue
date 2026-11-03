<script setup>
import { computed } from 'vue'

const props = defineProps({
  // [{ label: string, value: number, colour: string (css colour) }]
  segments: { type: Array, required: true },
})

const RADIUS = 40
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

const total = computed(() => props.segments.reduce((sum, s) => sum + s.value, 0))

const arcs = computed(() => {
  let offset = 0

  return props.segments
    .filter((segment) => segment.value > 0)
    .map((segment) => {
      const length = (segment.value / total.value) * CIRCUMFERENCE
      const arc = { ...segment, length, offset }
      offset += length
      return arc
    })
})

const summary = computed(() =>
  props.segments.map((segment) => `${segment.label}: ${segment.value}`).join(', '),
)
</script>

<template>
  <div class="donut">
    <svg viewBox="0 0 100 100" role="img" :aria-label="summary" class="donut__svg">
      <circle class="donut__track" cx="50" cy="50" :r="RADIUS" />
      <circle
        v-for="arc in arcs"
        :key="arc.label"
        cx="50"
        cy="50"
        :r="RADIUS"
        class="donut__arc"
        :stroke="arc.colour"
        :stroke-dasharray="`${arc.length} ${CIRCUMFERENCE - arc.length}`"
        :stroke-dashoffset="-arc.offset"
        transform="rotate(-90 50 50)"
      />
      <text x="50" y="50" class="donut__total" text-anchor="middle" dominant-baseline="central">
        {{ total }}
      </text>
    </svg>

    <ul class="donut__legend">
      <li v-for="segment in segments" :key="segment.label">
        <span class="donut__swatch" :style="{ background: segment.colour }"></span>
        <span class="donut__legend-label">{{ segment.label }}</span>
        <span class="donut__legend-value">{{ segment.value }}</span>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.donut {
  display: flex;
  align-items: center;
  gap: var(--space-6);
  flex-wrap: wrap;
}

.donut__svg {
  width: 140px;
  height: 140px;
  flex: 0 0 auto;
}

.donut__track,
.donut__arc {
  fill: none;
  stroke-width: 14;
}

.donut__track {
  stroke: var(--color-chart-track);
}

.donut__total {
  font: var(--font-weight-semibold) 18px var(--font-family-primary);
  fill: var(--color-text-primary);
}

.donut__legend {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
  font-size: var(--font-size-sm);
  min-width: 140px;
  flex: 1;
}

.donut__legend li {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.donut__swatch {
  width: 10px;
  height: 10px;
  border-radius: var(--radius-full);
}

.donut__legend-label {
  flex: 1;
  color: var(--color-text-secondary);
}

.donut__legend-value {
  font-weight: var(--font-weight-semibold);
  font-variant-numeric: tabular-nums;
}
</style>
