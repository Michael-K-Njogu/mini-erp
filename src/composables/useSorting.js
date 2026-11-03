const DESCENDING_FIRST_FIELDS = ['createdAt', 'updatedAt']

export function useSorting(sort) {
  function sortBy(field) {
    if (sort.field === field) {
      sort.direction = sort.direction === 'asc' ? 'desc' : 'asc'
    } else {
      sort.field = field
      sort.direction = DESCENDING_FIRST_FIELDS.includes(field) ? 'desc' : 'asc'
    }
  }

  return {
    sortBy,
  }
}
