import { Module } from '@nestjs/common';
import { Neo4jService } from './neo4j.service';
import { GraphService } from './service';
import { PersonaService } from './persona.service';
import { GraphController } from './controller';

@Module({
  controllers: [GraphController],
  providers: [Neo4jService, GraphService, PersonaService],
  exports: [GraphService, Neo4jService, PersonaService],
})
export class GraphModule {}
