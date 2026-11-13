<script setup>
import ProductImage from './ProductImage.vue'
// Utilities
import { formatCurrency, formatDate } from '../../utils/formatters'
import { PRODUCT_STATUS } from '../../constants/productStatuses.js'

import BaseBadge from '../base/BaseBadge.vue'
import BaseButton from '../base/BaseButton.vue'
import SortableHeader from '../base/SortableHeader.vue'
import { Eye, SquarePen, Trash2 } from '@lucide/vue'

defineProps({
  products: {
    type: Array,
    required: true,
  },

  sort: {
    type: Object,
    required: true,
  },
  canEdit: {
    type: Boolean,
    default: false,
  },

  canDelete: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['sort', 'view', 'edit', 'delete'])

function getProductStatusVariant(status) {
  switch (status) {
    case PRODUCT_STATUS.ACTIVE:
      return 'success'

    case PRODUCT_STATUS.INACTIVE:
      return 'danger'

    default:
      return 'default'
  }
}

function showProductUnit(product) {
  if (product.unit) {
    return `${product.stockQuantity} ${product.unit}${product.stockQuantity !== 1 ? 's' : ''}`
  } else {
    return product.stockQuantity
  }
}
</script>

<template>
  <table class="data-table">
    <thead>
      <tr>
        <SortableHeader label="Product" field="name" :sort="sort" @sort="emit('sort', $event)" />
        <SortableHeader label="SKU" field="sku" :sort="sort" @sort="emit('sort', $event)" />
        <SortableHeader
          label="Category"
          field="category"
          :sort="sort"
          @sort="emit('sort', $event)"
        />
        <SortableHeader
          label="Selling Price"
          field="sellingPrice"
          :sort="sort"
          @sort="emit('sort', $event)"
        />
        <SortableHeader
          label="Stock Quantity"
          field="stockQuantity"
          :sort="sort"
          @sort="emit('sort', $event)"
        />
        <SortableHeader label="Status" field="status" :sort="sort" @sort="emit('sort', $event)" />
        <SortableHeader
          label="Created At"
          field="createdAt"
          :sort="sort"
          @sort="emit('sort', $event)"
        />
        <th>Actions</th>
      </tr>
    </thead>

    <tbody>
      <tr
        class="clickable-row"
        v-for="product in products"
        :key="product.id"
        @click="$emit('view', product.id)"
      >
        <td>
          <div class="product-name-cell">
            <ProductImage :src="product.image" :name="product.name" /><span>{{
              product.name
            }}</span>
          </div>
        </td>
        <td>{{ product.sku }}</td>
        <td>{{ product.category }}</td>
        <td>{{ formatCurrency(product.sellingPrice) }}</td>
        <td>{{ showProductUnit(product) }}</td>
        <td>
          <BaseBadge :variant="getProductStatusVariant(product.status)">
            {{ product.status }}
          </BaseBadge>
        </td>
        <td>{{ formatDate(product.createdAt) }}</td>
        <td class="product-actions-cell" @click.stop>
          <div class="row-actions">
            <BaseButton
              :aria-label="`View ${product.name}`"
              :title="`View ${product.name}`"
              size="sm"
              variant="secondary"
              class="btn-icon"
              @click="$emit('view', product.id)"
              title="View Product"
            >
              <template #icon>
                <Eye size="16" />
              </template>
            </BaseButton>

            <BaseButton
              v-if="canEdit"
              :aria-label="`Edit ${product.name}`"
              :title="`Edit ${product.name}`"
              size="sm"
              variant="secondary"
              class="btn-icon"
              @click="$emit('edit', product.id)"
              title="Edit Product"
            >
              <template #icon>
                <SquarePen size="16" />
              </template>
            </BaseButton>

            <BaseButton
              v-if="canDelete"
              :aria-label="`Delete ${product.name}`"
              :title="`Delete ${product.name}`"
              size="sm"
              variant="danger"
              class="btn-icon"
              @click="$emit('delete', product)"
              title="Delete Product"
            >
              <template #icon>
                <Trash2 size="16" />
              </template>
            </BaseButton>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<style scoped>
.product-name-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}
.product-actions-cell {
  vertical-align: middle;
}

.product-actions-cell .row-actions {
  align-items: center;
  flex-wrap: nowrap;
}
</style>
