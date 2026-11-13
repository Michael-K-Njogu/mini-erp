import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, describe, expect, it, vi } from 'vitest'
import ProductTour from './ProductTour.vue'

const steps = [
  { title: 'Welcome', description: 'Introduction' },
  { title: 'Customers', description: 'Manage customers', selector: '[data-tour-nav="/customers"]' },
]
let wrapper

afterEach(() => {
  wrapper?.unmount()
  document.querySelectorAll('[data-tour-test]').forEach((element) => element.remove())
})

describe('product tour dialog', () => {
  it('focuses an initially open dialog, traps focus and supports keyboard navigation', async () => {
    wrapper = mount(ProductTour, { props: { open: true, steps }, attachTo: document.body })
    await flushPromises()
    expect(document.activeElement.id).toBe('product-tour-title')
    const buttons = document.querySelectorAll('.tour-dialog button')
    document.activeElement.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true }),
    )
    expect(document.activeElement).toBe(buttons[buttons.length - 1])
    buttons[buttons.length - 1].click()
    await flushPromises()
    expect(document.activeElement.textContent).toBe('Customers')
    expect(document.querySelector('.tour-progress').textContent).toContain('2 of 2')
    document.activeElement.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    )
    expect(wrapper.emitted('finish')).toHaveLength(1)
  })

  it('highlights the current navigation target and the mobile menu on mobile', async () => {
    const desktopTarget = document.createElement('a')
    desktopTarget.setAttribute('data-tour-test', '')
    desktopTarget.setAttribute('data-tour-nav', '/customers')
    desktopTarget.getBoundingClientRect = vi.fn(() => ({
      top: 20,
      left: 30,
      width: 100,
      height: 40,
    }))
    document.body.append(desktopTarget)
    const mobileTarget = document.createElement('button')
    mobileTarget.className = 'mobile-navigation-toggle'
    mobileTarget.setAttribute('data-tour-test', '')
    mobileTarget.getBoundingClientRect = vi.fn(() => ({ top: 10, left: 10, width: 44, height: 44 }))
    document.body.append(mobileTarget)

    wrapper = mount(ProductTour, { props: { open: true, steps }, attachTo: document.body })
    await flushPromises()
    expect(document.querySelector('.tour-highlight')).toBeNull()
    document.querySelector('.tour-actions__steps button').click()
    await flushPromises()
    expect(document.querySelector('.tour-highlight').style.width).toBe('108px')
    await wrapper.setProps({ mobile: true })
    await flushPromises()
    expect(document.querySelector('.tour-highlight').style.width).toBe('52px')
    expect(document.querySelector('.tour-mobile-hint').textContent).toContain('navigation menu')
  })
})
