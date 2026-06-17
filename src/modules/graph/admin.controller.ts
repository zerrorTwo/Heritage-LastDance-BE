import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Response } from '../../common/response';
import { AdminGuard } from '../../common/guards/admin.guard';
import { GraphAdminService } from './admin.service';
import {
  CreateGraphEdgeDto,
  CreateGraphNodeDto,
  UpdateGraphNodeDto,
} from './dto/graph-admin.dto';

/**
 * CRUD quản trị Bản đồ Lịch sử (node + cạnh). Chỉ admin. Ghi Postgres + sync Neo4j.
 */
@ApiTags('Historical Graph (Admin)')
@ApiBearerAuth()
@UseGuards(AdminGuard)
@Controller('admin/graph')
export class GraphAdminController {
  constructor(private readonly adminService: GraphAdminService) {}

  // ── Nodes ──
  @Get('nodes')
  @ApiOperation({ summary: 'Danh sách node (quản trị)' })
  async listNodes() {
    return Response.OK(await this.adminService.listNodes());
  }

  @Post('nodes')
  @ApiOperation({ summary: 'Tạo node mới' })
  async createNode(@Body() dto: CreateGraphNodeDto) {
    return Response.Created(await this.adminService.createNode(dto));
  }

  @Put('nodes/:id')
  @ApiOperation({ summary: 'Cập nhật node' })
  async updateNode(@Param('id') id: string, @Body() dto: UpdateGraphNodeDto) {
    return Response.OK(await this.adminService.updateNode(id, dto));
  }

  @Delete('nodes/:id')
  @ApiOperation({ summary: 'Xoá node (kèm mọi cạnh liên quan)' })
  async deleteNode(@Param('id') id: string) {
    return Response.OK(await this.adminService.deleteNode(id));
  }

  // ── Edges ──
  @Get('edges')
  @ApiOperation({ summary: 'Danh sách cạnh (quản trị)' })
  async listEdges() {
    return Response.OK(await this.adminService.listEdges());
  }

  @Post('edges')
  @ApiOperation({ summary: 'Tạo cạnh (quan hệ) mới' })
  async createEdge(@Body() dto: CreateGraphEdgeDto) {
    return Response.Created(await this.adminService.createEdge(dto));
  }

  @Delete('edges/:id')
  @ApiOperation({ summary: 'Xoá cạnh' })
  async deleteEdge(@Param('id') id: string) {
    return Response.OK(await this.adminService.deleteEdge(id));
  }
}
