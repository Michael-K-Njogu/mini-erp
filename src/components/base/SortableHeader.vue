<script setup>
import { computed } from 'vue'
import { ArrowDown, ArrowUp, ArrowUpDown } from '@lucide/vue'

const props = defineProps({
  label: {
    type: String,
    required: true,
  },

  field: {
    type: String,
    required: true,
  },

  sort: {
    type: Object,
    required: true,
  },
})

const emit = defineEmits(['sort'])

const isSorted = computed(() => props.sort.field === props.field)

const ariaSort = computed(() => {
  if (!isSorted.value) return 'none'

  return props.sort.direction === 'asc' ? 'ascending' : 'descending'
})

const icon = computed(() => {
  if (!isSorted.value) return ArrowUpDown

  return props.sort.direction === 'asc' ? ArrowUp : ArrowDown
})
</script>

<template>
  <th :aria-sort="ariaSort" scope="col">
    <button
      type="button"
      class="sort-button"
      :class="{ 'is-sorted': isSorted }"
      @click="emit('sort', field)"
    >
      {{ label }}
      <component :is="icon" class="sort-icon" :size="14" aria-hidden="true" />
    </button>
  </th>
</template>
