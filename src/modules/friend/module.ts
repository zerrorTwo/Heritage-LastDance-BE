import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FriendshipModel } from './model';
import { UserModel } from '../user/model';
import { FriendshipRepository } from './repository';
import { FriendService } from './service';
import { FriendController } from './controller';

@Module({
  imports: [TypeOrmModule.forFeature([FriendshipModel, UserModel])],
  controllers: [FriendController],
  providers: [FriendshipRepository, FriendService],
  exports: [FriendService],
})
export class FriendModule {}
