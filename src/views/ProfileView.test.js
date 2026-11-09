import { mount } from '@vue/test-utils'
import { computed, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import ProfileView from './ProfileView.vue'

const user = ref({ id: 'user-1', email: 'user@example.test' })
const profile = ref(null)
const isDemo = ref(false)
const updateProfile = vi.fn()
const reloadProfile = vi.fn()
const uploadProfileImage = vi.fn()
const deleteProfileImage = vi.fn()
const showError = vi.fn()
const warning = vi.fn()
const success = vi.fn()

vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('../composables/useAuth', () => ({
  useAuth: () => ({ user, profile, isDemo, updateProfile, reloadProfile }),
}))
vi.mock('../composables/useToast', () => ({
  useToast: () => ({ error: showError, warning, success }),
}))
vi.mock('../composables/useProfileAvatar', () => ({
  useProfileAvatar: () => ({ url: computed(() => null) }),
}))
vi.mock('../services/profileService', () => ({
  uploadProfileImage: (...args) => uploadProfileImage(...args),
  deleteProfileImage: (...args) => deleteProfileImage(...args),
  validateProfileImage: (file) => {
    if (file.type !== 'image/png') throw new Error('Choose a JPEG, PNG, or WebP image.')
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
  isDemo.value = false
  user.value = { id: 'user-1', email: 'user@example.test' }
  profile.value = {
    id: 'user-1',
    display_name: 'Original',
    phone_number: null,
    avatar_path: null,
    updated_at: 'v1',
    role: 'Sales',
  }
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => 'blob:preview'),
    revokeObjectURL: vi.fn(),
  })
})

afterEach(() => vi.unstubAllGlobals())

describe('profile page', () => {
  it('validates values and saves using the loaded version', async () => {
    const wrapper = mount(ProfileView)
    await wrapper.find('#profile-name').setValue(' ')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.text()).toContain('Display name is required.')
    expect(updateProfile).not.toHaveBeenCalled()
    await wrapper.find('#profile-name').setValue('  New Name  ')
    await wrapper.find('#profile-phone').setValue('+254 123-456')
    updateProfile.mockImplementation(async (values) => {
      profile.value = {
        ...profile.value,
        display_name: values.displayName,
        phone_number: values.phoneNumber,
        updated_at: 'v2',
      }
    })
    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() => expect(success).toHaveBeenCalled())
    expect(updateProfile).toHaveBeenCalledWith(
      { displayName: 'New Name', phoneNumber: '+254 123-456', avatarPath: null },
      'v1',
    )
    expect(wrapper.text()).toContain('user@example.test')
    expect(wrapper.text()).toContain('Sales')
    wrapper.unmount()
  })

  it('keeps form data and reports conflicts instead of deleting the existing image', async () => {
    profile.value.avatar_path = 'user-1/old.png'
    updateProfile.mockRejectedValue(new Error('Your profile changed or is unavailable.'))
    const wrapper = mount(ProfileView)
    await wrapper.find('#profile-name').setValue('Edited')
    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() =>
      expect(showError).toHaveBeenCalledWith('Your profile changed or is unavailable.'),
    )
    expect(wrapper.find('#profile-name').element.value).toBe('Edited')
    expect(deleteProfileImage).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('disables image upload in demo mode and removes old images only after a successful save', async () => {
    isDemo.value = true
    profile.value.avatar_path = 'user-1/old.png'
    updateProfile.mockImplementation(async () => {
      profile.value = { ...profile.value, avatar_path: null }
    })
    deleteProfileImage.mockResolvedValue()
    const wrapper = mount(ProfileView)
    expect(wrapper.find('#profile-image').element.disabled).toBe(true)
    await wrapper
      .findAll('button')
      .find((button) => button.text() === 'Remove picture')
      .trigger('click')
    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() => expect(deleteProfileImage).toHaveBeenCalledWith('user-1/old.png'))
    expect(updateProfile.mock.invocationCallOrder[0]).toBeLessThan(
      deleteProfileImage.mock.invocationCallOrder[0],
    )
    await nextTick()
    wrapper.unmount()
  })

  it('uploads a new image and reports cleanup failures after saving', async () => {
    profile.value.avatar_path = 'user-1/old.png'
    uploadProfileImage.mockResolvedValue('user-1/new.png')
    updateProfile.mockImplementation(async (values) => {
      profile.value = { ...profile.value, avatar_path: values.avatarPath }
    })
    deleteProfileImage.mockRejectedValue(new Error('storage error'))
    const wrapper = mount(ProfileView)
    const input = wrapper.find('#profile-image')
    Object.defineProperty(input.element, 'files', {
      value: [new File(['image'], 'photo.png', { type: 'image/png' })],
      configurable: true,
    })
    await input.trigger('change')
    expect(wrapper.find('.profile-picture__preview img').attributes('src')).toBe('blob:preview')
    await wrapper.find('form').trigger('submit')
    await vi.waitFor(() =>
      expect(warning).toHaveBeenCalledWith(
        'Profile saved, but the previous picture could not be removed from storage.',
      ),
    )
    expect(updateProfile).toHaveBeenCalledWith(
      { displayName: 'Original', phoneNumber: '', avatarPath: 'user-1/new.png' },
      'v1',
    )
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
    wrapper.unmount()
  })
})
