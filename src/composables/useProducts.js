import { ref, reactive, watch, toRef, computed } from 'vue'
import { getProducts } from '../services/productService'
import { useDebounce } from './useDebounce'

export function useProducts(
  filters = reactive({
    query: '',
    category: '',
    status: '',
    sort: {
      field: 'name',
      direction: 'asc',
    },
    pagination: {
      currentPage: 1,
      pageSize: 1000,
      totalItems: 0,
    },
  }),
) {
  const products = ref([])
  const loading = ref(false)
  const error = ref(null)
  const abortController = ref(null)

  const debouncedSearchTerm = useDebounce(toRef(filters, 'query'))

  const productQueryOptions = computed(() => ({
    query: debouncedSearchTerm.value,
    category: filters.category,
    status: filters.status,
    sortField: filters.sort.field,
    sortDirection: filters.sort.direction,
    page: filters.pagination.currentPage,
    pageSize: filters.pagination.pageSize,
  }))

  async function fetchProducts() {
    if (abortController.value) {
      abortController.value.abort()
    }

    const controller = new AbortController()
    abortController.value = controller

    loading.value = true
    error.value = null

    try {
      const { data, total } = await getProducts({
        query: debouncedSearchTerm.value,
        category: filters.category,
        status: filters.status,
        sort: filters.sort,
        page: filters.pagination.currentPage,
        pageSize: filters.pagination.pageSize,
        signal: controller.signal,
      })

      products.value = data
      filters.pagination.totalItems = total
    } catch (err) {
      if (err.name !== 'AbortError') {
        error.value = err.message || 'An error occurred while fetching products.'
      }
    } finally {
      if (abortController.value === controller) {
        loading.value = false
      }
    }
  }

  watch(productQueryOptions, fetchProducts, {
    immediate: true,
  })

  return {
    products,
    loading,
    error,
    refresh: fetchProducts,
  }
}
