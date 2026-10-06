<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { useProduct } from '../composables/useProduct'
import { useToast } from '../composables/useToast'
import { usePermissions } from '../composables/usePermissions'
import { PERMISSION } from '../constants/permissions'
import { PRODUCT_STATUS_VARIANTS } from '../constants/productStatuses'
import { formatCurrency } from '../utils/formatters'

import { SquarePen, Trash2, CircleAlert, Package } from '@lucide/vue'

import PageToolbar from '../layouts/PageToolbar.vue'
import BaseConfirmationModal from '../components/base/BaseConfirmationModal.vue'
import BaseSkeleton from '../components/base/BaseSkeleton.vue'
import BaseButton from '../components/base/BaseButton.vue'
import BaseBadge from '../components/base/BaseBadge.vue'
import Alert from '../components/Alert.vue'

const showDeleteModal = ref(false)

const route = useRoute()
const router = useRouter()

const { info, error: showError } = useToast()
const { hasPermission } = usePermissions()

const { product, loading, error, deleting, deleteProduct } = useProduct(route.params.id)

const numberFormatter = new Intl.NumberFormat('en-KE')

function formatNumber(value) {
  return numberFormatter.format(value ?? 0)
}

function formatProductDate(value) {
  if (!value) return 'Not recorded'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Not recorded'

  return new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function statusVariant(status) {
  return PRODUCT_STATUS_VARIANTS[status] || 'default'
}

function formatCategory(category) {
  if (!category) return 'Uncategorised'

  return category.replace(/[-_]/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
}

function editProduct() {
  if (!product.value) return

  router.push({
    name: 'product-edit',
    params: {
      id: product.value.id,
    },
  })
}

function confirmDeleteProduct() {
  if (!product.value) return

  showDeleteModal.value = true
}

async function deleteCurrentProduct() {
  if (!product.value) return

  const productName = product.value.name

  try {
    await deleteProduct()

    showDeleteModal.value = false

    info(`Product ${productName} deleted successfully.`, {
      title: 'Product Deleted',
    })

    await router.push({
      name: 'products',
    })
  } catch (err) {
    showError(err.message || 'Failed to delete product.')
  }
}
</script>

<template>
  <PageToolbar>
    <template #context>
      <h1>Product details</h1>
    </template>
    <template #actions>
      <BaseButton
        v-if="product && hasPermission(PERMISSION.PRODUCT_EDIT)"
        label="Edit Product"
        size="sm"
        variant="secondary"
        @click="editProduct"
      >
        <template #icon>
          <SquarePen size="16" />
        </template>
      </BaseButton>

      <BaseButton
        v-if="product && hasPermission(PERMISSION.PRODUCT_DELETE)"
        label="Delete Product"
        variant="danger"
        size="sm"
        :loading="deleting"
        @click="confirmDeleteProduct"
      >
        <template #icon>
          <Trash2 size="16" />
        </template>
      </BaseButton>
    </template>
  </PageToolbar>

  <main class="product-detail-page">
    <BaseSkeleton v-if="loading" width="100%" height="20rem" />

    <Alert v-else-if="error" type="danger" :message="error">
      <template #icon>
        <CircleAlert size="18" />
      </template>

      <template #title> Error Loading Product </template>
    </Alert>

    <template v-else-if="product">
      <section class="product-hero" aria-labelledby="product-name">
        <div class="product-image-placeholder" role="img" aria-label="Product image placeholder">
          <div class="placeholder-artwork">
            <Package :size="72" :stroke-width="1.25" aria-hidden="true" />
          </div>
          <div class="placeholder-caption">
            <strong>Product image</strong>
            <span>Image preview will appear here</span>
          </div>
        </div>

        <div class="product-summary">
          <div class="product-badges">
            <BaseBadge :variant="statusVariant(product.status)">
              {{ product.status || 'Status unavailable' }}
            </BaseBadge>
            <span class="product-category">{{ formatCategory(product.category) }}</span>
          </div>

          <h2 id="product-name">{{ product.name || 'Unnamed product' }}</h2>

          <p class="product-sku">
            <span>SKU</span>
            <code>{{ product.sku || 'Not assigned' }}</code>
          </p>

          <p class="product-description">
            {{ product.description || 'No description has been added for this product.' }}
          </p>

          <div class="product-highlights">
            <div class="product-highlight product-highlight--price">
              <span class="highlight-label">Selling price</span>
              <strong>{{ formatCurrency(product.sellingPrice ?? 0) }}</strong>
              <span class="highlight-caption">Per {{ product.unit || 'unit' }}</span>
            </div>

            <div class="product-highlight">
              <span class="highlight-label">Current stock</span>
              <strong>{{ formatNumber(product.stockQuantity) }}</strong>
              <span class="highlight-caption">
                {{ product.unit ? `${product.unit} in stock` : 'Units in stock' }}
              </span>
            </div>
          </div>
        </div>
      </section>

      <section class="product-information" aria-labelledby="product-information-title">
        <div class="product-information-header">
          <div>
            <h2 id="product-information-title">Product information</h2>
            <p>Identifiers, pricing, and record details.</p>
          </div>
        </div>

        <dl class="product-information-grid">
          <div class="product-information-item">
            <dt>Category</dt>
            <dd>{{ formatCategory(product.category) }}</dd>
          </div>

          <div class="product-information-item">
            <dt>Unit of measure</dt>
            <dd>{{ product.unit || 'Not specified' }}</dd>
          </div>

          <div class="product-information-item">
            <dt>Cost price</dt>
            <dd>
              {{ product.costPrice == null ? 'Not recorded' : formatCurrency(product.costPrice) }}
            </dd>
          </div>

          <div class="product-information-item">
            <dt>Created</dt>
            <dd>{{ formatProductDate(product.createdAt) }}</dd>
          </div>

          <div class="product-information-item">
            <dt>Last updated</dt>
            <dd>{{ formatProductDate(product.updatedAt) }}</dd>
          </div>
        </dl>
      </section>
    </template>
  </main>

  <BaseConfirmationModal
    v-if="product"
    v-model="showDeleteModal"
    title="Delete Product"
    :message="`Are you sure you want to delete ${product.name}? This action cannot be undone.`"
    confirm-text="Delete Product"
    cancel-text="Cancel"
    :loading="deleting"
    @confirm="deleteCurrentProduct"
  >
    <template #icon>
      <CircleAlert size="24" />
    </template>
  </BaseConfirmationModal>
</template>

<style scoped>
.product-detail-page {
  display: flex;
  flex-direction: column;
  gap: 24px;
  min-width: 0;
}

.product-hero,
.product-information {
  background: var(--bg-colour-white);
  border: 1px solid var(--border-colour-subtle);
  border-radius: var(--border-radius-lg);
}

.product-hero {
  display: grid;
  grid-template-columns: minmax(260px, 0.85fr) minmax(0, 1.5fr);
  gap: 32px;
  padding: 24px;
}

.product-image-placeholder {
  align-items: center;
  background:
    radial-gradient(ellipse at 50% 42%, rgba(255, 255, 255, 0.92), transparent 52%),
    linear-gradient(145deg, #f0f4fa, #e6edf7);
  border: 1px solid var(--border-colour-subtle);
  border-radius: var(--border-radius-md);
  display: flex;
  flex-direction: column;
  justify-content: center;
  min-height: 340px;
  overflow: hidden;
  padding: 24px;
  text-align: center;
}

.placeholder-artwork {
  align-items: center;
  background: rgba(255, 255, 255, 0.72);
  border: 1px solid rgba(47, 94, 175, 0.14);
  border-radius: 28px;
  color: var(--text-colour-accent);
  display: flex;
  height: 144px;
  justify-content: center;
  width: 144px;
}

.placeholder-caption {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-top: 20px;
}

.placeholder-caption strong {
  font-size: 14px;
  font-weight: 600;
}

.placeholder-caption span,
.product-information-header p {
  color: var(--text-colour-secondary);
  font-size: 13px;
  margin: 0;
}

.product-summary {
  align-self: center;
  min-width: 0;
}

.product-badges {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.product-category {
  background: var(--bg-colour-default);
  border-radius: var(--border-radius-full);
  color: var(--text-colour-secondary);
  font-size: 12px;
  padding: 4px 10px;
}

.product-summary h2 {
  font-size: clamp(24px, 3vw, 32px);
  font-weight: 600;
  line-height: 1.2;
  margin: 16px 0 10px;
  overflow-wrap: anywhere;
}

.product-sku {
  align-items: center;
  color: var(--text-colour-secondary);
  display: flex;
  flex-wrap: wrap;
  font-size: 13px;
  gap: 8px;
  margin: 0;
}

.product-sku code {
  background: var(--bg-colour-default);
  border-radius: var(--border-radius-xs);
  color: var(--text-colour-default);
  font-family: var(--font-family-default);
  padding: 3px 6px;
}

.product-description {
  color: var(--text-colour-secondary);
  font-size: 14px;
  line-height: 1.6;
  margin: 18px 0 24px;
  white-space: pre-line;
}

.product-highlights {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.product-highlight {
  background: var(--bg-colour-default);
  border: 1px solid var(--border-colour-subtle);
  border-radius: var(--border-radius-md);
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 16px;
}

.product-highlight--price {
  background: var(--bg-info-muted);
  border-color: var(--border-info);
}

.highlight-label {
  color: var(--text-colour-secondary);
  font-size: 13px;
}

.product-highlight strong {
  font-size: clamp(20px, 2.5vw, 26px);
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  margin: 8px 0 4px;
  overflow-wrap: anywhere;
}

.product-highlight--price strong {
  color: var(--text-colour-accent);
}

.highlight-caption {
  color: var(--text-colour-secondary);
  font-size: 12px;
}

.product-information {
  overflow: hidden;
}

.product-information-header {
  border-bottom: 1px solid var(--border-colour-subtle);
  padding: 20px 24px;
}

.product-information-header h2 {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 4px;
}

.product-information-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin: 0;
  padding: 8px 24px;
}

.product-information-item {
  border-bottom: 1px solid var(--border-colour-subtle);
  min-width: 0;
  padding: 16px 12px;
}

.product-information-item dt {
  color: var(--text-colour-secondary);
  font-size: 12px;
  margin-bottom: 6px;
}

.product-information-item dd {
  font-size: 14px;
  font-weight: 500;
  margin: 0;
  overflow-wrap: anywhere;
}

@media (max-width: 900px) {
  .product-hero {
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
    padding: 20px;
  }

  .product-image-placeholder {
    min-height: 260px;
  }

  .product-information-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 600px) {
  .product-hero {
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
    padding: 16px;
  }

  .product-image-placeholder {
    min-height: 220px;
  }

  .placeholder-artwork {
    height: 112px;
    width: 112px;
  }

  .product-highlights {
    gap: 8px;
  }

  .product-highlight {
    padding: 12px;
  }

  .product-information-header {
    padding: 18px 16px;
  }

  .product-information-grid {
    padding: 4px 12px;
  }

  .product-information-item {
    padding: 14px 8px;
  }
}

@media (max-width: 380px) {
  .product-highlights,
  .product-information-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .product-information-item:last-child {
    border-bottom: 0;
  }
}
</style>
