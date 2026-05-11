import { mockCheckins, mockClients, mockFinances, mockPlans, mockProducts, mockSales } from "../mockData";
import type { CheckinRepository } from "../repositories/CheckinRepository";
import type { ClientRepository } from "../repositories/ClientRepository";
import type { FinanceRepository } from "../repositories/FinanceRepository";
import type { PlanRepository } from "../repositories/PlanRepository";
import type { ProductRepository } from "../repositories/ProductRepository";
import type { SaleRepository } from "../repositories/SaleRepository";

const delay = () => new Promise((resolve) => setTimeout(resolve, 40));

export interface WebDataAccess {
  clients: ClientRepository;
  plans: PlanRepository;
  products: ProductRepository;
  checkins: CheckinRepository;
  sales: SaleRepository;
  finance: FinanceRepository;
}

export function createWebAdapter(): WebDataAccess {
  return {
    clients: collectionRepository(mockClients),
    plans: collectionRepository(mockPlans),
    products: collectionRepository(mockProducts),
    checkins: {
      list: async () => {
        await delay();
        return [...mockCheckins];
      },
      register: async (checkin) => {
        await delay();
        mockCheckins.unshift(checkin);
        return checkin;
      }
    },
    sales: {
      list: async () => {
        await delay();
        return [...mockSales];
      },
      register: async (sale) => {
        await delay();
        mockSales.unshift(sale);
        return sale;
      }
    },
    finance: {
      list: async () => {
        await delay();
        return [...mockFinances];
      },
      save: async (record) => {
        await delay();
        upsert(mockFinances, record);
        return record;
      }
    }
  };
}

function collectionRepository<T extends { id: string }>(items: T[]) {
  return {
    list: async () => {
      await delay();
      return [...items];
    },
    findById: async (id: string) => {
      await delay();
      return items.find((item) => item.id === id) ?? null;
    },
    save: async (item: T) => {
      await delay();
      upsert(items, item);
      return item;
    }
  };
}

function upsert<T extends { id: string }>(items: T[], item: T) {
  const index = items.findIndex((current) => current.id === item.id);
  if (index >= 0) {
    items[index] = item;
    return;
  }
  items.unshift(item);
}
