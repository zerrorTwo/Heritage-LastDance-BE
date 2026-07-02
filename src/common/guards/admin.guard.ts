import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  Optional,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { UserRepository } from '../../modules/user/repository';
import { UserRole } from '../../modules/user/model';

@Injectable()
export class AdminGuard extends JwtAuthGuard {
  constructor(
    reflector: Reflector,
    @Optional()
    private readonly userRepo: UserRepository,
  ) {
    super(reflector);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const baseResult = await Promise.resolve(super.canActivate(context));
    if (!baseResult) return false;

    const request = context.switchToHttp().getRequest<{
      user?: { sub: string; userId?: string; sessionId: string };
    }>();

    const authUser = request.user;
    if (!authUser) {
      throw new ForbiddenException('Access denied: Admin access required');
    }

    if (!this.userRepo) {
      throw new ForbiddenException('Access denied: Admin access required');
    }

    const user = await this.userRepo.findById(authUser.userId || authUser.sub);
    const isAdmin = user?.role === UserRole.ADMIN;

    if (!isAdmin) {
      throw new ForbiddenException('Access denied: Admin access required');
    }

    return true;
  }
}
