import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'
import {
  getDashboardCustomers,
  getDashboardInventory,
  getDashboardOrders,
} from '../services/dashboardService'
import { usePermissions } from './usePermissions'
import { PERMISSION } from '../constants/permissions'
import {
  getDashboardPeriods,
  calculateSalesMetrics,
  calculateOpenOrders,
  calculateDailySales,
  calculateStockHealth,
  calculateTopCustomers,
  ordersCreatedInRange,
  inDashboardRange,
} from '../business/dashboardMetrics'

export function useDashboard() {
  const { hasPermission, role } = usePermissions()
  const orders = ref([])
  const customers = ref([])
  const inventory = ref([])
  const periods = ref(getDashboardPeriods())
  const loading = ref(false)
  const error = ref(null)
  let controller = null

  async function fetchDashboard(nextPeriods = periods.value) {
    controller?.abort()
    controller = new AbortController()
    const { signal } = controller
    loading.value = true
    error.value = null
    try {
      const [orderData, customerData, inventoryData] = await Promise.all([
        hasPermission(PERMISSION.ORDER_VIEW)
          ? getDashboardOrders({
              since: nextPeriods.previousStart,
              until: nextPeriods.currentEnd,
              signal,
              includeCustomerNames: hasPermission(PERMISSION.CUSTOMER_VIEW),
            })
          : Promise.resolve([]),
        hasPermission(PERMISSION.CUSTOMER_VIEW)
          ? getDashboardCustomers({
              since: nextPeriods.previousStart,
              until: nextPeriods.currentEnd,
              signal,
            })
          : Promise.resolve([]),
        getDashboardInventory({ signal }),
      ])
      if (signal.aborted) return
      periods.value = nextPeriods
      orders.value = orderData
      customers.value = customerData
      inventory.value = inventoryData
    } catch (err) {
      if (!signal.aborted) {
        error.value = err.message || 'An error occurred while loading the dashboard.'
      }
    } finally {
      if (!signal.aborted) loading.value = false
    }
  }

  const sales = computed(() => calculateSalesMetrics(orders.value, periods.value, customers.value))
  const openOrders = computed(() => calculateOpenOrders(orders.value))
  const dailySales = computed(() => calculateDailySales(orders.value, periods.value))
  const stockHealth = computed(() => calculateStockHealth(inventory.value))
  const periodOrders = computed(() => ordersCreatedInRange(orders.value, periods.value))
  const topCustomers = computed(() => calculateTopCustomers(orders.value, periods.value))
  const activity = computed(() =>
    [
      ...periodOrders.value.map((order) => ({
        id: order.id,
        type: 'order',
        title: order.orderNumber ? `Order ${order.orderNumber}` : 'Order',
        detail: hasPermission(PERMISSION.CUSTOMER_VIEW)
          ? order.customerName || 'Customer unavailable'
          : '',
        date: order.createdAt,
      })),
      ...customers.value
        .filter((customer) =>
          inDashboardRange(
            customer.createdAt,
            periods.value.currentStart,
            periods.value.currentEnd,
          ),
        )
        .map((customer) => ({
          id: customer.id,
          type: 'customer',
          title: customer.name,
          detail: 'Customer created',
          date: customer.createdAt,
        })),
    ]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10),
  )

  let mounted = false
  onMounted(() => {
    mounted = true
    fetchDashboard()
  })
  watch(role, () => {
    if (mounted) fetchDashboard()
  })
  onBeforeUnmount(() => controller?.abort())
  return {
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
    refresh: fetchDashboard,
  }
}
