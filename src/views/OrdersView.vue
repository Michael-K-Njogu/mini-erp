<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

import { useToast } from '../composables/useToast'
import { useOrders } from '../composables/useOrders'
import { useSorting } from '../composables/useSorting'
import { getOrders, deleteOrder } from '../services/orderService'
import { ORDER_STATUS_OPTIONS } from '../constants/orderStatuses.js'
import { useOrderFilters } from '../composables/useOrderFilters'
import { usePermissions } from '../composables/usePermissions'
import { PERMISSION } from '../constants/permissions'

import BaseSearchInput from '../components/base/BaseSearchInput.vue'
import BaseSelect from '../components/base/BaseSelect.vue'
import BasePagination from '../components/base/BasePagination.vue'
import BaseButton from '../components/base/BaseButton.vue'
import OrderTable from '../components/orders/OrderTable.vue'
import OrderTableSkeleton from '../components/orders/OrderTableSkeleton.vue'
import BaseEmptyState from '../components/base/BaseEmptyState.vue'
import { Plus, RefreshCw, Package, SearchX, CircleAlert } from '@lucide/vue'
import Alert from '../components/Alert.vue'
import BaseConfirmationModal from '../components/base/BaseConfirmationModal.vue'
import PageToolbar from '../layouts/PageToolbar.vue'

const router = useRouter()
const { info, error: showError } = useToast()
const showDeleteModal = ref(false)
const deleting = ref(false)
const selectedOrder = ref(null)
const refreshing = ref(false)
const { filters, hasActiveFilters, clearFilters } = useOrderFilters()
const { orders, loading, error, refresh } = useOrders(filters)
const { hasPermission } = usePermissions()

async function handleRefresh() {
  refreshing.value = true

  try {
    await refresh()
  } finally {
    refreshing.value = false
  }
}

function viewOrder(id) {
  router.push({ name: 'order-details', params: { id } })
}

function confirmDelete(order) {
  if (!hasPermission(PERMISSION.ORDER_DELETE)) {
    showError('You do not have permission to delete orders.')
    return
  }

  selectedOrder.value = order
  showDeleteModal.value = true
}

async function handleDelete() {
  if (!hasPermission(PERMISSION.ORDER_DELETE)) {
    showError('You do not have permission to delete orders.')
    return
  }

  if (!selectedOrder.value) return

  const order = selectedOrder.value

  deleting.value = true

  try {
    await deleteOrder(order.id)

    info(`Order ${order.orderNumber} deleted successfully.`, {
      title: 'Order Deleted',
    })

    showDeleteModal.value = false

    await refresh()
  } catch (err) {
    showError(`Failed to delete order ${order.orderNumber}. Please try again.`, {
      title: 'Failed to Delete Order',
    })
  } finally {
    deleting.value = false
  }
}

function resetDeleteState() {
  selectedOrder.value = null
}

function editOrder(id) {
  if (!hasPermission(PERMISSION.ORDER_EDIT)) {
    showError('You do not have permission to edit orders.')
    return
  }

  router.push({ name: 'order-edit', params: { id } })
}

const { sortBy } = useSorting(filters.sort)

function handlePageChange(page) {
  filters.pagination.currentPage = page
}

function handlePageSizeChange(size) {
  filters.pagination.pageSize = size
}

const emptyState = computed(() => {
  if (hasActiveFilters.value) {
    return {
      title: 'No orders found',
      description: 'Try adjusting your filters or clear them to see all orders.',
    }
  } else {
    return {
      title: 'No orders available',
      description: 'There are currently no orders in the system.',
    }
  }
})

const viewState = computed(() => {
  if (loading.value) return 'loading'
  if (error.value) return 'error'
  if (orders.value.length > 0) return 'ready'
  if (hasActiveFilters.value) return 'filtered-empty'

  return 'empty'
})
</script>

<template>
  <PageToolbar>
    <template #filters>
      <BaseSearchInput v-model="filters.query" placeholder="Search orders..." :disabled="loading" />

      <BaseSelect
        v-model="filters.status"
        name="status"
        id="status"
        :show-label="false"
        all-options-selected-text="All Statuses"
        :options="ORDER_STATUS_OPTIONS"
        :disabled="loading"
      />
    </template>

    <template #actions>
      <BaseButton
        :aria-label="refreshing ? 'Refreshing' : 'Refresh'"
        variant="secondary"
        :disabled="refreshing"
        :class="{ 'is-loading': refreshing }"
        @click="handleRefresh"
        class="btn-icon toolbar-icon-button"
      >
        <template #icon>
          <RefreshCw size="20" :class="{ 'is-loading': refreshing }" />
        </template>
      </BaseButton>

      <BaseButton label="Create Order" @click="router.push({ name: 'order-new' })">
        <template #icon>
          <Plus size="20" />
        </template>
      </BaseButton>
    </template>
  </PageToolbar>

  <OrderTableSkeleton v-if="viewState === 'loading'" :rows="6" />

  <div class="data-table-container" v-else-if="viewState === 'ready'">
    <OrderTable
      :orders="orders"
      :sort="filters.sort"
      :can-delete="hasPermission(PERMISSION.ORDER_DELETE)"
      :can-edit="hasPermission(PERMISSION.ORDER_EDIT)"
      @sort="sortBy"
      @view="viewOrder"
      @edit="editOrder"
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

  <Alert v-else-if="viewState === 'error'" type="danger" :message="error" alertIcon="CircleX">
    <template #title> Error Loading Orders </template>
    <template #icon>
      <CircleAlert size="18" />
    </template>
  </Alert>

  <BaseEmptyState v-else :title="emptyState.title" :description="emptyState.description">
    <template #icon>
      <Package v-if="viewState === 'empty'" size="48" />

      <SearchX v-else-if="viewState === 'filtered-empty'" size="48" />
    </template>

    <template #actions>
      <RouterLink
        v-if="viewState === 'empty' && hasPermission(PERMISSION.ORDER_CREATE)"
        :to="{ name: 'order-new' }"
        class="btn btn-primary"
      >
        <Plus size="16" />
        Create New Order
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
    v-if="selectedOrder"
    v-model="showDeleteModal"
    title="Delete Order"
    :message="`Are you sure you want to delete order ${selectedOrder.orderNumber}? This action cannot be undone.`"
    confirmText="Delete Order"
    cancelText="Cancel"
    :loading="deleting"
    @confirm="handleDelete"
    @closed="resetDeleteState"
  >
    <template #icon>
      <CircleAlert size="24" />
    </template>
  </BaseConfirmationModal>
</template>
