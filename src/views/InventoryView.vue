<script setup>
import { onMounted, ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'

import InventoryTable from '../components/inventory/InventoryTable.vue'
import InventoryTableSkeleton from '../components/inventory/InventoryTableSkeleton.vue'
import PageToolbar from '../layouts/PageToolbar.vue'
import { useSorting } from '../composables/useSorting'
import { getInventory, getStockStatus, getAvailableQuantity } from '../services/inventoryService'

const router = useRouter()
const inventory = ref([])
const loading = ref(false)
const error = ref('')

const searchQuery = ref('')
const statusFilter = ref('')

const filteredInventory = computed(() => {
  let items = inventory.value

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()

    items = items.filter((item) => {
      return (
        item.product?.name?.toLowerCase().includes(query) ||
        item.product?.sku?.toLowerCase().includes(query)
      )
    })
  }

  if (statusFilter.value) {
    items = items.filter((item) => getStockStatus(item) === statusFilter.value)
  }

  return items
})

const sort = reactive({ field: 'name', direction: 'asc' })
const { sortBy } = useSorting(sort)

const STOCK_STATUS_RANK = { 'out-of-stock': 0, 'low-stock': 1, 'in-stock': 2 }

const SORT_VALUE_GETTERS = {
  name: (item) => item.product?.name?.toLowerCase() ?? '',
  sku: (item) => item.product?.sku?.toLowerCase() ?? '',
  quantityOnHand: (item) => item.quantityOnHand,
  quantityReserved: (item) => item.quantityReserved,
  available: (item) => getAvailableQuantity(item),
  reorderLevel: (item) => item.reorderLevel,
  status: (item) => STOCK_STATUS_RANK[getStockStatus(item)],
}

const sortedInventory = computed(() => {
  const getValue = SORT_VALUE_GETTERS[sort.field]
  const modifier = sort.direction === 'asc' ? 1 : -1

  return [...filteredInventory.value].sort((a, b) => {
    const valueA = getValue(a)
    const valueB = getValue(b)

    if (valueA < valueB) return -1 * modifier
    if (valueA > valueB) return 1 * modifier

    return 0
  })
})

async function loadInventory() {
  loading.value = true
  error.value = ''

  try {
    inventory.value = await getInventory()
  } catch (err) {
    console.error('Failed to load inventory:', err)

    error.value = err.message || 'Unable to load inventory.'
  } finally {
    loading.value = false
  }
}

function viewInventory(id) {
  router.push({
    name: 'inventory-details',
    params: {
      id,
    },
  })
}

onMounted(loadInventory)
</script>

<template>
  <div class="inventory-view">
    <PageToolbar>
      <template #search>
        <input
          v-model="searchQuery"
          type="search"
          placeholder="Search products..."
          class="search-input"
        />
      </template>

      <template #filters>
        <select v-model="statusFilter" class="filter-select">
          <option value="">All stock levels</option>
          <option value="in-stock">In stock</option>
          <option value="low-stock">Low stock</option>
          <option value="out-of-stock">Out of stock</option>
        </select>
      </template>
    </PageToolbar>

    <div class="page-body">
      <InventoryTableSkeleton v-if="loading" :rows="5" />

      <div v-else-if="error" class="state-message error">
        {{ error }}
      </div>

      <div v-else-if="!filteredInventory.length" class="state-message">
        No inventory items found.
      </div>

      <InventoryTable
        v-else
        :inventory="sortedInventory"
        :sort="sort"
        @sort="sortBy"
        @view="viewInventory"
      />
    </div>
  </div>
</template>
