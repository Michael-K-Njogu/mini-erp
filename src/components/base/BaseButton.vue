<script setup>
defineProps({
  label: {
    type: String,
    default: '',
  },
  variant: {
    type: String,
    default: 'primary',
  },
  type: {
    type: String,
    default: 'button',
  },
  ariaLabel: {
    type: String,
    default: '',
  },
  size: {
    type: String,
    default: 'md',
  },
  loading: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <button
    :type="type"
    :class="`btn btn-${variant} btn-${size}`"
    :aria-label="ariaLabel || undefined"
  >
    <slot name="icon" />
    <span>{{ label }}</span>
  </button>
</template>
