<script setup>
import { computed } from 'vue'

const props = defineProps({
  // [{ label: string, value: number, colour: string (css colour) }]
  bars: { type: Array, required: true },
})

const max = computed(() => Math.max(...props.bars.map((bar) => bar.value), 1))
</script>

<template>
  <ul class="hbar" role="list">
    <li
      v-for="bar in bars"
      :key="bar.label"
      class="hbar__row"
      :aria-label="`${bar.label}: ${bar.value}`"
    >
      <span class="hbar__label">{{ bar.label }}</span>
      <span class="hbar__track">
        <span
          class="hbar__fill"
          :style="{ width: `${(bar.value / max) * 100}%`, background: bar.colour }"
        ></span>
      </span>
      <span class="hbar__value">{{ bar.value }}</span>
    </li>
  </ul>
</template>

<style scoped>
.hbar {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin: 0;
  padding: 0;
  list-style: none;
}

.hbar__row {
  display: grid;
  grid-template-columns: 90px 1fr 40px;
  align-items: center;
  gap: var(--space-3);
  font-size: var(--font-size-sm);
}

.hbar__label {
  color: var(--color-text-secondary);
}

.hbar__track {
  height: 12px;
  border-radius: var(--radius-full);
  background: var(--color-chart-track);
  overflow: hidden;
}

.hbar__fill {
  display: block;
  height: 100%;
  border-radius: var(--radius-full);
  min-width: 2px;
}

.hbar__value {
  text-align: right;
  font-weight: var(--font-weight-semibold);
  font-variant-numeric: tabular-nums;
}
</style>
