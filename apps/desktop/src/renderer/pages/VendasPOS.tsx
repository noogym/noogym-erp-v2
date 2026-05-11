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
import { useProductsStore } from "../store/productsStore";
import { toastSuccess } from "../store/toastStore";
import type { ProductRecord } from "@noogym/types";

type CartItem = ProductRecord & { qty: number };

export default function VendasPOS() {
  const [tab, setTab] = useState("Produtos");
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<"finalize" | "clear" | "barcode" | null>(null);
  const products = useProductsStore((state) => state.products);
  const reduceStock = useProductsStore((state) => state.reduceStock);
  const [cart, setCart] = useState<CartItem[]>(products.slice(0, 3).map((product) => ({ ...product, qty: 1 })));
  const filtered = useMemo(() => products.filter((product) => product.status !== "Inativo" && product.name.toLowerCase().includes(query.toLowerCase())), [products, query]);
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  const addToCart = (product: ProductRecord) => setCart((items) => {
    const existing = items.find((item) => item.id === product.id);
    return existing ? items.map((item) => item.id === product.id ? { ...item, qty: item.qty + 1 } : item) : [...items, { ...product, qty: 1 }];
  });

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: "minmax(0, 1fr) 420px" }}>
      <div className="panel p-6">
        <h1 className="text-3xl font-semibold">Vendas (POS)</h1>
        <p className="mt-2 text-sm text-zinc-300">Selecione os produtos e finalize a venda em Kz.</p>
        <Tabs tabs={["Produtos", "Planos", "Aulas avulsas", "Serviços", "Pacotes"]} active={tab} onChange={setTab} />
        <div className="mt-5 grid grid-cols-[1fr_190px_170px] gap-3"><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar produto por nome ou código..." /><Select><option>Todas as categorias</option></Select><Button icon={<Barcode className="h-4 w-4" />} onClick={() => setModal("barcode")}>Código de barras</Button></div>
        <div className="mt-5 grid grid-cols-[190px_1fr] gap-4">
          <Card className="p-3">{["Todos os produtos", "Suplementos", "Bebidas", "Roupas", "Acessórios", "Serviços"].map((cat, index) => <button key={cat} className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm ${index === 0 ? "bg-noogym-lime/10 text-noogym-lime" : "text-zinc-200"}`}><ShoppingCart className="h-4 w-4" /> {cat}</button>)}</Card>
          <div className="grid grid-cols-5 gap-3">
            {filtered.slice(0, 15).map((product) => <Card key={product.id} className="p-3"><ProductVisual label={product.emoji} className="mx-auto h-24 w-full" /><p className="mt-3 text-sm">{product.name}</p><p className="mt-1 text-xs text-zinc-400">Estoque: {product.stock} un</p><p className="mt-1 text-sm font-semibold text-noogym-lime">{money(product.price)}</p><Button className="mt-3 h-8 w-full" icon={<Plus className="h-4 w-4" />} onClick={() => addToCart(product)}>Adicionar</Button></Card>)}
          </div>
        </div>
      </div>
      <aside className="panel p-4">
        <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Carrinho</h2><span className="text-xs text-zinc-400">{cart.length} itens</span><button onClick={() => setModal("clear")}><Trash2 className="h-4 w-4" /></button></div>
        <div className="space-y-2">
          {cart.map((item) => <div key={item.id} className="soft-card flex gap-3 p-3"><ProductVisual label={item.emoji} className="h-14 w-14" /><div className="flex-1"><div className="flex justify-between"><p className="text-sm">{item.name}</p><button onClick={() => setCart((items) => items.filter((entry) => entry.id !== item.id))}><X className="h-4 w-4 text-zinc-500" /></button></div><p className="text-xs text-zinc-400">{money(item.price)}</p><div className="mt-2 flex items-center gap-2 text-xs"><button className="rounded border border-white/10 px-2" onClick={() => setCart((items) => items.map((entry) => entry.id === item.id ? { ...entry, qty: Math.max(1, entry.qty - 1) } : entry))}>-</button><span>{item.qty}</span><button className="rounded border border-white/10 px-2" onClick={() => setCart((items) => items.map((entry) => entry.id === item.id ? { ...entry, qty: entry.qty + 1 } : entry))}>+</button></div></div><p className="self-center text-sm font-semibold">{money(item.price * item.qty)}</p></div>)}
        </div>
        <Card className="mt-3 p-4 shadow-none"><p className="flex justify-between text-sm text-zinc-300">Subtotal <span>{money(total)}</span></p><p className="mt-3 flex justify-between text-sm text-zinc-300">Desconto <button className="text-noogym-lime" onClick={() => setModal("finalize")}>Adicionar desconto</button></p><p className="mt-5 flex justify-between border-t border-white/10 pt-5 text-xl font-semibold">Total <span className="text-noogym-lime">{money(total)}</span></p></Card>
        <Button className="mt-4 w-full" variant="primary" icon={<ShoppingCart className="h-5 w-5" />} onClick={() => setModal("finalize")}>Finalizar venda</Button>
        <div className="mt-3 grid grid-cols-2 gap-2"><Button onClick={() => { toastSuccess("Orçamento salvo com sucesso"); }}>Salvar orçamento</Button><Button onClick={() => setModal("clear")}>Limpar carrinho</Button></div>
      </aside>
      <FinalizeSaleModal open={modal === "finalize"} total={total} onClose={() => setModal(null)} onConfirmed={() => { reduceStock(cart.map((item) => ({ id: item.id, qty: item.qty }))); setCart([]); }} />
      <BarcodeModal open={modal === "barcode"} onClose={() => setModal(null)} />
      <ConfirmModal open={modal === "clear"} title="Limpar carrinho" message="Tem certeza que deseja remover todos os itens do carrinho?" confirmLabel="Limpar carrinho" danger onClose={() => setModal(null)} onConfirm={() => { setCart([]); toastSuccess("Carrinho limpo com sucesso"); setModal(null); }} />
    </div>
  );
}
