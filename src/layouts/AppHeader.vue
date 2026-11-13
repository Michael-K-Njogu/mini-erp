<script setup>
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useToast } from '../composables/useToast'
import { useAuth } from '../composables/useAuth'

import NotificationMenu from '../components/notifications/NotificationMenu.vue'
import ThemeToggle from '../components/theme/ThemeToggle.vue'
import UserMenu from '../components/user/UserMenu.vue'
import { ChevronRight, CircleHelp, Menu } from '@lucide/vue'

defineProps({
  mobile: { type: Boolean, default: false },
  navigationOpen: { type: Boolean, default: false },
})
defineEmits(['open-navigation', 'start-tour'])

const route = useRoute()
const router = useRouter()

const { success, error: showError } = useToast()

const { signOut } = useAuth()
const signingOut = ref(false)

const pageTitle = computed(() => route.meta.title || 'Mikey’s Mini-ERP')

const breadcrumbs = computed(() => {
  const crumbs = []

  if (route.meta.parent) {
    const parentRoute = router.getRoutes().find((item) => item.name === route.meta.parent)

    if (parentRoute?.meta?.title) {
      crumbs.push({
        label: parentRoute.meta.title,
        routeName: parentRoute.name,
      })
    }
  }

  crumbs.push({
    label: pageTitle.value,
    routeName: null,
  })

  return crumbs
})

function goBack() {
  router.back()
}

function navigateTo(routeName) {
  if (!routeName) return

  router.push({
    name: routeName,
  })
}

async function handleSignOut() {
  signingOut.value = true

  try {
    await signOut()

    success('Signed out successfully.')

    await router.replace({
      name: 'login',
    })
  } catch (err) {
    console.error('Sign out failed:', err)

    showError(err.message || 'Unable to sign out. Please try again.')
  } finally {
    signingOut.value = false
  }
}
</script>

<template>
  <header class="top-bar-header">
    <div class="header-context">
      <button
        v-if="mobile"
        class="mobile-navigation-toggle"
        type="button"
        aria-label="Open navigation"
        aria-controls="app-sidebar"
        :aria-expanded="navigationOpen"
        @click="$emit('open-navigation')"
      >
        <Menu :size="24" aria-hidden="true" />
      </button>
      <nav v-if="breadcrumbs.length > 1" class="breadcrumbs" aria-label="Breadcrumb">
        <template v-for="(breadcrumb, index) in breadcrumbs" :key="breadcrumb.label">
          <ChevronRight v-if="index > 0" class="breadcrumb-separator" :size="16" />

          <button
            v-if="breadcrumb.routeName"
            type="button"
            class="breadcrumb-link"
            @click="navigateTo(breadcrumb.routeName)"
          >
            {{ breadcrumb.label }}
          </button>

          <span v-else class="breadcrumb-current">
            {{ breadcrumb.label }}
          </span>
        </template>
      </nav>

      <h1 v-else class="page-title">
        {{ pageTitle }}
      </h1>
    </div>

    <div class="header-actions">
      <button
        class="tour-button"
        type="button"
        aria-label="Take the product tour"
        title="Take the product tour"
        @click="$emit('start-tour')"
      >
        <CircleHelp :size="20" aria-hidden="true" />
      </button>
      <ThemeToggle />

      <NotificationMenu />

      <UserMenu @sign-out="handleSignOut" />
    </div>
  </header>
</template>

<style scoped>
.header-context,
.header-actions,
.breadcrumbs,
.user-menu {
  display: flex;
  align-items: center;
}

.header-context {
  min-width: 0;
  gap: 12px;
}

.header-actions {
  gap: 8px;
  flex-shrink: 0;
}

.mobile-navigation-toggle,
.tour-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex: none;
  padding: 0;
  border: 0;
  border-radius: var(--radius-sm);
  color: var(--color-text-primary);
  background: transparent;
  cursor: pointer;
}

.mobile-navigation-toggle:focus-visible,
.tour-button:focus-visible {
  outline: 2px solid var(--color-border-focus);
}

.page-title {
  margin: 0;
  font-size: 16px;
  font-weight: 500;
  color: var(--color-text-primary);
}

.back-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-primary);
  cursor: pointer;
}

.back-button:hover {
  background-color: var(--color-bg-default);
  border-color: var(--color-border-default);
}

.breadcrumbs {
  gap: 8px;
  min-width: 0;
}

.breadcrumb-link {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 16px;
  cursor: pointer;
}

.breadcrumb-link:hover {
  color: var(--color-text-primary);
  text-decoration: underline;
}

.breadcrumb-current {
  color: var(--color-text-primary);
  font-size: 16px;
  font-weight: 500;
}

.breadcrumb-separator {
  flex-shrink: 0;
  color: var(--color-text-secondary);
}

@media (max-width: 480px) {
  .header-context {
    gap: 4px;
  }

  .breadcrumbs,
  .page-title {
    overflow: hidden;
  }

  .breadcrumb-current,
  .page-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}
</style>
