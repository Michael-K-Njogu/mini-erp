import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { getDashboardOrders } from '../services/dashboardService'
import { getInventory } from '../services/inventoryService'
import {
  getDashboardPeriods,
  calculateSalesMetrics,
  calculateOpenOrders,
  calculateDailySales,
  calculateStockHealth,
} from '../business/dashboardMetrics'

export function useDashboard() {
  const orders = ref([])
  const inventory = ref([])
  const periods = ref(getDashboardPeriods())
  const loading = ref(false)
  const error = ref(null)

  let controller = null

  async function fetchDashboard() {
    controller?.abort()
    controller = new AbortController()
    const { signal } = controller

    loading.value = true
    error.value = null

    try {
      const nextPeriods = getDashboardPeriods()

      const [orderData, inventoryData] = await Promise.all([
        getDashboardOrders({ since: nextPeriods.previousStart, signal }),
        getInventory(),
      ])

      periods.value = nextPeriods
      orders.value = orderData
      inventory.value = inventoryData
    } catch (err) {
      if (err.name !== 'AbortError') {
        error.value = err.message || 'An error occurred while loading the dashboard.'
      }
    } finally {
      if (!signal.aborted) loading.value = false
    }
  }

  const sales = computed(() => calculateSalesMetrics(orders.value, periods.value))
  const openOrders = computed(() => calculateOpenOrders(orders.value))
  const dailySales = computed(() => calculateDailySales(orders.value, periods.value))
  const stockHealth = computed(() => calculateStockHealth(inventory.value))

  onMounted(fetchDashboard)
  onBeforeUnmount(() => controller?.abort())

  return {
    loading,
    error,
    periods,
    sales,
    openOrders,
    dailySales,
    stockHealth,
    refresh: fetchDashboard,
  }
}
