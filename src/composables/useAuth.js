import { ref, computed } from 'vue'

import {
  getSession,
  onAuthStateChange,
  signInAnonymously,
  signOut as signOutUser,
} from '../services/authService'

import { getProfileById } from '../services/profileService'

const user = ref(null)
const session = ref(null)
const profile = ref(null)
const initialized = ref(false)

let authListener = null
let initializationPromise = null

async function loadProfile() {
  if (!user.value?.id) {
    profile.value = null
    return
  }

  profile.value = await getProfileById(user.value.id)
}

async function initialize() {
  if (initializationPromise) {
    return initializationPromise
  }

  initializationPromise = (async () => {
    try {
      session.value = await getSession()
      user.value = session.value?.user ?? null

      await loadProfile()

      if (!authListener) {
        const { data } = onAuthStateChange(async (event, newSession) => {
          session.value = newSession
          user.value = newSession?.user ?? null

          if (user.value) {
            await loadProfile()
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
    signOut,
    signInAsDemo,
  }
}
