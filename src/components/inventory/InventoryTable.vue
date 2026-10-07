<script setup>
import BaseBadge from '../base/BaseBadge.vue'
import { getAvailableQuantity, getStockStatus } from '../../services/inventoryService'

defineProps({
  inventory: {
    type: Array,
    required: true,
  },
})

const emit = defineEmits(['view'])

function formatQuantity(value) {
  return new Intl.NumberFormat().format(value)
}

function getStockStatusLabel(item) {
  const labels = {
    'in-stock': 'In stock',
    'low-stock': 'Low stock',
    'out-of-stock': 'Out of stock',
  }

  return labels[getStockStatus(item)]
}

function getStockStatusVariant(status) {
  const variants = {
    'in-stock': 'success',
    'low-stock': 'warning',
    'out-of-stock': 'danger',
  }

  return variants[status] || 'default'
}
</script>

<template>
  <div class="data-table-container">
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
          v-for="item in inventory"
          :key="item.id"
          class="clickable-row"
          @click="emit('view', item.id)"
        >
          <td>{{ item.product?.name || 'Unknown product' }}</td>
          <td>{{ item.product?.sku || '—' }}</td>
          <td>{{ formatQuantity(item.quantityOnHand) }}</td>
          <td>{{ formatQuantity(item.quantityReserved) }}</td>
          <td>{{ formatQuantity(getAvailableQuantity(item)) }}</td>
          <td>{{ formatQuantity(item.reorderLevel) }}</td>
          <td>
            <BaseBadge :variant="getStockStatusVariant(getStockStatus(item))">
              {{ getStockStatusLabel(item) }}
            </BaseBadge>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
