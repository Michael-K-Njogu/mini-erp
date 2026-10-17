<script setup>
import { ref, computed, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { canDeleteCustomer } from '../business/customerPermissions'
import { useCustomer } from '../composables/useCustomer'
import { useToast } from '../composables/useToast'
import { usePermissions } from '../composables/usePermissions'
import { PERMISSION } from '../constants/permissions'
import { ORDER_STATUS } from '../constants/orderStatuses'
import { getCustomerTypeLabel } from '../constants/customerTypes'
import { getCustomerAccountSummary } from '../services/customerService'
import { getOrders } from '../services/orderService'
import { formatCurrency, formatDate } from '../utils/formatters'

import { CircleAlert, SquarePen, Trash2 } from '@lucide/vue'

import PageToolbar from '../layouts/PageToolbar.vue'
import CustomerCard from '../components/customers/CustomerCard.vue'
import BaseButton from '../components/base/BaseButton.vue'
import BaseBadge from '../components/base/BaseBadge.vue'
import BaseConfirmationModal from '../components/base/BaseConfirmationModal.vue'
import BaseSkeleton from '../components/base/BaseSkeleton.vue'
import Alert from '../components/Alert.vue'

const open = ref(false)
const activeTab = ref('overview')
const tabButtons = ref([])
const recentOrders = ref([])
const recentOrdersTotal = ref(0)
const ordersLoading = ref(false)
const ordersError = ref('')
const creditSummary = ref(null)
const creditLoading = ref(false)
const creditError = ref('')

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'orders', label: 'Orders' },
  { id: 'credit', label: 'Credit & account' },
]

const route = useRoute()
const router = useRouter()
const { info, error: showError } = useToast()
const { hasPermission } = usePermissions()

const canDelete = computed(() => {
  return customer.value ? canDeleteCustomer(customer.value) : false
})

function confirmDeleteCustomer() {
  if (!hasPermission(PERMISSION.CUSTOMER_DELETE)) {
    showError('You do not have permission to delete customers.')
    return
  }

  if (!canDelete.value) {
    showError('This customer cannot be deleted because they have existing orders.')
    return
  }

  open.value = true
}

async function handleDelete() {
  if (!hasPermission(PERMISSION.CUSTOMER_DELETE)) {
    showError('You do not have permission to delete customers.')
    return
  }

  try {
    await deleteCustomer()

    open.value = false

    info('The customer has been successfully deleted.', {
      title: 'Customer Deleted',
    })

    router.push({
      name: 'customers',
    })
  } catch (err) {
    showError(err.message)
  }
}

const deleteMessage = computed(() => {
  if (customer.value) {
    return `Are you sure you want to delete ${customer.value.name} from the database? This action cannot be undone.`
  }
  return ''
})

const { customer, loading, error, deleting, deleteCustomer } = useCustomer(route.params.id)

const averageOrderValue = computed(() => {
  return creditSummary.value?.averageCompletedOrderValue ?? 0
})

const creditUtilization = computed(() => {
  if (!creditSummary.value) return 0

  const creditLimit = creditSummary.value.creditLimit
  const currentBalance = creditSummary.value.currentBalance

  if (creditLimit <= 0) return currentBalance > 0 ? 100 : 0

  return Math.min(100, Math.max(0, (currentBalance / creditLimit) * 100))
})

function statusVariant(status) {
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

async function loadRecentOrders(customerId) {
  ordersLoading.value = true
  ordersError.value = ''

  try {
    const result = await getOrders({
      customerId,
      sort: { field: 'createdAt', direction: 'desc' },
      page: 1,
      pageSize: 5,
    })

    recentOrders.value = result.data
    recentOrdersTotal.value = result.total
  } catch (err) {
    console.error('Failed to load customer orders:', err)
    ordersError.value = err.message || 'Unable to load recent orders.'
  } finally {
    ordersLoading.value = false
  }
}

async function loadCreditSummary(customerId) {
  creditLoading.value = true
  creditError.value = ''

  try {
    creditSummary.value = await getCustomerAccountSummary(customerId)
  } catch (err) {
    console.error('Failed to load customer credit summary:', err)
    creditError.value = err.message || 'Unable to load credit information.'
  } finally {
    creditLoading.value = false
  }
}

watch(
  () => customer.value?.id,
  (customerId) => {
    if (!customerId) return

    loadRecentOrders(customerId)
    loadCreditSummary(customerId)
  },
  { immediate: true },
)

function handleTabKeydown(event, index) {
  let nextIndex = index

  if (event.key === 'ArrowRight') nextIndex = (index + 1) % tabs.length
  else if (event.key === 'ArrowLeft') nextIndex = (index - 1 + tabs.length) % tabs.length
  else if (event.key === 'Home') nextIndex = 0
  else if (event.key === 'End') nextIndex = tabs.length - 1
  else return

  event.preventDefault()
  activeTab.value = tabs[nextIndex].id
  nextTick(() => tabButtons.value[nextIndex]?.focus())
}

function viewOrder(orderId) {
  router.push({ name: 'order-details', params: { id: orderId } })
}

function setTabButton(element, index) {
  if (element) tabButtons.value[index] = element
}
</script>

<template>
  <PageToolbar>
    <template #context>
      <h1>
        {{ customer ? customer.name : 'Customer Details' }}
      </h1>
    </template>
    <template #actions>
      <BaseButton
        v-if="customer && hasPermission(PERMISSION.CUSTOMER_EDIT)"
        label="Edit Customer"
        size="sm"
        @click="router.push({ name: 'customer-edit', params: { id: customer.id } })"
        variant="secondary"
      >
        <template #icon>
          <SquarePen size="16" />
        </template>
      </BaseButton>

      <BaseButton
        v-if="customer && canDelete && hasPermission(PERMISSION.CUSTOMER_DELETE)"
        label="Delete Customer"
        variant="danger"
        size="sm"
        :loading="deleting"
        :disabled="deleting"
        @click="confirmDeleteCustomer"
      >
        <template #icon>
          <Trash2 size="16" />
        </template>
      </BaseButton>
    </template>
  </PageToolbar>

  <main class="customer-detail-page">
    <div
      v-if="loading"
      class="customer-workspace customer-workspace-skeleton"
      role="status"
      aria-label="Loading customer details"
    >
      <section class="customer-profile-skeleton" aria-hidden="true">
        <BaseSkeleton width="72px" height="72px" />
        <BaseSkeleton width="70%" height="1.25rem" />
        <BaseSkeleton width="46%" height="1rem" />
        <div class="customer-profile-skeleton-actions">
          <BaseSkeleton width="100%" height="2.25rem" />
          <BaseSkeleton width="100%" height="2.25rem" />
        </div>
      </section>

      <div class="customer-main customer-main-skeleton" aria-hidden="true">
        <div class="customer-tabs-skeleton">
          <BaseSkeleton width="88px" height="2.75rem" />
          <BaseSkeleton width="76px" height="2.75rem" />
          <BaseSkeleton width="132px" height="2.75rem" />
        </div>

        <div class="customer-tab-panel customer-tab-panel-skeleton">
          <div class="customer-stat-grid">
            <div v-for="index in 3" :key="`stat-${index}`" class="customer-skeleton-card">
              <BaseSkeleton width="62%" height="0.875rem" />
              <BaseSkeleton width="48%" height="1.5rem" />
              <BaseSkeleton width="78%" height="0.75rem" />
            </div>
          </div>

          <div class="customer-overview-grid">
            <div v-for="index in 2" :key="`info-${index}`" class="customer-information-card">
              <div class="customer-information-header">
                <BaseSkeleton width="58%" height="1.125rem" />
                <BaseSkeleton width="82%" height="0.875rem" />
              </div>
              <div class="customer-information-grid-skeleton">
                <BaseSkeleton v-for="row in 4" :key="`row-${index}-${row}`" height="2.25rem" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Alert v-else-if="error" type="danger" :message="error">
      <template #icon>
        <CircleAlert size="18" />
      </template>

      <template #title> Error Loading Customer </template>
    </Alert>

    <div v-else-if="customer" class="customer-workspace">
      <CustomerCard :customer="customer" />

      <div class="customer-main">
        <div class="customer-tabs" role="tablist" aria-label="Customer information">
          <button
            v-for="(tab, index) in tabs"
            :key="tab.id"
            :ref="(element) => setTabButton(element, index)"
            :id="`customer-tab-${tab.id}`"
            class="customer-tab"
            :class="{ 'customer-tab--active': activeTab === tab.id }"
            type="button"
            role="tab"
            :aria-selected="activeTab === tab.id"
            :aria-controls="`customer-panel-${tab.id}`"
            :tabindex="activeTab === tab.id ? 0 : -1"
            @click="activeTab = tab.id"
            @keydown="handleTabKeydown($event, index)"
          >
            {{ tab.label }}
            <span v-if="tab.id === 'orders'" class="customer-tab-count">
              {{ recentOrdersTotal || customer.orderCount || 0 }}
            </span>
          </button>
        </div>

        <section
          v-show="activeTab === 'overview'"
          id="customer-panel-overview"
          class="customer-tab-panel"
          role="tabpanel"
          aria-labelledby="customer-tab-overview"
          tabindex="0"
        >
          <div class="customer-stat-grid">
            <article class="customer-stat-card">
              <span>Total orders</span>
              <strong>{{ customer.orderCount ?? recentOrdersTotal ?? 0 }}</strong>
              <small>Orders placed by this customer</small>
            </article>

            <article class="customer-stat-card">
              <span>Average completed order</span>
              <strong v-if="creditSummary?.completedOrderCount">
                {{ formatCurrency(averageOrderValue) }}
              </strong>
              <strong v-else-if="creditSummary">—</strong>
              <strong v-else-if="creditLoading" class="customer-stat-loading">Loading…</strong>
              <strong v-else>—</strong>
              <small>Based on completed orders</small>
            </article>

            <article class="customer-stat-card">
              <span>Credit limit</span>
              <strong v-if="creditSummary">{{ formatCurrency(creditSummary.creditLimit) }}</strong>
              <strong v-else-if="creditLoading" class="customer-stat-loading">Loading…</strong>
              <strong v-else>—</strong>
              <small>Customer account limit</small>
            </article>
          </div>

          <div class="customer-overview-grid">
            <section class="customer-information-card" aria-labelledby="customer-contact-title">
              <header class="customer-information-header">
                <h2 id="customer-contact-title">Contact &amp; delivery</h2>
                <p>How to reach this customer and where to deliver.</p>
              </header>

              <dl class="customer-information-grid">
                <div class="customer-information-item">
                  <dt>Email</dt>
                  <dd>
                    <a v-if="customer.email" :href="`mailto:${customer.email}`">
                      {{ customer.email }}
                    </a>
                    <span v-else>—</span>
                  </dd>
                </div>

                <div class="customer-information-item">
                  <dt>Primary phone</dt>
                  <dd>
                    <a v-if="customer.phonePrimary" :href="`tel:${customer.phonePrimary}`">
                      {{ customer.phonePrimary }}
                    </a>
                    <span v-else>—</span>
                  </dd>
                </div>

                <div class="customer-information-item">
                  <dt>Alternative phone</dt>
                  <dd>{{ customer.phoneSecondary || '—' }}</dd>
                </div>

                <div class="customer-information-item">
                  <dt>Contact person</dt>
                  <dd>{{ customer.contactPerson || '—' }}</dd>
                </div>

                <div class="customer-information-item customer-information-item--wide">
                  <dt>Delivery address</dt>
                  <dd>{{ customer.deliveryAddress || '—' }}</dd>
                </div>

                <div class="customer-information-item">
                  <dt>City</dt>
                  <dd>{{ customer.city || '—' }}</dd>
                </div>
              </dl>
            </section>

            <section class="customer-information-card" aria-labelledby="customer-profile-title">
              <header class="customer-information-header">
                <h2 id="customer-profile-title">Customer profile</h2>
                <p>Business classification and customer record.</p>
              </header>

              <dl class="customer-information-grid">
                <div class="customer-information-item">
                  <dt>Customer type</dt>
                  <dd>{{ getCustomerTypeLabel(customer.customerType) || '—' }}</dd>
                </div>

                <div class="customer-information-item">
                  <dt>Sector</dt>
                  <dd>{{ customer.sector || '—' }}</dd>
                </div>

                <div class="customer-information-item">
                  <dt>Region</dt>
                  <dd>{{ customer.region || '—' }}</dd>
                </div>

                <div class="customer-information-item">
                  <dt>VAT number</dt>
                  <dd>{{ customer.vatNumber || '—' }}</dd>
                </div>

                <div class="customer-information-item">
                  <dt>Customer since</dt>
                  <dd>{{ customer.createdAt ? formatDate(customer.createdAt) : '—' }}</dd>
                </div>
              </dl>
            </section>
          </div>
        </section>

        <section
          v-show="activeTab === 'orders'"
          id="customer-panel-orders"
          class="customer-tab-panel"
          role="tabpanel"
          aria-labelledby="customer-tab-orders"
          tabindex="0"
        >
          <div class="customer-section-heading">
            <div>
              <h2>Order activity</h2>
              <p>Recent orders and typical completed order value.</p>
            </div>
          </div>

          <div class="customer-stat-grid customer-stat-grid--two">
            <article class="customer-stat-card">
              <span>All orders</span>
              <strong>{{ recentOrdersTotal || customer.orderCount || 0 }}</strong>
              <small>Including draft and canceled orders</small>
            </article>

            <article class="customer-stat-card">
              <span>Average completed order</span>
              <strong v-if="creditSummary?.completedOrderCount">
                {{ formatCurrency(averageOrderValue) }}
              </strong>
              <strong v-else-if="creditSummary">—</strong>
              <strong v-else-if="creditLoading" class="customer-stat-loading">Loading…</strong>
              <strong v-else>—</strong>
              <small>
                {{ creditSummary?.completedOrderCount ?? 0 }} completed
                {{ creditSummary?.completedOrderCount === 1 ? 'order' : 'orders' }}
              </small>
            </article>
          </div>

          <p v-if="ordersError" class="customer-tab-error" role="alert">
            {{ ordersError }}
            <button type="button" @click="loadRecentOrders(customer.id)">Try again</button>
          </p>

          <div v-else-if="ordersLoading" class="customer-tab-state" role="status">
            Loading recent orders…
          </div>

          <div v-else-if="!recentOrders.length" class="customer-tab-state">
            This customer has not placed any orders yet.
          </div>

          <div v-else class="customer-orders-table-wrap">
            <table class="customer-orders-table">
              <thead>
                <tr>
                  <th scope="col">Order</th>
                  <th scope="col">Date</th>
                  <th scope="col">Amount</th>
                  <th scope="col">Status</th>
                  <th scope="col"><span class="visually-hidden">View order</span></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="order in recentOrders" :key="order.id">
                  <td class="customer-order-number">{{ order.orderNumber || 'Order' }}</td>
                  <td>{{ order.createdAt ? formatDate(order.createdAt) : '—' }}</td>
                  <td>{{ formatCurrency(order.grandTotal ?? 0) }}</td>
                  <td>
                    <BaseBadge :variant="statusVariant(order.status)">
                      {{ order.status || 'Unknown' }}
                    </BaseBadge>
                  </td>
                  <td>
                    <button class="customer-order-link" type="button" @click="viewOrder(order.id)">
                      View
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-if="recentOrdersTotal > recentOrders.length" class="customer-orders-more">
              Showing the 5 most recent of {{ recentOrdersTotal }} orders.
            </p>
          </div>
        </section>

        <section
          v-show="activeTab === 'credit'"
          id="customer-panel-credit"
          class="customer-tab-panel"
          role="tabpanel"
          aria-labelledby="customer-tab-credit"
          tabindex="0"
        >
          <div class="customer-section-heading">
            <div>
              <h2>Credit &amp; account</h2>
              <p>Credit limit usage is estimated from completed orders.</p>
            </div>
            <BaseBadge v-if="customer.creditStatus" variant="info">
              {{ customer.creditStatus }}
            </BaseBadge>
          </div>

          <p v-if="creditError" class="customer-tab-error" role="alert">
            {{ creditError }}
            <button type="button" @click="loadCreditSummary(customer.id)">Try again</button>
          </p>

          <div v-else-if="creditLoading" class="customer-tab-state" role="status">
            Loading credit information…
          </div>

          <template v-else-if="creditSummary">
            <div class="customer-credit-grid">
              <article class="customer-credit-card">
                <span>Credit limit</span>
                <strong>{{ formatCurrency(creditSummary.creditLimit) }}</strong>
                <small>Maximum account limit</small>
              </article>

              <article class="customer-credit-card">
                <span>Credit used</span>
                <strong>{{ formatCurrency(creditSummary.currentBalance) }}</strong>
                <small>Value of completed orders</small>
              </article>

              <article
                class="customer-credit-card"
                :class="{ 'customer-credit-card--over-limit': creditSummary.availableCredit < 0 }"
              >
                <span>{{
                  creditSummary.availableCredit < 0 ? 'Over limit' : 'Available credit'
                }}</span>
                <strong>{{ formatCurrency(Math.abs(creditSummary.availableCredit)) }}</strong>
                <small>
                  {{
                    creditSummary.availableCredit < 0
                      ? 'Amount above the credit limit'
                      : 'Remaining before reaching the limit'
                  }}
                </small>
              </article>
            </div>

            <section
              class="credit-usage-card"
              :class="{ 'credit-usage-card--over-limit': creditSummary.availableCredit < 0 }"
              aria-labelledby="credit-usage-title"
            >
              <div class="credit-usage-heading">
                <div>
                  <h3 id="credit-usage-title">Credit utilization</h3>
                  <p>{{ creditUtilization.toFixed(0) }}% of the limit used</p>
                </div>
                <strong>{{ creditSummary.completedOrderCount }} completed orders</strong>
              </div>
              <div
                class="credit-usage-track"
                role="progressbar"
                :aria-valuenow="Math.round(creditUtilization)"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-label="`${Math.round(creditUtilization)} percent of credit limit used`"
              >
                <span :style="{ width: `${creditUtilization}%` }"></span>
              </div>
              <p class="credit-usage-footnote">
                This is an estimate based on completed order totals, not an accounts-receivable
                balance.
              </p>
            </section>

            <div class="customer-credit-note">
              Average completed order value:
              <strong>
                {{ creditSummary.completedOrderCount ? formatCurrency(averageOrderValue) : '—' }}
              </strong>
            </div>
          </template>
        </section>
      </div>
    </div>

    <p v-else class="customer-not-found" role="status">This customer could not be found.</p>
  </main>

  <BaseConfirmationModal
    v-if="customer"
    v-model="open"
    title="Confirm Deletion"
    :message="deleteMessage"
    confirmText="Delete"
    cancelText="Cancel"
    :loading="deleting"
    @confirm="handleDelete"
  />
</template>

<style scoped>
.customer-detail-page {
  min-width: 0;
}

.customer-workspace {
  align-items: start;
  display: grid;
  gap: 20px;
  grid-template-columns: minmax(220px, 260px) minmax(0, 1fr);
  min-width: 0;
}

.customer-profile-skeleton {
  align-items: center;
  background: var(--bg-colour-white);
  border: 1px solid var(--border-colour-subtle);
  border-radius: var(--border-radius-lg);
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
  padding: 24px 20px;
}

.customer-profile-skeleton > :first-child {
  border-radius: 50%;
  margin-bottom: 4px;
}

.customer-profile-skeleton-actions {
  display: grid;
  gap: 8px;
  margin-top: 4px;
  width: 100%;
}

.customer-main {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
  width: 100%;
}

.customer-main-skeleton {
  gap: 20px;
}

.customer-tabs-skeleton {
  align-items: center;
  border-bottom: 1px solid var(--border-colour-default);
  display: flex;
  gap: 6px;
  overflow: hidden;
}

.customer-tabs-skeleton > :first-child {
  border-bottom: 2px solid var(--border-info);
  border-radius: 0;
}

.customer-tab-panel-skeleton {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.customer-skeleton-card {
  align-items: flex-start;
  background: var(--bg-colour-white);
  border: 1px solid var(--border-colour-subtle);
  border-radius: var(--border-radius-md);
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  padding: 16px;
}

.customer-information-grid-skeleton {
  display: grid;
  gap: 8px 16px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  padding: 12px;
}

.customer-information-grid-skeleton :deep(.skeleton) {
  align-self: center;
}

.customer-tabs {
  border-bottom: 1px solid var(--border-colour-default);
  display: flex;
  gap: 6px;
  overflow-x: auto;
}

.customer-tab {
  align-items: center;
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
  color: var(--text-colour-secondary);
  cursor: pointer;
  display: inline-flex;
  flex: 0 0 auto;
  font: inherit;
  font-size: 14px;
  gap: 8px;
  margin-bottom: -1px;
  padding: 12px 16px;
}

.customer-tab:hover {
  color: var(--text-colour-default);
}

.customer-tab--active {
  border-bottom-color: var(--text-colour-accent);
  color: var(--text-colour-accent);
  font-weight: 600;
}

.customer-tab:focus-visible,
.customer-order-link:focus-visible {
  border-radius: var(--border-radius-sm);
  outline: 2px solid var(--border-info);
  outline-offset: 2px;
}

.customer-tab-count {
  align-items: center;
  background: var(--bg-colour-default);
  border-radius: var(--border-radius-full);
  color: var(--text-colour-secondary);
  display: inline-flex;
  font-size: 12px;
  height: 22px;
  justify-content: center;
  min-width: 22px;
  padding: 0 6px;
}

.customer-tab-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

.customer-stat-grid,
.customer-credit-grid {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.customer-stat-grid--two {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.customer-stat-card,
.customer-credit-card {
  background: var(--bg-colour-white);
  border: 1px solid var(--border-colour-subtle);
  border-radius: var(--border-radius-lg);
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding: 18px;
}

.customer-stat-card > span,
.customer-credit-card > span {
  color: var(--text-colour-secondary);
  font-size: 13px;
}

.customer-stat-card strong,
.customer-credit-card strong {
  font-size: clamp(20px, 2.4vw, 26px);
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  margin: 10px 0 4px;
  overflow-wrap: anywhere;
}

.customer-stat-card small,
.customer-credit-card small {
  color: var(--text-colour-secondary);
  font-size: 12px;
  line-height: 1.45;
}

.customer-stat-card .customer-stat-loading {
  color: var(--text-colour-tertiary);
  font-size: 18px;
}

.customer-overview-grid {
  display: grid;
  gap: 20px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.customer-information-card,
.credit-usage-card {
  background: var(--bg-colour-white);
  border: 1px solid var(--border-colour-subtle);
  border-radius: var(--border-radius-lg);
  min-width: 0;
  overflow: hidden;
}

.customer-information-header {
  border-bottom: 1px solid var(--border-colour-subtle);
  padding: 18px 20px;
}

.customer-information-header h2,
.customer-section-heading h2 {
  font-size: 17px;
  font-weight: 600;
  margin: 0 0 4px;
}

.customer-information-header p,
.customer-section-heading p,
.credit-usage-heading p {
  color: var(--text-colour-secondary);
  font-size: 13px;
  margin: 0;
}

.customer-information-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0;
  padding: 4px 12px;
}

.customer-information-item {
  border-bottom: 1px solid var(--border-colour-subtle);
  min-width: 0;
  padding: 14px 8px;
}

.customer-information-item--wide {
  grid-column: 1 / -1;
}

.customer-information-item dt {
  color: var(--text-colour-secondary);
  font-size: 12px;
  margin-bottom: 6px;
}

.customer-information-item dd {
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
  margin: 0;
  overflow-wrap: anywhere;
  white-space: pre-line;
}

.customer-information-item a {
  color: var(--text-colour-accent);
  text-decoration: none;
}

.customer-information-item a:hover {
  text-decoration: underline;
}

.customer-section-heading {
  align-items: center;
  display: flex;
  gap: 16px;
  justify-content: space-between;
}

.customer-orders-table-wrap {
  background: var(--bg-colour-white);
  border: 1px solid var(--border-colour-subtle);
  border-radius: var(--border-radius-lg);
  overflow: hidden;
}

.customer-orders-table {
  border-collapse: collapse;
  min-width: 620px;
  width: 100%;
}

.customer-orders-table th,
.customer-orders-table td {
  border-bottom: 1px solid var(--border-colour-subtle);
  padding: 12px 16px;
  text-align: left;
  vertical-align: middle;
}

.customer-orders-table th {
  background: var(--bg-colour-default);
  color: var(--text-colour-secondary);
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
}

.customer-orders-table td {
  font-size: 14px;
}

.customer-orders-table tbody tr:last-child td {
  border-bottom: 0;
}

.customer-order-number {
  font-weight: 600;
}

.customer-order-link {
  background: transparent;
  border: 0;
  color: var(--text-colour-accent);
  cursor: pointer;
  font: inherit;
  font-weight: 500;
  padding: 4px;
}

.customer-orders-more {
  border-top: 1px solid var(--border-colour-subtle);
  color: var(--text-colour-secondary);
  font-size: 13px;
  margin: 0;
  padding: 12px 16px;
}

.customer-tab-state,
.customer-tab-error {
  background: var(--bg-colour-white);
  border: 1px solid var(--border-colour-subtle);
  border-radius: var(--border-radius-lg);
  color: var(--text-colour-secondary);
  margin: 0;
  padding: 24px;
  text-align: center;
}

.customer-tab-error {
  background: var(--bg-danger-muted);
  border-color: var(--border-danger);
  color: var(--text-colour-danger);
}

.customer-tab-error button {
  background: none;
  border: 0;
  color: inherit;
  cursor: pointer;
  font: inherit;
  font-weight: 600;
  margin-left: 8px;
  text-decoration: underline;
}

.customer-orders-table-wrap {
  overflow-x: auto;
}

.customer-credit-card:first-child {
  background: var(--bg-info-muted);
  border-color: var(--border-info);
}

.customer-credit-card--over-limit {
  background: var(--bg-danger-muted);
  border-color: var(--border-danger);
  color: var(--text-colour-danger);
}

.credit-usage-card {
  padding: 20px;
}

.credit-usage-heading {
  align-items: flex-start;
  display: flex;
  gap: 12px;
  justify-content: space-between;
}

.credit-usage-heading h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 4px;
}

.credit-usage-heading > strong {
  color: var(--text-colour-secondary);
  font-size: 13px;
  text-align: right;
}

.credit-usage-track {
  background: var(--bg-colour-default);
  border-radius: var(--border-radius-full);
  height: 10px;
  margin-top: 18px;
  overflow: hidden;
}

.credit-usage-track span {
  background: var(--text-colour-accent);
  border-radius: inherit;
  display: block;
  height: 100%;
  transition: width 180ms ease;
}

.credit-usage-card--over-limit .credit-usage-track span {
  background: var(--text-colour-danger);
}

.credit-usage-footnote {
  color: var(--text-colour-secondary);
  font-size: 12px;
  line-height: 1.5;
  margin: 12px 0 0;
}

.customer-credit-note {
  color: var(--text-colour-secondary);
  font-size: 14px;
}

.customer-credit-note strong {
  color: var(--text-colour-default);
  margin-left: 4px;
}

.visually-hidden {
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}

.customer-not-found {
  background: var(--bg-colour-white);
  border: 1px solid var(--border-colour-subtle);
  border-radius: var(--border-radius-lg);
  color: var(--text-colour-secondary);
  margin: 0;
  padding: 24px;
  text-align: center;
}

@media (max-width: 900px) {
  .customer-workspace {
    grid-template-columns: minmax(0, 1fr);
  }

  .customer-profile-skeleton {
    align-items: center;
    flex-direction: row;
    padding: 18px;
  }

  .customer-profile-skeleton > :first-child {
    flex: 0 0 72px;
    margin: 0;
  }

  .customer-profile-skeleton-actions {
    display: flex;
    margin: 0 0 0 auto;
    width: auto;
  }

  .customer-profile-skeleton-actions :deep(.skeleton) {
    width: 76px !important;
  }

  .customer-overview-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 650px) {
  .customer-stat-grid,
  .customer-credit-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .customer-credit-card:last-child {
    grid-column: 1 / -1;
  }
}

@media (max-width: 520px) {
  .customer-profile-skeleton {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .customer-profile-skeleton-actions {
    border-top: 1px solid var(--border-colour-subtle);
    flex-basis: 100%;
    justify-content: flex-end;
    padding-top: 12px;
  }

  .customer-information-grid-skeleton {
    grid-template-columns: minmax(0, 1fr);
  }

  .customer-tab {
    padding: 11px 12px;
  }

  .customer-stat-grid,
  .customer-stat-grid--two,
  .customer-credit-grid,
  .customer-information-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .customer-credit-card:last-child,
  .customer-information-item--wide {
    grid-column: auto;
  }

  .customer-section-heading,
  .credit-usage-heading {
    align-items: flex-start;
    flex-direction: column;
  }

  .credit-usage-heading > strong {
    text-align: left;
  }
}
</style>
