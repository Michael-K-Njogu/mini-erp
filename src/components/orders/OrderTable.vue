<script setup>
import { formatCurrency, formatDate } from '../../utils/formatters'
import { ORDER_STATUS } from '../../constants/orderStatuses.js'
import {
  canEditOrder,
  canDeleteOrder,
  canPrintOrder,
  getEditRestrictionReason,
} from '../../business/orderPermissions.js'
import BaseButton from '../base/BaseButton.vue'
import BaseBadge from '../base/BaseBadge.vue'
import SortableHeader from '../base/SortableHeader.vue'
import { Eye, Trash2, SquarePen, MessageSquareText, Printer } from '@lucide/vue'

defineProps({
  orders: {
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

const emit = defineEmits(['sort', 'view', 'edit', 'delete', 'print'])

function getOrderStatusVariant(status) {
  switch (status) {
    case ORDER_STATUS.COMPLETED:
      return 'success'

    case ORDER_STATUS.PENDING:
      return 'warning'

    case ORDER_STATUS.CANCELED:
      return 'danger'

    case ORDER_STATUS.PROCESSING:
      return 'info'

    case ORDER_STATUS.DRAFT:
      return 'draft'

    default:
      return 'default'
  }
}
</script>

<template>
  <table class="data-table">
    <thead>
      <tr>
        <SortableHeader
          label="Order Number"
          field="orderNumber"
          :sort="sort"
          @sort="emit('sort', $event)"
        />
        <SortableHeader
          label="Customer"
          field="customerName"
          :sort="sort"
          @sort="emit('sort', $event)"
        />
        <SortableHeader
          label="Date Created"
          field="createdAt"
          :sort="sort"
          @sort="emit('sort', $event)"
        />
        <SortableHeader
          label="Grand Total"
          field="grandTotal"
          :sort="sort"
          @sort="emit('sort', $event)"
        />
        <SortableHeader label="Status" field="status" :sort="sort" @sort="emit('sort', $event)" />
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="order in orders" :key="order.id">
        <td>
          {{ order.orderNumber }}
          <span v-if="order.notes" class="notes-icon" :title="order.notes">
            <MessageSquareText size="16" />
          </span>
        </td>
        <td>{{ order.customerName }}</td>
        <td>{{ formatDate(order.createdAt) }}</td>
        <td>{{ formatCurrency(order.grandTotal) }}</td>
        <td>
          <BaseBadge :variant="getOrderStatusVariant(order.status)">
            {{ order.status }}
          </BaseBadge>
        </td>
        <td class="row-actions">
          <BaseButton
            variant="secondary"
            size="sm"
            :aria-label="`View Order: ${order.orderNumber}`"
            :title="`View Order: ${order.orderNumber}`"
            @click="$emit('view', order.id)"
            class="btn-icon"
          >
            <template #icon>
              <Eye size="16" />
            </template>
          </BaseButton>

          <BaseButton
            v-if="canEdit && canEditOrder(order)"
            variant="secondary"
            size="sm"
            :disabled="!!getEditRestrictionReason(order)"
            :title="getEditRestrictionReason(order) || `Edit Order: ${order.orderNumber}`"
            :aria-label="`Edit Order: ${order.orderNumber}`"
            @click="$emit('edit', order.id)"
            class="btn-icon"
          >
            <template #icon>
              <SquarePen size="16" />
            </template>
          </BaseButton>

          <BaseButton
            variant="secondary"
            size="sm"
            v-if="canPrintOrder(order)"
            :aria-label="`Print Order: ${order.orderNumber}`"
            :title="`Print Order: ${order.orderNumber}`"
            @click="$emit('print', order.id)"
            class="btn-icon"
          >
            <template #icon>
              <Printer size="16" />
            </template>
          </BaseButton>

          <BaseButton
            v-if="canDelete && canDeleteOrder(order)"
            :aria-label="`Delete Order: ${order.orderNumber}`"
            :title="`Delete Order: ${order.orderNumber}`"
            @click="$emit('delete', order)"
            variant="danger"
            size="sm"
            class="btn-icon"
          >
            <template #icon>
              <Trash2 size="16" />
            </template>
          </BaseButton>
        </td>
      </tr>
    </tbody>
  </table>
</template>
