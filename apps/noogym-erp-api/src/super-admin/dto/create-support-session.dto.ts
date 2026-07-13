import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class CreateSupportSessionDto {
  @IsString()
  @IsNotEmpty()
  organizationId!: string;

  @IsString()
  @MinLength(8)
  reason!: string;
}
