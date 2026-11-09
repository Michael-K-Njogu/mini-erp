<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import { ChevronDown, User, LogOut } from '@lucide/vue'

import { useAuth } from '../../composables/useAuth'
import { useToast } from '../../composables/useToast'
import { getDisplayName } from '../../utils/profile'
import UserAvatar from './UserAvatar.vue'

const router = useRouter()

const { user, profile, signOut } = useAuth()

const { success, error: showError } = useToast()

const isOpen = ref(false)
const signingOut = ref(false)
const menuRef = ref(null)

const displayName = computed(() => getDisplayName(profile.value, user.value))

function toggleMenu() {
  isOpen.value = !isOpen.value
}

function closeMenu() {
  isOpen.value = false
}

function openProfile() {
  closeMenu()
  router.push({ name: 'profile' })
}

function handleClickOutside(event) {
  if (menuRef.value && !menuRef.value.contains(event.target)) {
    closeMenu()
  }
}

async function handleSignOut() {
  signingOut.value = true

  try {
    await signOut()

    closeMenu()

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

onMounted(() => {
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<template>
  <div ref="menuRef" class="user-menu">
    <button
      type="button"
      class="user-menu-trigger"
      :aria-expanded="isOpen"
      aria-haspopup="menu"
      aria-label="Account menu"
      @click="toggleMenu"
    >
      <UserAvatar />

      <!--
      <span class="user-details">
        <span class="user-name">
          {{ displayName }}
        </span>

        <span class="user-email">
          {{ user?.email }}
        </span>
      </span>
    -->

      <ChevronDown class="user-menu-chevron" :class="{ 'is-open': isOpen }" size="18" />
    </button>

    <div v-if="isOpen" class="user-menu-dropdown" role="menu">
      <div class="user-menu-header">
        <UserAvatar />

        <div class="user-menu-account">
          <span class="user-menu-name">
            {{ displayName }}
          </span>

          <span class="user-menu-email">
            {{ user?.email }}
          </span>
        </div>
      </div>

      <button type="button" class="user-menu-item" role="menuitem" @click="openProfile">
        <User size="18" />

        <span>Profile</span>
      </button>

      <button
        type="button"
        class="user-menu-item user-menu-item-danger"
        role="menuitem"
        :disabled="signingOut"
        @click="handleSignOut"
      >
        <LogOut size="18" />

        <span>
          {{ signingOut ? 'Signing out...' : 'Sign out' }}
        </span>
      </button>
    </div>
  </div>
</template>

<style scoped>
.user-menu {
  position: relative;
}

.user-menu-trigger {
  display: flex;
  align-items: center;
  gap: 4px;

  padding: 0.375rem 0.5rem;

  border: none;
  border-radius: var(--border-radius-md);

  background: transparent;
  color: inherit;

  cursor: pointer;
}

.user-menu-trigger:hover {
  background: var(--color-bg-subtle);
}

.user-details {
  display: flex;
  flex-direction: column;

  align-items: flex-start;

  min-width: 0;
}

.user-name {
  max-width: 10rem;

  overflow: hidden;

  font-size: 0.875rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-email {
  max-width: 10rem;

  overflow: hidden;

  color: var(--color-text-secondary);
  font-size: 0.75rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-menu-chevron {
  transition: transform 0.2s ease;
}

.user-menu-chevron.is-open {
  transform: rotate(180deg);
}

.user-menu-account {
  display: flex;
  flex-direction: column;

  min-width: 0;
}

.user-menu-name {
  overflow: hidden;

  font-size: 0.875rem;
  font-weight: 600;

  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-menu-email {
  overflow: hidden;

  margin-top: 0.125rem;

  color: var(--color-text-secondary);
  font-size: 0.75rem;

  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-menu-divider {
  height: 1px;

  margin: 0.5rem 0;

  background: var(--color-border-default);
}

.user-menu-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;

  width: 100%;

  padding: 12px 16px;

  border: none;
  border-radius: var(--border-radius-sm);

  background: transparent;
  color: var(--color-text-primary);

  font: inherit;
  font-size: 0.875rem;
  text-align: left;

  cursor: pointer;
}

.user-menu-item:hover:not(:disabled) {
  background: var(--color-bg-subtle);
}

.user-menu-item:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.user-menu-item-danger {
  color: var(--color-feedback-error);
}
</style>
