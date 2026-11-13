import { describe, expect, it, vi } from 'vitest'
import { getStockMovements } from './stockMovementService'

const mocks = vi.hoisted(() => ({ getRaw: vi.fn() }))
vi.mock('../api/apiClient', () => ({ apiClient: { getRaw: mocks.getRaw } }))

describe('stock movement history', () => {
  it('loads all pages and displays the newest movements first', async () => {
    mocks.getRaw
      .mockResolvedValueOnce({
        data: [{ id: '1', quantity: 1, created_at: '2026-01-01T00:00:00Z' }],
        response: { headers: { get: () => '0-0/2' } },
      })
      .mockResolvedValueOnce({
        data: [{ id: '2', quantity: 2, created_at: '2026-02-01T00:00:00Z' }],
        response: { headers: { get: () => '0-0/1' } },
      })
    const movements = await getStockMovements('product-1')
    expect(movements.map((item) => item.id)).toEqual(['2', '1'])
    expect(mocks.getRaw.mock.calls[0][0]).toContain('product_id=eq.product-1')
    expect(mocks.getRaw.mock.calls[1][0]).toContain('id=gt.1')
  })
})
