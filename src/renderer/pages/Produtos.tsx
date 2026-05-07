import { Download, Edit, Package, Plus, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "../components/ui/Badge";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { MetricCard } from "../components/ui/MetricCard";
import { ProductVisual } from "../components/ui/ProductVisual";
import { Select } from "../components/ui/Select";
import { StatusDot } from "../components/ui/StatusDot";
import { Table } from "../components/ui/Table";
import { Tabs } from "../components/ui/Tabs";
import { money, products } from "../data/mock";

export default function Produtos() {
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => products.filter((product) => product.name.toLowerCase().includes(query.toLowerCase())), [query]);
  const selected = filtered[0] ?? products[0];
  return (
    <div className="page-grid">
      <div className="panel p-6">
        <PageHeader title="Produtos" subtitle="Gerencie o catálogo de produtos, estoque e categorias." actions={<><Button icon={<Download className="h-4 w-4" />}>Importar</Button><Button variant="primary" icon={<Plus className="h-4 w-4" />}>Novo produto</Button></>} />
        <Tabs tabs={["Todos os produtos", "Categorias", "Marcas", "Fornecedores"]} active="Todos os produtos" onChange={() => undefined} />
        <div className="mt-5 grid grid-cols-[1fr_200px_160px_110px] gap-3">
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar produto por nome ou código..." />
          <Select><option>Todas as categorias</option></Select>
          <Select><option>Status: Todos</option></Select>
          <Button icon={<SlidersHorizontal className="h-4 w-4" />}>Filtros</Button>
        </div>
        <div className="mt-4 grid grid-cols-4 gap-4">
          <MetricCard title="Total de produtos" value="120" change="+ 8% vs mês passado" icon={<Package className="h-5 w-5" />} />
          <MetricCard title="Estoque total" value="2.450 un" change="+ 12% vs mês passado" icon={<Package className="h-5 w-5" />} tone="green" />
          <MetricCard title="Valor do estoque" value="1.250.000 Kz" change="+ 15% vs mês passado" icon={<Package className="h-5 w-5" />} tone="yellow" />
          <MetricCard title="Produtos sem estoque" value="8" change="- 3% vs mês passado" icon={<Package className="h-5 w-5" />} tone="red" />
        </div>
        <div className="mt-4">
          <Table columns={["Produto", "Categoria", "Estoque", "Preço de venda", "Valor em estoque", "Status", "Ações"]}>
            {filtered.slice(0, 10).map((product) => (
              <tr key={product.id} className="table-row">
                <td className="px-4 py-3"><div className="flex items-center gap-3"><ProductVisual label={product.emoji} className="h-10 w-10" /><div><p>{product.name}</p><p className="text-xs text-zinc-400">{product.id}</p></div></div></td>
                <td className="px-4 py-3"><Badge tone={product.category === "Suplementos" ? "lime" : product.category === "Alimentação" ? "orange" : "blue"}>{product.category}</Badge></td>
                <td className="px-4 py-3">{product.stock} un</td>
                <td className="px-4 py-3">{money(product.price)}</td>
                <td className="px-4 py-3">{money(product.stock * product.price)}</td>
                <td className="px-4 py-3"><StatusDot label={product.stock < 20 ? "Estoque baixo" : "Ativo"} tone={product.stock < 20 ? "orange" : "lime"} /></td>
                <td className="px-4 py-3"><div className="flex gap-3"><Edit className="h-4 w-4" /><span>▣</span><span>⋮</span></div></td>
              </tr>
            ))}
          </Table>
        </div>
      </div>
      <aside className="panel p-6">
        <ProductVisual label={selected.emoji} className="mx-auto h-32 w-32" />
        <h2 className="mt-5 text-xl font-semibold">{selected.name}</h2>
        <Badge>Ativo</Badge>
        <p className="mt-4 text-2xl font-semibold">{money(selected.price)}</p>
        <div className="mt-4 space-y-3 text-sm text-zinc-300">
          <p>Categoria: {selected.category}</p><p>Marca: Noogym</p><p>Código de barras: 7891234567890</p>
        </div>
        <Tabs tabs={["Detalhes", "Estoque", "Histórico"]} active="Detalhes" onChange={() => undefined} />
        <div className="mt-4 space-y-4 text-sm">
          <p className="text-zinc-400">Proteína concentrada de alta qualidade para auxiliar no ganho de massa muscular.</p>
          <p className="flex justify-between">Fornecedor <span className="text-zinc-400">Noogym Distribuidora</span></p>
          <p className="flex justify-between">Custo <span className="text-zinc-400">{money(selected.cost)}</span></p>
          <p className="flex justify-between">Margem de lucro <span className="text-zinc-400">40%</span></p>
        </div>
        <Button className="mt-5 w-full" icon={<Edit className="h-4 w-4" />}>Editar produto</Button>
        <Button className="mt-3 w-full" variant="danger">Desativar produto</Button>
      </aside>
    </div>
  );
}
