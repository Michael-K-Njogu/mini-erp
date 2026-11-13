<script setup>
import { ref } from 'vue'
import { useAuth } from '../../composables/useAuth'
import BaseImageUpload from '../base/BaseImageUpload.vue'
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'
import { PRODUCT_CATEGORIES } from '../../constants/productCategories'
import { PRODUCT_STATUS_OPTIONS, PRODUCT_STATUS } from '../../constants/productStatuses'
import { PRODUCT_UNITS } from '../../constants/productUnits'
import { PERMISSION } from '../../constants/permissions'
import { usePermissions } from '../../composables/usePermissions'

import BaseTextInput from '../base/BaseTextInput.vue'
import BaseTextArea from '../base/BaseTextArea.vue'
import BaseSelect from '../base/BaseSelect.vue'
import BaseSearchableSelect from '../base/BaseSearchableSelect.vue'
import BaseButton from '../base/BaseButton.vue'
import BaseFormSection from '../base/BaseFormSection.vue'
import { Info, DollarSign } from '@lucide/vue'

const props = defineProps({
  initialValues: {
    type: Object,
    default: () => ({
      sku: '',
      name: '',
      description: '',
      category: '',
      unit: '',
      costPrice: 0,
      sellingPrice: 0,
      stockQuantity: 0,
      status: PRODUCT_STATUS.ACTIVE,
    }),
  },

  submitLabel: {
    type: String,
    default: 'Save Product',
  },

  validationSchema: {
    type: Object,
    required: true,
  },

  loading: {
    type: Boolean,
    default: false,
  },
  showOpeningStock: {
    type: Boolean,
    default: true,
  },
})

const { isDemo } = useAuth()
const image = ref(props.initialValues.image || null)

const emit = defineEmits(['submit', 'cancel'])
const { hasPermission } = usePermissions()

const { defineField, errors, handleSubmit, resetForm } = useForm({
  validationSchema: toTypedSchema(props.validationSchema),
  initialValues: props.initialValues,
})

const onSubmit = handleSubmit((values) => {
  emit('submit', { ...values, image: image.value })
})

const fields = {
  sku: defineField('sku')[0],
  name: defineField('name')[0],
  description: defineField('description')[0],
  category: defineField('category')[0],
  unit: defineField('unit')[0],
  costPrice: defineField('costPrice')[0],
  sellingPrice: defineField('sellingPrice')[0],
  stockQuantity: defineField('stockQuantity')[0],
  status: defineField('status')[0],
}
</script>

<template>
  <form @submit.prevent="onSubmit">
    <BaseFormSection title="Product Details">
      <template #icon>
        <Info />
      </template>
      <template #content>
        <div class="form-group">
          <BaseImageUpload
            v-model="image"
            label="Product image (optional)"
            :disabled="loading"
            :upload-disabled="isDemo"
          />
          <p v-if="isDemo" class="image-upload-hint">
            Product image uploads are unavailable in demo accounts.
          </p>
        </div>
        <div class="form-grid">
          <div class="form-group">
            <BaseTextInput
              name="sku"
              id="sku"
              v-model="fields.sku.value"
              :error="errors.sku"
              :class="{ 'is-invalid': errors.sku }"
              label="SKU"
              placeholder="Enter SKU"
            />
            <p v-if="errors.sku" class="invalid">{{ errors.sku }}</p>
          </div>

          <div class="form-group">
            <BaseTextInput
              name="name"
              id="name"
              v-model="fields.name.value"
              :error="errors.name"
              :class="{ 'is-invalid': errors.name }"
              label="Name"
              placeholder="Enter product name"
            />
            <p v-if="errors.name" class="invalid">{{ errors.name }}</p>
          </div>

          <div class="form-group">
            <BaseTextArea
              name="description"
              id="description"
              v-model="fields.description.value"
              :error="errors.description"
              :class="{ 'is-invalid': errors.description }"
              label="Product Description"
              placeholder="Enter product description"
              :required="false"
            ></BaseTextArea>
            <p v-if="errors.description" class="invalid">{{ errors.description }}</p>
          </div>
        </div>
      </template>
    </BaseFormSection>

    <BaseFormSection title="Pricing and Stock">
      <template #icon>
        <DollarSign />
      </template>
      <template #content>
        <div class="form-grid">
          <div class="form-group">
            <BaseSearchableSelect
              v-model="fields.category.value"
              label="Product Category"
              :options="PRODUCT_CATEGORIES"
              :error="errors.category"
              :class="{ 'is-invalid': errors.category }"
              placeholder="Search categories..."
              all-options-selected-text="Select a category"
            />
            <p v-if="errors.category" class="invalid">{{ errors.category }}</p>
          </div>

          <div class="form-group">
            <BaseSelect
              name="unit"
              id="unit"
              all-options-selected-text="-- Select Unit --"
              v-model="fields.unit.value"
              :error="errors.unit"
              :class="{ 'is-invalid': errors.unit }"
              label="Unit of Measurement"
              :options="PRODUCT_UNITS"
            />
            <p v-if="errors.unit" class="invalid">{{ errors.unit }}</p>
          </div>

          <div class="form-group">
            <BaseTextInput
              name="sellingPrice"
              id="sellingPrice"
              v-model.number="fields.sellingPrice.value"
              :error="errors.sellingPrice"
              :class="{ 'is-invalid': errors.sellingPrice }"
              type="number"
              label="Selling Price"
              placeholder="Enter selling price"
            />
            <p v-if="errors.sellingPrice" class="invalid">{{ errors.sellingPrice }}</p>
          </div>

          <div class="form-group">
            <BaseTextInput
              name="costPrice"
              id="costPrice"
              v-model.number="fields.costPrice.value"
              :error="errors.costPrice"
              :class="{ 'is-invalid': errors.costPrice }"
              type="number"
              label="Cost Price"
              :required="false"
              placeholder="Enter cost price (optional)"
            />
            <p v-if="errors.costPrice" class="invalid">{{ errors.costPrice }}</p>
          </div>

          <div class="form-group">
            <BaseSelect
              all-options-selected-text="-- Select Status --"
              name="status"
              id="status"
              v-model="fields.status.value"
              :error="errors.status"
              :class="{ 'is-invalid': errors.status }"
              label="Product Status"
              :options="PRODUCT_STATUS_OPTIONS"
            />
            <p v-if="errors.status" class="invalid">{{ errors.status }}</p>
          </div>

          <div
            v-if="showOpeningStock && hasPermission(PERMISSION.INVENTORY_ADJUST)"
            class="form-group"
          >
            <BaseTextInput
              name="stockQuantity"
              id="stockQuantity"
              v-model.number="fields.stockQuantity.value"
              :error="errors.stockQuantity"
              :class="{ 'is-invalid': errors.stockQuantity }"
              type="number"
              step="any"
              label="Opening Stock Quantity"
              placeholder="Enter stock quantity"
            />
            <p v-if="errors.stockQuantity" class="invalid">{{ errors.stockQuantity }}</p>
          </div>
          <p v-else-if="showOpeningStock">
            Opening stock can be added by Admin or Operations after the product is created.
          </p>
        </div>
      </template>
    </BaseFormSection>

    <div class="form-actions">
      <BaseButton
        label="Cancel"
        :loading="props.loading"
        variant="secondary"
        @click="$emit('cancel')"
      />

      <BaseButton
        :label="props.submitLabel"
        :loading="props.loading"
        :disabled="props.loading"
        variant="primary"
        type="submit"
      />
    </div>
  </form>
</template>
