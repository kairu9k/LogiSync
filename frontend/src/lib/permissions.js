/**
 * Get current user from localStorage
 */
export function getCurrentUser() {
  try {
    const auth = localStorage.getItem('auth')
    if (!auth) return null
    const parsed = JSON.parse(auth)
    return parsed.user || null
  } catch (e) {
    return null
  }
}

/**
 * Get current user role
 */
export function getUserRole() {
  const user = getCurrentUser()
  return user?.role || null
}

/**
 * Check if user has specific role
 */
export function hasRole(role) {
  const userRole = getUserRole()
  return userRole === role
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(...roles) {
  const userRole = getUserRole()
  return roles.includes(userRole)
}

/**
 * Check if user is admin
 */
export function isAdmin() {
  return hasRole('admin')
}

/**
 * Permission checks for specific features
 */
export const can = {
  // Dashboard - All staff
  viewDashboard: () => hasAnyRole('admin', 'booking_manager', 'warehouse_manager'),

  // Quotes & Orders
  viewQuotes: () => hasAnyRole('admin', 'booking_manager'), // Booking managers can view quotes for reference
  manageQuotes: () => isAdmin(), // Only admin can create and approve quotes
  viewOrders: () => hasAnyRole('admin', 'booking_manager'), // Booking managers can view orders
  manageOrders: () => isAdmin(), // Only admin can create orders

  // Shipments - All staff
  viewShipments: () => hasAnyRole('admin', 'booking_manager', 'warehouse_manager'),
  manageShipments: () => hasAnyRole('admin', 'booking_manager', 'warehouse_manager'),

  // Invoices - Admin and Booking Manager
  viewInvoices: () => hasAnyRole('admin', 'booking_manager'),
  manageInvoices: () => hasAnyRole('admin', 'booking_manager'),

  // Warehouses & Inventory - Admin and Warehouse Manager
  viewWarehouses: () => hasAnyRole('admin', 'warehouse_manager'),
  manageWarehouses: () => hasAnyRole('admin', 'warehouse_manager'),
  viewInventory: () => hasAnyRole('admin', 'warehouse_manager'),
  manageInventory: () => hasAnyRole('admin', 'warehouse_manager'),

  // Transportation - All staff
  viewTransportation: () => hasAnyRole('admin', 'booking_manager', 'warehouse_manager'),
  manageTransportation: () => hasAnyRole('admin', 'booking_manager', 'warehouse_manager'),

  // Reports - All staff
  viewReports: () => hasAnyRole('admin', 'booking_manager', 'warehouse_manager'),

  // Team Management - Admin only
  viewTeam: () => isAdmin(),
  manageTeam: () => isAdmin(),

  // Settings - Subscription is admin only (company-wide subscription, not per-user)
  viewSubscription: () => isAdmin(),
  manageSubscription: () => isAdmin(),
  viewSystemSettings: () => isAdmin(),
  manageSystemSettings: () => isAdmin(),
}
