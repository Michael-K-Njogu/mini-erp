<script setup>
import { computed } from 'vue'

import { formatCurrency } from '../../utils/formatters.js'
import { calculateGrandTotal } from '../../business/orderCalculations.js'

import BaseEmptyState from '../base/BaseEmptyState.vue'
import { SquarePen, Trash2, Package } from '@lucide/vue'
import BaseButton from '../base/BaseButton.vue'

const props = defineProps({
  items: {
    type: Array,
    default: () => [],
  },

  loading: {
    type: Boolean,
    default: false,
  },

  editable: {
    type: Boolean,
    default: false,
  },

  showGrandTotal: {
    type: Boolean,
    default: true,
  },
})

const grandTotal = computed(() => calculateGrandTotal(props.items))

const emit = defineEmits(['edit', 'delete'])
</script>

<template>
  <BaseEmptyState
    v-if="!loading && !items.length"
    title="No products added"
    description="You can save this order as a draft, but you'll need to add at least one product before the order can be processed."
  >
    <template #icon>
      <Package :size="48" />
    </template>

    <template #actions>
      <slot name="actions" />
    </template>
  </BaseEmptyState>

  <table v-else class="data-table">
    <thead>
      <tr>
        <th>Product</th>
        <th>Quantity</th>
        <th>Unit Price</th>
        <th>Discount</th>
        <th>Line Total</th>
        <th v-if="editable"></th>
      </tr>
    </thead>

    <tbody>
      <tr v-for="item in items" :key="item.id">
        <td>
          <div class="order-item-product">
            <div class="order-item-image-placeholder" aria-hidden="true">
              <Package :size="20" />
            </div>
            <div class="order-item-product-details">
              <div class="product-name">{{ item.productName }}</div>
              <div class="product-sku">{{ item.sku }}</div>
            </div>
          </div>
        </td>

        <td>{{ item.quantity }} {{ item.unit }}</td>

        <td>
          {{ formatCurrency(item.unitPrice) }}
        </td>

        <td>
          {{ formatCurrency(item.discount) }}
        </td>

        <td>
          {{ formatCurrency(item.lineTotal) }}
        </td>

        <td v-if="editable">
          <div class="row-actions">
            <BaseButton
              :aria-label="`Edit ${item.productName}`"
              :title="`Edit ${item.productName}`"
              variant="secondary"
              size="sm"
              @click="$emit('edit', item)"
              class="btn-icon"
            >
              <template #icon>
                <SquarePen :size="16" />
              </template>
            </BaseButton>

            <BaseButton
              :aria-label="`Delete ${item.productName}`"
              :title="`Remove ${item.productName}`"
              variant="danger"
              size="sm"
              @click="$emit('delete', item)"
              class="btn-icon"
            >
              <template #icon>
                <Trash2 :size="16" />
              </template>
            </BaseButton>
          </div>
        </td>
      </tr>
    </tbody>
    <tfoot v-if="showGrandTotal && items.length">
      <tr class="order-total-row">
        <td :colspan="editable ? 5 : 4">Grand Total</td>

        <td>
          {{ formatCurrency(grandTotal) }}
        </td>
      </tr>
    </tfoot>
  </table>
</template>

<style scoped>
.order-item-product {
  align-items: center;
  display: flex;
  gap: 12px;
  min-width: 190px;
}

.order-item-image-placeholder {
  align-items: center;
  background: linear-gradient(145deg, var(--bg-info-muted), var(--bg-colour-default));
  border: 1px solid var(--border-colour-subtle);
  border-radius: var(--border-radius-md);
  color: var(--text-colour-accent);
  display: flex;
  flex: 0 0 48px;
  height: 48px;
  justify-content: center;
}

.order-item-product-details {
  min-width: 0;
}

.order-item-product-details .product-name {
  font-weight: 600;
  overflow-wrap: anywhere;
}

.order-item-product-details .product-sku {
  color: var(--text-colour-secondary);
  font-size: 12px;
  margin-top: 3px;
}
</style>
