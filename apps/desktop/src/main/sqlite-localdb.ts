import { app } from "electron";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

type ClientPayload = Record<string, unknown> & {
  id: string;
  remoteId?: string;
  gymId?: string;
  name?: string;
  email?: string;
  phone?: string;
  document?: string;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
};

type SyncOperation = "create" | "update" | "delete";

type ClientRow = {
  id: string;
  payload: string;
};

export type SyncQueueEvent = {
  id: string;
  entity: string;
  entityId: string;
  operation: SyncOperation;
  payload: ClientPayload;
  attempts: number;
};

type SyncQueueRow = {
  id: string;
  entity: string;
  entity_id: string;
  operation: SyncOperation;
  payload: string;
  attempts: number;
};

export type SyncConflictResolution = "keep_local" | "use_remote";

export type SyncConflict = {
  id: string;
  eventId?: string;
  entity: string;
  entityId: string;
  remoteId?: string;
  operation: SyncOperation;
  localPayload: Record<string, unknown>;
  remotePayload?: Record<string, unknown> | null;
  status: "open" | "resolved";
  resolution?: SyncConflictResolution;
  error?: string;
  createdAt: string;
  resolvedAt?: string;
};

type SyncConflictRow = {
  id: string;
  event_id: string | null;
  entity: string;
  entity_id: string;
  remote_id: string | null;
  operation: SyncOperation;
  local_payload: string;
  remote_payload: string | null;
  status: "open" | "resolved";
  resolution: SyncConflictResolution | null;
  error: string | null;
  created_at: string;
  resolved_at: string | null;
};

type DesktopBindingPayload = {
  apiUrl?: string;
  organization?: Record<string, unknown> | null;
  gyms?: Array<Record<string, unknown>>;
  users?: Array<Record<string, unknown>>;
  user?: {
    id?: string;
    name?: string;
    email?: string;
    role?: string;
    organizationId?: string;
    organizationName?: string;
    gyms?: Array<{ id?: string; name?: string }>;
  };
  activeGymId?: string;
  linkedAt?: string;
  lastBootstrapAt?: string;
};

type DesktopBindingRow = {
  api_url: string | null;
  organization_id: string | null;
  organization_name: string | null;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  user_role: string | null;
  active_gym_id: string | null;
  active_gym_name: string | null;
  organization_payload: string | null;
  gyms_payload: string;
  users_payload: string;
  linked_at: string;
  last_bootstrap_at: string | null;
  updated_at: string;
};

type LocalCollectionRow = {
  payload: string;
};

type TombstoneRow = {
  entity_id: string;
};

const COLLECTION_ENTITY_BY_KEY: Record<string, string> = {
  "noogym:plans": "plans",
  "noogym:plan-category-details": "plan-categories",
  "noogym:products": "products",
  "noogym:sales": "sales",
  "noogym:checkins": "checkins",
  "noogym:classes": "classes",
  "noogym:employees": "employees",
  "noogym:finance": "finance-records",
  "noogym:finance-categories": "finance-categories",
  "noogym:finance-accounts": "finance-accounts",
  "noogym:workouts": "workouts",
  "noogym:operational-settings": "operational-settings"
};

const COLLECTION_KEY_BY_ENTITY = Object.fromEntries(
  Object.entries(COLLECTION_ENTITY_BY_KEY).map(([key, entity]) => [entity, key])
) as Record<string, string>;

export type DesktopBinding = {
  apiUrl?: string;
  organizationId?: string;
  organizationName?: string;
  userId?: string;
  userEmail?: string;
  userName?: string;
  userRole?: string;
  activeGymId?: string;
  activeGymName?: string;
  organization?: Record<string, unknown> | null;
  gyms: Array<Record<string, unknown>>;
  users: Array<Record<string, unknown>>;
  linkedAt: string;
  lastBootstrapAt?: string;
  updatedAt: string;
};

const nowIso = () => new Date().toISOString();

const normalizeText = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim() : null;

const normalizeEmail = (value: unknown) =>
  typeof value === "string" && value.trim() ? value.trim().toLowerCase() : null;

const normalizeDigits = (value: unknown) =>
  typeof value === "string" && value.replace(/\D/g, "") ? value.replace(/\D/g, "") : null;

const normalizeDocument = (value: unknown) =>
  typeof value === "string" && value.replace(/[^a-z0-9]/gi, "")
    ? value.replace(/[^a-z0-9]/gi, "").toUpperCase()
    : null;

export class SQLiteLocalDb {
  private readonly db: Database.Database;

  constructor() {
    const dbDirectory = path.join(app.getPath("userData"), "data");
    mkdirSync(dbDirectory, { recursive: true });
    this.db = new Database(path.join(dbDirectory, "noogym-desktop.db"));
    this.db.pragma("journal_mode = WAL");
    this.db.pragma("foreign_keys = ON");
    this.migrate();
  }

  listClients() {
    return this.db
      .prepare("SELECT payload FROM clients WHERE deleted_at IS NULL ORDER BY datetime(updated_at) DESC")
      .all()
      .map((row) => JSON.parse((row as ClientRow).payload) as ClientPayload);
  }

  replaceClients(clients: ClientPayload[]) {
    const transaction = this.db.transaction((records: ClientPayload[]) => {
      this.db.prepare("DELETE FROM clients").run();
      records.forEach((client) => this.upsertClientRecord(client));
    });

    transaction(clients);
    return this.listClients();
  }

  upsertClient(client: ClientPayload, operation: SyncOperation = "update") {
    const saved = this.upsertClientRecord(client);
    this.enqueue("clients", saved.id, operation, saved);
    return saved;
  }

  upsertRemoteClient(client: ClientPayload) {
    return this.upsertClientRecord(client, "synced");
  }

  getPendingSyncEvents(limit = 50): SyncQueueEvent[] {
    return this.db
      .prepare(
        `
          SELECT id, entity, entity_id, operation, payload, attempts
          FROM sync_queue
          WHERE status = 'pending'
          ORDER BY datetime(created_at) ASC
          LIMIT @limit
        `
      )
      .all({ limit })
      .map((row) => {
        const event = row as SyncQueueRow;
        return {
          id: event.id,
          entity: event.entity,
          entityId: event.entity_id,
          operation: event.operation,
          payload: JSON.parse(event.payload) as ClientPayload,
          attempts: event.attempts
        };
      });
  }

  getPendingSyncCount() {
    const row = this.db.prepare("SELECT COUNT(*) AS total FROM sync_queue WHERE status = 'pending'").get() as { total: number };
    return row.total;
  }

  getFailedSyncCount() {
    const row = this.db.prepare("SELECT COUNT(*) AS total FROM sync_queue WHERE status = 'failed'").get() as { total: number };
    return row.total;
  }

  getOpenSyncConflictCount() {
    const row = this.db.prepare("SELECT COUNT(*) AS total FROM sync_conflicts WHERE status = 'open'").get() as { total: number };
    return row.total;
  }

  hasPendingSyncEvent(entity: string, entityId: string) {
    const row = this.db
      .prepare("SELECT COUNT(*) AS total FROM sync_queue WHERE status IN ('pending', 'failed', 'conflict') AND entity = @entity AND entity_id = @entityId")
      .get({ entity, entityId }) as { total: number };
    return row.total > 0;
  }

  getDatabasePath() {
    return this.db.name;
  }

  getLocalCollection(key: string) {
    const row = this.db
      .prepare("SELECT payload FROM local_collections WHERE key = @key LIMIT 1")
      .get({ key }) as LocalCollectionRow | undefined;

    return row ? parseJson<unknown>(row.payload, null) : undefined;
  }

  setLocalCollection(key: string, value: unknown, options: { sync?: boolean } = {}) {
    const previous = this.getLocalCollection(key);
    const timestamp = nowIso();

    this.db
      .prepare(
        `
          INSERT INTO local_collections (key, payload, updated_at)
          VALUES (@key, @payload, @updatedAt)
          ON CONFLICT(key) DO UPDATE SET
            payload = excluded.payload,
            updated_at = excluded.updated_at
        `
      )
      .run({
        key,
        payload: JSON.stringify(value),
        updatedAt: timestamp
      });

    if (options.sync) {
      this.enqueueLocalCollectionChanges(key, previous, value);
    }

    return this.getLocalCollection(key);
  }

  removeLocalCollection(key: string) {
    this.db.prepare("DELETE FROM local_collections WHERE key = @key").run({ key });
  }

  markLocalEntitySynced(entity: string, localId: string, remoteId: string, remotePayload?: Record<string, unknown>) {
    const key = COLLECTION_KEY_BY_ENTITY[entity];
    if (!key) return;

    const collection = this.getLocalCollection(key);
    if (!Array.isArray(collection)) return;
    const remoteUpdatedAt = normalizeText(remotePayload?.updatedAt);

    const nextCollection = collection.map((item) => {
      if (!item || typeof item !== "object") return item;
      const record = item as Record<string, unknown>;
      if (String(record.id) !== localId) return item;
      return { ...record, remoteId, ...(remoteUpdatedAt ? { remoteUpdatedAt } : {}), syncStatus: "synced" };
    });

    this.setLocalCollection(key, nextCollection);
  }

  mergeRemoteCollection(entity: string, remoteItems: Array<Record<string, unknown>>) {
    const key = COLLECTION_KEY_BY_ENTITY[entity];
    if (!key) return 0;

    const collection = this.getLocalCollection(key);
    if (!Array.isArray(collection)) {
      const syncedItems = remoteItems.map((item) => withRemoteSyncMetadata(item));
      this.setLocalCollection(key, syncedItems);
      return syncedItems.length;
    }

    const existingRows = collection.filter(isRecordWithId);
    const tombstonedRemoteIds = this.getTombstonedRemoteIds(entity);
    const existingByRemoteId = new Map(
      existingRows
        .map((item) => [normalizeText(item.remoteId) ?? (isUuidLike(String(item.id)) ? String(item.id) : null), item] as const)
        .filter((entry): entry is readonly [string, Record<string, unknown> & { id: string }] => Boolean(entry[0]))
    );
    const remoteKeys = new Set<string>();
    const mergedById = new Map(existingRows.map((item) => [String(item.id), item as Record<string, unknown>]));

    remoteItems.forEach((item) => {
      const remoteId = normalizeText(item.remoteId) ?? normalizeText(item.id);
      if (remoteId && tombstonedRemoteIds.has(remoteId)) return;
      const match = remoteId ? existingByRemoteId.get(remoteId) : undefined;
      const localId = match ? String(match.id) : normalizeText(item.id) ?? randomUUID();
      remoteKeys.add(remoteId ?? localId);

      if (this.hasPendingSyncEvent(entity, localId)) return;

      mergedById.set(localId, {
        ...withRemoteSyncMetadata(item),
        id: localId,
        ...(remoteId ? { remoteId } : {})
      });
    });

    existingRows.forEach((item) => {
      const remoteId = normalizeText(item.remoteId) ?? (isUuidLike(String(item.id)) ? String(item.id) : null);
      if (!remoteId || remoteKeys.has(remoteId) || this.hasPendingSyncEvent(entity, String(item.id))) return;
      mergedById.delete(String(item.id));
    });

    const nextCollection = Array.from(mergedById.values());
    this.setLocalCollection(key, nextCollection);
    return remoteItems.length;
  }

  mergeRemoteObject(entity: string, remotePayload: Record<string, unknown>) {
    const key = COLLECTION_KEY_BY_ENTITY[entity];
    if (!key || this.hasPendingSyncEvent(entity, "default")) return false;

    this.setLocalCollection(key, withRemoteSyncMetadata(remotePayload));
    return true;
  }

  getDesktopBinding(): DesktopBinding | null {
    const row = this.db
      .prepare(
        `
          SELECT api_url, organization_id, organization_name, user_id, user_email, user_name,
            user_role, active_gym_id, active_gym_name, organization_payload, gyms_payload,
            users_payload, linked_at, last_bootstrap_at, updated_at
          FROM desktop_binding
          WHERE id = 'default'
          LIMIT 1
        `
      )
      .get() as DesktopBindingRow | undefined;

    if (!row) return null;

    return {
      apiUrl: row.api_url ?? undefined,
      organizationId: row.organization_id ?? undefined,
      organizationName: row.organization_name ?? undefined,
      userId: row.user_id ?? undefined,
      userEmail: row.user_email ?? undefined,
      userName: row.user_name ?? undefined,
      userRole: row.user_role ?? undefined,
      activeGymId: row.active_gym_id ?? undefined,
      activeGymName: row.active_gym_name ?? undefined,
      organization: parseJson<Record<string, unknown> | null>(row.organization_payload, null),
      gyms: parseJson<Array<Record<string, unknown>>>(row.gyms_payload, []),
      users: parseJson<Array<Record<string, unknown>>>(row.users_payload, []),
      linkedAt: row.linked_at,
      lastBootstrapAt: row.last_bootstrap_at ?? undefined,
      updatedAt: row.updated_at
    };
  }

  saveDesktopBinding(payload: DesktopBindingPayload) {
    const existing = this.getDesktopBinding();
    const timestamp = nowIso();
    const organization = payload.organization ?? existing?.organization ?? null;
    const gyms = payload.gyms ?? existing?.gyms ?? [];
    const users = payload.users ?? existing?.users ?? [];
    const userGyms = payload.user?.gyms?.filter((gym) => normalizeText(gym.id) || normalizeText(gym.name)) ?? [];
    const gymOptions = [
      ...gyms.map((gym) => ({
        id: normalizeText(gym.id),
        name: normalizeText(gym.name)
      })),
      ...userGyms.map((gym) => ({
        id: normalizeText(gym.id),
        name: normalizeText(gym.name)
      }))
    ];
    const activeGym =
      gymOptions.find((gym) => gym.id && gym.id === payload.activeGymId) ??
      gymOptions.find((gym) => gym.id && gym.id === existing?.activeGymId) ??
      gymOptions.find((gym) => gym.id);
    const activeGymId = normalizeText(payload.activeGymId) ?? activeGym?.id ?? existing?.activeGymId ?? null;
    const activeGymName =
      activeGym?.name ??
      gymOptions.find((gym) => gym.id && gym.id === activeGymId)?.name ??
      existing?.activeGymName ??
      null;
    const organizationId =
      normalizeText(organization?.id) ??
      normalizeText(payload.user?.organizationId) ??
      existing?.organizationId ??
      null;
    const organizationName =
      normalizeText(organization?.name) ??
      normalizeText(payload.user?.organizationName) ??
      existing?.organizationName ??
      null;

    this.db
      .prepare(
        `
          INSERT INTO desktop_binding (
            id, api_url, organization_id, organization_name, user_id, user_email, user_name,
            user_role, active_gym_id, active_gym_name, organization_payload, gyms_payload,
            users_payload, linked_at, last_bootstrap_at, updated_at
          )
          VALUES (
            'default', @apiUrl, @organizationId, @organizationName, @userId, @userEmail, @userName,
            @userRole, @activeGymId, @activeGymName, @organizationPayload, @gymsPayload,
            @usersPayload, @linkedAt, @lastBootstrapAt, @updatedAt
          )
          ON CONFLICT(id) DO UPDATE SET
            api_url = COALESCE(excluded.api_url, desktop_binding.api_url),
            organization_id = COALESCE(excluded.organization_id, desktop_binding.organization_id),
            organization_name = COALESCE(excluded.organization_name, desktop_binding.organization_name),
            user_id = COALESCE(excluded.user_id, desktop_binding.user_id),
            user_email = COALESCE(excluded.user_email, desktop_binding.user_email),
            user_name = COALESCE(excluded.user_name, desktop_binding.user_name),
            user_role = COALESCE(excluded.user_role, desktop_binding.user_role),
            active_gym_id = COALESCE(excluded.active_gym_id, desktop_binding.active_gym_id),
            active_gym_name = COALESCE(excluded.active_gym_name, desktop_binding.active_gym_name),
            organization_payload = COALESCE(excluded.organization_payload, desktop_binding.organization_payload),
            gyms_payload = excluded.gyms_payload,
            users_payload = excluded.users_payload,
            last_bootstrap_at = COALESCE(excluded.last_bootstrap_at, desktop_binding.last_bootstrap_at),
            updated_at = excluded.updated_at
        `
      )
      .run({
        apiUrl: normalizeText(payload.apiUrl) ?? existing?.apiUrl ?? null,
        organizationId,
        organizationName,
        userId: normalizeText(payload.user?.id) ?? existing?.userId ?? null,
        userEmail: normalizeEmail(payload.user?.email) ?? existing?.userEmail ?? null,
        userName: normalizeText(payload.user?.name) ?? existing?.userName ?? null,
        userRole: normalizeText(payload.user?.role) ?? existing?.userRole ?? null,
        activeGymId,
        activeGymName,
        organizationPayload: organization ? JSON.stringify(organization) : existing?.organization ? JSON.stringify(existing.organization) : null,
        gymsPayload: JSON.stringify(gyms.length ? gyms : existing?.gyms ?? []),
        usersPayload: JSON.stringify(users.length ? users : existing?.users ?? []),
        linkedAt: payload.linkedAt ?? existing?.linkedAt ?? timestamp,
        lastBootstrapAt: payload.lastBootstrapAt ?? existing?.lastBootstrapAt ?? null,
        updatedAt: timestamp
      });

    return this.getDesktopBinding();
  }

  clearDesktopBinding() {
    this.db.prepare("DELETE FROM desktop_binding WHERE id = 'default'").run();
  }

  findClientByRemoteId(remoteId: string) {
    const row = this.db
      .prepare("SELECT id, payload FROM clients WHERE remote_id = @remoteId AND deleted_at IS NULL LIMIT 1")
      .get({ remoteId }) as ClientRow | undefined;

    return row ? (JSON.parse(row.payload) as ClientPayload) : null;
  }

  markSyncEventSynced(eventId: string) {
    const event = this.getSyncEventMeta(eventId);
    this.db
      .prepare("UPDATE sync_queue SET status = 'synced', error = NULL, updated_at = @updatedAt WHERE id = @id")
      .run({ id: eventId, updatedAt: nowIso() });
    if (event?.operation === "delete") this.clearTombstone(event.entity, event.entity_id);
  }

  markSyncEventConflict(eventId: string, error: string) {
    this.db
      .prepare("UPDATE sync_queue SET status = 'conflict', error = @error, updated_at = @updatedAt WHERE id = @id")
      .run({ id: eventId, error: error.slice(0, 500), updatedAt: nowIso() });
  }

  markSyncEventFailed(eventId: string, error: string, attempts: number) {
    const nextAttempts = attempts + 1;
    const status = nextAttempts >= 3 ? "failed" : "pending";

    this.db
      .prepare(
        `
          UPDATE sync_queue
          SET status = @status, attempts = @attempts, error = @error, updated_at = @updatedAt
          WHERE id = @id
        `
      )
      .run({
        id: eventId,
        status,
        attempts: nextAttempts,
        error: error.slice(0, 500),
        updatedAt: nowIso()
      });
  }

  markClientSynced(localId: string, remoteId: string, payload: ClientPayload) {
    const saved = this.upsertClientRecord({ ...payload, id: localId, remoteId }, "synced");
    this.db
      .prepare("UPDATE clients SET remote_id = @remoteId, sync_status = 'synced', updated_at = @updatedAt WHERE id = @id")
      .run({ id: localId, remoteId, updatedAt: nowIso() });
    return saved;
  }

  listSyncConflicts(status: "open" | "resolved" = "open") {
    return this.db
      .prepare(
        `
          SELECT id, event_id, entity, entity_id, remote_id, operation, local_payload,
            remote_payload, status, resolution, error, created_at, resolved_at
          FROM sync_conflicts
          WHERE status = @status
          ORDER BY datetime(created_at) DESC
        `
      )
      .all({ status })
      .map((row) => parseSyncConflictRow(row as SyncConflictRow));
  }

  createSyncConflict(input: {
    eventId: string;
    entity: string;
    entityId: string;
    remoteId?: string;
    operation: SyncOperation;
    localPayload: Record<string, unknown>;
    remotePayload?: Record<string, unknown> | null;
    error?: string;
  }) {
    const timestamp = nowIso();
    const existing = this.db
      .prepare(
        `
          SELECT id
          FROM sync_conflicts
          WHERE status = 'open'
            AND (event_id = @eventId OR (entity = @entity AND entity_id = @entityId))
          LIMIT 1
        `
      )
      .get({ eventId: input.eventId, entity: input.entity, entityId: input.entityId }) as { id: string } | undefined;

    if (existing) {
      this.db
        .prepare(
          `
            UPDATE sync_conflicts
            SET event_id = @eventId,
              remote_id = @remoteId,
              operation = @operation,
              local_payload = @localPayload,
              remote_payload = @remotePayload,
              error = @error
            WHERE id = @id
          `
        )
        .run({
          id: existing.id,
          eventId: input.eventId,
          remoteId: input.remoteId ?? null,
          operation: input.operation,
          localPayload: JSON.stringify(input.localPayload),
          remotePayload: input.remotePayload ? JSON.stringify(input.remotePayload) : null,
          error: input.error ?? null
        });
      return this.getSyncConflict(existing.id);
    }

    const id = randomUUID();
    this.db
      .prepare(
        `
          INSERT INTO sync_conflicts (
            id, event_id, entity, entity_id, remote_id, operation, local_payload,
            remote_payload, status, resolution, error, created_at, resolved_at
          )
          VALUES (
            @id, @eventId, @entity, @entityId, @remoteId, @operation, @localPayload,
            @remotePayload, 'open', NULL, @error, @createdAt, NULL
          )
        `
      )
      .run({
        id,
        eventId: input.eventId,
        entity: input.entity,
        entityId: input.entityId,
        remoteId: input.remoteId ?? null,
        operation: input.operation,
        localPayload: JSON.stringify(input.localPayload),
        remotePayload: input.remotePayload ? JSON.stringify(input.remotePayload) : null,
        error: input.error ?? null,
        createdAt: timestamp
      });

    return this.getSyncConflict(id);
  }

  getSyncConflict(id: string) {
    const row = this.db
      .prepare(
        `
          SELECT id, event_id, entity, entity_id, remote_id, operation, local_payload,
            remote_payload, status, resolution, error, created_at, resolved_at
          FROM sync_conflicts
          WHERE id = @id
          LIMIT 1
        `
      )
      .get({ id }) as SyncConflictRow | undefined;

    return row ? parseSyncConflictRow(row) : null;
  }

  resolveSyncConflict(id: string, resolution: SyncConflictResolution) {
    const conflict = this.getSyncConflict(id);
    if (!conflict || conflict.status !== "open") return conflict;

    const timestamp = nowIso();
    const transaction = this.db.transaction(() => {
      if (conflict.eventId && resolution === "keep_local") {
        this.db
          .prepare(
            `
              UPDATE sync_queue
              SET status = 'pending',
                attempts = 0,
                error = NULL,
                payload = @payload,
                updated_at = @updatedAt
              WHERE id = @id
            `
          )
          .run({
            id: conflict.eventId,
            payload: JSON.stringify({ ...conflict.localPayload, __forceSync: true }),
            updatedAt: timestamp
          });
      }

      if (conflict.eventId && resolution === "use_remote") {
        this.applyRemoteConflictPayload(conflict);
        this.markSyncEventSynced(conflict.eventId);
      }

      this.db
        .prepare(
          `
            UPDATE sync_conflicts
            SET status = 'resolved',
              resolution = @resolution,
              resolved_at = @resolvedAt
            WHERE id = @id
          `
        )
        .run({ id, resolution, resolvedAt: timestamp });
    });

    transaction();
    return this.getSyncConflict(id);
  }

  private applyRemoteConflictPayload(conflict: SyncConflict) {
    if (!conflict.remotePayload) return;

    const remoteId = normalizeText(conflict.remotePayload.remoteId) ?? conflict.remoteId;
    const payload = withRemoteSyncMetadata({
      ...conflict.remotePayload,
      id: conflict.entityId,
      ...(remoteId ? { remoteId } : {})
    }) as Record<string, unknown> & { id: string };

    if (conflict.entity === "clients") {
      this.markClientSynced(conflict.entityId, remoteId ?? conflict.entityId, payload as unknown as ClientPayload);
      return;
    }

    const key = COLLECTION_KEY_BY_ENTITY[conflict.entity];
    if (!key) return;

    const collection = this.getLocalCollection(key);
    if (!Array.isArray(collection)) {
      this.setLocalCollection(key, payload);
      return;
    }

    const found = collection.some((item) => {
      if (!item || typeof item !== "object") return false;
      const record = item as Record<string, unknown>;
      return String(record.id) === conflict.entityId || Boolean(remoteId && normalizeText(record.remoteId) === remoteId);
    });
    const nextCollection = found
      ? collection.map((item) => {
          if (!item || typeof item !== "object") return item;
          const record = item as Record<string, unknown>;
          const matches = String(record.id) === conflict.entityId || Boolean(remoteId && normalizeText(record.remoteId) === remoteId);
          return matches ? payload : item;
        })
      : [payload, ...collection];

    this.setLocalCollection(key, nextCollection);
  }

  private upsertClientRecord(client: ClientPayload, syncStatus: "pending" | "synced" = "pending") {
    const id = normalizeText(client.id) ?? randomUUID();
    const remoteId = normalizeText(client.remoteId);
    const existing = remoteId ? this.findClientByRemoteId(remoteId) : null;
    const identityMatch = existing ? null : this.findClientByIdentity(client);
    const matchedId = existing?.id ?? identityMatch?.id ?? id;
    const timestamp = nowIso();
    const payload: ClientPayload = {
      ...client,
      id: matchedId,
      ...(remoteId ? { remoteId } : {}),
      createdAt: normalizeText(client.createdAt) ?? normalizeText(identityMatch?.createdAt) ?? timestamp,
      updatedAt: normalizeText(client.updatedAt) ?? timestamp
    };

    this.db
      .prepare(`
        INSERT INTO clients (
          id, remote_id, gym_id, name, email, phone, phone_normalized, document_number,
          document_normalized, status, payload, sync_status, created_at, updated_at
        )
        VALUES (
          @id, @remoteId, @gymId, @name, @email, @phone, @phoneNormalized, @documentNumber,
          @documentNormalized, @status, @payload, @syncStatus, @createdAt, @updatedAt
        )
        ON CONFLICT(id) DO UPDATE SET
          remote_id = COALESCE(excluded.remote_id, clients.remote_id),
          gym_id = excluded.gym_id,
          name = excluded.name,
          email = excluded.email,
          phone = excluded.phone,
          phone_normalized = excluded.phone_normalized,
          document_number = excluded.document_number,
          document_normalized = excluded.document_normalized,
          status = excluded.status,
          payload = excluded.payload,
          sync_status = excluded.sync_status,
          updated_at = excluded.updated_at,
          deleted_at = NULL
      `)
      .run({
        id: matchedId,
        remoteId,
        gymId: normalizeText(payload.gymId),
        name: normalizeText(payload.name),
        email: normalizeEmail(payload.email),
        phone: normalizeText(payload.phone),
        phoneNormalized: normalizeDigits(payload.phone),
        documentNumber: normalizeText(payload.document),
        documentNormalized: normalizeDocument(payload.document),
        status: normalizeText(payload.status),
        payload: JSON.stringify(payload),
        syncStatus,
        createdAt: payload.createdAt,
        updatedAt: payload.updatedAt
      });

    return payload;
  }

  private findClientByIdentity(client: ClientPayload) {
    const email = normalizeEmail(client.email);
    const phoneNormalized = normalizeDigits(client.phone);
    const documentNormalized = normalizeDocument(client.document);

    if (!email && !phoneNormalized && !documentNormalized) return null;

    const row = this.db
      .prepare(
        `
          SELECT id, payload
          FROM clients
          WHERE deleted_at IS NULL
            AND (
              (@email IS NOT NULL AND email = @email)
              OR (@phoneNormalized IS NOT NULL AND phone_normalized = @phoneNormalized)
              OR (@documentNormalized IS NOT NULL AND document_normalized = @documentNormalized)
            )
          LIMIT 1
        `
      )
      .get({ email, phoneNormalized, documentNormalized }) as ClientRow | undefined;

    return row ? (JSON.parse(row.payload) as ClientPayload) : null;
  }

  private enqueue(entity: string, entityId: string, operation: SyncOperation, payload: unknown) {
    const timestamp = nowIso();
    this.db
      .prepare(`
        INSERT INTO sync_queue (id, entity, entity_id, operation, payload, status, attempts, created_at, updated_at)
        VALUES (@id, @entity, @entityId, @operation, @payload, 'pending', 0, @createdAt, @updatedAt)
      `)
      .run({
        id: randomUUID(),
        entity,
        entityId,
        operation,
        payload: JSON.stringify(payload),
        createdAt: timestamp,
        updatedAt: timestamp
      });

    if (operation === "delete") {
      const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
      this.createTombstone(entity, entityId, normalizeText(record.remoteId) ?? (isUuidLike(entityId) ? entityId : null));
    }
  }

  private getSyncEventMeta(eventId: string) {
    return this.db
      .prepare("SELECT entity, entity_id, operation FROM sync_queue WHERE id = @id LIMIT 1")
      .get({ id: eventId }) as { entity: string; entity_id: string; operation: SyncOperation } | undefined;
  }

  private createTombstone(entity: string, entityId: string, remoteId: string | null) {
    this.db
      .prepare(
        `
          INSERT INTO local_tombstones (entity, entity_id, remote_id, created_at)
          VALUES (@entity, @entityId, @remoteId, @createdAt)
          ON CONFLICT(entity, entity_id) DO UPDATE SET
            remote_id = COALESCE(excluded.remote_id, local_tombstones.remote_id),
            created_at = excluded.created_at
        `
      )
      .run({ entity, entityId, remoteId, createdAt: nowIso() });
  }

  private clearTombstone(entity: string, entityId: string) {
    this.db
      .prepare("DELETE FROM local_tombstones WHERE entity = @entity AND entity_id = @entityId")
      .run({ entity, entityId });
  }

  private getTombstonedRemoteIds(entity: string) {
    return new Set(
      this.db
        .prepare("SELECT entity_id, remote_id FROM local_tombstones WHERE entity = @entity")
        .all({ entity })
        .map((row) => {
          const tombstone = row as TombstoneRow & { remote_id: string | null };
          return tombstone.remote_id ?? (isUuidLike(tombstone.entity_id) ? tombstone.entity_id : null);
        })
        .filter((value): value is string => Boolean(value))
    );
  }

  private enqueueLocalCollectionChanges(key: string, previous: unknown, next: unknown) {
    const entity = COLLECTION_ENTITY_BY_KEY[key];
    if (!entity) return;

    if (Array.isArray(next)) {
      const previousRows = Array.isArray(previous) ? previous.filter(isRecordWithId) : [];
      const nextRows = next.filter(isRecordWithId);
      const previousById = new Map(previousRows.map((row) => [String(row.id), row]));
      const nextById = new Map(nextRows.map((row) => [String(row.id), row]));

      nextRows.forEach((row) => {
        const id = String(row.id);
        const oldRow = previousById.get(id);
        if (!oldRow) {
          this.enqueue(entity, id, "create", row);
          return;
        }

        if (JSON.stringify(oldRow) !== JSON.stringify(row)) {
          this.enqueue(entity, id, "update", {
            ...row,
            __syncBaseUpdatedAt: normalizeText(oldRow.remoteUpdatedAt) ?? normalizeText(oldRow.updatedAt)
          });
        }
      });

      previousRows.forEach((row) => {
        const id = String(row.id);
        if (!nextById.has(id)) this.enqueue(entity, id, "delete", row);
      });
      return;
    }

    if (next && typeof next === "object" && JSON.stringify(previous ?? null) !== JSON.stringify(next)) {
      this.enqueue(entity, "default", "update", next);
    }
  }

  private migrate() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS clients (
        id TEXT PRIMARY KEY,
        remote_id TEXT,
        gym_id TEXT,
        name TEXT,
        email TEXT,
        phone TEXT,
        phone_normalized TEXT,
        document_number TEXT,
        document_normalized TEXT,
        status TEXT,
        payload TEXT NOT NULL,
        sync_status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      );

      CREATE UNIQUE INDEX IF NOT EXISTS clients_email_unique
        ON clients(email)
        WHERE email IS NOT NULL AND deleted_at IS NULL;

      CREATE UNIQUE INDEX IF NOT EXISTS clients_phone_unique
        ON clients(phone_normalized)
        WHERE phone_normalized IS NOT NULL AND deleted_at IS NULL;

      CREATE UNIQUE INDEX IF NOT EXISTS clients_document_unique
        ON clients(document_normalized)
        WHERE document_normalized IS NOT NULL AND deleted_at IS NULL;

      CREATE INDEX IF NOT EXISTS clients_remote_id_idx
        ON clients(remote_id);

      CREATE TABLE IF NOT EXISTS sync_queue (
        id TEXT PRIMARY KEY,
        entity TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        operation TEXT NOT NULL,
        payload TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending',
        attempts INTEGER NOT NULL DEFAULT 0,
        error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS sync_queue_status_created_at_idx
        ON sync_queue(status, created_at);

      CREATE TABLE IF NOT EXISTS sync_conflicts (
        id TEXT PRIMARY KEY,
        event_id TEXT,
        entity TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        remote_id TEXT,
        operation TEXT NOT NULL,
        local_payload TEXT NOT NULL,
        remote_payload TEXT,
        status TEXT NOT NULL DEFAULT 'open',
        resolution TEXT,
        error TEXT,
        created_at TEXT NOT NULL,
        resolved_at TEXT
      );

      CREATE INDEX IF NOT EXISTS sync_conflicts_status_created_at_idx
        ON sync_conflicts(status, created_at);

      CREATE INDEX IF NOT EXISTS sync_conflicts_event_id_idx
        ON sync_conflicts(event_id);

      CREATE TABLE IF NOT EXISTS local_tombstones (
        entity TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        remote_id TEXT,
        created_at TEXT NOT NULL,
        PRIMARY KEY(entity, entity_id)
      );

      CREATE INDEX IF NOT EXISTS local_tombstones_entity_remote_id_idx
        ON local_tombstones(entity, remote_id);

      CREATE TABLE IF NOT EXISTS local_collections (
        key TEXT PRIMARY KEY,
        payload TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS desktop_binding (
        id TEXT PRIMARY KEY CHECK (id = 'default'),
        api_url TEXT,
        organization_id TEXT,
        organization_name TEXT,
        user_id TEXT,
        user_email TEXT,
        user_name TEXT,
        user_role TEXT,
        active_gym_id TEXT,
        active_gym_name TEXT,
        organization_payload TEXT,
        gyms_payload TEXT NOT NULL DEFAULT '[]',
        users_payload TEXT NOT NULL DEFAULT '[]',
        linked_at TEXT NOT NULL,
        last_bootstrap_at TEXT,
        updated_at TEXT NOT NULL
      );
    `);
  }
}

function parseJson<T>(value: string | null, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function parseSyncConflictRow(row: SyncConflictRow): SyncConflict {
  return {
    id: row.id,
    eventId: row.event_id ?? undefined,
    entity: row.entity,
    entityId: row.entity_id,
    remoteId: row.remote_id ?? undefined,
    operation: row.operation,
    localPayload: parseJson<Record<string, unknown>>(row.local_payload, {}),
    remotePayload: parseJson<Record<string, unknown> | null>(row.remote_payload, null),
    status: row.status,
    resolution: row.resolution ?? undefined,
    error: row.error ?? undefined,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at ?? undefined
  };
}

function isRecordWithId(value: unknown): value is Record<string, unknown> & { id: string } {
  return Boolean(value && typeof value === "object" && normalizeText((value as Record<string, unknown>).id));
}

function withRemoteSyncMetadata<T extends Record<string, unknown>>(item: T): T & { remoteId?: string; remoteUpdatedAt?: string; syncStatus: string } {
  const remoteId = normalizeText(item.remoteId) ?? normalizeText(item.id);
  const updatedAt = normalizeText(item.updatedAt);
  return {
    ...item,
    ...(remoteId ? { remoteId } : {}),
    ...(updatedAt ? { remoteUpdatedAt: updatedAt } : {}),
    syncStatus: "synced"
  };
}

function isUuidLike(value?: string) {
  return Boolean(value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value));
}

let localDb: SQLiteLocalDb | undefined;

export function getSQLiteLocalDb() {
  localDb ??= new SQLiteLocalDb();
  return localDb;
}
