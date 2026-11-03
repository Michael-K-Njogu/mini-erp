<script setup>
defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
})
</script>

<template>
  <section class="dashboard-section">
    <header class="dashboard-section__header">
      <h2 class="dashboard-section__title">{{ title }}</h2>
      <p v-if="subtitle" class="dashboard-section__subtitle">{{ subtitle }}</p>
    </header>

    <slot />
  </section>
</template>

<style scoped>
.dashboard-section {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--color-border-subtle);
  border-radius: var(--radius-sm);
  background: var(--color-bg-elevated);
  min-width: 0;
}

.dashboard-section__title {
  margin: 0;
  font: var(--font-weight-semibold) var(--font-size-md) / 24px var(--font-family-primary);
  color: var(--color-text-primary);
}

.dashboard-section__subtitle {
  margin: 0;
  font-size: var(--font-size-xs);
  color: var(--color-text-muted);
}
</style>
