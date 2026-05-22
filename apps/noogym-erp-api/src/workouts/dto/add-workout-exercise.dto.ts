import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class AddWorkoutExerciseDto {
  @IsString()
  exerciseId: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  order: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  sets: number;

  @IsString()
  reps: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  restSeconds?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
