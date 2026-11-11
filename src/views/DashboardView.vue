<script setup>
import { computed, ref } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useDashboard } from '../composables/useDashboard'
import { formatCurrency, formatDate } from '../utils/formatters'
import { formatLocalDate, getDashboardPeriods, getDateRange } from '../business/dashboardMetrics'
import { downloadOrdersCsv } from '../utils/exportOrdersCsv'
import { ORDER_STATUS } from '../constants/orderStatuses'
import { usePermissions } from '../composables/usePermissions'
import { PERMISSION } from '../constants/permissions'
import { useToast } from '../composables/useToast'
import { getDisplayName } from '../utils/profile'
import { ShoppingCart, UserPlus } from '@lucide/vue'
import Alert from '../components/Alert.vue'
import KpiCard from '../components/dashboard/KpiCard.vue'
import DashboardSection from '../components/dashboard/DashboardSection.vue'
import SalesTrendChart from '../components/dashboard/SalesTrendChart.vue'
import DonutChart from '../components/dashboard/DonutChart.vue'
import HorizontalBarChart from '../components/dashboard/HorizontalBarChart.vue'
import BaseButton from '../components/base/BaseButton.vue'
import BaseNavTab from '../components/base/BaseNavTab.vue'

const { user, profile } = useAuth()
const {
  loading,
  error,
  periods,
  sales,
  openOrders,
  dailySales,
  stockHealth,
  periodOrders,
  topCustomers,
  activity,
  refresh,
} = useDashboard()
const { hasPermission } = usePermissions()
const { error: showError } = useToast()
const preset = ref('30')
const startDate = ref(formatLocalDate(periods.value.currentStart))
const endDate = ref(
  formatLocalDate(
    new Date(
      periods.value.currentEnd.getFullYear(),
      periods.value.currentEnd.getMonth(),
      periods.value.currentEnd.getDate() - 1,
    ),
  ),
)
const dateError = ref('')

async function applyRange() {
  try {
    let range
    if (preset.value === 'custom') {
      range = getDateRange(startDate.value, endDate.value)
    } else {
      range = getDashboardPeriods(new Date(), Number(preset.value))
      startDate.value = formatLocalDate(range.currentStart)
      const lastDay = new Date(range.currentEnd)
      lastDay.setDate(lastDay.getDate() - 1)
      endDate.value = formatLocalDate(lastDay)
    }
    dateError.value = ''
    await refresh(range)
  } catch (err) {
    dateError.value = err.message
  }
}

function exportOrders() {
  try {
    const orders = hasPermission(PERMISSION.CUSTOMER_VIEW)
      ? periodOrders.value
      : periodOrders.value.map((order) => ({ ...order, customerName: '' }))
    downloadOrdersCsv(orders, periods.value)
  } catch (err) {
    console.error('Unable to export orders:', err)
    showError('Unable to export orders. Please try again.')
  }
}

const displayName = computed(() => {
  return getDisplayName(profile.value, user.value, 'there')
})

const windowLabel = computed(() => {
  const end = new Date(periods.value.currentEnd)
  end.setDate(end.getDate() - 1)
  return `${formatLocalDate(periods.value.currentStart)} to ${formatLocalDate(end)}`
})

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

  const result = [
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
      key: 'new-customers',
      label: 'New customers',
      value: current.newCustomers,
      ...changeTrend(changes.newCustomers),
    },
    {
      key: 'completed',
      label: 'Completed orders',
      value: current.completedCount,
      ...changeTrend(changes.completedCount),
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
  return result.filter((card) => {
    if (['low', 'out'].includes(card.key)) return true
    if (card.key === 'new-customers') return hasPermission(PERMISSION.CUSTOMER_VIEW)
    return hasPermission(PERMISSION.ORDER_VIEW)
  })
})

const getInitials = (name) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0].toUpperCase())
    .join('')
const formatShare = (share) => `${(share * 100).toFixed(share > 0 && share < 0.1 ? 1 : 0)}%`

const canOpenActivity = (item) =>
  hasPermission(item.type === 'order' ? PERMISSION.ORDER_VIEW : PERMISSION.CUSTOMER_VIEW)
const formatTime = (value) =>
  new Intl.DateTimeFormat('en-KE', { timeStyle: 'short' }).format(new Date(value))
const activityGroups = computed(() => {
  const today = new Date().toDateString()
  const yesterday = new Date(Date.now() - 86400000).toDateString()
  const groups = new Map()
  for (const item of activity.value) {
    const day = new Date(item.date).toDateString()
    if (!groups.has(day)) {
      const label =
        day === today
          ? 'Today'
          : day === yesterday
            ? 'Yesterday'
            : new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium' }).format(new Date(item.date))
      groups.set(day, { key: day, label, items: [] })
    }
    groups.get(day).items.push(item)
  }
  return [...groups.values()]
})

const tabs = computed(() => {
  const canViewOrders = hasPermission(PERMISSION.ORDER_VIEW)
  return [
    canViewOrders && { value: 'sales', label: 'Sales', panelId: 'dashboard-tabs-panel-sales' },
    canViewOrders && { value: 'orders', label: 'Orders', panelId: 'dashboard-tabs-panel-orders' },
    { value: 'inventory', label: 'Inventory', panelId: 'dashboard-tabs-panel-inventory' },
    (canViewOrders || hasPermission(PERMISSION.CUSTOMER_VIEW)) && {
      value: 'activity',
      label: 'Activity',
      panelId: 'dashboard-tabs-panel-activity',
    },
  ].filter(Boolean)
})
const activeTab = ref('sales')
const currentTab = computed(
  () => tabs.value.find((tab) => tab.value === activeTab.value)?.value ?? tabs.value[0].value,
)

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

const orderStatusBars = computed(() =>
  Object.values(ORDER_STATUS).map((status, index) => ({
    label: status,
    value: periodOrders.value.filter((order) => order.status === status).length,
    colour: index % 2 ? 'var(--color-chart-categorical-03)' : 'var(--color-chart-categorical-01)',
  })),
)
</script>

<template>
  <h1>Welcome back, {{ displayName }}</h1>

  <form class="dashboard-filters" @submit.prevent="applyRange">
    <div class="dashboard-filter-range">
      <div>
        <label for="dashboard-range">Date range</label>
        <select id="dashboard-range" v-model="preset" :disabled="loading">
          <option value="7">Last 7 days</option>
          <option value="30">Last 30 days</option>
          <option value="90">Last 90 days</option>
          <option value="custom">Custom range</option>
        </select>
      </div>
      <template v-if="preset === 'custom'">
        <div>
          <label for="dashboard-start">Start date</label>
          <input
            id="dashboard-start"
            v-model="startDate"
            type="date"
            :disabled="loading"
            required
          />
        </div>
        <div>
          <label for="dashboard-end">End date</label>
          <input id="dashboard-end" v-model="endDate" type="date" :disabled="loading" required />
        </div>
      </template>
    </div>
    <div class="dashboard-filter-export">
      <BaseButton label="Apply" type="submit" :disabled="loading" />
      <BaseButton
        v-if="hasPermission(PERMISSION.ORDER_VIEW)"
        label="Export orders CSV"
        variant="secondary"
        :disabled="loading || !!error"
        @click="exportOrders"
      />
    </div>
    <p v-if="dateError" class="invalid" role="alert">{{ dateError }}</p>
  </form>

  <Alert v-if="error" type="danger" :message="error" />

  <div v-if="!error || loading" class="dashboard-kpis">
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

  <BaseNavTab
    id="dashboard-tabs"
    v-model="activeTab"
    aria-label="Dashboard details"
    :items="tabs"
  />

  <div
    :id="`dashboard-tabs-panel-${currentTab}`"
    class="dashboard-charts"
    :class="{ 'dashboard-charts--sales': currentTab === 'sales' }"
    role="tabpanel"
    :aria-labelledby="`dashboard-tabs-tab-${currentTab}`"
  >
    <DashboardSection
      v-if="currentTab === 'sales'"
      title="Sales trend"
      :subtitle="`Daily completed sales · ${windowLabel}`"
    >
      <p v-if="loading" class="dashboard-chart-state" role="status">Loading chart data...</p>
      <p v-else-if="error" class="dashboard-chart-state">Chart data is unavailable.</p>
      <SalesTrendChart v-else :points="dailySales" />
    </DashboardSection>

    <DashboardSection
      v-if="currentTab === 'orders'"
      title="Open orders"
      subtitle="Pending and processing right now"
    >
      <p v-if="loading" class="dashboard-chart-state" role="status">Loading chart data...</p>
      <p v-else-if="error" class="dashboard-chart-state">Chart data is unavailable.</p>
      <HorizontalBarChart v-else :bars="openOrderBars" />
    </DashboardSection>

    <DashboardSection
      v-if="currentTab === 'inventory'"
      title="Stock health"
      subtitle="Available quantity vs reorder level"
    >
      <p v-if="loading" class="dashboard-chart-state" role="status">Loading chart data...</p>
      <p v-else-if="error" class="dashboard-chart-state">Chart data is unavailable.</p>
      <DonutChart v-else :segments="stockSegments" />
    </DashboardSection>

    <DashboardSection
      v-if="currentTab === 'orders'"
      title="Order status"
      subtitle="Current status of orders created in the selected range"
    >
      <p v-if="loading" class="dashboard-chart-state" role="status">Loading chart data...</p>
      <p v-else-if="error" class="dashboard-chart-state">Chart data is unavailable.</p>
      <HorizontalBarChart v-else :bars="orderStatusBars" label="Orders by status" />
    </DashboardSection>

    <DashboardSection
      v-if="currentTab === 'sales' && hasPermission(PERMISSION.CUSTOMER_VIEW)"
      title="Top customers"
      subtitle="Completed sales in the selected range"
    >
      <p v-if="loading" class="dashboard-chart-state" role="status">Loading customers...</p>
      <p v-else-if="error" class="dashboard-chart-state">Customer data is unavailable.</p>
      <p v-else-if="!topCustomers.length" class="dashboard-chart-state">
        No completed sales in this range.
      </p>
      <ol v-else class="top-customers">
        <li v-for="(customer, index) in topCustomers" :key="customer.id">
          <component
            :is="hasPermission(PERMISSION.CUSTOMER_VIEW) ? 'RouterLink' : 'div'"
            :to="{ name: 'customer-details', params: { id: customer.id } }"
            class="top-customers__row"
          >
            <span class="top-customers__rank" :class="{ 'top-customers__rank--top': index < 3 }">{{
              index + 1
            }}</span>
            <span class="top-customers__avatar" aria-hidden="true">{{
              getInitials(customer.name)
            }}</span>
            <span class="top-customers__body">
              <span class="top-customers__line">
                <span class="top-customers__name">{{ customer.name }}</span>
                <strong>{{ formatCurrency(customer.total) }}</strong>
              </span>
              <span class="top-customers__line top-customers__meta">
                <span
                  class="top-customers__bar"
                  role="img"
                  :aria-label="`${formatShare(customer.share)} of completed sales`"
                >
                  <span :style="{ width: `${Math.max(customer.share * 100, 2)}%` }"></span>
                </span>
                <span>{{ formatShare(customer.share) }}</span>
              </span>
            </span>
          </component>
        </li>
      </ol>
    </DashboardSection>

    <DashboardSection
      v-if="currentTab === 'activity'"
      class="dashboard-charts__wide"
      title="Recent activity"
      subtitle="Orders and customers created in the selected range"
    >
      <p v-if="loading" class="dashboard-chart-state" role="status">Loading activity...</p>
      <p v-else-if="error" class="dashboard-chart-state">Activity is unavailable.</p>
      <p v-else-if="!activity.length" class="dashboard-chart-state">No activity in this range.</p>
      <div v-else class="activity-feed">
        <section v-for="group in activityGroups" :key="group.key" class="activity-group">
          <h3 class="activity-group__label">{{ group.label }}</h3>
          <ul class="activity-group__list">
            <li v-for="item in group.items" :key="`${item.type}-${item.id}`">
              <component
                :is="canOpenActivity(item) ? 'RouterLink' : 'div'"
                :to="{
                  name: item.type === 'order' ? 'order-details' : 'customer-details',
                  params: { id: item.id },
                }"
                class="activity-item"
              >
                <span
                  class="activity-item__icon"
                  :class="`activity-item__icon--${item.type}`"
                  aria-hidden="true"
                >
                  <ShoppingCart v-if="item.type === 'order'" :size="16" />
                  <UserPlus v-else :size="16" />
                </span>
                <span class="activity-item__body">
                  <span class="activity-item__title">{{ item.title }}</span>
                  <span class="activity-detail">{{
                    item.type === 'order'
                      ? `Order created${item.detail ? ` · ${item.detail}` : ''}`
                      : item.detail
                  }}</span>
                </span>
                <time :datetime="item.date" :title="formatDate(item.date)">{{
                  formatTime(item.date)
                }}</time>
              </component>
            </li>
          </ul>
        </section>
      </div>
    </DashboardSection>
  </div>
</template>

<style scoped>
.dashboard-filters {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-3);
}

.dashboard-filters input,
.dashboard-filters select {
  min-height: 44px;
  max-width: 100%;
}

.dashboard-filters .invalid {
  flex-basis: 100%;
}

.dashboard-filter-export,
.dashboard-filter-range {
  display: flex;
  gap: var(--space-2);
}

.activity-detail {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.activity-feed {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.activity-group__label {
  margin: 0 0 var(--space-2);
  color: var(--color-text-muted);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.activity-group__list {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin: 0;
  padding: 0;
  list-style: none;
}

.activity-item {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  color: inherit;
  text-decoration: none;
}

a.activity-item:hover {
  background: var(--color-interactive-default-opacity-10);
}

a.activity-item:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: -2px;
}

.activity-item__icon {
  display: inline-flex;
  flex: 0 0 36px;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
}

.activity-item__icon--order {
  background: var(--color-interactive-default-opacity-10);
  color: var(--color-interactive-default);
}

.activity-item__icon--customer {
  background: var(--color-feedback-success-subtle);
  color: var(--color-feedback-success);
}

.activity-item__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.activity-item__title {
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.activity-item time {
  flex: 0 0 auto;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

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

@media (min-width: 900px) {
  .dashboard-charts--sales {
    grid-template-columns: 2fr 1fr;
  }
}

.top-customers {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  margin: 0;
  padding: 0;
  list-style: none;
}

.top-customers__row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2);
  border-radius: var(--radius-sm);
  color: inherit;
  text-decoration: none;
}

a.top-customers__row:hover {
  background: var(--color-interactive-default-opacity-10);
}

a.top-customers__row:focus-visible {
  outline: 2px solid var(--color-border-focus);
  outline-offset: -2px;
}

.top-customers__rank {
  flex: 0 0 24px;
  text-align: center;
  color: var(--color-text-muted);
  font-size: var(--font-size-sm);
}

.top-customers__rank--top {
  color: var(--color-interactive-default);
  font-weight: var(--font-weight-semibold);
}

.top-customers__avatar {
  display: inline-flex;
  flex: 0 0 36px;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: var(--color-interactive-default-opacity-10);
  color: var(--color-interactive-default);
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.top-customers__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: var(--space-1);
  min-width: 0;
}

.top-customers__line {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}

.top-customers__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: var(--font-size-sm);
}

.top-customers__meta {
  justify-content: flex-start;
  color: var(--color-text-secondary);
  font-size: var(--font-size-xs);
}

.top-customers__bar {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: var(--color-border-subtle);
  overflow: hidden;
}

.top-customers__bar > span {
  display: block;
  height: 100%;
  border-radius: 3px;
  background: var(--color-interactive-default);
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
