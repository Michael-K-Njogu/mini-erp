import { flushPromises, mount } from '@vue/test-utils'
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DemoBanner from './DemoBanner.vue'

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  replace: vi.fn(),
  reset: vi.fn(),
  error: vi.fn(),
}))
vi.mock('vue-router', () => ({ useRouter: () => ({ replace: mocks.replace }) }))
vi.mock('../composables/useAuth', () => ({
  useAuth: () => ({ isDemo: ref(true), signOut: mocks.signOut }),
}))
vi.mock('../composables/useToast', () => ({ useToast: () => ({ error: mocks.error }) }))
vi.mock('../services/authService', () => ({ resetDemoData: mocks.reset }))

beforeEach(() => {
  vi.resetAllMocks()
})

describe('demo exit', () => {
  it('shows the exiting label and prevents repeated or conflicting actions until navigation finishes', async () => {
    let finishSignOut
    let finishNavigation
    mocks.signOut.mockReturnValue(new Promise((resolve) => (finishSignOut = resolve)))
    mocks.replace.mockReturnValue(new Promise((resolve) => (finishNavigation = resolve)))
    const wrapper = mount(DemoBanner)
    const [reset, exit] = wrapper.findAll('button')
    expect(exit.text()).toBe('Exit demo')

    await exit.trigger('click')
    expect(exit.text()).toBe('Exiting demo...')
    expect(exit.attributes('disabled')).toBeDefined()
    expect(reset.attributes('disabled')).toBeDefined()
    await exit.trigger('click')
    expect(mocks.signOut).toHaveBeenCalledTimes(1)

    finishSignOut()
    await flushPromises()
    expect(mocks.replace).toHaveBeenCalledWith({ name: 'login' })
    expect(exit.text()).toBe('Exiting demo...')
    finishNavigation()
    await flushPromises()
    expect(exit.text()).toBe('Exit demo')
    wrapper.unmount()
  })

  it('restores the button and reports a sign-out error', async () => {
    mocks.signOut.mockRejectedValue(new Error('Sign-out failed'))
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const wrapper = mount(DemoBanner)
    await wrapper.findAll('button')[1].trigger('click')
    await flushPromises()
    expect(mocks.error).toHaveBeenCalledWith('Sign-out failed')
    expect(wrapper.findAll('button')[1].text()).toBe('Exit demo')
    expect(wrapper.findAll('button')[1].attributes('disabled')).toBeUndefined()
    expect(mocks.replace).not.toHaveBeenCalled()
    wrapper.unmount()
    log.mockRestore()
  })

  it('does not show the exit label while resetting', async () => {
    mocks.reset.mockReturnValue(new Promise(() => {}))
    const wrapper = mount(DemoBanner)
    await wrapper.findAll('button')[0].trigger('click')
    expect(wrapper.findAll('button')[1].text()).toBe('Exit demo')
    expect(wrapper.findAll('button')[1].attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })
})
