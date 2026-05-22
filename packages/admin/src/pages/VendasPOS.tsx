import { Barcode, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { ConfirmModal } from "../components/modals/ConfirmModal";
import { BarcodeModal, FinalizeSaleModal } from "../components/modals/OperationalModals";
import { Button } from "@noogym/ui";
import { Card } from "@noogym/ui";
import { Input } from "@noogym/ui";
import { ProductVisual } from "../components/ui/ProductVisual";
import { Select } from "@noogym/ui";
import { Tabs } from "@noogym/ui";
import { formatKz as money } from "@noogym/core";
import { useClassesStore } from "../store/classesStore";
import { usePlansStore } from "../store/plansStore";
import { useProductsStore } from "../store/productsStore";
import { toastSuccess } from "../store/toastStore";
import type { ProductRecord } from "@noogym/types";

type CatalogKind = "product" | "plan" | "service" | "class";

type CatalogItem = {
  id: string;
  name: string;
  category: string;
  price: number;
  detail: string;
  emoji: string;
  kind: CatalogKind;
  stock?: number;
};

type CartItem = CatalogItem & { qty: number };

const serviceItems: CatalogItem[] = [
  { id: "SVC-001", name: "Avaliação física", category: "Serviços", price: 8000, detail: "Sessão individual", emoji: "AVL", kind: "service" },
  { id: "SVC-002", name: "Personal trainer", category: "Serviços", price: 12000, detail: "Treino acompanhado", emoji: "PT", kind: "service" },
  { id: "SVC-003", name: "Plano alimentar", category: "Serviços", price: 10000, detail: "Consulta nutricional", emoji: "NUT", kind: "service" },
  { id: "SVC-004", name: "Massagem desportiva", category: "Serviços", price: 15000, detail: "Recuperação muscular", emoji: "MAS", kind: "service" }
];

const priceFromPlan = (price: string) => {
  const numeric = Number(price.split(" ")[0]?.replace(/\./g, "").replace(",", "."));
  return Number.isFinite(numeric) ? numeric : 0;
};

const productToCatalogItem = (product: ProductRecord): CatalogItem => ({
  id: product.id,
  name: product.name,
  category: product.category,
  price: product.price,
  detail: `Estoque: ${product.stock} un`,
  emoji: product.emoji,
  kind: "product",
  stock: product.stock
});

export default function VendasPOS() {
  const [tab, setTab] = useState("Produtos");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<"finalize" | "clear" | "barcode" | null>(null);
  const products = useProductsStore((state) => state.products);
  const reduceStock = useProductsStore((state) => state.reduceStock);
  const plans = usePlansStore((state) => state.plans);
  const classes = useClassesStore((state) => state.classes);
  const [cart, setCart] = useState<CartItem[]>(products.slice(0, 3).map((product) => ({ ...productToCatalogItem(product), qty: 1 })));

  const catalogItems = useMemo(() => {
    const normalizedQuery = query.toLowerCase();
    const items = tab === "Planos"
      ? plans
        .filter((plan) => plan.status !== "Inativo")
        .map((plan) => ({ id: plan.id, name: plan.name, category: plan.category, price: priceFromPlan(plan.price), detail: plan.duration, emoji: "PLN", kind: "plan" as const }))
      : tab === "Serviços"
        ? serviceItems
        : tab === "Aulas"
          ? classes.map((lesson) => ({ id: lesson.id, name: lesson.name, category: lesson.category, price: 3000, detail: `${lesson.time} - ${lesson.instructor}`, emoji: "AUL", kind: "class" as const }))
          : products.filter((product) => product.status !== "Inativo").map(productToCatalogItem);

    return items.filter((item) => `${item.name} ${item.category} ${item.detail}`.toLowerCase().includes(normalizedQuery));
  }, [classes, plans, products, query, tab]);

  const categories = useMemo(() => ["Todos", ...Array.from(new Set(catalogItems.map((item) => item.category)))], [catalogItems]);
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const addToCart = (item: CatalogItem) => setCart((items) => {
    const existing = items.find((entry) => entry.id === item.id && entry.kind === item.kind);
    return existing ? items.map((entry) => entry.id === item.id && entry.kind === item.kind ? { ...entry, qty: entry.qty + 1 } : entry) : [...items, { ...item, qty: 1 }];
  });

  const finalizeSale = () => {
    reduceStock(cart.filter((item) => item.kind === "product").map((item) => ({ id: item.id, qty: item.qty })));
    setCart([]);
  };

  return (
    <div className="pos-layout grid gap-3">
      <div className="panel p-6">
        <h1 className="text-3xl font-semibold">Vendas (POS)</h1>
        <p className="mt-2 text-sm text-zinc-300">Selecione itens e finalize a venda em Kz.</p>
        <Tabs tabs={["Produtos", "Planos", "Aulas", "Serviços"]} active={tab} onChange={setTab} />
        <div className="mt-5 grid grid-cols-[1fr_190px_170px] gap-3">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={`Buscar em ${tab.toLowerCase()}...`} />
          <Select><option>Todas as categorias</option></Select>
          <Button icon={<Barcode className="h-4 w-4" />} onClick={() => setModal("barcode")}>Código de barras</Button>
        </div>
        <div className="mt-5 grid grid-cols-[190px_1fr] gap-4">
          <Card className="p-3">
            {categories.map((cat, index) => (
              <button key={cat} className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm ${index === 0 ? "bg-noogym-lime/10 text-noogym-lime" : "text-zinc-200"}`}>
                <ShoppingCart className="h-4 w-4" /> {cat}
              </button>
            ))}
          </Card>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {catalogItems.slice(0, 15).map((item) => (
              <Card key={`${item.kind}-${item.id}`} className="p-3">
                <ProductVisual label={item.emoji} className="mx-auto h-24 w-full" />
                <p className="mt-3 text-sm">{item.name}</p>
                <p className="mt-1 text-xs text-zinc-400">{item.detail}</p>
                <p className="mt-1 text-sm font-semibold text-noogym-lime">{money(item.price)}</p>
                <Button className="mt-3 h-8 w-full" icon={<Plus className="h-4 w-4" />} onClick={() => addToCart(item)}>Adicionar</Button>
              </Card>
            ))}
          </div>
        </div>
      </div>
      <aside className="panel p-4">
        <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Carrinho</h2><span className="text-xs text-zinc-400">{cart.length} itens</span><button onClick={() => setModal("clear")}><Trash2 className="h-4 w-4" /></button></div>
        <div className="space-y-2">
          {cart.map((item) => <div key={`${item.kind}-${item.id}`} className="soft-card flex gap-3 p-3"><ProductVisual label={item.emoji} className="h-14 w-14" /><div className="flex-1"><div className="flex justify-between"><p className="text-sm">{item.name}</p><button onClick={() => setCart((items) => items.filter((entry) => !(entry.id === item.id && entry.kind === item.kind)))}><X className="h-4 w-4 text-zinc-500" /></button></div><p className="text-xs text-zinc-400">{money(item.price)}</p><div className="mt-2 flex items-center gap-2 text-xs"><button className="rounded border border-white/10 px-2" onClick={() => setCart((items) => items.map((entry) => entry.id === item.id && entry.kind === item.kind ? { ...entry, qty: Math.max(1, entry.qty - 1) } : entry))}>-</button><span>{item.qty}</span><button className="rounded border border-white/10 px-2" onClick={() => setCart((items) => items.map((entry) => entry.id === item.id && entry.kind === item.kind ? { ...entry, qty: entry.qty + 1 } : entry))}>+</button></div></div><p className="self-center text-sm font-semibold">{money(item.price * item.qty)}</p></div>)}
        </div>
        <Card className="mt-3 p-4 shadow-none"><p className="flex justify-between text-sm text-zinc-300">Subtotal <span>{money(total)}</span></p><p className="mt-3 flex justify-between text-sm text-zinc-300">Desconto <button className="text-noogym-lime" onClick={() => setModal("finalize")}>Adicionar desconto</button></p><p className="mt-5 flex justify-between border-t border-white/10 pt-5 text-xl font-semibold">Total <span className="text-noogym-lime">{money(total)}</span></p></Card>
        <Button className="mt-4 w-full" variant="primary" icon={<ShoppingCart className="h-5 w-5" />} onClick={() => setModal("finalize")}>Finalizar venda</Button>
        <div className="mt-3 grid grid-cols-2 gap-2"><Button onClick={() => { toastSuccess("Orçamento salvo com sucesso"); }}>Salvar orçamento</Button><Button onClick={() => setModal("clear")}>Limpar carrinho</Button></div>
      </aside>
      <FinalizeSaleModal open={modal === "finalize"} total={total} onClose={() => setModal(null)} onConfirmed={finalizeSale} />
      <BarcodeModal open={modal === "barcode"} onClose={() => setModal(null)} />
      <ConfirmModal open={modal === "clear"} title="Limpar carrinho" message="Tem certeza que deseja remover todos os itens do carrinho?" confirmLabel="Limpar carrinho" danger onClose={() => setModal(null)} onConfirm={() => { setCart([]); toastSuccess("Carrinho limpo com sucesso"); setModal(null); }} />
    </div>
  );
}
