<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { useRouter } from 'vue-router'

import { Bell, CheckCheck } from '@lucide/vue'

import { useNotifications } from '../../composables/useNotifications'
import { getNotificationRoute } from '../../utils/notificationNavigation'
import { formatDate } from '../../utils/formatters.js'

import BaseButton from '../base/BaseButton.vue'

const router = useRouter()
const isOpen = ref(false)
const menuRef = ref(null)
const { user } = useAuth()

const {
  notifications,
  unreadCount,
  loading,
  error,
  refresh,
  subscribeToNotifications,
  unsubscribeFromNotifications,
  markAsRead,
  markAllAsRead,
} = useNotifications()

async function toggleMenu() {
  isOpen.value = !isOpen.value

  if (isOpen.value) {
    try {
      await refresh({
        limit: 10,
      })
    } catch (err) {
      console.error('Failed to load notifications:', err)
    }
  }
}

async function handleNotificationClick(notification) {
  try {
    if (!notification.isRead) {
      await markAsRead(notification.id)
    }

    const route = getNotificationRoute(notification)

    if (route) {
      isOpen.value = false
      router.push(route)
    }
  } catch (err) {
    console.error('Failed to open notification:', err)
  }
}

async function handleMarkAllAsRead() {
  try {
    await markAllAsRead()
  } catch (err) {
    console.error('Failed to mark notifications as read:', err)
  }
}

async function handleViewAll() {
  isOpen.value = false
  await router.push({ name: 'notifications' })
}

function handleClickOutside(event) {
  if (menuRef.value && !menuRef.value.contains(event.target)) {
    isOpen.value = false
  }
}

onMounted(async () => {
  document.addEventListener('click', handleClickOutside)

  try {
    await refresh({
      limit: 10,
    })

    if (user.value?.id) {
      subscribeToNotifications(user.value.id)
    }
  } catch (err) {
    console.error('Failed to load notifications:', err)
  }
})

onBeforeUnmount(async () => {
  document.removeEventListener('click', handleClickOutside)

  await unsubscribeFromNotifications()
})
</script>

<template>
  <div ref="menuRef" class="notification-menu">
    <!-- Notification trigger -->
    <button
      type="button"
      class="notification-trigger"
      aria-label="Notifications"
      :aria-expanded="isOpen"
      @click="toggleMenu"
    >
      <Bell :size="20" />

      <span v-if="unreadCount > 0" class="notification-badge">
        {{ unreadCount > 99 ? '99+' : unreadCount }}
      </span>
    </button>

    <!-- Dropdown -->
    <div v-if="isOpen" class="notification-dropdown">
      <div class="notification-header">
        <div>
          <h5>
            Notifications
            <span v-if="unreadCount > 0" class="notification-count"> {{ `(${unreadCount})` }}</span>
          </h5>
        </div>

        <BaseButton
          v-if="unreadCount > 0"
          label="Mark all as read"
          variant="secondary"
          size="sm"
          type="button"
          @click="handleMarkAllAsRead"
        >
          <template #icon>
            <CheckCheck :size="16" />
          </template>
        </BaseButton>
      </div>

      <div v-if="loading" class="notification-state">Loading notifications...</div>

      <div v-else-if="error" class="notification-state notification-error">
        Unable to load notifications.
      </div>

      <div v-else-if="!notifications.length" class="notification-state">No notifications yet.</div>

      <ul v-else class="notification-list">
        <li
          v-for="notification in notifications"
          :key="notification.id"
          role="button"
          class="notification-item"
          :class="{
            'is-unread': !notification.isRead,
          }"
          @click="handleNotificationClick(notification)"
        >
          <span class="notification-content">
            <h5>
              {{ notification.title }}
            </h5>

            <p>
              {{ notification.message }}
            </p>

            <small>
              {{ formatDate(notification.createdAt) }}
            </small>
          </span>
        </li>
      </ul>

      <div class="notification-footer">
        <BaseButton
          label="View all notifications"
          variant="secondary"
          size="sm"
          type="button"
          @click="handleViewAll"
        />
      </div>
    </div>
  </div>
</template>
