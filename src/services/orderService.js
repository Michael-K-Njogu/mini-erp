import { apiClient } from '../api/apiClient'
import { generateOrderNumber } from '../utils/orderNumber.js'

const RESOURCE_PATH = '/orders'

const SORT_FIELD_MAP = {
  orderNumber: 'order_number',
  customerName: 'customers(name)',
  customerId: 'customer_id',
  grandTotal: 'total_amount',
  status: 'status',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

export const ORDER_FIELDS = {
  id: 'id',
  orderNumber: 'order_number',
  customerId: 'customer_id',
  grandTotal: 'total_amount',
  status: 'status',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
}

function mapOrder(order) {
  return {
    id: order.id,
    orderNumber: order.order_number,
    customerId: order.customer_id,
    customerName: order.customers?.name ?? '',
    grandTotal: order.total_amount,
    status: order.status,
    notes: order.notes,

    createdAt: order.created_at,
    updatedAt: order.updated_at,

    // Map the new timestamp fields
    postedAt: order.posted_at,
    processingStartedAt: order.processing_started_at,
    completedAt: order.completed_at,
    canceledAt: order.canceled_at,
  }
}

function mapOrderToApi(order) {
  return {
    order_number: order.orderNumber,
    customer_id: order.customerId,
    total_amount: order.totalAmount,
    status: order.status,
    notes: order.notes,

    // Map the new timestamp fields
    posted_at: order.postedAt,
    processing_started_at: order.processingStartedAt,
    completed_at: order.completedAt,
    canceled_at: order.canceledAt,
  }
}

export async function getOrders({
  query = '',
  status = '',
  customerId = '',
  sort,
  page = 1,
  pageSize = 10,
  signal,
} = {}) {
  const params = new URLSearchParams()

  const offset = (page - 1) * pageSize

  params.set('offset', offset)
  params.set('limit', pageSize)

  params.set(
    'select',
    '*,customers(id,name)', // Select all order fields and include customer details
  )

  if (query) {
    params.set('or', `(order_number.ilike.*${query}*)`)
  }

  if (status) {
    params.set('status', `eq.${status}`)
  }

  if (customerId) {
    params.set('customer_id', `eq.${customerId}`)
  }

  if (sort) {
    const sortField = SORT_FIELD_MAP[sort.field]

    if (sortField) {
      params.set('order', `${sortField}.${sort.direction}`)
    }
  }

  const { data, response } = await apiClient.getRaw(`${RESOURCE_PATH}?${params.toString()}`, {
    headers: {
      Prefer: 'count=exact',
    },
    signal,
  })

  const contentRange = response.headers.get('content-range')

  const total = contentRange ? Number(contentRange.split('/')[1]) : 0

  return {
    data: data.map(mapOrder),
    total,
  }
}

export async function getOrderById(id, { signal } = {}) {
  const params = new URLSearchParams()

  params.set('select', '*,customers(id,name)')

  params.set('id', `eq.${id}`)

  const { data } = await apiClient.getRaw(`${RESOURCE_PATH}?${params.toString()}`, { signal })

  return mapOrder(data[0])
}

export async function createOrder(order) {
  const apiOrder = mapOrderToApi({
    ...order,
    orderNumber: order.orderNumber ?? generateOrderNumber(),
  })

  const data = await apiClient.post(RESOURCE_PATH, apiOrder, {
    headers: {
      Prefer: 'return=representation',
    },
  })

  return mapOrder(data[0])
}

export async function updateOrder(id, order) {
  const apiOrder = mapOrderToApi(order)

  const data = await apiClient.patch(`${RESOURCE_PATH}?id=eq.${id}`, apiOrder, {
    headers: {
      Prefer: 'return=representation',
    },
  })

  return mapOrder(data[0])
}

export async function updateOrderGrandTotal(orderId, grandTotal) {
  const data = await apiClient.patch(
    `${RESOURCE_PATH}?id=eq.${orderId}`,
    {
      total_amount: grandTotal,
    },
    {
      headers: {
        Prefer: 'return=representation',
      },
    },
  )

  return mapOrder(data[0])
}

export async function transitionOrder(order, status) {
  return updateOrder(order.id, {
    ...order,
    status,
  })
}

export async function deleteOrder(id) {
  await apiClient.delete(`${RESOURCE_PATH}?id=eq.${id}`)
}
