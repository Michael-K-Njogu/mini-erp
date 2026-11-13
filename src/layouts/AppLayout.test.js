import { mount } from '@vue/test-utils'
import { reactive, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import AppLayout from './AppLayout.vue'

const route = reactive({ fullPath: '/' })
const collapsed = ref(false)
const user = ref({ id: 'user-1' })
const permissions = ref([])
const getCompletion = vi.fn()
const completeTour = vi.fn()
const showError = vi.fn()

vi.mock('vue-router', () => ({ useRoute: () => route }))
vi.mock('../composables/useSidebar.js', () => ({ useSidebar: () => ({ collapsed }) }))
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

describe('responsive navigation', () => {
  let viewport
  let wrapper

  beforeEach(() => {
    vi.clearAllMocks()
    route.fullPath = '/'
    collapsed.value = false
    user.value = { id: 'user-1' }
    permissions.value = []
    getCompletion.mockResolvedValue(1)
    viewport = {
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => viewport),
    )
    wrapper = mount(AppLayout, {
      attachTo: document.body,
      global: {
        stubs: {
          AppHeader: {
            props: ['mobile', 'navigationOpen'],
            emits: ['open-navigation'],
            template:
              '<button v-if="mobile" class="mobile-navigation-toggle" @click="$emit(\'open-navigation\')">Open</button>',
          },
          AppSidebar: {
            props: ['mobile', 'open'],
            emits: ['close'],
            template:
              '<aside v-show="!mobile || open" class="sidebar"><button class="sidebar-close" @click="$emit(\'close\')">Close</button><a href="/">Link</a></aside>',
          },
          DemoBanner: true,
          ProductTour: true,
          RouterView: true,
        },
      },
    })
  })

  afterEach(() => {
    wrapper.unmount()
    vi.unstubAllGlobals()
  })

  it('opens the mobile drawer and closes it with Escape', async () => {
    expect(wrapper.find('.sidebar').isVisible()).toBe(false)
    await wrapper.find('.mobile-navigation-toggle').trigger('click')
    expect(wrapper.find('.sidebar').isVisible()).toBe(true)
    expect(wrapper.find('.app-main').attributes()).toHaveProperty('inert')
    expect(document.activeElement.className).toBe('sidebar-close')

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    await wrapper.vm.$nextTick()
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.sidebar').isVisible()).toBe(false)
    expect(wrapper.find('.app-main').attributes()).not.toHaveProperty('inert')
    expect(document.activeElement.className).toBe('mobile-navigation-toggle')
  })

  it('closes the drawer on navigation and when switching to desktop', async () => {
    await wrapper.find('.mobile-navigation-toggle').trigger('click')
    route.fullPath = '/orders'
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.sidebar').isVisible()).toBe(false)

    await wrapper.find('.mobile-navigation-toggle').trigger('click')
    const changeHandler = viewport.addEventListener.mock.calls[0][1]
    changeHandler({ matches: false })
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.sidebar').isVisible()).toBe(true)
    expect(wrapper.find('.sidebar-backdrop').exists()).toBe(false)
    expect(wrapper.find('.app-main').attributes()).not.toHaveProperty('inert')
  })
})
