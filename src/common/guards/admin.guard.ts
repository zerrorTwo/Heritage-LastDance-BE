import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard';

@Injectable()
export class AdminGuard extends JwtAuthGuard {
  canActivate(context: ExecutionContext): boolean {
    const baseResult = super.canActivate(context);
    if (!baseResult) return false;

    const request = context.switchToHttp().getRequest<{
      user?: { sub: string; email?: string; sessionId: string };
    }>();

    const user = request.user;
    if (!user) {
      throw new ForbiddenException('Access denied: Admin access required');
    }

    // TODO: Implement proper admin check
    // Options for admin verification:
    // 1. Add isAdmin field to UserModel and check via UserService
    // 2. Check against ADMIN_USER_IDS env variable
    // 3. Check JWT payload for admin role
    // 4. Create admin_users table

    // Temporary: Check if user email is in admin list (configure as needed)
    // For production, implement proper admin verification
    const adminEmails = process.env.ADMIN_EMAILS?.split(',') || [];
    const isAdmin = adminEmails.includes(user.email || '');

    if (!isAdmin) {
      throw new ForbiddenException('Access denied: Admin access required');
    }

    return true;
  }
}
