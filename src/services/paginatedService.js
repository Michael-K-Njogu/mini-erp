import { apiClient } from '../api/apiClient'

const PAGE_SIZE = 1000

export async function getAll(resource, params, signal) {
  const rows = []
  let total
  const ids = new Set()
  for (;;) {
    if (rows.length) params.set('id', `gt.${rows[rows.length - 1].id}`)
    params.set('limit', PAGE_SIZE)
    const { data, response } = await apiClient.getRaw(`/${resource}?${params}`, {
      headers: { Prefer: 'count=exact' },
      signal,
    })
    const range = response.headers.get('content-range')
    const count = range?.split('/')[1]
    if (!Array.isArray(data) || !count || !/^\d+$/.test(count)) {
      throw new Error(`Unable to verify the complete ${resource} dataset.`)
    }
    if (total !== undefined && total - rows.length !== Number(count)) {
      throw new Error(`${resource} changed while loading. Please retry.`)
    }
    if (total === undefined) total = Number(count)
    for (const row of data) {
      if (row.id == null || ids.has(row.id)) {
        throw new Error(`Unable to verify the complete ${resource} dataset.`)
      }
      ids.add(row.id)
    }
    rows.push(...data)
    if (rows.length === total) return rows
    if (!data.length || rows.length > total) throw new Error(`Unable to load all ${resource}.`)
  }
}
