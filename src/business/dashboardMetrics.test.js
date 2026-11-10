import { describe, it, expect } from 'vitest'
import {
  getDashboardPeriods,
  calculateSalesMetrics,
  calculateOpenOrders,
  calculateDailySales,
  calculateStockHealth,
  calculateChange,
  getDateRange,
  formatLocalDate,
  ordersCreatedInRange,
  calculateTopCustomers,
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

  it('uses inclusive local calendar dates and an equal preceding period', () => {
    const range = getDateRange('2024-03-09', '2024-03-11')
    expect(range.days).toBe(3)
    expect(formatLocalDate(range.previousStart)).toBe('2024-03-06')
    expect(formatLocalDate(range.currentEnd)).toBe('2024-03-12')
    const at = (year, month, day, hour = 0) => new Date(year, month - 1, day, hour).toISOString()
    const sample = [
      {
        createdAt: at(2024, 3, 8, 23),
        completedAt: at(2024, 3, 9),
        status: 'Completed',
        grandTotal: 10,
        customerId: 'a',
      },
      {
        createdAt: at(2024, 3, 9),
        completedAt: at(2024, 3, 11, 23),
        status: 'Completed',
        grandTotal: 20,
        customerId: 'b',
      },
      {
        createdAt: at(2024, 3, 12),
        completedAt: at(2024, 3, 12),
        status: 'Completed',
        grandTotal: 30,
        customerId: 'c',
      },
    ]
    const customers = [{ createdAt: at(2024, 3, 9) }, { createdAt: at(2024, 3, 12) }]
    expect(ordersCreatedInRange(sample, range)).toHaveLength(1)
    expect(calculateSalesMetrics(sample, range, customers).current).toMatchObject({
      salesTotal: 30,
      completedCount: 2,
      ordersCreated: 1,
      newCustomers: 1,
    })
    expect(calculateDailySales(sample, range).map((day) => day.total)).toEqual([10, 0, 20])
  })

  it('validates custom dates and allows at most 366 inclusive days', () => {
    expect(getDateRange('2024-01-01', '2024-12-31').days).toBe(366)
    expect(() => getDateRange('2024-01-01', '2025-01-01')).toThrow('366')
    expect(() => getDateRange('2024-02-30', '2024-03-01')).toThrow('valid')
    expect(() => getDateRange('2024-03-02', '2024-03-01')).toThrow('valid')
  })

  it('ranks up to five customers by completed sales in the chosen period', () => {
    const range = getDateRange('2024-01-01', '2024-01-31')
    const sample = Array.from({ length: 6 }, (_, index) => ({
      customerId: String(index),
      customerName: `Customer ${index}`,
      grandTotal: index + 1,
      status: 'Completed',
      completedAt: new Date(2024, 0, 10).toISOString(),
    }))
    sample.push(
      { ...sample[0], grandTotal: 10 },
      { ...sample[5], status: 'Pending', grandTotal: 100 },
    )
    expect(calculateTopCustomers(sample, range).map((item) => [item.id, item.total])).toEqual([
      ['0', 11],
      ['5', 6],
      ['4', 5],
      ['3', 4],
      ['2', 3],
    ])
  })
})
