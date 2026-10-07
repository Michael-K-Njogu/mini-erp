<script setup>
import BaseSkeleton from '../base/BaseSkeleton.vue'

const { rows } = defineProps({
  rows: {
    type: Number,
    default: 5,
  },
})

const columns = 6
</script>

<template>
  <div class="data-table-skeleton">
    <div class="data-table-skeleton__header" :style="{ '--skeleton-columns': columns }">
      <BaseSkeleton v-for="col in columns" :key="col" width="100%" height="20px" />
    </div>

    <div
      v-for="row in rows"
      :key="row"
      class="data-table-skeleton__row"
      :style="{ '--skeleton-columns': columns }"
    >
      <BaseSkeleton v-for="col in columns" :key="col" width="100%" height="20px" />
    </div>
  </div>
</template>
