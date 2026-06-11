import { IsObject } from 'class-validator';

export class UpdateOperationalSettingsDto {
  @IsObject()
  settings: Record<string, unknown>;
}
