import { Barcode, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { ProductVisual } from "../components/ui/ProductVisual";
import { Select } from "../components/ui/Select";
import { Tabs } from "../components/ui/Tabs";
import { money, products } from "../data/mock";

export default function VendasPOS() {
  const [tab, setTab] = useState("Produtos");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => products.filter((product) => product.name.toLowerCase().includes(query.toLowerCase())), [query]);
  const cart = [
    { ...products[0], qty: 1 },
    { ...products[2], qty: 1 },
    { ...products[3], qty: 1 },
    { ...products[4], qty: 2 },
    { ...products[5], qty: 2 }
  ];
  const total = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  return (
    <div className="grid gap-3" style={{ gridTemplateColumns: "minmax(0, 1fr) 420px" }}>
      <div className="panel p-6">
        <h1 className="text-3xl font-semibold">Vendas (POS)</h1>
        <p className="mt-2 text-sm text-zinc-300">Realize vendas de produtos, planos, aulas avulsas e serviços.</p>
        <Tabs tabs={["Produtos", "Planos", "Aulas avulsas", "Serviços", "Pacotes"]} active={tab} onChange={setTab} />
        <div className="mt-5 grid grid-cols-[1fr_190px_100px_170px] gap-3">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar produto por nome ou código..." />
          <Select><option>Todas as categorias</option></Select>
          <Button>Filtros</Button>
          <Button icon={<Barcode className="h-4 w-4" />}>Código de barras</Button>
        </div>
        <div className="mt-5 grid grid-cols-[190px_1fr] gap-4">
          <Card className="p-3">
            {["Todos os produtos", "Suplementos", "Bebidas", "Vestuário", "Acessórios", "Alimentação", "Serviços", "Outros"].map((cat, index) => (
              <button key={cat} className={`flex h-10 w-full items-center gap-3 rounded-md px-3 text-sm ${index === 0 ? "bg-noogym-lime/10 text-noogym-lime" : "text-zinc-200"}`}>
                <ShoppingCart className="h-4 w-4" /> {cat}
              </button>
            ))}
          </Card>
          <div className="grid grid-cols-5 gap-3">
            {filtered.slice(0, 15).map((product) => (
              <Card key={product.id} className="p-3">
                <ProductVisual label={product.emoji} className="mx-auto h-24 w-full" />
                <p className="mt-3 text-sm">{product.name}</p>
                <p className="mt-1 text-xs text-zinc-400">Estoque: {product.stock} un</p>
                <p className="mt-1 text-sm font-semibold text-noogym-lime">{money(product.price)}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
      <aside className="panel p-4">
        <div className="mb-4 flex items-center justify-between"><h2 className="font-semibold">Carrinho de venda</h2><span className="text-xs text-zinc-400">5 itens</span><Trash2 className="h-4 w-4" /></div>
        <div className="space-y-2">
          {cart.map((item) => (
            <div key={item.id} className="soft-card flex gap-3 p-3">
              <ProductVisual label={item.emoji} className="h-14 w-14" />
              <div className="flex-1">
                <div className="flex justify-between"><p className="text-sm">{item.name}</p><X className="h-4 w-4 text-zinc-500" /></div>
                <p className="text-xs text-zinc-400">{money(item.price)}</p>
                <div className="mt-2 flex items-center gap-2 text-xs"><button className="rounded border border-white/10 px-2">−</button><span>{item.qty}</span><button className="rounded border border-white/10 px-2">+</button></div>
              </div>
              <p className="self-center text-sm font-semibold">{money(item.price * item.qty)}</p>
            </div>
          ))}
        </div>
        <Button className="mt-3 w-full justify-start">Adicionar observação (opcional)</Button>
        <Card className="mt-3 p-4 shadow-none">
          <p className="flex justify-between text-sm text-zinc-300">Subtotal <span>{money(total)}</span></p>
          <p className="mt-3 flex justify-between text-sm text-zinc-300">Desconto <span>0 Kz</span></p>
          <p className="mt-5 flex justify-between border-t border-white/10 pt-5 text-xl font-semibold">Total <span className="text-noogym-lime">{money(total)}</span></p>
        </Card>
        <Button className="mt-4 w-full" variant="primary" icon={<ShoppingCart className="h-5 w-5" />}>Finalizar venda</Button>
        <div className="mt-3 grid grid-cols-2 gap-2"><Button>Salvar orçamento</Button><Button>Limpar carrinho</Button></div>
      </aside>
    </div>
  );
}
