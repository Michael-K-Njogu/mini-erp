<script setup>
import { computed } from 'vue'

import { navigation } from '../config/navigation.js'
import { usePermissions } from '../composables/usePermissions.js'

import SidebarNavItem from '../components/SidebarNavItem.vue'

const { hasPermission } = usePermissions()

const visibleNavigation = computed(() =>
  navigation.filter((item) => {
    if (!item.permission) {
      return true
    }

    return hasPermission(item.permission)
  }),
)
</script>

<template>
  <aside class="sidebar">
    <div class="sidebar-header">Mikey's Mini-ERP</div>
    <nav class="sidebar-nav">
      <SidebarNavItem v-for="item in visibleNavigation" :key="item.to" v-bind="item" />
    </nav>

    <div class="sidebar-footer">
      <small>Version 1.0.0</small>
    </div>
  </aside>
</template>
