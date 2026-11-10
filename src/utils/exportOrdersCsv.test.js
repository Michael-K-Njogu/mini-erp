import { afterEach, describe, expect, it, vi } from 'vitest'
import { downloadOrdersCsv, ordersCsv } from './exportOrdersCsv'
import { getDateRange } from '../business/dashboardMetrics'

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('order CSV export', () => {
  it('escapes commas, quotes, newlines and spreadsheet formulas without changing numeric totals', () => {
    const csv = ordersCsv([
      {
        orderNumber: '=1+1',
        customerName: '  @name,"quoted"\nline',
        status: 'Pending',
        grandTotal: -12,
        createdAt: '\ttext',
        completedAt: null,
      },
    ])
    expect(csv).toContain('"\'=1+1"')
    expect(csv).toContain('"\'  @name,""quoted""\nline"')
    expect(csv).toContain('"-12"')
    expect(csv).toContain('"\'\ttext"')
    expect(csv.endsWith('\r\n')).toBe(true)
    expect(ordersCsv([]).split('\r\n')).toHaveLength(2)
  })

  it('downloads the selected range and releases the object URL', () => {
    vi.useFakeTimers()
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:test'), revokeObjectURL: vi.fn() })
    const link = document.createElement('a')
    const click = vi.spyOn(link, 'click').mockImplementation(() => {})
    vi.spyOn(document, 'createElement').mockReturnValue(link)
    downloadOrdersCsv([], getDateRange('2024-02-01', '2024-02-29'))
    expect(link.download).toBe('orders-2024-02-01-to-2024-02-29.csv')
    expect(click).toHaveBeenCalledOnce()
    vi.runAllTimers()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test')
  })
})
