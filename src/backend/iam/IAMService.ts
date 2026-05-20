import { User, Role } from './types.js';

export class IAMService {
  private users: Map<string, User> = new Map();
  private roles: Map<string, Role> = new Map();

  constructor() {
    this.initializeDefaultRoles();
    this.initializeMockUsers();
  }

  private initializeDefaultRoles() {
    this.roles.set('admin', {
      id: 'admin',
      name: 'System Administrator',
      permissions: ['read:*', 'write:*', 'execute:*', 'manage:users']
    });

    this.roles.set('data_engineer', {
      id: 'data_engineer',
      name: 'Data Engineer',
      permissions: ['read:pipeline', 'write:pipeline', 'execute:pipeline']
    });

    this.roles.set('data_steward', {
      id: 'data_steward',
      name: 'Data Steward',
      permissions: ['read:pipeline', 'read:quality', 'write:quality']
    });

    this.roles.set('auditor', {
      id: 'auditor',
      name: 'Auditor',
      permissions: ['read:audit_log', 'read:lineage']
    });
  }

  private initializeMockUsers() {
    // 綁定單一設備的本地端帳號 (Local Account)
    this.users.set('admin_local', {
      id: 'admin_local',
      username: 'admin',
      accountType: 'local',
      boundDeviceId: 'device-001',
      roles: ['admin']
    });

    // 支援跨網域存取的網路帳號 (Network Account)
    this.users.set('engineer_net', {
      id: 'engineer_net',
      username: 'john.doe',
      accountType: 'network',
      roles: ['data_engineer']
    });
  }

  /**
   * 驗證帳號登入與設備綁定政策
   */
  public authenticate(userId: string, currentDeviceId?: string): User | null {
    const user = this.users.get(userId);
    if (!user) return null;

    if (user.accountType === 'local') {
      if (!currentDeviceId || user.boundDeviceId !== currentDeviceId) {
        console.warn(`[IAM] Local account login denied. Device ID mismatch. User: ${userId}`);
        throw new Error('Device not authorized for this local account.');
      }
    }
    return user;
  }

  /**
   * 最小權限原則：動態查核權限
   */
  public authorize(user: User, requiredPermission: string): boolean {
    for (const roleId of user.roles) {
      const role = this.roles.get(roleId);
      if (!role) continue;

      for (const permission of role.permissions) {
        if (this.matchPermission(permission, requiredPermission)) {
          return true;
        }
      }
    }
    return false; // Default Deny
  }

  private matchPermission(granted: string, required: string): boolean {
    if (granted === '*:*' || granted === required) return true;
    
    const [gAction, gResource] = granted.split(':');
    const [rAction, rResource] = required.split(':');

    if (gAction === '*' || gAction === rAction) {
       if (gResource === '*' || gResource === rResource) {
           return true; 
       }
    }
    return false;
  }
}

export const iamService = new IAMService();
