import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getInventory, getInventoryItem } from './inventoryService'

const mocks = vi.hoisted(() => ({ getRaw: vi.fn(), get: vi.fn() }))
vi.mock('../api/apiClient', () => ({ apiClient: { getRaw: mocks.getRaw, get: mocks.get } }))

const response = (data, total) => ({
  data,
  response: { headers: { get: () => `0-0/${total}` } },
})

beforeEach(() => {
  mocks.getRaw.mockReset()
  mocks.get.mockReset()
})

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
            },
          ],
          1,
        ),
      )
      .mockResolvedValueOnce(response([{ id: 'p1', name: 'Cement', sku: 'C-1' }], 2))
      .mockResolvedValueOnce(response([{ id: 'p2', name: 'Steel', sku: 'S-1' }], 1))
    const inventory = await getInventory()
    expect(inventory).toHaveLength(2)
    expect(inventory[0]).toMatchObject({
      product: { name: 'Cement', sku: 'C-1' },
      quantityOnHand: 5,
      quantityReserved: 2,
    })
    expect(mocks.getRaw.mock.calls[1][0]).toContain('id=gt.1')
    const productQuery = new URLSearchParams(mocks.getRaw.mock.calls[2][0].split('?')[1])
    expect(productQuery.get('or')).toBe('(id.in.(p1,p2))')
    const nextProductQuery = new URLSearchParams(mocks.getRaw.mock.calls[3][0].split('?')[1])
    expect(nextProductQuery.get('or')).toBe('(id.in.(p1,p2))')
    expect(nextProductQuery.get('id')).toBe('gt.p1')
  })

  it('reports an incomplete dataset instead of silently truncating it', async () => {
    mocks.getRaw.mockResolvedValue(response([], 2))
    await expect(getInventory()).rejects.toThrow('Unable to load all inventory')
  })

  it('fails visibly when a linked product is inaccessible', async () => {
    mocks.getRaw
      .mockResolvedValueOnce(response([{ id: '1', product_id: 'p1' }], 1))
      .mockResolvedValueOnce(response([], 0))
    await expect(getInventory()).rejects.toThrow('Unable to load a product linked to inventory')
  })

  it('loads referenced products in bounded batches', async () => {
    const inventory = Array.from({ length: 101 }, (_, index) => ({
      id: `${index}`,
      product_id: `p${index}`,
    }))
    const products = inventory.map((item) => ({
      id: item.product_id,
      name: item.product_id,
      sku: item.product_id,
    }))
    mocks.getRaw
      .mockResolvedValueOnce(response(inventory, 101))
      .mockResolvedValueOnce(response(products.slice(0, 100), 100))
      .mockResolvedValueOnce(response(products.slice(100), 1))
    expect(await getInventory()).toHaveLength(101)
    expect(mocks.getRaw).toHaveBeenCalledTimes(3)
  })
})

describe('getInventoryItem', () => {
  it('loads and maps its product', async () => {
    mocks.get
      .mockResolvedValueOnce([{ id: 'i1', product_id: 'p1', quantity_on_hand: 5 }])
      .mockResolvedValueOnce([{ id: 'p1', name: 'Cement', sku: 'C-1' }])
    expect(await getInventoryItem('i1')).toMatchObject({
      product: { id: 'p1', name: 'Cement', sku: 'C-1' },
      quantityOnHand: 5,
    })
  })

  it('reports a missing product rather than returning an unknown product', async () => {
    mocks.get.mockResolvedValueOnce([{ id: 'i1', product_id: 'p1' }]).mockResolvedValueOnce([])
    await expect(getInventoryItem('i1')).rejects.toThrow('Unable to load the product linked')
  })
})
