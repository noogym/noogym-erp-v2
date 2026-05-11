import { create } from "zustand";
import { plans as mockPlans } from "../data/mock";
import { readLocal, uid, writeLocal } from "../lib/storage";
import { useAppStore } from "./appStore";
import type { PlanRecord } from "@noogym/types";

const initialPlans: PlanRecord[] = mockPlans.map((plan) => ({ ...plan, id: uid("PLN"), status: "Ativo" }));
const persist = (plans: PlanRecord[]) => writeLocal("noogym:plans", plans);

export const usePlansStore = create<{
  plans: PlanRecord[];
  addPlan: (plan: Partial<PlanRecord>) => void;
  updatePlan: (id: string, plan: Partial<PlanRecord>) => void;
  duplicatePlan: (id: string) => void;
  deactivatePlan: (id: string) => void;
}>((set, get) => ({
  plans: readLocal("noogym:plans", initialPlans),
  addPlan: (plan) => set((state) => {
    const plans = [{ id: uid("PLN"), name: "Novo plano", description: "", category: "Musculação", price: "0 Kz/mês", duration: "Mensal", type: "Recorrente", clients: 0, status: "Ativo", ...plan }, ...state.plans];
    persist(plans); useAppStore.getState().addPendingSync(); return { plans };
  }),
  updatePlan: (id, plan) => set((state) => {
    const plans = state.plans.map((item) => item.id === id ? { ...item, ...plan } : item);
    persist(plans); useAppStore.getState().addPendingSync(); return { plans };
  }),
  duplicatePlan: (id) => {
    const plan = get().plans.find((item) => item.id === id);
    if (plan) get().addPlan({ ...plan, id: uid("PLN"), name: `${plan.name} Cópia`, clients: 0 });
  },
  deactivatePlan: (id) => get().updatePlan(id, { status: "Inativo" })
}));
