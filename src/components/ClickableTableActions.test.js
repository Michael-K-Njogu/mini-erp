import { mount } from '@vue/test-utils'
import { describe, expect, it } from 'vitest'
import ProductTable from './products/ProductTable.vue'
import OrderTable from './orders/OrderTable.vue'
import { ORDER_STATUS } from '../constants/orderStatuses'

const sort = { field: 'createdAt', direction: 'desc' }

for (const [label, component, dataProp, record] of [
  [
    'products',
    ProductTable,
    'products',
    { id: 'p1', createdAt: '2026-11-13T00:00:00Z', name: 'Cement', status: 'Active' },
  ],
  [
    'orders',
    OrderTable,
    'orders',
    {
      id: 'o1',
      createdAt: '2026-11-13T00:00:00Z',
      orderNumber: 'ORD-001',
      status: ORDER_STATUS.DRAFT,
    },
  ],
]) {
  describe(`${label} table clicks`, () => {
    const setup = () =>
      mount(component, { props: { [dataProp]: [record], sort, canEdit: true, canDelete: true } })
    it('opens the record when a regular cell is clicked', async () => {
      const wrapper = setup()
      await wrapper.get('tbody td').trigger('click')
      expect(wrapper.emitted('view')).toEqual([[record.id]])
    })
    for (const action of ['View', 'Edit', 'Delete']) {
      it(`${action} only emits its own action, including clicks on its icon`, async () => {
        const wrapper = setup()
        await wrapper.get(`button[aria-label^="${action}"] svg`).trigger('click')
        const event = action.toLowerCase()
        expect(wrapper.emitted(event)).toEqual([[event === 'delete' ? record : record.id]])
        if (event !== 'view') expect(wrapper.emitted('view')).toBeUndefined()
      })
    }
  })
}

it('printing an order does not open it', async () => {
  const wrapper = mount(OrderTable, {
    props: {
      orders: [
        {
          id: 'o1',
          createdAt: '2026-11-13T00:00:00Z',
          orderNumber: 'ORD-001',
          status: ORDER_STATUS.COMPLETED,
        },
      ],
      sort,
    },
  })
  await wrapper.get('button[aria-label^="Print"] svg').trigger('click')
  expect(wrapper.emitted('print')).toEqual([['o1']])
  expect(wrapper.emitted('view')).toBeUndefined()
})
