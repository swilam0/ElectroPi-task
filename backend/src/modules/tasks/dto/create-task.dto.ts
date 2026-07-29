import { IsIn, IsISO8601, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { IsFutureDate } from '../../../common/decorators/is-future-date.decorator';

export class CreateTaskDto {
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsString()
  @IsIn(['LOW', 'MEDIUM', 'HIGH'])
  priority!: string;

  @IsOptional()
  @IsString()
  @IsISO8601({ strict: true })
  @IsFutureDate()
  dueDate?: string;

  @IsOptional()
  @IsUUID()
  assigneeId?: string;
}
