import { onMounted, ref, watch } from 'vue'
import { useTheme } from '../../composables/useTheme'

const tokens = [
  '--color-chart-axis',
  '--color-chart-grid',
  '--color-chart-track',
  '--color-chart-categorical-01',
  '--color-chart-categorical-03',
  '--color-chart-status-positive',
  '--color-chart-status-warning',
  '--color-chart-status-negative',
]

export function useChartColors() {
  const { theme } = useTheme()
  const colors = ref(null)

  function readColors() {
    const styles = getComputedStyle(document.documentElement)
    colors.value = Object.fromEntries(
      tokens.map((token) => [token, styles.getPropertyValue(token).trim()]),
    )
  }

  onMounted(readColors)
  watch(theme, readColors, { flush: 'post' })

  function resolveColor(value) {
    const token = /^var\((--[^)]+)\)$/.exec(value)?.[1]
    return token ? colors.value?.[token] : value
  }

  return { colors, resolveColor }
}
