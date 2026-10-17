<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import PageToolbar from '../layouts/PageToolbar.vue'
import BaseBadge from '../components/base/BaseBadge.vue'
import BaseButton from '../components/base/BaseButton.vue'
import StockAdjustmentModal from '../components/inventory/StockAdjustmentModal.vue'

import {
  getInventoryItem,
  getAvailableQuantity,
  getStockStatus,
  adjustStock,
} from '../services/inventoryService'

import { getStockMovements } from '../services/stockMovementService'

const showAdjustmentModal = ref(false)
const adjusting = ref(false)
const adjustmentError = ref('')

const route = useRoute()
const router = useRouter()

const inventory = ref(null)
const movements = ref([])

const loading = ref(false)
const movementsLoading = ref(false)
const error = ref('')

const availableQuantity = computed(() => {
  if (!inventory.value) return 0

  return getAvailableQuantity(inventory.value)
})

const stockStatus = computed(() => {
  if (!inventory.value) return null

  return getStockStatus(inventory.value)
})

const stockStatusLabel = computed(() => {
  const labels = {
    'in-stock': 'In stock',
    'low-stock': 'Low stock',
    'out-of-stock': 'Out of stock',
  }

  return labels[stockStatus.value] || stockStatus.value
})

const stockStatusVariant = computed(() => {
  const variants = {
    'in-stock': 'success',
    'low-stock': 'warning',
    'out-of-stock': 'danger',
  }

  return variants[stockStatus.value] || 'default'
})

const stockAttentionMessage = computed(() => {
  if (stockStatus.value === 'out-of-stock') {
    return 'No stock is currently available.'
  }

  if (stockStatus.value === 'low-stock') {
    return `Available stock is at or below the reorder level of ${formatQuantity(inventory.value.reorderLevel)}.`
  }

  return ''
})

function formatQuantity(value) {
  return new Intl.NumberFormat().format(value)
}

function formatMovementQuantity(movement) {
  const quantity = formatQuantity(movement.quantity)

  if (movement.movementType === 'stock_in') return `+${quantity}`
  if (movement.movementType === 'stock_out') return `−${quantity}`

  return quantity
}

function formatDate(value) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function movementLabel(type) {
  const labels = {
    stock_in: 'Stock In',
    stock_out: 'Stock Out',
    adjustment: 'Adjustment',
    return: 'Return',
    damage: 'Damage',
  }

  return labels[type] || type
}

function movementVariant(type) {
  const variants = {
    stock_in: 'success',
    stock_out: 'danger',
    adjustment: 'warning',
    return: 'info',
    damage: 'danger',
  }

  return variants[type] || 'default'
}

async function loadInventory() {
  loading.value = true
  error.value = ''

  try {
    inventory.value = await getInventoryItem(route.params.id)
  } catch (err) {
    console.error('Failed to load inventory:', err)
    error.value = err.message || 'Unable to load inventory.'
  } finally {
    loading.value = false
  }
}

async function loadMovements() {
  if (!inventory.value?.productId) return

  movementsLoading.value = true

  try {
    movements.value = await getStockMovements(inventory.value.productId)
  } catch (err) {
    console.error('Failed to load stock movements:', err)
  } finally {
    movementsLoading.value = false
  }
}

async function loadPage() {
  await loadInventory()

  if (inventory.value) {
    await loadMovements()
  }
}

function goBack() {
  router.push({ name: 'inventory' })
}

async function handleStockAdjustment(values) {
  if (!inventory.value || adjusting.value) return

  adjusting.value = true
  adjustmentError.value = ''

  try {
    await adjustStock({
      productId: inventory.value.productId,
      ...values,
    })

    showAdjustmentModal.value = false

    await loadPage()
  } catch (err) {
    adjustmentError.value = err.message || 'Stock adjustment failed.'
  } finally {
    adjusting.value = false
  }
}

onMounted(loadPage)
</script>

<template>
  <div class="inventory-detail-view">
    <PageToolbar>
      <template #context>
        <div class="inventory-toolbar-context">
          <h1>{{ inventory?.product?.name || 'Inventory' }}</h1>
          <span v-if="inventory">SKU: {{ inventory.product?.sku || '—' }}</span>
        </div>
      </template>

      <template #actions>
        <BaseButton label="Back to Inventory" size="sm" variant="secondary" @click="goBack" />

        <BaseButton
          label="Adjust Stock"
          size="sm"
          variant="primary"
          @click="showAdjustmentModal = true"
        />
      </template>
    </PageToolbar>

    <StockAdjustmentModal
      :open="showAdjustmentModal"
      :loading="adjusting"
      :product="inventory?.product"
      :availableQuantity="availableQuantity"
      @close="showAdjustmentModal = false"
      @submit="handleStockAdjustment"
    />

    <main class="inventory-detail-content">
      <p v-if="adjustmentError" class="adjustment-error" role="alert">
        {{ adjustmentError }}
      </p>

      <div v-if="loading" class="state-message">Loading inventory...</div>

      <div v-else-if="error" class="state-message error">
        {{ error }}
      </div>

      <template v-else-if="inventory">
        <section class="stock-overview" aria-labelledby="stock-overview-title">
          <div class="stock-overview-heading">
            <div>
              <h2 id="stock-overview-title">Stock overview</h2>
              <p>Current quantities and reorder threshold.</p>
            </div>

            <BaseBadge :variant="stockStatusVariant">
              {{ stockStatusLabel }}
            </BaseBadge>
          </div>

          <div
            v-if="stockAttentionMessage"
            class="stock-attention"
            :class="`stock-attention--${stockStatus}`"
            role="status"
          >
            {{ stockAttentionMessage }}
          </div>

          <dl class="inventory-metrics">
            <div class="inventory-metric inventory-metric--available">
              <dt>Available to sell</dt>
              <dd>{{ formatQuantity(availableQuantity) }}</dd>
              <span>On hand minus reserved</span>
            </div>

            <div class="inventory-metric">
              <dt>On hand</dt>
              <dd>{{ formatQuantity(inventory.quantityOnHand) }}</dd>
              <span>Total physical stock</span>
            </div>

            <div class="inventory-metric">
              <dt>Reserved</dt>
              <dd>{{ formatQuantity(inventory.quantityReserved) }}</dd>
              <span>Committed to orders</span>
            </div>

            <div class="inventory-metric">
              <dt>Reorder level</dt>
              <dd>{{ formatQuantity(inventory.reorderLevel) }}</dd>
              <span>Restock threshold</span>
            </div>
          </dl>
        </section>

        <section class="stock-movements" aria-labelledby="stock-movements-title">
          <div class="stock-movements-header">
            <div>
              <h2 id="stock-movements-title">Stock movement history</h2>
              <p>Receipts and removals recorded for this product.</p>
            </div>
          </div>

          <div v-if="movementsLoading" class="state-message">Loading stock movements...</div>

          <div v-else-if="!movements.length" class="state-message">
            No stock movements recorded yet.
          </div>

          <div
            v-else
            class="stock-movements-table-wrapper"
            role="region"
            aria-label="Stock movement history"
            tabindex="0"
          >
            <table class="stock-movements-table">
              <thead>
                <tr>
                  <th scope="col">Date</th>
                  <th scope="col">Type</th>
                  <th scope="col">Quantity</th>
                  <th scope="col">Reason</th>
                  <th scope="col">Notes</th>
                </tr>
              </thead>

              <tbody>
                <tr v-for="movement in movements" :key="movement.id">
                  <td class="movement-date">
                    {{ formatDate(movement.createdAt) }}
                  </td>

                  <td>
                    <BaseBadge :variant="movementVariant(movement.movementType)">
                      {{ movementLabel(movement.movementType) }}
                    </BaseBadge>
                  </td>

                  <td class="movement-quantity">
                    {{ formatMovementQuantity(movement) }}
                  </td>

                  <td>
                    {{ movement.reason || '—' }}
                  </td>

                  <td class="movement-notes">
                    {{ movement.notes || '—' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </template>
    </main>
  </div>
</template>

<style scoped>
.inventory-toolbar-context {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 12px;
}

.inventory-toolbar-context span,
.stock-overview-heading p,
.stock-movements-header p {
  color: var(--text-colour-secondary);
  font-size: 13px;
  margin: 0;
}

.inventory-detail-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
}

.adjustment-error {
  background: var(--bg-danger-muted);
  border: 1px solid var(--border-danger);
  border-radius: var(--border-radius-md);
  color: var(--text-colour-danger);
  margin: 0;
  padding: 12px 16px;
}

.stock-overview,
.stock-movements {
  background: var(--bg-colour-white);
  border: 1px solid var(--border-colour-subtle);
  border-radius: var(--border-radius-lg);
}

.stock-overview {
  padding: 24px;
}

.stock-overview-heading,
.stock-movements-header {
  align-items: flex-start;
  display: flex;
  gap: 16px;
  justify-content: space-between;
}

.stock-overview-heading h2,
.stock-movements-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 4px;
}

.stock-attention {
  border-radius: var(--border-radius-md);
  font-size: 14px;
  margin-top: 20px;
  padding: 10px 12px;
}

.stock-attention--low-stock {
  background: var(--bg-warning-muted);
  color: var(--text-colour-warning);
}

.stock-attention--out-of-stock {
  background: var(--bg-danger-muted);
  color: var(--text-colour-danger);
}

.inventory-metrics {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
  margin: 24px 0 0;
}

.inventory-metric {
  background: var(--bg-colour-default);
  border: 1px solid var(--border-colour-subtle);
  border-radius: var(--border-radius-md);
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 16px;
}

.inventory-metric dt {
  color: var(--text-colour-secondary);
  font-size: 13px;
}

.inventory-metric dd {
  font-size: 24px;
  font-weight: 600;
  margin: 8px 0 4px;
  overflow-wrap: anywhere;
}

.inventory-metric > span {
  color: var(--text-colour-secondary);
  font-size: 12px;
}

.inventory-metric--available {
  background: var(--bg-info-muted);
  border-color: var(--border-info);
}

.inventory-metric--available dd {
  color: var(--text-colour-accent);
  font-size: 28px;
}

.stock-movements {
  overflow: hidden;
}

.stock-movements-header {
  padding: 20px 24px;
}

.stock-movements-table-wrapper {
  overflow-x: auto;
  outline-offset: -2px;
}

.stock-movements-table {
  border-collapse: collapse;
  min-width: 680px;
  width: 100%;
}

.stock-movements-table th,
.stock-movements-table td {
  border-top: 1px solid var(--border-colour-subtle);
  padding: 12px 16px;
  text-align: left;
  vertical-align: middle;
}

.stock-movements-table th {
  background: var(--bg-colour-default);
  color: var(--text-colour-secondary);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.stock-movements-table td {
  font-size: 14px;
}

.movement-date {
  white-space: nowrap;
}

.movement-quantity {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  white-space: nowrap;
}

.movement-notes {
  max-width: 280px;
  overflow-wrap: anywhere;
}

.stock-movements .state-message {
  border-top: 1px solid var(--border-colour-subtle);
  margin: 0;
  padding: 24px;
}

@media (max-width: 900px) {
  .inventory-metrics {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .stock-overview {
    padding: 18px;
  }

  .inventory-metrics {
    gap: 8px;
  }

  .inventory-metric {
    padding: 12px;
  }

  .inventory-metric dd {
    font-size: 20px;
  }

  .inventory-metric--available dd {
    font-size: 24px;
  }

  .stock-movements-header {
    padding: 18px;
  }
}
</style>
