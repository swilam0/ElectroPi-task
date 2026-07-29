import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { ProjectsController } from './projects.controller';
import { ProjectsRepository } from './projects.repository';
import { ProjectsService } from './projects.service';

@Module({
  imports: [UsersModule],
  controllers: [ProjectsController],
  providers: [ProjectsService, ProjectsRepository],
  exports: [ProjectsRepository],
})
export class ProjectsModule {}
