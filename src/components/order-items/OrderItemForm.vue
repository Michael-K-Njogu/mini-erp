<script setup>
import { computed, watch } from 'vue'

import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'

import { useProducts } from '../../composables/useProducts'
import { formatCurrency } from '../../utils/formatters.js'
import { calculateLineTotal } from '../../business/orderItemCalculations.js'

import BaseSelect from '../base/BaseSelect.vue'
import BaseSearchableSelect from '../base/BaseSearchableSelect.vue'
import BaseTextInput from '../base/BaseTextInput.vue'
import BaseButton from '../base/BaseButton.vue'
import BaseFormContainer from '../base/BaseFormContainer.vue'
import BaseFormSection from '../base/BaseFormSection.vue'

const props = defineProps({
  validationSchema: {
    type: Object,
    required: true,
  },

  initialValues: {
    type: Object,
    default: () => ({
      productId: '',
      quantity: 1,
      discount: 0,
    }),
  },

  mode: {
    type: String,
    default: 'new',
  },

  loading: {
    type: Boolean,
    default: false,
  },

  submitLabel: {
    type: String,
    default: 'Add Item',
  },
})

const emit = defineEmits(['submit', 'cancel'])
const isEditMode = computed(() => props.mode === 'edit') // Determine if the form is in edit mode based on the mode prop

const { products } = useProducts()

const { handleSubmit, defineField, errors, resetForm } = useForm({
  validationSchema: toTypedSchema(props.validationSchema),
  initialValues: props.initialValues,
})

const [productId] = defineField('productId')
const [quantity] = defineField('quantity')
const [discount] = defineField('discount')

watch(
  () => props.initialValues,
  (values) => {
    resetForm({
      values: {
        productId: values?.productId ?? '',
        quantity: values?.quantity ?? 1,
        discount: values?.discount ?? 0,
      },
    })
  },
  {
    deep: true,
    immediate: true,
  },
)

const selectedProduct = computed(() => {
  if (isEditMode.value) {
    return {
      id: props.initialValues?.productId,
      name: props.initialValues?.productName,
      sku: props.initialValues?.sku,
      unit: props.initialValues?.unit,
      sellingPrice: props.initialValues?.unitPrice,
      category: props.initialValues?.category ?? '',
    }
  }

  return products.value.find((product) => product.id === productId.value)
})

const sku = computed(() => selectedProduct.value?.sku ?? '')

const unit = computed(() => selectedProduct.value?.unit ?? '')

const category = computed(() => selectedProduct.value?.category ?? '')

const unitPrice = computed(() => selectedProduct.value?.sellingPrice ?? 0)

const lineTotal = computed(() =>
  calculateLineTotal({
    quantity: quantity.value,
    unitPrice: unitPrice.value,
    discount: discount.value,
  }),
)

const onSubmit = handleSubmit((values) => {
  if (!selectedProduct.value) return

  emit('submit', {
    ...values,
    sku: selectedProduct.value.sku,
    productName: selectedProduct.value.name,
    unit: selectedProduct.value.unit,
    unitPrice: selectedProduct.value.sellingPrice,
    lineTotal: lineTotal.value,
  })
})

const productOptions = computed(() =>
  products.value.map((product) => ({
    label: product.name,
    value: product.id,
  })),
)
</script>

<template>
  <form class="order-item-form" @submit.prevent="onSubmit">
    <div class="form-content">
      <!-- Render product selection dropdown -->
      <div class="form-group" v-if="!isEditMode">
        <BaseSearchableSelect
          v-model="productId"
          label="Select Product"
          :options="productOptions"
          :error="errors.productId"
          placeholder="Search products..."
          all-options-selected-text="Select a product"
        />
        <p v-if="errors.productId" class="invalid">{{ errors.productId }}</p>
      </div>

      <!-- Render product summary if a product is selected -->
      <div class="summary-grid" v-if="selectedProduct">
        <div class="summary-item">
          <span class="summary-label">SKU</span>
          <span class="summary-info">{{ selectedProduct.sku }}</span>
        </div>

        <div class="summary-item">
          <span class="summary-label">Category</span>
          <span class="summary-info">{{ selectedProduct.category }}</span>
        </div>

        <div class="summary-item">
          <span class="summary-label">Unit</span>
          <span class="summary-info">{{ selectedProduct.unit }}</span>
        </div>

        <div class="summary-item">
          <span class="summary-label">Selling Price</span>
          <span class="summary-info">{{ formatCurrency(selectedProduct.sellingPrice) }}</span>
        </div>
      </div>

      <!-- Render quantity and discount inputs if a product is selected -->
      <div class="form-row" v-if="selectedProduct">
        <div class="form-group">
          <BaseTextInput
            id="quantity"
            name="quantity"
            v-model="quantity"
            type="number"
            label="Quantity"
            :error="errors.quantity"
          />

          <p v-if="errors.quantity" class="invalid">{{ errors.quantity }}</p>
        </div>

        <div class="form-group">
          <BaseTextInput
            id="discount"
            name="discount"
            v-model="discount"
            type="number"
            label="Discount"
            :error="errors.discount"
          />

          <p v-if="errors.discount" class="invalid">{{ errors.discount }}</p>
        </div>
      </div>

      <div class="line-total">
        {{ formatCurrency(lineTotal) }}
      </div>
    </div>

    <div class="form-actions">
      <BaseButton type="button" label="Cancel" variant="secondary" @click="$emit('cancel')" />

      <BaseButton :label="submitLabel" type="submit" :loading="loading" />
    </div>
  </form>
</template>

<style scoped>
.form-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.form-group {
  margin-bottom: 0;
}

.base-text-input-wrapper,
.base-select-wrapper {
  flex: 1;
}

.form-row {
  display: flex;
  gap: 8px;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px;
  margin-top: 0;
}

.summary-grid {
  border-radius: 4px;
  background-color: var(--color-bg-default);
  border: 1px solid var(--color-border-default);
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  padding: 16px;
}

.summary-label {
  display: block;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-text-secondary);
  text-transform: uppercase;
}
.summary-info {
  display: block;
  font-size: 14px;
}

.order-item-form {
  display: flex;
  flex-direction: column;
}

.line-total {
  display: flex;
  justify-content: flex-end;
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-interactive-default);
  padding: 16px;
}

@media (max-width: 600px) {
  .summary-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 400px) {
  .form-row {
    flex-direction: column;
  }
}
</style>
