<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'

import InventoryTable from '../components/inventory/InventoryTable.vue'
import InventoryTableSkeleton from '../components/inventory/InventoryTableSkeleton.vue'
import PageToolbar from '../layouts/PageToolbar.vue'
import { getInventory, getStockStatus } from '../services/inventoryService'

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

      <InventoryTable v-else :inventory="filteredInventory" @view="viewInventory" />
    </div>
  </div>
</template>
