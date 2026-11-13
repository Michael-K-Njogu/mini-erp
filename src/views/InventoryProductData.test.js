import { flushPromises, mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import InventoryView from './InventoryView.vue'

const mocks = vi.hoisted(() => ({ getRaw: vi.fn() }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('../api/apiClient', () => ({ apiClient: { getRaw: mocks.getRaw } }))

describe('inventory product data', () => {
  it('displays and searches the product name and SKU returned by the product lookup', async () => {
    const response = (data) => ({
      data,
      response: { headers: { get: () => '0-0/1' } },
    })
    mocks.getRaw
      .mockResolvedValueOnce(
        response([
          {
            id: 'inventory-1',
            product_id: 'product-1',
            quantity_on_hand: 8.5,
            quantity_reserved: 3.5,
            reorder_level: 6,
          },
        ]),
      )
      .mockResolvedValueOnce(
        response([{ id: 'product-1', name: 'Washed Building Sand', sku: 'AGG-101' }]),
      )

    const toolbar = document.createElement('div')
    toolbar.id = 'page-toolbar-root'
    document.body.append(toolbar)
    const wrapper = mount(InventoryView, { attachTo: document.body })
    await flushPromises()
    expect(wrapper.text()).toContain('Washed Building Sand')
    expect(wrapper.text()).toContain('AGG-101')
    expect(wrapper.text()).not.toContain('Unknown product')
    const search = toolbar.querySelector('input[type="search"]')
    search.value = 'AGG-101'
    search.dispatchEvent(new Event('input', { bubbles: true }))
    await flushPromises()
    expect(wrapper.text()).toContain('Washed Building Sand')
    wrapper.unmount()
    toolbar.remove()
  })
})
