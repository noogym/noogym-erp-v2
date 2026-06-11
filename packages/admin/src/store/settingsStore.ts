import { create } from "zustand";
import {
  createGymSettings,
  getOrganizationSettings,
  listGymSettings,
  listUserSettings,
  updateGymSettings,
  updateOrganizationSettings,
  type GymSettings,
  type GymSettingsPayload,
  type OrganizationSettings,
  type OrganizationSettingsPayload,
  type UserSettings
} from "../lib/settingsApi";
import { useAuthStore } from "./authStore";

interface SettingsState {
  organization: OrganizationSettings | null;
  gyms: GymSettings[];
  users: UserSettings[];
  isLoading: boolean;
  loadOnline: () => Promise<void>;
  saveOrganization: (data: OrganizationSettingsPayload) => Promise<void>;
  savePrimaryGym: (data: GymSettingsPayload) => Promise<void>;
  saveGym: (id: string | null, data: GymSettingsPayload) => Promise<GymSettings | null>;
  deactivateGym: (id: string) => Promise<GymSettings | null>;
}

const slugify = (value: string) => {
  const slug = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || `unidade-${Date.now()}`;
};

export const useSettingsStore = create<SettingsState>((set, get) => ({
  organization: null,
  gyms: [],
  users: [],
  isLoading: false,
  loadOnline: async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    set({ isLoading: true });
    try {
      const [organization, gyms, users] = await Promise.all([
        getOrganizationSettings(token),
        listGymSettings(token),
        listUserSettings(token).catch(() => [] as UserSettings[])
      ]);
      set({ organization, gyms, users, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  saveOrganization: async (data) => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    set({ isLoading: true });
    try {
      const organization = await updateOrganizationSettings(token, data);
      set({ organization, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  savePrimaryGym: async (data) => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    const current = get().gyms[0];
    const name = data.name?.trim() || current?.name || get().organization?.name || "Unidade Central";
    const body = { ...data, name, slug: data.slug?.trim() || current?.slug || slugify(name) };
    set({ isLoading: true });
    try {
      const gym = current ? await updateGymSettings(token, current.id, body) : await createGymSettings(token, body);
      const gyms = current ? get().gyms.map((item) => item.id === current.id ? gym : item) : [gym, ...get().gyms];
      set({ gyms, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  saveGym: async (id, data) => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return null;
    const current = id ? get().gyms.find((gym) => gym.id === id) : undefined;
    const name = data.name?.trim() || current?.name || get().organization?.name || "Unidade Central";
    const body = { ...data, name, slug: data.slug?.trim() || current?.slug || slugify(name) };
    set({ isLoading: true });
    try {
      const gym = id ? await updateGymSettings(token, id, body) : await createGymSettings(token, body);
      const gyms = id ? get().gyms.map((item) => item.id === id ? gym : item) : [gym, ...get().gyms];
      set({ gyms, isLoading: false });
      return gym;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  deactivateGym: async (id) => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return null;
    set({ isLoading: true });
    try {
      const gym = await updateGymSettings(token, id, { isActive: false });
      set({ gyms: get().gyms.map((item) => item.id === id ? gym : item), isLoading: false });
      return gym;
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  }
}));
