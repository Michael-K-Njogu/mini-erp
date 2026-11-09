<script setup>
import { computed } from 'vue'
import { Line } from 'vue-chartjs'
import { color } from 'chart.js/helpers'
import { formatCurrency } from '../../utils/formatters'
import { useChartColors } from './useChartColors'
import './chartSetup'

const props = defineProps({
  points: { type: Array, required: true },
})

const { colors } = useChartColors()
const dateFormat = new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short' })
const fullDateFormat = new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium' })
const max = computed(() => Math.max(0, ...props.points.map((point) => point.total)))
const total = computed(() => props.points.reduce((sum, point) => sum + point.total, 0))
const summary = computed(() => {
  if (!props.points.length) return 'No sales data available.'
  return `Daily completed sales from ${fullDateFormat.format(props.points[0].date)} to ${fullDateFormat.format(props.points.at(-1).date)}, totalling ${formatCurrency(total.value)}.`
})

const data = computed(() => {
  const lineColor = colors.value?.['--color-chart-categorical-01']
  return {
    labels: props.points.map((point) => dateFormat.format(point.date)),
    datasets: [
      {
        label: 'Completed sales',
        data: props.points.map((point) => point.total),
        borderColor: lineColor,
        backgroundColor: lineColor ? color(lineColor).alpha(0.12).rgbString() : undefined,
        fill: true,
        tension: 0,
        pointRadius: 2,
        pointHitRadius: 12,
        borderWidth: 2,
      },
    ],
  }
})

const options = computed(() => ({
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  plugins: {
    tooltip: {
      callbacks: {
        title: (items) => fullDateFormat.format(props.points[items[0].dataIndex].date),
        label: (context) => formatCurrency(context.parsed.y),
      },
    },
  },
  scales: {
    x: {
      ticks: { color: colors.value?.['--color-chart-axis'], maxTicksLimit: 5, maxRotation: 0 },
      grid: { display: false },
    },
    y: {
      beginAtZero: true,
      ticks: {
        color: colors.value?.['--color-chart-axis'],
        maxTicksLimit: 5,
        callback: (value) => formatCurrency(value),
      },
      grid: { color: colors.value?.['--color-chart-grid'] },
    },
  },
}))
</script>

<template>
  <figure class="line-chart">
    <p v-if="!points.length" class="chart-empty">No sales data available.</p>
    <div v-else class="line-chart__canvas">
      <Line v-if="colors" :data="data" :options="options" aria-hidden="true" />
    </div>

    <figcaption>
      <p>{{ summary }}</p>
      <p v-if="points.length">Peak day: {{ formatCurrency(max) }}</p>
    </figcaption>
    <details v-if="points.length" class="sales-data">
      <summary>View daily sales data</summary>
      <div class="sales-data__table">
        <table class="data-table">
          <caption>
            Daily completed sales
          </caption>
          <thead>
            <tr>
              <th scope="col">Date</th>
              <th scope="col">Sales</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="point in points" :key="point.date.toISOString()">
              <td>{{ fullDateFormat.format(point.date) }}</td>
              <td>{{ formatCurrency(point.total) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </details>
  </figure>
</template>

<style scoped>
.line-chart {
  margin: 0;
  min-width: 0;
}

.line-chart__canvas {
  position: relative;
  height: 220px;
  min-width: 0;
}

figcaption {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: var(--space-1);
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
}

figcaption p {
  margin: var(--space-2) 0;
}

.sales-data {
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}

.sales-data summary {
  cursor: pointer;
}

.sales-data__table {
  max-height: 260px;
  overflow: auto;
}

caption {
  text-align: left;
  padding: var(--space-2) 0;
}
</style>
