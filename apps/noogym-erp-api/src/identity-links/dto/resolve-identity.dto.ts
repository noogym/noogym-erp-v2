import { IsString } from 'class-validator';

export class ResolveIdentityDto {
  @IsString()
  identifier: string;
}
