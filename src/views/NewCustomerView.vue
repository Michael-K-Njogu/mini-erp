<script setup>
import { useRouter } from 'vue-router'
import { ref } from 'vue'

import { createCustomerSchema } from '../validation/customerSchema.js'
import { createCustomer } from '../services/customerService'

import CustomerForm from '../components/customers/CustomerForm.vue'
import { useToast } from '../composables/useToast'

const router = useRouter()
const { success, warning, error: showError } = useToast()
const saving = ref(false)
const savedCustomer = ref(null)

async function saveCustomer(values) {
  if (saving.value || savedCustomer.value) return

  saving.value = true

  try {
    const { customer, imageError } = await createCustomer(values)
    savedCustomer.value = customer

    if (imageError) {
      console.error('Customer created, but the image could not be confirmed:', imageError)
      warning(
        `Customer ${customer.name} (${customer.customerNumber}) was created, but its image could not be confirmed. Check the customer before trying to upload the image again.`,
      )
    } else {
      success(`Customer ${customer.name} (${customer.customerNumber}) created successfully.`)
    }
  } catch (err) {
    console.error(err)

    showError(err.message || 'Failed to create customer')
  } finally {
    saving.value = false
  }

  if (savedCustomer.value) {
    try {
      await router.push({ name: 'customers' })
    } catch (err) {
      console.error('Could not navigate after creating customer:', err)
      showError('Customer was created, but the customer list could not be opened.')
    }
  }
}
</script>

<template>
  <p v-if="savedCustomer" role="status">
    Customer {{ savedCustomer.name }} ({{ savedCustomer.customerNumber }}) was created.
    <RouterLink :to="{ name: 'customers' }">Go to customers</RouterLink>
  </p>
  <CustomerForm
    v-else
    :validation-schema="createCustomerSchema"
    :submit-label="'Save Customer'"
    :loading="saving"
    :show-terms="true"
    @submit="saveCustomer"
  />
</template>
