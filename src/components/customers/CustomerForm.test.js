import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import CustomerForm from './CustomerForm.vue'
import BaseImageUpload from '../base/BaseImageUpload.vue'
import { createCustomerSchema } from '../../validation/customerSchema'

const isDemo = ref(false)
vi.mock('../../composables/useAuth', () => ({ useAuth: () => ({ isDemo }) }))

describe('customer image input', () => {
  it('disables image selection in demo but enables it for signed-in accounts', async () => {
    isDemo.value = true
    const wrapper = mount(CustomerForm, {
      props: { validationSchema: createCustomerSchema },
    })
    expect(wrapper.text()).toContain('Customer image uploads are unavailable in demo accounts.')
    expect(wrapper.get('input[type="file"]').attributes('disabled')).toBeDefined()
    expect(wrapper.getComponent(BaseImageUpload).props('uploadDisabled')).toBe(true)
    isDemo.value = false
    await wrapper.vm.$nextTick()
    expect(wrapper.get('input[type="file"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.text()).not.toContain('Customer image uploads are unavailable in demo accounts.')
    wrapper.unmount()
  })

  it('still allows removal of an existing image when uploads are disabled', async () => {
    const wrapper = mount(BaseImageUpload, {
      props: { modelValue: 'https://example.test/logo.png', uploadDisabled: true },
    })
    expect(wrapper.get('input[type="file"]').attributes('disabled')).toBeDefined()
    await wrapper.get('.remove-image').trigger('click')
    expect(wrapper.emitted('update:modelValue')).toEqual([[null]])
    wrapper.unmount()
  })
})
