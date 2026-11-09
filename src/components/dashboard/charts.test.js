import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import SalesTrendChart from './SalesTrendChart.vue'
import DonutChart from './DonutChart.vue'
import HorizontalBarChart from './HorizontalBarChart.vue'
import { formatCurrency } from '../../utils/formatters'

const theme = ref('light')
vi.mock('../../composables/useTheme', () => ({ useTheme: () => ({ theme }) }))
vi.mock('vue-chartjs', () => {
  const chart = (name) => ({
    name,
    props: ['data', 'options'],
    template: '<canvas />',
  })
  return { Line: chart('Line'), Bar: chart('Bar'), Doughnut: chart('Doughnut') }
})

const setColors = (line) => {
  const style = document.documentElement.style
  style.setProperty('--color-chart-categorical-01', line)
  style.setProperty('--color-chart-categorical-03', '#aa5500')
  style.setProperty('--color-chart-status-positive', '#00aa00')
  style.setProperty('--color-chart-status-warning', '#aaaa00')
  style.setProperty('--color-chart-status-negative', '#aa0000')
  style.setProperty('--color-chart-axis', '#555555')
  style.setProperty('--color-chart-grid', '#cccccc')
  style.setProperty('--color-chart-track', '#dddddd')
}

describe('dashboard charts', () => {
  beforeEach(() => {
    theme.value = 'light'
    setColors('#112233')
  })
  afterEach(() => {
    document.documentElement.removeAttribute('style')
  })

  it('updates sales data and provides a complete text alternative', async () => {
    const points = [
      { date: new Date(2026, 0, 1), total: 1 },
      { date: new Date(2026, 0, 2), total: 24 },
    ]
    const wrapper = mount(SalesTrendChart, { props: { points } })
    await nextTick()
    const chart = wrapper.findComponent({ name: 'Line' })
    expect(chart.props('data').datasets[0].data).toEqual([1, 24])
    expect(chart.props('data').datasets[0].borderColor).toBe('#112233')
    expect(wrapper.text()).toContain(formatCurrency(25))
    expect(wrapper.findAll('tbody tr')).toHaveLength(2)
    expect(wrapper.text()).toContain(formatCurrency(1))

    await wrapper.setProps({ points: [points[0]] })
    expect(chart.props('data').datasets[0].data).toEqual([1])
    expect(wrapper.text()).toContain(`Peak day: ${formatCurrency(1)}`)

    setColors('#abcdef')
    theme.value = 'dark'
    await nextTick()
    expect(chart.props('data').datasets[0].borderColor).toBe('#abcdef')
    wrapper.unmount()
  })

  it('renders an explicit empty sales state', () => {
    const wrapper = mount(SalesTrendChart, { props: { points: [] } })
    expect(wrapper.text()).toContain('No sales data available.')
    expect(wrapper.findComponent({ name: 'Line' }).exists()).toBe(false)
    wrapper.unmount()
  })

  it('shows stock values and a neutral track when all segments are zero', async () => {
    const segments = [
      { label: 'In stock', value: 0, colour: 'var(--color-chart-status-positive)' },
      { label: 'Low stock', value: 0, colour: 'var(--color-chart-status-warning)' },
    ]
    const wrapper = mount(DonutChart, { props: { segments } })
    await nextTick()
    const chart = wrapper.findComponent({ name: 'Doughnut' })
    expect(chart.props('data').datasets[0].data).toEqual([1])
    expect(chart.props('data').datasets[0].backgroundColor).toEqual(['#dddddd'])
    expect(chart.props('options').plugins.tooltip.enabled).toBe(false)
    expect(wrapper.findAll('li').map((item) => item.attributes('aria-label'))).toEqual([
      'In stock: 0',
      'Low stock: 0',
    ])

    await wrapper.setProps({ segments: [{ ...segments[0], value: 3 }, segments[1]] })
    expect(chart.props('data').datasets[0].data).toEqual([3, 0])
    expect(chart.props('data').datasets[0].backgroundColor).toEqual(['#00aa00', '#aaaa00'])
    expect(chart.props('options').plugins.tooltip.enabled).toBe(true)
    wrapper.unmount()
  })

  it('renders horizontal order counts and tracks updated values', async () => {
    const bars = [{ label: 'Pending', value: 2, colour: 'var(--color-chart-categorical-03)' }]
    const wrapper = mount(HorizontalBarChart, { props: { bars } })
    await nextTick()
    const chart = wrapper.findComponent({ name: 'Bar' })
    expect(chart.props('options').indexAxis).toBe('y')
    expect(chart.props('data').datasets[0].backgroundColor).toEqual(['#aa5500'])
    expect(wrapper.find('li').attributes('aria-label')).toBe('Pending: 2')
    await wrapper.setProps({ bars: [{ ...bars[0], value: 5 }] })
    expect(chart.props('data').datasets[0].data).toEqual([5])
    expect(wrapper.find('li').attributes('aria-label')).toBe('Pending: 5')
    wrapper.unmount()
  })
})
