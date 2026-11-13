import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import InventoryView from './InventoryView.vue'

const mocks = vi.hoisted(() => ({ getInventory: vi.fn() }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('../services/inventoryService', () => ({
  getInventory: mocks.getInventory,
  getAvailableQuantity: (item) => item.quantityOnHand - item.quantityReserved,
  getStockStatus: (item) => (item.quantityOnHand <= item.reorderLevel ? 'low-stock' : 'in-stock'),
}))

beforeEach(() => {
  mocks.getInventory.mockReset()
  mocks.getInventory.mockResolvedValue([
    {
      id: '1',
      product: { name: 'Cement', sku: 'CEM-001' },
      quantityOnHand: 10,
      quantityReserved: 0,
      reorderLevel: 2,
    },
    {
      id: '2',
      product: { name: 'Steel', sku: 'STL-001' },
      quantityOnHand: 2,
      quantityReserved: 0,
      reorderLevel: 2,
    },
  ])
})

afterEach(() => {
  document.querySelector('#page-toolbar-root')?.remove()
})

describe('inventory search', () => {
  it('renders an accessible search and filters by name or SKU', async () => {
    const toolbar = document.createElement('div')
    toolbar.id = 'page-toolbar-root'
    document.body.append(toolbar)
    const wrapper = mount(InventoryView, { attachTo: document.body })
    await flushPromises()
    const search = toolbar.querySelector(
      'input[aria-label="Search inventory by product name or SKU"]',
    )
    expect(search).not.toBeNull()
    search.value = 'stl'
    search.dispatchEvent(new Event('input', { bubbles: true }))
    await flushPromises()
    expect(wrapper.text()).toContain('Steel')
    expect(wrapper.text()).not.toContain('Cement')
    search.value = 'cement'
    search.dispatchEvent(new Event('input', { bubbles: true }))
    await flushPromises()
    expect(wrapper.text()).toContain('Cement')
    expect(wrapper.text()).not.toContain('Steel')
    wrapper.unmount()
    toolbar.remove()
  })

  it('filters using the accessible stock-level select', async () => {
    const toolbar = document.createElement('div')
    toolbar.id = 'page-toolbar-root'
    document.body.append(toolbar)
    const wrapper = mount(InventoryView, { attachTo: document.body })
    await flushPromises()
    const select = toolbar.querySelector('select[aria-label="Filter by stock level"]')
    expect(select).not.toBeNull()
    select.value = 'low-stock'
    select.dispatchEvent(new Event('change', { bubbles: true }))
    await flushPromises()
    expect(wrapper.text()).toContain('Steel')
    expect(wrapper.text()).not.toContain('Cement')
    wrapper.unmount()
  })

  it('refreshes inventory without resetting filters and prevents overlapping loads', async () => {
    const toolbar = document.createElement('div')
    toolbar.id = 'page-toolbar-root'
    document.body.append(toolbar)
    const wrapper = mount(InventoryView, { attachTo: document.body })
    await flushPromises()
    const search = toolbar.querySelector('input[type="search"]')
    search.value = 'cement'
    search.dispatchEvent(new Event('input', { bubbles: true }))
    await flushPromises()

    let resolveRefresh
    mocks.getInventory.mockReturnValueOnce(new Promise((resolve) => (resolveRefresh = resolve)))
    const button = toolbar.querySelector('button[aria-label="Refresh"]')
    button.click()
    await flushPromises()
    expect(button.disabled).toBe(true)
    expect(button.getAttribute('aria-label')).toBe('Refreshing...')
    button.click()
    expect(mocks.getInventory).toHaveBeenCalledTimes(2)
    resolveRefresh([
      {
        id: '3',
        product: { name: 'Fresh Cement', sku: 'CEM-002' },
        quantityOnHand: 12,
        quantityReserved: 0,
        reorderLevel: 2,
      },
    ])
    await flushPromises()
    expect(button.disabled).toBe(false)
    expect(button.getAttribute('aria-label')).toBe('Refresh')
    expect(search.value).toBe('cement')
    expect(wrapper.text()).toContain('Fresh Cement')
    expect(wrapper.text()).not.toContain('Steel')
    wrapper.unmount()
  })

  it('reports refresh errors and allows retrying', async () => {
    const toolbar = document.createElement('div')
    toolbar.id = 'page-toolbar-root'
    document.body.append(toolbar)
    const wrapper = mount(InventoryView, { attachTo: document.body })
    await flushPromises()
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.getInventory.mockRejectedValueOnce(new Error('Inventory unavailable'))
    const button = toolbar.querySelector('button[aria-label="Refresh"]')
    button.click()
    await flushPromises()
    expect(wrapper.text()).toContain('Inventory unavailable')
    expect(button.disabled).toBe(false)
    button.click()
    await flushPromises()
    expect(wrapper.text()).toContain('Cement')
    expect(wrapper.text()).not.toContain('Inventory unavailable')
    log.mockRestore()
    wrapper.unmount()
  })
})
