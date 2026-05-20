import { Role, Permission, UserAccount } from './types.js';

const RolePermissions: Record<Role, Permission[]> = {
  SysAdmin: ['pipeline:read', 'pipeline:write', 'pipeline:execute', 'data:read', 'data:write', 'system:audit', 'iam:manage'],
  DataEngineer: ['pipeline:read', 'pipeline:write', 'pipeline:execute', 'data:read', 'data:write'],
  Analyst: ['pipeline:read', 'data:read'],
  Auditor: ['pipeline:read', 'system:audit']
};

export class RBACService {
  /**
   * Check if a user has a specific permission.
   * Enforces Least Privilege by explicitly checking assigned roles.
   */
  public static hasPermission(user: UserAccount, requiredPermission: Permission): boolean {
    if (!user.isActive) return false;

    for (const role of user.roles) {
      const permissions = RolePermissions[role] || [];
      if (permissions.includes(requiredPermission)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Validates account access based on Account Type.
   * Local accounts are strictly bound to a single device.
   * Network accounts can access from any network/device.
   */
  public static validateAccountAccess(user: UserAccount, requestDeviceId?: string): boolean {
    if (!user.isActive) return false;
    
    // For local accounts, the request must originate from the allowed device
    if (user.accountType === 'Local') {
       if (!requestDeviceId || requestDeviceId !== user.deviceId) {
           console.warn(`[IAM System - Security Alert] Unauthorized device access attempt for Local account: ${user.username}. Expected device ID: ${user.deviceId}, Received: ${requestDeviceId || 'None'}`);
           return false;
       }
    }
    return true;
  }

  // Get effective permissions for a user
  public static getEffectivePermissions(user: UserAccount): Permission[] {
    const permSet = new Set<Permission>();
    for (const role of user.roles) {
      for (const p of (RolePermissions[role] || [])) {
        permSet.add(p);
      }
    }
    return Array.from(permSet);
  }
}
