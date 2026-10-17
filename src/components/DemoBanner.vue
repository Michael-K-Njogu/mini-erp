<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { FlaskConical } from '@lucide/vue'

import { useAuth } from '../composables/useAuth'
import { useToast } from '../composables/useToast'
import { resetDemoData } from '../services/authService'

import BaseButton from './base/BaseButton.vue'

const router = useRouter()

const { isDemo, signOut } = useAuth()
const { error: showError } = useToast()

const resetting = ref(false)

async function handleReset() {
  resetting.value = true

  try {
    await resetDemoData()

    // Reload so every view fetches the restored data.
    window.location.assign('/')
  } catch (err) {
    console.error('Demo reset failed:', err)

    showError(err.message || 'Unable to reset the demo data.')
    resetting.value = false
  }
}

async function handleExit() {
  await signOut()

  await router.replace({ name: 'login' })
}
</script>

<template>
  <div v-if="isDemo" class="demo-banner" role="status">
    <p class="demo-banner__message">
      <FlaskConical :size="16" aria-hidden="true" />

      <span>
        <strong>Demo workspace.</strong>
        Explore freely: your changes are private to you and are cleared after 24 hours.
      </span>
    </p>

    <div class="demo-banner__actions">
      <BaseButton
        label="Reset data"
        type="button"
        variant="secondary"
        size="sm"
        :loading="resetting"
        :disabled="resetting"
        @click="handleReset"
      />

      <BaseButton
        label="Exit demo"
        type="button"
        variant="secondary"
        size="sm"
        @click="handleExit"
      />
    </div>
  </div>
</template>

<style scoped>
.demo-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  padding: 0.5rem 1.5rem;
  border-bottom: 1px solid var(--border-colour-subtle);
  background: var(--bg-warning-muted);
  color: var(--text-colour-warning);
  font-size: 0.875rem;
}

.demo-banner__message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
}

.demo-banner__actions {
  display: flex;
  gap: 0.5rem;
}
</style>
