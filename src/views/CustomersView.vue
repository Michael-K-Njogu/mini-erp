<script setup>
import { ref, computed } from 'vue'

import { useRouter } from 'vue-router'
import { useCustomers } from '../composables/useCustomers'
import { useSorting } from '../composables/useSorting'
import { useCustomerFilters } from '../composables/useCustomerFilters'
import { getCustomerTypeLabel, customerTypes } from '../constants/customerTypes.js'
import { formatCurrency, formatDate } from '../utils/formatters'
import { usePermissions } from '../composables/usePermissions'
import { PERMISSION } from '../constants/permissions'

import PageToolbar from '../layouts/PageToolbar.vue'
import BaseSearchInput from '../components/base/BaseSearchInput.vue'
import BaseSelect from '../components/base/BaseSelect.vue'
import BasePagination from '../components/base/BasePagination.vue'
import BaseButton from '../components/base/BaseButton.vue'
import SortableHeader from '../components/base/SortableHeader.vue'
import CustomerTableSkeleton from '../components/customers/CustomerTableSkeleton.vue'
import BaseEmptyState from '../components/base/BaseEmptyState.vue'

import { Plus, RefreshCw, UsersRound, SearchX, CircleAlert } from '@lucide/vue'

const router = useRouter()
const { filters, hasActiveFilters, clearFilters } = useCustomerFilters()
const { customers, loading, error, refresh } = useCustomers(filters)
const refreshing = ref(false)
const { hasPermission } = usePermissions()

async function handleRefresh() {
  refreshing.value = true

  try {
    await refresh()
  } finally {
    refreshing.value = false
  }
}

function viewCustomer(id) {
  router.push({ name: 'customer-details', params: { id } })
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
      title: 'No matching customers found',
      description:
        'No customers match your search criteria. Please adjust your filters and try again.',
      type: 'filter',
    }
  } else if (error.value) {
    return {
      title: 'Failed to load customers',
      description: 'An error occurred while trying to load customer data. Please try again.',
      type: 'error',
    }
  } else {
    return {
      title: 'No customers available',
      description:
        "Looks like you haven't added any customers yet. Create your first customer to get started.",
      type: 'initial',
    }
  }
})
</script>

<template>
  <PageToolbar>
    <template #filters>
      <BaseSearchInput
        v-model="filters.query"
        placeholder="Search customers..."
        :disabled="loading"
      />

      <BaseSelect
        v-model="filters.customerType"
        name="customerType"
        id="customerType"
        :show-label="false"
        all-options-selected-text="All Customer Types"
        :options="customerTypes"
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
        size="sm"
      >
        <template #icon>
          <RefreshCw size="20" :class="{ 'is-loading': refreshing }" />
        </template>
      </BaseButton>

      <BaseButton size="sm" label="Create Customer" @click="router.push({ name: 'customer-new' })">
        <template #icon>
          <Plus size="20" />
        </template>
      </BaseButton>
    </template>
  </PageToolbar>

  <CustomerTableSkeleton v-if="loading" :rows="5" />

  <div class="data-table-container" v-else-if="!loading && !error && customers.length > 0">
    <table class="data-table">
      <thead>
        <tr>
          <SortableHeader label="Name" field="name" :sort="filters.sort" @sort="sortBy" />
          <SortableHeader
            label="Customer ID"
            field="customerNumber"
            :sort="filters.sort"
            @sort="sortBy"
          />
          <SortableHeader label="Email" field="email" :sort="filters.sort" @sort="sortBy" />
          <SortableHeader
            label="Credit Limit"
            field="creditLimit"
            :sort="filters.sort"
            @sort="sortBy"
          />
          <SortableHeader
            label="Customer Type"
            field="customerType"
            :sort="filters.sort"
            @sort="sortBy"
          />
          <SortableHeader
            label="Created At"
            field="createdAt"
            :sort="filters.sort"
            @sort="sortBy"
          />
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="customer in customers"
          :key="customer.id"
          @click="viewCustomer(customer.id)"
          class="clickable-row"
        >
          <td>{{ customer.name }}</td>
          <td>{{ customer.customerNumber || '—' }}</td>
          <td>{{ customer.email }}</td>
          <td>{{ formatCurrency(customer.creditLimit) }}</td>
          <td>{{ getCustomerTypeLabel(customer.customerType) }}</td>
          <td>{{ formatDate(customer.createdAt) }}</td>
        </tr>
      </tbody>
    </table>

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
      <UsersRound v-if="emptyState.type === 'initial'" size="48" />

      <SearchX v-if="emptyState.type === 'filter'" size="48" />

      <CircleAlert v-else-if="emptyState.type === 'error'" size="48" />
    </template>

    <template #actions>
      <RouterLink
        v-if="emptyState.type === 'initial' && hasPermission(PERMISSION.CUSTOMER_CREATE)"
        :to="{ name: 'customer-new' }"
        class="btn btn-primary"
      >
        <Plus size="16" />
        Add Customer
      </RouterLink>

      <button v-if="emptyState.type === 'filter'" class="btn btn-secondary" @click="clearFilters">
        Clear Filters
      </button>

      <BaseButton v-else-if="emptyState.type === 'error'" label="Retry" @click="refresh">
        <template #icon>
          <RefreshCw size="16" />
        </template>
      </BaseButton>
    </template>
  </BaseEmptyState>
</template>
