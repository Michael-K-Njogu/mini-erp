<script setup>
import { computed, ref } from 'vue'
import { PanelLeftClose, PanelLeftOpen } from '@lucide/vue'

import { navigation } from '../config/navigation.js'
import { usePermissions } from '../composables/usePermissions.js'
import { useSidebar } from '../composables/useSidebar.js'

import SidebarNavItem from '../components/SidebarNavItem.vue'

const { hasPermission } = usePermissions()
const { collapsed, toggle } = useSidebar()

const tooltip = ref(null)

function showTooltip(event) {
  if (!collapsed.value) return
  const link = event.target.closest('.sidebar-nav-item')
  if (!link) return
  const rect = link.getBoundingClientRect()
  tooltip.value = {
    label: link.dataset.label,
    top: rect.top + rect.height / 2,
    left: rect.right + 8,
  }
}

function hideTooltip() {
  tooltip.value = null
}

function onToggle() {
  hideTooltip()
  toggle()
}

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
  <aside class="sidebar" :class="{ 'sidebar--collapsed': collapsed }">
    <div class="sidebar-header">
      <div v-show="!collapsed" class="sidebar-brand">
        <img class="sidebar-logo" src="/favicon.svg" width="24" height="24" alt="" />
        <span>Mikey's Mini-ERP</span>
      </div>
      <button
        class="sidebar-toggle"
        type="button"
        :aria-label="collapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        :aria-expanded="!collapsed"
        aria-controls="primary-navigation"
        @click="onToggle"
      >
        <component :is="collapsed ? PanelLeftOpen : PanelLeftClose" :size="24" aria-hidden="true" />
      </button>
    </div>
    <nav
      id="primary-navigation"
      class="sidebar-nav"
      aria-label="Primary navigation"
      @mouseover="showTooltip"
      @mouseout="hideTooltip"
      @focusin="showTooltip"
      @focusout="hideTooltip"
      @keydown.esc="hideTooltip"
      @scroll="hideTooltip"
    >
      <ul class="sidebar-nav-list">
        <li v-for="item in visibleNavigation" :key="item.to" class="sidebar-nav-entry">
          <SidebarNavItem v-bind="item" :collapsed="collapsed" />
        </li>
      </ul>
    </nav>

    <div v-show="!collapsed" class="sidebar-footer">
      <small>Version 1.0.0</small>
    </div>

    <div
      v-if="tooltip"
      class="sidebar-tooltip"
      role="tooltip"
      :style="{ top: tooltip.top + 'px', left: tooltip.left + 'px' }"
    >
      {{ tooltip.label }}
    </div>
  </aside>
</template>
