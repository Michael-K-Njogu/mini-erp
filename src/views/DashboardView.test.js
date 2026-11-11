import { mount, flushPromises } from '@vue/test-utils'
import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardView from './DashboardView.vue'
import HorizontalBarChart from '../components/dashboard/HorizontalBarChart.vue'

const profile = ref({ display_name: 'Alex', role: 'Sales' })
const getOrders = vi.fn()
const getCustomers = vi.fn()
const getInventory = vi.fn()
const download = vi.fn()

vi.mock('../composables/useAuth', () => ({
  useAuth: () => ({ user: ref({ email: 'alex@example.test' }), profile }),
}))
vi.mock('../services/dashboardService', () => ({
  getDashboardOrders: (...args) => getOrders(...args),
  getDashboardCustomers: (...args) => getCustomers(...args),
  getDashboardInventory: (...args) => getInventory(...args),
}))
vi.mock('../utils/exportOrdersCsv', () => ({ downloadOrdersCsv: (...args) => download(...args) }))
vi.mock('../composables/useTheme', () => ({ useTheme: () => ({ theme: ref('light') }) }))

const mountDashboard = () =>
  mount(DashboardView, {
    global: {
      stubs: {
        SalesTrendChart: true,
        DonutChart: true,
        HorizontalBarChart: true,
        RouterLink: { name: 'RouterLink', props: ['to'], template: '<a><slot /></a>' },
      },
    },
  })

const clickTab = (wrapper, label) =>
  wrapper
    .findAll('[role="tab"]')
    .find((tab) => tab.text() === label)
    .trigger('click')

beforeEach(() => {
  vi.clearAllMocks()
  profile.value = { display_name: 'Alex', role: 'Sales' }
  getOrders.mockResolvedValue([])
  getCustomers.mockResolvedValue([])
  getInventory.mockResolvedValue([])
})

describe('dashboard', () => {
  it('loads creations and completed sales, applies custom dates, and exports the selected orders', async () => {
    const order = {
      id: 'o1',
      orderNumber: 'SO-1',
      customerId: 'c1',
      customerName: 'Acme',
      status: 'Completed',
      grandTotal: 50,
      createdAt: new Date(2024, 0, 5).toISOString(),
      completedAt: new Date(2024, 0, 6).toISOString(),
    }
    getOrders.mockResolvedValue([order])
    getCustomers.mockResolvedValue([
      { id: 'c1', name: 'Acme', createdAt: new Date(2024, 0, 4).toISOString() },
    ])
    const wrapper = mountDashboard()
    await flushPromises()
    await wrapper.find('#dashboard-range').setValue('custom')
    await wrapper.find('#dashboard-start').setValue('2024-01-01')
    await wrapper.find('#dashboard-end').setValue('2024-01-31')
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Selected range: 2024-01-01 to 2024-01-31')
    expect(wrapper.text()).toContain('Acme')
    await clickTab(wrapper, 'Orders')
    const statusChart = wrapper
      .findAllComponents(HorizontalBarChart)
      .find((chart) => chart.props('label') === 'Orders by status')
    expect(statusChart.props('bars')).toContainEqual(
      expect.objectContaining({ label: 'Completed', value: 1 }),
    )
    await clickTab(wrapper, 'Activity')
    expect(wrapper.text()).toContain('SO-1')
    expect(
      wrapper.findAllComponents({ name: 'RouterLink' }).map((link) => link.props('to')),
    ).toContainEqual({ name: 'order-details', params: { id: 'o1' } })
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('Export'))
      .trigger('click')
    expect(download).toHaveBeenCalledWith([order], expect.objectContaining({ days: 31 }))
    wrapper.unmount()
  })

  it('validates ranges and hides stale data and export on loading errors', async () => {
    const wrapper = mountDashboard()
    await flushPromises()
    await wrapper.find('#dashboard-range').setValue('custom')
    await wrapper.find('#dashboard-start').setValue('2024-02-01')
    await wrapper.find('#dashboard-end').setValue('2024-01-01')
    await wrapper.find('form').trigger('submit')
    expect(wrapper.text()).toContain('Choose a valid start date')
    expect(getOrders).toHaveBeenCalledTimes(1)
    await wrapper.find('#dashboard-end').setValue('2024-02-02')
    getOrders.mockRejectedValueOnce(new Error('Failed to load'))
    await wrapper.find('form').trigger('submit')
    await flushPromises()
    expect(wrapper.text()).toContain('Failed to load')
    expect(wrapper.find('.dashboard-kpis').exists()).toBe(false)
    expect(
      wrapper
        .findAll('button')
        .find((button) => button.text().includes('Export'))
        .attributes('disabled'),
    ).toBeDefined()
    expect(wrapper.text()).not.toContain('Selected range: 2024-02-01 to 2024-02-02')
    wrapper.unmount()
  })

  it('refreshes for role changes and hides order and customer data without permissions', async () => {
    const wrapper = mountDashboard()
    await flushPromises()
    profile.value = { role: 'Accounting' }
    await flushPromises()
    expect(getOrders).toHaveBeenCalledTimes(1)
    expect(getCustomers).toHaveBeenCalledTimes(1)
    expect(getInventory).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).not.toContain('Export orders')
    expect(wrapper.text()).not.toContain('Recent activity')
    expect(wrapper.text()).not.toContain('Sales trend')
    wrapper.unmount()
  })

  it('ignores a stale response after a newer refresh', async () => {
    let resolveOld
    getOrders.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveOld = resolve
        }),
    )
    const wrapper = mountDashboard()
    // Trigger a role change while the initial request is still in flight.
    profile.value = { role: 'Operations' }
    await flushPromises()
    resolveOld([
      { id: 'old', orderNumber: 'STALE', status: 'Pending', createdAt: new Date().toISOString() },
    ])
    await flushPromises()
    expect(wrapper.text()).not.toContain('STALE')
    wrapper.unmount()
  })
})
