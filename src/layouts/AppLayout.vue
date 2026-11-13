<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import DemoBanner from '../components/DemoBanner.vue'
import ProductTour from '../components/ProductTour.vue'
import { useSidebar } from '../composables/useSidebar.js'
import { useAuth } from '../composables/useAuth'
import { usePermissions } from '../composables/usePermissions'
import { useToast } from '../composables/useToast'
import { navigation } from '../config/navigation'
import {
  completeProductTour,
  getProductTourCompletion,
  PRODUCT_TOUR_VERSION,
} from '../services/productTourService'

const { collapsed } = useSidebar()
const route = useRoute()
const isMobile = ref(false)
const navigationOpen = ref(false)
const { user } = useAuth()
const { hasPermission } = usePermissions()
const { error: showError } = useToast()
const tourOpen = ref(false)
const tourSaving = ref(false)
const tourError = ref('')
const tourDescriptions = {
  '/': 'See your key metrics, sales trends and recent activity on the dashboard.',
  '/customers': 'Manage customer details, contacts and accounts in Customers.',
  '/orders': 'Create and track orders through their lifecycle in Orders.',
  '/products': 'Browse and manage your product catalogue in Products.',
  '/inventory': 'Review stock quantities and inventory in Inventory.',
}
const tourSteps = computed(() => [
  {
    title: 'Welcome to Mini-ERP',
    description:
      'Take a quick tour of your workspace. You can replay it at any time using the help button in the header.',
  },
  ...navigation
    .filter((item) => !item.permission || hasPermission(item.permission))
    .filter((item) => tourDescriptions[item.to])
    .map((item) => ({
      title: item.title,
      description: tourDescriptions[item.to],
      selector: `[data-tour-nav="${item.to}"]`,
    })),
  {
    title: 'You are ready',
    description:
      'Use the navigation to explore your workspace. Your available pages depend on your role.',
  },
])
let mediaQuery
let tourLoadRequest = 0

function startTour() {
  tourLoadRequest += 1
  if (navigationOpen.value) closeNavigation({ restoreFocus: false })
  tourError.value = ''
  tourOpen.value = true
}

async function finishTour() {
  const userId = user.value?.id
  if (!userId || tourSaving.value) return
  tourSaving.value = true
  tourError.value = ''
  try {
    await completeProductTour(userId)
    if (user.value?.id === userId) tourOpen.value = false
  } catch (error) {
    console.error('Unable to save product tour completion:', error)
    if (user.value?.id === userId) {
      tourError.value = 'Unable to save your progress. Try again or close without saving.'
    }
  } finally {
    tourSaving.value = false
  }
}

function closeTourWithoutSaving() {
  tourOpen.value = false
  showError('Tour progress was not saved; the tour may appear again.')
}

watch(
  () => user.value?.id,
  async (userId, _previousId, onCleanup) => {
    let active = true
    const request = ++tourLoadRequest
    onCleanup(() => {
      active = false
    })
    tourOpen.value = false
    if (!userId) return
    try {
      const completedVersion = await getProductTourCompletion(userId)
      if (active && request === tourLoadRequest && completedVersion < PRODUCT_TOUR_VERSION) {
        startTour()
      }
    } catch (error) {
      console.error('Unable to load product tour completion:', error)
      if (active && request === tourLoadRequest)
        showError('Unable to load tour progress. You can start the tour from the help button.')
    }
  },
  { immediate: true },
)

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
  <div
    class="app-layout"
    :class="{ 'app-layout--collapsed': collapsed }"
    :inert="tourOpen ? '' : null"
  >
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
        @start-tour="startTour"
      />
      <div id="page-toolbar-root" class="page-toolbar-region"></div>
      <div class="page-content">
        <RouterView />
      </div>
    </main>
  </div>
  <ProductTour
    :open="tourOpen"
    :steps="tourSteps"
    :mobile="isMobile"
    :saving="tourSaving"
    :error="tourError"
    @finish="finishTour"
    @close-without-saving="closeTourWithoutSaving"
  />
</template>
