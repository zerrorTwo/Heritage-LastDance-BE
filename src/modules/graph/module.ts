import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Neo4jService } from './neo4j.service';
import { GraphService } from './service';
import { PersonaService } from './persona.service';
import { GraphController } from './controller';
import { GraphNode } from './graph-node.model';
import { GraphEdge } from './graph-edge.model';
import { GraphRepository } from './repository';
import { GraphAdminService } from './admin.service';
import { GraphAdminController } from './admin.controller';
import { GraphSeedBootstrap } from './seed.bootstrap';
import { UserModule } from '../user/module';
import { AdminGuard } from '../../common/guards/admin.guard';

@Module({
  imports: [TypeOrmModule.forFeature([GraphNode, GraphEdge]), UserModule],
  controllers: [GraphController, GraphAdminController],
  providers: [
    Neo4jService,
    GraphService,
    PersonaService,
    GraphRepository,
    GraphAdminService,
    GraphSeedBootstrap,
    AdminGuard,
  ],
  exports: [GraphService, Neo4jService, PersonaService, GraphRepository],
})
export class GraphModule {}
