import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export type AuthUser = {
  sub: string;
  email: string;
  role: string;
  organizationId: string;
  supportMode?: boolean;
  supportSessionId?: string;
  supportReason?: string;
  supportActorId?: string;
  supportActorEmail?: string;
};

export const CurrentUser = createParamDecorator(
  (_: unknown, context: ExecutionContext): AuthUser => {
    const request = context.switchToHttp().getRequest();
    return request.user;
  },
);
