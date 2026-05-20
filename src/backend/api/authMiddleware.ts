import { Request, Response, NextFunction } from 'express';
import { iamService } from '../iam/IAMService.js';

export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // 實務上這會從 JWT Token 或 Session 解析出來
    // 為了展示架構，這裡透過 Http Header 模擬傳遞
    const userId = req.headers['x-user-id'] as string;
    const deviceId = req.headers['x-device-id'] as string; // From browser fingerprint or local client env

    if (!userId) {
       res.status(401).json({ error: 'Unauthorized: Missing User Identity' });
       return;
    }

    try {
        // 1. 認證 (Authentication) 與設備綁定雙重校驗
        const user = iamService.authenticate(userId, deviceId);
        if (!user) {
            res.status(401).json({ error: 'Unauthorized: User not found' });
            return;
        }

        // 2. 授權 (Authorization) 最小權限檢核
        const isAuthorized = iamService.authorize(user, permission);
        if (!isAuthorized) {
            console.warn(`[IAM] Access Denied. User: ${userId} requested permission: ${permission}`);
            res.status(403).json({ error: `Forbidden: Requires permission '${permission}'` });
            return;
        }

        // 通過驗證，將使用者物件存入 request 傳遞給下游
        (req as any).user = user;
        next();
    } catch (err) {
        res.status(403).json({ error: String(err) });
        return;
    }
  };
}
