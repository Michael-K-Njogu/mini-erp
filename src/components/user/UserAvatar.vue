<script setup>
import { computed, ref, watch } from 'vue'
import { useAuth } from '../../composables/useAuth'
import { useProfileAvatar } from '../../composables/useProfileAvatar'
import { useToast } from '../../composables/useToast'
import { getDisplayName, getInitials } from '../../utils/profile'

const { profile, user } = useAuth()
const { warning } = useToast()
const path = computed(() => profile.value?.avatar_path)
const { url } = useProfileAvatar(path)
const failed = ref(false)
const initials = computed(() => getInitials(getDisplayName(profile.value, user.value)))
watch(url, () => {
  failed.value = false
})

function handleError() {
  failed.value = true
  warning('Unable to display your profile picture. Your initials will be shown instead.')
}
</script>

<template>
  <span class="user-avatar" aria-hidden="true">
    <img v-if="url && !failed" :src="url" alt="" @error="handleError" />
    <template v-else>{{ initials }}</template>
  </span>
</template>

<style scoped>
.user-avatar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  overflow: hidden;
  background: var(--color-interactive-default);
  color: var(--color-text-on-interactive);
  font-size: 14px;
  font-weight: 600;
}

.user-avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
