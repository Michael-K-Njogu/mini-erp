import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createCustomer } from './customerService'
import { apiClient } from '../api/apiClient'
import { uploadCustomerImage } from './storageService'

vi.mock('../api/apiClient', () => ({ apiClient: { post: vi.fn(), patch: vi.fn() } }))
vi.mock('./storageService', () => ({
  uploadCustomerImage: vi.fn(),
  deleteCustomerImage: vi.fn(),
}))

const record = { id: 'id-1', customer_number: 'CUST-1', name: 'Customer' }
const file = () => new File(['image'], 'logo.png', { type: 'image/png' })

beforeEach(() => {
  vi.resetAllMocks()
  apiClient.post.mockResolvedValue([record])
})

describe('createCustomer', () => {
  it('creates a customer without an image', async () => {
    const result = await createCustomer({ name: 'Customer', image: null })
    expect(result).toMatchObject({ customer: { id: 'id-1' }, imageError: null })
    expect(uploadCustomerImage).not.toHaveBeenCalled()
    expect(apiClient.patch).not.toHaveBeenCalled()
  })

  it('uploads and associates an image with the created customer', async () => {
    uploadCustomerImage.mockResolvedValue('https://example.test/logo.png')
    apiClient.patch.mockResolvedValue([{ ...record, image_url: 'https://example.test/logo.png' }])
    const image = file()
    const result = await createCustomer({ name: 'Customer', image })
    expect(uploadCustomerImage).toHaveBeenCalledWith('id-1', image)
    expect(apiClient.patch).toHaveBeenCalledWith(
      '/customers?id=eq.id-1',
      { image_url: 'https://example.test/logo.png' },
      expect.any(Object),
    )
    expect(result).toMatchObject({
      customer: { id: 'id-1', image: 'https://example.test/logo.png' },
      imageError: null,
    })
  })

  it('reports a saved customer when upload or association fails', async () => {
    const uploadError = new Error('Upload failed')
    uploadCustomerImage.mockRejectedValueOnce(uploadError)
    const uploadResult = await createCustomer({ name: 'Customer', image: file() })
    expect(uploadResult).toMatchObject({ customer: { id: 'id-1' }, imageError: uploadError })
    expect(apiClient.patch).not.toHaveBeenCalled()

    uploadCustomerImage.mockResolvedValueOnce('https://example.test/logo.png')
    const patchError = new Error('Update failed')
    apiClient.patch.mockRejectedValueOnce(patchError)
    const patchResult = await createCustomer({ name: 'Customer', image: file() })
    expect(patchResult).toMatchObject({ customer: { id: 'id-1' }, imageError: patchError })

    uploadCustomerImage.mockResolvedValueOnce('https://example.test/logo.png')
    apiClient.patch.mockResolvedValueOnce([])
    const unconfirmed = await createCustomer({ name: 'Customer', image: file() })
    expect(unconfirmed.customer.id).toBe('id-1')
    expect(unconfirmed.imageError.message).toContain('could not be confirmed')
  })

  it('propagates a failure to create the customer', async () => {
    apiClient.post.mockRejectedValueOnce(new Error('Creation failed'))
    await expect(createCustomer({ name: 'Customer', image: file() })).rejects.toThrow(
      'Creation failed',
    )
    expect(uploadCustomerImage).not.toHaveBeenCalled()
  })
})
