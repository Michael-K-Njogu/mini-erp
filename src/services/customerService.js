import { apiClient } from '../api/apiClient'
import { ORDER_STATUS } from '../constants/orderStatuses'
import { uploadCustomerImage, deleteCustomerImage } from './storageService'

const SORT_FIELD_MAP = {
  name: 'name',
  email: 'email',
  customerType: 'customer_type',
  sector: 'sector',
  region: 'region',
  creditLimit: 'credit_limit',
  createdAt: 'created_at',
}

export const CUSTOMER_FIELDS = {
  id: 'id',

  name: 'name',
  customerType: 'customer_type',
  sector: 'sector',
  region: 'region',
  vatNumber: 'vat_number',

  contactPerson: 'contact_person',
  phonePrimary: 'phone_primary',
  phoneSecondary: 'phone_secondary',
  email: 'email',

  deliveryAddress: 'delivery_address',
  city: 'city',

  creditLimit: 'credit_limit',
  creditStatus: 'credit_status',

  image: 'image_url',

  createdAt: 'created_at',
}

function mapCustomer(customer) {
  return {
    id: customer.id,

    name: customer.name,
    customerType: customer.customer_type,
    sector: customer.sector,
    region: customer.region,
    vatNumber: customer.vat_number,

    contactPerson: customer.contact_person,
    phonePrimary: customer.phone_primary,
    phoneSecondary: customer.phone_secondary,
    email: customer.email,

    deliveryAddress: customer.delivery_address,
    city: customer.city,

    creditLimit: customer.credit_limit,
    creditStatus: customer.credit_status,

    image: customer.image_url || null,

    createdAt: customer.created_at,
    orderCount: customer.orders?.[0]?.count ?? 0,
  }
}

function mapCustomerToApi(customer) {
  return {
    name: customer.name,
    customer_type: customer.customerType,
    sector: customer.sector,
    region: customer.region,
    vat_number: customer.vatNumber,

    contact_person: customer.contactPerson,
    phone_primary: customer.phonePrimary,
    phone_secondary: customer.phoneSecondary,
    email: customer.email,

    delivery_address: customer.deliveryAddress,
    city: customer.city,

    credit_limit: customer.creditLimit,
    credit_status: customer.creditStatus,
  }
}

export async function getCustomers({
  query = '',
  customerType = '',
  sort = {
    field: 'createdAt',
    direction: 'desc',
  },
  page = 1,
  pageSize = 10,
  signal,
} = {}) {
  const params = new URLSearchParams()
  const offset = (page - 1) * pageSize
  params.set('offset', offset)
  params.set('limit', pageSize)
  params.set('select', '*, orders(count)')

  if (query) {
    params.set('or', `(name.ilike.*${query}*,email.ilike.*${query}*)`)
  }

  if (customerType) {
    params.set(CUSTOMER_FIELDS.customerType, `eq.${customerType}`)
  }

  const dbSortField = SORT_FIELD_MAP[sort.field]

  if (sort) {
    const dbSortField = SORT_FIELD_MAP[sort.field]

    if (dbSortField) {
      params.set('order', `${dbSortField}.${sort.direction}`)
    }
  }

  const { data, response } = await apiClient.getRaw(`/customers?${params.toString()}`, {
    headers: {
      Prefer: 'count=exact',
    },
    signal,
  })

  const contentRange = response.headers.get('content-range')
  const total = contentRange
    ? Number(contentRange.split('/')[1]) // Extract total count from content-range header
    : 0 // Default to 0 if content-range header is not present

  return {
    data: data.map(mapCustomer),
    total,
  }
}

export async function getCustomerById(id) {
  const customers = await apiClient.get(`/customers?id=eq.${id}&select=*,orders(count)`)

  return customers.length > 0 ? mapCustomer(customers[0]) : null
}

export async function getCustomerAccountSummary(customerId) {
  const params = new URLSearchParams()

  params.set('select', 'credit_limit,orders(total_amount,status)')

  params.set('id', `eq.${customerId}`)

  const { data } = await apiClient.getRaw(`/customers?${params.toString()}`)

  const customer = data[0]

  if (!customer) {
    throw new Error('Customer not found.')
  }

  const creditLimit = Number(customer.credit_limit || 0)

  const completedOrders = (customer.orders || []).filter(
    (order) => order.status === ORDER_STATUS.COMPLETED,
  )
  const currentBalance = completedOrders.reduce(
    (total, order) => total + Number(order.total_amount || 0),
    0,
  )

  const availableCredit = creditLimit - currentBalance

  return {
    creditLimit,
    currentBalance,
    availableCredit,
    completedOrderCount: completedOrders.length,
    averageCompletedOrderValue: completedOrders.length
      ? currentBalance / completedOrders.length
      : 0,
  }
}

export async function createCustomer(customer) {
  const createdCustomers = await apiClient.post('/customers', mapCustomerToApi(customer), {
    headers: {
      Prefer: 'return=representation',
    },
  })

  const createdCustomer = createdCustomers[0]

  if (!createdCustomer) {
    throw new Error('Customer could not be created.')
  }

  let imageUrl = null

  if (customer.image instanceof File) {
    imageUrl = await uploadCustomerImage(createdCustomer.id, customer.image)

    const updatedCustomers = await apiClient.patch(
      `/customers?id=eq.${createdCustomer.id}`,
      {
        image_url: imageUrl,
      },
      {
        headers: {
          Prefer: 'return=representation',
        },
      },
    )

    return mapCustomer(updatedCustomers[0])
  }

  return mapCustomer(createdCustomer)
}

export async function updateCustomer(id, customer) {
  const existingCustomer = await getCustomerById(id)

  if (!existingCustomer) {
    throw new Error('Customer not found.')
  }

  const oldImageUrl = existingCustomer.image

  const hasNewImage = customer.image instanceof File

  const imageWasRemoved = customer.image === null && !!oldImageUrl

  let newImageUrl = oldImageUrl

  if (customer.image === null) {
    newImageUrl = null
  }

  if (hasNewImage) {
    newImageUrl = await uploadCustomerImage(id, customer.image)
  }

  const updatedCustomers = await apiClient.patch(
    `/customers?id=eq.${id}`,
    {
      ...mapCustomerToApi(customer),
      image_url: newImageUrl,
    },
    {
      headers: {
        Prefer: 'return=representation',
      },
    },
  )

  const updatedCustomer = updatedCustomers[0]

  // Delete previous image only after DB update succeeds
  if (hasNewImage && oldImageUrl && oldImageUrl !== newImageUrl) {
    await deleteCustomerImage(oldImageUrl)
  }

  // Delete image when user explicitly removed it
  if (imageWasRemoved) {
    await deleteCustomerImage(oldImageUrl)
  }

  return mapCustomer(updatedCustomer)
}

export async function deleteCustomer(id) {
  await apiClient.delete(`/customers?id=eq.${id}`)
}
