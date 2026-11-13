import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { deleteCustomerImage, uploadCustomerImage } from './storageService'
import { supabase } from '../api/supabaseClient'

vi.mock('../api/supabaseClient', () => ({
  supabase: { auth: { getSession: vi.fn() } },
}))

const image = () => new File(['image'], 'logo.png', { type: 'image/png' })

beforeEach(() => {
  vi.resetAllMocks()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 204 }))
  supabase.auth.getSession.mockResolvedValue({
    data: { session: { access_token: 'session-token', user: { is_anonymous: false } } },
    error: null,
  })
})

afterEach(() => vi.unstubAllGlobals())

describe('customer image storage', () => {
  it('uses the authenticated session for upload and deletion', async () => {
    const url = await uploadCustomerImage('customer-1', image())
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/customer-images/customer-1/logo-'),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer session-token' }),
      }),
    )
    await deleteCustomerImage(url)
    expect(fetch).toHaveBeenLastCalledWith(
      expect.stringContaining('/customer-images/customer-1/logo-'),
      expect.objectContaining({
        method: 'DELETE',
        headers: expect.objectContaining({ Authorization: 'Bearer session-token' }),
      }),
    )
  })

  it('blocks anonymous uploads but permits deletion of existing images', async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'demo-token', user: { is_anonymous: true } } },
      error: null,
    })
    await expect(uploadCustomerImage('customer-1', image())).rejects.toThrow(
      'unavailable in demo accounts',
    )
    expect(fetch).not.toHaveBeenCalled()
    await deleteCustomerImage('https://example.test/storage/v1/object/public/customer-images/a/b')
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer demo-token' }),
      }),
    )
  })

  it('reports a missing session and storage errors', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null }, error: null })
    await expect(uploadCustomerImage('customer-1', image())).rejects.toThrow('signed in')
    expect(fetch).not.toHaveBeenCalled()
    supabase.auth.getSession.mockResolvedValue({
      data: { session: { access_token: 'token', user: {} } },
      error: null,
    })
    fetch.mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({ message: 'Not authorized' }),
    })
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    await expect(uploadCustomerImage('customer-1', image())).rejects.toThrow('Not authorized')
    log.mockRestore()
  })
})
