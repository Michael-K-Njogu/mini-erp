<script setup>
import { computed } from 'vue'
import { Bar } from 'vue-chartjs'
import { useChartColors } from './useChartColors'
import './chartSetup'

const props = defineProps({
  bars: { type: Array, required: true },
})

const { colors, resolveColor } = useChartColors()
const data = computed(() => ({
  labels: props.bars.map((bar) => bar.label),
  datasets: [
    {
      label: 'Orders',
      data: props.bars.map((bar) => bar.value),
      backgroundColor: props.bars.map((bar) => resolveColor(bar.colour)),
      borderRadius: 6,
      maxBarThickness: 20,
    },
  ],
}))
const options = computed(() => ({
  indexAxis: 'y',
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  scales: {
    x: {
      beginAtZero: true,
      ticks: {
        color: colors.value?.['--color-chart-axis'],
        precision: 0,
        maxTicksLimit: 5,
      },
      grid: { color: colors.value?.['--color-chart-grid'] },
    },
    y: {
      ticks: { color: colors.value?.['--color-chart-axis'] },
      grid: { display: false },
    },
  },
}))
</script>

<template>
  <div class="hbar">
    <div class="hbar__chart">
      <Bar v-if="colors" :data="data" :options="options" aria-hidden="true" />
    </div>
    <ul class="hbar__values" aria-label="Open orders">
      <li v-for="bar in bars" :key="bar.label" :aria-label="`${bar.label}: ${bar.value}`">
        <span>{{ bar.label }}</span>
        <strong>{{ bar.value }}</strong>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.hbar__chart {
  position: relative;
  height: 140px;
  min-width: 0;
}

.hbar__values {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
  margin: var(--space-2) 0 0;
  padding: 0;
  list-style: none;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.hbar__values li {
  display: flex;
  gap: var(--space-2);
}

.hbar__values strong {
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums;
}
</style>
