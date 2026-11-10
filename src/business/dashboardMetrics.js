import { ORDER_STATUS } from '../constants/orderStatuses'
import { getStockStatus } from '../services/inventoryService'

export const DASHBOARD_WINDOW_DAYS = 30
export const MAX_DASHBOARD_DAYS = 366

function localDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function shiftDays(date, days) {
  const result = localDay(date)
  result.setDate(result.getDate() + days)
  return result
}

export function formatLocalDate(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function parseLocalDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const result = new Date(year, month - 1, day)
  return formatLocalDate(result) === value ? result : null
}

export function getDateRange(startValue, endValue) {
  const currentStart = parseLocalDate(startValue)
  const lastDay = parseLocalDate(endValue)
  if (!currentStart || !lastDay || lastDay < currentStart) {
    throw new Error('Choose a valid start date on or before the end date.')
  }
  const days =
    Math.round(
      (Date.UTC(lastDay.getFullYear(), lastDay.getMonth(), lastDay.getDate()) -
        Date.UTC(currentStart.getFullYear(), currentStart.getMonth(), currentStart.getDate())) /
        86400000,
    ) + 1
  if (days > MAX_DASHBOARD_DAYS) throw new Error('Choose a date range of 366 days or fewer.')
  return {
    currentStart,
    currentEnd: shiftDays(lastDay, 1),
    previousStart: shiftDays(currentStart, -days),
    days,
  }
}

export function getDashboardPeriods(now = new Date(), days = DASHBOARD_WINDOW_DAYS) {
  const end = localDay(now)
  return getDateRange(formatLocalDate(shiftDays(end, 1 - days)), formatLocalDate(end))
}

export function inDashboardRange(value, start, end) {
  if (!value) return false
  const time = new Date(value).getTime()
  return time >= start.getTime() && time < end.getTime()
}

function summarisePeriod(orders, customers, start, end) {
  const created = orders.filter((order) => inDashboardRange(order.createdAt, start, end))
  const completed = orders.filter(
    (order) =>
      order.status === ORDER_STATUS.COMPLETED && inDashboardRange(order.completedAt, start, end),
  )
  const salesTotal = completed.reduce((sum, order) => sum + Number(order.grandTotal || 0), 0)
  return {
    ordersCreated: created.length,
    salesTotal,
    completedCount: completed.length,
    newCustomers: customers.filter((customer) => inDashboardRange(customer.createdAt, start, end))
      .length,
    averageOrderValue: completed.length ? salesTotal / completed.length : 0,
    activeCustomers: new Set(created.map((order) => order.customerId).filter(Boolean)).size,
  }
}

export function calculateChange(current, previous) {
  if (!previous) return null
  return ((current - previous) / previous) * 100
}

export function calculateSalesMetrics(orders, periods = getDashboardPeriods(), customers = []) {
  const { currentEnd, currentStart, previousStart } = periods
  const current = summarisePeriod(orders, customers, currentStart, currentEnd)
  const previous = summarisePeriod(orders, customers, previousStart, currentStart)
  return {
    current,
    previous,
    changes: Object.fromEntries(
      Object.keys(current).map((key) => [key, calculateChange(current[key], previous[key])]),
    ),
  }
}

export function calculateOpenOrders(orders) {
  const pending = orders.filter((order) => order.status === ORDER_STATUS.PENDING).length
  const processing = orders.filter((order) => order.status === ORDER_STATUS.PROCESSING).length
  return { pending, processing, total: pending + processing }
}

export function calculateDailySales(orders, periods = getDashboardPeriods()) {
  const buckets = Array.from({ length: periods.days }, (_, index) => ({
    date: shiftDays(periods.currentStart, index),
    total: 0,
  }))
  const byKey = new Map(buckets.map((bucket) => [formatLocalDate(bucket.date), bucket]))
  for (const order of orders) {
    if (
      order.status !== ORDER_STATUS.COMPLETED ||
      !inDashboardRange(order.completedAt, periods.currentStart, periods.currentEnd)
    )
      continue
    const bucket = byKey.get(formatLocalDate(new Date(order.completedAt)))
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

export function ordersCreatedInRange(orders, periods) {
  return orders.filter((order) =>
    inDashboardRange(order.createdAt, periods.currentStart, periods.currentEnd),
  )
}

export function calculateTopCustomers(orders, periods) {
  const totals = new Map()
  for (const order of orders) {
    if (
      !order.customerId ||
      order.status !== ORDER_STATUS.COMPLETED ||
      !inDashboardRange(order.completedAt, periods.currentStart, periods.currentEnd)
    )
      continue
    const current = totals.get(order.customerId) || {
      id: order.customerId,
      name: order.customerName || 'Customer unavailable',
      total: 0,
    }
    current.total += order.grandTotal
    totals.set(order.customerId, current)
  }
  return [...totals.values()]
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name))
    .slice(0, 5)
}
