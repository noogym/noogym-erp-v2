import { create } from "zustand";
import { plans as mockPlans } from "../data/mock";
import { createResource, listResource, planFromApi, planToDto, updateResource } from "../lib/domainApi";
import { readLocal, uid, writeLocal } from "../lib/storage";
import { useAppStore } from "./appStore";
import { useAuthStore } from "./authStore";
import type { PlanRecord } from "@noogym/types";

const initialCategories = ["Musculação", "Funcional", "Lutas", "Natação", "Cross Training", "Aulas"];
const categoryColors = ["#B6FF00", "#38BDF8", "#A855F7", "#F59E0B", "#2DD4BF", "#FB7185", "#94A3B8"];
const initialPlans: PlanRecord[] = mockPlans.map((plan, index) => ({ ...plan, id: uid("PLN"), status: "Ativo", color: categoryColors[index % categoryColors.length] }));
const persist = (plans: PlanRecord[]) => writeLocal("noogym:plans", plans);
const persistCategories = (categories: string[]) => writeLocal("noogym:plan-categories", categories);
const persistCategoryDetails = (categories: PlanCategory[]) => writeLocal("noogym:plan-category-details", categories);

export interface PlanCategory {
  name: string;
  icon: string;
  description?: string;
  color: string;
  status: "Ativo" | "Inativo";
  order: number;
}

export type PlanCategoryInput = Partial<PlanCategory> & { name: string };

const categoryFromName = (name: string, index = 0): PlanCategory => ({
  name,
  icon: name,
  color: categoryColors[index % categoryColors.length],
  status: "Ativo",
  order: index + 1
});
const planColor = (index = 0) => categoryColors[index % categoryColors.length];

const readCategoryDetails = () => {
  const saved = readLocal<Array<PlanCategory | string>>("noogym:plan-category-details", []);
  if (saved.length) {
    return saved.map((category, index) => typeof category === "string" ? categoryFromName(category, index) : { ...categoryFromName(category.name, index), ...category });
  }
  const legacy = readLocal<string[]>("noogym:plan-categories", initialCategories);
  return legacy.map(categoryFromName);
};

export const usePlansStore = create<{
  plans: PlanRecord[];
  categories: string[];
  categoryDetails: PlanCategory[];
  loadOnline: () => Promise<void>;
  addPlan: (plan: Partial<PlanRecord>) => void;
  updatePlan: (id: string, plan: Partial<PlanRecord>) => void;
  duplicatePlan: (id: string) => void;
  deactivatePlan: (id: string) => void;
  addCategory: (category: string | PlanCategoryInput) => boolean;
  updateCategory: (name: string, category: PlanCategoryInput) => boolean;
  duplicateCategory: (name: string) => boolean;
  toggleCategoryStatus: (name: string) => boolean;
}>((set, get) => ({
  plans: readLocal("noogym:plans", initialPlans),
  categoryDetails: readCategoryDetails(),
  categories: readCategoryDetails().map((category) => category.name),
  loadOnline: async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    const apiPlans = await listResource<Record<string, unknown>>("plans", token);
    const plans = apiPlans.map(planFromApi);
    const categoryDetails = [...get().categoryDetails];
    plans.map((plan) => plan.category).filter(Boolean).forEach((name) => {
      if (!categoryDetails.some((category) => category.name.toLowerCase() === name.toLowerCase())) categoryDetails.push(categoryFromName(name, categoryDetails.length));
    });
    const categories = categoryDetails.map((category) => category.name);
    persist(plans);
    persistCategories(categories);
    persistCategoryDetails(categoryDetails);
    set({ plans, categories, categoryDetails });
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
      color: planColor(state.plans.length),
      ...plan
    };
    const plans = [created, ...state.plans];
    const categories = created.category && !state.categories.some((category) => category.toLowerCase() === created.category.toLowerCase()) ? [...state.categories, created.category] : state.categories;
    const categoryDetails = created.category && !state.categoryDetails.some((category) => category.name.toLowerCase() === created.category.toLowerCase()) ? [...state.categoryDetails, categoryFromName(created.category, state.categoryDetails.length)] : state.categoryDetails;
    persist(plans);
    persistCategories(categories);
    persistCategoryDetails(categoryDetails);
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

    return { plans, categories, categoryDetails };
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
  deactivatePlan: (id) => get().updatePlan(id, { status: "Inativo" }),
  addCategory: (input) => {
    const payload = typeof input === "string" ? { name: input } : input;
    const name = payload.name.trim();
    if (!name) return false;
    if (get().categoryDetails.some((item) => item.name.toLowerCase() === name.toLowerCase())) return false;
    const category: PlanCategory = {
      ...categoryFromName(name, get().categoryDetails.length),
      ...payload,
      name,
      color: payload.color ?? categoryColors[get().categoryDetails.length % categoryColors.length],
      status: payload.status ?? "Ativo",
      order: Number(payload.order ?? get().categoryDetails.length + 1)
    };
    const categoryDetails = [...get().categoryDetails, category].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    const categories = categoryDetails.map((item) => item.name);
    persistCategories(categories);
    persistCategoryDetails(categoryDetails);
    set({ categories, categoryDetails });
    return true;
  },
  updateCategory: (currentName, input) => {
    const name = input.name.trim();
    if (!name) return false;
    const categoryDetails = get().categoryDetails;
    if (categoryDetails.some((item) => item.name.toLowerCase() === name.toLowerCase() && item.name.toLowerCase() !== currentName.toLowerCase())) return false;
    const nextDetails = categoryDetails.map((item) => item.name === currentName ? {
      ...item,
      ...input,
      name,
      color: input.color ?? item.color,
      status: input.status ?? item.status,
      order: Number(input.order ?? item.order)
    } : item).sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
    const plans = get().plans.map((plan) => plan.category === currentName ? { ...plan, category: name } : plan);
    const categories = nextDetails.map((item) => item.name);
    persist(plans);
    persistCategories(categories);
    persistCategoryDetails(nextDetails);
    set({ plans, categories, categoryDetails: nextDetails });
    return true;
  },
  duplicateCategory: (name) => {
    const category = get().categoryDetails.find((item) => item.name === name);
    if (!category) return false;
    let copyName = `${category.name} Copia`;
    let index = 2;
    while (get().categoryDetails.some((item) => item.name.toLowerCase() === copyName.toLowerCase())) {
      copyName = `${category.name} Copia ${index}`;
      index += 1;
    }
    return get().addCategory({ ...category, name: copyName, order: get().categoryDetails.length + 1 });
  },
  toggleCategoryStatus: (name) => {
    const category = get().categoryDetails.find((item) => item.name === name);
    if (!category) return false;
    return get().updateCategory(name, { ...category, status: category.status === "Ativo" ? "Inativo" : "Ativo" });
  }
}));
