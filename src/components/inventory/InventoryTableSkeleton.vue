<script setup>
import BaseSkeleton from '../base/BaseSkeleton.vue'

const { rows } = defineProps({
  rows: {
    type: Number,
    default: 5,
  },
})

const columns = 7
</script>

<template>
  <div class="data-table-skeleton" role="status" aria-label="Loading inventory" aria-busy="true">
    <div
      class="data-table-skeleton__header"
      :style="{ '--skeleton-columns': columns }"
      aria-hidden="true"
    >
      <BaseSkeleton v-for="column in columns" :key="column" width="100%" height="20px" />
    </div>

    <div
      v-for="row in rows"
      :key="row"
      class="data-table-skeleton__row"
      :style="{ '--skeleton-columns': columns }"
      aria-hidden="true"
    >
      <BaseSkeleton v-for="column in columns" :key="column" width="100%" height="20px" />
    </div>
  </div>
</template>
