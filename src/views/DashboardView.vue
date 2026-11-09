<script setup>
import { computed } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useDashboard } from '../composables/useDashboard'
import { formatCurrency } from '../utils/formatters'
import Alert from '../components/Alert.vue'
import KpiCard from '../components/dashboard/KpiCard.vue'
import DashboardSection from '../components/dashboard/DashboardSection.vue'
import SalesTrendChart from '../components/dashboard/SalesTrendChart.vue'
import DonutChart from '../components/dashboard/DonutChart.vue'
import HorizontalBarChart from '../components/dashboard/HorizontalBarChart.vue'

const { user } = useAuth()
const { loading, error, periods, sales, openOrders, dailySales, stockHealth } = useDashboard()

const displayName = computed(() => {
  const fullName = user.value?.user_metadata?.full_name
  if (fullName) return fullName

  const emailName = user.value?.email?.split('@')[0]
  return emailName || 'there'
})

const windowLabel = computed(() => `Last ${periods.value.days} days`)

function changeTrend(change) {
  if (change === null) {
    return { trend: 'neutral', trendIcon: '', trendText: 'No prior period data' }
  }

  const text = `${Math.abs(change).toFixed(1)}% vs previous ${periods.value.days} days`

  if (change === 0) return { trend: 'neutral', trendIcon: '', trendText: text }

  return change > 0
    ? { trend: 'positive', trendIcon: 'up', trendText: text }
    : { trend: 'negative', trendIcon: 'down', trendText: text }
}

const cards = computed(() => {
  const { current, changes } = sales.value
  const stock = stockHealth.value

  return [
    {
      key: 'sales',
      label: `Sales (${windowLabel.value.toLowerCase()})`,
      value: formatCurrency(current.salesTotal),
      ...changeTrend(changes.salesTotal),
    },
    {
      key: 'orders',
      label: 'Orders created',
      value: current.ordersCreated,
      ...changeTrend(changes.ordersCreated),
    },
    {
      key: 'aov',
      label: 'Average order value',
      value: formatCurrency(current.averageOrderValue),
      ...changeTrend(changes.averageOrderValue),
    },
    {
      key: 'customers',
      label: 'Active customers',
      value: current.activeCustomers,
      ...changeTrend(changes.activeCustomers),
    },
    {
      key: 'open',
      label: 'Open orders',
      value: openOrders.value.total,
      trend: 'neutral',
      trendIcon: '',
      trendText: `${openOrders.value.pending} pending · ${openOrders.value.processing} processing`,
    },
    {
      key: 'low',
      label: 'Low-stock items',
      value: stock.lowStock,
      trend: stock.lowStock ? 'negative' : 'neutral',
      trendIcon: '',
      trendText: stock.lowStock ? 'At or below reorder level' : 'None at risk',
    },
    {
      key: 'out',
      label: 'Out-of-stock items',
      value: stock.outOfStock,
      trend: stock.outOfStock ? 'negative' : 'neutral',
      trendIcon: '',
      trendText: stock.outOfStock ? 'Needs restocking' : 'All items available',
    },
  ]
})

const openOrderBars = computed(() => [
  {
    label: 'Pending',
    value: openOrders.value.pending,
    colour: 'var(--color-chart-categorical-03)',
  },
  {
    label: 'Processing',
    value: openOrders.value.processing,
    colour: 'var(--color-chart-categorical-01)',
  },
])

const stockSegments = computed(() => [
  {
    label: 'In stock',
    value: stockHealth.value.inStock,
    colour: 'var(--color-chart-status-positive)',
  },
  {
    label: 'Low stock',
    value: stockHealth.value.lowStock,
    colour: 'var(--color-chart-status-warning)',
  },
  {
    label: 'Out of stock',
    value: stockHealth.value.outOfStock,
    colour: 'var(--color-chart-status-negative)',
  },
])
</script>

<template>
  <h1>Welcome back, {{ displayName }}</h1>

  <Alert v-if="error" type="danger" :message="error" />

  <div class="dashboard-kpis">
    <KpiCard
      v-for="card in cards"
      :key="card.key"
      :label="card.label"
      :value="card.value"
      :trend="card.trend"
      :trend-icon="card.trendIcon"
      :trend-text="card.trendText"
      :loading="loading"
    />
  </div>

  <div class="dashboard-charts">
    <DashboardSection
      class="dashboard-charts__wide"
      title="Sales trend"
      :subtitle="`Daily completed sales · ${windowLabel}`"
    >
      <p v-if="loading" class="dashboard-chart-state" role="status">Loading chart data...</p>
      <p v-else-if="error" class="dashboard-chart-state">Chart data is unavailable.</p>
      <SalesTrendChart v-else :points="dailySales" />
    </DashboardSection>

    <DashboardSection title="Open orders" subtitle="Pending and processing right now">
      <p v-if="loading" class="dashboard-chart-state" role="status">Loading chart data...</p>
      <p v-else-if="error" class="dashboard-chart-state">Chart data is unavailable.</p>
      <HorizontalBarChart v-else :bars="openOrderBars" />
    </DashboardSection>

    <DashboardSection title="Stock health" subtitle="Available quantity vs reorder level">
      <p v-if="loading" class="dashboard-chart-state" role="status">Loading chart data...</p>
      <p v-else-if="error" class="dashboard-chart-state">Chart data is unavailable.</p>
      <DonutChart v-else :segments="stockSegments" />
    </DashboardSection>
  </div>
</template>

<style scoped>
.dashboard-kpis {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(200px, 100%), 1fr));
  gap: var(--space-4);
}

.dashboard-charts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(300px, 100%), 1fr));
  gap: var(--space-4);
}

.dashboard-charts__wide {
  grid-column: 1 / -1;
}

.dashboard-chart-state {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: var(--font-size-sm);
}
</style>
