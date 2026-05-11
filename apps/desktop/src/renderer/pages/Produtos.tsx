import { Download, Edit, Package, Plus, Tag } from "lucide-react";
import { useMemo, useState } from "react";
import { ConfirmModal } from "../components/modals/ConfirmModal";
import { ImportModal } from "../components/modals/ImportModal";
import { CategoryModal, ProductFormModal } from "../components/modals/OperationalModals";
import { PageHeader } from "../components/layout/PageHeader";
import { Badge } from "@noogym/ui";
import { Button } from "@noogym/ui";
import { Card } from "@noogym/ui";
import { Input } from "@noogym/ui";
import { MetricCard } from "@noogym/ui";
import { ProductVisual } from "../components/ui/ProductVisual";
import { Select } from "@noogym/ui";
import { StatusDot } from "../components/ui/StatusDot";
import { Table } from "@noogym/ui";
import { formatKz as money } from "@noogym/core";
import { useProductsStore } from "../store/productsStore";
import { toastSuccess } from "../store/toastStore";
import type { ProductRecord } from "@noogym/types";

export default function Produtos() {
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<"new" | "edit" | "import" | "deactivate" | "category" | null>(null);
  const [selected, setSelected] = useState<ProductRecord | undefined>();
  const products = useProductsStore((state) => state.products);
  const importProducts = useProductsStore((state) => state.importProducts);
  const deactivateProduct = useProductsStore((state) => state.deactivateProduct);
  const filtered = useMemo(() => products.filter((product) => `${product.name} ${product.category} ${product.id}`.toLowerCase().includes(query.toLowerCase())), [products, query]);
  const activeProduct = selected ?? filtered[0] ?? products[0];
  const stockValue = activeProduct ? activeProduct.stock * activeProduct.price : 0;

  return (
    <div className="page-grid">
      <div className="panel p-6">
        <PageHeader title="Produtos" subtitle="Gerencie o estoque de produtos, suplementos e itens disponíveis para venda." actions={<><Button icon={<Download className="h-4 w-4" />} onClick={() => setModal("import")}>Importar</Button><Button icon={<Tag className="h-4 w-4" />} onClick={() => setModal("category")}>Nova categoria</Button><Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => { setSelected(undefined); setModal("new"); }}>Novo produto</Button></>} />
        <div className="grid grid-cols-4 gap-4">
          <MetricCard title="Total de produtos" value={String(products.length)} change="+ 8% vs mês passado" icon={<Package className="h-5 w-5" />} />
          <MetricCard title="Estoque total" value={`${products.reduce((sum, item) => sum + item.stock, 0)} un`} change="+ 12% vs mês passado" icon={<Package className="h-5 w-5" />} tone="green" />
          <MetricCard title="Valor do estoque" value={money(products.reduce((sum, item) => sum + item.stock * item.price, 0))} change="+ 15% vs mês passado" icon={<Package className="h-5 w-5" />} tone="yellow" />
          <MetricCard title="Produtos sem estoque" value={String(products.filter((item) => item.stock === 0).length)} change="Monitorar reposição" icon={<Package className="h-5 w-5" />} tone="red" />
        </div>
        <div className="mt-5 grid grid-cols-[1fr_200px_160px] gap-3"><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar produto por nome ou código..." /><Select><option>Todas as categorias</option></Select><Select><option>Status: Todos</option></Select></div>
        <div className="mt-4">
          <Table columns={["Produto", "Categoria", "Estoque", "Preço", "Valor em estoque", "Status", "Ações"]}>
            {filtered.slice(0, 12).map((product) => (
              <tr key={product.id} className="table-row cursor-pointer" onClick={() => setSelected(product)}>
                <td className="px-4 py-3"><div className="flex items-center gap-3"><ProductVisual label={product.emoji} className="h-10 w-10" /><div><p>{product.name}</p><p className="text-xs text-zinc-400">{product.sku ?? product.id}</p></div></div></td>
                <td className="px-4 py-3"><Badge>{product.category}</Badge></td>
                <td className={`px-4 py-3 ${product.stock < 20 ? "text-red-300" : "text-noogym-lime"}`}>{product.stock} un</td>
                <td className="px-4 py-3">{money(product.price)}</td>
                <td className="px-4 py-3">{money(product.stock * product.price)}</td>
                <td className="px-4 py-3"><StatusDot label={product.status ?? "Ativo"} tone={product.status === "Inativo" ? "red" : product.stock < 20 ? "orange" : "lime"} /></td>
                <td className="px-4 py-3"><div className="flex gap-3" onClick={(event) => event.stopPropagation()}><button onClick={() => { setSelected(product); setModal("edit"); }}><Edit className="h-4 w-4" /></button><button onClick={() => { setSelected(product); setModal("deactivate"); }} className="text-red-300">Desativar</button></div></td>
              </tr>
            ))}
          </Table>
        </div>
      </div>
      <aside className="space-y-3">
        {activeProduct ? <Card className="p-6"><ProductVisual label={activeProduct.emoji} className="mx-auto h-28 w-28" /><h2 className="mt-5 text-xl font-semibold">{activeProduct.name}</h2><Badge>{activeProduct.status ?? "Ativo"}</Badge><p className="mt-4 text-2xl font-semibold">{money(activeProduct.price)}</p><div className="mt-4 space-y-3 text-sm text-zinc-300"><p>Categoria: {activeProduct.category}</p><p>Código: {activeProduct.id}</p><p>Estoque atual: {activeProduct.stock} un</p><p>Valor em estoque: {money(stockValue)}</p></div><Button className="mt-5 w-full" onClick={() => setModal("edit")}>Editar produto</Button><Button className="mt-3 w-full" variant="danger" onClick={() => setModal("deactivate")}>Desativar produto</Button></Card> : null}
        <Card className="p-5"><h2 className="font-semibold">Categorias</h2>{["Suplementos", "Roupas", "Acessórios", "Bebidas", "Outros"].map((cat) => <p key={cat} className="flex justify-between border-b border-white/[0.07] py-3 text-sm"><span>{cat}</span><span>{products.filter((product) => product.category === cat).length} produtos</span></p>)}<button className="mt-3 text-noogym-lime" onClick={() => setModal("category")}>+ Nova categoria</button></Card>
      </aside>
      <ProductFormModal open={modal === "new"} onClose={() => setModal(null)} />
      <ProductFormModal open={modal === "edit"} product={activeProduct} onClose={() => setModal(null)} />
      <ImportModal open={modal === "import"} title="Importar produtos" fields={["Nome do produto", "Categoria", "Código de barras", "Preço de venda", "Preço de custo", "Estoque inicial", "Unidade"]} examples={["Whey Protein 900g", "Suplementos", "7891234567890", "25000.00", "15000.00", "25", "Un"]} tips={["O código de barras deve ser único.", "Preços usam ponto decimal.", "Estoque deve ser um número inteiro."]} confirmLabel="Importar produtos" onClose={() => setModal(null)} onConfirm={() => { importProducts(); toastSuccess("Produtos importados com sucesso"); setModal(null); }} />
      <ConfirmModal open={modal === "deactivate"} title="Desativar produto" message="O produto será ocultado nas vendas POS, mas permanecerá cadastrado no sistema." confirmLabel="Desativar produto" danger details={activeProduct ? <div className="text-sm"><p>Produto: {activeProduct.name}</p><p>Código: {activeProduct.id}</p><p>Categoria: {activeProduct.category}</p><p>Estoque atual: {activeProduct.stock} un</p><p>Preço de venda: {money(activeProduct.price)}</p><p>Valor em estoque: {money(stockValue)}</p></div> : null} onClose={() => setModal(null)} onConfirm={() => { if (activeProduct) deactivateProduct(activeProduct.id); toastSuccess("Produto desativado com sucesso"); setModal(null); }} />
      <CategoryModal open={modal === "category"} title="Nova categoria" onClose={() => setModal(null)} />
    </div>
  );
}
