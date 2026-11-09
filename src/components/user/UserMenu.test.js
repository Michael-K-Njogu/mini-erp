import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import UserMenu from './UserMenu.vue'

const user = ref({ email: 'person@example.test', user_metadata: { full_name: 'Auth Name' } })
const profile = ref({ display_name: 'Profile Name' })
const push = vi.fn()

vi.mock('vue-router', () => ({ useRouter: () => ({ push, replace: vi.fn() }) }))
vi.mock('../../composables/useAuth', () => ({
  useAuth: () => ({ user, profile, signOut: vi.fn() }),
}))
vi.mock('../../composables/useToast', () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}))
vi.mock('./UserAvatar.vue', () => ({ default: { template: '<span />' } }))

beforeEach(() => {
  push.mockClear()
  profile.value = { display_name: 'Profile Name' }
})

describe('user menu', () => {
  it('uses the profile display name and opens the profile page', async () => {
    const wrapper = mount(UserMenu)
    await wrapper.find('[aria-label="Account menu"]').trigger('click')
    expect(wrapper.find('.user-menu-name').text()).toBe('Profile Name')
    expect(wrapper.find('.user-menu-email').text()).toBe('person@example.test')
    await wrapper.findAll('[role="menuitem"]')[0].trigger('click')
    expect(push).toHaveBeenCalledWith({ name: 'profile' })
    expect(wrapper.find('[role="menu"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('updates the displayed name and falls back when the profile name is blank', async () => {
    const wrapper = mount(UserMenu)
    await wrapper.find('[aria-label="Account menu"]').trigger('click')
    profile.value = { display_name: 'Updated' }
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.user-menu-name').text()).toBe('Updated')
    profile.value = { display_name: '  ' }
    await wrapper.vm.$nextTick()
    expect(wrapper.find('.user-menu-name').text()).toBe('Auth Name')
    wrapper.unmount()
  })
})
