<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useProduct } from '../composables/useProduct'
import { updateProductSchema } from '../validation/productSchema.js'
import { useToast } from '../composables/useToast.js'

import ProductForm from '../components/products/ProductForm.vue'
import BaseSkeleton from '../components/base/BaseSkeleton.vue'
import Alert from '../components/Alert.vue'
import { CircleAlert } from '@lucide/vue'

const route = useRoute()
const router = useRouter()

const { success, error: showError } = useToast()

const saving = ref(false)

const { product, loading, error, saveProduct } = useProduct(route.params.id)

async function update(values) {
  saving.value = true

  try {
    const updatedProduct = await saveProduct(values)

    success(`Product ${updatedProduct.name} updated successfully.`, {
      title: 'Product Updated',
    })

    await router.push({
      name: 'product-details',
      params: {
        id: updatedProduct.id,
      },
    })
  } catch (err) {
    showError(err.message || 'Failed to update product.', {
      title: 'Product Not Updated',
    })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseSkeleton v-if="loading" width="100%" height="20rem" />

  <Alert v-else-if="error" type="danger" :message="error">
    <template #icon>
      <CircleAlert size="18" />
    </template>

    <template #title> Error Loading Product </template>
  </Alert>

  <ProductForm
    v-else-if="product"
    submit-label="Update Product"
    :initial-values="product"
    :show-opening-stock="false"
    :loading="saving"
    :validation-schema="updateProductSchema"
    @submit="update"
    @cancel="router.back()"
  />
</template>
