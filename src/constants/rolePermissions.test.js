import { describe, expect, it } from 'vitest'
import { PERMISSION } from './permissions'
import { ROLE_PERMISSIONS } from './rolePermissions'
import { USER_ROLE } from './userRoles'
import { navigation } from '../config/navigation'

describe('inventory permissions', () => {
  it('allows all supported roles to view inventory and only Admin and Operations to adjust', () => {
    for (const role of [USER_ROLE.ADMIN, USER_ROLE.SALES, USER_ROLE.OPERATIONS]) {
      expect(ROLE_PERMISSIONS[role]).toContain(PERMISSION.INVENTORY_VIEW)
    }
    expect(ROLE_PERMISSIONS[USER_ROLE.ADMIN]).toContain(PERMISSION.INVENTORY_ADJUST)
    expect(ROLE_PERMISSIONS[USER_ROLE.OPERATIONS]).toContain(PERMISSION.INVENTORY_ADJUST)
    expect(ROLE_PERMISSIONS[USER_ROLE.SALES]).not.toContain(PERMISSION.INVENTORY_ADJUST)
    expect(navigation.find((item) => item.to === '/inventory').permission).toBe(
      PERMISSION.INVENTORY_VIEW,
    )
  })
})
