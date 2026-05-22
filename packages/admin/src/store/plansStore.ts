import { create } from "zustand";
import { plans as mockPlans } from "../data/mock";
import { createResource, listResource, planFromApi, planToDto, updateResource } from "../lib/domainApi";
import { readLocal, uid, writeLocal } from "../lib/storage";
import { useAppStore } from "./appStore";
import { useAuthStore } from "./authStore";
import type { PlanRecord } from "@noogym/types";

const initialPlans: PlanRecord[] = mockPlans.map((plan) => ({ ...plan, id: uid("PLN"), status: "Ativo" }));
const persist = (plans: PlanRecord[]) => writeLocal("noogym:plans", plans);

export const usePlansStore = create<{
  plans: PlanRecord[];
  loadOnline: () => Promise<void>;
  addPlan: (plan: Partial<PlanRecord>) => void;
  updatePlan: (id: string, plan: Partial<PlanRecord>) => void;
  duplicatePlan: (id: string) => void;
  deactivatePlan: (id: string) => void;
}>((set, get) => ({
  plans: readLocal("noogym:plans", initialPlans),
  loadOnline: async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    const apiPlans = await listResource<Record<string, unknown>>("plans", token);
    const plans = apiPlans.map(planFromApi);
    persist(plans);
    set({ plans });
  },
  addPlan: (plan) => set((state) => {
    const created: PlanRecord = {
      id: uid("PLN"),
      name: "Novo plano",
      description: "",
      category: "Musculacao",
      price: "0 Kz/mes",
      duration: "Mensal",
      type: "Recorrente",
      clients: 0,
      status: "Ativo",
      ...plan
    };
    const plans = [created, ...state.plans];
    persist(plans);
    useAppStore.getState().addPendingSync();

    const token = useAuthStore.getState().accessToken;
    if (useAppStore.getState().onlineOnly && token) {
      createResource<Record<string, unknown>>("plans", token, planToDto(created))
        .then((apiPlan) => {
          const synced = planFromApi(apiPlan);
          const nextPlans = get().plans.map((item) => item.id === created.id ? synced : item);
          persist(nextPlans);
          set({ plans: nextPlans });
        })
        .catch(console.error);
    }

    return { plans };
  }),
  updatePlan: (id, plan) => set((state) => {
    const nextPlan = { ...state.plans.find((item) => item.id === id), ...plan };
    const plans = state.plans.map((item) => item.id === id ? { ...item, ...plan } : item);
    persist(plans);
    useAppStore.getState().addPendingSync();

    const token = useAuthStore.getState().accessToken;
    if (useAppStore.getState().onlineOnly && token) {
      updateResource<Record<string, unknown>>("plans", id, token, planToDto(nextPlan))
        .then((apiPlan) => {
          const synced = planFromApi(apiPlan);
          const nextPlans = get().plans.map((item) => item.id === id ? synced : item);
          persist(nextPlans);
          set({ plans: nextPlans });
        })
        .catch(console.error);
    }

    return { plans };
  }),
  duplicatePlan: (id) => {
    const plan = get().plans.find((item) => item.id === id);
    if (plan) get().addPlan({ ...plan, id: uid("PLN"), name: `${plan.name} Copia`, clients: 0 });
  },
  deactivatePlan: (id) => get().updatePlan(id, { status: "Inativo" })
}));
