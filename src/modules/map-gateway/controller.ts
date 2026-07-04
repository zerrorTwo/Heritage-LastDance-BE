import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { MapGatewayService } from './service';

@ApiTags('Map Gateway')
@Controller()
export class MapGatewayController {
  constructor(private readonly mapGatewayService: MapGatewayService) {}

  @Get('travel/health')
  @ApiOperation({ summary: 'Health check for migrated Map gateway and AI service' })
  async health() {
    return this.mapGatewayService.health();
  }

  @Post('trips/recommend')
  @ApiOperation({ summary: 'Generate heritage travel itinerary via Map AI service' })
  async recommendTrip(@Body() payload: Record<string, any>) {
    return this.mapGatewayService.recommendTrip(payload);
  }

  @Post('routes/plan')
  @ApiOperation({ summary: 'Plan a fixed start/end heritage route via Map AI service' })
  async planRoute(@Body() payload: Record<string, any>) {
    return this.mapGatewayService.planRoute(payload);
  }

  @Get('heritage-sites')
  @ApiOperation({ summary: 'List Map heritage sites, optionally filtered by province' })
  async listHeritageSites(@Query('province') province?: string) {
    return this.mapGatewayService.listHeritageSites(province);
  }

  @Get('heritage-sites/:siteId/reviews')
  @ApiOperation({ summary: 'Get generated reviews for a Map heritage site' })
  async getSiteReviews(@Param('siteId') siteId: string) {
    return this.mapGatewayService.getSiteReviews(siteId);
  }

  @Get('heritage-sites/:siteId/enrich')
  @ApiOperation({ summary: 'Get enriched info for a Map heritage site' })
  async enrichSite(@Param('siteId') siteId: string) {
    return this.mapGatewayService.enrichSite(siteId);
  }

  @Get('heritage-sites/:siteId/images')
  @ApiOperation({ summary: 'Get images for a Map heritage site' })
  async getSiteImages(@Param('siteId') siteId: string) {
    return this.mapGatewayService.getSiteImages(siteId);
  }

  @Get('heritage-sites/:siteId')
  @ApiOperation({ summary: 'Get a Map heritage site by id' })
  async getHeritageSite(@Param('siteId') siteId: string) {
    return this.mapGatewayService.getHeritageSite(siteId);
  }
}
