<script setup></script>

<template>
  <Teleport to="#page-toolbar-root" defer>
    <div class="page-toolbar">
      <div v-if="$slots.filters" class="page-toolbar-filters">
        <slot name="filters" />
      </div>

      <div v-if="$slots.context" class="page-toolbar-context">
        <slot name="context" />
      </div>

      <div v-if="$slots.actions" class="page-toolbar-actions">
        <slot name="actions" />
      </div>
    </div>
  </Teleport>
</template>

<style scoped>
.page-toolbar {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 24px;
  background-color: var(--color-bg-elevated);
  border-bottom: 1px solid var(--color-border-default);
}

.page-toolbar-filters,
.page-toolbar-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.page-toolbar-filters {
  flex: 1;
}

@media (max-width: 768px) {
  .page-toolbar {
    align-items: stretch;
    flex-direction: column;
    padding: 16px 20px;
  }

  .page-toolbar-filters,
  .page-toolbar-actions {
    flex-wrap: wrap;
  }
}
</style>
