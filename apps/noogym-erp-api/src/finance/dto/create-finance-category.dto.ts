import { Type } from 'class-transformer';
import {
  IsHexColor,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateFinanceCategoryDto {
  @IsIn(['Receita', 'Despesa'])
  kind: 'Receita' | 'Despesa';

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  displayOrder?: number;
}
