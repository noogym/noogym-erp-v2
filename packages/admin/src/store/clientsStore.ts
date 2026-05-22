import { create } from "zustand";
import { clients as mockClients } from "../data/mock";
import { clientFromApi, clientToDto, createResource, listResource, updateResource } from "../lib/domainApi";
import { readLocal, uid, writeLocal } from "../lib/storage";
import { useAppStore } from "./appStore";
import { useAuthStore } from "./authStore";
import type { ClientRecord } from "@noogym/types";

const initialClients = mockClients.map((client) => ({ ...client, document: "000000000LA000" })) as ClientRecord[];

interface ClientsState {
  clients: ClientRecord[];
  loadOnline: () => Promise<void>;
  addClient: (client: Partial<ClientRecord>) => ClientRecord;
  updateClient: (id: string, data: Partial<ClientRecord>) => void;
  deactivateClient: (id: string) => void;
  importClients: () => void;
}

const persist = (clients: ClientRecord[]) => writeLocal("noogym:clients", clients);

export const useClientsStore = create<ClientsState>((set, get) => ({
  clients: readLocal("noogym:clients", initialClients),
  loadOnline: async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    const members = await listResource<Record<string, unknown>>("members", token);
    const clients = members.map(clientFromApi);
    persist(clients);
    set({ clients });
  },
  addClient: (client) => {
    const created: ClientRecord = {
      id: client.id ?? uid("CLI"),
      name: client.name ?? "Novo cliente",
      phone: client.phone ?? "+244 900 000 000",
      email: client.email ?? "cliente@email.com",
      plan: client.plan ?? "Plano Premium Mensal",
      planTone: client.planTone ?? "lime",
      status: client.status ?? "Ativo",
      lastCheckin: client.lastCheckin ?? "Sem check-in",
      expires: client.expires ?? "20/06/2024",
      birthday: client.birthday ?? "20 Mai",
      avatar: client.avatar ?? (client.name ?? "NC").split(" ").map((part) => part[0]).join("").slice(0, 2),
      document: client.document ?? "000000000LA000"
    };
    const clients = [created, ...get().clients];
    persist(clients);
    useAppStore.getState().addPendingSync();
    set({ clients });
    const token = useAuthStore.getState().accessToken;
    if (useAppStore.getState().onlineOnly && token) {
      createResource<Record<string, unknown>>("members", token, clientToDto(created))
        .then((member) => {
          const synced = clientFromApi(member);
          const nextClients = get().clients.map((item) => item.id === created.id ? synced : item);
          persist(nextClients);
          set({ clients: nextClients });
        })
        .catch(console.error);
    }
    return created;
  },
  updateClient: (id, data) => set((state) => {
    const clients = state.clients.map((client) => client.id === id ? { ...client, ...data } : client);
    persist(clients);
    useAppStore.getState().addPendingSync();
    const token = useAuthStore.getState().accessToken;
    if (useAppStore.getState().onlineOnly && token) {
      updateResource<Record<string, unknown>>("members", id, token, clientToDto({ ...state.clients.find((client) => client.id === id), ...data }))
        .then((member) => {
          const synced = clientFromApi(member);
          const nextClients = get().clients.map((client) => client.id === id ? synced : client);
          persist(nextClients);
          set({ clients: nextClients });
        })
        .catch(console.error);
    }
    return { clients };
  }),
  deactivateClient: (id) => get().updateClient(id, { status: "Inativo" }),
  importClients: () => {
    const imported = [
      { name: "Teresa Manuel", email: "teresa.manuel@email.com", phone: "+244 924 111 222", plan: "Plano Gold", document: "00991122LA044" },
      { name: "Bento Cassoma", email: "bento.cassoma@email.com", phone: "+244 925 333 444", plan: "Plano Basic", document: "00993344LA055" },
      { name: "Lurdes Antunes", email: "lurdes.antunes@email.com", phone: "+244 926 555 666", plan: "Plano Premium Mensal", document: "00995566LA066" }
    ];
    imported.forEach((client) => get().addClient(client));
  }
}));
