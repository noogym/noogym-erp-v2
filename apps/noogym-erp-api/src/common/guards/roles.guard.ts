import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ROLES_KEY } from '../decorators/roles.decorator';

const FORBIDDEN_OBJECT_REFERENCE_MESSAGE = 'Acesso ao recurso nao autorizado';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    const request = context.switchToHttp().getRequest();
    const controllerName = context.getClass()?.name;

    if (!requiredRoles?.length) {
      await this.assertAllowedObjectReferences(request, controllerName);
      return true;
    }

    const user = request.user;
    const hasRequiredRole = Boolean(
      user?.role && requiredRoles.includes(user.role),
    );

    if (!hasRequiredRole) return false;
    await this.assertAllowedObjectReferences(request, controllerName);

    return true;
  }

  private async assertAllowedObjectReferences(
    request: {
      user?: { sub?: string; role?: UserRole; organizationId?: string };
      query?: Record<string, unknown>;
      body?: Record<string, unknown>;
      params?: Record<string, unknown>;
    },
    controllerName?: string,
  ) {
    const user = request.user;
    this.clearScopeGymIds(request);

    if (!user?.sub || !user.organizationId || !user.role) return;
    if (this.hasOrganizationScope(user.role)) return;

    const requestedGymIds = new Set<string>();
    this.addString(requestedGymIds, request.query?.gymId);
    this.addString(requestedGymIds, request.body?.gymId);
    this.addStrings(requestedGymIds, request.body?.gymIds);

    const memberIds = new Set<string>();
    this.addString(memberIds, request.query?.memberId);
    this.addString(memberIds, request.body?.memberId);
    this.addStrings(memberIds, request.body?.memberIds);

    const productIds = this.productIdsFromBody(request.body);
    await this.addRouteObjectReferences({
      controllerName,
      organizationId: user.organizationId,
      params: request.params ?? {},
      requestedGymIds,
      memberIds,
      productIds,
    });
    await this.addBodyObjectReferences({
      organizationId: user.organizationId,
      body: request.body ?? {},
      requestedGymIds,
      memberIds,
      productIds,
    });
    await this.addProductGymReferences(
      user.organizationId,
      productIds,
      requestedGymIds,
    );

    const allowedGymIds = await this.allowedGymIds(
      user.sub,
      user.organizationId,
    );
    this.setScopeGymIds(request, allowedGymIds);

    if (memberIds.size) {
      const members = await this.prisma.member.findMany({
        where: {
          organizationId: user.organizationId,
          id: { in: [...memberIds] },
        },
        select: { id: true, gymId: true },
      });

      if (members.length !== memberIds.size) {
        throw new ForbiddenException(FORBIDDEN_OBJECT_REFERENCE_MESSAGE);
      }

      members.forEach((member) =>
        this.addString(requestedGymIds, member.gymId),
      );
    }

    if (!requestedGymIds.size) return;

    const allowed = [...requestedGymIds].every((gymId) =>
      allowedGymIds.has(gymId),
    );

    if (!allowed) {
      throw new ForbiddenException(FORBIDDEN_OBJECT_REFERENCE_MESSAGE);
    }
  }

  private hasOrganizationScope(role: UserRole) {
    const organizationRoles: UserRole[] = [
      UserRole.SUPER_ADMIN,
      UserRole.OWNER,
      UserRole.ADMIN,
    ];
    return organizationRoles.includes(role);
  }

  private async allowedGymIds(userId: string, organizationId: string) {
    const links = await this.prisma.userGym.findMany({
      where: { userId, gym: { organizationId } },
      select: { gymId: true },
    });

    return new Set(links.map((link) => link.gymId));
  }

  private clearScopeGymIds(request: { query?: Record<string, unknown> }) {
    if (request.query) delete request.query.scopeGymIds;
  }

  private setScopeGymIds(
    request: { query?: Record<string, unknown> },
    allowedGymIds: Set<string>,
  ) {
    request.query = request.query ?? {};
    request.query.scopeGymIds = [...allowedGymIds];
  }

  private async addRouteObjectReferences(input: {
    controllerName?: string;
    organizationId: string;
    params: Record<string, unknown>;
    requestedGymIds: Set<string>;
    memberIds: Set<string>;
    productIds: Set<string>;
  }) {
    const routeId = this.stringValue(input.params.id);
    const routeMemberId = this.stringValue(input.params.memberId);

    if (routeMemberId) input.memberIds.add(routeMemberId);
    if (!routeId) return;

    switch (input.controllerName) {
      case 'GymsController':
        input.requestedGymIds.add(routeId);
        break;
      case 'MembersController':
        input.memberIds.add(routeId);
        break;
      case 'ClassesController':
        await this.addGymIdsForRecords(
          this.prisma.gymClass,
          input.organizationId,
          new Set([routeId]),
          input.requestedGymIds,
        );
        break;
      case 'AppointmentsController':
        await this.addGymIdsForRecords(
          this.prisma.appointment,
          input.organizationId,
          new Set([routeId]),
          input.requestedGymIds,
        );
        break;
      case 'ProductsController':
        input.productIds.add(routeId);
        break;
      case 'EmployeesController':
        await this.addGymIdsForRecords(
          this.prisma.employee,
          input.organizationId,
          new Set([routeId]),
          input.requestedGymIds,
        );
        break;
      case 'SalesController':
        await this.addSaleReferences(
          input.organizationId,
          new Set([routeId]),
          input.requestedGymIds,
          input.memberIds,
        );
        break;
      case 'PaymentsController':
        await this.addPaymentReferences(
          input.organizationId,
          new Set([routeId]),
          input.requestedGymIds,
          input.memberIds,
        );
        break;
      case 'SubscriptionsController':
        await this.addSubscriptionReferences(
          input.organizationId,
          new Set([routeId]),
          input.memberIds,
        );
        break;
      case 'MessagesController':
        await this.addMessageReferences(
          input.organizationId,
          new Set([routeId]),
          input.memberIds,
        );
        break;
      case 'FinanceController':
        await this.addGymIdsForRecords(
          this.prisma.cashSession,
          input.organizationId,
          new Set([routeId]),
          input.requestedGymIds,
        );
        break;
    }
  }

  private async addBodyObjectReferences(input: {
    organizationId: string;
    body: Record<string, unknown>;
    requestedGymIds: Set<string>;
    memberIds: Set<string>;
    productIds: Set<string>;
  }) {
    const saleIds = new Set<string>();
    this.addString(saleIds, input.body.saleId);
    this.addStrings(saleIds, input.body.saleIds);
    await this.addSaleReferences(
      input.organizationId,
      saleIds,
      input.requestedGymIds,
      input.memberIds,
    );

    const subscriptionIds = new Set<string>();
    this.addString(subscriptionIds, input.body.subscriptionId);
    this.addStrings(subscriptionIds, input.body.subscriptionIds);
    await this.addSubscriptionReferences(
      input.organizationId,
      subscriptionIds,
      input.memberIds,
    );
  }

  private async addGymIdsForRecords(
    model: {
      findMany: (
        args: unknown,
      ) => Promise<Array<{ id: string; gymId: string | null }>>;
    },
    organizationId: string,
    ids: Set<string>,
    requestedGymIds: Set<string>,
  ) {
    if (!ids.size) return;

    const records = await model.findMany({
      where: { organizationId, id: { in: [...ids] } },
      select: { id: true, gymId: true },
    });

    this.assertAllObjectsFound(ids, records);
    records.forEach((record) => this.addString(requestedGymIds, record.gymId));
  }

  private async addProductGymReferences(
    organizationId: string,
    productIds: Set<string>,
    requestedGymIds: Set<string>,
  ) {
    await this.addGymIdsForRecords(
      this.prisma.product,
      organizationId,
      productIds,
      requestedGymIds,
    );
  }

  private async addSaleReferences(
    organizationId: string,
    saleIds: Set<string>,
    requestedGymIds: Set<string>,
    memberIds: Set<string>,
  ) {
    if (!saleIds.size) return;

    const sales = await this.prisma.sale.findMany({
      where: { organizationId, id: { in: [...saleIds] } },
      select: { id: true, gymId: true, memberId: true },
    });

    this.assertAllObjectsFound(saleIds, sales);
    sales.forEach((sale) => {
      this.addString(requestedGymIds, sale.gymId);
      this.addString(memberIds, sale.memberId);
    });
  }

  private async addPaymentReferences(
    organizationId: string,
    paymentIds: Set<string>,
    requestedGymIds: Set<string>,
    memberIds: Set<string>,
  ) {
    if (!paymentIds.size) return;

    const payments = await this.prisma.payment.findMany({
      where: { organizationId, id: { in: [...paymentIds] } },
      select: {
        id: true,
        memberId: true,
        subscription: { select: { memberId: true } },
        sale: { select: { gymId: true, memberId: true } },
      },
    });

    this.assertAllObjectsFound(paymentIds, payments);
    payments.forEach((payment) => {
      this.addString(memberIds, payment.memberId);
      this.addString(memberIds, payment.subscription?.memberId);
      this.addString(requestedGymIds, payment.sale?.gymId);
      this.addString(memberIds, payment.sale?.memberId);
    });
  }

  private async addSubscriptionReferences(
    organizationId: string,
    subscriptionIds: Set<string>,
    memberIds: Set<string>,
  ) {
    if (!subscriptionIds.size) return;

    const subscriptions = await this.prisma.subscription.findMany({
      where: { organizationId, id: { in: [...subscriptionIds] } },
      select: { id: true, memberId: true },
    });

    this.assertAllObjectsFound(subscriptionIds, subscriptions);
    subscriptions.forEach((subscription) =>
      this.addString(memberIds, subscription.memberId),
    );
  }

  private async addMessageReferences(
    organizationId: string,
    messageIds: Set<string>,
    memberIds: Set<string>,
  ) {
    if (!messageIds.size) return;

    const messages = await this.prisma.message.findMany({
      where: { organizationId, id: { in: [...messageIds] } },
      select: {
        id: true,
        recipients: { select: { memberId: true } },
      },
    });

    this.assertAllObjectsFound(messageIds, messages);
    messages.forEach((message) => {
      message.recipients.forEach((recipient) =>
        this.addString(memberIds, recipient.memberId),
      );
    });
  }

  private assertAllObjectsFound(
    expectedIds: Set<string>,
    records: Array<{ id: string }>,
  ) {
    if (records.length !== expectedIds.size) {
      throw new ForbiddenException(FORBIDDEN_OBJECT_REFERENCE_MESSAGE);
    }
  }

  private productIdsFromBody(body?: Record<string, unknown>) {
    const productIds = new Set<string>();
    this.addString(productIds, body?.productId);
    this.addStrings(productIds, body?.productIds);

    if (Array.isArray(body?.items)) {
      body.items.forEach((item) => {
        if (item && typeof item === 'object') {
          this.addString(
            productIds,
            (item as Record<string, unknown>).productId,
          );
        }
      });
    }

    return productIds;
  }

  private stringValue(value: unknown) {
    return typeof value === 'string' && value.trim() ? value.trim() : undefined;
  }

  private addString(target: Set<string>, value: unknown) {
    if (typeof value === 'string' && value.trim()) target.add(value.trim());
  }

  private addStrings(target: Set<string>, value: unknown) {
    if (!Array.isArray(value)) return;
    value.forEach((item) => this.addString(target, item));
  }
}
