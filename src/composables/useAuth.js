import { ref, computed } from 'vue'

import {
  getSession,
  onAuthStateChange,
  signInAnonymously,
  signOut as signOutUser,
} from '../services/authService'

import { getProfileById, updateProfile as updateProfileService } from '../services/profileService'
import { useToast } from './useToast'

const user = ref(null)
const session = ref(null)
const profile = ref(null)
const initialized = ref(false)

let authListener = null
let initializationPromise = null
let profileRequest = 0

async function loadProfile() {
  const request = ++profileRequest
  if (!user.value?.id) {
    profile.value = null
    return
  }

  const userId = user.value.id
  try {
    const result = await getProfileById(userId)
    if (user.value?.id === userId && request === profileRequest) profile.value = result
  } catch (error) {
    if (user.value?.id === userId && request === profileRequest) profile.value = null
    throw error
  }
}

async function updateProfile(values, updatedAt) {
  const userId = user.value?.id
  if (!userId) throw new Error('Sign in before updating your profile.')
  const result = await updateProfileService(userId, values, updatedAt)
  if (user.value?.id !== userId) {
    throw new Error('Your account changed while the profile was saving. Sign in again to check it.')
  }
  profileRequest += 1
  profile.value = result
  return result
}

async function initialize() {
  if (initializationPromise) {
    return initializationPromise
  }

  initializationPromise = (async () => {
    try {
      session.value = await getSession()
      user.value = session.value?.user ?? null

      try {
        await loadProfile()
      } catch (error) {
        console.error('Unable to load profile:', error)
        useToast().error('Unable to load your profile. Open Profile to retry.')
      }

      if (!authListener) {
        const { data } = onAuthStateChange((event, newSession) => {
          if (user.value?.id !== newSession?.user?.id) {
            profileRequest += 1
            profile.value = null
          }
          session.value = newSession
          user.value = newSession?.user ?? null

          if (user.value) {
            const userId = user.value.id
            setTimeout(async () => {
              if (user.value?.id !== userId) return
              try {
                await loadProfile()
              } catch (error) {
                if (user.value?.id !== userId) return
                console.error('Unable to load profile:', error)
                useToast().error('Unable to load your profile. Open Profile to retry.')
              }
            }, 0)
          } else {
            profile.value = null
          }
        })

        authListener = data?.subscription ?? null
      }
    } finally {
      initialized.value = true
    }
  })()

  return initializationPromise
}

async function signOut() {
  await signOutUser()

  profileRequest += 1
  session.value = null
  user.value = null
  profile.value = null
}

async function signInAsDemo() {
  const data = await signInAnonymously()

  session.value = data.session
  user.value = data.user

  await loadProfile()
}

const isAuthenticated = computed(() => !!session.value)
const isDemo = computed(() => !!user.value?.is_anonymous)

export function useAuth() {
  return {
    user,
    session,
    profile,
    isAuthenticated,
    isDemo,
    initialized,

    initialize,
    reloadProfile: loadProfile,
    updateProfile,
    signOut,
    signInAsDemo,
  }
}
