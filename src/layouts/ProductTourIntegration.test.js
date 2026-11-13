import { flushPromises, mount } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppLayout from './AppLayout.vue'
import ProductTour from '../components/ProductTour.vue'
import { PERMISSION } from '../constants/permissions'

const user = ref({ id: 'user-1' })
const permissions = ref([])
const getCompletion = vi.fn()
const completeTour = vi.fn()
const showError = vi.fn()
const route = reactive({ fullPath: '/' })

vi.mock('vue-router', () => ({ useRoute: () => route }))
vi.mock('../composables/useSidebar.js', () => ({
  useSidebar: () => ({ collapsed: ref(false) }),
}))
vi.mock('../composables/useAuth', () => ({ useAuth: () => ({ user }) }))
vi.mock('../composables/usePermissions', () => ({
  usePermissions: () => ({ hasPermission: (permission) => permissions.value.includes(permission) }),
}))
vi.mock('../composables/useToast', () => ({ useToast: () => ({ error: showError }) }))
vi.mock('../services/productTourService', () => ({
  PRODUCT_TOUR_VERSION: 1,
  getProductTourCompletion: (...args) => getCompletion(...args),
  completeProductTour: (...args) => completeTour(...args),
}))
vi.mock('./AppHeader.vue', () => ({ default: { name: 'AppHeader' } }))
vi.mock('./AppSidebar.vue', () => ({ default: { name: 'AppSidebar' } }))
vi.mock('../components/DemoBanner.vue', () => ({ default: { name: 'DemoBanner' } }))

let wrapper
const mountLayout = async () => {
  wrapper = mount(AppLayout, {
    attachTo: document.body,
    global: {
      stubs: {
        AppHeader: {
          emits: ['start-tour'],
          template: '<button class="replay" @click="$emit(\'start-tour\')">Tour</button>',
        },
        AppSidebar: true,
        DemoBanner: true,
        RouterView: true,
      },
    },
  })
  await flushPromises()
}

beforeEach(() => {
  vi.resetAllMocks()
  user.value = { id: 'user-1' }
  permissions.value = [PERMISSION.CUSTOMER_VIEW, PERMISSION.INVENTORY_VIEW]
  getCompletion.mockResolvedValue(0)
  completeTour.mockResolvedValue()
  vi.stubGlobal('matchMedia', () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }))
})

afterEach(() => {
  wrapper?.unmount()
  vi.unstubAllGlobals()
})

describe('product tour integration', () => {
  it('omits inventory when the user cannot view it', async () => {
    permissions.value = [PERMISSION.CUSTOMER_VIEW]
    await mountLayout()
    expect(
      wrapper
        .getComponent(ProductTour)
        .props('steps')
        .map((step) => step.title),
    ).not.toContain('Inventory')
  })

  it('starts for an unseen account and includes only permitted pages', async () => {
    await mountLayout()
    const tour = wrapper.getComponent(ProductTour)
    expect(tour.props('open')).toBe(true)
    expect(tour.props('steps').map((step) => step.title)).toEqual([
      'Welcome to Mini-ERP',
      'Dashboard',
      'Customers',
      'Inventory',
      'You are ready',
    ])
    expect(wrapper.get('.app-layout').attributes()).toHaveProperty('inert')
    expect(document.querySelector('[role="dialog"] h2').textContent).toBe('Welcome to Mini-ERP')
    expect(document.activeElement.id).toBe('product-tour-title')
  })

  it('saves skipping and offers replay without changing the route', async () => {
    await mountLayout()
    document.querySelector('.tour-actions button').click()
    await flushPromises()
    expect(completeTour).toHaveBeenCalledWith('user-1')
    expect(wrapper.getComponent(ProductTour).props('open')).toBe(false)
    expect(wrapper.get('.app-layout').attributes()).not.toHaveProperty('inert')
    await wrapper.get('.replay').trigger('click')
    expect(wrapper.getComponent(ProductTour).props('open')).toBe(true)
    expect(route.fullPath).toBe('/')
  })

  it('does not automatically start a completed tour', async () => {
    getCompletion.mockResolvedValue(1)
    await mountLayout()
    expect(wrapper.getComponent(ProductTour).props('open')).toBe(false)
    await wrapper.get('.replay').trigger('click')
    expect(wrapper.getComponent(ProductTour).props('open')).toBe(true)
  })

  it('can finish every step and saves completion for the signed-in user', async () => {
    await mountLayout()
    for (let i = 0; i < 4; i += 1) {
      const next = [...document.querySelectorAll('.tour-dialog button')].find(
        (button) => button.textContent.trim() === 'Next',
      )
      next.click()
      await flushPromises()
    }
    expect(document.querySelector('.tour-progress').textContent).toContain('5 of 5')
    const finish = [...document.querySelectorAll('.tour-dialog button')].find(
      (button) => button.textContent.trim() === 'Finish',
    )
    finish.click()
    await flushPromises()
    expect(completeTour).toHaveBeenCalledOnce()
    expect(completeTour).toHaveBeenCalledWith('user-1')
    expect(wrapper.getComponent(ProductTour).props('open')).toBe(false)
  })

  it('shows a save error and lets the user retry or close without saving', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    completeTour.mockRejectedValueOnce(new Error('Network failed'))
    await mountLayout()
    document.querySelector('.tour-actions button').click()
    await flushPromises()
    expect(document.querySelector('[role="alert"]').textContent).toContain('Unable to save')
    expect(wrapper.getComponent(ProductTour).props('open')).toBe(true)
    document.querySelector('.tour-close-unsaved').click()
    await flushPromises()
    expect(showError).toHaveBeenCalledWith(
      'Tour progress was not saved; the tour may appear again.',
    )
    expect(wrapper.getComponent(ProductTour).props('open')).toBe(false)
    log.mockRestore()
  })

  it('ignores a completion response from a previous user', async () => {
    let resolveFirst
    getCompletion.mockImplementationOnce(() => new Promise((resolve) => (resolveFirst = resolve)))
    getCompletion.mockResolvedValueOnce(1)
    await mountLayout()
    user.value = { id: 'user-2' }
    await flushPromises()
    resolveFirst(0)
    await flushPromises()
    expect(wrapper.getComponent(ProductTour).props('open')).toBe(false)
  })

  it('does not reopen the tour when a pending initial read completes after replay', async () => {
    let resolveRead
    getCompletion.mockImplementationOnce(() => new Promise((resolve) => (resolveRead = resolve)))
    await mountLayout()
    await wrapper.get('.replay').trigger('click')
    document.querySelector('.tour-actions button').click()
    await flushPromises()
    expect(wrapper.getComponent(ProductTour).props('open')).toBe(false)
    resolveRead(0)
    await flushPromises()
    expect(wrapper.getComponent(ProductTour).props('open')).toBe(false)
  })

  it('reports a read failure and keeps the replay button usable', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    getCompletion.mockRejectedValue(new Error('Read failed'))
    await mountLayout()
    expect(showError).toHaveBeenCalledWith(
      'Unable to load tour progress. You can start the tour from the help button.',
    )
    expect(wrapper.getComponent(ProductTour).props('open')).toBe(false)
    await wrapper.get('.replay').trigger('click')
    expect(wrapper.getComponent(ProductTour).props('open')).toBe(true)
    log.mockRestore()
  })
})
