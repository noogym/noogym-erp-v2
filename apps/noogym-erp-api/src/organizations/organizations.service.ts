import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findMine(organizationId: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: {
        _count: {
          select: {
            gyms: true,
            users: true,
            members: true,
            plans: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return organization;
  }

  async updateMine(organizationId: string, dto: UpdateOrganizationDto) {
    if (dto.slug) {
      const existing = await this.prisma.organization.findUnique({
        where: { slug: dto.slug },
        select: { id: true },
      });

      if (existing && existing.id !== organizationId) {
        throw new BadRequestException('Organization slug already exists');
      }
    }

    return this.prisma.organization.update({
      where: { id: organizationId },
      data: dto,
    });
  }
}
