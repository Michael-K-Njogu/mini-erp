export const STOCK_MOVEMENT_TYPE = Object.freeze({
  STOCK_IN: 'stock_in',
  STOCK_OUT: 'stock_out',
})

export const STOCK_MOVEMENT_OPTIONS = [
  { label: 'Receive stock', value: STOCK_MOVEMENT_TYPE.STOCK_IN },
  { label: 'Remove stock', value: STOCK_MOVEMENT_TYPE.STOCK_OUT },
]
