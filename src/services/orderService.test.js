import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveOrderWithItems } from './orderService'

const mocks = vi.hoisted(() => ({ post: vi.fn() }))
vi.mock('../api/apiClient', () => ({ apiClient: { post: mocks.post } }))
vi.mock('../utils/orderNumber.js', () => ({ generateOrderNumber: () => 'ORD-TEST' }))

beforeEach(() => {
  mocks.post.mockReset()
  mocks.post.mockResolvedValue({ id: 'order-1', order_number: 'ORD-TEST', status: 'Pending' })
})

describe('saveOrderWithItems', () => {
  it('saves a new posted order and all items with a single RPC', async () => {
    const saved = await saveOrderWithItems({
      customerId: 'customer-1',
      notes: '',
      post: true,
      items: [
        {
          productId: 'product-1',
          sku: 'SKU-1',
          productName: 'Cement',
          unit: 'bag',
          quantity: 2.5,
          unitPrice: 10,
          lineTotal: 25,
        },
      ],
    })
    expect(saved).toMatchObject({ id: 'order-1', status: 'Pending' })
    expect(mocks.post).toHaveBeenCalledOnce()
    expect(mocks.post).toHaveBeenCalledWith(
      '/rpc/save_order_with_items',
      {
        p_order_id: null,
        p_order_number: 'ORD-TEST',
        p_customer_id: 'customer-1',
        p_notes: null,
        p_items: [
          {
            id: null,
            product_id: 'product-1',
            sku: 'SKU-1',
            product_name: 'Cement',
            unit: 'bag',
            quantity: 2.5,
            unit_price: 10,
            discount: 0,
            line_total: 25,
            notes: null,
          },
        ],
        p_post: true,
      },
      { headers: { Accept: 'application/vnd.pgrst.object+json' } },
    )
  })

  it('updates a draft without generating a new order number', async () => {
    await saveOrderWithItems({ id: 'order-1', customerId: 'customer-1', items: [], post: false })
    expect(mocks.post.mock.calls[0][1]).toMatchObject({
      p_order_id: 'order-1',
      p_order_number: null,
      p_items: [],
      p_post: false,
    })
  })
})
