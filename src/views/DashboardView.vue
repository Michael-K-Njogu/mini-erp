<script setup>
import { computed } from 'vue'
import { useAuth } from '../composables/useAuth'

const { user } = useAuth()

const displayName = computed(() => {
  const fullName = user.value?.user_metadata?.full_name
  if (fullName) return fullName

  const emailName = user.value?.email?.split('@')[0]
  return emailName || 'there'
})
</script>

<template>
  <h1>Welcome Back, {{ displayName }}</h1>
</template>

<style scoped></style>
