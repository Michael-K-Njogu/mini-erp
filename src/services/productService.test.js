import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createProduct, updateProduct, deleteProduct, getProductById } from './productService'

const mocks = vi.hoisted(() => ({
  patch: vi.fn(),
  post: vi.fn(),
  getRaw: vi.fn(),
  delete: vi.fn(),
  upload: vi.fn(),
  cleanup: vi.fn(),
}))
vi.mock('../api/apiClient', () => ({ apiClient: mocks }))
vi.mock('./productImageService', () => ({
  uploadProductImage: mocks.upload,
  deleteProductImage: mocks.cleanup,
}))
const file = new File(['image'], 'photo.png', { type: 'image/png' })
const url = 'https://example.test/photo.png'
beforeEach(() => vi.resetAllMocks())

describe('product images', () => {
  it('maps stored images and absent images', async () => {
    mocks.getRaw
      .mockResolvedValueOnce({ data: [{ id: '1', image_url: url }] })
      .mockResolvedValueOnce({ data: [{ id: '2' }] })
    expect((await getProductById('1')).image).toBe(url)
    expect((await getProductById('2')).image).toBeNull()
  })
  it('creates a product with its uploaded image', async () => {
    mocks.upload.mockResolvedValue(url)
    mocks.post.mockResolvedValue([{ id: '1', image_url: url }])
    expect((await createProduct({ name: 'Cement', image: file })).image).toBe(url)
    expect(mocks.post.mock.calls[0][1].image_url).toBe(url)
  })
  it('cleans up a new upload when creation fails', async () => {
    mocks.upload.mockResolvedValue(url)
    mocks.post.mockRejectedValue(new Error('Duplicate SKU'))
    await expect(createProduct({ image: file })).rejects.toThrow('Duplicate SKU')
    expect(mocks.cleanup).toHaveBeenCalledWith(url)
  })
  it('does not overwrite stock or the image from a stale product form', async () => {
    mocks.patch.mockResolvedValue([{ id: 'product-1', stock_quantity: 9 }])
    await updateProduct('product-1', {
      name: 'Cement',
      sku: 'CEM-001',
      stockQuantity: 12,
      image: url,
    })
    expect(mocks.patch.mock.calls[0][1]).not.toHaveProperty('stock_quantity')
    expect(mocks.patch.mock.calls[0][1]).not.toHaveProperty('image_url')
  })
  it('keeps the previous image when saving a replacement fails', async () => {
    mocks.getRaw.mockResolvedValue({ data: [{ id: '1', image_url: 'old' }] })
    mocks.upload.mockResolvedValue(url)
    mocks.patch.mockRejectedValue(new Error('Save failed'))
    await expect(updateProduct('1', { image: file })).rejects.toThrow('Save failed')
    expect(mocks.cleanup).toHaveBeenCalledExactlyOnceWith(url)
  })
  it('removes the previous image after an explicit removal saves', async () => {
    mocks.getRaw.mockResolvedValue({ data: [{ id: '1', image_url: url }] })
    mocks.patch.mockResolvedValue([{ id: '1', image_url: null }])
    await updateProduct('1', { image: null })
    expect(mocks.patch.mock.calls[0][1].image_url).toBeNull()
    expect(mocks.cleanup).toHaveBeenCalledWith(url)
  })
  it('keeps the image when product deletion is rejected', async () => {
    mocks.getRaw.mockResolvedValue({ data: [{ id: '1', image_url: url }] })
    mocks.delete.mockRejectedValue(new Error('Referenced product'))
    await expect(deleteProduct('1')).rejects.toThrow('Referenced product')
    expect(mocks.cleanup).not.toHaveBeenCalled()
  })
})
