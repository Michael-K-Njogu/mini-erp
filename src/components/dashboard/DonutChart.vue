<script setup>
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import { useChartColors } from './useChartColors'
import './chartSetup'

const props = defineProps({
  segments: { type: Array, required: true },
})

const { colors, resolveColor } = useChartColors()
const total = computed(() => props.segments.reduce((sum, segment) => sum + segment.value, 0))
const data = computed(() => ({
  labels: total.value ? props.segments.map((segment) => segment.label) : ['No stock data'],
  datasets: [
    {
      data: total.value ? props.segments.map((segment) => segment.value) : [1],
      backgroundColor: total.value
        ? props.segments.map((segment) => resolveColor(segment.colour))
        : [colors.value?.['--color-chart-track']],
      borderWidth: 0,
    },
  ],
}))
const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  cutout: '72%',
  plugins: { tooltip: { enabled: total.value > 0 } },
}))
</script>

<template>
  <div class="donut">
    <div class="donut__chart" aria-hidden="true">
      <Doughnut v-if="colors" :data="data" :options="options" />
      <span class="donut__total">{{ total }}</span>
    </div>

    <ul class="donut__legend" aria-label="Stock health">
      <li
        v-for="segment in segments"
        :key="segment.label"
        :aria-label="`${segment.label}: ${segment.value}`"
      >
        <span
          class="donut__swatch"
          :style="{ background: segment.colour }"
          aria-hidden="true"
        ></span>
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

.donut__chart {
  position: relative;
  width: 140px;
  height: 140px;
  flex: 0 0 auto;
}

.donut__total {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
  font: var(--font-weight-semibold) 18px var(--font-family-primary);
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
