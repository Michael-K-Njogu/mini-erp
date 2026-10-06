<script setup>
import { onMounted, ref, computed } from 'vue'
import { useRouter } from 'vue-router'

import PageToolbar from './../layouts/PageToolbar.vue'
import BaseBadge from './../components/base/BaseBadge.vue'
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

function formatQuantity(value) {
  return new Intl.NumberFormat().format(value)
}

function getStockStatusLabel(item) {
  const status = getStockStatus(item)

  return {
    'in-stock': 'In stock',
    'low-stock': 'Low stock',
    'out-of-stock': 'Out of stock',
  }[status]
}

function getStockStatusVariant(status) {
  const variants = {
    'in-stock': 'success',
    'low-stock': 'warning',
    'out-of-stock': 'danger',
  }

  return variants[status] || 'default'
}

function viewInventory(item) {
  router.push({
    name: 'inventory-details',
    params: {
      id: item.id,
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
      <div v-if="loading" class="state-message">Loading inventory...</div>

      <div v-else-if="error" class="state-message error">
        {{ error }}
      </div>

      <div v-else-if="!filteredInventory.length" class="state-message">
        No inventory items found.
      </div>

      <div v-else class="data-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th>Product</th>
              <th>SKU</th>
              <th>On hand</th>
              <th>Reserved</th>
              <th>Available</th>
              <th>Reorder level</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            <tr
              class="clickable-row"
              v-for="item in filteredInventory"
              :key="item.id"
              @click="viewInventory(item)"
            >
              <td>
                {{ item.product?.name || 'Unknown product' }}
              </td>

              <td>
                {{ item.product?.sku || '—' }}
              </td>

              <td>
                {{ formatQuantity(item.quantityOnHand) }}
              </td>

              <td>
                {{ formatQuantity(item.quantityReserved) }}
              </td>

              <td>
                {{ formatQuantity(getAvailableQuantity(item)) }}
              </td>

              <td>
                {{ formatQuantity(item.reorderLevel) }}
              </td>

              <td>
                <BaseBadge :variant="getStockStatusVariant(getStockStatus(item))">
                  {{ getStockStatusLabel(getStockStatus(item)) }}
                </BaseBadge>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
