import { Module } from '@nestjs/common';
import { MapGatewayController } from './controller';
import { MapGatewayService } from './service';

@Module({
  controllers: [MapGatewayController],
  providers: [MapGatewayService],
})
export class MapGatewayModule {}
