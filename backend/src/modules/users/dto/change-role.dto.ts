import { IsIn, IsString } from 'class-validator';

export class ChangeRoleDto {
  @IsString()
  @IsIn(['ADMIN', 'MEMBER'])
  role!: string;
}
