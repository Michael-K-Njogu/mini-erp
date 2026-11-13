<script setup>
import { useForm } from 'vee-validate'
import { toTypedSchema } from '@vee-validate/zod'

import { customerTypes } from '../../constants/customerTypes.js'
import { SECTORS } from '../../constants/industryTypes.js'
import { REGIONS } from '../../constants/regions.js'
import { useAuth } from '../../composables/useAuth'

import BaseFormLabel from '../base/BaseFormLabel.vue'
import BaseSelect from '../base/BaseSelect.vue'
import BaseSearchableSelect from '../base/BaseSearchableSelect.vue'
import BaseTextInput from '../base/BaseTextInput.vue'
import BaseImageUpload from '../base/BaseImageUpload.vue'
import BaseButton from '../base/BaseButton.vue'
import BaseFormSection from '../base/BaseFormSection.vue'

import { User, Mail, Truck, CreditCard, Handshake, Info, LoaderCircle } from '@lucide/vue'

const props = defineProps({
  initialValues: {
    type: Object,
    default: () => ({
      name: '',
      customerType: '',
      sector: '',
      region: '',
      vatNumber: '',

      contactPerson: '',
      phonePrimary: '',
      phoneSecondary: '',
      email: '',

      deliveryAddress: '',
      city: '',

      image: null,

      creditLimit: null,
      creditStatus: '',
      acceptedTerms: false,
    }),
  },

  submitLabel: {
    type: String,
    default: 'Save Customer',
  },

  validationSchema: {
    type: Object,
    required: true,
  },

  loading: {
    type: Boolean,
    default: false,
  },

  showTerms: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['submit', 'cancel'])
const { isDemo } = useAuth()

const { defineField, errors, handleSubmit, resetForm } = useForm({
  validationSchema: toTypedSchema(props.validationSchema),
  initialValues: props.initialValues,
})

const onSubmit = handleSubmit((values) => {
  emit('submit', values)
})

const fields = {
  name: defineField('name')[0],
  customerType: defineField('customerType')[0],
  sector: defineField('sector')[0],
  region: defineField('region')[0],
  vatNumber: defineField('vatNumber')[0],

  contactPerson: defineField('contactPerson')[0],
  email: defineField('email')[0],
  phonePrimary: defineField('phonePrimary')[0],
  phoneSecondary: defineField('phoneSecondary')[0],

  deliveryAddress: defineField('deliveryAddress')[0],
  city: defineField('city')[0],

  image: defineField('image')[0],

  creditLimit: defineField('creditLimit')[0],
  creditStatus: defineField('creditStatus')[0],

  notes: defineField('notes')[0],
  acceptedTerms: defineField('acceptedTerms')[0],
}
</script>

<template>
  <form @submit.prevent="onSubmit">
    <!-- General Customer Details -->
    <BaseFormSection title="Customer Information">
      <template #icon>
        <User />
      </template>

      <template #content>
        <div class="form-group">
          <BaseImageUpload
            v-model="fields.image.value"
            label="Customer / Business Logo"
            hint="Upload a JPG, JPEG or PNG, max 2MB."
            :upload-disabled="isDemo"
          />
          <p v-if="isDemo" class="image-upload-hint">
            Customer image uploads are unavailable in demo accounts.
          </p>
          <p v-if="errors.image" class="invalid">{{ errors.image }}</p>
        </div>

        <div class="form-grid">
          <div class="form-group">
            <BaseTextInput
              name="name"
              id="name"
              label="Customer / Business Name"
              :class="{ 'is-invalid': errors.name }"
              v-model="fields.name.value"
              placeholder="Enter customer name"
            />
            <p v-if="errors.name" class="invalid">{{ errors.name }}</p>
          </div>

          <div class="form-group">
            <BaseSelect
              name="customerType"
              id="customerType"
              label="Customer Type"
              :class="{ 'is-invalid': errors.customerType }"
              v-model="fields.customerType.value"
              :options="customerTypes"
              all-options-selected-text="-- Select a customer type --"
            />
            <p v-if="errors.customerType" class="invalid">{{ errors.customerType }}</p>
          </div>

          <div class="form-group">
            <BaseSearchableSelect
              placeholder="Search and select a sector"
              name="sector"
              id="sector"
              label="Sector / Industry"
              :error="errors.sector"
              :class="{ 'is-invalid': errors.sector }"
              v-model="fields.sector.value"
              :options="SECTORS"
              all-options-selected-text="Select a sector"
            />
            <p v-if="errors.sector" class="invalid">{{ errors.sector }}</p>
          </div>

          <div class="form-group">
            <BaseSearchableSelect
              placeholder="Search and select a region"
              name="region"
              id="region"
              label="Region"
              :error="errors.region"
              :class="{ 'is-invalid': errors.region }"
              v-model="fields.region.value"
              :options="REGIONS"
              all-options-selected-text="Select a region"
            />
            <p v-if="errors.region" class="invalid">{{ errors.region }}</p>
          </div>

          <div class="form-group">
            <BaseTextInput
              name="vatNumber"
              id="vatNumber"
              label="VAT Number"
              :class="{ 'is-invalid': errors.vatNumber }"
              v-model="fields.vatNumber.value"
              placeholder="Enter VAT number"
            />
            <p v-if="errors.vatNumber" class="invalid">{{ errors.vatNumber }}</p>
          </div>
        </div>
      </template>
    </BaseFormSection>

    <BaseFormSection title="Primary Contact">
      <template #icon>
        <Mail />
      </template>

      <template #content>
        <div class="form-grid">
          <div class="form-group">
            <BaseTextInput
              name="contactPerson"
              id="contactPerson"
              label="Contact Person"
              v-model="fields.contactPerson.value"
              :class="{ 'is-invalid': errors.contactPerson }"
              placeholder="Enter contact person's name"
            />
            <p v-if="errors.contactPerson" class="invalid">
              {{ errors.contactPerson }}
            </p>
          </div>

          <div class="form-group">
            <BaseTextInput
              name="phonePrimary"
              id="phonePrimary"
              label="Phone Number"
              v-model="fields.phonePrimary.value"
              :class="{ 'is-invalid': errors.phonePrimary }"
              placeholder="Enter phone number"
              type="tel"
            />
            <p v-if="errors.phonePrimary" class="invalid">
              {{ errors.phonePrimary }}
            </p>
          </div>

          <div class="form-group">
            <BaseTextInput
              :required="false"
              name="phoneSecondary"
              id="phoneSecondary"
              label="Secondary Phone Number"
              v-model="fields.phoneSecondary.value"
              :class="{ 'is-invalid': errors.phoneSecondary }"
              placeholder="Enter secondary phone number"
              type="tel"
            />
            <p v-if="errors.phoneSecondary" class="invalid">
              {{ errors.phoneSecondary }}
            </p>
          </div>

          <div class="form-group">
            <BaseTextInput
              name="email"
              id="email"
              label="Email Address"
              v-model="fields.email.value"
              :class="{ 'is-invalid': errors.email }"
              placeholder="Enter email address"
              type="email"
            />
            <p v-if="errors.email" class="invalid">
              {{ errors.email }}
            </p>
          </div>
        </div>
      </template>
    </BaseFormSection>

    <BaseFormSection title="Delivery Information">
      <template #icon>
        <Truck />
      </template>

      <template #content>
        <div class="form-grid">
          <div class="form-group form-group-full">
            <BaseTextInput
              name="deliveryAddress"
              id="deliveryAddress"
              label="Delivery Address"
              v-model="fields.deliveryAddress.value"
              :class="{ 'is-invalid': errors.deliveryAddress }"
              placeholder="Enter delivery address"
            />
            <p v-if="errors.deliveryAddress" class="invalid">
              {{ errors.deliveryAddress }}
            </p>
          </div>

          <div class="form-group">
            <BaseTextInput
              name="city"
              id="city"
              label="City / Town"
              v-model="fields.city.value"
              :class="{ 'is-invalid': errors.city }"
              placeholder="Enter city or town"
            />
            <p v-if="errors.city" class="invalid">
              {{ errors.city }}
            </p>
          </div>
        </div>
      </template>
    </BaseFormSection>

    <BaseFormSection title="Credit & Payment">
      <template #icon>
        <CreditCard />
      </template>

      <template #content>
        <div class="form-grid">
          <div class="form-group">
            <BaseTextInput
              name="creditLimit"
              id="creditLimit"
              label="Credit Limit"
              v-model.number="fields.creditLimit.value"
              :class="{ 'is-invalid': errors.creditLimit }"
              placeholder="Enter credit limit"
              type="number"
              min="0"
            />
            <p v-if="errors.creditLimit" class="invalid">
              {{ errors.creditLimit }}
            </p>
          </div>

          <div class="form-group">
            <BaseSelect
              name="creditStatus"
              id="creditStatus"
              label="Credit Status"
              :class="{ 'is-invalid': errors.creditStatus }"
              v-model="fields.creditStatus.value"
              :options="[
                { label: 'Active', value: 'Active' },
                { label: 'Suspended', value: 'Suspended' },
              ]"
              all-options-selected-text="-- Select credit status --"
            />
            <p v-if="errors.creditStatus" class="invalid">
              {{ errors.creditStatus }}
            </p>
          </div>
        </div>
      </template>
    </BaseFormSection>

    <BaseFormSection title="Terms & Conditions" v-if="props.showTerms">
      <template #icon>
        <Info />
      </template>

      <template #content>
        <div class="form-group">
          <p>By accepting, you agree to the terms and conditions.</p>
          <input
            :class="{ 'is-invalid': errors.acceptedTerms }"
            type="checkbox"
            v-model="fields.acceptedTerms.value"
            name="acceptedTerms"
            id="acceptedTerms"
          />
          <BaseFormLabel label="Accept Terms and Conditions" for="acceptedTerms" required inline />
          <p v-if="errors.acceptedTerms" class="invalid">{{ errors.acceptedTerms }}</p>
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
        :label="props.loading ? 'Saving Customer...' : props.submitLabel"
        :loading="props.loading"
        :disabled="props.loading"
        variant="primary"
        type="submit"
      >
        <template #icon v-if="props.loading">
          <LoaderCircle class="is-loading" size="16" />
        </template>
      </BaseButton>
    </div>
  </form>
</template>
