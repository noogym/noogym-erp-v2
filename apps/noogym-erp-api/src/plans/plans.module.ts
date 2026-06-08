import { Module } from '@nestjs/common';
import { PlanCategoriesController } from './plan-categories.controller';
import { PlanCategoriesService } from './plan-categories.service';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';

@Module({
  controllers: [PlansController, PlanCategoriesController],
  providers: [PlansService, PlanCategoriesService],
})
export class PlansModule {}
