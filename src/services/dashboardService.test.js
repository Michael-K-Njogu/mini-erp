import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getDashboardCustomers,
  getDashboardInventory,
  getDashboardOrders,
} from './dashboardService'
import { apiClient } from '../api/apiClient'

vi.mock('../api/apiClient', () => ({ apiClient: { getRaw: vi.fn() } }))

const dates = { since: new Date('2024-01-01T00:00:00Z'), until: new Date('2024-03-01T00:00:00Z') }
const page = (data, count) => ({
  data,
  response: { headers: { get: () => (count === null ? null : `0-${data.length - 1}/${count}`) } },
})

beforeEach(() => vi.resetAllMocks())

describe('dashboard pagination', () => {
  it('follows server-limited pages using ids and maps orders', async () => {
    apiClient.getRaw
      .mockResolvedValueOnce(
        page(
          [
            {
              id: 'a',
              order_number: 'SO-1',
              customers: { name: 'Customer' },
              total_amount: '12.5',
            },
          ],
          2,
        ),
      )
      .mockResolvedValueOnce(page([{ id: 'b', total_amount: '3' }], 1))
    const result = await getDashboardOrders(dates)
    expect(result).toHaveLength(2)
    expect(result[0]).toMatchObject({
      orderNumber: 'SO-1',
      customerName: 'Customer',
      grandTotal: 12.5,
    })
    const [url, options] = apiClient.getRaw.mock.calls[1]
    const params = new URLSearchParams(url.split('?')[1])
    expect(params.get('id')).toBe('gt.a')
    expect(params.get('or')).toContain('created_at.lt.2024-03-01T00:00:00.000Z')
    expect(options.headers.Prefer).toBe('count=exact')
  })

  it('handles empty datasets and maps inventory and customer records', async () => {
    apiClient.getRaw
      .mockResolvedValueOnce(page([], 0))
      .mockResolvedValueOnce(page([{ id: 'x', quantity_on_hand: '4', quantity_reserved: '1' }], 1))
    expect(await getDashboardCustomers(dates)).toEqual([])
    expect(await getDashboardInventory({})).toEqual([
      { quantityOnHand: 4, quantityReserved: 1, reorderLevel: 0 },
    ])
  })

  it('rejects missing counts, concurrent changes, duplicate ids and failed requests', async () => {
    apiClient.getRaw.mockResolvedValueOnce(page([], null))
    await expect(getDashboardInventory({})).rejects.toThrow('verify')
    apiClient.getRaw
      .mockResolvedValueOnce(page([{ id: 'a' }], 2))
      .mockResolvedValueOnce(page([{ id: 'b' }], 2))
    await expect(getDashboardInventory({})).rejects.toThrow('changed')
    apiClient.getRaw
      .mockResolvedValueOnce(page([{ id: 'a' }], 2))
      .mockResolvedValueOnce(page([{ id: 'a' }], 1))
    await expect(getDashboardInventory({})).rejects.toThrow('verify')
    apiClient.getRaw.mockRejectedValueOnce(new Error('Network failed'))
    await expect(getDashboardInventory({})).rejects.toThrow('Network failed')
  })

  it('does not request customer names without customer permission', async () => {
    apiClient.getRaw.mockResolvedValueOnce(page([], 0))
    await getDashboardOrders({ ...dates, includeCustomerNames: false })
    expect(
      new URLSearchParams(apiClient.getRaw.mock.calls[0][0].split('?')[1]).get('select'),
    ).not.toContain('customers(name)')
  })
})
