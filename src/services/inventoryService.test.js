import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getInventory } from './inventoryService'

const mocks = vi.hoisted(() => ({ getRaw: vi.fn() }))
vi.mock('../api/apiClient', () => ({ apiClient: { getRaw: mocks.getRaw } }))

const response = (data, total) => ({
  data,
  response: { headers: { get: () => `0-0/${total}` } },
})

beforeEach(() => mocks.getRaw.mockReset())

describe('getInventory', () => {
  it('loads all pages and maps product and stock data', async () => {
    mocks.getRaw
      .mockResolvedValueOnce(
        response(
          [
            {
              id: '1',
              product_id: 'p1',
              quantity_on_hand: 5,
              quantity_reserved: 2,
              reorder_level: 1,
              product: { id: 'p1', name: 'Cement', sku: 'C-1' },
            },
          ],
          2,
        ),
      )
      .mockResolvedValueOnce(
        response(
          [
            {
              id: '2',
              product_id: 'p2',
              quantity_on_hand: 9,
              quantity_reserved: 1,
              reorder_level: 2,
              product: { id: 'p2', name: 'Steel', sku: 'S-1' },
            },
          ],
          1,
        ),
      )
    const inventory = await getInventory()
    expect(inventory).toHaveLength(2)
    expect(inventory[0]).toMatchObject({
      product: { name: 'Cement', sku: 'C-1' },
      quantityOnHand: 5,
      quantityReserved: 2,
    })
    expect(mocks.getRaw.mock.calls[1][0]).toContain('id=gt.1')
  })

  it('reports an incomplete dataset instead of silently truncating it', async () => {
    mocks.getRaw.mockResolvedValue(response([], 2))
    await expect(getInventory()).rejects.toThrow('Unable to load all inventory')
  })
})
