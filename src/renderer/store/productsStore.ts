import { create } from "zustand";
import { products as mockProducts } from "../data/mock";
import { readLocal, uid, writeLocal } from "../lib/storage";
import { useAppStore } from "./appStore";
import type { ProductRecord } from "./domainTypes";

const initialProducts: ProductRecord[] = mockProducts.map((product) => ({ ...product, sku: product.id, barcode: "7891234567890", status: "Ativo" }));
const persist = (products: ProductRecord[]) => writeLocal("noogym:products", products);

export const useProductsStore = create<{
  products: ProductRecord[];
  addProduct: (product: Partial<ProductRecord>) => void;
  updateProduct: (id: string, product: Partial<ProductRecord>) => void;
  deactivateProduct: (id: string) => void;
  importProducts: () => void;
  reduceStock: (items: { id: string; qty: number }[]) => void;
}>((set, get) => ({
  products: readLocal("noogym:products", initialProducts),
  addProduct: (product) => set((state) => {
    const products = [{ id: uid("PRD"), name: "Novo produto", category: "Suplementos", stock: 0, price: 0, cost: 0, emoji: "PRD", status: "Ativo", ...product }, ...state.products];
    persist(products); useAppStore.getState().addPendingSync(); return { products };
  }),
  updateProduct: (id, product) => set((state) => {
    const products = state.products.map((item) => item.id === id ? { ...item, ...product } : item);
    persist(products); useAppStore.getState().addPendingSync(); return { products };
  }),
  deactivateProduct: (id) => get().updateProduct(id, { status: "Inativo" }),
  importProducts: () => {
    [
      { name: "Garrafa Térmica 750ml", category: "Acessórios", stock: 40, price: 6000, cost: 3200, emoji: "BOT" },
      { name: "BCAA 240 cápsulas", category: "Suplementos", stock: 20, price: 14000, cost: 7200, emoji: "BCAA" }
    ].forEach((product) => get().addProduct(product));
  },
  reduceStock: (items) => set((state) => {
    const products = state.products.map((product) => {
      const item = items.find((entry) => entry.id === product.id);
      return item ? { ...product, stock: Math.max(0, product.stock - item.qty) } : product;
    });
    persist(products); return { products };
  })
}));
