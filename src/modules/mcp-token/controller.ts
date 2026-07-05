import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Response } from '../../common/response';
import { CreateMcpTokenDto } from './dto/mcp-token.dto';
import { McpTokenService } from './service';

@ApiTags('MCP Tokens')
@Controller('mcp-tokens')
export class McpTokenController {
  constructor(private readonly mcpTokenService: McpTokenService) {}

  // ───────────────────────────────────────────────────────────
  // User-facing endpoints (requires JWT auth from FE)
  // ───────────────────────────────────────────────────────────

  @Post()
  @UseGuards(JwtAuthGuard)
  async createToken(@Req() req: any, @Body() dto: CreateMcpTokenDto) {
    const result = await this.mcpTokenService.createToken(req.user.userId, dto.name, dto.scopes);
    return Response.OK(result);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  async listTokens(@Req() req: any) {
    const tokens = await this.mcpTokenService.listTokens(req.user.userId);
    return Response.OK(tokens);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async revokeToken(@Req() req: any, @Param('id') id: string) {
    const result = await this.mcpTokenService.revokeToken(id, req.user.userId);
    return Response.OK(result);
  }

  // ───────────────────────────────────────────────────────────
  // Internal endpoint (called by AI Service for token verification)
  // Secured by AI_SERVICE_TOKEN shared secret
  // ───────────────────────────────────────────────────────────

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  async verifyToken(
    @Body() body: { token: string },
    @Headers('x-service-token') serviceToken: string,
  ) {
    // Validate service-to-service shared secret
    const expectedToken = process.env.AI_SERVICE_TOKEN;
    if (!expectedToken || serviceToken !== expectedToken) {
      throw new UnauthorizedException('Invalid service token');
    }

    const user = await this.mcpTokenService.verifyToken(body.token);
    if (!user) {
      return Response.OK(null);
    }
    return Response.OK(user);
  }
}
