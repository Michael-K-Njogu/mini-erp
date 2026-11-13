import { PERMISSION } from '../constants/permissions'

import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  Settings,
  Package,
  ChartNoAxesCombined,
  ReceiptText,
  CreditCard,
  Warehouse,
} from '@lucide/vue'

export const navigation = [
  {
    title: 'Dashboard',
    icon: LayoutDashboard,
    to: '/',
  },
  {
    title: 'Customers',
    icon: Users,
    to: '/customers',
    permission: PERMISSION.CUSTOMER_VIEW,
  },
  {
    title: 'Orders',
    icon: ShoppingCart,
    to: '/orders',
    permission: PERMISSION.ORDER_VIEW,
  },
  {
    title: 'Products',
    icon: Package,
    to: '/products',
    permission: PERMISSION.PRODUCT_VIEW,
  },
  {
    title: 'Inventory',
    icon: Warehouse,
    to: '/inventory',
    permission: PERMISSION.INVENTORY_VIEW,
  },
  /*
  {
    title: 'Payments',
    icon: CreditCard,
    to: '/payments',
  },
  {
    title: 'Reports',
    icon: ChartNoAxesCombined,
    to: '/reports',
  },
  {
    title: 'Settings',
    icon: Settings,
    to: '/settings',
  },
  */
]
