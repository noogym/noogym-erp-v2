import { Archive, Download, Edit, Eye, Package, Plus, RotateCcw, Search, Tag, Trash2, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { ConfirmModal } from "../components/modals/ConfirmModal";
import { ImportModal } from "../components/modals/ImportModal";
import { CategoryModal, ProductFormModal, StockMovementModal } from "../components/modals/OperationalModals";
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
import { Tabs } from "@noogym/ui";
import { formatKz as money } from "@noogym/core";
import { useProductsStore } from "../store/productsStore";
import { useSalesStore } from "../store/salesStore";
import { toastSuccess } from "../store/toastStore";
import type { ProductCategoryRecord, ProductRecord } from "@noogym/types";

const tabs = ["Produtos", "Estoque", "Categorias", "Movimentacoes", "Relatorios"];

function productStatus(product: ProductRecord) {
  if (product.status === "Inativo") return "Inativo";
  if (product.stock <= 0) return "Sem estoque";
  if (product.stock <= (product.minStock ?? 10)) return "Estoque baixo";
  return "Ativo";
}

function statusTone(status: string) {
  if (status === "Ativo") return "lime";
  if (status === "Estoque baixo") return "orange";
  if (status === "Sem estoque") return "red";
  return "gray";
}

function downloadProducts(products: ProductRecord[]) {
  const header = ["Nome", "Categoria", "SKU", "Codigo de barras", "Estoque", "Minimo", "Preco", "Custo", "Status"];
  const rows = products.map((product) => [product.name, product.category, product.sku ?? "", product.barcode ?? "", product.stock, product.minStock ?? 0, product.price, product.cost, product.status ?? "Ativo"]);
  const csv = [header, ...rows].map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "produtos.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function Produtos() {
  const [activeTab, setActiveTab] = useState(tabs[0]);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Todas as categorias");
  const [statusFilter, setStatusFilter] = useState("Status: Todos");
  const [modal, setModal] = useState<"new" | "edit" | "import" | "deactivate" | "category" | "editCategory" | "stock" | null>(null);
  const [selected, setSelected] = useState<ProductRecord | undefined>();
  const [selectedCategory, setSelectedCategory] = useState<ProductCategoryRecord | null>(null);
  const products = useProductsStore((state) => state.products);
  const categories = useProductsStore((state) => state.categories);
  const movements = useProductsStore((state) => state.movements);
  const importProducts = useProductsStore((state) => state.importProducts);
  const deactivateProduct = useProductsStore((state) => state.deactivateProduct);
  const addCategory = useProductsStore((state) => state.addCategory);
  const updateCategory = useProductsStore((state) => state.updateCategory);
  const toggleCategoryStatus = useProductsStore((state) => state.toggleCategoryStatus);
  const sales = useSalesStore((state) => state.sales);

  const categoryOptions = useMemo(() => ["Todas as categorias", ...categories.map((category) => category.name)], [categories]);
  const filtered = useMemo(() => products.filter((product) => {
    const text = `${product.name} ${product.category} ${product.id} ${product.sku ?? ""} ${product.barcode ?? ""}`.toLowerCase();
    const status = productStatus(product);
    const matchesQuery = text.includes(query.toLowerCase());
    const matchesCategory = categoryFilter === "Todas as categorias" || product.category === categoryFilter;
    const matchesStatus = statusFilter === "Status: Todos" || statusFilter.replace("Status: ", "") === status;
    return matchesQuery && matchesCategory && matchesStatus;
  }), [categoryFilter, products, query, statusFilter]);
  const activeProduct = selected ?? filtered[0] ?? products[0];
  const lowStock = products.filter((product) => productStatus(product) === "Estoque baixo");
  const outOfStock = products.filter((product) => product.stock <= 0);
  const stockValue = products.reduce((sum, item) => sum + item.stock * item.price, 0);
  const stockCost = products.reduce((sum, item) => sum + item.stock * item.cost, 0);
  const marginValue = stockValue - stockCost;

  const productSales = useMemo(() => {
    const rows = products.map((product) => {
      const sold = sales.flatMap((sale) => sale.items ?? []).filter((item) => item.kind === "product" && (item.productId === product.id || item.name === product.name));
      const quantity = sold.reduce((sum, item) => sum + item.quantity, 0);
      const revenue = sold.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      return { product, quantity, revenue, margin: revenue - quantity * product.cost };
    });
    return rows.sort((a, b) => b.quantity - a.quantity);
  }, [products, sales]);

  const saveCategory = (category: ProductCategoryRecord) => selectedCategory ? updateCategory(selectedCategory.name, category) : addCategory(category);

  return (
    <div className="page-grid">
      <div className="panel p-6">
        <PageHeader
          title="Produtos"
          subtitle="Gerencie catalogo, estoque, categorias e movimentacoes para venda no POS."
          actions={<><Button icon={<Download className="h-4 w-4" />} onClick={() => setModal("import")}>Importar</Button><Button icon={<Tag className="h-4 w-4" />} onClick={() => { setSelectedCategory(null); setModal("category"); }}>Nova categoria</Button><Button variant="primary" icon={<Plus className="h-4 w-4" />} onClick={() => { setSelected(undefined); setModal("new"); }}>Novo produto</Button></>}
        />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MetricCard title="Total de produtos" value={String(products.length)} change={`${categories.length} categorias`} icon={<Package className="h-5 w-5" />} />
          <MetricCard title="Valor do estoque" value={money(stockValue)} change={`Custo: ${money(stockCost)}`} icon={<Package className="h-5 w-5" />} tone="yellow" />
          <MetricCard title="Reposicao necessaria" value={String(lowStock.length + outOfStock.length)} change={`${outOfStock.length} sem estoque`} icon={<Archive className="h-5 w-5" />} tone="red" />
          <MetricCard title="Margem estimada" value={money(marginValue)} change={`${productSales.reduce((sum, row) => sum + row.quantity, 0)} un vendidas`} icon={<TrendingUp className="h-5 w-5" />} tone="green" />
        </div>

        <Tabs tabs={tabs} active={activeTab} onChange={setActiveTab} />

        {activeTab === "Produtos" && (
          <div className="space-y-4">
            <div className="grid gap-3 xl:grid-cols-[1fr_220px_180px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input className="pl-10" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar produto por nome, SKU ou codigo..." />
              </div>
              <Select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>{categoryOptions.map((category) => <option key={category}>{category}</option>)}</Select>
              <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>{["Status: Todos", "Status: Ativo", "Status: Estoque baixo", "Status: Sem estoque", "Status: Inativo"].map((status) => <option key={status}>{status}</option>)}</Select>
            </div>
            <Table columns={["Produto", "Categoria", "Estoque", "Minimo", "Preco", "Margem", "Status", "Acoes"]}>
              {filtered.map((product) => {
                const status = productStatus(product);
                const margin = product.price - product.cost;
                return (
                  <tr key={product.id} className="table-row cursor-pointer" onClick={() => setSelected(product)}>
                    <td className="px-4 py-3"><div className="flex items-center gap-3"><ProductVisual label={product.emoji} className="h-10 w-10" /><div><p>{product.name}</p><p className="text-xs text-zinc-400">{product.sku ?? product.id}</p></div></div></td>
                    <td className="px-4 py-3"><Badge>{product.category}</Badge></td>
                    <td className={`px-4 py-3 ${status === "Sem estoque" ? "text-red-300" : status === "Estoque baixo" ? "text-orange-300" : "text-noogym-lime"}`}>{product.stock} {product.unit ?? "un"}</td>
                    <td className="px-4 py-3">{product.minStock ?? 10}</td>
                    <td className="px-4 py-3">{money(product.price)}</td>
                    <td className={`px-4 py-3 ${margin >= 0 ? "text-noogym-lime" : "text-red-300"}`}>{money(margin)}</td>
                    <td className="px-4 py-3"><StatusDot label={status} tone={statusTone(status)} /></td>
                    <td className="px-4 py-3"><div className="flex flex-wrap gap-3" onClick={(event) => event.stopPropagation()}><button title="Ver" onClick={() => setSelected(product)}><Eye className="h-4 w-4" /></button><button title="Editar" onClick={() => { setSelected(product); setModal("edit"); }}><Edit className="h-4 w-4" /></button><button title="Estoque" onClick={() => { setSelected(product); setModal("stock"); }}><RotateCcw className="h-4 w-4" /></button><button className="text-red-300" onClick={() => { setSelected(product); setModal("deactivate"); }}><Trash2 className="h-4 w-4" /></button></div></td>
                  </tr>
                );
              })}
            </Table>
            {!filtered.length && <p className="rounded-lg border border-white/10 p-6 text-center text-sm text-zinc-400">Nenhum produto encontrado para os filtros selecionados.</p>}
          </div>
        )}

        {activeTab === "Estoque" && (
          <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
            <Table columns={["Produto", "Atual", "Minimo", "Valor parado", "Situacao", "Acao"]}>
              {[...lowStock, ...products.filter((product) => productStatus(product) === "Ativo")].map((product) => {
                const status = productStatus(product);
                return (
                  <tr key={product.id} className="table-row">
                    <td className="px-4 py-3"><div className="flex items-center gap-3"><ProductVisual label={product.emoji} className="h-9 w-9" />{product.name}</div></td>
                    <td className="px-4 py-3">{product.stock} {product.unit ?? "un"}</td>
                    <td className="px-4 py-3">{product.minStock ?? 10}</td>
                    <td className="px-4 py-3">{money(product.stock * product.price)}</td>
                    <td className="px-4 py-3"><StatusDot label={status} tone={statusTone(status)} /></td>
                    <td className="px-4 py-3"><Button className="h-8" onClick={() => { setSelected(product); setModal("stock"); }}>Movimentar</Button></td>
                  </tr>
                );
              })}
            </Table>
            <Card className="p-5">
              <h2 className="font-semibold">Alertas de reposicao</h2>
              <div className="mt-3 space-y-2">
                {[...outOfStock, ...lowStock].slice(0, 8).map((product) => <button key={product.id} className="flex w-full items-center justify-between rounded-md border border-white/10 p-3 text-left text-sm" onClick={() => { setSelected(product); setModal("stock"); }}><span>{product.name}</span><span className="text-orange-300">{product.stock}/{product.minStock ?? 10}</span></button>)}
                {!outOfStock.length && !lowStock.length && <p className="rounded-md border border-white/10 p-4 text-sm text-zinc-400">Nenhum produto abaixo do minimo.</p>}
              </div>
            </Card>
          </div>
        )}

        {activeTab === "Categorias" && (
          <Table columns={["Categoria", "Produtos", "Estoque", "Valor", "Status", "Acoes"]}>
            {categories.map((category) => {
              const categoryProducts = products.filter((product) => product.category === category.name);
              return (
                <tr key={category.id ?? category.name} className="table-row">
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} /><Badge>{category.name}</Badge></div></td>
                  <td className="px-4 py-3">{categoryProducts.length}</td>
                  <td className="px-4 py-3">{categoryProducts.reduce((sum, product) => sum + product.stock, 0)} un</td>
                  <td className="px-4 py-3">{money(categoryProducts.reduce((sum, product) => sum + product.stock * product.price, 0))}</td>
                  <td className="px-4 py-3"><StatusDot label={category.status} tone={category.status === "Ativo" ? "lime" : "gray"} /></td>
                  <td className="px-4 py-3"><div className="flex gap-3"><button onClick={() => { setSelectedCategory(category); setModal("editCategory"); }}><Edit className="h-4 w-4" /></button><button onClick={() => { toggleCategoryStatus(category.name); toastSuccess("Categoria atualizada"); }}>{category.status === "Ativo" ? "Desativar" : "Ativar"}</button></div></td>
                </tr>
              );
            })}
          </Table>
        )}

        {activeTab === "Movimentacoes" && (
          <Table columns={["Data", "Produto", "Tipo", "Quantidade", "Anterior", "Atual", "Motivo", "Usuario"]}>
            {movements.slice(0, 80).map((movement) => (
              <tr key={movement.id} className="table-row">
                <td className="px-4 py-3">{movement.dateTime}</td>
                <td className="px-4 py-3">{movement.productName}</td>
                <td className="px-4 py-3"><Badge>{movement.type}</Badge></td>
                <td className="px-4 py-3">{movement.quantity}</td>
                <td className="px-4 py-3">{movement.previousStock}</td>
                <td className="px-4 py-3">{movement.nextStock}</td>
                <td className="px-4 py-3 text-zinc-400">{movement.reason}</td>
                <td className="px-4 py-3">{movement.user}</td>
              </tr>
            ))}
          </Table>
        )}

        {activeTab === "Relatorios" && (
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5"><h3 className="font-semibold">Mais vendido</h3><p className="mt-4 text-xl font-bold">{productSales[0]?.product.name ?? "Sem vendas"}</p><p className="mt-2 text-sm text-zinc-400">{productSales[0]?.quantity ?? 0} unidades</p></Card>
            <Card className="p-5"><h3 className="font-semibold">Receita em produtos</h3><p className="mt-4 text-2xl font-bold">{money(productSales.reduce((sum, row) => sum + row.revenue, 0))}</p><p className="mt-2 text-sm text-zinc-400">baseada nas vendas POS</p></Card>
            <Card className="p-5"><h3 className="font-semibold">Margem realizada</h3><p className="mt-4 text-2xl font-bold text-noogym-lime">{money(productSales.reduce((sum, row) => sum + row.margin, 0))}</p><p className="mt-2 text-sm text-zinc-400">receita menos custo cadastrado</p></Card>
            <Card className="p-5 lg:col-span-3">
              <h3 className="mb-4 font-semibold">Ranking de vendas</h3>
              <div className="space-y-3">
                {productSales.slice(0, 8).map((row) => {
                  const max = Math.max(1, productSales[0]?.quantity ?? 1);
                  return <div key={row.product.id} className="grid grid-cols-[220px_1fr_80px_120px] items-center gap-3 text-sm"><span>{row.product.name}</span><span className="h-2 rounded-full bg-white/10"><span className="block h-2 rounded-full bg-noogym-lime" style={{ width: `${Math.max(8, (row.quantity / max) * 100)}%` }} /></span><span className="text-right">{row.quantity} un</span><span className="text-right text-noogym-lime">{money(row.revenue)}</span></div>;
                })}
              </div>
            </Card>
          </div>
        )}
      </div>

      <aside className="space-y-3">
        {activeProduct ? <Card className="p-6"><ProductVisual label={activeProduct.emoji} className="mx-auto h-28 w-28" /><h2 className="mt-5 text-xl font-semibold">{activeProduct.name}</h2><Badge>{productStatus(activeProduct)}</Badge><p className="mt-4 text-2xl font-semibold">{money(activeProduct.price)}</p><div className="mt-4 space-y-3 text-sm text-zinc-300"><p>Categoria: {activeProduct.category}</p><p>Codigo: {activeProduct.sku ?? activeProduct.id}</p><p>Estoque atual: {activeProduct.stock} {activeProduct.unit ?? "un"}</p><p>Estoque minimo: {activeProduct.minStock ?? 10}</p><p>Valor em estoque: {money(activeProduct.stock * activeProduct.price)}</p></div><Button className="mt-5 w-full" onClick={() => setModal("edit")}>Editar produto</Button><Button className="mt-3 w-full" onClick={() => setModal("stock")}>Movimentar estoque</Button><Button className="mt-3 w-full" variant="danger" onClick={() => setModal("deactivate")}>Desativar produto</Button></Card> : null}
        <Card className="p-5"><h2 className="font-semibold">Acoes rapidas</h2><Button className="mt-3 w-full" onClick={() => downloadProducts(filtered)}>Exportar produtos</Button><Button className="mt-2 w-full" onClick={() => setActiveTab("Estoque")}>Ver alertas de estoque</Button><Button className="mt-2 w-full" onClick={() => { setSelectedCategory(null); setModal("category"); }}>Nova categoria</Button></Card>
      </aside>

      <ProductFormModal open={modal === "new"} onClose={() => setModal(null)} />
      <ProductFormModal open={modal === "edit"} product={activeProduct} onClose={() => setModal(null)} />
      <StockMovementModal open={modal === "stock"} product={activeProduct} onClose={() => setModal(null)} />
      <ImportModal open={modal === "import"} title="Importar produtos" fields={["Nome do produto", "Categoria", "Codigo de barras", "Preco de venda", "Preco de custo", "Estoque inicial", "Unidade"]} examples={["Whey Protein 900g", "Suplementos", "7891234567890", "25000.00", "15000.00", "25", "Un"]} tips={["O codigo de barras deve ser unico.", "Precos usam ponto decimal.", "Estoque deve ser um numero inteiro."]} confirmLabel="Importar produtos" onClose={() => setModal(null)} onConfirm={() => { importProducts(); toastSuccess("Produtos importados com sucesso"); setModal(null); }} />
      <ConfirmModal open={modal === "deactivate"} title="Desativar produto" message="O produto sera ocultado nas vendas POS, mas permanecera cadastrado no sistema." confirmLabel="Desativar produto" danger details={activeProduct ? <div className="text-sm"><p>Produto: {activeProduct.name}</p><p>Codigo: {activeProduct.id}</p><p>Categoria: {activeProduct.category}</p><p>Estoque atual: {activeProduct.stock} {activeProduct.unit ?? "un"}</p><p>Preco de venda: {money(activeProduct.price)}</p></div> : null} onClose={() => setModal(null)} onConfirm={() => { if (activeProduct) deactivateProduct(activeProduct.id); toastSuccess("Produto desativado com sucesso"); setModal(null); }} />
      <CategoryModal open={modal === "category" || modal === "editCategory"} title={selectedCategory ? "Editar categoria" : "Nova categoria"} category={selectedCategory} onSave={(category) => saveCategory(category as ProductCategoryRecord)} onClose={() => { setSelectedCategory(null); setModal(null); }} />
    </div>
  );
}
