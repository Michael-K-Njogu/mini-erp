<script setup>
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import DemoBanner from '../components/DemoBanner.vue'
import { useSidebar } from '../composables/useSidebar.js'

const { collapsed } = useSidebar()
</script>

<template>
  <div class="app-layout" :class="{ 'app-layout--collapsed': collapsed }">
    <AppSidebar />

    <main class="app-main">
      <DemoBanner />
      <AppHeader />
      <div id="page-toolbar-root" class="page-toolbar-region"></div>
      <div class="page-content">
        <RouterView />
      </div>
    </main>
  </div>
</template>
