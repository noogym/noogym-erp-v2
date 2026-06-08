import { PartialType } from '@nestjs/swagger';
import { CreatePlanCategoryDto } from './create-plan-category.dto';

export class UpdatePlanCategoryDto extends PartialType(CreatePlanCategoryDto) {}
