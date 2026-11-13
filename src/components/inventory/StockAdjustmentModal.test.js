import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import StockAdjustmentModal from './StockAdjustmentModal.vue'

let wrapper

afterEach(() => {
  wrapper?.unmount()
})

const mountModal = async (props = {}) => {
  wrapper = mount(StockAdjustmentModal, {
    attachTo: document.body,
    props: { open: true, product: { name: 'Cement' }, availableQuantity: 12, ...props },
  })
  await flushPromises()
  return document.querySelector('[role="dialog"]')
}

describe('stock adjustment modal', () => {
  it('displays the product and stock, associates labels, and focuses the first field', async () => {
    const dialog = await mountModal()
    expect(dialog.textContent).toContain('Cement')
    expect(dialog.textContent).toContain('Available stock')
    expect(dialog.textContent).toContain('12')
    expect(dialog.getAttribute('aria-labelledby')).toBe('adjustment-title')
    for (const id of ['movement-type', 'quantity', 'reason', 'notes']) {
      expect(dialog.querySelector(`#${id}`).labels).toHaveLength(1)
    }
    expect(document.activeElement.id).toBe('movement-type')
  })

  it('emits the original adjustment payload and resets when reopened', async () => {
    await mountModal()
    const dialog = document.querySelector('[role="dialog"]')
    const change = (selector, value, event) => {
      const field = dialog.querySelector(selector)
      field.value = value
      field.dispatchEvent(new Event(event, { bubbles: true }))
    }
    change('#movement-type', 'stock_out', 'change')
    change('#quantity', '2.5', 'input')
    change('#reason', '  Damaged  ', 'input')
    change('#notes', '  Packaging  ', 'input')
    dialog
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    expect(wrapper.emitted('submit')).toEqual([
      [{ movementType: 'stock_out', quantity: 2.5, reason: 'Damaged', notes: 'Packaging' }],
    ])
    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })
    await flushPromises()
    expect(document.querySelector('#movement-type').value).toBe('stock_in')
    expect(document.querySelector('#quantity').value).toBe('')
    expect(document.querySelector('#reason').value).toBe('')
    expect(document.querySelector('#notes').value).toBe('')
  })

  it('shows adjustment errors inside the dialog and prevents actions while saving', async () => {
    const dialog = await mountModal({ loading: true, error: 'Unable to adjust stock.' })
    expect(dialog.querySelector('[role="alert"]').textContent).toBe('Unable to adjust stock.')
    expect(dialog.textContent).toContain('Saving...')
    expect(
      [...dialog.querySelectorAll('button, input, select, textarea')].every((el) => el.disabled),
    ).toBe(true)
    dialog
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(wrapper.emitted('submit')).toBeUndefined()
    expect(wrapper.emitted('close')).toBeUndefined()
  })

  it('traps keyboard focus and closes with Escape', async () => {
    const dialog = await mountModal()
    const first = dialog.querySelector('#movement-type')
    const last = dialog.querySelector('button[type="submit"]')
    expect(document.activeElement).toBe(first)
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }))
    expect(document.activeElement).toBe(last)
    last.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
    expect(document.activeElement).toBe(first)
    first.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
