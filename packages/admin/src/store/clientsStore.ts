import { create } from "zustand";
import { clients as mockClients } from "../data/mock";
import {
  clientFromApi,
  clientToDto,
  createResource,
  createSubscription,
  listResource,
  clientQrPayload,
  regenerateMemberQr,
  updateResource,
} from "../lib/domainApi";
import {
  isApiDataSource,
  localCollection,
  resolveAdminDataSource,
} from "../lib/dataSource";
import {
  isDesktopLocalDbAvailable,
  listDesktopClients,
  replaceDesktopClients,
  upsertDesktopClient,
} from "../lib/desktopLocalDb";
import { scopeByGym } from "../lib/gymScope";
import { uid } from "../lib/storage";
import { useAppStore } from "./appStore";
import { useAuthStore } from "./authStore";
import { useNotificationsStore } from "./notificationsStore";
import type { ClientRecord } from "@noogym/types";

const seedClients = () =>
  mockClients.map((client) => ({
    ...client,
  })) as ClientRecord[];
const localClients = localCollection<ClientRecord[]>(
  "noogym:clients",
  seedClients,
);
const hasPlan = (client: Partial<ClientRecord>) =>
  Boolean(client.plan && client.plan !== "Sem plano");
const mergeSyncedClient = (
  synced: ClientRecord,
  fallback: ClientRecord,
  keepFallbackPlan = false,
): ClientRecord => {
  if (!keepFallbackPlan && hasPlan(synced)) return { ...fallback, ...synced };

  return {
    ...fallback,
    ...synced,
    plan: fallback.plan,
    planId: fallback.planId,
    planTone: fallback.planTone,
  };
};

interface ClientsState {
  clients: ClientRecord[];
  loadLocal: () => Promise<void>;
  loadOnline: () => Promise<void>;
  addClient: (client: Partial<ClientRecord>) => ClientRecord | null;
  updateClient: (id: string, data: Partial<ClientRecord>) => boolean;
  regenerateClientQr: (id: string) => Promise<ClientRecord | null>;
  updateLastCheckin: (id: string, lastCheckin: string) => void;
  deactivateClient: (id: string) => void;
  importClients: () => void;
}

const persist = localClients.write;
const normalizeEmail = (value?: string) => value?.trim().toLowerCase() ?? "";
const normalizeDigits = (value?: string) => value?.replace(/\D/g, "") ?? "";
const normalizeDocument = (value?: string) =>
  value?.replace(/[^a-z0-9]/gi, "").toUpperCase() ?? "";
const hasDuplicateClientIdentity = (
  clients: ClientRecord[],
  data: Partial<ClientRecord>,
  currentId?: string,
) => {
  const email = normalizeEmail(data.email);
  const phone = normalizeDigits(data.phone);
  const document = normalizeDocument(data.document);

  return clients.some((client) => {
    if (client.id === currentId) return false;

    return (
      (email && normalizeEmail(client.email) === email) ||
      (phone && normalizeDigits(client.phone) === phone) ||
      (document && normalizeDocument(client.document) === document)
    );
  });
};
const currentClientsDataSource = () =>
  resolveAdminDataSource({
    onlineOnly: useAppStore.getState().onlineOnly,
    token: useAuthStore.getState().accessToken,
    activeGymId: useAppStore.getState().activeGymId,
  });

export const useClientsStore = create<ClientsState>((set, get) => ({
  clients: isDesktopLocalDbAvailable() ? [] : localClients.read(),
  loadLocal: async () => {
    const activeGymId = useAppStore.getState().activeGymId;
    const desktopClients = await listDesktopClients();
    if (!desktopClients) {
      set({ clients: scopeByGym(localClients.read(), activeGymId) });
      return;
    }

    if (desktopClients.length) {
      set({ clients: scopeByGym(desktopClients, activeGymId) });
      return;
    }

    set({ clients: [] });
  },
  loadOnline: async () => {
    const source = currentClientsDataSource();
    if (!isApiDataSource(source)) {
      await get().loadLocal();
      return;
    }

    const members = await listResource<Record<string, unknown>>(
      "members",
      source.token,
      { gymId: source.activeGymId },
    );
    const clients = members.map(clientFromApi);
    persist(clients);
    void replaceDesktopClients(clients).catch(console.error);
    set({ clients });
  },
  addClient: (client) => {
    if (hasDuplicateClientIdentity(get().clients, client)) return null;

    const created: ClientRecord = {
      id: client.id ?? uid("CLI"),
      gymId: client.gymId ?? useAppStore.getState().activeGymId ?? undefined,
      name: client.name ?? "Novo cliente",
      phone: client.phone ?? "+244 900 000 000",
      email: client.email ?? "",
      plan: client.plan ?? "Plano Premium Mensal",
      planId: client.planId,
      planTone: client.planTone ?? "lime",
      status: client.status ?? "Ativo",
      lastCheckin: client.lastCheckin ?? "Sem check-in",
      expires: client.expires ?? "20/06/2024",
      birthday: client.birthday ?? "20 Mai",
      birthDate: client.birthDate,
      avatar:
        client.avatar ??
        (client.name ?? "NC")
          .split(" ")
          .map((part) => part[0])
          .join("")
          .slice(0, 2),
      qrToken: client.qrToken ?? uid("QR"),
      document: client.document,
      createdAt: client.createdAt ?? new Date().toISOString(),
      gender: client.gender,
      maritalStatus: client.maritalStatus,
      address: client.address,
      city: client.city,
      province: client.province,
      country: client.country,
      postalCode: client.postalCode,
      profession: client.profession,
      source: client.source,
      goal: client.goal,
      observations: client.observations,
    };
    created.qrPayload = client.qrPayload ?? clientQrPayload(created.id, created.qrToken);
    const clients = [created, ...get().clients];
    persist(clients);
    void upsertDesktopClient(created, "create").catch(console.error);
    useAppStore.getState().addPendingSync();
    useNotificationsStore.getState().addNotification({
      sourceId: `event:clients:created:${created.id}`,
      title: "Novo cliente cadastrado",
      description: `${created.name} entrou na base de clientes.`,
      category: "clients",
      tone: "success",
      route: "clientes",
      actionLabel: "Ver cliente",
    });
    set({ clients });
    const source = currentClientsDataSource();
    if (isApiDataSource(source)) {
      createResource<Record<string, unknown>>(
        "members",
        source.token,
        clientToDto(created),
      )
        .then(async (member) => {
          let synced = clientFromApi(member);
          if (created.planId) {
            try {
              const subscription = await createSubscription(source.token, {
                memberId: String(member.id),
                planId: created.planId,
              });
              synced = clientFromApi({
                ...(subscription.member as Record<string, unknown>),
                subscriptions: [subscription],
              });
            } catch (error) {
              console.error(error);
            }
          }
          const nextClients = get().clients.map((item) =>
            item.id === created.id
              ? mergeSyncedClient(synced, created, Boolean(created.planId))
              : item,
          );
          persist(nextClients);
          void upsertDesktopClient(
            mergeSyncedClient(synced, created, Boolean(created.planId)),
            "update",
          ).catch(console.error);
          set({ clients: nextClients });
        })
        .catch(console.error);
    }
    return created;
  },
  updateClient: (id, data) => {
    if (hasDuplicateClientIdentity(get().clients, data, id)) return false;

    set((state) => {
      const updatedClient = state.clients.find((client) => client.id === id);
      const fallback = { ...updatedClient, ...data } as ClientRecord;
      const clients = state.clients.map((client) =>
        client.id === id ? { ...client, ...data } : client,
      );
      persist(clients);
      void upsertDesktopClient(fallback, "update").catch(console.error);
      useAppStore.getState().addPendingSync();
      if (data.status && updatedClient?.status !== data.status) {
        useNotificationsStore.getState().addNotification({
          sourceId: `event:clients:status:${id}:${data.status}`,
          title: "Status do cliente atualizado",
          description: `${fallback.name} agora esta ${data.status}.`,
          category: "clients",
          tone: data.status === "Ativo" ? "success" : "warning",
          route: "clientes",
          actionLabel: "Ver clientes",
        });
      }
      const source = currentClientsDataSource();
      if (isApiDataSource(source)) {
        updateResource<Record<string, unknown>>(
          "members",
          id,
          source.token,
          clientToDto(fallback),
        )
          .then(async (member) => {
            let synced = clientFromApi(member);
            if (
              fallback.planId &&
              (data.plan !== undefined || data.planId !== undefined)
            ) {
              try {
                const subscription = await createSubscription(source.token, {
                  memberId: id,
                  planId: fallback.planId,
                });
                synced = clientFromApi({
                  ...(subscription.member as Record<string, unknown>),
                  subscriptions: [subscription],
                });
              } catch (error) {
                console.error(error);
              }
            }
            const nextClients = get().clients.map((client) =>
              client.id === id
                ? mergeSyncedClient(
                    synced,
                    fallback,
                    Boolean(
                      data.plan !== undefined || data.planId !== undefined,
                    ),
                  )
                : client,
            );
            persist(nextClients);
            void upsertDesktopClient(
              mergeSyncedClient(
                synced,
                fallback,
                Boolean(data.plan !== undefined || data.planId !== undefined),
              ),
              "update",
            ).catch(console.error);
            set({ clients: nextClients });
          })
          .catch(console.error);
      }
      return { clients };
    });
    return true;
  },
  updateLastCheckin: (id, lastCheckin) =>
    set((state) => {
      const clients = state.clients.map((client) =>
        client.id === id ? { ...client, lastCheckin } : client,
      );
      persist(clients);
      const updatedClient = clients.find((client) => client.id === id);
      if (updatedClient) {
        void upsertDesktopClient(updatedClient, "update").catch(console.error);
      }
      return { clients };
    }),
  regenerateClientQr: async (id) => {
    const client = get().clients.find((item) => item.id === id);
    if (!client) return null;

    const source = currentClientsDataSource();
    let updated: ClientRecord;

    if (isApiDataSource(source)) {
      const remoteId = client.remoteId ?? id;
      const member = await regenerateMemberQr(source.token, remoteId);
      const synced = clientFromApi(member);
      updated = client.remoteId ? { ...synced, id: client.id, remoteId } : synced;
    } else {
      const qrToken = uid("QR");
      updated = {
        ...client,
        qrToken,
        qrPayload: clientQrPayload(client.id, qrToken),
      };
    }

    const clients = get().clients.map((item) =>
      item.id === id ? { ...item, ...updated } : item,
    );
    persist(clients);
    void upsertDesktopClient({ ...client, ...updated }, "update").catch(console.error);
    set({ clients });
    return clients.find((item) => item.id === id) ?? null;
  },
  deactivateClient: (id) => get().updateClient(id, { status: "Inativo" }),
  importClients: () => {
    const imported = [
      {
        name: "Teresa Manuel",
        email: "teresa.manuel@email.com",
        phone: "+244 924 111 222",
        plan: "Plano Gold",
        document: "00991122LA044",
      },
      {
        name: "Bento Cassoma",
        email: "bento.cassoma@email.com",
        phone: "+244 925 333 444",
        plan: "Plano Basic",
        document: "00993344LA055",
      },
      {
        name: "Lurdes Antunes",
        email: "lurdes.antunes@email.com",
        phone: "+244 926 555 666",
        plan: "Plano Premium Mensal",
        document: "00995566LA066",
      },
    ];
    imported.forEach((client) => get().addClient(client));
  },
}));
