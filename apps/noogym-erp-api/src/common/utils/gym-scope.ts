import { PaginationQueryDto } from '../dto/pagination-query.dto';

type IdFilter = string | { in: string[] };

function gymIdFilter(query: PaginationQueryDto): IdFilter | undefined {
  if (query.gymId) return query.gymId;
  if (query.scopeGymIds) return { in: query.scopeGymIds };
  return undefined;
}

export function directGymScope(query: PaginationQueryDto) {
  const filter = gymIdFilter(query);
  return filter ? { gymId: filter } : {};
}

export function gymIdScope(query: PaginationQueryDto) {
  const filter = gymIdFilter(query);
  return filter ? { id: filter } : {};
}

export function memberGymScope(query: PaginationQueryDto) {
  return directGymScope(query);
}

export function planGymScope(query: PaginationQueryDto) {
  if (query.gymId) {
    return {
      OR: [{ gyms: { none: {} } }, { gyms: { some: { gymId: query.gymId } } }],
    };
  }

  if (query.scopeGymIds) {
    return {
      OR: [
        { gyms: { none: {} } },
        { gyms: { some: { gymId: { in: query.scopeGymIds } } } },
      ],
    };
  }

  return {};
}

export function saleGymScope(query: PaginationQueryDto) {
  const filter = gymIdFilter(query);
  if (!filter) return {};

  return {
    OR: [{ gymId: filter }, { member: { gymId: filter } }],
  };
}

export function paymentGymScope(query: PaginationQueryDto) {
  const filter = gymIdFilter(query);
  if (!filter) return {};

  return {
    OR: [
      { member: { gymId: filter } },
      { subscription: { member: { gymId: filter } } },
      { sale: { gymId: filter } },
      { sale: { member: { gymId: filter } } },
    ],
  };
}

export function hasScope(where: Record<string, unknown>) {
  return Object.keys(where).length > 0;
}
