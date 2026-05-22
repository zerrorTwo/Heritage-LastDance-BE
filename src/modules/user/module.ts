import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModel } from './model';
import { UserRepository } from './repository';
import { UserService } from './service';
import { UserController } from './controller';
import { AdminGuard } from '../../common/guards/admin.guard';

@Module({
  imports: [TypeOrmModule.forFeature([UserModel])],
  controllers: [UserController],
  providers: [UserRepository, UserService, AdminGuard],
  exports: [UserRepository],
})
export class UserModule {}
