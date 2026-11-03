import { computed, ref, watch } from 'vue'

const STORAGE_KEY = 'theme'
const DARK_QUERY = '(prefers-color-scheme: dark)'

// 'system' follows the OS until the user explicitly picks a theme.
function readStored() {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
  } catch {
    return 'system'
  }
}

const mediaQuery = typeof window !== 'undefined' ? window.matchMedia(DARK_QUERY) : null

const preference = ref(readStored())
const systemPrefersDark = ref(mediaQuery?.matches ?? false)

const theme = computed(() => {
  if (preference.value === 'system') return systemPrefersDark.value ? 'dark' : 'light'
  return preference.value
})

function applyTheme(value) {
  document.documentElement.setAttribute('data-theme', value)
}

mediaQuery?.addEventListener('change', (event) => {
  systemPrefersDark.value = event.matches
})

watch(theme, applyTheme, { immediate: true })

watch(preference, (value) => {
  try {
    if (value === 'system') localStorage.removeItem(STORAGE_KEY)
    else localStorage.setItem(STORAGE_KEY, value)
  } catch {
    // Storage unavailable; keep the in-memory state only.
  }
})

export function useTheme() {
  const isDark = computed(() => theme.value === 'dark')

  const setTheme = (value) => {
    preference.value = value
  }

  const toggleTheme = () => {
    preference.value = isDark.value ? 'light' : 'dark'
  }

  return { theme, preference, isDark, setTheme, toggleTheme }
}
