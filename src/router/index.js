import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import { PERMISSION } from '../constants/permissions'
import { usePermissions } from '../composables/usePermissions'

import AppLayout from '../layouts/AppLayout.vue'

// Dashboard
import DashboardView from '../views/DashboardView.vue'

// Customers
import CustomersView from '../views/CustomersView.vue'
import NewCustomerView from '../views/NewCustomerView.vue'

// Orders
import OrdersView from '../views/OrdersView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
      meta: {
        requiresAuth: false,
        guestOnly: true,
      },
    },
    {
      path: '/',
      component: AppLayout,
      meta: {
        requiresAuth: true,
      },

      children: [
        {
          path: '',
          name: 'dashboard',
          component: DashboardView,
          meta: {
            title: 'Dashboard',
          },
        },
        {
          path: 'customers',
          name: 'customers',
          component: CustomersView,
          meta: {
            title: 'Customers',
            permission: PERMISSION.CUSTOMER_VIEW,
          },
        },
        {
          path: 'customers/:id',
          name: 'customer-details',
          component: () => import('../views/CustomerDetailView.vue'),
          meta: {
            title: 'Customer Details',
            parent: 'customers',
            showBackButton: true,
            permission: PERMISSION.CUSTOMER_VIEW,
          },
        },
        {
          path: 'customers/new',
          name: 'customer-new',
          component: NewCustomerView,
          meta: {
            title: 'New Customer',
            parent: 'customers',
            showBackButton: true,
            permission: PERMISSION.CUSTOMER_CREATE,
          },
        },
        {
          path: 'customers/:id/edit',
          name: 'customer-edit',
          component: () => import('../views/EditCustomerView.vue'),
          meta: {
            title: 'Edit Customer',
            parent: 'customer-details',
            showBackButton: true,
            permission: PERMISSION.CUSTOMER_EDIT,
          },
        },
        {
          path: 'orders',
          name: 'orders',
          component: OrdersView,
          meta: {
            title: 'Orders',
            permission: PERMISSION.ORDER_VIEW,
          },
        },
        {
          path: 'orders/:id',
          name: 'order-details',
          component: () => import('../views/OrderDetailView.vue'),
          meta: {
            title: 'Order Details',
            parent: 'orders',
            showBackButton: true,
            permission: PERMISSION.ORDER_VIEW,
          },
        },
        {
          path: 'orders/new',
          name: 'order-new',
          component: () => import('../views/NewOrderView.vue'),
          meta: {
            title: 'New Order',
            parent: 'orders',
            showBackButton: true,
            permission: PERMISSION.ORDER_CREATE,
          },
        },
        {
          path: 'orders/:id/edit',
          name: 'order-edit',
          component: () => import('../views/EditOrderView.vue'),
          meta: {
            title: 'Edit Order',
            parent: 'orders',
            showBackButton: true,
            permission: PERMISSION.ORDER_EDIT,
          },
        },
        {
          path: 'products',
          name: 'products',
          component: () => import('../views/ProductsView.vue'),
          meta: {
            title: 'Products',
            permission: PERMISSION.PRODUCT_VIEW,
          },
        },
        {
          path: 'products/:id',
          name: 'product-details',
          component: () => import('../views/ProductDetailView.vue'),
          meta: {
            title: 'Product Details',
            parent: 'products',
            showBackButton: true,
            permission: PERMISSION.PRODUCT_VIEW,
          },
        },
        {
          path: 'products/new',
          name: 'product-new',
          component: () => import('../views/NewProductView.vue'),
          meta: {
            title: 'New Product',
            parent: 'products',
            showBackButton: true,
            permission: PERMISSION.PRODUCT_CREATE,
          },
        },
        {
          path: 'products/:id/edit',
          name: 'product-edit',
          component: () => import('../views/ProductEditView.vue'),
          meta: {
            title: 'Edit Product',
            parent: 'product-details',
            showBackButton: true,
            permission: PERMISSION.PRODUCT_EDIT,
          },
        },
        {
          path: '/notifications',
          name: 'notifications',
          component: () => import('../views/NotificationsView.vue'),
          meta: {
            title: 'Notifications',
          },
        },
        {
          path: '/inventory',
          name: 'inventory',
          component: () => import('../views/InventoryView.vue'),
          meta: {
            title: 'Inventory',
            permission: PERMISSION.INVENTORY_VIEW,
          },
        },
        {
          path: 'inventory/:id',
          name: 'inventory-details',
          component: () => import('../views/InventoryDetailView.vue'),
          meta: {
            title: 'Inventory Detail',
            parent: 'inventory',
            showBackButton: true,
            permission: PERMISSION.INVENTORY_VIEW,
          },
        },
      ],
    },
  ],
})

router.beforeEach(async (to) => {
  const { initialize, isAuthenticated } = useAuth()

  await initialize()

  const { hasPermission } = usePermissions()

  const requiresAuth = to.matched.some((route) => route.meta.requiresAuth)
  const guestOnly = to.matched.some((route) => route.meta.guestOnly)

  const requiredPermission = to.matched.map((route) => route.meta.permission).find(Boolean)

  // Redirect unauthenticated users to login
  if (requiresAuth && !isAuthenticated.value) {
    return {
      name: 'login',
      query: {
        redirect: to.fullPath,
      },
    }
  }

  // Prevent authenticated users from accessing guest-only pages
  if (guestOnly && isAuthenticated.value) {
    return {
      name: 'dashboard',
    }
  }

  // Block users without the required permission
  if (requiredPermission && !hasPermission(requiredPermission)) {
    return {
      name: 'dashboard',
    }
  }

  return true
})

export default router
