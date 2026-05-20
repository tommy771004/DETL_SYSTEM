export type Permission = 
  | 'pipeline:read'
  | 'pipeline:write'
  | 'pipeline:execute'
  | 'data:read'
  | 'data:write'
  | 'system:audit'
  | 'iam:manage';

export type Role = 'SysAdmin' | 'DataEngineer' | 'Analyst' | 'Auditor';

export type AccountType = 'Local' | 'Network';

export interface UserAccount {
  id: string;
  username: string;
  accountType: AccountType;
  roles: Role[];
  deviceId?: string; // For Local accounts: strictly bound to a single device
  isActive: boolean;
  lastLogin?: string;
}
