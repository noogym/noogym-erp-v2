import { Injectable } from '@nestjs/common';
import { GymClassStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MobileEntrypointService {
  constructor(private readonly prisma: PrismaService) {}

  async meSummary(userId: string, organizationId: string) {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const tomorrow = new Date(todayStart);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [user, todayClasses, checkinsToday] = await this.prisma.$transaction([
      this.prisma.user.findFirst({
        where: { id: userId, organizationId },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatarUrl: true,
          organization: {
            select: {
              id: true,
              name: true,
              slug: true,
              currency: true,
              timezone: true,
            },
          },
          gyms: {
            select: {
              gym: {
                select: {
                  id: true,
                  name: true,
                  city: true,
                  province: true,
                },
              },
            },
          },
          employeeProfile: {
            select: {
              id: true,
              name: true,
              role: true,
              status: true,
            },
          },
        },
      }),
      this.prisma.gymClass.findMany({
        where: {
          organizationId,
          status: {
            in: [GymClassStatus.SCHEDULED, GymClassStatus.IN_PROGRESS],
          },
          OR: [
            { startAt: null },
            { startAt: { gte: todayStart, lt: tomorrow } },
          ],
        },
        orderBy: [{ startAt: 'asc' }, { createdAt: 'desc' }],
        take: 5,
        select: {
          id: true,
          name: true,
          category: true,
          startAt: true,
          endAt: true,
          durationMinutes: true,
          capacity: true,
          participants: true,
          status: true,
          gym: { select: { id: true, name: true } },
          room: { select: { id: true, name: true } },
          instructor: { select: { id: true, name: true, role: true } },
        },
      }),
      this.prisma.checkIn.count({
        where: { organizationId, checkedAt: { gte: todayStart, lt: tomorrow } },
      }),
    ]);

    return {
      user,
      today: {
        checkins: checkinsToday,
        classes: todayClasses,
      },
    };
  }
}
