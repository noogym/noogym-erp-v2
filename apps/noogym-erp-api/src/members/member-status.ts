import { BadRequestException } from '@nestjs/common';
import { MemberStatus } from '@prisma/client';

type MemberWithStatus = {
  status: MemberStatus;
};

export function assertActiveMember(member: MemberWithStatus) {
  if (member.status !== MemberStatus.ACTIVE) {
    throw new BadRequestException('Member is not active');
  }
}
