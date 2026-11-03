import { ORDER_STATUS } from '../constants/orderStatuses'
import { getStockStatus } from '../services/inventoryService'

export const DASHBOARD_WINDOW_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000

export function getDashboardPeriods(now = new Date(), days = DASHBOARD_WINDOW_DAYS) {
  const currentStart = new Date(now.getTime() - days * DAY_MS)
  const previousStart = new Date(currentStart.getTime() - days * DAY_MS)

  return { now, currentStart, previousStart, days }
}

function inRange(value, start, end) {
  if (!value) return false
  const time = new Date(value).getTime()
  return time >= start.getTime() && time < end.getTime()
}

function summarisePeriod(orders, start, end) {
  const created = orders.filter((order) => inRange(order.createdAt, start, end))
  const completed = orders.filter(
    (order) => order.status === ORDER_STATUS.COMPLETED && inRange(order.completedAt, start, end),
  )

  const salesTotal = completed.reduce((sum, order) => sum + Number(order.grandTotal || 0), 0)

  return {
    ordersCreated: created.length,
    salesTotal,
    completedCount: completed.length,
    averageOrderValue: completed.length ? salesTotal / completed.length : 0,
    activeCustomers: new Set(created.map((order) => order.customerId).filter(Boolean)).size,
  }
}

/**
 * Percentage change from previous to current. Returns null when there is no
 * previous value to compare against.
 */
export function calculateChange(current, previous) {
  if (!previous) return null
  return ((current - previous) / previous) * 100
}

export function calculateSalesMetrics(orders, periods = getDashboardPeriods()) {
  const { now, currentStart, previousStart } = periods

  const current = summarisePeriod(orders, currentStart, new Date(now.getTime() + 1))
  const previous = summarisePeriod(orders, previousStart, currentStart)

  return {
    current,
    previous,
    changes: {
      salesTotal: calculateChange(current.salesTotal, previous.salesTotal),
      ordersCreated: calculateChange(current.ordersCreated, previous.ordersCreated),
      averageOrderValue: calculateChange(current.averageOrderValue, previous.averageOrderValue),
      activeCustomers: calculateChange(current.activeCustomers, previous.activeCustomers),
    },
  }
}

/**
 * Open orders are a current-state count (not windowed).
 */
export function calculateOpenOrders(orders) {
  const pending = orders.filter((order) => order.status === ORDER_STATUS.PENDING).length
  const processing = orders.filter((order) => order.status === ORDER_STATUS.PROCESSING).length

  return { pending, processing, total: pending + processing }
}

/**
 * Daily completed-sales totals for each day in the current window, oldest first.
 */
export function calculateDailySales(orders, periods = getDashboardPeriods()) {
  const { now, days } = periods

  const buckets = []
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(now.getTime() - offset * DAY_MS)
    date.setHours(0, 0, 0, 0)
    buckets.push({ date, total: 0 })
  }

  const byKey = new Map(buckets.map((bucket) => [bucket.date.toDateString(), bucket]))

  for (const order of orders) {
    if (order.status !== ORDER_STATUS.COMPLETED || !order.completedAt) continue

    const bucket = byKey.get(new Date(order.completedAt).toDateString())
    if (bucket) bucket.total += Number(order.grandTotal || 0)
  }

  return buckets
}

export function calculateStockHealth(inventory) {
  const health = { inStock: 0, lowStock: 0, outOfStock: 0, total: inventory.length }

  for (const item of inventory) {
    const status = getStockStatus(item)

    if (status === 'out-of-stock') health.outOfStock += 1
    else if (status === 'low-stock') health.lowStock += 1
    else health.inStock += 1
  }

  return health
}
