import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { ApiGatewayService } from './service';
import { ApiTags, ApiOperation } from '@nestjs/swagger';

@ApiTags('API Gateway (Legacy Proxy)')
@Controller('v1')
export class ApiGatewayController {
  constructor(private readonly gatewayService: ApiGatewayService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check for Gateway and AI service' })
  async health() {
    return this.gatewayService.health();
  }

  @Post('trips/recommend')
  @ApiOperation({ summary: 'Forward trip recommendation request to AI service' })
  async recommendTrip(@Body() payload: any) {
    return this.gatewayService.recommendTrip(payload);
  }

  @Post('routes/plan')
  @ApiOperation({ summary: 'Forward fixed start/end route planning request to AI service' })
  async routePlan(@Body() payload: any) {
    return this.gatewayService.planRoute(payload);
  }

  @Get('heritage-sites')
  @ApiOperation({ summary: 'List heritage sites, optionally filtered by province' })
  async listHeritageSites(@Query('province') province?: string) {
    return this.gatewayService.listHeritageSites(province);
  }

  @Get('heritage-sites/:site_id/reviews')
  @ApiOperation({ summary: 'Forward reviews request to AI service' })
  async getSiteReviews(@Param('site_id') siteId: string) {
    return this.gatewayService.getSiteReviews(siteId);
  }

  @Get('heritage-sites/:site_id/enrich')
  @ApiOperation({ summary: 'Forward enrich request to AI service' })
  async enrichSite(@Param('site_id') siteId: string) {
    return this.gatewayService.enrichSite(siteId);
  }

  @Get('heritage-sites/:site_id/images')
  @ApiOperation({ summary: 'Forward image request to AI service' })
  async getSiteImages(@Param('site_id') siteId: string) {
    return this.gatewayService.getSiteImages(siteId);
  }

  @Get('heritage-sites/:site_id')
  @ApiOperation({ summary: 'Get a single heritage site by ID' })
  async getHeritageSite(@Param('site_id') siteId: string) {
    return this.gatewayService.getHeritageSite(siteId);
  }
}
