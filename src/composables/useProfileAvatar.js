import { onScopeDispose, ref, watch } from 'vue'
import { getProfileImageUrl } from '../services/profileService'
import { useToast } from './useToast'

export function useProfileAvatar(path) {
  const url = ref(null)
  const { warning } = useToast()
  let timer
  let generation = 0

  async function load(currentPath, currentGeneration) {
    try {
      const signedUrl = await getProfileImageUrl(currentPath)
      if (currentGeneration !== generation) return
      url.value = signedUrl
      timer = setTimeout(() => load(currentPath, currentGeneration), 50 * 60 * 1000)
    } catch (error) {
      if (currentGeneration !== generation) return
      url.value = null
      console.error('Unable to load profile picture:', error)
      warning('Unable to load your profile picture. Your initials will be shown instead.')
    }
  }

  watch(
    path,
    (currentPath) => {
      generation += 1
      clearTimeout(timer)
      url.value = null
      if (currentPath) load(currentPath, generation)
    },
    { immediate: true },
  )

  onScopeDispose(() => {
    generation += 1
    clearTimeout(timer)
  })

  return { url }
}
