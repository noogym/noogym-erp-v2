import { create } from "zustand";
import { products as mockProducts } from "../data/mock";
import { createResource, listResource, productFromApi, productToDto, updateResource } from "../lib/domainApi";
import { readLocal, uid, writeLocal } from "../lib/storage";
import { useAppStore } from "./appStore";
import { useAuthStore } from "./authStore";
import { useNotificationsStore } from "./notificationsStore";
import type { ProductCategoryRecord, ProductRecord, ProductStockMovementRecord } from "@noogym/types";

const categoryColors = ["#B6FF00", "#38BDF8", "#A855F7", "#F59E0B", "#2DD4BF", "#FB7185", "#94A3B8"];
const initialCategoryNames = ["Suplementos", "Roupas", "Acessorios", "Bebidas", "Outros"];
const initialProducts: ProductRecord[] = mockProducts.map((product) => ({ ...product, sku: product.id, barcode: "7891234567890", status: "Ativo", unit: "Unidade", minStock: 10 }));
const persist = (products: ProductRecord[]) => writeLocal("noogym:products", products);
const persistCategories = (categories: ProductCategory[]) => writeLocal("noogym:product-categories", categories);
const persistMovements = (movements: ProductStockMovementRecord[]) => writeLocal("noogym:product-stock-movements", movements);

export type ProductCategory = ProductCategoryRecord;
export type ProductCategoryInput = Partial<ProductCategory> & { name: string };

const categoryFromName = (name: string, index = 0): ProductCategory => ({
  id: uid("PCAT"),
  name,
  icon: "Produto",
  color: categoryColors[index % categoryColors.length],
  status: "Ativo",
  order: index + 1
});

const normalize = (value: string) => value.trim().toLowerCase();
const uniqueCategories = (categories: ProductCategory[]) => {
  const seen = new Set<string>();
  return categories
    .filter((category) => {
      const key = normalize(category.name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
};

const readCategories = () => {
  const saved = readLocal<Array<ProductCategory | string>>("noogym:product-categories", []);
  if (saved.length) {
    return uniqueCategories(saved.map((category, index) => typeof category === "string" ? categoryFromName(category, index) : { ...categoryFromName(category.name, index), ...category }));
  }
  return initialCategoryNames.map(categoryFromName);
};

const movementLabel = () => new Intl.DateTimeFormat("pt-AO", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date());

const movementFromStockChange = (product: ProductRecord, quantity: number, previousStock: number, nextStock: number, type: ProductStockMovementRecord["type"], reason: string): ProductStockMovementRecord => ({
  id: uid("MOV"),
  productId: product.id,
  productName: product.name,
  type,
  quantity,
  previousStock,
  nextStock,
  reason,
  user: "Admin",
  dateTime: movementLabel()
});
const notifyStockIfNeeded = (product: ProductRecord) => {
  if (product.status === "Inativo") return;
  const minStock = product.minStock ?? 10;
  if (product.stock > minStock) return;
  useNotificationsStore.getState().addNotification({
    sourceId: `event:products:stock:${product.id}`,
    title: product.stock <= 0 ? "Produto sem estoque" : "Produto com estoque baixo",
    description: `${product.name}: ${product.stock}/${minStock} ${product.unit ?? "un"}.`,
    category: "products",
    tone: product.stock <= 0 ? "danger" : "warning",
    route: "produtos",
    actionLabel: "Repor estoque"
  });
};

export const useProductsStore = create<{
  products: ProductRecord[];
  categories: ProductCategory[];
  movements: ProductStockMovementRecord[];
  loadOnline: () => Promise<void>;
  addProduct: (product: Partial<ProductRecord>) => void;
  updateProduct: (id: string, product: Partial<ProductRecord>) => void;
  deactivateProduct: (id: string) => void;
  setProductStatus: (id: string, status: string) => void;
  adjustStock: (id: string, type: ProductStockMovementRecord["type"], quantity: number, reason?: string) => void;
  importProducts: () => void;
  addCategory: (category: string | ProductCategoryInput) => boolean;
  updateCategory: (name: string, category: ProductCategoryInput) => boolean;
  toggleCategoryStatus: (name: string) => boolean;
  reduceStock: (items: { id: string; qty: number }[], options?: { sync?: boolean }) => void;
}>((set, get) => ({
  products: readLocal("noogym:products", initialProducts),
  categories: readCategories(),
  movements: readLocal("noogym:product-stock-movements", []),
  loadOnline: async () => {
    const token = useAuthStore.getState().accessToken;
    if (!token) return;
    const apiProducts = await listResource<Record<string, unknown>>("products", token);
    const products = apiProducts.map(productFromApi);
    const categories = uniqueCategories([...get().categories, ...products.map((product, index) => categoryFromName(product.category, index))]);
    persist(products);
    persistCategories(categories);
    set({ products, categories });
  },
  addProduct: (product) => set((state) => {
    const created: ProductRecord = { id: uid("PRD"), name: "Novo produto", category: "Suplementos", stock: 0, price: 0, cost: 0, emoji: "PRD", status: "Ativo", unit: "Unidade", minStock: 10, ...product };
    const products = [created, ...state.products];
    const categories = state.categories.some((category) => normalize(category.name) === normalize(created.category)) ? state.categories : uniqueCategories([...state.categories, categoryFromName(created.category, state.categories.length)]);
    persist(products);
    persistCategories(categories);
    useAppStore.getState().addPendingSync();
    notifyStockIfNeeded(created);

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

    return { products, categories };
  }),
  updateProduct: (id, product) => set((state) => {
    const nextProduct = { ...state.products.find((item) => item.id === id), ...product };
    const products = state.products.map((item) => item.id === id ? { ...item, ...product } : item);
    persist(products);
    useAppStore.getState().addPendingSync();
    const updatedProduct = products.find((item) => item.id === id);
    if (updatedProduct) notifyStockIfNeeded(updatedProduct);

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
  setProductStatus: (id, status) => get().updateProduct(id, { status }),
  adjustStock: (id, type, quantity, reason = "Ajuste manual") => set((state) => {
    const rounded = Math.max(0, Math.round(quantity));
    if (!rounded && type !== "Ajuste") return state;
    let movement: ProductStockMovementRecord | undefined;
    let updatedProduct: ProductRecord | undefined;
    const products = state.products.map((product) => {
      if (product.id !== id) return product;
      const previousStock = product.stock;
      const nextStock = type === "Entrada" ? previousStock + rounded : type === "Saida" ? Math.max(0, previousStock - rounded) : rounded;
      movement = movementFromStockChange(product, type === "Ajuste" ? Math.abs(nextStock - previousStock) : rounded, previousStock, nextStock, type, reason);
      const nextProduct = { ...product, stock: nextStock };
      updatedProduct = nextProduct;
      return nextProduct;
    });
    const movements = movement ? [movement, ...state.movements] : state.movements;
    persist(products);
    persistMovements(movements);
    useAppStore.getState().addPendingSync();
    if (updatedProduct) notifyStockIfNeeded(updatedProduct);
    return { products, movements };
  }),
  importProducts: () => {
    [
      { name: "Garrafa Termica 750ml", category: "Acessorios", stock: 40, price: 6000, cost: 3200, emoji: "BOT", unit: "Unidade", minStock: 8 },
      { name: "BCAA 240 capsulas", category: "Suplementos", stock: 20, price: 14000, cost: 7200, emoji: "BCAA", unit: "Unidade", minStock: 6 }
    ].forEach((product) => get().addProduct(product));
  },
  addCategory: (category) => {
    const input = typeof category === "string" ? { name: category } : category;
    const exists = get().categories.some((item) => normalize(item.name) === normalize(input.name));
    if (exists) return false;
    const categories = uniqueCategories([...get().categories, { ...categoryFromName(input.name, get().categories.length), ...input, id: input.id ?? uid("PCAT"), icon: input.icon ?? "Produto", color: input.color ?? categoryColors[get().categories.length % categoryColors.length], status: input.status ?? "Ativo", order: input.order ?? get().categories.length + 1 }]);
    persistCategories(categories);
    set({ categories });
    return true;
  },
  updateCategory: (name, category) => {
    const target = normalize(name);
    const nextName = normalize(category.name);
    const duplicate = get().categories.some((item) => normalize(item.name) === nextName && normalize(item.name) !== target);
    if (duplicate) return false;
    const categories = uniqueCategories(get().categories.map((item) => normalize(item.name) === target ? { ...item, ...category, name: category.name.trim() } : item));
    const products = get().products.map((product) => normalize(product.category) === target ? { ...product, category: category.name.trim() } : product);
    persistCategories(categories);
    persist(products);
    set({ categories, products });
    return true;
  },
  toggleCategoryStatus: (name) => {
    const target = normalize(name);
    const categories = get().categories.map((category) => normalize(category.name) === target ? { ...category, status: category.status === "Ativo" ? "Inativo" as const : "Ativo" as const } : category);
    persistCategories(categories);
    set({ categories });
    return true;
  },
  reduceStock: (items, options) => set((state) => {
    const movements: ProductStockMovementRecord[] = [];
    const products = state.products.map((product) => {
      const item = items.find((entry) => entry.id === product.id);
      if (!item) return product;
      const nextStock = Math.max(0, product.stock - item.qty);
      movements.push(movementFromStockChange(product, item.qty, product.stock, nextStock, "Saida", "Venda POS"));
      return { ...product, stock: nextStock };
    });
    const nextMovements = movements.length ? [...movements, ...state.movements] : state.movements;
    persist(products);
    persistMovements(nextMovements);

    const token = useAuthStore.getState().accessToken;
    if (options?.sync !== false && useAppStore.getState().onlineOnly && token) {
      items.forEach((item) => {
        const product = state.products.find((entry) => entry.id === item.id);
        if (!product) return;
        updateResource<Record<string, unknown>>("products", item.id, token, productToDto({ ...product, stock: Math.max(0, product.stock - item.qty) })).catch(console.error);
      });
    }

    return { products, movements: nextMovements };
  })
}));
