import { create } from "zustand";
import { readLocal, uid, writeLocal } from "../lib/storage";
import type { RouteId } from "./appStore";

export type NotificationTone = "info" | "success" | "warning" | "danger";
export type NotificationCategory = "system" | "clients" | "finance" | "products" | "classes" | "checkins" | "sales";

export interface NotificationRecord {
  id: string;
  title: string;
  description: string;
  category: NotificationCategory;
  tone: NotificationTone;
  createdAt: string;
  readAt?: string;
  route?: RouteId;
  actionLabel?: string;
  actionType?: "sync";
  sourceId?: string;
  automatic?: boolean;
}

export type NotificationInput = Omit<NotificationRecord, "id" | "createdAt" | "readAt"> & {
  createdAt?: string;
};

interface NotificationsState {
  notifications: NotificationRecord[];
  addNotification: (notification: NotificationInput) => void;
  upsertNotification: (notification: NotificationInput) => void;
  replaceAutomaticNotifications: (notifications: NotificationInput[]) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  clearRead: () => void;
}

const STORAGE_KEY = "noogym:notifications";
const MAX_NOTIFICATIONS = 80;

const persist = (notifications: NotificationRecord[]) => writeLocal(STORAGE_KEY, notifications);
const nowIso = () => new Date().toISOString();

const toRecord = (notification: NotificationInput, current?: NotificationRecord): NotificationRecord => ({
  id: current?.id ?? notification.sourceId ?? uid("NOT"),
  title: notification.title,
  description: notification.description,
  category: notification.category,
  tone: notification.tone,
  createdAt: current?.createdAt ?? notification.createdAt ?? nowIso(),
  readAt: current?.readAt,
  route: notification.route,
  actionLabel: notification.actionLabel,
  actionType: notification.actionType,
  sourceId: notification.sourceId,
  automatic: notification.automatic
});

const sortNotifications = (notifications: NotificationRecord[]) =>
  notifications
    .slice()
    .sort((a, b) => {
      if (!a.readAt && b.readAt) return -1;
      if (a.readAt && !b.readAt) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    .slice(0, MAX_NOTIFICATIONS);

export const useNotificationsStore = create<NotificationsState>((set, get) => ({
  notifications: readLocal(STORAGE_KEY, [] as NotificationRecord[]),
  addNotification: (notification) =>
    set((state) => {
      const existing = notification.sourceId ? state.notifications.find((item) => item.sourceId === notification.sourceId) : undefined;
      const notifications = existing
        ? state.notifications.map((item) => item.id === existing.id ? toRecord(notification, { ...existing, readAt: undefined, createdAt: notification.createdAt ?? nowIso() }) : item)
        : [toRecord(notification), ...state.notifications];
      const next = sortNotifications(notifications);
      persist(next);
      return { notifications: next };
    }),
  upsertNotification: (notification) =>
    set((state) => {
      const existing = notification.sourceId ? state.notifications.find((item) => item.sourceId === notification.sourceId) : undefined;
      const notifications = existing
        ? state.notifications.map((item) => item.id === existing.id ? toRecord(notification, existing) : item)
        : [toRecord(notification), ...state.notifications];
      const next = sortNotifications(notifications);
      persist(next);
      return { notifications: next };
    }),
  replaceAutomaticNotifications: (automaticNotifications) =>
    set((state) => {
      const manual = state.notifications.filter((item) => !item.automatic);
      const previousAutomatic = new Map(state.notifications.filter((item) => item.automatic).map((item) => [item.sourceId ?? item.id, item]));
      const automatic = automaticNotifications.map((notification) => {
        const previous = previousAutomatic.get(notification.sourceId ?? "");
        return toRecord({ ...notification, automatic: true }, previous);
      });
      const next = sortNotifications([...automatic, ...manual]);
      persist(next);
      return { notifications: next };
    }),
  markAsRead: (id) =>
    set((state) => {
      const readAt = nowIso();
      const notifications = state.notifications.map((item) => item.id === id ? { ...item, readAt: item.readAt ?? readAt } : item);
      persist(notifications);
      return { notifications };
    }),
  markAllAsRead: () => {
    const readAt = nowIso();
    const notifications = get().notifications.map((item) => ({ ...item, readAt: item.readAt ?? readAt }));
    persist(notifications);
    set({ notifications });
  },
  removeNotification: (id) =>
    set((state) => {
      const notifications = state.notifications.filter((item) => item.id !== id);
      persist(notifications);
      return { notifications };
    }),
  clearRead: () =>
    set((state) => {
      const notifications = state.notifications.filter((item) => !item.readAt);
      persist(notifications);
      return { notifications };
    })
}));
