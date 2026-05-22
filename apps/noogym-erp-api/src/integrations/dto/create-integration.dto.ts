import { IsBoolean, IsObject, IsOptional, IsString } from 'class-validator';

export class CreateIntegrationDto {
  @IsString()
  provider: string;

  @IsString()
  name: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>;
}
