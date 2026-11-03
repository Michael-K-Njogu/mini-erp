<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'

import { useToast } from '../composables/useToast'
import { useProducts } from '../composables/useProducts'
import { useSorting } from '../composables/useSorting'
import { deleteProduct } from '../services/productService'
import { PRODUCT_STATUS_OPTIONS } from '../constants/productStatuses.js'
import { PRODUCT_CATEGORY_OPTIONS } from '../constants/productCategories'
import { useProductFilters } from '../composables/useProductFilters'

import { usePermissions } from '../composables/usePermissions'
import { PERMISSION } from '../constants/permissions'

import PageToolbar from '../layouts/PageToolbar.vue'
import BaseSearchInput from '../components/base/BaseSearchInput.vue'
import BaseSelect from '../components/base/BaseSelect.vue'
import BasePagination from '../components/base/BasePagination.vue'
import BaseButton from '../components/base/BaseButton.vue'
import ProductTable from '../components/products/ProductTable.vue'
import ProductTableSkeleton from '../components/products/ProductTableSkeleton.vue'
import BaseEmptyState from '../components/base/BaseEmptyState.vue'
import { Plus, RefreshCw, Package, SearchX, CircleAlert } from '@lucide/vue'
import BaseConfirmationModal from '../components/base/BaseConfirmationModal.vue'

const router = useRouter()
const { info, error: showError } = useToast()
const showDeleteModal = ref(false)
const deleting = ref(false)
const selectedProduct = ref(null)
const refreshing = ref(false)
const { hasPermission } = usePermissions()

const { filters, hasActiveFilters, clearFilters } = useProductFilters()

const { products, loading, error, refresh } = useProducts(filters)

async function handleRefresh() {
  refreshing.value = true

  try {
    await refresh()
  } finally {
    refreshing.value = false
  }
}

function viewProduct(id) {
  router.push({ name: 'product-details', params: { id } })
}

function confirmDelete(product) {
  selectedProduct.value = product
  showDeleteModal.value = true
}

async function handleDelete() {
  if (!selectedProduct.value) return

  const product = selectedProduct.value

  deleting.value = true

  try {
    await deleteProduct(product.id)

    info(`Product ${product.name} has been successfully deleted.`, {
      title: 'Product Deleted',
    })

    showDeleteModal.value = false

    await refresh() // Refresh the product list after deletion
  } catch (err) {
    showError(`Failed to delete product ${product.name}. Please try again.`, {
      title: 'Failed to Delete Product',
    })
  } finally {
    deleting.value = false
  }
}

function resetDeleteState() {
  selectedProduct.value = null
}

function editProduct(id) {
  router.push({ name: 'product-edit', params: { id } })
}

const { sortBy } = useSorting(filters.sort)

function handlePageChange(page) {
  filters.pagination.currentPage = page
}

function handlePageSizeChange(size) {
  filters.pagination.pageSize = size
}

const emptyState = computed(() => {
  if (hasActiveFilters) {
    return {
      title: 'No products found',
      description: 'Try adjusting your filters or clear them to see all products.',
    }
  } else {
    return {
      title: 'No products available',
      description: 'There are currently no products in the system.',
    }
  }
})

const viewState = computed(() => {
  if (loading.value) return 'loading'
  if (error.value) return 'error'
  if (products.value.length > 0) return 'ready'
  if (hasActiveFilters) return 'filtered-empty'

  return 'empty'
})
</script>

<template>
  <PageToolbar>
    <template #filters>
      <BaseSearchInput
        v-model="filters.query"
        placeholder="Search by SKU or product name..."
        :disabled="loading"
      />

      <BaseSelect
        v-model="filters.category"
        :show-label="false"
        :options="PRODUCT_CATEGORY_OPTIONS"
        all-options-selected-text="All Categories"
        :disabled="loading"
      />

      <BaseSelect
        v-model="filters.status"
        :show-label="false"
        :options="PRODUCT_STATUS_OPTIONS"
        all-options-selected-text="All Statuses"
        :disabled="loading"
      />
    </template>

    <template #actions>
      <BaseButton
        :aria-label="refreshing ? 'Refreshing...' : 'Refresh'"
        variant="secondary"
        :disabled="refreshing"
        :class="{ 'is-loading': refreshing }"
        @click="handleRefresh"
        class="btn-icon toolbar-icon-button"
      >
        <template #icon>
          <RefreshCw size="20" />
        </template>
      </BaseButton>

      <BaseButton label="Add New Product" @click="router.push({ name: 'product-new' })">
        <template #icon>
          <Plus size="16" />
        </template>
      </BaseButton>
    </template>
  </PageToolbar>

  <ProductTableSkeleton v-if="viewState === 'loading'" />

  <div class="data-table-container" v-else-if="viewState === 'ready'">
    <ProductTable
      :products="products"
      :sort="filters.sort"
      :can-edit="hasPermission(PERMISSION.PRODUCT_EDIT)"
      :can-delete="hasPermission(PERMISSION.PRODUCT_DELETE)"
      @sort="sortBy"
      @view="viewProduct"
      @edit="editProduct"
      @delete="confirmDelete"
    />

    <BasePagination
      :current-page="filters.pagination.currentPage"
      :page-size="filters.pagination.pageSize"
      :total-items="filters.pagination.totalItems"
      @update:currentPage="handlePageChange"
      @update:pageSize="handlePageSizeChange"
    />
  </div>

  <BaseEmptyState v-else :title="emptyState.title" :description="emptyState.description">
    <template #icon>
      <Package v-if="viewState === 'empty'" size="48" />

      <SearchX v-else-if="viewState === 'filtered-empty'" size="48" />
    </template>

    <template #actions>
      <RouterLink
        v-if="viewState === 'empty' && hasPermission(PERMISSION.PRODUCT_CREATE)"
        :to="{ name: 'product-new' }"
        class="btn btn-primary"
      >
        <Plus size="16" />
        Create New Product
      </RouterLink>

      <button
        v-else-if="viewState === 'filtered-empty'"
        class="btn btn-secondary"
        @click="clearFilters"
      >
        Clear Filters
      </button>
    </template>
  </BaseEmptyState>

  <BaseConfirmationModal
    v-if="selectedProduct"
    v-model="showDeleteModal"
    title="Delete Product"
    :message="`Are you sure you want to delete product ${selectedProduct.name}? This action cannot be undone.`"
    confirmText="Delete Product"
    cancelText="Cancel"
    @confirm="handleDelete"
    @closed="resetDeleteState"
  >
    <template #icon>
      <CircleAlert size="24" />
    </template>
  </BaseConfirmationModal>
</template>
