<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

import { ORDER_STATUS } from '../constants/orderStatuses.js'

import { createOrderSchema } from '../validation/orderSchema.js'

import { useToast } from '../composables/useToast'
import { getCustomers, getCustomerAccountSummary } from '../services/customerService'
import { saveOrderWithItems } from '../services/orderService'

import OrderForm from '../components/orders/OrderForm.vue'

const router = useRouter()
const { success, error: showError } = useToast()
const customerOptions = ref([])
const customerAccount = ref(null)
const loadingCustomerAccount = ref(false)
const saving = ref(false)

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

onMounted(() => {
  loadCustomers()
})

// Load customer account information when a customer is selected
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

async function saveOrder(values, status) {
  if (saving.value) return
  saving.value = true

  try {
    const { orderItems = [], ...orderValues } = values

    const createdOrder = await saveOrderWithItems({
      ...orderValues,
      items: orderItems,
      post: status === ORDER_STATUS.PENDING,
    })

    success(`Order ${createdOrder.orderNumber} created successfully.`)

    await router.push({
      name: 'orders',
    })
  } catch (err) {
    console.error(err)
    showError(err.message)
  } finally {
    saving.value = false
  }
}

async function saveDraft(values) {
  await saveOrder(values, ORDER_STATUS.DRAFT)
}

async function postOrder(values) {
  await saveOrder(values, ORDER_STATUS.PENDING)
}
</script>

<template>
  <OrderForm
    :customer-options="customerOptions"
    :customer-account="customerAccount"
    :loading-customer-account="loadingCustomerAccount"
    :validation-schema="createOrderSchema"
    :loading="saving"
    submit-label="Create Order"
    @save-draft="saveDraft"
    @post-order="postOrder"
    @customer-change="loadCustomerAccount"
  />
</template>
