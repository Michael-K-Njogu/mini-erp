<script setup>
import { computed } from 'vue'
import { formatCurrency } from '../../utils/formatters'

const props = defineProps({
  // [{ date: Date, total: number }]
  points: { type: Array, required: true },
})

const WIDTH = 600
const HEIGHT = 220
const PAD = { top: 12, right: 12, bottom: 28, left: 12 }

const max = computed(() => Math.max(...props.points.map((p) => p.total), 1))

const coords = computed(() => {
  const innerW = WIDTH - PAD.left - PAD.right
  const innerH = HEIGHT - PAD.top - PAD.bottom
  const step = props.points.length > 1 ? innerW / (props.points.length - 1) : 0

  return props.points.map((point, index) => ({
    x: PAD.left + index * step,
    y: PAD.top + innerH - (point.total / max.value) * innerH,
    ...point,
  }))
})

const linePath = computed(() =>
  coords.value.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' '),
)

const areaPath = computed(() => {
  if (!coords.value.length) return ''
  const baseline = HEIGHT - PAD.bottom
  const last = coords.value[coords.value.length - 1]
  return `${linePath.value} L${last.x.toFixed(1)},${baseline} L${coords.value[0].x.toFixed(1)},${baseline} Z`
})

const dateFormat = new Intl.DateTimeFormat('en-KE', { day: 'numeric', month: 'short' })

const firstLabel = computed(() => dateFormat.format(props.points[0]?.date))
const lastLabel = computed(() => dateFormat.format(props.points.at(-1)?.date))

const summary = computed(() => {
  const total = props.points.reduce((sum, p) => sum + p.total, 0)
  return `Daily completed sales from ${firstLabel.value} to ${lastLabel.value}, totalling ${formatCurrency(total)}.`
})
</script>

<template>
  <figure class="line-chart">
    <svg
      :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
      role="img"
      :aria-label="summary"
      preserveAspectRatio="none"
    >
      <line
        class="line-chart__baseline"
        :x1="PAD.left"
        :x2="WIDTH - PAD.right"
        :y1="HEIGHT - PAD.bottom"
        :y2="HEIGHT - PAD.bottom"
      />
      <path class="line-chart__area" :d="areaPath" />
      <path class="line-chart__line" :d="linePath" />
      <circle
        v-for="c in coords"
        :key="c.date.toISOString()"
        class="line-chart__point"
        :cx="c.x"
        :cy="c.y"
        r="3"
      >
        <title>{{ dateFormat.format(c.date) }}: {{ formatCurrency(c.total) }}</title>
      </circle>
    </svg>

    <figcaption class="line-chart__axis">
      <span>{{ firstLabel }}</span>
      <span>Peak day: {{ formatCurrency(max === 1 ? 0 : max) }}</span>
      <span>{{ lastLabel }}</span>
    </figcaption>
  </figure>
</template>

<style scoped>
.line-chart {
  margin: 0;
}

svg {
  display: block;
  width: 100%;
  height: 220px;
  overflow: visible;
}

.line-chart__baseline {
  stroke: var(--color-chart-grid);
  stroke-width: 1;
}

.line-chart__area {
  fill: var(--color-chart-categorical-01);
  opacity: 0.12;
}

.line-chart__line {
  fill: none;
  stroke: var(--color-chart-categorical-01);
  stroke-width: 2;
  stroke-linejoin: round;
  vector-effect: non-scaling-stroke;
}

.line-chart__point {
  fill: var(--color-chart-categorical-01);
}

.line-chart__axis {
  display: flex;
  justify-content: space-between;
  margin-top: var(--space-1);
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}
</style>
