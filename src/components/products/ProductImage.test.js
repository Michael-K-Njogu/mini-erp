import { mount } from '@vue/test-utils'
import { expect, it, vi, beforeEach } from 'vitest'
import BaseImageUpload from '../base/BaseImageUpload.vue'
import ProductImage from './ProductImage.vue'

beforeEach(() => {
  URL.createObjectURL = vi.fn(() => 'blob:preview')
  URL.revokeObjectURL = vi.fn()
})
it('shows a placeholder for missing or broken images and recovers for a new URL', async () => {
  const wrapper = mount(ProductImage)
  expect(wrapper.find('img').exists()).toBe(false)
  await wrapper.setProps({ src: 'https://example.test/one.png', name: 'Cement' })
  expect(wrapper.get('img').attributes('alt')).toBe('Cement')
  await wrapper.get('img').trigger('error')
  expect(wrapper.find('img').exists()).toBe(false)
  await wrapper.setProps({ src: 'https://example.test/two.png' })
  expect(wrapper.find('img').exists()).toBe(true)
})
it('accepts dropped images, rejects invalid files and frees the preview', async () => {
  const wrapper = mount(BaseImageUpload)
  const drop = (file) =>
    wrapper.get('.image-upload-content').trigger('drop', { dataTransfer: { files: [file] } })
  await drop(new File(['a'], 'bad.svg', { type: 'image/svg+xml' }))
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
  expect(wrapper.text()).toContain('Please upload a JPG or PNG')
  await drop(new File([new Uint8Array(2097153)], 'large.png', { type: 'image/png' }))
  expect(wrapper.text()).toContain('Image size must be')
  const file = new File(['a'], 'photo.png', { type: 'image/png' })
  await drop(file)
  expect(wrapper.emitted('update:modelValue')).toEqual([[file]])
  wrapper.unmount()
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
})
it('ignores drops when disabled', async () => {
  const wrapper = mount(BaseImageUpload, { props: { uploadDisabled: true } })
  await wrapper
    .get('.image-upload-content')
    .trigger('drop', {
      dataTransfer: { files: [new File(['a'], 'photo.png', { type: 'image/png' })] },
    })
  expect(wrapper.emitted('update:modelValue')).toBeUndefined()
})
