<script setup>
defineProps({
  title: {
    type: String,
    required: true,
  },
  icon: {
    type: [Object, Function],
    required: true,
  },
  iconSize: {
    type: Number,
    default: 20,
  },
  to: {
    type: String,
    required: true,
  },
  collapsed: {
    type: Boolean,
    default: false,
  },
})
</script>

<template>
  <RouterLink
    class="sidebar-nav-item"
    exact-active-class="active"
    :to="to"
    :data-label="title"
    :aria-label="collapsed ? title : undefined"
  >
    <component :is="icon" :size="iconSize" aria-hidden="true" />

    <span v-show="!collapsed">{{ title }}</span>
  </RouterLink>
</template>
