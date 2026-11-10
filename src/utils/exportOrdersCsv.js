import { formatLocalDate } from '../business/dashboardMetrics'

function csvCell(value) {
  let text = String(value ?? '')
  if (
    typeof value !== 'number' &&
    (/^[\s\u0000-\u001f]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text))
  ) {
    text = `'${text}`
  }
  return `"${text.replaceAll('"', '""')}"`
}

export function ordersCsv(orders) {
  const rows = [
    ['Order number', 'Customer', 'Status', 'Total (KES)', 'Created at', 'Completed at'],
    ...orders.map((order) => [
      order.orderNumber,
      order.customerName,
      order.status,
      order.grandTotal,
      order.createdAt,
      order.completedAt,
    ]),
  ]
  return rows.map((row) => row.map(csvCell).join(',')).join('\r\n') + '\r\n'
}

export function downloadOrdersCsv(orders, periods) {
  const lastDay = new Date(periods.currentEnd)
  lastDay.setDate(lastDay.getDate() - 1)
  const url = URL.createObjectURL(
    new Blob(['\ufeff', ordersCsv(orders)], { type: 'text/csv;charset=utf-8' }),
  )
  try {
    const link = document.createElement('a')
    link.href = url
    link.download = `orders-${formatLocalDate(periods.currentStart)}-to-${formatLocalDate(lastDay)}.csv`
    link.click()
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 0)
  }
}
