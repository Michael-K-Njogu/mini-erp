import { reactive, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'

export function useProductFilters() {
  const route = useRoute()
  const router = useRouter()

  const filters = reactive({
    query: '',
    category: '',
    status: '',
    sort: {
      field: 'createdAt',
      direction: 'desc',
    },
    pagination: {
      currentPage: 1,
      pageSize: 10,
      totalItems: 0,
    },
  })

  function parseFiltersFromUrl() {
    return {
      query: route.query.q ?? '',

      category: route.query.category ?? '',

      sortField: route.query.sort ?? 'createdAt',

      sortDirection: route.query.direction ?? 'desc',

      currentPage: Number(route.query.page) || 1,

      pageSize: Number(route.query.pageSize) || 10,
    }
  }

  function initializeFiltersFromUrl() {
    const parsed = parseFiltersFromUrl()

    filters.query = parsed.query
    filters.category = parsed.category
    filters.sort.field = parsed.sortField
    filters.sort.direction = parsed.sortDirection
    filters.pagination.currentPage = parsed.currentPage
    filters.pagination.pageSize = parsed.pageSize
  }

  function serializeFilters() {
    return {
      q: filters.query || undefined,
      category: filters.category || undefined,
      sort: filters.sort.field === 'createdAt' ? undefined : filters.sort.field,
      direction: filters.sort.direction === 'desc' ? undefined : filters.sort.direction,
      page: filters.pagination.currentPage !== 1 ? filters.pagination.currentPage : undefined,
      pageSize: filters.pagination.pageSize !== 10 ? filters.pagination.pageSize : undefined,
    }
  }

  return {
    filters,
    initializeFiltersFromUrl,
    serializeFilters,
  }
}
