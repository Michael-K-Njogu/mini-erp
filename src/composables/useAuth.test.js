import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  onAuthStateChange: vi.fn(),
  getProfileById: vi.fn(),
  showError: vi.fn(),
}))

vi.mock('../services/authService', () => ({
  getSession: mocks.getSession,
  onAuthStateChange: mocks.onAuthStateChange,
  signInAnonymously: vi.fn(),
  signOut: vi.fn(),
}))
vi.mock('../services/profileService', () => ({
  getProfileById: mocks.getProfileById,
  updateProfile: vi.fn(),
}))
vi.mock('./useToast', () => ({ useToast: () => ({ error: mocks.showError }) }))

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  mocks.getSession.mockResolvedValue({ user: { id: 'user-1' } })
  mocks.onAuthStateChange.mockReturnValue({ data: { subscription: {} } })
})

describe('profile loading', () => {
  it('exposes an actionable missing-profile error and clears it after reload', async () => {
    const error = Object.assign(
      new Error('Contact an administrator to check your account profile.'),
      {
        code: 'PROFILE_UNAVAILABLE',
      },
    )
    mocks.getProfileById
      .mockRejectedValueOnce(error)
      .mockResolvedValueOnce({ id: 'user-1', role: 'Sales' })
    const { useAuth } = await import('./useAuth')
    const auth = useAuth()
    await auth.initialize()
    expect(auth.profile.value).toBeNull()
    expect(auth.profileError.value).toBe(error.message)
    expect(mocks.showError).toHaveBeenCalledWith(error.message)
    await auth.reloadProfile()
    expect(auth.profile.value.role).toBe('Sales')
    expect(auth.profileError.value).toBeNull()
  })

  it('reports a generic retry message for other failures', async () => {
    mocks.getProfileById.mockRejectedValue(new Error('technical failure'))
    const { useAuth } = await import('./useAuth')
    const auth = useAuth()
    await auth.initialize()
    expect(auth.profileError.value).toBe(
      'Unable to load your profile. Try reloading it or contact an administrator.',
    )
    expect(mocks.showError).toHaveBeenCalledWith(auth.profileError.value)
  })
})
