import { IsOptional, IsString } from 'class-validator';

export class CreateExerciseDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  muscleGroupId?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsString()
  videoUrl?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  equipment?: string;
}
