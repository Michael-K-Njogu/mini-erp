<script setup>
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import DemoBanner from '../components/DemoBanner.vue'
import { useSidebar } from '../composables/useSidebar.js'

const { collapsed } = useSidebar()
const route = useRoute()
const isMobile = ref(false)
const navigationOpen = ref(false)
let mediaQuery

function updateViewport(event) {
  isMobile.value = event.matches
  if (!event.matches) navigationOpen.value = false
}

async function openNavigation() {
  navigationOpen.value = true
  await nextTick()
  document.querySelector('.sidebar-close')?.focus()
}

async function closeNavigation({ restoreFocus = true } = {}) {
  navigationOpen.value = false
  if (restoreFocus && isMobile.value) {
    await nextTick()
    document.querySelector('.mobile-navigation-toggle')?.focus()
  }
}

function handleKeydown(event) {
  if (!isMobile.value || !navigationOpen.value) return
  if (event.key === 'Escape') {
    event.preventDefault()
    closeNavigation()
  } else if (event.key === 'Tab') {
    const controls = [...document.querySelectorAll('.sidebar button, .sidebar a[href]')].filter(
      (element) => element.offsetParent !== null,
    )
    if (!controls.length) return
    const first = controls[0]
    const last = controls[controls.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }
}

watch(
  () => route.fullPath,
  () => {
    if (navigationOpen.value) closeNavigation()
  },
)

onMounted(() => {
  mediaQuery = window.matchMedia('(max-width: 768px)')
  updateViewport(mediaQuery)
  mediaQuery.addEventListener('change', updateViewport)
  document.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  mediaQuery?.removeEventListener('change', updateViewport)
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<template>
  <div class="app-layout" :class="{ 'app-layout--collapsed': collapsed }">
    <button
      v-if="isMobile && navigationOpen"
      class="sidebar-backdrop"
      type="button"
      aria-label="Close navigation"
      tabindex="-1"
      @click="closeNavigation()"
    ></button>
    <AppSidebar :mobile="isMobile" :open="navigationOpen" @close="closeNavigation()" />

    <main class="app-main" :inert="isMobile && navigationOpen ? '' : null">
      <DemoBanner />
      <AppHeader
        :mobile="isMobile"
        :navigation-open="navigationOpen"
        @open-navigation="openNavigation"
      />
      <div id="page-toolbar-root" class="page-toolbar-region"></div>
      <div class="page-content">
        <RouterView />
      </div>
    </main>
  </div>
</template>
