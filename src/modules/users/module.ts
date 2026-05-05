import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModel } from './model';
import { UsersService } from './service';
import { UsersController } from './controller';
import { UserRepository } from './repository';
import { USER_REPOSITORY } from '../../common/constants/injection-tokens';

@Module({
  imports: [TypeOrmModule.forFeature([UserModel])],
  providers: [
    UsersService,
    {
      provide: USER_REPOSITORY,
      useClass: UserRepository,
    },
  ],
  controllers: [UsersController],
  exports: [UsersService],
})
export class UsersModule {}
