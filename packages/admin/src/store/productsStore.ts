import { create } from "zustand";
import { products as mockProducts } from "../data/mock";
import { createResource, listResource, productFromApi, productToDto, updateResource } from "../lib/domainApi";
import { readLocal, uid, writeLocal } from "../lib/storage";
import { useAppStore } from "./appStore";
import { useAuthStore } from "./authStore";
import type { ProductRecord } from "@noogym/types";

const initialProducts: ProductRecord[] = mockProducts.map((product) => ({ ...product, sku: product.id, barcode: "7891234567890", status: "Ativo" }));
const persist = (products: ProductRecord[]) => writeLocal("noogym:products", products);

export const useProductsStore = create<{
  products: ProductRecord[];
  loadOnline: () => Promise<void>;
  addProduct: (product: Partial<ProductRecord>) => void;
  updateProduct: (id: string, product: Partial<ProductRecord>) => void;
  deactivateProduct: (id: string) => void;
  importProducts: () => void;
  reduceStock: (items: { id: string; qty: number }[]) => void;
}>((set, get) => ({
  products: readLocal("noogym:products", initialProducts),
  loadOnline: async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    const apiProducts = await listResource<Record<string, unknown>>("products", token);
    const products = apiProducts.map(productFromApi);
    persist(products);
    set({ products });
  },
  addProduct: (product) => set((state) => {
    const created: ProductRecord = { id: uid("PRD"), name: "Novo produto", category: "Suplementos", stock: 0, price: 0, cost: 0, emoji: "PRD", status: "Ativo", ...product };
    const products = [created, ...state.products];
    persist(products);
    useAppStore.getState().addPendingSync();

    const token = useAuthStore.getState().accessToken;
    if (useAppStore.getState().onlineOnly && token) {
      createResource<Record<string, unknown>>("products", token, productToDto(created))
        .then((apiProduct) => {
          const synced = productFromApi(apiProduct);
          const nextProducts = get().products.map((item) => item.id === created.id ? synced : item);
          persist(nextProducts);
          set({ products: nextProducts });
        })
        .catch(console.error);
    }

    return { products };
  }),
  updateProduct: (id, product) => set((state) => {
    const nextProduct = { ...state.products.find((item) => item.id === id), ...product };
    const products = state.products.map((item) => item.id === id ? { ...item, ...product } : item);
    persist(products);
    useAppStore.getState().addPendingSync();

    const token = useAuthStore.getState().accessToken;
    if (useAppStore.getState().onlineOnly && token) {
      updateResource<Record<string, unknown>>("products", id, token, productToDto(nextProduct))
        .then((apiProduct) => {
          const synced = productFromApi(apiProduct);
          const nextProducts = get().products.map((item) => item.id === id ? synced : item);
          persist(nextProducts);
          set({ products: nextProducts });
        })
        .catch(console.error);
    }

    return { products };
  }),
  deactivateProduct: (id) => get().updateProduct(id, { status: "Inativo" }),
  importProducts: () => {
    [
      { name: "Garrafa Termica 750ml", category: "Acessorios", stock: 40, price: 6000, cost: 3200, emoji: "BOT" },
      { name: "BCAA 240 capsulas", category: "Suplementos", stock: 20, price: 14000, cost: 7200, emoji: "BCAA" }
    ].forEach((product) => get().addProduct(product));
  },
  reduceStock: (items) => set((state) => {
    const products = state.products.map((product) => {
      const item = items.find((entry) => entry.id === product.id);
      return item ? { ...product, stock: Math.max(0, product.stock - item.qty) } : product;
    });
    persist(products);

    const token = useAuthStore.getState().accessToken;
    if (useAppStore.getState().onlineOnly && token) {
      items.forEach((item) => {
        const product = state.products.find((entry) => entry.id === item.id);
        if (!product) return;
        updateResource<Record<string, unknown>>("products", item.id, token, productToDto({ ...product, stock: Math.max(0, product.stock - item.qty) })).catch(console.error);
      });
    }

    return { products };
  })
}));
