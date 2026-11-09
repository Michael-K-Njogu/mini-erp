import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  deleteProfileImage,
  getProfileImageUrl,
  updateProfile,
  uploadProfileImage,
} from './profileService'

const mocks = vi.hoisted(() => {
  const query = {
    update: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    select: vi.fn(),
    maybeSingle: vi.fn(),
  }
  const storage = { upload: vi.fn(), createSignedUrl: vi.fn(), remove: vi.fn() }
  return { query, storage, from: vi.fn(), storageFrom: vi.fn() }
})

vi.mock('../api/supabaseClient', () => ({
  supabase: { from: mocks.from, storage: { from: mocks.storageFrom } },
}))

beforeEach(() => {
  vi.clearAllMocks()
  mocks.from.mockReturnValue(mocks.query)
  mocks.storageFrom.mockReturnValue(mocks.storage)
  mocks.query.update.mockReturnValue(mocks.query)
  mocks.query.eq.mockReturnValue(mocks.query)
  mocks.query.is.mockReturnValue(mocks.query)
  mocks.query.select.mockReturnValue(mocks.query)
})

describe('profile service', () => {
  it('updates only self-service fields with a version condition', async () => {
    mocks.query.maybeSingle.mockResolvedValue({ data: { id: 'user' }, error: null })
    await updateProfile(
      'user',
      { displayName: 'Name', phoneNumber: '', avatarPath: null, role: 'Admin' },
      'v1',
    )
    expect(mocks.query.update).toHaveBeenCalledWith({
      display_name: 'Name',
      phone_number: null,
      avatar_path: null,
    })
    expect(mocks.query.eq).toHaveBeenCalledWith('id', 'user')
    expect(mocks.query.eq).toHaveBeenCalledWith('updated_at', 'v1')
  })

  it('reports a conflict instead of treating an unmatched update as success', async () => {
    mocks.query.maybeSingle.mockResolvedValue({ data: null, error: null })
    await expect(updateProfile('user', { displayName: 'Name' }, null)).rejects.toThrow('changed')
    expect(mocks.query.is).toHaveBeenCalledWith('updated_at', null)
  })

  it('validates images, uploads under the user folder and surfaces storage errors', async () => {
    const invalid = new File(['x'], 'image.svg', { type: 'image/svg+xml' })
    await expect(uploadProfileImage('user', invalid)).rejects.toThrow('JPEG')
    const large = new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'big.png', { type: 'image/png' })
    await expect(uploadProfileImage('user', large)).rejects.toThrow('2 MB')
    const file = new File(['image'], 'photo.png', { type: 'image/png' })
    mocks.storage.upload.mockResolvedValue({ error: null })
    const path = await uploadProfileImage('user', file)
    expect(path).toMatch(/^user\/[0-9a-f-]+\.png$/)
    expect(mocks.storage.upload).toHaveBeenCalledWith(path, file, {
      contentType: 'image/png',
      upsert: false,
    })
    mocks.storage.createSignedUrl.mockResolvedValue({
      data: { signedUrl: 'signed-url' },
      error: null,
    })
    expect(await getProfileImageUrl(path)).toBe('signed-url')
    mocks.storage.remove.mockResolvedValue({ error: new Error('Deletion failed') })
    await expect(deleteProfileImage(path)).rejects.toThrow('Deletion failed')
  })
})
