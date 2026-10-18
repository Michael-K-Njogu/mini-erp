import { ref, watch } from 'vue'

const STORAGE_KEY = 'sidebar-collapsed'

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

const collapsed = ref(readStored())

watch(collapsed, (value) => {
  try {
    localStorage.setItem(STORAGE_KEY, String(value))
  } catch {
    // Storage unavailable; keep the in-memory state only.
  }
})

export function useSidebar() {
  const toggle = () => {
    collapsed.value = !collapsed.value
  }

  return { collapsed, toggle }
}
