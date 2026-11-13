<script setup>
import { computed, ref, watch } from 'vue'

const props = defineProps({
  src: { type: String, default: null },
  name: { type: String, default: 'Customer' },
})
const failed = ref(false)
const initials = computed(() => {
  const parts = props.name?.trim().split(/\s+/).filter(Boolean) || []
  if (!parts.length) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
})
watch(
  () => props.src,
  () => {
    failed.value = false
  },
)
</script>

<template>
  <div class="customer-image">
    <img v-if="src && !failed" :src="src" :alt="name" loading="lazy" @error="failed = true" />
    <span v-else aria-label="Customer initials">{{ initials }}</span>
  </div>
</template>

<style scoped>
.customer-image {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 8px;
  background: var(--color-feedback-info-subtle);
  color: var(--color-interactive-default);
  font-weight: 600;
  overflow: hidden;
}
.customer-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>
