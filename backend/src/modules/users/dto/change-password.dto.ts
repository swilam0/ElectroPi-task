import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsOptional()
  @IsString()
  currentPassword?: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  @Matches(/(?=.*[a-zA-Z])(?=.*[0-9])/, {
    message: 'Password must contain at least 1 letter and 1 number',
  })
  newPassword!: string;
}
