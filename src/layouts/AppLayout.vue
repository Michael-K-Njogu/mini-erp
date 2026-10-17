<script setup>
import AppSidebar from './AppSidebar.vue'
import AppHeader from './AppHeader.vue'
import DemoBanner from '../components/DemoBanner.vue'
</script>

<template>
  <div class="app-layout">
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
