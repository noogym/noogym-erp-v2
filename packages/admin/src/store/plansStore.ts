import { create } from "zustand";
import { plans as mockPlans } from "../data/mock";
import { createResource, listResource, planCategoryFromApi, planCategoryToDto, planFromApi, planToDto, updateResource } from "../lib/domainApi";
import { readLocal, uid, writeLocal } from "../lib/storage";
import { useAppStore } from "./appStore";
import { useAuthStore } from "./authStore";
import { toastInfo } from "./toastStore";
import type { PlanCategoryRecord, PlanRecord } from "@noogym/types";

const initialCategories = ["Musculação", "Funcional", "Lutas", "Natação", "Cross Training", "Aulas"];
const categoryColors = ["#B6FF00", "#38BDF8", "#A855F7", "#F59E0B", "#2DD4BF", "#FB7185", "#94A3B8"];
const initialPlans: PlanRecord[] = mockPlans.map((plan, index) => ({ ...plan, id: uid("PLN"), status: "Ativo", color: categoryColors[index % categoryColors.length] }));
const persist = (plans: PlanRecord[]) => writeLocal("noogym:plans", plans);
const persistCategories = (categories: string[]) => writeLocal("noogym:plan-categories", categories);
const persistCategoryDetails = (categories: PlanCategory[]) => writeLocal("noogym:plan-category-details", categories);

export type PlanCategory = PlanCategoryRecord;

export type PlanCategoryInput = Partial<PlanCategory> & { name: string };

const categoryFromName = (name: string, index = 0): PlanCategory => ({
  id: uid("PLNCAT"),
  name,
  icon: name,
  color: categoryColors[index % categoryColors.length],
  status: "Ativo",
  order: index + 1
});
const planColor = (index = 0) => categoryColors[index % categoryColors.length];
const mergeSyncedPlan = (synced: PlanRecord, fallback: PlanRecord): PlanRecord => ({
  ...fallback,
  ...synced,
  accessDays: fallback.accessDays,
  clients: fallback.clients
});
const mergeSyncedCategory = (synced: PlanCategory, fallback: PlanCategory): PlanCategory => ({
  ...fallback,
  ...synced
});
const notifyPlanSyncFailure = () => {
  toastInfo("Plano salvo localmente", "Nao foi possivel sincronizar com a API agora. Confirme se o servidor esta online.");
};
const notifyCategorySyncFailure = () => {
  toastInfo("Categoria salva localmente", "Nao foi possivel sincronizar com a API agora. Confirme se o servidor esta online.");
};

const readCategoryDetails = () => {
  const saved = readLocal<Array<PlanCategory | string>>("noogym:plan-category-details", []);
  if (saved.length) {
    return saved.map((category, index) => typeof category === "string" ? categoryFromName(category, index) : { ...categoryFromName(category.name, index), ...category });
  }
  const legacy = readLocal<string[]>("noogym:plan-categories", initialCategories);
  return legacy.map(categoryFromName);
};
const normalize = (value: string) => value.trim().toLowerCase();
const sortCategories = (categories: PlanCategory[]) => categories.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
const uniqueCategoryDetails = (categories: PlanCategory[]) => {
  const seen = new Set<string>();
  return sortCategories(categories.filter((category) => {
    const key = normalize(category.name);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }));
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
    const [apiPlans, apiCategories] = await Promise.all([
      listResource<Record<string, unknown>>("plans", token),
      listResource<Record<string, unknown>>("plan-categories", token)
    ]);
    const plans = apiPlans.map(planFromApi);
    const apiCategoryDetails = apiCategories.map(planCategoryFromApi);
    let categoryDetails = uniqueCategoryDetails([...apiCategoryDetails, ...get().categoryDetails]);
    plans.map((plan) => plan.category).filter(Boolean).forEach((name) => {
      if (!categoryDetails.some((category) => category.name.toLowerCase() === name.toLowerCase())) categoryDetails.push(categoryFromName(name, categoryDetails.length));
    });
    const apiCategoryNames = new Set(apiCategories.map((category) => normalize(String(category.name ?? ""))));
    const missingApiCategories = uniqueCategoryDetails(categoryDetails).filter((category) => !apiCategoryNames.has(normalize(category.name)));
    if (missingApiCategories.length) {
      const syncedCategories = await Promise.all(missingApiCategories.map((category) =>
        createResource<Record<string, unknown>>("plan-categories", token, planCategoryToDto(category))
          .then((apiCategory) => mergeSyncedCategory(planCategoryFromApi(apiCategory), category))
          .catch(() => category)
      ));
      categoryDetails = categoryDetails.map((category) => syncedCategories.find((synced) => normalize(synced.name) === normalize(category.name)) ?? category);
    }
    categoryDetails = uniqueCategoryDetails(categoryDetails);
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
          const nextPlans = get().plans.map((item) => item.id === created.id ? mergeSyncedPlan(synced, created) : item);
          persist(nextPlans);
          set({ plans: nextPlans });
        })
        .catch(notifyPlanSyncFailure);
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
          const nextPlans = get().plans.map((item) => item.id === id ? mergeSyncedPlan(synced, item) : item);
          persist(nextPlans);
          set({ plans: nextPlans });
        })
        .catch(notifyPlanSyncFailure);
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
    if (get().categoryDetails.some((item) => normalize(item.name) === normalize(name))) return false;
    const category: PlanCategory = {
      ...categoryFromName(name, get().categoryDetails.length),
      ...payload,
      id: uid("PLNCAT"),
      name,
      color: payload.color ?? categoryColors[get().categoryDetails.length % categoryColors.length],
      status: payload.status ?? "Ativo",
      order: Number(payload.order ?? get().categoryDetails.length + 1)
    };
    const categoryDetails = uniqueCategoryDetails([...get().categoryDetails, category]);
    const categories = categoryDetails.map((item) => item.name);
    persistCategories(categories);
    persistCategoryDetails(categoryDetails);
    set({ categories, categoryDetails });
    const token = useAuthStore.getState().accessToken;
    if (useAppStore.getState().onlineOnly && token) {
      createResource<Record<string, unknown>>("plan-categories", token, planCategoryToDto(category))
        .then((apiCategory) => {
          const synced = planCategoryFromApi(apiCategory);
          const nextDetails = get().categoryDetails.map((item) => item.id === category.id ? mergeSyncedCategory(synced, item) : item);
          persistCategoryDetails(nextDetails);
          set({ categoryDetails: nextDetails, categories: nextDetails.map((item) => item.name) });
        })
        .catch(notifyCategorySyncFailure);
    }
    return true;
  },
  updateCategory: (currentName, input) => {
    const name = input.name.trim();
    if (!name) return false;
    const categoryDetails = get().categoryDetails;
    if (categoryDetails.some((item) => normalize(item.name) === normalize(name) && normalize(item.name) !== normalize(currentName))) return false;
    const currentCategory = categoryDetails.find((item) => item.name === currentName);
    const nextDetails = uniqueCategoryDetails(categoryDetails.map((item) => item.name === currentName ? {
      ...item,
      ...input,
      name,
      color: input.color ?? item.color,
      status: input.status ?? item.status,
      order: Number(input.order ?? item.order)
    } : item));
    const plans = get().plans.map((plan) => plan.category === currentName ? { ...plan, category: name } : plan);
    const categories = nextDetails.map((item) => item.name);
    persist(plans);
    persistCategories(categories);
    persistCategoryDetails(nextDetails);
    set({ plans, categories, categoryDetails: nextDetails });
    const updatedCategory = nextDetails.find((item) => item.name === name);
    const token = useAuthStore.getState().accessToken;
    if (updatedCategory && useAppStore.getState().onlineOnly && token) {
      const request = currentCategory?.id && !currentCategory.id.startsWith("PLNCAT")
        ? updateResource<Record<string, unknown>>("plan-categories", currentCategory.id, token, planCategoryToDto(updatedCategory))
        : createResource<Record<string, unknown>>("plan-categories", token, planCategoryToDto(updatedCategory));
      request
        .then((apiCategory) => {
          const synced = planCategoryFromApi(apiCategory);
          const latestDetails = get().categoryDetails.map((item) => item.name === name ? mergeSyncedCategory(synced, item) : item);
          persistCategoryDetails(latestDetails);
          set({ categoryDetails: latestDetails, categories: latestDetails.map((item) => item.name) });
        })
        .catch(notifyCategorySyncFailure);
    }
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
