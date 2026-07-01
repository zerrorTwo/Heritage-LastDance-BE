import { Module } from '@nestjs/common';
import { ApiGatewayController } from './controller';
import { ApiGatewayService } from './service';

@Module({
  controllers: [ApiGatewayController],
  providers: [ApiGatewayService],
  exports: [ApiGatewayService],
})
export class ApiGatewayModule {}
