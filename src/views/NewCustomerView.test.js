import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import NewCustomerView from './NewCustomerView.vue'

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  push: vi.fn(),
  success: vi.fn(),
  warning: vi.fn(),
  error: vi.fn(),
}))

vi.mock('vue-router', () => ({ useRouter: () => ({ push: mocks.push }) }))
vi.mock('../services/customerService', () => ({ createCustomer: mocks.create }))
vi.mock('../composables/useToast', () => ({
  useToast: () => ({ success: mocks.success, warning: mocks.warning, error: mocks.error }),
}))

const mountView = () =>
  mount(NewCustomerView, {
    global: {
      stubs: {
        CustomerForm: {
          template: "<button @click=\"$emit('submit', { name: 'Acme' })\">Save</button>",
        },
        RouterLink: { template: '<a><slot /></a>' },
      },
    },
  })

beforeEach(() => {
  vi.resetAllMocks()
  mocks.push.mockResolvedValue(undefined)
})

describe('new customer', () => {
  it('ignores repeated submissions while creation is pending', async () => {
    let finish
    mocks.create.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve
      }),
    )
    const wrapper = mountView()
    await wrapper.find('button').trigger('click')
    await wrapper.find('button').trigger('click')
    expect(mocks.create).toHaveBeenCalledTimes(1)
    finish({
      customer: { id: 'id-1', name: 'Acme', customerNumber: 'CUST-1' },
      imageError: null,
    })
    await flushPromises()
    expect(mocks.success).toHaveBeenCalledOnce()
    wrapper.unmount()
  })

  it('prevents resubmission and reports an image failure after creation', async () => {
    const imageError = new Error('Upload failed')
    mocks.create.mockResolvedValue({
      customer: { id: 'id-1', name: 'Acme', customerNumber: 'CUST-1' },
      imageError,
    })
    mocks.push.mockRejectedValue(new Error('Navigation failed'))
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const wrapper = mountView()
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(mocks.warning).toHaveBeenCalledWith(expect.stringContaining('Acme (CUST-1) was created'))
    expect(mocks.success).not.toHaveBeenCalled()
    expect(mocks.error).toHaveBeenCalledWith(
      'Customer was created, but the customer list could not be opened.',
    )
    expect(wrapper.text()).toContain('Customer Acme (CUST-1) was created')
    expect(wrapper.find('button').exists()).toBe(false)
    expect(mocks.create).toHaveBeenCalledTimes(1)
    log.mockRestore()
    wrapper.unmount()
  })

  it('allows retry when customer creation itself fails', async () => {
    mocks.create.mockRejectedValueOnce(new Error('Creation failed'))
    mocks.create.mockResolvedValueOnce({
      customer: { id: 'id-1', name: 'Acme', customerNumber: 'CUST-1' },
      imageError: null,
    })
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    const wrapper = mountView()
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(mocks.error).toHaveBeenCalledWith('Creation failed')
    await wrapper.find('button').trigger('click')
    await flushPromises()
    expect(mocks.create).toHaveBeenCalledTimes(2)
    expect(mocks.success).toHaveBeenCalledOnce()
    expect(mocks.push).toHaveBeenCalledWith({ name: 'customers' })
    log.mockRestore()
    wrapper.unmount()
  })
})
