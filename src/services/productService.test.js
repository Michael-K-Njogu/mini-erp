import { describe, expect, it, vi } from 'vitest'
import { updateProduct } from './productService'

const mocks = vi.hoisted(() => ({ patch: vi.fn() }))
vi.mock('../api/apiClient', () => ({ apiClient: { patch: mocks.patch } }))

describe('updateProduct', () => {
  it('does not overwrite stock from a stale product form', async () => {
    mocks.patch.mockResolvedValue([{ id: 'product-1', stock_quantity: 9 }])
    await updateProduct('product-1', {
      name: 'Cement',
      sku: 'CEM-001',
      stockQuantity: 12,
    })
    expect(mocks.patch).toHaveBeenCalledOnce()
    expect(mocks.patch.mock.calls[0][1]).not.toHaveProperty('stock_quantity')
  })
})
