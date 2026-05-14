import { create } from "zustand";
import type { ReportConfig, ReportTabKey } from "../data/reportsMock";
import { loadReportConfig, loadReportOverview, type ReportOverview } from "../lib/reportApi";
import { useAuthStore } from "./authStore";

interface ReportsState {
  overview: ReportOverview | null;
  configs: Partial<Record<ReportTabKey, ReportConfig>>;
  isLoading: boolean;
  loadOverview: () => Promise<void>;
  loadReport: (key: ReportTabKey) => Promise<void>;
  loadAllReports: () => Promise<void>;
}

const reportKeys: ReportTabKey[] = ["financial", "clients", "checkins", "plans", "classes", "workouts", "sales", "products", "employees"];

export const useReportsStore = create<ReportsState>((set, get) => ({
  overview: null,
  configs: {},
  isLoading: false,
  loadOverview: async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    set({ isLoading: true });
    try {
      const overview = await loadReportOverview(token);
      set({ overview, isLoading: false });
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  loadReport: async (key) => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    set({ isLoading: true });
    try {
      const config = await loadReportConfig(key, token);
      set((state) => ({ configs: { ...state.configs, [key]: config }, isLoading: false }));
    } catch (error) {
      set({ isLoading: false });
      throw error;
    }
  },
  loadAllReports: async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    set({ isLoading: true });
    try {
      const [overview, ...configs] = await Promise.all([
        loadReportOverview(token),
        ...reportKeys.map((key) => loadReportConfig(key, token))
      ]);
      set({
        overview,
        configs: Object.fromEntries(reportKeys.map((key, index) => [key, configs[index]])) as Partial<Record<ReportTabKey, ReportConfig>>,
        isLoading: false
      });
    } catch (error) {
      set({ isLoading: false });
      if (!get().overview) throw error;
    }
  }
}));
