import { mockCheckins, mockClients, mockFinances, mockPlans, mockProducts, mockSales } from "../mockData";
import { createWebAdapter, type WebDataAccess } from "./webAdapter";

export type DesktopDataAccess = WebDataAccess;

export function createDesktopAdapter(): DesktopDataAccess {
  if (typeof globalThis.localStorage === "undefined") {
    return createWebAdapter();
  }

  hydrateFromLocalStorage("noogym.clients", mockClients);
  hydrateFromLocalStorage("noogym.plans", mockPlans);
  hydrateFromLocalStorage("noogym.products", mockProducts);
  hydrateFromLocalStorage("noogym.checkins", mockCheckins);
  hydrateFromLocalStorage("noogym.sales", mockSales);
  hydrateFromLocalStorage("noogym.finance", mockFinances);

  return createWebAdapter();
}

function hydrateFromLocalStorage<T>(key: string, target: T[]) {
  const raw = globalThis.localStorage.getItem(key);
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw) as T[];
    target.splice(0, target.length, ...parsed);
  } catch {
    globalThis.localStorage.removeItem(key);
  }
}
