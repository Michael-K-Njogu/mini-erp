import { describe, it, expect } from 'vitest'
import {
  getDashboardPeriods,
  calculateSalesMetrics,
  calculateOpenOrders,
  calculateDailySales,
  calculateStockHealth,
  calculateChange,
} from './dashboardMetrics'

const NOW = new Date('2026-11-03T12:00:00Z')
const periods = getDashboardPeriods(NOW, 30)
const daysAgo = (n) => new Date(NOW.getTime() - n * 86400000).toISOString()

const orders = [
  {
    id: 1,
    customerId: 'a',
    grandTotal: 100,
    status: 'Completed',
    createdAt: daysAgo(5),
    completedAt: daysAgo(2),
  },
  {
    id: 2,
    customerId: 'a',
    grandTotal: 300,
    status: 'Completed',
    createdAt: daysAgo(10),
    completedAt: daysAgo(8),
  },
  {
    id: 3,
    customerId: 'b',
    grandTotal: 50,
    status: 'Pending',
    createdAt: daysAgo(1),
    completedAt: null,
  },
  {
    id: 4,
    customerId: 'c',
    grandTotal: 200,
    status: 'Completed',
    createdAt: daysAgo(45),
    completedAt: daysAgo(40),
  },
  {
    id: 5,
    customerId: 'd',
    grandTotal: 70,
    status: 'Processing',
    createdAt: daysAgo(90),
    completedAt: null,
  },
]

describe('dashboardMetrics', () => {
  it('summarises the current and previous window', () => {
    const { current, previous, changes } = calculateSalesMetrics(orders, periods)

    expect(current.salesTotal).toBe(400)
    expect(current.completedCount).toBe(2)
    expect(current.averageOrderValue).toBe(200)
    expect(current.ordersCreated).toBe(3)
    expect(current.activeCustomers).toBe(2)

    expect(previous.salesTotal).toBe(200)
    expect(changes.salesTotal).toBe(100)
  })

  it('returns null change without a previous value', () => {
    expect(calculateChange(10, 0)).toBeNull()
  })

  it('counts open orders regardless of age', () => {
    expect(calculateOpenOrders(orders)).toEqual({ pending: 1, processing: 1, total: 2 })
  })

  it('buckets completed sales by day', () => {
    const daily = calculateDailySales(orders, periods)

    expect(daily).toHaveLength(30)
    expect(daily.reduce((sum, d) => sum + d.total, 0)).toBe(400)
  })

  it('classifies stock by available quantity', () => {
    const inventory = [
      { quantityOnHand: 50, quantityReserved: 0, reorderLevel: 10 },
      { quantityOnHand: 12, quantityReserved: 5, reorderLevel: 10 },
      { quantityOnHand: 3, quantityReserved: 3, reorderLevel: 10 },
    ]

    expect(calculateStockHealth(inventory)).toEqual({
      inStock: 1,
      lowStock: 1,
      outOfStock: 1,
      total: 3,
    })
  })
})
