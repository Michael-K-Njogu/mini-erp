<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { ORDER_STATUS } from '../constants/orderStatuses.js'

import { canEditOrder } from '../business/orderPermissions.js'

import { updateOrderSchema } from '../validation/orderSchema.js'

import { useToast } from '../composables/useToast'
import { getOrderById, saveOrderWithItems } from '../services/orderService'
import { getOrderItemsByOrder } from '../services/orderItemService'
import { getCustomers, getCustomerAccountSummary } from '../services/customerService'

import OrderForm from '../components/orders/OrderForm.vue'

const route = useRoute()
const router = useRouter()
const { success, error: showError } = useToast()
const customerOptions = ref([])
const order = ref(null)
const orderItems = ref([])
const loading = ref(true)
const saving = ref(false)
const customerAccount = ref(null)
const loadingCustomerAccount = ref(false)

async function loadCustomerAccount(customerId) {
  customerAccount.value = null

  if (!customerId) {
    return
  }

  loadingCustomerAccount.value = true

  try {
    customerAccount.value = await getCustomerAccountSummary(customerId)
  } catch (err) {
    console.error(err)

    showError(err.message || 'Unable to load customer account information.')
  } finally {
    loadingCustomerAccount.value = false
  }
}

async function loadCustomers() {
  try {
    const { data } = await getCustomers({
      page: 1,
      pageSize: 1000,
    })

    customerOptions.value = data.map((customer) => ({
      label: customer.name,
      value: customer.id,
      meta: `${customer.customerType} · ${customer.creditLimit}`,
    }))
  } catch (err) {
    showError(err.message)
  }
}

async function loadOrder() {
  loading.value = true

  try {
    order.value = await getOrderById(route.params.id)

    await loadCustomerAccount(order.value.customerId)

    const items = await getOrderItemsByOrder(order.value.id)

    orderItems.value = items
  } catch (err) {
    console.error(err)
    showError(err.message)
  } finally {
    loading.value = false
  }
}

async function saveOrder(values, status) {
  if (saving.value) return
  saving.value = true

  try {
    const { orderItems: items = [], ...orderValues } = values

    await saveOrderWithItems({
      id: order.value.id,
      ...orderValues,
      items,
      post: status === ORDER_STATUS.PENDING,
    })

    success(
      status === ORDER_STATUS.PENDING
        ? `Order ${order.value.orderNumber} posted successfully.`
        : `Order ${order.value.orderNumber} saved successfully.`,
    )

    router.push({
      name: 'orders',
    })
  } catch (err) {
    console.error(err)
    showError(err.message || 'An error occurred while updating the order.')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  loading.value = true

  try {
    await Promise.all([loadCustomers(), loadOrder()])
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
})

async function saveDraft(values) {
  await saveOrder(values, ORDER_STATUS.DRAFT)
}

async function postOrder(values) {
  await saveOrder(values, ORDER_STATUS.PENDING)
}

function deleteItem(item) {
  success(`${item.productName} removed from the order.`)
}

function handleClearAllItems() {
  success('All items removed from the order.')
}
</script>

<template>
  <div v-if="loading">
    <p>Loading order...</p>
  </div>

  <OrderForm
    v-if="order"
    :initial-values="order"
    :initial-order-items="orderItems"
    :customer-options="customerOptions"
    :customer-account="customerAccount"
    :loading-customer-account="loadingCustomerAccount"
    :validation-schema="updateOrderSchema"
    :editable="canEditOrder(order)"
    submit-label="Submit Order"
    :loading="saving"
    @post-order="postOrder"
    @save-draft="saveDraft"
    @delete-item="deleteItem"
    @clear-items="handleClearAllItems"
  />
</template>
