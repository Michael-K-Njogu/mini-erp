import { describe, expect, it, vi } from 'vitest'
import { resetDemoData } from './authService'

const rpc = vi.hoisted(() => vi.fn())
vi.mock('../api/supabaseClient', () => ({ supabase: { rpc } }))

describe('demo reset', () => {
  it('calls the transactional workspace and tour reset', async () => {
    rpc.mockResolvedValueOnce({ error: null })
    await resetDemoData()
    expect(rpc).toHaveBeenCalledWith('reset_demo_data_with_tour')
  })

  it('reports a failed reset', async () => {
    rpc.mockResolvedValueOnce({ error: { message: 'Reset failed' } })
    await expect(resetDemoData()).rejects.toThrow('Reset failed')
  })
})
