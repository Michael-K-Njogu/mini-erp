import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import InventoryDetailView from './InventoryDetailView.vue'

const mocks = vi.hoisted(() => ({
  getInventoryItem: vi.fn(),
  getStockMovements: vi.fn(),
  adjustStock: vi.fn(),
}))
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: 'inventory-1' } }),
  useRouter: () => ({ push: vi.fn() }),
}))
vi.mock('../services/inventoryService', () => ({
  getInventoryItem: mocks.getInventoryItem,
  getAvailableQuantity: () => 12,
  getStockStatus: () => 'in-stock',
  adjustStock: mocks.adjustStock,
}))
vi.mock('../services/stockMovementService', () => ({ getStockMovements: mocks.getStockMovements }))

beforeEach(() => {
  vi.resetAllMocks()
  mocks.getInventoryItem.mockResolvedValue({
    productId: 'product-1',
    product: { name: 'Cement', sku: 'C-1' },
    quantityOnHand: 12,
    quantityReserved: 0,
    reorderLevel: 3,
  })
  mocks.getStockMovements.mockResolvedValue([])
})

describe('stock adjustment on inventory detail', () => {
  it('displays errors in the modal and clears them when reopened', async () => {
    mocks.adjustStock.mockRejectedValue(new Error('Adjustment failed'))
    const toolbar = document.createElement('div')
    toolbar.id = 'page-toolbar-root'
    document.body.append(toolbar)
    const wrapper = mount(InventoryDetailView, { attachTo: document.body })
    await flushPromises()
    const open = [...toolbar.querySelectorAll('button')].find((button) =>
      button.textContent.includes('Adjust Stock'),
    )
    open.click()
    await flushPromises()
    const dialog = document.querySelector('[role="dialog"]')
    const quantity = dialog.querySelector('#quantity')
    quantity.value = '2'
    quantity.dispatchEvent(new Event('input', { bubbles: true }))
    const reason = dialog.querySelector('#reason')
    reason.value = 'Count'
    reason.dispatchEvent(new Event('input', { bubbles: true }))
    dialog
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    await flushPromises()
    expect(mocks.adjustStock).toHaveBeenCalledWith({
      productId: 'product-1',
      movementType: 'stock_in',
      quantity: 2,
      reason: 'Count',
      notes: '',
    })
    expect(dialog.querySelector('[role="alert"]').textContent).toBe('Adjustment failed')
    dialog.querySelector('button').click()
    await flushPromises()
    open.click()
    await flushPromises()
    expect(document.querySelector('[role="dialog"] [role="alert"]')).toBeNull()
    wrapper.unmount()
    toolbar.remove()
  })
})
