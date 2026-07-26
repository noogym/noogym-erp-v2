type GymScopedRecord = object;

export const belongsToGym = (record: GymScopedRecord, gymId?: string | null) => {
  if (!gymId) return true;

  const source = record as Record<string, unknown>;
  const recordGymId = text(source.gymId);
  if (recordGymId) return recordGymId === gymId;

  const gymIds = Array.isArray(source.gymIds)
    ? source.gymIds.map(text).filter(Boolean)
    : [];
  if (gymIds.length) return gymIds.includes(gymId);

  return true;
};

export const scopeByGym = <T extends GymScopedRecord>(
  records: T[],
  gymId?: string | null,
) => records.filter((record) => belongsToGym(record, gymId));

const text = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : undefined;
