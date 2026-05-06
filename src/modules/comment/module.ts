import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CommentModel } from './model';
import { CommentRepository } from './repository';
import { CommentService } from './service';
import { CommentController } from './controller';
import { UserModule } from '../user/module';

@Module({
  imports: [TypeOrmModule.forFeature([CommentModel]), UserModule],
  controllers: [CommentController],
  providers: [CommentRepository, CommentService],
  exports: [CommentRepository, CommentService],
})
export class CommentModule {}
