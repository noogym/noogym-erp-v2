import { IsOptional, IsString } from 'class-validator';

export class LinkMemberIdentityDto {
  @IsOptional()
  @IsString()
  identityId?: string;

  @IsOptional()
  @IsString()
  identifier?: string;

  @IsOptional()
  @IsString()
  gymId?: string;
}
