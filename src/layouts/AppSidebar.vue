<script setup>
import { computed, ref } from 'vue'
import { PanelLeftClose, PanelLeftOpen, X } from '@lucide/vue'

import { navigation } from '../config/navigation.js'
import { usePermissions } from '../composables/usePermissions.js'
import { useSidebar } from '../composables/useSidebar.js'

import SidebarNavItem from '../components/SidebarNavItem.vue'

const { hasPermission } = usePermissions()
const { collapsed, toggle } = useSidebar()

const props = defineProps({
  mobile: { type: Boolean, default: false },
  open: { type: Boolean, default: false },
})
defineEmits(['close'])
const isCollapsed = computed(() => !props.mobile && collapsed.value)
const tooltip = ref(null)

function showTooltip(event) {
  if (!isCollapsed.value) return
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
  <aside
    v-show="!mobile || open"
    id="app-sidebar"
    class="sidebar"
    :class="{ 'sidebar--collapsed': isCollapsed }"
    :role="mobile ? 'dialog' : undefined"
    :aria-modal="mobile ? 'true' : undefined"
    :aria-label="mobile ? 'Navigation' : undefined"
  >
    <div class="sidebar-header">
      <div v-show="!isCollapsed" class="sidebar-brand">
        <span>Mikey's Mini-ERP</span>
      </div>
      <button
        v-if="mobile"
        class="sidebar-toggle sidebar-close"
        type="button"
        aria-label="Close navigation"
        @click="$emit('close')"
      >
        <X :size="24" aria-hidden="true" />
      </button>
      <button
        v-else
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
          <SidebarNavItem v-bind="item" :collapsed="isCollapsed" />
        </li>
      </ul>
    </nav>

    <div v-show="!isCollapsed" class="sidebar-footer">
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
