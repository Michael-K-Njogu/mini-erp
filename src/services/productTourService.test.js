import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  completeProductTour,
  getProductTourCompletion,
  PRODUCT_TOUR_VERSION,
} from './productTourService'

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  upsert: vi.fn(),
}))
vi.mock('../api/supabaseClient', () => ({ supabase: { from: mocks.from } }))

beforeEach(() => {
  vi.resetAllMocks()
  mocks.from.mockReturnValue(mocks)
  mocks.select.mockReturnValue(mocks)
  mocks.eq.mockReturnValue(mocks)
})

describe('product tour persistence', () => {
  it('reads completion for the requested account', async () => {
    mocks.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    expect(await getProductTourCompletion('user-1')).toBe(0)
    expect(mocks.from).toHaveBeenCalledWith('product_tour_completions')
    expect(mocks.eq).toHaveBeenCalledWith('user_id', 'user-1')
    mocks.maybeSingle.mockResolvedValueOnce({ data: { completed_version: 1 }, error: null })
    expect(await getProductTourCompletion('user-1')).toBe(1)
  })

  it('writes completion and surfaces read and write errors', async () => {
    mocks.upsert.mockResolvedValueOnce({ error: null })
    await completeProductTour('user-1')
    expect(mocks.upsert).toHaveBeenCalledWith({
      user_id: 'user-1',
      completed_version: PRODUCT_TOUR_VERSION,
    })
    mocks.maybeSingle.mockResolvedValueOnce({ error: new Error('Read failed') })
    await expect(getProductTourCompletion('user-1')).rejects.toThrow('Read failed')
    mocks.upsert.mockResolvedValueOnce({ error: new Error('Write failed') })
    await expect(completeProductTour('user-1')).rejects.toThrow('Write failed')
  })
})
