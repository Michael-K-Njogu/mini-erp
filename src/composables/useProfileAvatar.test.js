import { mount } from '@vue/test-utils'
import { nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useProfileAvatar } from './useProfileAvatar'

const getProfileImageUrl = vi.fn()
const warning = vi.fn()
vi.mock('../services/profileService', () => ({
  getProfileImageUrl: (...args) => getProfileImageUrl(...args),
}))
vi.mock('./useToast', () => ({ useToast: () => ({ warning }) }))

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
})
afterEach(() => vi.useRealTimers())

describe('profile avatar URLs', () => {
  it('refreshes signed URLs and clears them when the path changes', async () => {
    getProfileImageUrl.mockResolvedValueOnce('first-url').mockResolvedValueOnce('refreshed-url')
    const path = ref('user/image.png')
    let avatar
    const wrapper = mount({
      setup() {
        avatar = useProfileAvatar(path)
        return () => null
      },
    })
    await vi.waitFor(() => expect(avatar.url.value).toBe('first-url'))
    await vi.advanceTimersByTimeAsync(50 * 60 * 1000)
    expect(avatar.url.value).toBe('refreshed-url')
    path.value = null
    await nextTick()
    expect(avatar.url.value).toBe(null)
    wrapper.unmount()
    await vi.advanceTimersByTimeAsync(60 * 60 * 1000)
    expect(getProfileImageUrl).toHaveBeenCalledTimes(2)
  })

  it('ignores a stale response after sign-out', async () => {
    let resolve
    getProfileImageUrl.mockReturnValue(
      new Promise((done) => {
        resolve = done
      }),
    )
    const path = ref('user/image.png')
    let avatar
    const wrapper = mount({
      setup() {
        avatar = useProfileAvatar(path)
        return () => null
      },
    })
    path.value = null
    await nextTick()
    resolve('stale-url')
    await nextTick()
    expect(avatar.url.value).toBe(null)
    wrapper.unmount()
  })
})
