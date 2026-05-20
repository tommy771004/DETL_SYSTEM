import { Router } from 'express';
import { UserAccount } from '../iam/types.js';
import { RBACService } from '../iam/RBACService.js';
import { AuditLogService } from '../iam/AuditLogService.js';

const router = Router();

// Mock User Database
const users: UserAccount[] = [
  {
    id: 'u_1',
    username: 'admin_sys',
    accountType: 'Network',
    roles: ['SysAdmin'],
    isActive: true,
    lastLogin: new Date().toISOString()
  },
  {
    id: 'u_2',
    username: 'etl_local_dev',
    accountType: 'Local',
    roles: ['DataEngineer'],
    isActive: true,
    deviceId: 'DEV_MAC_3391',
    lastLogin: new Date(Date.now() - 86400000).toISOString() // 1 day ago
  },
  {
    id: 'u_3',
    username: 'audit_ext',
    accountType: 'Network',
    roles: ['Auditor'],
    isActive: true,
    lastLogin: new Date(Date.now() - 172800000).toISOString()
  }
];

// Get all users
router.get('/users', (req, res) => {
  res.json(users);
});

// Mock permission check endpoint for a specific user
router.post('/check-access', (req, res) => {
  const { userId, permission, deviceId } = req.body;
  
  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  // Check device compliance
  const isDeviceValid = RBACService.validateAccountAccess(user, deviceId);
  if (!isDeviceValid) {
    AuditLogService.log({
        userId: user.username,
        action: 'access_denied_device',
        resource: 'system',
        details: `Access denied from unauthorized device ID: ${deviceId}`,
        success: false,
        deviceId
    });
    return res.status(403).json({ 
      allowed: false, 
      reason: `Device compliance failed. Local account bound to device: ${user.deviceId}` 
    });
  }

  // Check RBAC permission
  const hasPerm = RBACService.hasPermission(user, permission);
  if (!hasPerm) {
    AuditLogService.log({
        userId: user.username,
        action: 'access_denied_rbac',
        resource: permission,
        details: `Missing required permission: ${permission}`,
        success: false,
        deviceId
    });
    return res.status(403).json({ 
      allowed: false, 
      reason: `Insufficient privileges. Missing permission: ${permission}` 
    });
  }

  AuditLogService.log({
      userId: user.username,
      action: 'access_granted',
      resource: permission,
      details: `Granted permission: ${permission}`,
      success: true,
      deviceId
  });

  res.json({ 
    allowed: true, 
    effectivePermissions: RBACService.getEffectivePermissions(user) 
  });
});

export default router;
