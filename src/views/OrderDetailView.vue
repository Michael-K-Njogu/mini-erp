<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useToast } from '../composables/useToast'
import { useOrder } from '../composables/useOrder'
import { useOrderItems } from '../composables/useOrderItems'

import {
  updateOrder,
  deleteOrder,
  transitionOrder,
  updateOrderGrandTotal,
} from '../services/orderService'
import { getCustomerById } from '../services/customerService'

import { ORDER_STATUS, ORDER_STATUS_TIMESTAMP_FIELD } from '../constants/orderStatuses.js'
import { canTransitionTo } from '../business/orderTransitions'
import { getAvailableActions } from '../business/orderPermissions'
import { calculateLineTotal } from '../business/orderItemCalculations.js'
import {
  calculateSubtotal,
  calculateDiscount,
  calculateGrandTotal,
  calculateTotalItems,
} from '../business/orderCalculations'
import {
  notifyOrderPosted,
  notifyOrderProcessing,
  notifyOrderCompleted,
  notifyOrderCanceled,
} from '../business/orderNotifications'
import { printInvoice } from '../utils/printInvoice.js'

import { usePermissions } from '../composables/usePermissions'
import { PERMISSION } from '../constants/permissions'
import { formatCurrency } from '../utils/formatters.js'

import PageToolbar from '../layouts/PageToolbar.vue'
import OrderTimeline from '../components/orders/OrderTimeline.vue'
import OrderItemTable from '../components/order-items/OrderItemTable.vue'
import AddOrderItemModal from '../components/order-items/AddOrderItemModal.vue'
import BaseSkeleton from '../components/base/BaseSkeleton.vue'
import BaseButton from '../components/base/BaseButton.vue'
import BaseConfirmationModal from '../components/base/BaseConfirmationModal.vue'

import InvoiceDocument from '../components/invoices/InvoiceDocument.vue'
import InvoicePreviewPanel from '../components/invoices/InvoicePreviewPanel.vue'

import {
  CirclePlay,
  CheckCheck,
  Plus,
  Printer,
  Share2,
  Eye,
  X,
  Send,
  SquarePen,
  Trash2,
} from '@lucide/vue'

const ACTION = {
  EDIT: 'edit',
  DELETE: 'delete',
  POST: 'post',
  START_PROCESSING: 'start-processing',
  COMPLETE: 'complete',
  CANCEL: 'cancel',
  PREVIEW: 'preview',
  PRINT: 'print',
  SHARE: 'share',
}

const route = useRoute()
const router = useRouter()
const { info, error: showError } = useToast()
const showCancelModal = ref(false)
const showAddItemModal = ref(false)
const showDeleteModal = ref(false)
const showInvoicePreview = ref(false)
const customerLoading = ref(false)

const selectedOrderItem = ref(null)
const editingOrderItem = ref(null)
const showEditItemModal = ref(false)
const showDeleteItemModal = ref(false)

const customer = ref(null)
const { hasPermission } = usePermissions()

const canEditOrder = computed(() => {
  return actions.value.canEdit && hasPermission(PERMISSION.ORDER_EDIT)
})

function previewInvoice() {
  if (!requirePermission(PERMISSION.ORDER_VIEW)) return

  showInvoicePreview.value = true
}

function handlePrintInvoice() {
  if (!requirePermission(PERMISSION.ORDER_PRINT)) return

  try {
    printInvoice()
  } catch (err) {
    console.error(err)
    showError(err.message || 'Unable to print invoice.')
  }
}

async function performTransition(status, title, message, notify) {
  if (!order.value) return

  if (!canTransitionTo(order.value.status, status)) {
    showError(`Order cannot be changed from ${order.value.status} to ${status}.`)
    return
  }

  try {
    const updatedOrder = {
      ...order.value,
      status,
    }

    const timestampField = ORDER_STATUS_TIMESTAMP_FIELD[status]

    if (timestampField) {
      updatedOrder[timestampField] = new Date().toISOString()
    }

    await transitionOrder(updatedOrder, status)

    if (notify) {
      try {
        await notify(updatedOrder)
      } catch (notificationError) {
        console.error('Failed to create notification:', notificationError)
      }
    }

    info(message, {
      title,
    })

    await router.push({
      name: 'orders',
    })
  } catch (err) {
    console.error(err)
    showError(err.message)
  }
}

function requirePermission(permission, message) {
  if (hasPermission(permission)) {
    return true
  }

  showError(message || 'You do not have permission to perform this action.')
  return false
}

async function postOrder() {
  if (!requirePermission(PERMISSION.ORDER_POST)) return

  await performTransition(
    ORDER_STATUS.PENDING,
    'Order Posted',
    `Order ${order.value.orderNumber} has been posted for approval.`,
    notifyOrderPosted,
  )
}

async function startProcessing() {
  if (!requirePermission(PERMISSION.ORDER_PROCESS)) return

  await performTransition(
    ORDER_STATUS.PROCESSING,
    'Order Updated',
    `Order ${order.value.orderNumber} is now processing.`,
    notifyOrderProcessing,
  )
}

async function completeOrder() {
  if (!requirePermission(PERMISSION.ORDER_COMPLETE)) return

  await performTransition(
    ORDER_STATUS.COMPLETED,
    'Order Completed',
    `Order ${order.value.orderNumber} has been completed.`,
    notifyOrderCompleted,
  )
}

async function cancelOrder() {
  if (!requirePermission(PERMISSION.ORDER_CANCEL)) return

  await performTransition(
    ORDER_STATUS.CANCELED,
    'Order Canceled',
    `Order ${order.value.orderNumber} has been canceled.`,
    notifyOrderCanceled,
  )

  showCancelModal.value = false
}

async function handleDeleteOrder() {
  if (!requirePermission(PERMISSION.ORDER_DELETE)) return

  try {
    await deleteOrder(order.value.id)

    info('Order deleted successfully.', {
      title: 'Order Deleted',
    })

    router.push({
      name: 'orders',
    })
  } catch (err) {
    showError(err.message)
  }
}

const { order, loading, error, deleting, refresh } = useOrder(route.params.id)

watch(
  () => order.value?.customerId,
  async (customerId) => {
    if (!customerId) {
      customer.value = null
      customerLoading.value = false
      return
    }

    customer.value = null
    customerLoading.value = true

    try {
      customer.value = await getCustomerById(customerId)
    } catch (err) {
      console.error('Failed to load customer:', err)

      showError(err.message || 'Unable to load customer information.')
    } finally {
      customerLoading.value = false
    }
  },
  {
    immediate: true,
  },
)

const {
  orderItems,
  loading: loadingOrderItems,
  saving: savingOrderItems,

  addOrderItem,
  saveOrderItem,
  removeOrderItem,

  refresh: refreshOrderItems,
} = useOrderItems(route.params.id)

const subtotal = computed(() => calculateSubtotal(orderItems.value))

const totalDiscount = computed(() => calculateDiscount(orderItems.value))

const grandTotal = computed(() => calculateGrandTotal(orderItems.value))

const totalItems = computed(() => calculateTotalItems(orderItems.value))

async function handleOrderItemSubmit(values) {
  if (!requirePermission(PERMISSION.ORDER_EDIT)) return

  try {
    if (selectedOrderItem.value) {
      await saveOrderItem(selectedOrderItem.value.id, {
        ...selectedOrderItem.value,
        ...values,
        lineTotal: calculateLineTotal({
          quantity: values.quantity,
          unitPrice: values.unitPrice,
          discount: values.discount,
        }),
      })

      info('Order item updated successfully.', {
        title: 'Order Updated',
      })
    } else {
      const existingItem = orderItems.value.find((item) => item.productId === values.productId)

      if (existingItem) {
        const mergedQuantity = Number(existingItem.quantity) + Number(values.quantity)

        const mergedDiscount = Number(existingItem.discount) + Number(values.discount)

        await saveOrderItem(existingItem.id, {
          ...existingItem,
          quantity: mergedQuantity,
          discount: mergedDiscount,
          lineTotal: calculateLineTotal({
            quantity: mergedQuantity,
            unitPrice: existingItem.unitPrice,
            discount: mergedDiscount,
          }),
        })

        info('Product quantity updated successfully.', {
          title: 'Order Updated',
        })
      } else {
        await addOrderItem({
          ...values,
          orderId: order.value.id,
        })

        info('Product added to the order successfully.', {
          title: 'Order Updated',
        })
      }
    }

    await refreshOrderItems()
    await refreshOrderTotals()

    selectedOrderItem.value = null
    showAddItemModal.value = false
  } catch (err) {
    console.error('Error saving order item:', err)

    showError(err.message || 'Unable to save order item.')
  }
}

const actions = computed(() => {
  if (!order.value) {
    return {}
  }

  return getAvailableActions(order.value)
})

const actionButtons = computed(() => {
  if (!order.value) return []

  return [
    {
      id: ACTION.EDIT,
      label: 'Edit',
      variant: 'secondary',
      visible: actions.value.canEdit && hasPermission(PERMISSION.ORDER_EDIT),
      icon: SquarePen,
    },
    {
      id: ACTION.DELETE,
      label: 'Delete',
      variant: 'danger',
      visible: actions.value.canDelete && hasPermission(PERMISSION.ORDER_DELETE),
      icon: Trash2,
    },
    {
      id: ACTION.POST,
      label: 'Post Order',
      variant: 'primary',
      visible: actions.value.canPost && hasPermission(PERMISSION.ORDER_POST),
      icon: Send,
    },
    {
      id: ACTION.START_PROCESSING,
      label: 'Start Processing',
      variant: 'primary',
      visible: actions.value.canStartProcessing && hasPermission(PERMISSION.ORDER_PROCESS),
      icon: CirclePlay,
    },
    {
      id: ACTION.COMPLETE,
      label: 'Complete Order',
      variant: 'primary',
      visible: actions.value.canComplete && hasPermission(PERMISSION.ORDER_COMPLETE),
      icon: CheckCheck,
    },
    {
      id: ACTION.CANCEL,
      label: 'Cancel Order',
      variant: 'danger',
      visible: actions.value.canCancel && hasPermission(PERMISSION.ORDER_CANCEL),
      icon: X,
    },
    {
      id: ACTION.PREVIEW,
      label: 'Preview',
      variant: 'secondary',
      visible: actions.value.canPreview && hasPermission(PERMISSION.ORDER_VIEW),
      icon: Eye,
    },
    {
      id: ACTION.PRINT,
      label: 'Export / Print',
      variant: 'secondary',
      visible: actions.value.canPrint && hasPermission(PERMISSION.ORDER_PRINT),
      icon: Printer,
    },
    {
      id: ACTION.SHARE,
      label: 'Share',
      variant: 'secondary',
      visible: actions.value.canShare && hasPermission(PERMISSION.ORDER_SHARE),
      icon: Share2,
    },
  ].filter((action) => action.visible)
})

function handleAction(actionId) {
  switch (actionId) {
    case ACTION.EDIT:
      if (!requirePermission(PERMISSION.ORDER_EDIT)) return
      router.push({
        name: 'order-edit',
        params: {
          id: order.value.id,
        },
      })
      break

    case ACTION.DELETE:
      if (!requirePermission(PERMISSION.ORDER_DELETE)) return
      showDeleteModal.value = true
      break

    case ACTION.START_PROCESSING:
      if (!requirePermission(PERMISSION.ORDER_PROCESS)) return
      startProcessing()
      break

    case ACTION.POST:
      if (!requirePermission(PERMISSION.ORDER_POST)) return
      postOrder()
      break

    case ACTION.COMPLETE:
      if (!requirePermission(PERMISSION.ORDER_COMPLETE)) return
      completeOrder()
      break

    case ACTION.PREVIEW:
      previewInvoice()
      break

    case ACTION.PRINT:
      handlePrintInvoice()
      break

    case ACTION.CANCEL:
      if (!requirePermission(PERMISSION.ORDER_CANCEL)) return
      showCancelModal.value = true
      break

    default:
      console.warn(`Unknown action: ${actionId}`)
  }
}

const summary = computed(() => ({
  totalItems: calculateTotalItems(orderItems.value),
  subtotal: calculateSubtotal(orderItems.value),
  totalDiscount: calculateDiscount(orderItems.value),
  grandTotal: calculateGrandTotal(orderItems.value),
}))

async function refreshOrderTotals() {
  if (!order.value) return

  await updateOrderGrandTotal(order.value.id, grandTotal.value)

  await refresh()
}

const pageTitle = computed(() => {
  if (order.value?.orderNumber) {
    return order.value.orderNumber ? order.value.orderNumber : 'Order Details'
  } else if (loading.value) {
    return 'Loading order details...'
  } else {
    return 'Order Details'
  }
})

function handleEditOrderItem(item) {
  if (!requirePermission(PERMISSION.ORDER_EDIT)) return

  editingOrderItem.value = item
  showEditItemModal.value = true
}

async function handleDeleteOrderItem() {
  if (!selectedOrderItem.value) return

  if (!requirePermission(PERMISSION.ORDER_EDIT)) return

  try {
    await removeOrderItem(selectedOrderItem.value.id)

    await refreshOrderTotals()

    info('Product removed from the order successfully.', {
      title: 'Order Updated',
    })

    showDeleteItemModal.value = false
    selectedOrderItem.value = null
  } catch (err) {
    console.error('Error deleting order item:', err)

    showError(err.message || 'Unable to remove product from the order.')
  }
}

function handleCloseOrderItemModal() {
  showAddItemModal.value = false
  selectedOrderItem.value = null
}
</script>

<template>
  <PageToolbar>
    <template #context>
      <h1>{{ pageTitle }}</h1>
      <span v-if="order" :class="`badge badge--${order.status.toLowerCase()}`">{{
        order.status
      }}</span>
    </template>
    <template #actions>
      <BaseButton
        v-for="button in actionButtons"
        :key="button.id"
        :label="button.label"
        :variant="button.variant"
        :loading="loading"
        @click="handleAction(button.id)"
        size="sm"
      >
        <template v-if="button.icon" #icon>
          <component :is="button.icon" size="16" />
        </template>
      </BaseButton>
    </template>
  </PageToolbar>

  <main class="order-detail-page">
    <div
      v-if="loading"
      class="order-detail-skeleton"
      role="status"
      aria-label="Loading order details"
    >
      <BaseSkeleton height="28rem" />
      <div>
        <BaseSkeleton height="16rem" />
        <BaseSkeleton height="22rem" />
      </div>
    </div>

    <div v-else-if="error" class="order-error" role="alert">
      <strong>Unable to load this order</strong>
      <p>{{ error }}</p>
    </div>

    <div v-else-if="!order" class="order-error" role="status">
      <strong>Order not found</strong>
      <p>This order may have been removed or you may not have access to it.</p>
    </div>

    <div v-else-if="order" class="order-detail-content">
      <div class="order-detail-layout">
        <div class="order-detail-main">
          <section class="order-customer-card card" aria-label="Order customer">
            <div v-if="customer" class="order-customer-content">
              <div class="order-customer-identity">
                <div class="order-customer-avatar" aria-hidden="true">
                  {{ customer.name?.trim()?.charAt(0)?.toUpperCase() || '?' }}
                </div>
                <div class="order-customer-name">
                  <span class="order-customer-label">Customer</span>
                  <strong>{{ customer.name || 'Unnamed customer' }}</strong>
                  <span v-if="customer.customerNumber">{{ customer.customerNumber }}</span>
                </div>
              </div>

              <RouterLink
                :to="{ name: 'customer-details', params: { id: customer.id } }"
                class="order-sidebar-link"
              >
                View profile
              </RouterLink>
            </div>
            <p v-else-if="customerLoading" class="order-customer-loading" role="status">
              Loading customer details…
            </p>
            <p v-else class="order-customer-loading">Customer details are unavailable.</p>
          </section>

          <section class="order-items-card card" aria-labelledby="order-items-title">
            <header class="order-items-header">
              <div>
                <h2 id="order-items-title">Items in this order</h2>
                <p>
                  {{ summary.totalItems }} {{ summary.totalItems === 1 ? 'item' : 'items' }}
                  <span aria-hidden="true">·</span>
                  Review quantities, pricing, and discounts.
                </p>
              </div>

              <BaseButton
                v-if="canEditOrder"
                id="add-order-item"
                name="add-order-item"
                label="Add item"
                size="sm"
                @click="((selectedOrderItem = null), (showAddItemModal = true))"
              >
                <template #icon>
                  <Plus size="18" />
                </template>
              </BaseButton>
            </header>

            <div class="order-items-body">
              <OrderItemTable
                :items="orderItems"
                :loading="loadingOrderItems"
                :editable="canEditOrder"
                :show-grand-total="false"
                @edit="handleEditOrderItem"
                @delete="handleDeleteOrderItem"
              >
                <template #actions>
                  <BaseButton
                    v-if="canEditOrder"
                    label="Add first item"
                    @click="showAddItemModal = true"
                  >
                    <template #icon>
                      <Plus size="20" />
                    </template>
                  </BaseButton>
                </template>
              </OrderItemTable>
            </div>
            <footer class="order-summary" aria-label="Order totals">
              <div class="order-summary-stat">
                <span>Subtotal</span>
                <strong>{{ formatCurrency(summary.subtotal) }}</strong>
              </div>
              <div class="order-summary-stat">
                <span>Total discount</span>
                <strong>{{ formatCurrency(summary.totalDiscount) }}</strong>
              </div>
              <div class="order-summary-total">
                <span>Grand total</span>
                <strong>{{ formatCurrency(summary.grandTotal) }}</strong>
              </div>
            </footer>
          </section>
        </div>

        <aside class="order-detail-sidebar" aria-label="Order information">
          <OrderTimeline :order="order" />
        </aside>
      </div>
    </div>
  </main>

  <BaseConfirmationModal
    v-if="order"
    v-model="showCancelModal"
    title="Cancel Order"
    :message="`Are you sure you want to cancel order ${order.orderNumber}? This action cannot be undone.`"
    confirmText="Cancel Order"
    cancelText="Keep Order"
    @confirm="cancelOrder"
  />

  <BaseConfirmationModal
    v-if="order"
    v-model="showDeleteModal"
    title="Delete Order"
    :message="`Are you sure you want to delete order ${order.orderNumber}? This action cannot be undone.`"
    confirmText="Delete Order"
    cancelText="Keep Order"
    @confirm="handleDeleteOrder"
  />

  <BaseConfirmationModal
    v-if="selectedOrderItem"
    v-model="showDeleteItemModal"
    title="Remove Product"
    :message="`Are you sure you want to remove ${selectedOrderItem.productName} from this order?`"
    confirmText="Remove Product"
    cancelText="Keep Product"
    @confirm="handleDeleteOrderItem"
  />

  <AddOrderItemModal
    :key="selectedOrderItem?.id ?? 'new'"
    :open="showAddItemModal"
    :loading="savingOrderItems"
    :mode="selectedOrderItem ? 'edit' : 'new'"
    :initial-values="selectedOrderItem"
    @close="handleCloseOrderItemModal"
    @submit="handleOrderItemSubmit"
  />

  <InvoicePreviewPanel
    v-if="order"
    :open="showInvoicePreview"
    :order="order"
    :items="orderItems"
    :customer="customer"
    @close="showInvoicePreview = false"
  />

  <div id="invoice-print-container">
    <InvoiceDocument
      v-if="order && customer"
      :order="order"
      :items="orderItems"
      :customer="customer"
    />
  </div>
</template>

<style scoped>
.order-detail-page {
  min-width: 0;
}

.order-detail-skeleton {
  display: grid;
  gap: 24px;
  grid-template-columns: minmax(0, 1fr) minmax(290px, 350px);
}

.order-detail-skeleton > div:last-child {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.order-error {
  background: var(--bg-danger-muted);
  border: 1px solid var(--border-danger);
  border-radius: 6px;
  color: var(--text-colour-danger);
  padding: 16px 20px;
}

.order-error p {
  margin: 6px 0 0;
}

.order-detail-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.order-detail-layout {
  align-items: start;
  display: grid;
  gap: 24px;
  grid-template-columns: minmax(0, 1fr) minmax(290px, 350px);
}

.order-detail-main {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.order-items-card {
  margin: 0;
  min-width: 0;
  overflow: hidden;
  padding: 0;
}

.order-items-header {
  align-items: center;
  border-bottom: 1px solid var(--border-colour-subtle);
  display: flex;
  gap: 16px;
  justify-content: space-between;
  padding: 20px 24px;
}

.order-items-header h2,
.order-sidebar-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0;
}

.order-items-header p {
  color: var(--text-colour-secondary);
  font-size: 13px;
  margin: 5px 0 0;
}

.order-items-header p span {
  margin: 0 4px;
}

.order-summary {
  align-items: stretch;
  border-top: 1px solid var(--border-colour-subtle);
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr)) minmax(180px, 0.8fr);
  padding: 16px 24px;
}

.order-summary-stat,
.order-summary-total {
  display: flex;
  flex-direction: column;
  gap: 5px;
  justify-content: center;
  min-width: 0;
  padding: 4px 14px;
}

.order-summary-stat:first-child {
  padding-left: 0;
}

.order-summary-stat span,
.order-summary-total span {
  color: var(--text-colour-secondary);
  font-size: 12px;
}

.order-summary-stat strong {
  font-size: 13px;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.order-summary-total {
  background: var(--bg-info-muted);
  border: 1px solid var(--border-info);
  border-radius: var(--border-radius-md);
  padding: 10px 14px;
}

.order-summary-total strong {
  color: var(--text-colour-accent);
  font-size: 18px;
}

.order-items-body {
  min-width: 0;
  overflow-x: auto;
  padding: 0 16px 16px;
}

.order-detail-sidebar {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.order-detail-sidebar :deep(.order-timeline-card) {
  margin: 0;
  min-width: 0;
}

.order-customer-card {
  margin: 0;
  padding: 14px 18px;
}

.order-sidebar-link {
  color: var(--text-colour-accent);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
}

.order-sidebar-link:hover {
  text-decoration: underline;
}

.order-customer-content {
  align-items: center;
  display: flex;
  gap: 16px;
  justify-content: space-between;
}

.order-customer-identity {
  align-items: center;
  display: flex;
  gap: 12px;
  min-width: 0;
}

.order-customer-avatar {
  align-items: center;
  background: var(--bg-info-muted);
  border: 1px solid var(--border-colour-subtle);
  border-radius: 50%;
  color: var(--text-colour-accent);
  display: flex;
  flex: 0 0 42px;
  font-size: 16px;
  font-weight: 600;
  height: 42px;
  justify-content: center;
}

.order-customer-name {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.order-customer-label {
  color: var(--text-colour-secondary);
  font-size: 11px;
}

.order-customer-identity strong {
  font-size: 14px;
  overflow-wrap: anywhere;
}

.order-customer-identity span {
  color: var(--text-colour-secondary);
  font-size: 12px;
}

.order-customer-loading {
  color: var(--text-colour-secondary);
  font-size: 13px;
  margin: 0;
}

#invoice-print-container {
  display: none;
}

@media (max-width: 960px) {
  .order-detail-layout {
    grid-template-columns: minmax(0, 1fr);
  }

  .order-detail-skeleton {
    grid-template-columns: minmax(0, 1fr);
  }

  .order-detail-skeleton > div:last-child {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .order-detail-skeleton > div:last-child {
    display: flex;
  }

  .order-items-header {
    align-items: flex-start;
    flex-direction: column;
    padding: 18px;
  }

  .order-items-body {
    padding: 0 12px 12px;
  }

  .order-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 14px 12px;
  }

  .order-summary-stat {
    border-bottom: 1px solid var(--border-colour-subtle);
    padding: 10px 8px;
  }

  .order-summary-stat:first-child {
    padding-left: 8px;
  }

  .order-summary-total {
    grid-column: 1 / -1;
  }

  .order-customer-content {
    gap: 8px;
  }

  .order-customer-card {
    padding: 12px 14px;
  }
}
</style>
