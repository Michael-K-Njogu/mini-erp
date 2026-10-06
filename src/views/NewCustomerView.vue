<script setup>
import { useRouter } from 'vue-router'
import { ref } from 'vue'

import { createCustomerSchema } from '../validation/customerSchema.js'
import { createCustomer } from '../services/customerService'

import CustomerForm from '../components/customers/CustomerForm.vue'
import { useToast } from '../composables/useToast'

const router = useRouter()
const { success, error: showError } = useToast()
const saving = ref(false)

async function saveCustomer(values) {
  if (saving.value) return

  saving.value = true

  try {
    const customer = await createCustomer(values)

    success(`Customer ${customer.name} (${customer.customerNumber}) created successfully.`)

    await router.push({
      name: 'customers',
    })
  } catch (err) {
    console.error(err)

    showError(err.message || 'Failed to create customer')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <CustomerForm
    :validation-schema="createCustomerSchema"
    :submit-label="'Save Customer'"
    :loading="saving"
    :show-terms="true"
    @submit="saveCustomer"
  />
</template>
