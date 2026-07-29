import { IsIn, IsOptional, IsString, IsUUID, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class TaskFilterDto {
  @IsOptional()
  @IsString()
  @IsIn(['TODO', 'IN_PROGRESS', 'DONE'])
  status?: string;

  @IsOptional()
  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH'])
  priority?: string;

  @IsOptional()
  @IsString()
  @IsUUID()
  assigneeId?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  limit?: number = 20;

  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'dueDate', 'priority', 'status'])
  sort?: string = 'createdAt';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  order?: string = 'desc';
}
