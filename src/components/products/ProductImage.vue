<script setup>
import { ref, watch } from 'vue'
import { Package } from '@lucide/vue'
const props = defineProps({
  src: { type: String, default: null },
  name: { type: String, default: 'Product' },
})
const failed = ref(false)
watch(
  () => props.src,
  () => {
    failed.value = false
  },
)
</script>

<template>
  <div class="product-image">
    <img v-if="src && !failed" :src="src" :alt="name" loading="lazy" @error="failed = true" />
    <Package v-else :size="28" aria-label="Product image placeholder" role="img" />
  </div>
</template>

<style scoped>
.product-image {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 8px;
  background: var(--color-gray-100, #f3f4f6);
  color: var(--color-gray-400, #9ca3af);
  overflow: hidden;
}
.product-image img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}
</style>
